/**
 * Enhanced Pairing System
 * Comprehensive implementation of competitive pairing systems based on FIDE and USCF standards
 * 
 * Now uses the exact bbpPairings implementation for Dutch and Burstein systems
 * 
 * Supports multiple pairing systems:
 * - Swiss System (Standard)
 * - FIDE Dutch System (bbpPairings)
 * - Burstein System (bbpPairings)
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

const { BBPPairingsDirect } = require('./bbpPairingsDirect');
const { BBPPairingsCPP } = require('./bbpPairingsCPP');
const { AdvancedSwissPairingSystem } = require('./advancedSwissPairingSystem');

class EnhancedPairingSystem {
  constructor(players, options = {}) {
    this.players = players;
    this.options = {
      pairingSystem: 'fide_dutch',
      tiebreakerOrder: ['buchholz', 'sonneborn_berger', 'direct_encounter', 'performance_rating'],
      useCPP: true, // Prefer C++ implementation when available
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
    
    // Check if C++ executable is available
    this.cppAvailable = this.checkCPPAvailability();
  }

  /**
   * Check if C++ bbpPairings executable is available
   */
  checkCPPAvailability() {
    try {
      const bbpPairings = new BBPPairingsCPP();
      return true;
    } catch (error) {
      console.log(`[EnhancedPairingSystem] C++ bbpPairings not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Get players who have intentional byes for the current round
   */
  getPlayersWithIntentionalByes() {
    const playersWithByes = new Set();
    
    for (const player of this.players) {
      // Check if player is inactive - treat as bye
      if (player.status === 'inactive') {
        playersWithByes.add(player.id);
        console.log(`[EnhancedPairingSystem] Player ${player.name} is inactive - treating as bye`);
        continue;
      }
      
      // Check both bye_rounds and intentional_bye_rounds columns
      const byeRounds = player.bye_rounds || player.intentional_bye_rounds;
      
      if (byeRounds) {
        try {
          let rounds = [];
          
          // Handle different formats: JSON array, comma-separated string, or already an array
          if (typeof byeRounds === 'string') {
            // Try parsing as JSON first
            try {
              rounds = JSON.parse(byeRounds);
            } catch {
              // If not JSON, try comma-separated string
              rounds = byeRounds.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
            }
          } else if (Array.isArray(byeRounds)) {
            rounds = byeRounds;
          }
          
          if (rounds.includes(this.round)) {
            playersWithByes.add(player.id);
            console.log(`[EnhancedPairingSystem] Player ${player.name} has intentional bye for round ${this.round}`);
          }
        } catch (error) {
          console.warn(`[EnhancedPairingSystem] Error parsing bye rounds for player ${player.name}: ${error.message}`);
        }
      }
    }
    
    return playersWithByes;
  }

  /**
   * Generate pairings for all sections with complete independence
   * This is the main entry point for tournament-wide pairing generation
   * Now uses the exact bbpPairings implementation
   */
  static async generateTournamentPairings(tournamentId, round, db, options = {}) {
    console.log(`[EnhancedPairingSystem] Generating pairings for tournament ${tournamentId}, round ${round} using bbpPairings`);
    
    try {
      // Check tournament format - team tournaments should not use this system
      const tournament = await new Promise((resolve, reject) => {
        db.get('SELECT format FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Team tournaments should use the team-swiss endpoint
      if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin' || tournament.format === 'team-tournament') {
        throw new Error(`This tournament is a team tournament (${tournament.format}). Use the team-swiss pairing endpoint instead.`);
      }

      // Use the new bbpPairings system
      const { BBPPairingsDirect } = require('./bbpPairingsDirect');
      const bbpPairings = new BBPPairingsDirect();
      const result = await bbpPairings.generateTournamentPairings(tournamentId, round, db, options);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Get section information for proper grouping (including inactive players)
      const playersBySection = await new Promise((resolve, reject) => {
        db.all(
          'SELECT section FROM players WHERE tournament_id = ? AND (status = "active" OR status = "inactive") GROUP BY section',
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

      // Group pairings by section
      const sectionResults = {};
      const sectionPairings = {};
      
      playersBySection.forEach(section => {
        sectionPairings[section] = [];
        sectionResults[section] = {
          success: true,
          pairingsCount: 0,
          playersCount: 0,
          registeredByeCount: 0
        };
      });

      // Distribute pairings to sections
      result.pairings.forEach(pairing => {
        const section = pairing.section || 'Open';
        if (sectionPairings[section]) {
          sectionPairings[section].push(pairing);
        }
      });

      // Update section results
      Object.keys(sectionPairings).forEach(section => {
        const pairings = sectionPairings[section];
        sectionResults[section].pairingsCount = pairings.length;
        sectionResults[section].registeredByeCount = pairings.filter(p => p.is_bye).length;
      });

      console.log(`[EnhancedPairingSystem] Generated ${result.pairings.length} pairings using bbpPairings`);

      return {
        success: true,
        pairings: result.pairings,
        sectionResults,
        metadata: {
          tournamentId,
          round,
          totalPairings: result.pairings.length,
          sectionsProcessed: playersBySection.length,
          pairingSystem: result.metadata.pairingSystem,
          byeCount: result.metadata.byeCount
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
   * Generate pairings for a specific section
   */
  async generatePairings() {
    console.log(`[EnhancedPairingSystem] Generating pairings for section ${this.section}, round ${this.round}`);
    
    try {
      // Filter out players with intentional byes for this round
      const playersWithByes = this.getPlayersWithIntentionalByes();
      const playersWithoutByes = this.players.filter(player => !playersWithByes.has(player.id));
      
      console.log(`[EnhancedPairingSystem] ${playersWithByes.size} players have intentional byes, ${playersWithoutByes.length} players available for pairing`);
      
      // Create bye pairings for players with intentional byes
      const byePairings = Array.from(playersWithByes).map((playerId, index) => {
      const player = this.players.find(p => p.id === playerId);
      if (!player) {
        console.warn(`[EnhancedPairingSystem] Could not find player ${playerId} when creating bye pairing`);
        return {
          white_player_id: playerId,
          black_player_id: null,
          white_name: null,
          black_name: null,
          white_rating: null,
          black_rating: null,
          round: this.round,
          board: 0,
          section: this.section,
          tournament_id: this.tournamentId,
          result: 'bye_unpaired',
          is_bye: true,
          bye_type: 'unpaired'
        };
      }

      let byeType = 'unpaired'; // Registered byes receive a full point by default

      // Determine bye type based on player status
      if (player.status === 'inactive') {
        byeType = 'inactive'; // Inactive players continue to receive half-point byes
      }

      return {
        white_player_id: player.id,
        black_player_id: null,
        white_name: player.name,
        black_name: null,
        white_rating: player.rating,
        black_rating: null,
        round: this.round,
        board: 0, // Will be assigned later
        section: this.section,
        tournament_id: this.tournamentId,
        result: `bye_${byeType}`,
        is_bye: true,
        bye_type: byeType
      };
      });
      
      // Generate pairings for remaining players
      let regularPairings = [];
      if (playersWithoutByes.length >= 2) {
        const { BBPPairingsDirect } = require('./bbpPairingsDirect');
        const bbpPairings = new BBPPairingsDirect();
        
        // Create tournament object
        const tournament = {
          round: this.round,
          section: this.section,
          tournamentId: this.tournamentId,
          colorHistory: this.colorHistory,
          pointsForWin: this.options.pointsForWin || 1,
          pointsForDraw: this.options.pointsForDraw || 0.5,
          pointsForLoss: this.options.pointsForLoss || 0
        };

        // Generate pairings using bbpPairings for players without byes
        regularPairings = bbpPairings.generateDutchPairings(playersWithoutByes, tournament);
      }
      
      // Combine bye pairings and regular pairings
      const allPairings = [...byePairings, ...regularPairings];
      
      // Add section and board numbers
      allPairings.forEach((pairing, index) => {
        pairing.section = this.section;
        pairing.board = index + 1;
        pairing.tournament_id = this.tournamentId;
        pairing.round = this.round;
      });

      console.log(`[EnhancedPairingSystem] Generated ${allPairings.length} total pairings for section ${this.section} (${byePairings.length} byes, ${regularPairings.length} regular)`);
      return allPairings;

    } catch (error) {
      console.error(`[EnhancedPairingSystem] Section pairing generation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Check if a round is complete
   */
  static async isRoundComplete(tournamentId, round, db) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT section, COUNT(*) as total, 
                SUM(CASE WHEN result IS NOT NULL OR is_bye = 1 THEN 1 ELSE 0 END) as completed
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
   * Generate pairings using advanced Swiss system
   */
  generateAdvancedSwissPairings() {
    console.log(`[EnhancedPairingSystem] Using Advanced Swiss Pairing System`);
    
    // Filter out players with intentional byes for this round
    const playersWithByes = this.getPlayersWithIntentionalByes();
    const playersWithoutByes = this.players.filter(player => !playersWithByes.has(player.id));
    
    console.log(`[EnhancedPairingSystem] ${playersWithByes.size} players have intentional byes, ${playersWithoutByes.length} players available for pairing`);
    
    // Create bye pairings for players with intentional byes
    const byePairings = Array.from(playersWithByes).map((playerId, index) => {
      const player = this.players.find(p => p.id === playerId);
      if (!player) {
        console.warn(`[EnhancedPairingSystem] Could not find player ${playerId} when creating bye pairing`);
        return {
          white_player_id: playerId,
          black_player_id: null,
          white_name: null,
          black_name: null,
          white_rating: null,
          black_rating: null,
          round: this.round,
          board: 0,
          section: this.section,
          tournament_id: this.tournamentId,
          result: 'bye_unpaired',
          is_bye: true,
          bye_type: 'unpaired'
        };
      }

      let byeType = 'unpaired'; // Registered byes receive a full point by default

      // Determine bye type based on player status
      if (player.status === 'inactive') {
        byeType = 'inactive'; // Inactive players continue to receive half-point byes
      }

      return {
        white_player_id: player.id,
        black_player_id: null,
        white_name: player.name,
        black_name: null,
        white_rating: player.rating,
        black_rating: null,
        round: this.round,
        board: 0, // Will be assigned later
        section: this.section,
        tournament_id: this.tournamentId,
        result: `bye_${byeType}`,
        is_bye: true,
        bye_type: byeType
      };
    });
    
    // Generate pairings for remaining players
    let regularPairings = [];
    if (playersWithoutByes.length >= 2) {
      const swissSystem = new AdvancedSwissPairingSystem(playersWithoutByes, {
        previousPairings: this.previousPairings,
        colorHistory: this.colorHistory,
        section: this.section,
        tournamentId: this.tournamentId,
        round: this.round,
        db: this.db
      });
      
      regularPairings = swissSystem.generatePairings();
    }
    
    // Combine bye pairings and regular pairings
    const allPairings = [...byePairings, ...regularPairings];
    
    // Assign proper board numbers
    allPairings.forEach((pairing, index) => {
      pairing.board = index + 1;
    });
    
    console.log(`[EnhancedPairingSystem] Advanced Swiss generated ${allPairings.length} total pairings (${byePairings.length} byes, ${regularPairings.length} regular)`);
    
    return allPairings;
  }

  /**
   * Generate pairings based on selected system
   */
  async generatePairings() {
    // Filter out players with intentional byes for this round
    const playersWithByes = this.getPlayersWithIntentionalByes();
    const playersWithoutByes = this.players.filter(player => !playersWithByes.has(player.id));
    
    console.log(`[EnhancedPairingSystem] ${playersWithByes.size} players have intentional byes, ${playersWithoutByes.length} players available for pairing`);
    
    // Create bye pairings for players with intentional byes
    const byePairings = Array.from(playersWithByes).map((playerId, index) => {
      const player = this.players.find(p => p.id === playerId);
      if (!player) {
        console.warn(`[EnhancedPairingSystem] Could not find player ${playerId} when creating bye pairing`);
        return {
          white_player_id: playerId,
          black_player_id: null,
          white_name: null,
          black_name: null,
          white_rating: null,
          black_rating: null,
          round: this.round,
          board: 0,
          section: this.section,
          tournament_id: this.tournamentId,
          result: 'bye_unpaired',
          is_bye: true,
          bye_type: 'unpaired'
        };
      }

      let byeType = 'unpaired'; // Registered byes receive a full point by default

      // Determine bye type based on player status
      if (player.status === 'inactive') {
        byeType = 'inactive'; // Inactive players continue to receive half-point byes
      }

      return {
        white_player_id: player.id,
        black_player_id: null,
        white_name: player.name,
        black_name: null,
        white_rating: player.rating,
        black_rating: null,
        round: this.round,
        board: 0, // Will be assigned later
        section: this.section,
        tournament_id: this.tournamentId,
        result: `bye_${byeType}`,
        is_bye: true,
        bye_type: byeType
      };
    });
    
    // Generate pairings for remaining players
    let regularPairings = [];
    if (playersWithoutByes.length >= 2) {
      // Temporarily replace players array for pairing generation
      const originalPlayers = this.players;
      this.players = playersWithoutByes;
      
      switch (this.options.pairingSystem) {
        case 'fide_dutch':
          regularPairings = await this.generateFideDutchPairings();
          break;
        case 'burstein':
          regularPairings = await this.generateBursteinPairings();
          break;
        case 'accelerated_swiss':
          regularPairings = this.generateAcceleratedPairings();
          break;
        case 'round_robin':
          regularPairings = this.generateRoundRobinPairings();
          break;
        case 'single_elimination':
          regularPairings = this.generateSingleEliminationPairings();
          break;
        case 'quad':
          regularPairings = this.generateQuadPairings();
          break;
        case 'advanced_swiss':
          regularPairings = this.generateAdvancedSwissPairings();
          break;
        default:
          regularPairings = await this.generateFideDutchPairings();
      }
      
      // Restore original players array
      this.players = originalPlayers;
    }
    
    // Combine bye pairings and regular pairings
    const allPairings = [...byePairings, ...regularPairings];
    
    // Assign proper board numbers
    allPairings.forEach((pairing, index) => {
      pairing.board = index + 1;
    });
    
    console.log(`[EnhancedPairingSystem] Generated ${allPairings.length} total pairings (${byePairings.length} byes, ${regularPairings.length} regular)`);
    return allPairings;
  }

  /**
   * Standard Swiss System Pairing
   * Based on FIDE C.04.1 and USCF Rule 28
   * Implements proper Swiss system with color balance and repeat avoidance
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
      
      // Use Swiss system pairing for the group
      this.pairGroupSwiss(group, pairings, used);
    }
    
    return pairings;
  }

  /**
   * FIDE Dutch System Pairing
   * Algorithmic with aggressive color correction
   * Uses Swiss system pairing with enhanced color balance rules
   */
  async generateFideDutchPairings() {
    console.log(`[EnhancedPairingSystem] generateFideDutchPairings called with ${this.players.length} players`);
    console.log(`[EnhancedPairingSystem] Players:`, this.players.map(p => ({ id: p.id, name: p.name, rating: p.rating })));
    
    if (this.players.length < 2) {
      console.log(`[EnhancedPairingSystem] Not enough players (${this.players.length}), returning empty array`);
      return [];
    }

    // Try C++ implementation first if available and preferred
    if (this.options.useCPP && this.cppAvailable) {
      console.log(`[EnhancedPairingSystem] Using C++ bbpPairings implementation`);
      try {
        const bbpPairingsCPP = new BBPPairingsCPP();
        const result = await bbpPairingsCPP.generatePairings(this.tournamentId, this.round, this.players, {
          pairingSystem: 'dutch',
          tournamentName: this.section,
          sectionName: this.section,
          tournamentRounds: this.options.tournamentRounds || 5,
          tournamentType: 'S',
          timeControl: this.options.timeControl || '90+30',
          tournamentChiefTD: this.options.tournamentChiefTD || 'TD',
          tournamentChiefArbiter: this.options.tournamentChiefArbiter || 'Arbiter',
          tournamentChiefOrganizer: this.options.tournamentChiefOrganizer || 'Organizer',
          tournamentWebsite: this.options.tournamentWebsite || '',
          tournamentEmail: this.options.tournamentEmail || '',
          tournamentPhone: this.options.tournamentPhone || '',
          tournamentAddress: this.options.tournamentAddress || '',
          tournamentFederation: this.options.tournamentFederation || 'USA',
          tournamentFederationCode: this.options.tournamentFederationCode || 'USA',
          tournamentDate: this.options.tournamentDate || new Date().toISOString().split('T')[0]
        });
        
        if (result.success) {
          console.log(`[EnhancedPairingSystem] C++ bbpPairings result:`, result.pairings);
          return result.pairings;
        } else {
          console.log(`[EnhancedPairingSystem] C++ bbpPairings failed: ${result.error}, falling back to JavaScript`);
        }
      } catch (error) {
        console.log(`[EnhancedPairingSystem] C++ bbpPairings error: ${error.message}, falling back to JavaScript`);
      }
    }

    // Fallback to JavaScript implementation
    console.log(`[EnhancedPairingSystem] Using JavaScript bbpPairings implementation`);
    const bbpPairings = new BBPPairingsDirect();
    const tournament = {
      round: this.round,
      section: this.section,
      tournamentId: this.tournamentId,
      pointsForWin: this.options.pointsForWin || 1,
      pointsForDraw: this.options.pointsForDraw || 0.5,
      pointsForLoss: this.options.pointsForLoss || 0,
      colorHistory: this.colorHistory
    };
    
    console.log(`[EnhancedPairingSystem] Tournament object:`, tournament);
    
    const result = bbpPairings.generateDutchPairings(this.players, tournament);
    console.log(`[EnhancedPairingSystem] BBPPairingsDirect result:`, result);
    
    // Add section and board information
    const finalResult = result.map((pairing, index) => ({
      ...pairing,
      section: this.section,
      board: index + 1
    }));
    
    console.log(`[EnhancedPairingSystem] Final result:`, finalResult);
    return finalResult;
  }

  /**
   * Burstein System Pairing
   * Based on bbpPairings Burstein implementation
   */
  async generateBursteinPairings() {
    console.log(`[EnhancedPairingSystem] generateBursteinPairings called with ${this.players.length} players`);
    
    if (this.players.length < 2) {
      console.log(`[EnhancedPairingSystem] Not enough players (${this.players.length}), returning empty array`);
      return [];
    }

    // Try C++ implementation first if available and preferred
    if (this.options.useCPP && this.cppAvailable) {
      console.log(`[EnhancedPairingSystem] Using C++ bbpPairings implementation for Burstein`);
      try {
        const bbpPairingsCPP = new BBPPairingsCPP();
        const result = await bbpPairingsCPP.generatePairings(this.tournamentId, this.round, this.players, {
          pairingSystem: 'burstein',
          tournamentName: this.section,
          sectionName: this.section,
          tournamentRounds: this.options.tournamentRounds || 5,
          tournamentType: 'S',
          timeControl: this.options.timeControl || '90+30',
          tournamentChiefTD: this.options.tournamentChiefTD || 'TD',
          tournamentChiefArbiter: this.options.tournamentChiefArbiter || 'Arbiter',
          tournamentChiefOrganizer: this.options.tournamentChiefOrganizer || 'Organizer',
          tournamentWebsite: this.options.tournamentWebsite || '',
          tournamentEmail: this.options.tournamentEmail || '',
          tournamentPhone: this.options.tournamentPhone || '',
          tournamentAddress: this.options.tournamentAddress || '',
          tournamentFederation: this.options.tournamentFederation || 'USA',
          tournamentFederationCode: this.options.tournamentFederationCode || 'USA',
          tournamentDate: this.options.tournamentDate || new Date().toISOString().split('T')[0]
        });
        
        if (result.success) {
          console.log(`[EnhancedPairingSystem] C++ bbpPairings Burstein result:`, result.pairings);
          return result.pairings;
        } else {
          console.log(`[EnhancedPairingSystem] C++ bbpPairings Burstein failed: ${result.error}, falling back to JavaScript`);
        }
      } catch (error) {
        console.log(`[EnhancedPairingSystem] C++ bbpPairings Burstein error: ${error.message}, falling back to JavaScript`);
      }
    }

    // Fallback to JavaScript implementation
    console.log(`[EnhancedPairingSystem] Using JavaScript bbpPairings implementation for Burstein`);
    const bbpPairings = new BBPPairingsDirect();
    const result = bbpPairings.generateDutchPairings(this.players, {
      round: this.round,
      section: this.section,
      tournamentId: this.tournamentId,
      pointsForWin: this.options.pointsForWin || 1,
      pointsForDraw: this.options.pointsForDraw || 0.5,
      pointsForLoss: this.options.pointsForLoss || 0
    });
    
    // Add section and board information
    return result.map((pairing, index) => ({
      ...pairing,
      section: this.section,
      board: index + 1
    }));
  }

  /**
   * Pair players using Swiss-Dutch system with Dutch color assignment
   * Implements proper Swiss-Dutch pairing: top half vs bottom half within score group
   */
  pairGroupSwissDutch(group, pairings, used) {
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    // Swiss-Dutch system: divide group into top half and bottom half
    const half = Math.floor(sortedGroup.length / 2);
    const topHalf = sortedGroup.slice(0, half);
    const bottomHalf = sortedGroup.slice(half);
    
    // Pair top half against bottom half
    for (let i = 0; i < topHalf.length; i++) {
      const topPlayer = topHalf[i];
      const bottomPlayer = bottomHalf[i];
      
      if (!used.has(topPlayer.id) && !used.has(bottomPlayer.id)) {
        // Check if these players can be paired (haven't played before)
        if (!this.hasPlayedBefore(topPlayer.id, bottomPlayer.id)) {
          const whitePlayer = this.assignColorsDutch(topPlayer, bottomPlayer);
          const blackPlayer = whitePlayer.id === topPlayer.id ? bottomPlayer : topPlayer;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: this.section,
            board: pairings.length + 1
          });
          
          used.add(topPlayer.id);
          used.add(bottomPlayer.id);
        } else {
          // Players have played before, need to find alternative pairing
          this.findAlternativePairingDutch(topPlayer, bottomPlayer, group, pairings, used);
        }
      }
    }
  }

  /**
   * Find alternative pairing for Dutch system when players have already played
   */
  findAlternativePairingDutch(topPlayer, bottomPlayer, group, pairings, used) {
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const half = Math.floor(sortedGroup.length / 2);
    const topHalf = sortedGroup.slice(0, half);
    const bottomHalf = sortedGroup.slice(half);
    
    // Try to find alternative pairing within the same halves
    // First try to swap within top half
    for (let i = 0; i < topHalf.length; i++) {
      const alternativeTop = topHalf[i];
      if (alternativeTop.id !== topPlayer.id && 
          !used.has(alternativeTop.id) &&
          !this.hasPlayedBefore(alternativeTop.id, bottomPlayer.id)) {
        
        const whitePlayer = this.assignColorsDutch(alternativeTop, bottomPlayer);
        const blackPlayer = whitePlayer.id === alternativeTop.id ? bottomPlayer : alternativeTop;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        
        used.add(alternativeTop.id);
        used.add(bottomPlayer.id);
        return;
      }
    }
    
    // Try to swap within bottom half
    for (let i = 0; i < bottomHalf.length; i++) {
      const alternativeBottom = bottomHalf[i];
      if (alternativeBottom.id !== bottomPlayer.id && 
          !used.has(alternativeBottom.id) &&
          !this.hasPlayedBefore(topPlayer.id, alternativeBottom.id)) {
        
        const whitePlayer = this.assignColorsDutch(topPlayer, alternativeBottom);
        const blackPlayer = whitePlayer.id === topPlayer.id ? alternativeBottom : topPlayer;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        
        used.add(topPlayer.id);
        used.add(alternativeBottom.id);
        return;
      }
    }
    
    // If no alternative found within halves, try cross-pairing
    for (let i = 0; i < group.length; i++) {
      const alternativePlayer = group[i];
      if (alternativePlayer.id !== topPlayer.id && 
          alternativePlayer.id !== bottomPlayer.id && 
          !used.has(alternativePlayer.id) &&
          !this.hasPlayedBefore(topPlayer.id, alternativePlayer.id)) {
        
        const whitePlayer = this.assignColorsDutch(topPlayer, alternativePlayer);
        const blackPlayer = whitePlayer.id === topPlayer.id ? alternativePlayer : topPlayer;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        
        used.add(topPlayer.id);
        used.add(alternativePlayer.id);
        return;
      }
    }
    
    // If no alternative found, create a bye for topPlayer
    pairings.push({
      white_player_id: topPlayer.id,
      black_player_id: null,
      is_bye: true,
      bye_type: 'unpaired',
      section: this.section,
      board: pairings.length + 1
    });
    
    used.add(topPlayer.id);
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
              bye_type: 'unpaired',
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
          bye_type: 'unpaired',
          section: this.section,
          board: i + 1
        });
      }
    }
    
    return pairings;
  }

  /**
   * Quad Pairing System
   * Players are grouped into quads (groups of 4) and play round-robin within each quad
   */
  generateQuadPairings() {
    if (this.players.length < 4) {
      // If less than 4 players, use round-robin
      return this.generateRoundRobinPairings();
    }

    const pairings = [];
    const sortedPlayers = this.sortPlayersByStandings();
    
    // Group players into quads
    const quads = [];
    for (let i = 0; i < sortedPlayers.length; i += 4) {
      const quad = sortedPlayers.slice(i, i + 4);
      quads.push(quad);
    }

    // Handle odd number of players in last quad
    const lastQuad = quads[quads.length - 1];
    if (lastQuad.length < 4 && lastQuad.length > 1) {
      // Move players from last quad to previous quads if possible
      if (quads.length > 1) {
        const previousQuad = quads[quads.length - 2];
        if (previousQuad.length === 4 && lastQuad.length === 2) {
          // Move one player from previous quad to last quad
          const playerToMove = previousQuad.pop();
          lastQuad.push(playerToMove);
        }
      }
    }

    // Generate pairings for each quad
    quads.forEach((quad, quadIndex) => {
      if (quad.length < 2) {
        // Single player gets bye
        pairings.push({
          white_player_id: quad[0].id,
          black_player_id: null,
          is_bye: true,
          bye_type: 'unpaired',
          section: this.section,
          board: pairings.length + 1
        });
        return;
      }

      if (quad.length === 2) {
        // Two players play each other
        const whitePlayer = this.assignColorsQuad(quad[0], quad[1]);
        const blackPlayer = whitePlayer.id === quad[0].id ? quad[1] : quad[0];
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        return;
      }

      if (quad.length === 3) {
        // Three players - one gets bye, other two play
        const byePlayer = quad[2]; // Lowest rated player gets bye
        const whitePlayer = this.assignColorsQuad(quad[0], quad[1]);
        const blackPlayer = whitePlayer.id === quad[0].id ? quad[1] : quad[0];
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        
        pairings.push({
          white_player_id: byePlayer.id,
          black_player_id: null,
          is_bye: true,
          bye_type: 'unpaired',
          section: this.section,
          board: pairings.length + 1
        });
        return;
      }

      // Four players - generate round-robin within quad
      const quadPairings = this.generateQuadRoundRobin(quad, quadIndex);
      pairings.push(...quadPairings);
    });

    return pairings;
  }

  /**
   * Generate round-robin pairings within a quad
   */
  generateQuadRoundRobin(quad, quadIndex) {
    const pairings = [];
    const players = [...quad];
    
    // For 4 players, we need 3 rounds of round-robin
    // Round 1: 1v4, 2v3
    // Round 2: 1v3, 2v4  
    // Round 3: 1v2, 3v4
    
    const roundPairings = [
      [[0, 3], [1, 2]], // Round 1
      [[0, 2], [1, 3]], // Round 2
      [[0, 1], [2, 3]]  // Round 3
    ];

    // Get the current round within the quad
    const currentRoundInQuad = ((this.round - 1) % 3) + 1;
    const roundPairing = roundPairings[currentRoundInQuad - 1];

    roundPairing.forEach(([i, j]) => {
      const player1 = players[i];
      const player2 = players[j];
      
      if (player1 && player2) {
        const whitePlayer = this.assignColorsQuad(player1, player2);
        const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
      }
    });

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
   * Implements proper Swiss system rules with color balance, repeat avoidance, and team avoidance
   * Based on FIDE Swiss system rules and the reference implementation
   */
  generateSwissPairingsForGroup(group, used) {
    const pairings = [];
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    // For Round 1, use proper Swiss system Round 1 pairing
    if (this.round === 1) {
      return this.generateRound1Pairings(sortedGroup);
    }
    
    // For subsequent rounds, use proper Swiss system pairing with all rules
    const availablePlayers = sortedGroup.filter(player => !used.has(player.id));
    
    // Group players by score within this group
    const scoreGroups = this.groupPlayersByScore(availablePlayers);
    const sortedScores = Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    // Process each score group within the main group
    for (const score of sortedScores) {
      const scoreGroup = scoreGroups[score];
      
      // Handle odd number of players in score group
      if (scoreGroup.length % 2 === 1) {
        const floater = this.selectFloater(scoreGroup, scoreGroups, sortedScores);
        if (floater) {
          scoreGroup.splice(scoreGroup.indexOf(floater), 1);
          // Add floater to next lower score group
          const nextScore = this.getNextLowerScore(score, sortedScores);
          if (nextScore !== null) {
            if (!scoreGroups[nextScore]) scoreGroups[nextScore] = [];
            scoreGroups[nextScore].push(floater);
          }
        }
      }
      
      // Pair remaining players in score group using Swiss system rules
      this.pairGroupSwiss(scoreGroup, pairings, used);
    }
    
    return pairings;
  }

  /**
   * Pair players within a score group using Swiss-Dutch system rules
   * Implements proper Swiss-Dutch pairing: top half vs bottom half within score group
   */
  pairGroupSwiss(group, pairings, used) {
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    // Swiss-Dutch system: divide group into top half and bottom half
    const half = Math.floor(sortedGroup.length / 2);
    const topHalf = sortedGroup.slice(0, half);
    const bottomHalf = sortedGroup.slice(half);
    
    // Pair top half against bottom half
    for (let i = 0; i < topHalf.length; i++) {
      const topPlayer = topHalf[i];
      const bottomPlayer = bottomHalf[i];
      
      if (!used.has(topPlayer.id) && !used.has(bottomPlayer.id)) {
        // Check if these players can be paired (haven't played before)
        if (!this.hasPlayedBefore(topPlayer.id, bottomPlayer.id)) {
          const whitePlayer = this.assignColorsSwiss(topPlayer, bottomPlayer);
          const blackPlayer = whitePlayer.id === topPlayer.id ? bottomPlayer : topPlayer;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: this.section,
            board: pairings.length + 1
          });
          
          used.add(topPlayer.id);
          used.add(bottomPlayer.id);
        } else {
          // Players have played before, need to find alternative pairing
          this.findAlternativePairingSwiss(topPlayer, bottomPlayer, group, pairings, used);
        }
      }
    }
  }

  /**
   * Find alternative pairing for Swiss system when players have already played
   */
  findAlternativePairingSwiss(topPlayer, bottomPlayer, group, pairings, used) {
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const half = Math.floor(sortedGroup.length / 2);
    const topHalf = sortedGroup.slice(0, half);
    const bottomHalf = sortedGroup.slice(half);
    
    // Try to find alternative pairing within the same halves
    // First try to swap within top half
    for (let i = 0; i < topHalf.length; i++) {
      const alternativeTop = topHalf[i];
      if (alternativeTop.id !== topPlayer.id && 
          !used.has(alternativeTop.id) &&
          !this.hasPlayedBefore(alternativeTop.id, bottomPlayer.id)) {
        
        const whitePlayer = this.assignColorsSwiss(alternativeTop, bottomPlayer);
        const blackPlayer = whitePlayer.id === alternativeTop.id ? bottomPlayer : alternativeTop;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        
        used.add(alternativeTop.id);
        used.add(bottomPlayer.id);
        return;
      }
    }
    
    // Try to swap within bottom half
    for (let i = 0; i < bottomHalf.length; i++) {
      const alternativeBottom = bottomHalf[i];
      if (alternativeBottom.id !== bottomPlayer.id && 
          !used.has(alternativeBottom.id) &&
          !this.hasPlayedBefore(topPlayer.id, alternativeBottom.id)) {
        
        const whitePlayer = this.assignColorsSwiss(topPlayer, alternativeBottom);
        const blackPlayer = whitePlayer.id === topPlayer.id ? alternativeBottom : topPlayer;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        
        used.add(topPlayer.id);
        used.add(alternativeBottom.id);
        return;
      }
    }
    
    // If no alternative found within halves, try cross-pairing
    for (let i = 0; i < group.length; i++) {
      const alternativePlayer = group[i];
      if (alternativePlayer.id !== topPlayer.id && 
          alternativePlayer.id !== bottomPlayer.id && 
          !used.has(alternativePlayer.id) &&
          !this.hasPlayedBefore(topPlayer.id, alternativePlayer.id)) {
        
        const whitePlayer = this.assignColorsSwiss(topPlayer, alternativePlayer);
        const blackPlayer = whitePlayer.id === topPlayer.id ? alternativePlayer : topPlayer;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: this.section,
          board: pairings.length + 1
        });
        
        used.add(topPlayer.id);
        used.add(alternativePlayer.id);
        return;
      }
    }
    
    // If no alternative found, create a bye for topPlayer
    pairings.push({
      white_player_id: topPlayer.id,
      black_player_id: null,
      is_bye: true,
      bye_type: 'unpaired',
      section: this.section,
      board: pairings.length + 1
    });
    
    used.add(topPlayer.id);
  }

  /**
   * Generate Round 1 pairings using proper Swiss system
   * Seed 1 vs Seed (N/2 + 1), Seed 2 vs Seed (N/2 + 2), etc.
   */
  generateRound1Pairings(sortedGroup) {
    const pairings = [];
    const n = sortedGroup.length;
    const half = Math.floor(n / 2);
    
    // Proper Swiss system Round 1 pairing
    for (let i = 0; i < half; i++) {
      const topPlayer = sortedGroup[i];           // Seed i+1
      const bottomPlayer = sortedGroup[i + half]; // Seed (N/2 + i+1)
      
      // Use proper color assignment based on bbpPairings standard
      const whitePlayer = this.assignColorsSwiss(topPlayer, bottomPlayer);
      const blackPlayer = whitePlayer.id === topPlayer.id ? bottomPlayer : topPlayer;
      
      pairings.push({
        white_player_id: whitePlayer.id,
        black_player_id: blackPlayer.id,
        is_bye: false,
        section: this.section,
        board: i + 1
      });
    }
    
    // Handle odd number of players (bye for eligible player)
    if (n % 2 === 1) {
      const byePlayer = this.selectByePlayer(sortedGroup);
      if (byePlayer) {
        pairings.push({
          white_player_id: byePlayer.id,
          black_player_id: null,
          is_bye: true,
          bye_type: 'unpaired',
          section: this.section,
          board: half + 1
        });
      }
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
   * Implements all standard Swiss system rules
   */
  calculateSwissPairingScore(player1, player2) {
    let score = 0;
    
    // Rule 1: Avoid repeat pairings (highest priority - absolute veto)
    if (this.hasPlayedBefore(player1.id, player2.id)) {
      return -10000; // Absolute veto for repeat pairings
    }
    
    // Rule 2: Avoid team member pairings when possible
    if (this.areTeamMembers(player1, player2)) {
      score -= 1000; // Strong penalty but not absolute veto
    }
    
    // Rule 3: Color balance considerations (very important)
    const balance1 = this.getColorBalance(player1.id);
    const balance2 = this.getColorBalance(player2.id);
    
    // Prefer pairings that correct color imbalances
    if ((balance1 > 0 && balance2 < 0) || (balance1 < 0 && balance2 > 0)) {
      score += 100; // Strong bonus for color correction
    }
    
    // Avoid pairings that worsen color imbalances
    if ((balance1 > 0 && balance2 > 0) || (balance1 < 0 && balance2 < 0)) {
      score -= 50; // Penalty for worsening color balance
    }
    
    // Rule 4: Prefer similar ratings (but not too similar)
    const ratingDiff = Math.abs((player1.rating || 0) - (player2.rating || 0));
    
    // Optimal rating difference is around 50-100 points
    if (ratingDiff >= 50 && ratingDiff <= 100) {
      score += 20; // Bonus for good rating difference
    } else if (ratingDiff < 50) {
      score += 10 - (ratingDiff / 5); // Small bonus for close ratings
    } else {
      score -= Math.min(ratingDiff / 200, 20); // Penalty for large rating differences
    }
    
    // Rule 5: Avoid same color three times in a row
    const lastColors1 = this.getLastTwoColors(player1.id);
    const lastColors2 = this.getLastTwoColors(player2.id);
    
    if (lastColors1 === 'WW' || lastColors2 === 'WW') {
      score -= 30; // Penalty for potential third white
    }
    if (lastColors1 === 'BB' || lastColors2 === 'BB') {
      score -= 30; // Penalty for potential third black
    }
    
    // Rule 6: Prefer players who haven't played recently (if available)
    const gamesPlayed1 = this.getGamesPlayed(player1.id);
    const gamesPlayed2 = this.getGamesPlayed(player2.id);
    
    if (gamesPlayed1 < gamesPlayed2) {
      score += 5; // Slight bonus for pairing with less active player
    }
    
    return score;
  }

  /**
   * Calculate pairing score for Swiss system (legacy method for compatibility)
   */
  calculatePairingScore(player1, player2) {
    return this.calculateSwissPairingScore(player1, player2);
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
   * Check if two players are team members
   */
  areTeamMembers(player1, player2) {
    // Check if both players have the same team name
    if (player1.team_name && player2.team_name) {
      return player1.team_name === player2.team_name;
    }
    
    // Check if they have the same team_id (if available)
    if (player1.team_id && player2.team_id) {
      return player1.team_id === player2.team_id;
    }
    
    return false;
  }

  /**
   * Get number of games played by a player
   */
  getGamesPlayed(playerId) {
    return this.previousPairings.filter(pairing => 
      pairing.white_player_id === playerId || pairing.black_player_id === playerId
    ).length;
  }

  /**
   * Check if a player is eligible for a bye
   * Based on bbpPairings standard: player must not have received a pairing-allocated bye before
   */
  isEligibleForBye(player) {
    // Check if player has already received a pairing-allocated bye
    // A pairing-allocated bye is when a player was paired but didn't play and got a win
    for (const match of player.matches || []) {
      if (!match.gameWasPlayed && match.participatedInPairing && match.result === 'win') {
        return false; // Player already received a pairing-allocated bye
      }
    }
    
    return true;
  }

  /**
   * Select the best player for a bye from a group
   * Follows bbpPairings standard: select from lowest-rated eligible players
   */
  selectByePlayer(group) {
    // Sort by rating (ascending) to prefer lower-rated players
    const sortedGroup = [...group].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    
    // Find the first eligible player
    for (const player of sortedGroup) {
      if (this.isEligibleForBye(player)) {
        return player;
      }
    }
    
    // If no eligible player found, return null (this should not happen in practice)
    console.warn(`[EnhancedPairingSystem] No eligible player found for bye in group of ${group.length} players`);
    return null;
  }

  /**
   * Choose neutral color based on compatible preferences
   * Based on bbpPairings choosePlayerNeutralColor function
   */
  choosePlayerNeutralColor(player1, player2) {
    // Check if color preferences are compatible
    if (this.colorPreferencesAreCompatible(player1.colorPreference, player2.colorPreference)) {
      if (player1.colorPreference && player1.colorPreference !== 'none') {
        return player1.colorPreference;
      } else if (player2.colorPreference && player2.colorPreference !== 'none') {
        return player2.colorPreference === 'white' ? 'black' : 'white';
      } else {
        return null; // Both have no preference
      }
    }
    
    // Handle absolute color preferences
    if (player1.absoluteColorPreference && player2.absoluteColorPreference) {
      if (player1.colorImbalance > player2.colorImbalance) {
        return player1.colorPreference;
      } else if (player2.colorImbalance > player1.colorImbalance) {
        return player2.colorPreference === 'white' ? 'black' : 'white';
      }
    }
    
    // Handle strong color preferences
    if (player1.strongColorPreference && !player2.strongColorPreference) {
      return player1.colorPreference;
    }
    if (player2.strongColorPreference && !player1.strongColorPreference) {
      return player2.colorPreference === 'white' ? 'black' : 'white';
    }
    
    // Check for repeated color patterns
    const player1Colors = this.getLastTwoColors(player1.id);
    const player2Colors = this.getLastTwoColors(player2.id);
    
    if (player1Colors === 'WW' && player2Colors !== 'WW') {
      return 'black'; // Give black to player1
    }
    if (player2Colors === 'WW' && player1Colors !== 'WW') {
      return 'white'; // Give white to player1
    }
    
    return null; // No clear preference
  }

  /**
   * Check if two color preferences are compatible
   */
  colorPreferencesAreCompatible(pref1, pref2) {
    return pref1 !== pref2 || !pref1 || !pref2 || pref1 === 'none' || pref2 === 'none';
  }

  /**
   * Handle repeated color rule for players with equal color imbalance
   */
  handleRepeatedColorRule(player1, player2) {
    const player1Colors = this.getLastTwoColors(player1.id);
    const player2Colors = this.getLastTwoColors(player2.id);
    
    // Avoid giving same color three times in a row
    if (player1Colors === 'WW') return player2;
    if (player2Colors === 'WW') return player1;
    if (player1Colors === 'BB') return player1;
    if (player2Colors === 'BB') return player2;
    
    // Default to higher rated player
    return (player1.rating || 0) > (player2.rating || 0) ? player1 : player2;
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
    
    // Rule 3: Final tiebreaker - consistent ordering (color equalization takes precedence)
    return player1.id < player2.id ? player1 : player2;
  }

  /**
   * Assign colors for Swiss system
   * Implements Swiss system color assignment rules based on FIDE standards
   */
  assignColorsSwiss(player1, player2) {
    // First check for neutral color preferences (compatible preferences)
    const neutralColor = this.choosePlayerNeutralColor(player1, player2);
    if (neutralColor !== null) {
      return neutralColor === 'white' ? player1 : player2;
    }
    
    // Handle absolute color preferences
    if (player1.absoluteColorPreference && player2.absoluteColorPreference) {
      if (player1.colorPreference === player2.colorPreference) {
        // Both have same absolute preference - use color imbalance
        if (player1.colorImbalance > player2.colorImbalance) {
          return player1.colorPreference === 'white' ? player1 : player2;
        } else if (player2.colorImbalance > player1.colorImbalance) {
          return player2.colorPreference === 'white' ? player2 : player1;
        }
        // Equal imbalance - use repeated color rule
        return this.handleRepeatedColorRule(player1, player2);
      } else {
        // Different absolute preferences - both can be satisfied
        return player1.colorPreference === 'white' ? player1 : player2;
      }
    }
    
    // Handle strong color preferences
    if (player1.strongColorPreference && !player2.strongColorPreference) {
      return player1.colorPreference === 'white' ? player1 : player2;
    }
    if (player2.strongColorPreference && !player1.strongColorPreference) {
      return player2.colorPreference === 'white' ? player2 : player1;
    }
    
    // Default: use color balance
    const balance1 = this.getColorBalance(player1.id);
    const balance2 = this.getColorBalance(player2.id);
    
    if (balance1 < balance2) {
      return player1; // player1 gets white
    } else if (balance1 > balance2) {
      return player2; // player2 gets white
    }
    
    // Equal balance: Check for repeated colors
    const lastColors1 = this.getLastTwoColors(player1.id);
    const lastColors2 = this.getLastTwoColors(player2.id);
    
    if (lastColors1 === 'WW' || lastColors2 === 'BB') {
      return player2;
    }
    if (lastColors2 === 'WW' || lastColors1 === 'BB') {
      return player1;
    }
    
    // Final tiebreaker: consistent ordering (not rating)
    return player1.id < player2.id ? player1 : player2;
  }

  /**
   * Assign colors for Dutch system
   * Implements comprehensive color assignment rules
   */
  assignColorsDutch(player1, player2) {
    const balance1 = this.getColorBalance(player1.id);
    const balance2 = this.getColorBalance(player2.id);
    
    // Rule 1: Player with more black pieces should get white (highest priority)
    if (balance1 < balance2) {
      return player1; // player1 gets white
    } else if (balance1 > balance2) {
      return player2; // player2 gets white
    }
    
    // Rule 2: Avoid same color three times in a row
    const lastColors1 = this.getLastTwoColors(player1.id);
    const lastColors2 = this.getLastTwoColors(player2.id);
    
    if (lastColors1 === 'WW') return player2; // player1 had WW, give white to player2
    if (lastColors2 === 'WW') return player1; // player2 had WW, give white to player1
    if (lastColors1 === 'BB') return player1; // player1 had BB, give white to player1
    if (lastColors2 === 'BB') return player2; // player2 had BB, give white to player2
    
    // Rule 3: Final tiebreaker - consistent ordering (color equalization takes precedence)
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
   * Assign colors for quad system
   */
  assignColorsQuad(player1, player2) {
    // Higher rated player gets white
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
   * Returns positive value for more white pieces, negative for more black pieces
   */
  getColorBalance(playerId) {
    const history = this.colorHistory[playerId] || [];
    if (!Array.isArray(history)) return 0;
    
    return history.reduce((sum, color) => sum + color, 0);
  }

  /**
   * Get color preferences for a player (Swiss system style)
   * Returns positive for white preference, negative for black preference
   */
  getColorPreferences(playerId) {
    const history = this.colorHistory[playerId] || [];
    if (!Array.isArray(history)) return 0;
    
    let preference = 0;
    history.forEach(color => {
      preference += color === 1 ? 1 : -1; // 1 for white, -1 for black
    });
    return preference;
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
    },
    {
      id: 'quad',
      name: 'Quad System',
      description: 'Players grouped into quads of 4, round-robin within each quad',
      suitableFor: 'Small to medium tournaments (8-32 players)',
      features: ['Balanced competition', 'Multiple mini-tournaments', 'Fair pairings']
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
