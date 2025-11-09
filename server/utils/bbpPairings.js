/**
 * bbpPairings JavaScript Implementation
 * Based on the C++ bbpPairings library algorithms
 * Implements Dutch and Burstein Swiss system pairing algorithms
 */

const { BBPPairingsCPP } = require('./bbpPairingsCPP');

class BbpPairings {
  constructor({ preferCPP = true } = {}) {
    this.preferCPP = preferCPP;
    this.cppInstance = null;
    this.cppAvailable = false;
    this.cppInitError = null;
    if (preferCPP) {
      this.initCPP();
    }
  }

  initCPP() {
    if (this.cppInstance || this.cppInitError) {
      return;
    }

    try {
      this.cppInstance = new BBPPairingsCPP();
      this.cppAvailable = true;
    } catch (error) {
      this.cppInitError = error;
      this.cppAvailable = false;
      console.warn(`[BBPPairings] Unable to initialize C++ engine: ${error.message}`);
    }
  }

  buildCppOptions(tournament = {}, overrides = {}) {
    const today = new Date().toISOString().split('T')[0];
    return {
      pairingSystem: overrides.pairingSystem || 'dutch',
      tournamentName: overrides.tournamentName || tournament.section || 'Tournament',
      sectionName: overrides.sectionName || tournament.section || 'Section',
      tournamentRounds: overrides.tournamentRounds || tournament.tournamentRounds || 5,
      tournamentType: overrides.tournamentType || 'S',
      timeControl: overrides.timeControl || '90+30',
      tournamentChiefTD: overrides.tournamentChiefTD || 'TD',
      tournamentChiefArbiter: overrides.tournamentChiefArbiter || 'Arbiter',
      tournamentChiefOrganizer: overrides.tournamentChiefOrganizer || 'Organizer',
      tournamentWebsite: overrides.tournamentWebsite || '',
      tournamentEmail: overrides.tournamentEmail || '',
      tournamentPhone: overrides.tournamentPhone || '',
      tournamentAddress: overrides.tournamentAddress || '',
      tournamentFederation: overrides.tournamentFederation || 'USA',
      tournamentFederationCode: overrides.tournamentFederationCode || 'USA',
      tournamentDate: overrides.tournamentDate || tournament.tournamentDate || today
    };
  }

  normalizeCppPairings(pairings, tournament = {}) {
    if (!Array.isArray(pairings)) {
      return [];
    }

    return pairings.map((pairing, index) => {
      const normalized = {
        white_player_id: pairing.white_player_id ?? pairing.whitePlayerId,
        black_player_id: pairing.black_player_id ?? pairing.blackPlayerId ?? null,
        is_bye: Boolean(pairing.is_bye ?? pairing.isBye ?? (!pairing.black_player_id && pairing.black_player_id !== 0)),
        section: pairing.section || tournament.section,
        round: pairing.round ?? tournament.round,
        board: pairing.board ?? index + 1,
        tournament_id: pairing.tournament_id ?? tournament.tournamentId,
        bye_type: pairing.bye_type || pairing.byeType || null,
        result: pairing.result ?? null
      };

      if (!normalized.is_bye && normalized.black_player_id == null) {
        normalized.is_bye = true;
      }

      return normalized;
    });
  }

  async generateDutchPairings(players, tournament = {}, options = {}) {
    if (!Array.isArray(players) || players.length < 2) {
      return [];
    }

    if (this.preferCPP) {
      this.initCPP();
    }

    if (this.cppAvailable) {
      try {
        const response = await this.cppInstance.generatePairings(
          tournament.tournamentId || options.tournamentId || 0,
          tournament.round || options.round || 1,
          players,
          this.buildCppOptions(tournament, { ...options, pairingSystem: 'dutch' })
        );

        if (response?.success && Array.isArray(response.pairings)) {
          return this.normalizeCppPairings(response.pairings, tournament);
        }

        console.warn(`[BBPPairings] C++ Dutch pairing failed: ${response?.error || 'unknown error'}`);
      } catch (error) {
        console.warn(`[BBPPairings] C++ Dutch pairing error: ${error.message}`);
      }
    }

    return this.generateDutchPairingsFallback(players, tournament);
  }

  async generateBursteinPairings(players, tournament = {}, options = {}) {
    if (!Array.isArray(players) || players.length < 2) {
      return [];
    }

    if (this.preferCPP) {
      this.initCPP();
    }

    if (this.cppAvailable) {
      try {
        const response = await this.cppInstance.generatePairings(
          tournament.tournamentId || options.tournamentId || 0,
          tournament.round || options.round || 1,
          players,
          this.buildCppOptions(tournament, { ...options, pairingSystem: 'burstein' })
        );

        if (response?.success && Array.isArray(response.pairings)) {
          return this.normalizeCppPairings(response.pairings, tournament);
        }

        console.warn(`[BBPPairings] C++ Burstein pairing failed: ${response?.error || 'unknown error'}`);
      } catch (error) {
        console.warn(`[BBPPairings] C++ Burstein pairing error: ${error.message}`);
      }
    }

    return this.generateDutchPairingsFallback(players, tournament);
  }

