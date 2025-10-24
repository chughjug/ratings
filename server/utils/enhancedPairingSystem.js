/**
 * Enhanced Pairing System
 * Comprehensive implementation of competitive pairing systems based on FIDE and USCF standards
 * 
 * Supports multiple pairing systems:
 * - Swiss System (Standard)
 * - FIDE Dutch System
 * - Accelerated Pairing Systems
 * - Round-Robin
 * - Single Elimination (Knockout)
 * 
 * Implements comprehensive tie-breaking systems:
 * - Buchholz (Standard and Cut-1)
 * - Sonneborn-Berger
 * - Cumulative Score (Koya)
 * - Direct Encounter
 * - Performance Rating
 */

class EnhancedPairingSystem {
  constructor(players, options = {}) {
    this.players = players;
    this.options = {
      pairingSystem: 'fide_dutch',
      tiebreakerOrder: ['buchholz', 'sonneborn_berger', 'direct_encounter', 'performance_rating'],
      colorBalanceRules: 'fide',
      accelerationSettings: {
        enabled: false,
        type: 'standard',
        rounds: 2,
        threshold: null
      },
      byeSettings: {
        fullPointBye: true,
        avoidUnratedDropping: true
      },
      ...options
    };
    
    this.previousPairings = options.previousPairings || [];
    this.colorHistory = options.colorHistory || {};
    this.round = options.round || 1;
    this.section = options.section || 'Open';
    this.tournamentId = options.tournamentId;
    this.db = options.db;
  }

