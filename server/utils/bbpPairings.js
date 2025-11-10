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

    const accelerationEnabled = Boolean(options?.accelerationSettings?.enabled);
    const useCPP = this.preferCPP && !accelerationEnabled;

    if (useCPP) {
      this.initCPP();
    }

    if (useCPP && this.cppAvailable) {
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

    return this.generateDutchPairingsFallback(players, tournament, options);
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
      const tournamentSettings = await this.getTournamentSettings(tournamentId, db);
      const resolvedAccelerationSettings = this.resolveAccelerationSettings(tournamentSettings, options);

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
            byePlayers.push({ player, byeType: 'half_point_bye' });
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
            pointsForLoss: options.pointsForLoss || 0,
            accelerationSettings: resolvedAccelerationSettings
          };

          const playersForPairing = this.applyAccelerationToPlayers(
            activePlayers,
            tournamentContext,
            resolvedAccelerationSettings
          );

          regularPairings = await this.generateDutchPairings(playersForPairing, tournamentContext, {
            ...options,
            accelerationSettings: resolvedAccelerationSettings
          });
        }

        const allSectionPairings = [...regularPairings, ...byePairings];

        let boardNumber = 1;
        allSectionPairings.forEach(pairing => {
          pairing.section = section;
          pairing.tournament_id = tournamentId;
          pairing.round = round;

          if (pairing.is_bye || pairing.black_player_id == null) {
            pairing.board = null;
          } else {
            pairing.board = boardNumber;
            boardNumber += 1;
          }
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

  generateDutchPairingsFallback(players, tournament = {}, options = {}) {
    if (!Array.isArray(players) || players.length < 2) {
      return [];
    }

    const sortedPlayers = [...players].sort((a, b) => {
      const scoreA = this.getPlayerScore(a, tournament);
      const scoreB = this.getPlayerScore(b, tournament);
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

    const scoreGroups = this.groupPlayersByScore(sortedPlayers, tournament);
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

  groupPlayersByScore(players, tournament = {}) {
    const groups = new Map();

    players.forEach(player => {
      const score = this.getPlayerScore(player, tournament);
      if (!groups.has(score)) {
        groups.set(score, []);
      }
      groups.get(score).push(player);
    });

    return groups;
  }

  getPlayerScore(player, tournament = {}) {
    let baseScore = 0;
    if (typeof player.points === 'number') {
      baseScore = player.points;
    } else if (typeof player.score === 'number') {
      baseScore = player.score;
    } else if (typeof player.total_points === 'number') {
      baseScore = player.total_points;
    }

    const acceleration = this.getPlayerAcceleration(player, tournament);
    if (Number.isFinite(acceleration)) {
      baseScore += acceleration;
    }

    return baseScore;
  }

  getPlayerAcceleration(player, tournament = {}) {
    if (Array.isArray(player.accelerations) && player.accelerations.length) {
      const roundIndex = Math.max(0, ((tournament.round || 1) - 1));
      if (roundIndex < player.accelerations.length) {
        const value = parseFloat(player.accelerations[roundIndex]);
        if (!Number.isNaN(value)) {
          return value;
        }
      }
      const lastValue = parseFloat(player.accelerations[player.accelerations.length - 1]);
      if (!Number.isNaN(lastValue)) {
        return lastValue;
      }
    }

    if (typeof player.acceleration === 'number') {
      return player.acceleration;
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

  applyAccelerationToPlayers(players, tournament = {}, accelerationSettings = {}) {
    if (!accelerationSettings || !accelerationSettings.enabled || !Array.isArray(players) || players.length < 2) {
      return players;
    }

    const unlimitedRounds = accelerationSettings.type === 'all_rounds';
    const totalRounds = unlimitedRounds ? Infinity : this.normalizeNumber(accelerationSettings.rounds, 2);
    const roundIndex = Math.max(0, ((tournament.round || 1) - 1));

    if (!unlimitedRounds && (!Number.isFinite(totalRounds) || totalRounds <= 0 || roundIndex >= totalRounds)) {
      return players;
    }

    const clonedPlayers = players.map(player => ({
      ...player,
      accelerations: Array.isArray(player.accelerations) ? [...player.accelerations] : []
    }));

    const sortedByRating = [...clonedPlayers].sort((a, b) => (b.rating || 0) - (a.rating || 0));

    let breakPoint = this.normalizeNumber(accelerationSettings.breakPoint, null);
    if (!breakPoint || breakPoint <= 0) {
      breakPoint = Math.ceil(sortedByRating.length / 2);
    } else {
      breakPoint = Math.min(sortedByRating.length, Math.max(1, Math.floor(breakPoint)));
    }

    const acceleratedIds = new Set(sortedByRating.slice(0, breakPoint).map(player => player.id));
    const accelerationValue = this.getAccelerationValueForType(accelerationSettings.type, roundIndex, accelerationSettings);

    clonedPlayers.forEach(player => {
      const accelerations = Array.isArray(player.accelerations) ? player.accelerations : [];
      if (accelerations.length <= roundIndex) {
        for (let i = accelerations.length; i <= roundIndex; i++) {
          accelerations[i] = 0;
        }
      }
      accelerations[roundIndex] = acceleratedIds.has(player.id) ? accelerationValue : 0;
      player.accelerations = accelerations;
    });

    return clonedPlayers;
  }

  getAccelerationValueForType(type = 'standard', roundIndex = 0, settings = {}) {
    switch (type) {
      case 'added_score':
        return this.normalizeNumber(settings.addedScoreValue, 1) || 1;
      case 'sixths':
        return roundIndex === 0 ? 1 : 0.5;
      case 'all_rounds':
        return this.normalizeNumber(settings.allRoundsValue, 1) || 1;
      case 'standard':
      default:
        return roundIndex === 0 ? 1 : 0.5;
    }
  }

  resolveAccelerationSettings(tournamentSettings = {}, options = {}) {
    if (options && options.accelerationSettings) {
      const provided = options.accelerationSettings;
      return {
        enabled: Boolean(provided.enabled),
        type: provided.type || 'standard',
        rounds: this.normalizeNumber(provided.rounds, 2),
        threshold: this.normalizeNumber(provided.threshold, null),
        breakPoint: this.normalizeNumber(provided.breakPoint, null),
        addedScoreValue: this.normalizeNumber(provided.addedScoreValue, undefined),
        allRoundsValue: this.normalizeNumber(provided.allRoundsValue, undefined)
      };
    }

    let settings = tournamentSettings || {};
    if (settings.settings && typeof settings.settings === 'object') {
      settings = settings.settings;
    }

    if (settings.pairing_type === 'accelerated') {
      return {
        enabled: true,
        type: settings.acceleration_type || 'standard',
        rounds: this.normalizeNumber(settings.acceleration_rounds, 2),
        threshold: this.normalizeNumber(settings.acceleration_threshold, null),
        breakPoint: this.normalizeNumber(settings.acceleration_break_point, null),
        addedScoreValue: this.normalizeNumber(settings.acceleration_added_score_value, undefined),
        allRoundsValue: this.normalizeNumber(settings.acceleration_all_rounds_value, undefined)
      };
    }

    return { enabled: false };
  }

  normalizeNumber(value, defaultValue = null) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  async getTournamentSettings(tournamentId, db) {
    return new Promise((resolve, reject) => {
      db.get('SELECT settings FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row || !row.settings) {
          resolve({});
          return;
        }

        try {
          const parsed = JSON.parse(row.settings);
          resolve(parsed || {});
        } catch (error) {
          console.warn(`[BBPPairings] Failed to parse tournament settings for ${tournamentId}: ${error.message}`);
          resolve({});
        }
      });
    });
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