  async generateTournamentPairings(tournamentId, round, db, options = {}) {
    console.log(`[BBPPairings] Generating pairings for tournament ${tournamentId}, round ${round}`);

    try {
      const playersBySection = await new Promise((resolve, reject) => {
        db.all(
          'SELECT COALESCE(section, "Open") as section FROM players WHERE tournament_id = ? AND (status = "active" OR status = "inactive") GROUP BY COALESCE(section, "Open")',
          [tournamentId],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(rows.map(row => row.section || 'Open'));
          }
        );
      });

      const allPairings = [];
      const sectionResults = {};

      for (const section of playersBySection) {
        console.log(`[BBPPairings] Processing section: ${section}`);

        const allPlayers = await new Promise((resolve, reject) => {
          db.all(
            `SELECT p.*, 
                    COALESCE(SUM(CASE WHEN pr.result = 'win' THEN 1 WHEN pr.result = 'draw' THEN 0.5 ELSE 0 END), 0) as points
             FROM players p
             LEFT JOIN pairings pr ON p.id = pr.white_player_id OR p.id = pr.black_player_id
             WHERE p.tournament_id = ? AND COALESCE(p.section, 'Open') = ? AND (p.status = 'active' OR p.status = 'inactive')
             GROUP BY p.id
             ORDER BY points DESC, p.rating DESC`,
            [tournamentId, section],
            (err, rows) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(rows);
            }
          );
        });

        const activePlayers = [];
        const byePlayers = [];

        for (const player of allPlayers) {
          let hasIntentionalBye = false;

          if (player.intentional_bye_rounds) {
            try {
              let byeRounds = [];
              if (typeof player.intentional_bye_rounds === 'string') {
                try {
                  byeRounds = JSON.parse(player.intentional_bye_rounds);
                } catch {
                  byeRounds = player.intentional_bye_rounds.split(',').map(r => parseInt(r.trim(), 10)).filter(r => !Number.isNaN(r));
                }
              } else if (Array.isArray(player.intentional_bye_rounds)) {
                byeRounds = player.intentional_bye_rounds;
              }

              hasIntentionalBye = byeRounds.includes(round);
            } catch (error) {
              console.warn(`[BBPPairings] Error parsing intentional_bye_rounds for player ${player.name}: ${error.message}`);
            }
          }

          if (player.status === 'inactive') {
            byePlayers.push({ player, byeType: 'inactive' });
          } else if (hasIntentionalBye) {
            byePlayers.push({ player, byeType: 'unpaired' });
          } else {
            activePlayers.push(player);
          }
        }

        const byePairings = byePlayers.map(({ player, byeType }) => ({
          white_player_id: player.id,
          black_player_id: null,
          is_bye: true,
          bye_type: byeType,
          section,
          round,
          tournament_id: tournamentId,
          result: `bye_${byeType}`
        }));

        let regularPairings = [];
        if (activePlayers.length >= 2) {
          const colorHistory = await this.getColorHistory(tournamentId, section, db);
          const tournamentContext = {
            round,
            section,
            tournamentId,
            colorHistory,
            pointsForWin: options.pointsForWin || 1,
            pointsForDraw: options.pointsForDraw || 0.5,
            pointsForLoss: options.pointsForLoss || 0
          };

          regularPairings = await this.generateDutchPairings(activePlayers, tournamentContext, options);
        }

        const allSectionPairings = [...regularPairings, ...byePairings];

        allSectionPairings.forEach((pairing, index) => {
          pairing.section = section;
          pairing.board = index + 1;
          pairing.tournament_id = tournamentId;
          pairing.round = round;
        });

        allPairings.push(...allSectionPairings);

        const registeredByeCount = byePlayers.filter(entry => entry.byeType === 'unpaired').length;
        const inactiveByeCount = byePlayers.filter(entry => entry.byeType === 'inactive').length;

        sectionResults[section] = {
          success: true,
          pairingsCount: allSectionPairings.length,
          playersCount: activePlayers.length + byePlayers.length,
          registeredByeCount,
          inactiveByeCount
        };

        console.log(
          `[BBPPairings] Generated ${allSectionPairings.length} pairings for section ${section} ` +
          `(${activePlayers.length} active, ${registeredByeCount} registered byes, ${inactiveByeCount} inactive)`
        );
      }