  /**
   * Generate pairings for all sections with complete independence
   * This is the main entry point for tournament-wide pairing generation
   */
  static async generateTournamentPairings(tournamentId, round, db, options = {}) {
    console.log(`[EnhancedPairingSystem] Generating pairings for tournament ${tournamentId}, round ${round}`);
    
    try {
      // Get all players grouped by section
      const playersBySection = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM players WHERE tournament_id = ? AND status = "active" ORDER BY section, rating DESC',
          [tournamentId],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            const grouped = {};
            rows.forEach(player => {
              const section = player.section || 'Open';
              if (!grouped[section]) {
                grouped[section] = [];
              }
              grouped[section].push(player);
            });

            resolve(grouped);
          }
        );
      });

      if (Object.keys(playersBySection).length === 0) {
        throw new Error('No players found for any section');
      }

      console.log(`[EnhancedPairingSystem] Found ${Object.keys(playersBySection).length} sections: ${Object.keys(playersBySection).join(', ')}`);

      // Generate pairings for each section independently
      const allPairings = [];
      const sectionResults = {};

      for (const [sectionName, players] of Object.entries(playersBySection)) {
        console.log(`[EnhancedPairingSystem] Processing section "${sectionName}" with ${players.length} players`);
        
        try {
          // Get section-specific data (completely isolated)
          const sectionPreviousPairings = await new Promise((resolve, reject) => {
            db.all(
              'SELECT * FROM pairings WHERE tournament_id = ? AND section = ? AND round < ?',
              [tournamentId, sectionName, round],
              (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
              }
            );
          });

          const sectionColorHistory = {};
          for (const player of players) {
            try {
              const results = await new Promise((resolve, reject) => {
                db.all(
                  'SELECT color FROM results WHERE player_id = ? ORDER BY round',
                  [player.id],
                  (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                  }
                );
              });

              let balance = 0;
              results.forEach(result => {
                balance += result.color === 'white' ? 1 : -1;
              });
              sectionColorHistory[player.id] = balance;
            } catch (error) {
              console.warn(`[EnhancedPairingSystem] Could not get color history for player ${player.id}:`, error.message);
              sectionColorHistory[player.id] = 0;
            }
          }

          // Create enhanced pairing system for this section
          const sectionSystem = new EnhancedPairingSystem(players, {
            ...options,
            previousPairings: sectionPreviousPairings,
            colorHistory: sectionColorHistory,
            section: sectionName,
            tournamentId,
            db
          });

          // Generate pairings for this section
          const sectionPairings = sectionSystem.generatePairings();
          
          // Assign board numbers starting from 1 for this section
          sectionPairings.forEach((pairing, index) => {
            pairing.board = index + 1;
            pairing.section = sectionName;
            pairing.round = round;
            pairing.tournament_id = tournamentId;
          });

          allPairings.push(...sectionPairings);
          sectionResults[sectionName] = {
            success: true,
            pairingsCount: sectionPairings.length,
            playersCount: players.length
          };

          console.log(`[EnhancedPairingSystem] Section "${sectionName}": Generated ${sectionPairings.length} pairings`);
        } catch (error) {
          console.error(`[EnhancedPairingSystem] Error in section "${sectionName}":`, error.message);
          sectionResults[sectionName] = {
            success: false,
            error: error.message,
            playersCount: players.length
          };
          // Continue with other sections even if one fails
        }
      }

      return {
        success: true,
        pairings: allPairings,
        sectionResults,
        metadata: {
          tournamentId,
          round,
          totalPairings: allPairings.length,
          sectionsProcessed: Object.keys(playersBySection).length
        }
      };

    } catch (error) {
      console.error(`[EnhancedPairingSystem] Tournament pairing generation failed:`, error.message);
      return {
        success: false,
        error: error.message,
        pairings: [],
        sectionResults: {}
      };
    }
  }

  /**
   * Check if a round is complete
   */
  static async isRoundComplete(tournamentId, round, db) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT section, COUNT(*) as total, 
                SUM(CASE WHEN result IS NOT NULL THEN 1 ELSE 0 END) as completed
         FROM pairings 
         WHERE tournament_id = ? AND round = ?
         GROUP BY section`,
        [tournamentId, round],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          let totalPairings = 0;
          let completedPairings = 0;
          const incompleteSections = [];

          rows.forEach(row => {
            totalPairings += row.total;
            completedPairings += row.completed;
            if (row.completed < row.total) {
              incompleteSections.push({
                section: row.section || 'Open',
                incomplete: row.total - row.completed
              });
            }
          });

          resolve({
            isComplete: incompleteSections.length === 0,
            totalPairings,
            completedPairings,
            incompleteCount: totalPairings - completedPairings,
            incompleteSections
          });
        }
      );
    });
  }

  /**
   * Continue to next round - built-in functionality
   */
  static async continueToNextRound(tournamentId, currentRound, db) {
    console.log(`[EnhancedPairingSystem] Continuing to next round for tournament ${tournamentId}`);

    try {
      // Check if current round is complete
      const roundStatus = await this.isRoundComplete(tournamentId, currentRound, db);
      
      if (!roundStatus.isComplete) {
        return {
          success: false,
          error: `Round ${currentRound} is not complete. ${roundStatus.incompleteCount} games still need results.`,
          incompleteSections: roundStatus.incompleteSections
        };
      }

      const nextRound = currentRound + 1;
      
      // Check if next round already has pairings
      const nextRoundPairings = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM pairings WHERE tournament_id = ? AND round = ?',
          [tournamentId, nextRound],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });

      if (nextRoundPairings > 0) {
        return {
          success: false,
          error: `Round ${nextRound} already has ${nextRoundPairings} pairings. Cannot continue.`
        };
      }

      // Generate pairings for next round
      const pairingResult = await this.generateTournamentPairings(tournamentId, nextRound, db);
      
      if (!pairingResult.success) {
        return {
          success: false,
          error: `Failed to generate pairings for round ${nextRound}: ${pairingResult.error}`
        };
      }

      // Store pairings
      await this.storePairings(tournamentId, nextRound, pairingResult.pairings, db);

      return {
        success: true,
        message: `Successfully generated Round ${nextRound} pairings`,
        nextRound,
        currentRound,
        pairings: pairingResult.pairings,
        sectionResults: pairingResult.sectionResults
      };

    } catch (error) {
      console.error(`[EnhancedPairingSystem] Continue to next round failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store pairings in database
   */
  static async storePairings(tournamentId, round, pairings, db) {
    return new Promise((resolve, reject) => {
      // Use transaction to ensure data integrity
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const stmt = db.prepare(`
          INSERT INTO pairings (id, tournament_id, round, board, white_player_id, black_player_id, section)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let completed = 0;
        let errorOccurred = false;

        pairings.forEach((pairing, index) => {
          if (errorOccurred) return;

          const pairingData = [
            pairing.id || require('uuid').v4(),
            tournamentId,
            round,
            pairing.board,
            pairing.white_player_id,
            pairing.black_player_id,
            pairing.section
          ];

          stmt.run(pairingData, function(err) {
            if (err && !errorOccurred) {
              errorOccurred = true;
              db.run('ROLLBACK');
              reject(err);
              return;
            }

            completed++;
            if (completed === pairings.length) {
              stmt.finalize((err) => {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                } else {
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      reject(commitErr);
                    } else {
                      resolve();
                    }
                  });
                }
              });
            }
          });
        });
      });
    });
  }

  /**
   * Generate pairings based on selected system
   */
  generatePairings() {
    switch (this.options.pairingSystem) {
      case 'swiss_standard':
        return this.generateSwissStandardPairings();
      case 'fide_dutch':
        return this.generateFideDutchPairings();
      case 'accelerated_swiss':
        return this.generateAcceleratedPairings();
      case 'round_robin':
        return this.generateRoundRobinPairings();
      case 'single_elimination':
        return this.generateSingleEliminationPairings();
      default:
        return this.generateSwissStandardPairings();
    }
  }

  /**
   * Standard Swiss System Pairing
   * Based on FIDE C.04.1 and USCF Rule 28
   */
  generateSwissStandardPairings() {
    if (this.players.length < 2) return [];

    // Sort players by score, then by tiebreakers
    const sortedPlayers = this.sortPlayersByStandings();
    
    // Group players by score
    const scoreGroups = this.groupPlayersByScore(sortedPlayers);
    
    const pairings = [];
    const used = new Set();
    
    // Process each score group
    const sortedScores = Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    for (const score of sortedScores) {
      const group = scoreGroups[score];
      
      // Handle odd number of players
      if (group.length % 2 === 1) {
        const floater = this.selectFloater(group, scoreGroups, sortedScores);
        if (floater) {
          group.splice(group.indexOf(floater), 1);
          // Add floater to next lower score group
          const nextScore = this.getNextLowerScore(score, sortedScores);
          if (nextScore !== null) {
            if (!scoreGroups[nextScore]) scoreGroups[nextScore] = [];
            scoreGroups[nextScore].push(floater);
          }
        }
      }
      
      // Pair remaining players in group
      this.pairGroup(group, pairings, used);
    }
    
    return pairings;
  }

  /**
   * FIDE Dutch System Pairing
   * Algorithmic with aggressive color correction
   */
  generateFideDutchPairings() {
    if (this.players.length < 2) return [];

    const sortedPlayers = this.sortPlayersByStandings();
    const scoreGroups = this.groupPlayersByScore(sortedPlayers);
    const pairings = [];
    const used = new Set();
    
    const sortedScores = Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    for (const score of sortedScores) {
      const group = scoreGroups[score];
      
      // Handle odd number of players
      if (group.length % 2 === 1) {
        const floater = this.selectFloaterDutch(group);
        if (floater) {
          group.splice(group.indexOf(floater), 1);
          const nextScore = this.getNextLowerScore(score, sortedScores);
          if (nextScore !== null) {
            if (!scoreGroups[nextScore]) scoreGroups[nextScore] = [];
            scoreGroups[nextScore].push(floater);
          }
        }
      }
      
      // Use proper Swiss system pairing within score group
      const groupPairings = this.generateSwissPairingsForGroup(group, used);
      pairings.push(...groupPairings);
    }
    
    return pairings;
  }

  /**
   * Accelerated Pairing System
   * For large tournaments to quickly separate top players
   */
  generateAcceleratedPairings() {
    if (this.players.length < 2) return [];

    const sortedPlayers = this.sortPlayersByStandings();
    
    // Apply acceleration based on round and settings
    if (this.shouldApplyAcceleration()) {
      const acceleratedPlayers = this.applyAcceleration(sortedPlayers);
      return this.generateSwissStandardPairings(acceleratedPlayers);
    }
    
    return this.generateSwissStandardPairings();
  }

  /**
   * Round-Robin Pairing System
   * All players play each other exactly once
   */
  generateRoundRobinPairings() {
    if (this.players.length < 2) return [];

    const totalRounds = this.players.length - 1 + (this.players.length % 2);
    
    if (this.round > totalRounds) return [];
    
    const pairings = [];
    const players = [...this.players];
    
    // Add dummy player for odd number of players
    if (players.length % 2 === 1) {
      players.push({ id: 'bye', name: '1-0F', isBye: true });
    }
    
    // Generate round-robin pairings using Berger tables
    const n = players.length;
    const isOdd = n % 2 === 1;
    
    for (let round = 1; round <= totalRounds; round++) {
      if (round === this.round) {
        // Generate pairings for this specific round
        for (let i = 0; i < n / 2; i++) {
          const player1 = players[i];
          const player2 = players[n - 1 - i];
          
          if (!player1.isBye && !player2.isBye) {
            const whitePlayer = this.assignColorsRoundRobin(player1, player2, round);
            const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
            
            pairings.push({
              white_player_id: whitePlayer.id,
              black_player_id: blackPlayer.id,
              is_bye: false,
              section: this.section,
              board: i + 1
            });
          } else if (!player1.isBye) {
            pairings.push({
              white_player_id: player1.id,
              black_player_id: null,
              is_bye: true,
              section: this.section,
              board: i + 1
            });
          }
        }
        break;
      }
      
      // Rotate players for next round
      this.rotateRoundRobinPlayers(players);
    }
    
    return pairings;
  }

  /**
   * Single Elimination (Knockout) Pairing System
   */
  generateSingleEliminationPairings() {
    if (this.players.length < 2) return [];

    const pairings = [];
    const activePlayers = this.getActivePlayers();
    
    if (activePlayers.length < 2) return [];
    
    // Sort by seed (rating or initial ranking)
    const seededPlayers = activePlayers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    // Calculate number of rounds needed
    const totalRounds = Math.ceil(Math.log2(seededPlayers.length));
    
    if (this.round > totalRounds) return [];
    
    // Generate bracket pairings
    const bracketSize = Math.pow(2, totalRounds);
    const bracket = new Array(bracketSize).fill(null);
    
    // Place players in bracket
    seededPlayers.forEach((player, index) => {
      bracket[index] = player;
    });
    
    // Generate pairings for current round
    const currentRoundSize = bracketSize / Math.pow(2, this.round - 1);
    const pairingsInRound = currentRoundSize / 2;
    
    for (let i = 0; i < pairingsInRound; i++) {
      const player1 = bracket[i * 2];
      const player2 = bracket[i * 2 + 1];
      
      if (player1 && player2) {
        const whitePlayer = this.assignColorsElimination(player1, player2);
        const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: i + 1
        });
      } else if (player1) {
        pairings.push({
          white_player_id: player1.id,
          black_player_id: null,
          is_bye: true,
          section: this.section,
          board: i + 1
        });
      }
    }
    
    return pairings;
  }

  /**
   * Sort players by standings using comprehensive tiebreakers
   */
  sortPlayersByStandings() {
    return [...this.players].sort((a, b) => {
      // Primary: Total points
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      
      // Apply tiebreakers in order
      for (const tiebreaker of this.options.tiebreakerOrder) {
        const aValue = this.calculateTiebreaker(a, tiebreaker);
        const bValue = this.calculateTiebreaker(b, tiebreaker);
        
        if (aValue !== bValue) {
          return bValue - aValue;
        }
      }
      
      // Final tiebreaker: rating
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  /**
   * Calculate tiebreaker value for a player
   */
  calculateTiebreaker(player, tiebreaker) {
    switch (tiebreaker) {
      case 'buchholz':
        return this.calculateBuchholzScore(player.id);
      case 'buchholz_cut1':
        return this.calculateBuchholzCut1Score(player.id);
      case 'sonneborn_berger':
        return this.calculateSonnebornBergerScore(player.id);
      case 'cumulative':
        return this.calculateCumulativeScore(player.id);
      case 'direct_encounter':
        return this.calculateDirectEncounterScore(player.id);
      case 'performance_rating':
        return this.calculatePerformanceRating(player.id);
      default:
        return 0;
    }
  }

  /**
   * Buchholz Score - Sum of opponents' scores
   */
  calculateBuchholzScore(playerId) {
    const playerPairings = this.previousPairings.filter(p => 
      p.white_player_id === playerId || p.black_player_id === playerId
    );
    
    let totalScore = 0;
    playerPairings.forEach(pairing => {
      const opponentId = pairing.white_player_id === playerId ? 
        pairing.black_player_id : pairing.white_player_id;
      const opponent = this.players.find(p => p.id === opponentId);
      if (opponent) {
        totalScore += opponent.points || 0;
      }
    });
    
    return totalScore;
  }

  /**
   * Buchholz Cut-1 Score - Buchholz minus lowest opponent score
   */
  calculateBuchholzCut1Score(playerId) {
    const buchholz = this.calculateBuchholzScore(playerId);
    const playerPairings = this.previousPairings.filter(p => 
      p.white_player_id === playerId || p.black_player_id === playerId
    );
    
    if (playerPairings.length === 0) return buchholz;
    
    let minOpponentScore = Infinity;
    playerPairings.forEach(pairing => {
      const opponentId = pairing.white_player_id === playerId ? 
        pairing.black_player_id : pairing.white_player_id;
      const opponent = this.players.find(p => p.id === opponentId);
      if (opponent) {
        minOpponentScore = Math.min(minOpponentScore, opponent.points || 0);
      }
    });
    
    return buchholz - minOpponentScore;
  }

  /**
   * Sonneborn-Berger Score
   */
  calculateSonnebornBergerScore(playerId) {
    const playerPairings = this.previousPairings.filter(p => 
      p.white_player_id === playerId || p.black_player_id === playerId
    );
    
    let totalScore = 0;
    playerPairings.forEach(pairing => {
      const opponentId = pairing.white_player_id === playerId ? 
        pairing.black_player_id : pairing.white_player_id;
      const opponent = this.players.find(p => p.id === opponentId);
      if (opponent) {
        const playerResult = this.getPlayerResult(pairing, playerId);
        const opponentScore = opponent.points || 0;
        
        if (playerResult === 1) {
          totalScore += opponentScore; // Full points for wins
        } else if (playerResult === 0.5) {
          totalScore += opponentScore * 0.5; // Half points for draws
        }
      }
    });
    
    return totalScore;
  }

  /**
   * Cumulative Score (Koya System)
   */
  calculateCumulativeScore(playerId) {
    const playerResults = this.getPlayerResults(playerId);
    let cumulativeScore = 0;
    let runningTotal = 0;
    
    playerResults.forEach(result => {
      runningTotal += result.points;
      cumulativeScore += runningTotal;
    });
    
    return cumulativeScore;
  }

  /**
   * Direct Encounter Score
   */
  calculateDirectEncounterScore(playerId) {
    const directPairing = this.previousPairings.find(p => 
      (p.white_player_id === playerId || p.black_player_id === playerId) &&
      p.result
    );
    
    if (!directPairing) return 0;
    
    return this.getPlayerResult(directPairing, playerId);
  }

  /**
   * Performance Rating
   */
  calculatePerformanceRating(playerId) {
    const playerResults = this.getPlayerResults(playerId);
    if (playerResults.length === 0) return 0;
    
    const totalPoints = playerResults.reduce((sum, result) => sum + result.points, 0);
    const averageOpponentRating = this.getAverageOpponentRating(playerId);
    
    // Simplified performance rating calculation
    return averageOpponentRating + 400 * (totalPoints / playerResults.length - 0.5);
  }

  /**
   * Group players by score
   */
  groupPlayersByScore(players) {
    const groups = {};
    players.forEach(player => {
      const score = player.points || 0;
      if (!groups[score]) {
        groups[score] = [];
      }
      groups[score].push(player);
    });
    return groups;
  }

  /**
   * Select floater for odd groups (USCF method)
   */
  selectFloater(group, scoreGroups, sortedScores) {
    // Sort by rating (ascending) to get lowest rated
    const sortedGroup = [...group].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    
    // Avoid dropping unrated players if possible
    if (this.options.byeSettings.avoidUnratedDropping) {
      const ratedPlayers = sortedGroup.filter(p => p.rating && p.rating > 0);
      if (ratedPlayers.length > 0) {
        return ratedPlayers[0]; // Lowest rated player
      }
    }
    
    return sortedGroup[0]; // Lowest rated player (could be unrated)
  }

  /**
   * Select floater for Dutch system
   */
  selectFloaterDutch(group) {
    // Dutch system: drop middle player
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const middleIndex = Math.floor(sortedGroup.length / 2);
    return sortedGroup[middleIndex];
  }

  /**
   * Pair players within a score group
   */
  pairGroup(group, pairings, used) {
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    for (let i = 0; i < sortedGroup.length; i += 2) {
      if (i + 1 < sortedGroup.length) {
        const player1 = sortedGroup[i];
        const player2 = sortedGroup[i + 1];
        
        if (!used.has(player1.id) && !used.has(player2.id)) {
          const whitePlayer = this.assignColors(player1, player2);
          const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: this.section,
            board: pairings.length + 1
          });
          
          used.add(player1.id);
          used.add(player2.id);
        }
      }
    }
  }

  /**
   * Generate Swiss system pairings for a score group
   */
  generateSwissPairingsForGroup(group, used) {
    const pairings = [];
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    // For Round 1, use a more sophisticated pairing approach
    if (this.round === 1) {
      return this.generateRound1Pairings(sortedGroup);
    }
    
    for (let i = 0; i < sortedGroup.length; i++) {
      if (used.has(sortedGroup[i].id)) continue;
      
      const currentPlayer = sortedGroup[i];
      let bestOpponent = null;
      let bestScore = -Infinity;
      
      // Find the best opponent within the same score group
      for (let j = i + 1; j < sortedGroup.length; j++) {
        if (used.has(sortedGroup[j].id)) continue;
        
        const opponent = sortedGroup[j];
        
        // Calculate pairing score based on Swiss system criteria
        const score = this.calculatePairingScore(currentPlayer, opponent);
        
        if (score > bestScore) {
          bestScore = score;
          bestOpponent = opponent;
        }
      }
      
      if (bestOpponent) {
        const whitePlayer = this.assignColorsDutch(currentPlayer, bestOpponent);
        const blackPlayer = whitePlayer.id === currentPlayer.id ? bestOpponent : currentPlayer;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        
        used.add(currentPlayer.id);
        used.add(bestOpponent.id);
      }
    }
    
    return pairings;
  }

  /**
   * Generate Round 1 pairings using proper Swiss system
   * Seed 1 vs Seed (N/2 + 1), Seed 2 vs Seed (N/2 + 2), etc.
   */
  generateRound1Pairings(sortedGroup) {
    const pairings = [];
    const n = sortedGroup.length;
    const half = Math.floor(n / 2);
    
    // Proper Swiss system Round 1 pairing with alternating colors
    for (let i = 0; i < half; i++) {
      const topPlayer = sortedGroup[i];           // Seed i+1
      const bottomPlayer = sortedGroup[i + half]; // Seed (N/2 + i+1)
      
      // Alternating colors: odd seeds get white, even seeds get black
      const isOddSeed = (i % 2) === 0;
      const whitePlayer = isOddSeed ? topPlayer : bottomPlayer;
      const blackPlayer = isOddSeed ? bottomPlayer : topPlayer;
      
      pairings.push({
        white_player_id: whitePlayer.id,
        black_player_id: blackPlayer.id,
        is_bye: false,
        section: this.section,
        board: i + 1
      });
    }
    
    // Handle odd number of players (bye for last player)
    if (n % 2 === 1) {
      const byePlayer = sortedGroup[n - 1];
      pairings.push({
        white_player_id: byePlayer.id,
        black_player_id: null,
        is_bye: true,
        section: this.section,
        board: half + 1
      });
    }
    
    return pairings;
  }

  /**
   * Calculate pairing score for Round 1
   */
  calculateRound1PairingScore(player1, player2) {
    let score = 0;
    
    // Prefer similar ratings (but not too similar)
    const ratingDiff = Math.abs((player1.rating || 0) - (player2.rating || 0));
    
    // Optimal rating difference is around 50-100 points
    if (ratingDiff >= 50 && ratingDiff <= 100) {
      score += 100;
    } else if (ratingDiff < 50) {
      score += 50 - ratingDiff; // Closer is better if very close
    } else {
      score += Math.max(0, 200 - ratingDiff); // Penalize large differences
    }
    
    // Prefer pairings that balance color distribution
    const balance1 = this.getColorBalance(player1.id);
    const balance2 = this.getColorBalance(player2.id);
    
    // For Round 1, prefer alternating colors
    if (balance1 === 0 && balance2 === 0) {
      score += 20; // Both players have no color history
    }
    
    return score;
  }

  /**
   * Calculate pairing score for Swiss system
   */
  calculatePairingScore(player1, player2) {
    let score = 0;
    
    // Avoid repeat pairings (highest priority)
    if (this.hasPlayedBefore(player1.id, player2.id)) {
      return -1000;
    }
    
    // Prefer similar ratings
    const ratingDiff = Math.abs((player1.rating || 0) - (player2.rating || 0));
    score -= ratingDiff / 100; // Smaller rating difference is better
    
    // Color balance considerations
    const balance1 = this.getColorBalance(player1.id);
    const balance2 = this.getColorBalance(player2.id);
    
    // Prefer pairings that correct color imbalances
    if ((balance1 > 0 && balance2 < 0) || (balance1 < 0 && balance2 > 0)) {
      score += 10;
    }
    
    // Avoid pairings that worsen color imbalances
    if ((balance1 > 0 && balance2 > 0) || (balance1 < 0 && balance2 < 0)) {
      score -= 5;
    }
    
    return score;
  }

  /**
   * Check if two players have played before
   */
  hasPlayedBefore(player1Id, player2Id) {
    return this.previousPairings.some(pairing => 
      (pairing.white_player_id === player1Id && pairing.black_player_id === player2Id) ||
      (pairing.white_player_id === player2Id && pairing.black_player_id === player1Id)
    );
  }

  /**
   * Generate Dutch system transpositions for color correction
   */
  generateDutchTranspositions(group) {
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const n = sortedGroup.length;
    const s1 = sortedGroup.slice(0, Math.floor(n / 2));
    const s2 = sortedGroup.slice(Math.floor(n / 2));
    
    // Generate all possible transpositions
    const transpositions = this.generateAllTranspositions(s2);
    
    let bestTransposition = null;
    let maxColorCorrections = -1;
    
    transpositions.forEach(transposition => {
      const corrections = this.countColorCorrections(s1, transposition);
      if (corrections > maxColorCorrections) {
        maxColorCorrections = corrections;
        bestTransposition = transposition;
      }
    });
    
    return bestTransposition ? s1.map((player, index) => ({
      topPlayer: player,
      bottomPlayer: bestTransposition[index]
    })) : [];
  }

  /**
   * Generate all possible transpositions
   */
  generateAllTranspositions(arr) {
    const result = [];
    
    function permute(arr, start = 0) {
      if (start === arr.length - 1) {
        result.push([...arr]);
        return;
      }
      
      for (let i = start; i < arr.length; i++) {
        [arr[start], arr[i]] = [arr[i], arr[start]];
        permute(arr, start + 1);
        [arr[start], arr[i]] = [arr[i], arr[start]];
      }
    }
    
    permute([...arr]);
    return result;
  }

  /**
   * Count color corrections in a pairing
   */
  countColorCorrections(s1, s2) {
    let corrections = 0;
    
    for (let i = 0; i < s1.length; i++) {
      const player1 = s1[i];
      const player2 = s2[i];
      
      const balance1 = this.getColorBalance(player1.id);
      const balance2 = this.getColorBalance(player2.id);
      
      // This pairing corrects colors if players have opposite imbalances
      if ((balance1 > 0 && balance2 < 0) || (balance1 < 0 && balance2 > 0)) {
        corrections++;
      }
    }
    
    return corrections;
  }

  /**
   * Apply Dutch system pairings
   */
  applyDutchPairings(pairings, allPairings, used) {
    pairings.forEach(pairing => {
      if (!used.has(pairing.topPlayer.id) && !used.has(pairing.bottomPlayer.id)) {
        const whitePlayer = this.assignColorsDutch(pairing.topPlayer, pairing.bottomPlayer);
        const blackPlayer = whitePlayer.id === pairing.topPlayer.id ? 
          pairing.bottomPlayer : pairing.topPlayer;
        
        allPairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: allPairings.length + 1
        });
        
        used.add(pairing.topPlayer.id);
        used.add(pairing.bottomPlayer.id);
      }
    });
  }

  /**
   * Check if acceleration should be applied
   */
  shouldApplyAcceleration() {
    if (!this.options.accelerationSettings.enabled) return false;
    
    const rounds = this.options.accelerationSettings.rounds || 2;
    const threshold = this.options.accelerationSettings.threshold;
    
    if (this.round > rounds) return false;
    
    if (threshold && this.players.length < threshold) return false;
    
    // Default USCF rule: use if players > 2^(rounds+1)
    const defaultThreshold = Math.pow(2, rounds + 1);
    return this.players.length >= defaultThreshold;
  }

  /**
   * Apply acceleration to player sorting
   */
  applyAcceleration(players) {
    const accelerationType = this.options.accelerationSettings.type || 'standard';
    
    switch (accelerationType) {
      case 'standard':
        return this.applyStandardAcceleration(players);
      case 'added_score':
        return this.applyAddedScoreAcceleration(players);
      case 'sixths':
        return this.applySixthsAcceleration(players);
      default:
        return players;
    }
  }

  /**
   * Standard acceleration (A1 vs A2, B1 vs B2)
   */
  applyStandardAcceleration(players) {
    const breakPoint = Math.ceil(players.length / 2);
    const aGroup = players.slice(0, breakPoint);
    const bGroup = players.slice(breakPoint);
    
    const a1 = aGroup.slice(0, Math.ceil(aGroup.length / 2));
    const a2 = aGroup.slice(Math.ceil(aGroup.length / 2));
    const b1 = bGroup.slice(0, Math.ceil(bGroup.length / 2));
    const b2 = bGroup.slice(Math.ceil(bGroup.length / 2));
    
    return [...a1, ...a2, ...b1, ...b2];
  }

  /**
   * Added score acceleration
   */
  applyAddedScoreAcceleration(players) {
    const midPoint = Math.ceil(players.length / 2);
    const topHalf = players.slice(0, midPoint);
    
    return players.map(player => ({
      ...player,
      points: player.points + (topHalf.includes(player) ? 1 : 0)
    }));
  }

  /**
   * Sixths acceleration
   */
  applySixthsAcceleration(players) {
    const sixthSize = Math.ceil(players.length / 6);
    const groups = [];
    
    for (let i = 0; i < 6; i++) {
      const start = i * sixthSize;
      const end = Math.min(start + sixthSize, players.length);
      if (start < players.length) {
        groups.push(players.slice(start, end));
      }
    }
    
    return groups.flat();
  }

  /**
   * Assign colors based on color balance rules
   */
  assignColors(player1, player2) {
    const balance1 = this.getColorBalance(player1.id);
    const balance2 = this.getColorBalance(player2.id);
    
    // Rule 1: Player with more black pieces should get white
    if (balance1 < balance2) {
      return player1; // player1 gets white
    } else if (balance1 > balance2) {
      return player2; // player2 gets white
    }
    
    // Rule 2: Avoid same color 3 times in a row
    const lastColors1 = this.getLastTwoColors(player1.id);
    const lastColors2 = this.getLastTwoColors(player2.id);
    
    if (lastColors1 === 'WW') return player2;
    if (lastColors2 === 'WW') return player1;
    if (lastColors1 === 'BB') return player1;
    if (lastColors2 === 'BB') return player2;
    
    // Rule 3: Higher rated player gets due color
    if ((player1.rating || 0) !== (player2.rating || 0)) {
      return (player1.rating || 0) > (player2.rating || 0) ? player1 : player2;
    }
    
    // Rule 4: Final tiebreaker
    return player1.id < player2.id ? player1 : player2;
  }

  /**
   * Assign colors for Dutch system
   */
  assignColorsDutch(player1, player2) {
    const balance1 = this.getColorBalance(player1.id);
    const balance2 = this.getColorBalance(player2.id);
    
    // Dutch system prioritizes color balance
    if (balance1 < balance2) {
      return player1;
    } else if (balance1 > balance2) {
      return player2;
    }
    
    // If equal, use rating
    if ((player1.rating || 0) !== (player2.rating || 0)) {
      return (player1.rating || 0) > (player2.rating || 0) ? player1 : player2;
    }
    
    return player1.id < player2.id ? player1 : player2;
  }

  /**
   * Assign colors for round-robin
   */
  assignColorsRoundRobin(player1, player2, round) {
    // Alternate colors based on round
    return round % 2 === 1 ? player1 : player2;
  }

  /**
   * Assign colors for elimination
   */
  assignColorsElimination(player1, player2) {
    // Higher seeded player gets white
    return (player1.rating || 0) > (player2.rating || 0) ? player1 : player2;
  }

  /**
   * Get last two colors played by a player
   */
  getLastTwoColors(playerId) {
    const history = this.colorHistory[playerId] || [];
    if (!Array.isArray(history)) return '';
    
    const lastTwo = history.slice(-2);
    return lastTwo.map(color => color === 1 ? 'W' : 'B').join('');
  }

  /**
   * Get color balance for a player
   */
  getColorBalance(playerId) {
    const history = this.colorHistory[playerId] || [];
    if (!Array.isArray(history)) return 0;
    
    return history.reduce((sum, color) => sum + color, 0);
  }

  /**
   * Get next lower score group
   */
  getNextLowerScore(currentScore, sortedScores) {
    const currentIndex = sortedScores.indexOf(currentScore);
    return currentIndex < sortedScores.length - 1 ? sortedScores[currentIndex + 1] : null;
  }

  /**
   * Get active players (not eliminated)
   */
  getActivePlayers() {
    return this.players.filter(player => !player.eliminated);
  }

  /**
   * Get player results
   */
  getPlayerResults(playerId) {
    return this.previousPairings
      .filter(p => (p.white_player_id === playerId || p.black_player_id === playerId) && p.result)
      .map(p => ({
        points: this.getPlayerResult(p, playerId),
        round: p.round
      }));
  }

  /**
   * Get player result from a pairing
   */
  getPlayerResult(pairing, playerId) {
    if (!pairing.result) return 0;
    
    const isWhite = pairing.white_player_id === playerId;
    
    if (pairing.result === '1-0') {
      return isWhite ? 1 : 0;
    } else if (pairing.result === '0-1') {
      return isWhite ? 0 : 1;
    } else if (pairing.result === '1/2-1/2') {
      return 0.5;
    }
    
    return 0;
  }

  /**
   * Get average opponent rating
   */
  getAverageOpponentRating(playerId) {
    const playerPairings = this.previousPairings.filter(p => 
      p.white_player_id === playerId || p.black_player_id === playerId
    );
    
    if (playerPairings.length === 0) return 0;
    
    let totalRating = 0;
    playerPairings.forEach(pairing => {
      const opponentId = pairing.white_player_id === playerId ? 
        pairing.black_player_id : pairing.white_player_id;
      const opponent = this.players.find(p => p.id === opponentId);
      if (opponent) {
        totalRating += opponent.rating || 0;
      }
    });
    
    return totalRating / playerPairings.length;
  }

  /**
   * Rotate players for round-robin
   */
  rotateRoundRobinPlayers(players) {
    const n = players.length;
    const fixed = players[0];
    const rotating = players.slice(1);
    
    // Rotate all except first
    const last = rotating.pop();
    rotating.unshift(last);
    
    // Reconstruct array
    players.length = 0;
    players.push(fixed, ...rotating);
  }
}

/**
 * Factory function to create pairing system instances
 */
function createPairingSystem(players, options = {}) {
  return new EnhancedPairingSystem(players, options);
}

/**
 * Get available pairing systems
 */
function getAvailablePairingSystems() {
  return [
    {
      id: 'swiss_standard',
      name: 'Swiss System (Standard)',
      description: 'Standard Swiss system pairing with score groups and color balancing',
      suitableFor: 'Most tournaments',
      features: ['Score groups', 'Color balancing', 'Repeat avoidance']
    },
    {
      id: 'fide_dutch',
      name: 'FIDE Dutch System',
      description: 'Algorithmic Swiss system with aggressive color correction',
      suitableFor: 'FIDE-rated tournaments',
      features: ['Algorithmic precision', 'Aggressive color correction', 'Transposition logic']
    },
    {
      id: 'accelerated_swiss',
      name: 'Accelerated Swiss',
      description: 'Swiss system with acceleration for large tournaments',
      suitableFor: 'Large tournaments (>64 players)',
      features: ['Quick separation', 'Multiple acceleration types', 'Configurable thresholds']
    },
    {
      id: 'round_robin',
      name: 'Round-Robin',
      description: 'All players play each other exactly once',
      suitableFor: 'Small tournaments (<16 players)',
      features: ['Complete fairness', 'Pre-determined schedule', 'No eliminations']
    },
    {
      id: 'single_elimination',
      name: 'Single Elimination',
      description: 'Knockout tournament with bracket system',
      suitableFor: 'Quick tournaments',
      features: ['Fast completion', 'Clear winner', 'Bracket system']
    }
  ];
}

/**
 * Get available tiebreaker systems
 */
function getAvailableTiebreakers() {
  return [
    {
      id: 'buchholz',
      name: 'Buchholz Score',
      description: 'Sum of all opponents\' scores',
      calculation: 'Sum of opponent scores'
    },
    {
      id: 'buchholz_cut1',
      name: 'Buchholz Cut-1',
      description: 'Buchholz score minus lowest opponent score',
      calculation: 'Buchholz - lowest opponent score'
    },
    {
      id: 'sonneborn_berger',
      name: 'Sonneborn-Berger',
      description: 'Sum of scores of defeated opponents + half of drawn opponents',
      calculation: 'Wins × opponent scores + 0.5 × draws × opponent scores'
    },
    {
      id: 'cumulative',
      name: 'Cumulative Score',
      description: 'Sum of running scores after each round',
      calculation: 'Sum of cumulative scores'
    },
    {
      id: 'direct_encounter',
      name: 'Direct Encounter',
      description: 'Result of game between tied players',
      calculation: '1 for win, 0.5 for draw, 0 for loss'
    },
    {
      id: 'performance_rating',
      name: 'Performance Rating',
      description: 'Rating performance based on opponents',
      calculation: 'Average opponent rating + 400 × (score - 0.5)'
    }
  ];
}

module.exports = {
  EnhancedPairingSystem,
  createPairingSystem,
  getAvailablePairingSystems,
  getAvailableTiebreakers
};