      return {
        success: true,
        pairings: allPairings,
        sectionResults,
        metadata: {
          tournamentId,
          round,
          totalPairings: allPairings.length,
          sectionsProcessed: playersBySection.length,
          pairingSystem: 'fide_dutch',
          byeCount: allPairings.filter(p => p.is_bye).length
        }
      };
    } catch (error) {
      console.error(`[BBPPairings] Tournament pairing generation failed:`, error.message);
      return {
        success: false,
        error: error.message,
        pairings: [],
        sectionResults: {}
      };
    }
  }

  generateDutchPairingsFallback(players, tournament = {}) {
    if (!Array.isArray(players) || players.length < 2) {
      return [];
    }

    const sortedPlayers = [...players].sort((a, b) => {
      const scoreA = this.getPlayerScore(a);
      const scoreB = this.getPlayerScore(b);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    const scoreGroups = this.groupPlayersByScore(sortedPlayers);
    const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);

    const pairings = [];
    const used = new Set();

    for (const score of sortedScores) {
      const group = scoreGroups.get(score).filter(player => !used.has(player.id));
      if (!group.length) {
        continue;
      }

      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            bye_type: 'unpaired',
            section: tournament.section || 'Open',
            round: tournament.round
          });
          used.add(byePlayer.id);
          group.splice(group.indexOf(byePlayer), 1);
        }
      }

      const half = Math.floor(group.length / 2);
      const topHalf = group.slice(0, half);
      const bottomHalf = group.slice(half);

      for (let i = 0; i < topHalf.length; i++) {
        const topPlayer = topHalf[i];
        const bottomPlayer = bottomHalf[i];

        if (used.has(topPlayer.id) || used.has(bottomPlayer.id)) {
          continue;
        }

        const { white, black } = this.assignColorsSwiss(topPlayer, bottomPlayer, tournament);

        pairings.push({
          white_player_id: white.id,
          black_player_id: black.id,
          is_bye: false,
          section: tournament.section || 'Open',
          round: tournament.round
        });

        used.add(topPlayer.id);
        used.add(bottomPlayer.id);
      }
    }

    return pairings;
  }

  groupPlayersByScore(players) {
    const groups = new Map();

    players.forEach(player => {
      const score = this.getPlayerScore(player);
      if (!groups.has(score)) {
        groups.set(score, []);
      }
      groups.get(score).push(player);
    });

    return groups;
  }

  getPlayerScore(player) {
    if (typeof player.points === 'number') {
      return player.points;
    }
    if (typeof player.score === 'number') {
      return player.score;
    }
    if (typeof player.total_points === 'number') {
      return player.total_points;
    }
    return 0;
  }

  selectByePlayer(group) {
    const sortedGroup = [...group].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    return sortedGroup[0] || null;
  }

  assignColorsSwiss(player1, player2, tournament = {}) {
    const imbalance1 = this.getColorImbalance(player1, tournament);
    const imbalance2 = this.getColorImbalance(player2, tournament);

    if (imbalance1 > imbalance2) {
      return { white: player2, black: player1 };
    }
    if (imbalance2 > imbalance1) {
      return { white: player1, black: player2 };
    }

    if (player1.colorPreference && player1.colorPreference !== 'none' && player1.colorPreference !== player2.colorPreference) {
      return player1.colorPreference === 'white'
        ? { white: player1, black: player2 }
        : { white: player2, black: player1 };
    }
    if (player2.colorPreference && player2.colorPreference !== 'none' && player1.colorPreference !== player2.colorPreference) {
      return player2.colorPreference === 'white'
        ? { white: player2, black: player1 }
        : { white: player1, black: player2 };
    }

    const rating1 = player1.rating || 0;
    const rating2 = player2.rating || 0;
    if (rating1 === rating2) {
      return player1.id < player2.id
        ? { white: player1, black: player2 }
        : { white: player2, black: player1 };
    }

    return rating1 >= rating2
      ? { white: player1, black: player2 }
      : { white: player2, black: player1 };
  }

  getColorImbalance(player, tournament = {}) {
    const history = tournament.colorHistory?.[player.id];
    if (!Array.isArray(history) || history.length === 0) {
      return 0;
    }

    return history.reduce((sum, color) => {
      if (typeof color === 'number') {
        return sum + (color === 1 ? 1 : -1);
      }
      if (color === 'white') {
        return sum + 1;
      }
      if (color === 'black') {
        return sum - 1;
      }
      return sum;
    }, 0);
  }

  async getColorHistory(tournamentId, section, db) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT white_player_id, black_player_id, result
         FROM pairings 
         WHERE tournament_id = ? AND COALESCE(section, 'Open') = ? AND result IS NOT NULL
         ORDER BY round, board`,
        [tournamentId, section],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const colorHistory = {};
          rows.forEach(pairing => {
            if (pairing.white_player_id) {
              if (!colorHistory[pairing.white_player_id]) {
                colorHistory[pairing.white_player_id] = [];
              }
              colorHistory[pairing.white_player_id].push('white');
            }
            if (pairing.black_player_id) {
              if (!colorHistory[pairing.black_player_id]) {
                colorHistory[pairing.black_player_id] = [];
              }
              colorHistory[pairing.black_player_id].push('black');
            }
          });

          resolve(colorHistory);
        }
      );
    });
  }
}

module.exports = { BBPPairings: BbpPairings };
