const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { EnhancedPairingSystem } = require('../utils/enhancedPairingSystem');
const { calculateTournamentTiebreakers, getDefaultTiebreakerOrder } = require('../utils/tiebreakers');
const QuadPairingSystem = require('../utils/quadPairingSystem');
const TeamSwissPairingSystem = require('../utils/teamSwissPairingSystem');
const LichessSwissIntegration = require('../utils/lichessSwissIntegration');
const smsService = require('../services/smsService');
const axios = require('axios');
const { cleanupTournamentData } = require('../services/dataCleanupService');
const router = express.Router();

// ============================================================================
// NEW ROBUST PAIRING STORAGE SYSTEM
// ============================================================================

/**
 * Centralized pairing storage service with full transaction support
 */
class PairingStorageService {
  constructor(database) {
    this.db = database;
  }

  /**
   * Store pairings for a specific round with full validation and transaction support
   */
  storePairings(tournamentId, round, pairings, options = {}) {
    const {
      clearExisting = false,
      validateBeforeStore = true,
      validateRoundSeparation = true,
      section = null
    } = options;

    return new Promise((resolve, reject) => {
      // Step 1: Validate tournament exists
      this.getTournament(tournamentId).then((tournament) => {
    if (!tournament) {
          reject(new Error('Tournament not found'));
      return;
    }

        // Step 2: Validate round number
        if (round < 1 || round > tournament.rounds) {
          reject(new Error(`Invalid round number. Round must be between 1 and ${tournament.rounds}`));
          return;
        }

        // Step 3: Check for existing pairings (section-specific if provided)
        const checkExistingPairings = section ? 
          this.getExistingPairingsCountForSection(tournamentId, round, section) :
          this.getExistingPairingsCount(tournamentId, round);
          
        checkExistingPairings.then((existingPairings) => {
          if (existingPairings > 0 && !clearExisting) {
            const sectionText = section ? ` for section "${section}"` : '';
            reject(new Error(`Round ${round} already has ${existingPairings} pairings${sectionText}. Use clearExisting=true to replace them.`));
            return;
          }
          
          // Step 4: Validate round separation (if enabled)
          if (validateRoundSeparation && round > 1) {
            this.isRoundComplete(tournamentId, round - 1).then((previousRoundComplete) => {
              if (!previousRoundComplete.isComplete) {
                reject(new Error(`Cannot store Round ${round} pairings. Round ${round - 1} is not complete. ${previousRoundComplete.incompleteCount} games still need results.`));
                return;
              }

              // Step 5: Validate pairings (if enabled)
              if (validateBeforeStore) {
                this.validatePairingsForStorage(tournamentId, round, pairings).then((validation) => {
                  if (!validation.isValid) {
                    reject(new Error(`Pairing validation failed: ${validation.errors.join(', ')}`));
                    return;
                  }

                  // Proceed with storage
                  this.performStorage(tournamentId, round, pairings, clearExisting, existingPairings, resolve, reject);
                }).catch(reject);
              } else {
                // Proceed with storage without validation
                this.performStorage(tournamentId, round, pairings, clearExisting, existingPairings, resolve, reject);
              }
            }).catch(reject);
    } else {
            // Step 5: Validate pairings (if enabled)
            if (validateBeforeStore) {
              this.validatePairingsForStorage(tournamentId, round, pairings).then((validation) => {
                if (!validation.isValid) {
                  reject(new Error(`Pairing validation failed: ${validation.errors.join(', ')}`));
            return;
          }
          
                // Proceed with storage
                this.performStorage(tournamentId, round, pairings, clearExisting, existingPairings, resolve, reject);
              }).catch(reject);
            } else {
              // Proceed with storage without validation
              this.performStorage(tournamentId, round, pairings, clearExisting, existingPairings, resolve, reject);
            }
          }
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   * Perform the actual storage operation
   */
  performStorage(tournamentId, round, pairings, clearExisting, existingPairings, resolve, reject) {
    // Start transaction
    this.db.serialize(() => {
      this.db.run('BEGIN TRANSACTION');

      // Step 6: Clear existing pairings (if requested)
      if (clearExisting && existingPairings > 0) {
        this.clearRoundPairings(tournamentId, round).then(() => {
          // Step 7: Store new pairings
          this.insertPairings(tournamentId, round, pairings).then((storedPairings) => {
            // Step 8: Commit transaction
            this.db.run('COMMIT', (err) => {
              if (err) {
                this.db.run('ROLLBACK');
                reject(err);
  } else {
                resolve({
                  success: true,
                  storedCount: storedPairings.length,
                  round: round,
                  tournamentId: tournamentId,
                  pairings: storedPairings
                });
              }
            });
          }).catch((err) => {
            this.db.run('ROLLBACK');
            reject(err);
          });
        }).catch((err) => {
          this.db.run('ROLLBACK');
          reject(err);
        });
      } else {
        // Step 7: Store new pairings (no clearing needed)
        this.insertPairings(tournamentId, round, pairings).then((storedPairings) => {
          // Step 8: Commit transaction
          this.db.run('COMMIT', (err) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
            } else {
              resolve({
                success: true,
                storedCount: storedPairings.length,
                round: round,
                tournamentId: tournamentId,
                pairings: storedPairings
              });
            }
          });
        }).catch((err) => {
          this.db.run('ROLLBACK');
          reject(err);
        });
      }
    });
  }

  /**
   * Get tournament information
   */
  getTournament(tournamentId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
            if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get count of existing pairings for a round
   */
  getExistingPairingsCount(tournamentId, round) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM pairings WHERE tournament_id = ? AND round = ?',
          [tournamentId, round],
        (err, row) => {
            if (err) reject(err);
          else resolve(row.count);
          }
        );
      });
  }

  getExistingPairingsCountForSection(tournamentId, round, section) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM pairings WHERE tournament_id = ? AND round = ? AND COALESCE(section, "Open") = ?',
        [tournamentId, round, section],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  /**
   * Check if a round is complete
   */
  isRoundComplete(tournamentId, round) {
    return new Promise((resolve, reject) => {
      this.db.all(
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
   * Validate pairings before storage
   */
  validatePairingsForStorage(tournamentId, round, pairings) {
    return new Promise((resolve, reject) => {
      const errors = [];
      const warnings = [];

      // Basic validation
      if (!Array.isArray(pairings) || pairings.length === 0) {
        errors.push('Pairings must be a non-empty array');
        resolve({ isValid: false, errors, warnings });
          return;
        }

      // Get existing pairings for validation
      this.getPreviousPairings(tournamentId, round).then((existingPairings) => {
        // Validate each pairing
        pairings.forEach((pairing, index) => {
          // Check required fields
          if (!pairing.white_player_id && !pairing.black_player_id) {
            errors.push(`Pairing ${index + 1}: Must have at least one player`);
          }

          // Check for self-pairing
          if (pairing.white_player_id && pairing.black_player_id && 
              pairing.white_player_id === pairing.black_player_id) {
            errors.push(`Pairing ${index + 1}: Player cannot be paired with themselves`);
          }

          // Check round number
          if (pairing.round && pairing.round !== round) {
            errors.push(`Pairing ${index + 1}: Round number mismatch (expected ${round}, got ${pairing.round})`);
          }

          // Check for duplicate pairings in the same round
          const duplicateInRound = pairings.find((p, i) => 
            i !== index && 
            p.white_player_id && p.black_player_id &&
            ((p.white_player_id === pairing.white_player_id && p.black_player_id === pairing.black_player_id) ||
             (p.white_player_id === pairing.black_player_id && p.black_player_id === pairing.white_player_id))
          );

          if (duplicateInRound) {
            errors.push(`Pairing ${index + 1}: Duplicate pairing within the same round`);
          }

          // Check for repeat pairings against previous rounds
          const repeatPairing = existingPairings.find(prev => 
            prev.white_player_id && prev.black_player_id &&
            ((prev.white_player_id === pairing.white_player_id && prev.black_player_id === pairing.black_player_id) ||
             (prev.white_player_id === pairing.black_player_id && prev.black_player_id === pairing.white_player_id))
          );

          if (repeatPairing) {
            errors.push(`Pairing ${index + 1}: Players have already met in Round ${repeatPairing.round}`);
          }
        });

        // Check for players with multiple pairings in the same round
        const playerPairings = {};
        pairings.forEach((pairing, index) => {
    if (pairing.white_player_id) {
            if (!playerPairings[pairing.white_player_id]) {
              playerPairings[pairing.white_player_id] = [];
            }
            playerPairings[pairing.white_player_id].push(index + 1);
          }
    if (pairing.black_player_id) {
            if (!playerPairings[pairing.black_player_id]) {
              playerPairings[pairing.black_player_id] = [];
            }
            playerPairings[pairing.black_player_id].push(index + 1);
          }
        });

        Object.entries(playerPairings).forEach(([playerId, boards]) => {
          if (boards.length > 1) {
            errors.push(`Player ${playerId} appears in multiple pairings: boards ${boards.join(', ')}`);
          }
        });

        resolve({
          isValid: errors.length === 0,
          errors,
          warnings
        });
      }).catch(reject);
    });
  }

  /**
   * Get previous pairings for validation
   */
  getPreviousPairings(tournamentId, currentRound, section = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT white_player_id, black_player_id, round, is_bye FROM pairings WHERE tournament_id = ? AND round < ?';
      let params = [tournamentId, currentRound];
      
      if (section) {
        query += ' AND section = ?';
        params.push(section);
      }
      
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Clear all pairings for a specific round
   */
  clearRoundPairings(tournamentId, round) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM pairings WHERE tournament_id = ? AND round = ?',
        [tournamentId, round],
        function(err) {
        if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  /**
   * Insert pairings into database
   */
  insertPairings(tournamentId, round, pairings) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO pairings (id, tournament_id, round, board, white_player_id, black_player_id, section, is_bye, bye_type, result)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const storedPairings = [];
      let errorOccurred = false;

      pairings.forEach((pairing, index) => {
        if (errorOccurred) return;

        const id = uuidv4();
        const pairingData = [
          id,
          tournamentId,
          round, // Ensure correct round number
          pairing.board || (index + 1),
          pairing.white_player_id,
          pairing.black_player_id,
          pairing.section || 'Open',
          pairing.is_bye || false,
          pairing.bye_type || null,
          pairing.result || null
        ];

        stmt.run(pairingData, function(err) {
          if (err && !errorOccurred) {
            errorOccurred = true;
            reject(err);
            return;
          }

          if (!errorOccurred) {
            storedPairings.push({
              id: id,
              tournament_id: tournamentId,
              round: round,
              board: pairing.board || (index + 1),
              white_player_id: pairing.white_player_id,
              black_player_id: pairing.black_player_id,
              section: pairing.section || 'Open',
              is_bye: pairing.is_bye || false,
              bye_type: pairing.bye_type || null,
              result: pairing.result || null
            });
          }
      });
    });

      stmt.finalize((err) => {
        if (err && !errorOccurred) {
          reject(err);
        } else if (!errorOccurred) {
          resolve(storedPairings);
        }
      });
    });
  }

  /**
   * Get pairings for a specific round with enhanced round independence
   */
  getRoundPairings(tournamentId, round) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT p.*, 
                wp.name as white_name, wp.rating as white_rating, wp.uscf_id as white_uscf_id, wp.lichess_username as white_lichess_username,
                bp.name as black_name, bp.rating as black_rating, bp.uscf_id as black_uscf_id, bp.lichess_username as black_lichess_username
         FROM pairings p
         LEFT JOIN players wp ON p.white_player_id = wp.id
         LEFT JOIN players bp ON p.black_player_id = bp.id
         WHERE p.tournament_id = ? AND p.round = ?
         ORDER BY p.section, p.board`,
        [tournamentId, round],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
  }

  /**
   * Get pairings for a specific round and section
   */
  getRoundPairingsForSection(tournamentId, round, sectionName) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT p.*, 
                wp.name as white_name, wp.rating as white_rating, wp.uscf_id as white_uscf_id, wp.lichess_username as white_lichess_username,
                bp.name as black_name, bp.rating as black_rating, bp.uscf_id as black_uscf_id, bp.lichess_username as black_lichess_username
         FROM pairings p
         LEFT JOIN players wp ON p.white_player_id = wp.id
         LEFT JOIN players bp ON p.black_player_id = bp.id
         WHERE p.tournament_id = ? AND p.round = ? AND COALESCE(p.section, 'Open') = ?
         ORDER BY p.board`,
        [tournamentId, round, sectionName],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Get all pairings for a tournament with round independence
   */
  getAllTournamentPairings(tournamentId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT p.*, 
                wp.name as white_name, wp.rating as white_rating, wp.uscf_id as white_uscf_id,
                bp.name as black_name, bp.rating as black_rating, bp.uscf_id as black_uscf_id
         FROM pairings p
         LEFT JOIN players wp ON p.white_player_id = wp.id
         LEFT JOIN players bp ON p.black_player_id = bp.id
         WHERE p.tournament_id = ?
         ORDER BY p.round, p.section, p.board`,
        [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
  }

  /**
   * Get pairings grouped by round for independent round management
   */
  getPairingsByRound(tournamentId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT p.*, 
                wp.name as white_name, wp.rating as white_rating, wp.uscf_id as white_uscf_id,
                bp.name as black_name, bp.rating as black_rating, bp.uscf_id as black_uscf_id
         FROM pairings p
         LEFT JOIN players wp ON p.white_player_id = wp.id
         LEFT JOIN players bp ON p.black_player_id = bp.id
         WHERE p.tournament_id = ?
         ORDER BY p.round, p.section, p.board`,
        [tournamentId],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Group by round for independent round management
            const groupedByRound = {};
            rows.forEach(pairing => {
              const round = pairing.round;
              if (!groupedByRound[round]) {
                groupedByRound[round] = [];
              }
              groupedByRound[round].push(pairing);
            });
            
            resolve(groupedByRound);
          }
        );
      });
  }

  /**
   * Get round status with enhanced independence checking
   */
  getRoundStatus(tournamentId, round) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT 
          p.round,
          p.section,
          COUNT(*) as total_pairings,
          SUM(CASE WHEN p.result IS NOT NULL THEN 1 ELSE 0 END) as completed_pairings,
          SUM(CASE WHEN p.result IS NULL THEN 1 ELSE 0 END) as pending_pairings
         FROM pairings p
         WHERE p.tournament_id = ? AND p.round = ?
         GROUP BY p.round, p.section
         ORDER BY p.section`,
        [tournamentId, round],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          const sections = {};
          let totalPairings = 0;
          let completedPairings = 0;
          let pendingPairings = 0;
          
          rows.forEach(row => {
            const section = row.section || 'Open';
            sections[section] = {
              total: row.total_pairings,
              completed: row.completed_pairings,
              pending: row.pending_pairings,
              percentage: row.total_pairings > 0 ? 
                Math.round((row.completed_pairings / row.total_pairings) * 100) : 0,
              isComplete: row.pending_pairings === 0 && row.total_pairings > 0
            };
            
            totalPairings += row.total_pairings;
            completedPairings += row.completed_pairings;
            pendingPairings += row.pending_pairings;
          });
          
          const overallPercentage = totalPairings > 0 ? 
            Math.round((completedPairings / totalPairings) * 100) : 0;
          
          resolve({
            round,
            totalPairings,
            completedPairings,
            pendingPairings,
            percentage: overallPercentage,
            isComplete: pendingPairings === 0 && totalPairings > 0,
            sections,
            canGenerateNextRound: pendingPairings === 0 && totalPairings > 0
          });
        }
      );
    });
  }

  /**
   * Get status for a specific section and round
   */
  getSectionStatus(tournamentId, round, sectionName) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN result IS NOT NULL THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN result IS NULL THEN 1 ELSE 0 END) as pending
        FROM pairings 
        WHERE tournament_id = ? AND round = ? AND COALESCE(section, 'Open') = ?`,
        [tournamentId, round, sectionName],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          const total = row.total || 0;
          const completed = row.completed || 0;
          const pending = row.pending || 0;
          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
          const isComplete = completed === total && total > 0;

          resolve({
            section: sectionName,
            round: round,
            totalPairings: total,
            completedPairings: completed,
            pendingPairings: pending,
            percentage: percentage,
            isComplete: isComplete,
            hasPairings: total > 0,
            canGenerateNextRound: isComplete
          });
        }
      );
    });
  }

  /**
   * Get status for all rounds of a tournament
   */
  getAllRoundsStatus(tournamentId) {
    return new Promise((resolve, reject) => {
      // Get tournament info first
      this.getTournament(tournamentId).then((tournament) => {
        if (!tournament) {
          reject(new Error('Tournament not found'));
          return;
        }

        const roundsStatus = {};
        let completedRounds = 0;

        const checkRounds = async () => {
          for (let round = 1; round <= tournament.rounds; round++) {
            try {
              const roundStatus = await this.getRoundStatus(tournamentId, round);
              roundsStatus[round] = roundStatus;
              if (roundStatus.isComplete) {
                completedRounds++;
              }
            } catch (error) {
              console.warn(`Error checking status for round ${round}:`, error.message);
              roundsStatus[round] = {
                round: round,
                totalPairings: 0,
                completedPairings: 0,
                pendingPairings: 0,
                percentage: 0,
                isComplete: false,
                sections: {},
                canGenerateNextRound: false
              };
            }
          }
          resolve(roundsStatus);
        };

        checkRounds();
      }).catch(reject);
    });
  }

  /**
   * Validate entire tournament pairing integrity
   */
  validateTournamentPairings(tournamentId) {
    return new Promise((resolve, reject) => {
      this.getTournament(tournamentId).then((tournament) => {
        if (!tournament) {
          reject(new Error('Tournament not found'));
      return;
    }
    
        const rounds = [];
        const issues = [];
        const warnings = [];

        // Check each round
        const checkRounds = async () => {
          for (let round = 1; round <= tournament.rounds; round++) {
            const roundStatus = await this.isRoundComplete(tournamentId, round);
            const pairings = await this.getRoundPairings(tournamentId, round);
            
            rounds.push({
              round,
              totalPairings: roundStatus.totalPairings,
              completedPairings: roundStatus.completedPairings,
              isComplete: roundStatus.isComplete,
              hasPairings: pairings.length > 0,
              sections: [...new Set(pairings.map(p => p.section))]
            });

            // Check for round progression issues
            if (round > 1) {
              const prevRound = rounds[round - 2];
              if (!prevRound.isComplete && pairings.length > 0) {
                issues.push(`Round ${round} has pairings but Round ${round - 1} is not complete`);
              }
              if (!prevRound.hasPairings && pairings.length > 0) {
                issues.push(`Round ${round} has pairings but Round ${round - 1} has no pairings`);
              }
            }
          }

          // Check for data consistency issues
          return Promise.all([
            this.findDuplicatePairings(tournamentId),
            this.findMultiplePairings(tournamentId),
            this.findMissingResults(tournamentId)
          ]);
        };

        checkRounds().then(([duplicatePairings, multiplePairings, missingResults]) => {
          if (duplicatePairings.length > 0) {
            issues.push(`Found ${duplicatePairings.length} duplicate pairings`);
          }

          if (multiplePairings.length > 0) {
            issues.push(`Found ${multiplePairings.length} players with multiple pairings in the same round`);
          }

          if (missingResults.length > 0) {
            warnings.push(`Found ${missingResults.length} pairings with missing results`);
          }

          resolve({
            tournamentId,
            isValid: issues.length === 0,
            hasWarnings: warnings.length > 0,
            issues,
            warnings,
            rounds,
            summary: {
              totalRounds: tournament.rounds,
              roundsWithPairings: rounds.filter(r => r.hasPairings).length,
              completeRounds: rounds.filter(r => r.isComplete).length,
              totalPairings: rounds.reduce((sum, r) => sum + r.totalPairings, 0),
              completedPairings: rounds.reduce((sum, r) => sum + r.completedPairings, 0)
            }
          });
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   * Find duplicate pairings across rounds
   */
  findDuplicatePairings(tournamentId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT white_player_id, black_player_id, COUNT(*) as count
         FROM pairings 
         WHERE tournament_id = ? AND white_player_id IS NOT NULL AND black_player_id IS NOT NULL
         GROUP BY white_player_id, black_player_id
         HAVING COUNT(*) > 1`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Find players with multiple pairings in the same round
   */
  findMultiplePairings(tournamentId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT white_player_id as player_id, round, COUNT(*) as count
         FROM pairings 
         WHERE tournament_id = ? AND white_player_id IS NOT NULL
         GROUP BY white_player_id, round
         HAVING COUNT(*) > 1
         UNION
         SELECT black_player_id as player_id, round, COUNT(*) as count
         FROM pairings 
         WHERE tournament_id = ? AND black_player_id IS NOT NULL
         GROUP BY black_player_id, round
         HAVING COUNT(*) > 1`,
        [tournamentId, tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  /**
   * Find pairings with missing results
   */
  findMissingResults(tournamentId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT round, section, COUNT(*) as count
         FROM pairings 
         WHERE tournament_id = ? AND result IS NULL
         GROUP BY round, section`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

// Create singleton instance
const pairingStorage = new PairingStorageService(db);

// ============================================================================
// NEW API ENDPOINTS USING ROBUST STORAGE SYSTEM
// ============================================================================

/**
 * Generate and store pairings for a round - ENHANCED VERSION with round independence
 * This endpoint uses the enhanced pairing system for complete section and round independence
 */
router.post('/generate', async (req, res) => {
  const { tournamentId, round, clearExisting = false } = req.body;

  try {
    const currentRound = parseInt(round);
    
    if (isNaN(currentRound) || currentRound < 1) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid round number. Round must be a positive integer.' 
      });
      return;
    }

    // Check if round already has pairings (unless clearExisting is true)
    if (!clearExisting) {
      const existingPairings = await pairingStorage.getRoundPairings(tournamentId, currentRound);
      if (existingPairings.length > 0) {
        res.status(400).json({
          success: false,
          error: `Round ${currentRound} already has ${existingPairings.length} pairings. Use clearExisting=true to replace them.`,
          existingPairingsCount: existingPairings.length
        });
        return;
      }
    }

    // Clear existing pairings if requested
    if (clearExisting) {
      await pairingStorage.clearRoundPairings(tournamentId, currentRound);
    }

    // Main generation endpoint now only provides section information
    // Individual sections must be generated separately using /generate/section
    
    // Get all sections for this tournament
    const sections = await new Promise((resolve, reject) => {
      db.all(
        'SELECT DISTINCT COALESCE(section, "Open") as section_name FROM players WHERE tournament_id = ? AND status = "active"',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.section_name));
        }
      );
    });

    if (sections.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No active players found for any section'
      });
      return;
    }

    res.json({
      success: true,
      message: `Round ${currentRound} - Use section-specific endpoints to generate pairings`,
      availableSections: sections,
      instructions: {
        message: 'Sections must be generated individually for complete independence',
        endpoints: {
          generateSection: `/api/pairings/generate/section`,
          getSectionStatus: `/api/pairings/tournament/${tournamentId}/round/${currentRound}/section/{sectionName}/status`,
          getSectionPairings: `/api/pairings/tournament/${tournamentId}/round/${currentRound}/section/{sectionName}`
        }
      },
      metadata: {
        tournamentId,
        round: currentRound,
        sectionsAvailable: sections.length
      }
    });
    return;

    // Get updated round status after generation
    const roundStatus = await pairingStorage.getRoundStatus(tournamentId, currentRound);

    res.json({ 
      success: true,
      message: `Round ${currentRound} pairings generated and stored successfully`,
      pairings: result.pairings,
      sectionResults: result.sectionResults,
      metadata: result.metadata,
      roundStatus
    });

  } catch (error) {
    console.error('Error generating pairings:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Regenerate pairings for a round (clears existing first) - ENHANCED VERSION
 */
router.post('/regenerate', async (req, res) => {
  const { tournamentId, round } = req.body;

  try {
    const currentRound = parseInt(round);
    
    if (isNaN(currentRound) || currentRound < 1) {
      res.status(400).json({ 
        success: false,
        error: 'Invalid round number. Round must be a positive integer.' 
      });
      return;
    }

    // Clear existing pairings first
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM pairings WHERE tournament_id = ? AND round = ?',
        [tournamentId, currentRound],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Use the enhanced pairing system
    const result = await EnhancedPairingSystem.generateTournamentPairings(tournamentId, currentRound, db);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        sectionResults: result.sectionResults
      });
      return;
    }

    // Store pairings using the enhanced system's built-in storage
    await EnhancedPairingSystem.storePairings(tournamentId, currentRound, result.pairings, db);

    res.json({ 
      success: true,
      message: `Round ${currentRound} pairings regenerated and stored successfully`,
      pairings: result.pairings,
      sectionResults: result.sectionResults,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('Error regenerating pairings:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Send webhook notification for pairings (internal utility)
 */
async function sendPairingNotificationWebhook(tournamentId, round, pairings, tournament) {
  try {
    // Use environment variable webhook URL if available, otherwise fall back to tournament-specific
    const webhookUrl = process.env.PAIRING_NOTIFICATION_WEBHOOK || tournament?.webhook_url;
    
    if (!webhookUrl) {
      console.warn('[Email Notifications] No webhook URL configured (neither tournament.webhook_url nor PAIRING_NOTIFICATION_WEBHOOK)');
      return;
    }
    
    console.log(`[Email Notifications] Using webhook URL: ${process.env.PAIRING_NOTIFICATION_WEBHOOK ? 'environment variable' : 'tournament-specific'}`);
    // Log the exact URL to verify correct configuration on Heroku
    console.log(`[Email Notifications] Webhook URL value: ${webhookUrl}`);

    // Get organization info if tournament has organization_id
    let organizationLogo = null;
    if (tournament?.organization_id) {
      organizationLogo = await new Promise((resolve) => {
        db.get('SELECT logo_url FROM organizations WHERE id = ?', [tournament.organization_id], (err, row) => {
          resolve(row?.logo_url || null);
        });
      });
    }

    // Get player emails from database
    const pairingsWithEmails = await Promise.all(pairings.map(async (p) => {
      let whiteEmail = null;
      let blackEmail = null;

      // Get white player email
      if (p.white_player_id) {
        whiteEmail = await new Promise((resolve) => {
          db.get('SELECT email FROM players WHERE id = ?', [p.white_player_id], (err, row) => {
            resolve(row?.email || null);
          });
        });
      }

      // Get black player email
      if (p.black_player_id) {
        blackEmail = await new Promise((resolve) => {
          db.get('SELECT email FROM players WHERE id = ?', [p.black_player_id], (err, row) => {
            resolve(row?.email || null);
          });
        });
      }

      return {
        board: p.board,
        white: {
          id: p.white_player_id,
          name: p.white_name || 'TBD',
          rating: p.white_rating || 0,
          email: whiteEmail
        },
        black: {
          id: p.black_player_id,
          name: p.black_name || 'TBD',
          rating: p.black_rating || 0,
          email: blackEmail
        },
        section: p.section || 'Open'
      };
    }));

    // Count how many players have email addresses
    const playersWithEmails = new Set();
    pairingsWithEmails.forEach(p => {
      if (p.white.email) playersWithEmails.add(p.white.email);
      if (p.black.email) playersWithEmails.add(p.black.email);
    });
    
    console.log(`[Email Notifications] Sending pairings for Round ${round} to ${playersWithEmails.size} unique players with email addresses`);
    console.log(`[Email Notifications] Total pairings: ${pairingsWithEmails.length}, Players with emails: ${playersWithEmails.size}`);

    const payload = {
      event: 'pairings_generated',
      tournament: {
        id: tournamentId,
        name: tournament?.name || 'Unknown Tournament',
        format: tournament?.format || 'swiss',
        rounds: tournament?.rounds || 1,
        logo_url: tournament?.logo_url || null,
        organization_logo: organizationLogo || null
      },
      round: round,
      pairingsCount: pairingsWithEmails?.length || 0,
      timestamp: new Date().toISOString(),
      pairings: pairingsWithEmails || []
    };

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000
    });

    if (response.status >= 200 && response.status < 300) {
      const playersWithEmailsCount = new Set(pairingsWithEmails.flatMap(p => [p.white.email, p.black.email].filter(Boolean))).size;
      console.log(`[Email Notifications] Webhook sent successfully - ${pairingsWithEmails.length} pairings, ${playersWithEmailsCount} unique players with emails`);
    } else {
      console.error(`[Email Notifications] Webhook notification failed with status ${response.status}`);
    }
  } catch (error) {
    // Log specific network error types for debugging
    if (error.code === 'ECONNREFUSED') {
      console.error('[Email Notifications] Webhook failed: Connection refused. Make sure the webhook URL is correct and the service is running.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('[Email Notifications] Webhook failed: Could not resolve webhook URL hostname.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('[Email Notifications] Webhook failed: Request timeout.');
    } else {
      console.error('[Email Notifications] Error sending webhook:', error.message);
    }
    // Don't throw - webhook failure shouldn't block pairing generation
  }
}

/**
 * Generate pairings for a specific section
 */
router.post('/generate/section', async (req, res) => {
  const { tournamentId, round, sectionName, clearExisting = false, startingBoardNumber = 1 } = req.body;

  try {
    // Get tournament info
    const tournament = await pairingStorage.getTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const currentRound = parseInt(round);
    
    // Validate round number
    if (currentRound < 1 || currentRound > tournament.rounds) {
      res.status(400).json({ 
        error: `Invalid round number. Round must be between 1 and ${tournament.rounds}` 
      });
      return;
    }

    // Check tournament format - Quad and Team Swiss tournaments use different endpoints
    if (tournament.format === 'quad') {
      return res.status(400).json({ 
        error: 'Quad tournaments must use the /generate/quad endpoint, which generates all rounds at once' 
      });
    }

    if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin' || tournament.format === 'team-tournament') {
      return res.status(400).json({ 
        error: `Team tournaments must use the /generate/team-swiss endpoint for round ${round}` 
      });
    }

    // Handle online-rated tournaments (Lichess Swiss)
    if (tournament.format === 'online-rated') {
      return res.status(400).json({ 
        error: 'Online-rated tournaments use Lichess Swiss pairings. Please use the Lichess integration to manage pairings directly on Lichess.' 
      });
    }

    // Get players for the specific section
    console.log(`[PairingGeneration] Fetching players for tournament ${tournamentId}, section "${sectionName}"`);
    const players = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? AND (status = "active" OR status = "inactive") AND section = ? ORDER BY rating DESC',
        [tournamentId, sectionName],
        (err, rows) => {
          if (err) {
            console.error(`[PairingGeneration] Database error fetching players:`, err);
            reject(err);
          } else {
            console.log(`[PairingGeneration] Found ${rows.length} players for section "${sectionName}"`);
            console.log(`[PairingGeneration] Players:`, rows.map(p => ({ 
              id: p.id, 
              name: p.name, 
              rating: p.rating, 
              section: p.section,
              bye_rounds: p.bye_rounds,
              intentional_bye_rounds: p.intentional_bye_rounds
            })));
            // Parse intentional_bye_rounds from JSON string to array
            const processedRows = rows.map(player => {
              if (player.intentional_bye_rounds) {
                try {
                  player.intentional_bye_rounds = JSON.parse(player.intentional_bye_rounds);
                } catch (e) {
                  player.intentional_bye_rounds = [];
                }
              }
              return player;
            });
            resolve(processedRows);
          }
        }
      );
    });

    // Calculate points for each player from game results
    console.log(`[PairingGeneration] Calculating points for ${players.length} players`);
    const playersWithPoints = await Promise.all(players.map(async (player) => {
      try {
        const results = await new Promise((resolve, reject) => {
          db.all(
            `SELECT 
              CASE 
                WHEN (pair.white_player_id = ? AND pair.result = '1-0') OR
                     (pair.black_player_id = ? AND pair.result = '0-1')
                THEN 1
                WHEN (pair.white_player_id = ? AND pair.result = '0-1') OR
                     (pair.black_player_id = ? AND pair.result = '1-0')
                THEN 0
                WHEN (pair.white_player_id = ? AND pair.result = '1/2-1/2') OR
                     (pair.black_player_id = ? AND pair.result = '1/2-1/2')
                THEN 0.5
                WHEN (pair.white_player_id = ? AND (pair.result = 'bye' OR pair.result LIKE 'bye_%')) OR
                     (pair.black_player_id = ? AND (pair.result = 'bye' OR pair.result LIKE 'bye_%'))
                THEN CASE 
                  WHEN pair.bye_type = 'bye' THEN 0.5
                  WHEN pair.bye_type = 'half_point_bye' THEN 0.5
                  WHEN pair.bye_type = 'unpaired' THEN 1.0
                  ELSE 0.5
                END
                ELSE 0
              END as points,
              pair.color,
              pair.result,
              pair.bye_type
             FROM pairings pair
             WHERE (pair.white_player_id = ? OR pair.black_player_id = ?) 
               AND pair.tournament_id = ? 
               AND pair.round < ?
               AND pair.result IS NOT NULL
             ORDER BY pair.round`,
            [player.id, player.id, player.id, player.id, player.id, player.id, player.id, player.id, player.id, player.id, tournamentId, currentRound],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        const totalPoints = results.reduce((sum, result) => sum + (result.points || 0), 0);
        
        console.log(`[PairingGeneration] Player ${player.name} (${player.id}): ${totalPoints} points from ${results.length} games`);
        
        return {
          ...player,
          points: totalPoints,
          gameResults: results
        };
      } catch (error) {
        console.error(`[PairingGeneration] Error calculating points for player ${player.id}:`, error.message);
        return {
          ...player,
          points: 0,
          gameResults: []
        };
      }
    }));

    console.log(`[PairingGeneration] Players with points:`, playersWithPoints.map(p => ({ 
      id: p.id, 
      name: p.name, 
      rating: p.rating, 
      points: p.points,
      section: p.section 
    })));

    if (playersWithPoints.length === 0) {
      console.error(`[PairingGeneration] No active players found for section "${sectionName}"`);
      res.status(400).json({ error: `No active players found for section "${sectionName}"` });
      return;
    }

    // Get previous pairings for Swiss system (filtered by section)
    const previousPairings = await pairingStorage.getPreviousPairings(tournamentId, currentRound, sectionName);

    // Get color history for this section
    const sectionColorHistory = {};
    for (const player of playersWithPoints) {
      try {
        const results = await new Promise((resolve, reject) => {
          db.all(
            `SELECT 
              CASE 
                WHEN white_player_id = ? THEN 'white'
                WHEN black_player_id = ? THEN 'black'
                ELSE NULL
              END as color
             FROM pairings 
             WHERE (white_player_id = ? OR black_player_id = ?) 
               AND tournament_id = ? 
               AND round < ?
             ORDER BY round`,
            [player.id, player.id, player.id, player.id, tournamentId, currentRound],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows.filter(row => row.color !== null));
            }
          );
        });

        let balance = 0;
        results.forEach(result => {
          balance += result.color === 'white' ? 1 : -1;
        });
        sectionColorHistory[player.id] = balance;
      } catch (error) {
        console.warn(`Could not get color history for player ${player.id}:`, error.message);
        sectionColorHistory[player.id] = 0;
      }
    }

    // Create enhanced pairing system for this section only
    const sectionSystem = new EnhancedPairingSystem(playersWithPoints, {
      previousPairings,
      colorHistory: sectionColorHistory,
      section: sectionName,
      tournamentId,
      db,
      round: currentRound,
      pairingSystem: 'advanced_swiss' // Use advanced Swiss system
    });

    // Generate pairings for this section only using bbpPairings
    console.log(`[PairingGeneration] Generating pairings for ${playersWithPoints.length} players in section "${sectionName}"`);
    const generatedPairings = await sectionSystem.generatePairings();
    console.log(`[PairingGeneration] Generated ${generatedPairings.length} pairings`);
    
    // Check if pairings were generated
    if (!generatedPairings || generatedPairings.length === 0) {
      console.error(`[PairingGeneration] No pairings generated for section "${sectionName}"`);
      res.status(400).json({ 
        error: `Failed to generate pairings for section "${sectionName}". No pairings were created.` 
      });
      return;
    }
    
    // Assign board numbers and section info
    const startBoard = parseInt(startingBoardNumber) || 1;
    generatedPairings.forEach((pairing, index) => {
      pairing.board = startBoard + index;
      pairing.section = sectionName;
      pairing.round = currentRound;
      pairing.tournament_id = tournamentId;
    });

    // Check for existing pairings in this specific section
    const existingSectionPairings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM pairings WHERE tournament_id = ? AND round = ? AND COALESCE(section, "Open") = ?',
        [tournamentId, currentRound, sectionName],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    if (existingSectionPairings > 0 && !clearExisting) {
      res.status(400).json({ 
        error: `Round ${currentRound} already has ${existingSectionPairings} pairings for section "${sectionName}". Use clearExisting=true to replace them.` 
      });
      return;
    }

    // Store pairings using the robust storage system
    const storeResult = await pairingStorage.storePairings(tournamentId, currentRound, generatedPairings, {
      clearExisting: clearExisting,
      validateBeforeStore: true,
      validateRoundSeparation: false, // Allow section independence
      section: sectionName
    });

    // Automatically record bye results for players with byes
    for (const pairing of generatedPairings) {
      if (pairing.is_bye && pairing.white_player_id && !pairing.black_player_id) {
        try {
          // Calculate bye points
          const byePoints = calculateByePoints(pairing.bye_type);
          
          // Record bye result for the white player
          await new Promise((resolve, reject) => {
            const resultId = uuidv4();
            db.run(
              `INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points, pairing_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [resultId, tournamentId, pairing.white_player_id, currentRound, 
               null, 'white', `bye_${pairing.bye_type || 'bye'}`, byePoints, pairing.id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          console.log(`[PairingGeneration] Automatically recorded bye result for player ${pairing.white_player_id}: ${byePoints} points`);
        } catch (error) {
          console.error(`[PairingGeneration] Error recording bye result for player ${pairing.white_player_id}:`, error.message);
        }
      }
    }

    // Send webhook notification for pairings generated (only if enabled)
    if (tournament?.notifications_enabled) {
      await sendPairingNotificationWebhook(tournamentId, currentRound, generatedPairings, tournament);
    } else {
      console.log(`Notifications disabled for tournament ${tournamentId}, skipping webhook`);
    }

    // Send SMS notifications for pairings (if enabled and Twilio is configured)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        console.log(`[SMS Notifications] Attempting to send text notifications for Round ${currentRound}`);
        const smsResult = await smsService.sendPairingNotifications(tournamentId, currentRound, generatedPairings);
        console.log(`[SMS Notifications] SMS notification results:`, smsResult);
      } catch (smsError) {
        // Don't throw - SMS failure shouldn't block pairing generation
        console.error('[SMS Notifications] SMS notification failed:', smsError.message);
      }
    } else {
      console.log(`[SMS Notifications] SMS notifications skipped - Twilio not configured`);
    }

    res.json({ 
      success: true,
      message: `Round ${currentRound} pairings generated and stored successfully for section "${sectionName}"`,
      pairings: generatedPairings,
      sectionResults: {
        [sectionName]: {
          success: true,
          pairingsCount: generatedPairings.length,
          playersCount: players.length
        }
      },
      metadata: {
        tournamentId,
        round: currentRound,
        section: sectionName,
        pairingSystem: 'advanced_swiss',
        cppUsed: false, // Advanced Swiss system uses JavaScript implementation
        generatedAt: new Date().toISOString()
      },
      ...storeResult
    });

  } catch (error) {
    console.error('Error generating pairings for section:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get pairings for a specific section and round
 */
router.get('/tournament/:tournamentId/round/:round/section/:sectionName', async (req, res) => {
  const { tournamentId, round, sectionName } = req.params;
  const currentRound = parseInt(round);

  try {
    // Get pairings for this specific section and round
    const pairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                pw.name as white_name, pw.rating as white_rating, pw.uscf_id as white_uscf_id, pw.lichess_username as white_lichess_username,
                pb.name as black_name, pb.rating as black_rating, pb.uscf_id as black_uscf_id, pb.lichess_username as black_lichess_username
         FROM pairings p
         LEFT JOIN players pw ON p.white_player_id = pw.id
         LEFT JOIN players pb ON p.black_player_id = pb.id
         WHERE p.tournament_id = ? AND p.round = ? AND p.section = ?
         ORDER BY p.board`,
        [tournamentId, currentRound, sectionName],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get section status
    const sectionStatus = await pairingStorage.getSectionStatus(tournamentId, currentRound, sectionName);

    res.json({
      success: true,
      tournamentId,
      round: currentRound,
      section: sectionName,
      pairings,
      sectionStatus,
      pairingsCount: pairings.length
    });

  } catch (error) {
    console.error('Error getting section pairings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get status for a specific section and round
 */
router.get('/tournament/:tournamentId/round/:round/section/:sectionName/status', async (req, res) => {
  const { tournamentId, round, sectionName } = req.params;
  const currentRound = parseInt(round);

  try {
    const sectionStatus = await pairingStorage.getSectionStatus(tournamentId, currentRound, sectionName);
    
    res.json({
      success: true,
      tournamentId,
      round: currentRound,
      section: sectionName,
      ...sectionStatus
    });

  } catch (error) {
    console.error('Error getting section status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check if tournament is ready for final confirmation
 */
router.get('/tournament/:tournamentId/completion-status', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // Get tournament info
    const tournament = await pairingStorage.getTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Get all rounds status
    const allRoundsStatus = await pairingStorage.getAllRoundsStatus(tournamentId);
    
    // Check if all rounds are complete
    let allRoundsComplete = true;
    let completedRounds = 0;
    let totalRounds = tournament.rounds;

    for (let round = 1; round <= totalRounds; round++) {
      const roundStatus = allRoundsStatus[round];
      if (roundStatus && roundStatus.isComplete) {
        completedRounds++;
      } else {
        allRoundsComplete = false;
      }
    }

    res.json({
      success: true,
      tournamentId,
      totalRounds,
      completedRounds,
      allRoundsComplete,
      readyForConfirmation: allRoundsComplete,
      roundsStatus: allRoundsStatus
    });

  } catch (error) {
    console.error('Error checking tournament completion status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update pairing players (for drag and drop)
 */
router.put('/pairing/:pairingId/players', async (req, res) => {
  const { pairingId } = req.params;
  const { whitePlayerId, blackPlayerId, whitePlayer, blackPlayer } = req.body;

  try {
    // Update the pairing with new players
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE pairings 
         SET white_player_id = ?, black_player_id = ?, 
             white_name = ?, white_rating = ?, white_uscf_id = ?,
             black_name = ?, black_rating = ?, black_uscf_id = ?
         WHERE id = ?`,
        [
          whitePlayerId, blackPlayerId,
          whitePlayer.name, whitePlayer.rating, whitePlayer.uscf_id,
          blackPlayer.name, blackPlayer.rating, blackPlayer.uscf_id,
          pairingId
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Pairing updated successfully'
    });

  } catch (error) {
    console.error('Error updating pairing players:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create custom pairing
 */
router.post('/pairing/custom', async (req, res) => {
  const { tournamentId, round, section, whitePlayer, blackPlayer } = req.body;

  try {
    // Get the next available board number for this section and round
    const maxBoard = await new Promise((resolve, reject) => {
      db.get(
        `SELECT MAX(board) as maxBoard 
         FROM pairings 
         WHERE tournament_id = ? AND round = ? AND COALESCE(section, 'Open') = ?`,
        [tournamentId, round, section],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.maxBoard || 0);
        }
      );
    });

    const newBoard = maxBoard + 1;

    // Create the custom pairing
    const pairingId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO pairings 
         (tournament_id, round, board, white_player_id, black_player_id, 
          white_name, white_rating, white_uscf_id, black_name, black_rating, black_uscf_id, 
          section, result, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))`,
        [
          tournamentId, round, newBoard,
          whitePlayer.id, blackPlayer.id,
          whitePlayer.name, whitePlayer.rating, whitePlayer.uscf_id,
          blackPlayer.name, blackPlayer.rating, blackPlayer.uscf_id,
          section
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.json({
      success: true,
      message: 'Custom pairing created successfully',
      pairingId: pairingId,
      board: newBoard
    });

  } catch (error) {
    console.error('Error creating custom pairing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete custom pairing
 */
router.delete('/pairing/:pairingId', async (req, res) => {
  const { pairingId } = req.params;

  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM pairings WHERE id = ?', [pairingId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      success: true,
      message: 'Pairing deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting pairing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reset pairings for a specific round and section
 */
router.post('/tournament/:tournamentId/round/:round/reset', async (req, res) => {
  const { tournamentId, round } = req.params;
  const { sectionName } = req.body;

  try {
    let query = 'DELETE FROM pairings WHERE tournament_id = ? AND round = ?';
    let params = [tournamentId, parseInt(round)];

    if (sectionName) {
      query += ' AND COALESCE(section, "Open") = ?';
      params.push(sectionName);
    }

    await new Promise((resolve, reject) => {
      db.run(query, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      success: true,
      message: `Pairings reset for Round ${round}${sectionName ? ` (${sectionName} section)` : ''}`
    });

  } catch (error) {
    console.error('Error resetting pairings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Confirm tournament completion and finalize standings
 */
router.post('/tournament/:tournamentId/confirm-completion', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // Get tournament info
    const tournament = await pairingStorage.getTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Check if all rounds are complete
    const completionStatus = await new Promise((resolve, reject) => {
      const allRoundsStatus = {};
      let allRoundsComplete = true;
      let completedRounds = 0;

      const checkRounds = async () => {
        for (let round = 1; round <= tournament.rounds; round++) {
          try {
            const roundStatus = await pairingStorage.getRoundStatus(tournamentId, round);
            allRoundsStatus[round] = roundStatus;
            if (roundStatus.isComplete) {
              completedRounds++;
            } else {
              allRoundsComplete = false;
            }
          } catch (error) {
            console.warn(`Error checking status for round ${round}:`, error.message);
            allRoundsComplete = false;
          }
        }
        resolve({ allRoundsComplete, completedRounds, allRoundsStatus });
      };

      checkRounds();
    });

    if (!completionStatus.allRoundsComplete) {
      res.status(400).json({
        success: false,
        error: 'Not all rounds are complete. Cannot confirm tournament completion.',
        completedRounds: completionStatus.completedRounds,
        totalRounds: tournament.rounds
      });
      return;
    }

    // Update tournament status to completed
    await new Promise((resolve, reject) => {
      db.run('UPDATE tournaments SET status = ? WHERE id = ?', ['completed', tournamentId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get final standings
    const standings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.id, p.name, p.rating, p.section, p.uscf_id,
                COALESCE(SUM(
                  CASE 
                    WHEN (pair.white_player_id = p.id AND pair.result = '1-0') OR 
                         (pair.white_player_id = p.id AND pair.result = '1-0F') OR
                         (pair.black_player_id = p.id AND pair.result = '0-1') OR
                         (pair.black_player_id = p.id AND pair.result = '0-1F')
                    THEN 1.0
                    WHEN (pair.white_player_id = p.id AND pair.result = '1/2-1/2') OR
                         (pair.white_player_id = p.id AND pair.result = '1/2-1/2F') OR
                         (pair.black_player_id = p.id AND pair.result = '1/2-1/2') OR
                         (pair.black_player_id = p.id AND pair.result = '1/2-1/2F')
                    THEN 0.5
                    ELSE 0
                  END
                ), 0) as total_points,
                COUNT(pair.id) as games_played,
                COUNT(CASE 
                  WHEN (pair.white_player_id = p.id AND (pair.result = '1-0' OR pair.result = '1-0F')) OR
                       (pair.black_player_id = p.id AND (pair.result = '0-1' OR pair.result = '0-1F'))
                  THEN 1 
                END) as wins,
                COUNT(CASE 
                  WHEN (pair.white_player_id = p.id AND (pair.result = '0-1' OR pair.result = '0-1F')) OR
                       (pair.black_player_id = p.id AND (pair.result = '1-0' OR pair.result = '1-0F'))
                  THEN 1 
                END) as losses,
                COUNT(CASE 
                  WHEN (pair.white_player_id = p.id AND (pair.result = '1/2-1/2' OR pair.result = '1/2-1/2F')) OR
                       (pair.black_player_id = p.id AND (pair.result = '1/2-1/2' OR pair.result = '1/2-1/2F'))
                  THEN 1 
                END) as draws
         FROM players p
         LEFT JOIN pairings pair ON (p.id = pair.white_player_id OR p.id = pair.black_player_id) 
                                  AND pair.tournament_id = p.tournament_id 
                                  AND pair.result IS NOT NULL
         WHERE p.tournament_id = ? AND p.status = 'active'
         GROUP BY p.id
         ORDER BY total_points DESC, p.rating DESC`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Clean up sensitive data (emails and phone numbers) for security
    try {
      const cleanupResult = await cleanupTournamentData(tournamentId);
      console.log(`Data cleanup for tournament ${tournamentId}: ${cleanupResult.playersCleaned} players, ${cleanupResult.registrationsCleaned} registrations`);
    } catch (cleanupError) {
      // Log error but don't fail the completion - data cleanup is important but shouldn't block completion
      console.error('Error cleaning up tournament data:', cleanupError);
    }

    res.json({
      success: true,
      message: 'Tournament completed successfully! Final standings have been calculated.',
      tournamentId,
      totalRounds: tournament.rounds,
      completedRounds: completionStatus.completedRounds,
      standings: standings,
      standingsCount: standings.length
    });

  } catch (error) {
    console.error('Error confirming tournament completion:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get pairings for a specific round
 */
router.get('/tournament/:tournamentId/round/:round', async (req, res) => {
  const { tournamentId, round } = req.params;
  
  try {
    const pairings = await pairingStorage.getRoundPairings(tournamentId, parseInt(round));
    
    res.json(pairings.map(pairing => ({
      ...pairing,
      board_display: `Board ${pairing.board}`,
      white_display: pairing.white_name ? `${pairing.white_name} (${pairing.white_rating})` : 'TBD',
      black_display: pairing.black_name ? `${pairing.black_name} (${pairing.black_rating})` : 'TBD'
    })));
  } catch (error) {
    console.error('Error fetching pairings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get round status - ENHANCED VERSION with round independence
 */
router.get('/tournament/:tournamentId/round/:round/status', async (req, res) => {
  const { tournamentId, round } = req.params;
  
  try {
    const roundNum = parseInt(round);
    
    if (isNaN(roundNum) || roundNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid round number. Must be a positive integer.'
      });
    }

    // Use the enhanced round status checking
    const roundStatus = await pairingStorage.getRoundStatus(tournamentId, roundNum);
    const pairings = await pairingStorage.getRoundPairings(tournamentId, roundNum);
    
    res.json({
      success: true,
      tournamentId,
      round: roundNum,
      totalPairings: roundStatus.totalPairings,
      completedPairings: roundStatus.completedPairings,
      incompletePairings: roundStatus.pendingPairings,
      completionPercentage: roundStatus.percentage,
      isComplete: roundStatus.isComplete,
      hasPairings: pairings.length > 0,
      canGenerateNextRound: roundStatus.canGenerateNextRound,
      sections: roundStatus.sections
    });
  } catch (error) {
    console.error('Error fetching round status:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Get all pairings for a tournament grouped by round - NEW ENDPOINT
 */
router.get('/tournament/:tournamentId/all', async (req, res) => {
  const { tournamentId } = req.params;
  
  try {
    const pairingsByRound = await pairingStorage.getPairingsByRound(tournamentId);
    
    res.json({
      success: true,
      tournamentId,
      pairingsByRound,
      totalRounds: Object.keys(pairingsByRound).length,
      rounds: Object.keys(pairingsByRound).map(round => ({
        round: parseInt(round),
        pairingsCount: pairingsByRound[round].length,
        sections: [...new Set(pairingsByRound[round].map(p => p.section || 'Open'))]
      }))
    });
  } catch (error) {
    console.error('Error fetching all pairings:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Get round status for all rounds - NEW ENDPOINT
 */
router.get('/tournament/:tournamentId/rounds/status', async (req, res) => {
  const { tournamentId } = req.params;
  
  try {
    // Get tournament info to know how many rounds there should be
    const tournament = await pairingStorage.getTournament(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const roundsStatus = {};
    
    // Check status for each round
    for (let round = 1; round <= tournament.rounds; round++) {
      try {
        const roundStatus = await pairingStorage.getRoundStatus(tournamentId, round);
        roundsStatus[round] = roundStatus;
      } catch (error) {
        console.warn(`Error checking status for round ${round}:`, error.message);
        roundsStatus[round] = {
          round,
          totalPairings: 0,
          completedPairings: 0,
          pendingPairings: 0,
          percentage: 0,
          isComplete: false,
          sections: {},
          canGenerateNextRound: false,
          error: error.message
        };
      }
    }
    
    res.json({
      success: true,
      tournamentId,
      totalRounds: tournament.rounds,
      roundsStatus
    });
  } catch (error) {
    console.error('Error fetching rounds status:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Validate entire tournament
 */
router.get('/tournament/:tournamentId/validate', async (req, res) => {
  const { tournamentId } = req.params;
  
  try {
    const validation = await pairingStorage.validateTournamentPairings(tournamentId);
    res.json(validation);
  } catch (error) {
    console.error('Error validating tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get standings for a tournament with proper tiebreakers and round-by-round results
router.get('/tournament/:tournamentId/standings', async (req, res) => {
  const { tournamentId } = req.params;
  const { includeRoundResults = 'false', showPrizes = 'false' } = req.query;
  
  try {
    // Get basic standings data from pairings table
    const basicStandings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.id, p.name, p.rating, p.section, p.uscf_id,
                COALESCE(SUM(
                  CASE 
                    WHEN (pair.white_player_id = p.id AND pair.result = '1-0') OR 
                         (pair.white_player_id = p.id AND pair.result = '1-0F') OR
                         (pair.black_player_id = p.id AND pair.result = '0-1') OR
                         (pair.black_player_id = p.id AND pair.result = '0-1F')
                    THEN 1.0
                    WHEN (pair.white_player_id = p.id AND pair.result = '1/2-1/2') OR
                         (pair.white_player_id = p.id AND pair.result = '1/2-1/2F') OR
                         (pair.black_player_id = p.id AND pair.result = '1/2-1/2') OR
                         (pair.black_player_id = p.id AND pair.result = '1/2-1/2F')
                    THEN 0.5
                    WHEN (pair.white_player_id = p.id AND (pair.result = 'bye' OR pair.result LIKE 'bye_%' OR pair.is_bye = 1)) OR
                         (pair.black_player_id = p.id AND (pair.result = 'bye' OR pair.result LIKE 'bye_%' OR pair.is_bye = 1))
                    THEN CASE 
                      WHEN pair.bye_type = 'bye' THEN 0.5
                      WHEN pair.bye_type = 'half_point_bye' THEN 0.5
                      WHEN pair.bye_type = 'inactive' THEN 0.5
                      WHEN pair.bye_type = 'unpaired' THEN 1.0
                      ELSE 0.5
                    END
                    ELSE 0
                  END
                ), 0) as total_points,
                COUNT(pair.id) as games_played,
                COUNT(CASE 
                  WHEN (pair.white_player_id = p.id AND (pair.result = '1-0' OR pair.result = '1-0F')) OR
                       (pair.black_player_id = p.id AND (pair.result = '0-1' OR pair.result = '0-1F'))
                  THEN 1 
                END) as wins,
                COUNT(CASE 
                  WHEN (pair.white_player_id = p.id AND (pair.result = '0-1' OR pair.result = '0-1F')) OR
                       (pair.black_player_id = p.id AND (pair.result = '1-0' OR pair.result = '1-0F'))
                  THEN 1 
                END) as losses,
                COUNT(CASE 
                  WHEN (pair.white_player_id = p.id AND (pair.result = '1/2-1/2' OR pair.result = '1/2-1/2F')) OR
                       (pair.black_player_id = p.id AND (pair.result = '1/2-1/2' OR pair.result = '1/2-1/2F'))
                  THEN 1 
                END) as draws
         FROM players p
         LEFT JOIN pairings pair ON (p.id = pair.white_player_id OR p.id = pair.black_player_id) 
                                  AND pair.tournament_id = p.tournament_id 
                                  AND pair.result IS NOT NULL
         WHERE p.tournament_id = ? AND p.status = 'active'
         GROUP BY p.id`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get tournament settings to determine tiebreaker order
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    let tiebreakerOrder = getDefaultTiebreakerOrder();
    if (tournament && tournament.settings) {
      try {
        const settings = JSON.parse(tournament.settings);
        if (settings.tie_break_criteria) {
          tiebreakerOrder = settings.tie_break_criteria;
        }
      } catch (e) {
        console.warn('Could not parse tournament settings, using default tiebreaker order');
      }
    }

    // Calculate tiebreakers for all players
    const tiebreakers = await calculateTournamentTiebreakers(tournamentId, db);

    // Add tiebreaker values to standings
    const standingsWithTiebreakers = basicStandings.map(player => ({
      ...player,
      tiebreakers: tiebreakers[player.id] || {}
    }));

    // Group standings by section and sort within each section
    const standingsBySection = {};
    standingsWithTiebreakers.forEach(player => {
      const section = player.section || 'Open';
      if (!standingsBySection[section]) {
        standingsBySection[section] = [];
      }
      standingsBySection[section].push(player);
    });

    // Sort each section separately
    Object.keys(standingsBySection).forEach(section => {
      standingsBySection[section].sort((a, b) => {
        // First sort by total points (descending)
        if (a.total_points !== b.total_points) {
          return b.total_points - a.total_points;
        }

        // Then sort by tiebreakers in specified order
        for (const tiebreaker of tiebreakerOrder) {
          const aValue = a.tiebreakers[tiebreaker] || 0;
          const bValue = b.tiebreakers[tiebreaker] || 0;
          
          if (aValue !== bValue) {
            // Most tiebreakers are higher = better, except performance rating which can be negative
            return bValue - aValue;
          }
        }

        // Finally sort by rating as last resort
        return (b.rating || 0) - (a.rating || 0);
      });

      // Add rank to each player within their section
      standingsBySection[section].forEach((player, index) => {
        player.rank = index + 1;
      });
    });

    // Flatten back to single array for response
    const sortedStandings = [];
    Object.keys(standingsBySection).sort().forEach(section => {
      sortedStandings.push(...standingsBySection[section]);
    });

    // Keep standingsBySection available for round results processing
    const finalStandingsBySection = standingsBySection;

    // Get prize information if requested
    if (showPrizes === 'true') {
      try {
        const prizes = await new Promise((resolve, reject) => {
          db.all(
            'SELECT * FROM prizes WHERE tournament_id = ? ORDER BY position ASC, type ASC',
            [tournamentId],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        if (prizes && prizes.length > 0) {
          const { distributeSectionPrizes } = require('../services/prizeService');
          const prizeDistributions = distributeSectionPrizes(
            sortedStandings,
            {
              name: 'Open',
              prizes: prizes.map(prize => ({
                ...prize,
                conditions: prize.conditions ? JSON.parse(prize.conditions) : [],
                amount: prize.amount ? parseFloat(prize.amount) : undefined
              }))
            },
            tournament.id
          );

          // Add prize information to standings
          const prizeMap = {};
          prizeDistributions.forEach(distribution => {
            prizeMap[distribution.player_id] = distribution.prize_amount ? `$${distribution.prize_amount}` : distribution.prize_name;
          });

          sortedStandings.forEach(player => {
            player.prize = prizeMap[player.id] || '';
          });
        }
      } catch (error) {
        console.warn('Could not calculate prizes:', error);
      }
    }

    // If round results are requested, fetch them
    if (includeRoundResults === 'true') {
      const roundResults = await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
            r.player_id,
            r.round,
            r.result,
            r.opponent_id,
            r.points,
            op.name as opponent_name,
            op.rating as opponent_rating,
            op.section as opponent_section,
            r.color,
            r.board
          FROM results r
          LEFT JOIN players op ON r.opponent_id = op.id
          WHERE r.tournament_id = ?
          ORDER BY r.player_id, r.round`,
          [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Group round results by player and add opponent rank
      const roundResultsByPlayer = {};
      roundResults.forEach(result => {
        if (!roundResultsByPlayer[result.player_id]) {
          roundResultsByPlayer[result.player_id] = {};
        }
        
        // Find opponent's rank in their section
        let opponentRank = null;
        if (result.opponent_id && result.opponent_section) {
          const opponentSection = finalStandingsBySection[result.opponent_section];
          if (opponentSection) {
            const opponent = opponentSection.find(p => p.id === result.opponent_id);
            if (opponent) {
              opponentRank = opponent.rank;
            }
          }
        }
        
        roundResultsByPlayer[result.player_id][result.round] = {
          result: result.result,
          opponent_name: result.opponent_name,
          opponent_rating: result.opponent_rating,
          opponent_rank: opponentRank,
          points: result.points,
          color: result.color,
          board: result.board
        };
      });

      // Add round results to standings
      sortedStandings.forEach(player => {
        player.roundResults = roundResultsByPlayer[player.id] || {};
      });
    }

    res.json({
      success: true,
      data: sortedStandings
    });
  } catch (error) {
    console.error('Error calculating standings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset/clear pairings for a specific round
router.delete('/tournament/:tournamentId/round/:round', async (req, res) => {
  const { tournamentId, round } = req.params;
  
  try {
    // Get tournament format to determine which table to clear
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT format FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    let deletedCount = 0;

    if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin' || tournament.format === 'team-tournament') {
      // Clear team pairings
      const teamResult = await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM team_results WHERE tournament_id = ? AND round = ?',
          [tournamentId, round],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });
      deletedCount = teamResult;
    } else {
      // Clear individual pairings
      const individualResult = await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM pairings WHERE tournament_id = ? AND round = ?',
          [tournamentId, round],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });
      deletedCount = individualResult;
    }

    res.json({ 
      message: `Successfully cleared ${deletedCount} pairings for round ${round}`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Error clearing pairings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update pairing result
 */
router.put('/:id/result', async (req, res) => {
  const { id } = req.params;
  const { result } = req.body;

  const validResults = ['1-0', '0-1', '1/2-1/2', '1-0F', '0-1F', '1/2-1/2F', 'bye', 'bye_bye', 'bye_unpaired', 'bye_inactive', 'bye_half_point_bye'];
  if (!validResults.includes(result) && !result.startsWith('bye_')) {
    res.status(400).json({ error: 'Invalid result format' });
    return;
  }

  try {
    // Get pairing details
    const pairing = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM pairings WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!pairing) {
      res.status(404).json({ error: 'Pairing not found' });
      return;
    }

    // Update pairing result
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE pairings SET result = ? WHERE id = ?',
        [result, id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Calculate points for each player
    const whitePoints = calculatePoints(result, 'white');
    const blackPoints = calculatePoints(result, 'black');

    // First, delete any existing results for this pairing to prevent duplicates
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM results 
         WHERE tournament_id = ? AND round = ? 
         AND ((player_id = ? AND opponent_id = ?) OR (player_id = ? AND opponent_id = ?))`,
        [pairing.tournament_id, pairing.round, pairing.white_player_id, pairing.black_player_id, 
         pairing.black_player_id, pairing.white_player_id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Save results to results table for both players (only if they exist)
    // Handle bye and unpaired differently from normal games
    if (pairing.black_player_id === null) {
      // This is a bye or unpaired pairing
      const byePoints = calculateByePoints(pairing.bye_type);
      
      // Only the white player gets points for a bye
      if (pairing.white_player_id) {
        await new Promise((resolve, reject) => {
          const resultId = uuidv4();
          db.run(
            `INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points, pairing_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [resultId, pairing.tournament_id, pairing.white_player_id, pairing.round, 
             null, 'white', `bye_${pairing.bye_type || 'bye'}`, byePoints, id],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    } else {
      // Normal game between two players
      if (pairing.white_player_id) {
        await new Promise((resolve, reject) => {
          const resultId = uuidv4();
          db.run(
            `INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points, pairing_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [resultId, pairing.tournament_id, pairing.white_player_id, pairing.round, 
             pairing.black_player_id, 'white', result, whitePoints, id],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      if (pairing.black_player_id) {
        await new Promise((resolve, reject) => {
          const resultId = uuidv4();
          db.run(
            `INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points, pairing_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [resultId, pairing.tournament_id, pairing.black_player_id, pairing.round, 
             pairing.white_player_id, 'black', result, blackPoints, id],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }

    res.json({ message: 'Result updated successfully' });
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Record bye result for a pairing (1/2 point bye or full point unpaired)
 */
router.post('/:id/bye-result', async (req, res) => {
  const { id } = req.params;
  const { byeType } = req.body; // 'bye' for 1/2 pt, 'unpaired' for 1 pt

  const validByeTypes = ['bye', 'unpaired'];
  if (!validByeTypes.includes(byeType)) {
    res.status(400).json({ error: 'Invalid bye type. Must be "bye" (1/2 pt) or "unpaired" (1 pt)' });
    return;
  }

  try {
    // Get pairing details
    const pairing = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM pairings WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!pairing) {
      res.status(404).json({ error: 'Pairing not found' });
      return;
    }

    if (pairing.black_player_id !== null) {
      res.status(400).json({ error: 'This pairing is not a bye (both players are assigned)' });
      return;
    }

    // Update pairing with bye_type
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE pairings SET bye_type = ?, result = ? WHERE id = ?',
        [byeType, `bye_${byeType}`, id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Calculate bye points
    const byePoints = calculateByePoints(byeType);

    // Delete any existing results for this pairing
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM results WHERE tournament_id = ? AND round = ? AND player_id = ?`,
        [pairing.tournament_id, pairing.round, pairing.white_player_id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Record bye result for the white player
    await new Promise((resolve, reject) => {
      const resultId = uuidv4();
      db.run(
        `INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points, pairing_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [resultId, pairing.tournament_id, pairing.white_player_id, pairing.round, 
         null, 'white', `bye_${byeType}`, byePoints, id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ 
      message: `Bye result recorded successfully (${byeType}: ${byePoints} point${byePoints !== 1 ? 's' : ''})`,
      byeType: byeType,
      points: byePoints
    });
  } catch (error) {
    console.error('Error recording bye result:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate points based on result and color
function calculatePoints(result, color) {
  if (result === '1-0') {
    return color === 'white' ? 1 : 0;
  } else if (result === '0-1') {
    return color === 'black' ? 1 : 0;
  } else if (result === '1/2-1/2' || result === '1/2-1/2F') {
    return 0.5;
  } else if (result === '1-0F') {
    return color === 'white' ? 1 : 0;
  } else if (result === '0-1F') {
    return color === 'black' ? 1 : 0;
  }
  return 0;
}

// Helper function to calculate bye points based on bye type
function calculateByePoints(byeType) {
  if (byeType === 'unpaired') {
    return 1.0; // Full point bye
  } else if (byeType === 'half_point_bye' || byeType === 'bye' || byeType === 'inactive') {
    return 0.5; // Half point bye
  }
  // Default to 0.5 for byes without explicit type (intentional byes)
  return 0.5;
}

/**
 * Check if round is complete for a specific section and move to next round
 */
router.post('/tournament/:tournamentId/round/:round/complete', async (req, res) => {
  const { tournamentId, round } = req.params;
  const { sectionName } = req.body; // Get section from request body
  const roundNum = parseInt(round);

  try {
    // Check if all pairings for this round and section have results
    const incompletePairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT COUNT(*) as count FROM pairings 
         WHERE tournament_id = ? AND round = ? AND section = ? 
         AND result IS NULL 
         AND (is_bye = 0 OR is_bye IS NULL)
         AND black_player_id IS NOT NULL`,
        [tournamentId, roundNum, sectionName || 'Open'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (incompletePairings.length > 0 && incompletePairings[0].count > 0) {
      const incompleteCount = incompletePairings[0].count;
      
      res.status(400).json({ 
        error: `Round ${roundNum} is not complete for section "${sectionName || 'Open'}". ${incompleteCount} game${incompleteCount !== 1 ? 's' : ''} still need${incompleteCount === 1 ? 's' : ''} results.` 
      });
      return;
    }

    // Get tournament info to check if this is the last round
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Check if this was the last round for this section
    if (roundNum >= tournament.rounds) {
      res.json({ 
        message: `Round ${roundNum} completed for ${sectionName || 'Open'} section! Section finished.`,
        sectionCompleted: true,
        nextRound: null
      });
    } else {
      res.json({ 
        message: `Round ${roundNum} completed for ${sectionName || 'Open'} section! Ready for round ${roundNum + 1}.`,
        sectionCompleted: false,
        nextRound: roundNum + 1
      });
    }
  } catch (error) {
    console.error('Error completing round:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate quad tournament pairings
 * Divides players into groups of 4 by rating and generates round-robin pairings
 */
router.post('/generate/quad', async (req, res) => {
  const { tournamentId } = req.body;

  try {
    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'tournamentId is required'
      });
    }

    // Get tournament info
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Verify this is a quad tournament
    if (tournament.format !== 'quad') {
      return res.status(400).json({
        success: false,
        error: `This endpoint is only for quad format tournaments. Tournament format is: ${tournament.format}`
      });
    }

    // Clear ALL existing pairings for this tournament
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM pairings WHERE tournament_id = ?',
        [tournamentId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Generate pairings for ALL rounds
    const allResults = [];
    let totalGamesAllRounds = 0;
    let totalByesAllRounds = 0;

    console.log(`🎯 Starting quad generation for tournament ${tournamentId} with ${tournament.rounds} rounds`);

    // Get all active players to update their sections
    const players = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? AND status = "active" ORDER BY rating DESC',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Parse intentional_bye_rounds from JSON string to array
            const processedRows = (rows || []).map(player => {
              if (player.intentional_bye_rounds) {
                try {
                  player.intentional_bye_rounds = JSON.parse(player.intentional_bye_rounds);
                } catch (e) {
                  player.intentional_bye_rounds = [];
                }
              }
              return player;
            });
            resolve(processedRows);
          }
        }
      );
    });

    if (players.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active players found for quad pairing'
      });
    }

    // Create quad assignments and update player sections
    const system = new QuadPairingSystem(players, { groupSize: 4 });
    const quads = system.getQuadAssignments();
    
    // Update player sections in the database based on their quad assignment
    for (const quad of quads) {
      for (const player of quad.players) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE players SET section = ? WHERE id = ?',
            [quad.id, player.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }

    console.log(`✅ Updated ${players.length} players to their quad sections`);

    for (let round = 1; round <= tournament.rounds; round++) {
      // Generate quad pairings for this round
      let result;
      try {
        result = await QuadPairingSystem.generateTournamentQuadPairings(
          tournamentId,
          round,
          db,
          {
            groupSize: 4,
            pairingType: 'round_robin'
          }
        );
      } catch (quadError) {
        console.error(`Error in QuadPairingSystem for round ${round}:`, quadError);
        throw new Error(`Failed to generate quads for round ${round}: ${quadError.message}`);
      }

      if (!result || !result.pairings || result.pairings.length === 0) {
        throw new Error(`No pairings generated for round ${round}`);
      }

      console.log(`✅ Round ${round}: Generated ${result.pairings.length} pairings, ${result.quadCount} quads`);

      // Store pairings for this round
      let storedCount = 0;
      
      for (const pairing of result.pairings) {
        try {
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO pairings 
               (id, tournament_id, round, board, white_player_id, black_player_id, result, section, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              [
                uuidv4(),
                tournamentId,
                round,
                storedCount + 1,
                pairing.white_player_id,
                pairing.black_player_id || null,
                null,
                pairing.quadId,  // Store quad ID as section for proper grouping
              ],
              (err) => {
                if (err) {
                  console.error('Error inserting pairing:', err);
                  reject(err);
                } else {
                  storedCount++;
                  resolve();
                }
              }
            );
          });
        } catch (pairingError) {
          console.error(`Error storing pairing for round ${round}:`, pairingError);
        }
      }

      if (storedCount === 0) {
        throw new Error(`Failed to store pairings for round ${round}`);
      }

      console.log(`✅ Round ${round}: Stored ${storedCount} pairings`);

      totalGamesAllRounds += result.totalGames;
      totalByesAllRounds += result.totalByes;
      allResults.push({
        round,
        quadCount: result.quadCount,
        totalGames: result.totalGames,
        totalByes: result.totalByes,
        pairingsCount: storedCount
      });
    }

    console.log(`✅ All rounds complete. Total games: ${totalGamesAllRounds}, Total byes: ${totalByesAllRounds}`);

    res.json({
      success: true,
      message: `Quad pairings generated for all ${tournament.rounds} rounds`,
      data: {
        tournamentId,
        totalRounds: tournament.rounds,
        roundsData: allResults,
        totalGamesAllRounds,
        totalByesAllRounds,
        quads: quads.map(q => ({
          id: q.id,
          number: q.number,
          players: q.players.map(p => p.id)
        })),
        message: `Successfully created ${allResults.length} rounds with ${quads.length} quads. All player sections have been updated, and standings will reflect the new quad assignments.`
      }
    });

  } catch (error) {
    console.error('Error generating quad pairings:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error generating quad pairings'
    });
  }
});

/**
 * Get quad assignments for a tournament
 */
router.get('/quad/:tournamentId/assignments', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // Get all active players
    const players = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? AND (status = "active" OR status = "inactive") ORDER BY rating DESC',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else {
            // Parse intentional_bye_rounds from JSON string to array
            const processedRows = (rows || []).map(player => {
              if (player.intentional_bye_rounds) {
                try {
                  player.intentional_bye_rounds = JSON.parse(player.intentional_bye_rounds);
                } catch (e) {
                  player.intentional_bye_rounds = [];
                }
              }
              return player;
            });
            resolve(processedRows);
          }
        }
      );
    });

    if (players.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active players found'
      });
    }

    // Generate quad assignments
    const system = new QuadPairingSystem(players, { groupSize: 4 });
    const quads = system.getQuadAssignments();

    res.json({
      success: true,
      data: {
        tournamentId,
        quads,
        quadCount: quads.length,
        totalPlayers: players.length,
        avgPlayersPerQuad: Math.round(players.length / quads.length * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error getting quad assignments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate Team Swiss tournament pairings
 * Teams are paired using Swiss system, board-by-board games
 */
router.post('/generate/team-swiss', async (req, res) => {
  const { tournamentId, round } = req.body;

  try {
    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'tournamentId is required'
      });
    }

    if (!round) {
      return res.status(400).json({
        success: false,
        error: 'round is required'
      });
    }

    // Get tournament info
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    if (tournament.format !== 'team-swiss' && tournament.format !== 'team-tournament') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for team-swiss or team-tournament format tournaments'
      });
    }

    console.log(`🎯 Starting team Swiss pairing generation for tournament ${tournamentId}, round ${round}`);

    // Generate team pairings using TeamSwissPairingSystem
    const result = await TeamSwissPairingSystem.generateTournamentTeamPairings(
      tournamentId,
      round,
      db,
      {
        pairingSystem: 'fide_dutch'
      }
    );

    if (!result || !result.pairings || result.pairings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No pairings generated. Make sure teams have members.'
      });
    }

    console.log(`✅ Generated ${result.pairings.length} individual pairings for ${result.teamCount} teams`);

    // Store pairings
    let storedCount = 0;
    const storedPairings = [];
    
    for (const pairing of result.pairings) {
      try {
        const pairingId = uuidv4();
        
        await new Promise((resolve, reject) => {
          // Handle null values for bye pairings
          const whitePlayerId = pairing.white_player_id || null;
          const blackPlayerId = pairing.black_player_id || null;
          const board = pairing.board || 1;
          const sectionName = pairing.team1Name 
            ? `${pairing.team1Name} vs ${pairing.team2Name || 'BYE'}`
            : 'Team Match';

          db.run(
            `INSERT INTO pairings 
             (id, tournament_id, round, board, white_player_id, black_player_id, result, section, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
              pairingId,
              tournamentId,
              round,
              board,
              whitePlayerId,
              blackPlayerId,
              null,
              sectionName // Store as section for display
            ],
            (err) => {
              if (err) {
                console.error('Error inserting pairing:', err);
                console.error('Pairing data:', pairing);
                reject(err);
              } else {
                storedCount++;
                resolve();
              }
            }
          );
        });

        storedPairings.push({
          id: pairingId,
          ...pairing
        });

      } catch (pairingError) {
        console.error(`Error storing pairing:`, pairingError);
      }
    }

    console.log(`✅ Stored ${storedCount} pairings`);

    res.json({
      success: true,
      message: 'Team Swiss pairings generated successfully',
      data: {
        tournamentId,
        round,
        teamCount: result.teamCount,
        totalGames: result.totalGames,
        totalByes: result.totalByes,
        storedCount,
        pairings: storedPairings
      }
    });

  } catch (error) {
    console.error('Error generating team Swiss pairings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error generating team Swiss pairings'
    });
  }
});

/**
 * Get section status (simplified version)
 */
// Get all pairings for a specific section
router.get('/tournament/:tournamentId/section/:sectionName', async (req, res) => {
  const { tournamentId, sectionName } = req.params;

  try {
    const pairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                pw.name as white_name, pw.rating as white_rating, pw.uscf_id as white_uscf_id, pw.lichess_username as white_lichess_username,
                pb.name as black_name, pb.rating as black_rating, pb.uscf_id as black_uscf_id, pb.lichess_username as black_lichess_username
         FROM pairings p
         LEFT JOIN players pw ON p.white_player_id = pw.id
         LEFT JOIN players pb ON p.black_player_id = pb.id
         WHERE p.tournament_id = ? AND p.section = ?
         ORDER BY p.round, p.board`,
        [tournamentId, sectionName],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(pairings);
  } catch (error) {
    console.error('Error fetching section pairings:', error);
    res.status(500).json({ error: 'Failed to fetch section pairings' });
  }
});

router.get('/tournament/:tournamentId/section/:sectionName/status', async (req, res) => {
  const { tournamentId, sectionName } = req.params;

  try {
    // Get tournament info
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get current round for this section
    const currentRound = await new Promise((resolve, reject) => {
      db.get(
        `SELECT MAX(round) as maxRound FROM pairings 
         WHERE tournament_id = ? AND section = ?`,
        [tournamentId, sectionName],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.maxRound || 1);
        }
      );
    });

    // Check if current round is complete
    const incompletePairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT COUNT(*) as count FROM pairings 
         WHERE tournament_id = ? AND round = ? AND section = ? AND result IS NULL`,
        [tournamentId, currentRound, sectionName],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const hasIncompleteResults = incompletePairings.length > 0 && incompletePairings[0].count > 0;
    const isComplete = currentRound >= tournament.rounds && !hasIncompleteResults;
    const canGenerateNextRound = !hasIncompleteResults && !isComplete;
    const canCompleteRound = !hasIncompleteResults && currentRound < tournament.rounds;

    // Check if section has any pairings
    const hasPairings = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM pairings 
         WHERE tournament_id = ? AND section = ?`,
        [tournamentId, sectionName],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count > 0);
        }
      );
    });

    res.json({
      currentRound,
      totalRounds: tournament.rounds,
      isComplete,
      hasIncompleteResults,
      canGenerateNextRound,
      canCompleteRound,
      hasPairings
    });

  } catch (error) {
    console.error('Error getting section status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reset section (delete all pairings and results for a section)
 */
router.post('/tournament/:tournamentId/section/:sectionName/reset', async (req, res) => {
  const { tournamentId, sectionName } = req.params;

  try {
    // Delete all pairings for this section
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM pairings WHERE tournament_id = ? AND section = ?',
        [tournamentId, sectionName],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      message: `Section "${sectionName}" has been reset. All pairings and results have been deleted.`
    });

  } catch (error) {
    console.error('Error resetting section:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate next round for a section
 */
router.post('/tournament/:tournamentId/section/:sectionName/generate-next', async (req, res) => {
  const { tournamentId, sectionName } = req.params;

  try {
    // Get tournament info
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get current round for this section
    const currentRound = await new Promise((resolve, reject) => {
      db.get(
        `SELECT MAX(round) as maxRound FROM pairings 
         WHERE tournament_id = ? AND section = ?`,
        [tournamentId, sectionName],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.maxRound || 1);
        }
      );
    });

    const nextRound = currentRound + 1;

    if (nextRound > tournament.rounds) {
      return res.status(400).json({ 
        error: `Cannot generate round ${nextRound}. Tournament only has ${tournament.rounds} rounds.` 
      });
    }

    // Check if current round is complete before generating next round
    const currentRoundStatus = await pairingStorage.getSectionStatus(tournamentId, currentRound, sectionName);
    
    if (!currentRoundStatus.isComplete) {
      return res.status(400).json({
        error: `Cannot generate Round ${nextRound}. Round ${currentRound} is not complete for section "${sectionName}". ${currentRoundStatus.pendingPairings} game${currentRoundStatus.pendingPairings !== 1 ? 's' : ''} still need${currentRoundStatus.pendingPairings === 1 ? 's' : ''} results.`
      });
    }

    // Check if next round already has pairings
    const nextRoundPairings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM pairings WHERE tournament_id = ? AND round = ? AND section = ?',
        [tournamentId, nextRound, sectionName],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    if (nextRoundPairings > 0) {
      return res.status(400).json({
        error: `Round ${nextRound} already has ${nextRoundPairings} pairings for section "${sectionName}".`
      });
    }

    // Generate pairings for the next round using the section generation endpoint
    const generateResponse = await new Promise((resolve, reject) => {
      const req = {
        body: {
          tournamentId,
          round: nextRound,
          sectionName
        }
      };
      
      // Call the section generation logic directly
      const sectionGeneration = async () => {
        try {
          // Get players for the specific section
          const players = await new Promise((resolve, reject) => {
            db.all(
              'SELECT * FROM players WHERE tournament_id = ? AND (status = "active" OR status = "inactive") AND section = ? ORDER BY rating DESC',
              [tournamentId, sectionName],
              (err, rows) => {
                if (err) reject(err);
                else {
                  // Parse intentional_bye_rounds from JSON string to array
                  const processedRows = rows.map(player => {
                    if (player.intentional_bye_rounds) {
                      try {
                        player.intentional_bye_rounds = JSON.parse(player.intentional_bye_rounds);
                      } catch (e) {
                        player.intentional_bye_rounds = [];
                      }
                    }
                    return player;
                  });
                  resolve(processedRows);
                }
              }
            );
          });

          if (players.length === 0) {
            throw new Error(`No active players found for section "${sectionName}"`);
          }

          // Calculate points for each player from game results
          const playersWithPoints = await Promise.all(players.map(async (player) => {
            try {
              const results = await new Promise((resolve, reject) => {
                db.all(
                  `SELECT 
                    CASE 
                      WHEN (pair.white_player_id = ? AND pair.result = '1-0') OR
                           (pair.black_player_id = ? AND pair.result = '0-1')
                      THEN 1
                      WHEN (pair.white_player_id = ? AND pair.result = '0-1') OR
                           (pair.black_player_id = ? AND pair.result = '1-0')
                      THEN 0
                      WHEN (pair.white_player_id = ? AND pair.result = '1/2-1/2') OR
                           (pair.black_player_id = ? AND pair.result = '1/2-1/2')
                      THEN 0.5
                      WHEN (pair.white_player_id = ? AND (pair.result = 'bye' OR pair.result LIKE 'bye_%')) OR
                           (pair.black_player_id = ? AND (pair.result = 'bye' OR pair.result LIKE 'bye_%'))
                      THEN CASE 
                        WHEN pair.bye_type = 'bye' THEN 0.5
                        WHEN pair.bye_type = 'half_point_bye' THEN 0.5
                        WHEN pair.bye_type = 'unpaired' THEN 1.0
                        ELSE 0.5
                      END
                      ELSE 0
                    END as points,
                    pair.color,
                    pair.result,
                    pair.bye_type
                   FROM pairings pair
                   WHERE (pair.white_player_id = ? OR pair.black_player_id = ?) 
                     AND pair.tournament_id = ? 
                     AND pair.round < ?
                     AND pair.result IS NOT NULL
                   ORDER BY pair.round`,
                  [player.id, player.id, player.id, player.id, player.id, player.id, player.id, player.id, player.id, player.id, tournamentId, nextRound],
                  (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                  }
                );
              });

              const totalPoints = results.reduce((sum, result) => sum + (result.points || 0), 0);
              
              return {
                ...player,
                points: totalPoints,
                gameResults: results
              };
            } catch (error) {
              console.error(`Error calculating points for player ${player.id}:`, error.message);
              return {
                ...player,
                points: 0,
                gameResults: []
              };
            }
          }));

          // Get previous pairings for Swiss system (filtered by section)
          const previousPairings = await pairingStorage.getPreviousPairings(tournamentId, nextRound, sectionName);

          // Get color history for this section
          const sectionColorHistory = {};
          for (const player of playersWithPoints) {
            try {
              const results = await new Promise((resolve, reject) => {
                db.all(
                  `SELECT 
                    CASE 
                      WHEN white_player_id = ? THEN 'white'
                      WHEN black_player_id = ? THEN 'black'
                      ELSE NULL
                    END as color
                   FROM pairings 
                   WHERE (white_player_id = ? OR black_player_id = ?) 
                     AND tournament_id = ? 
                     AND round < ?
                   ORDER BY round`,
                  [player.id, player.id, player.id, player.id, tournamentId, nextRound],
                  (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.filter(row => row.color !== null));
                  }
                );
              });

              let balance = 0;
              results.forEach(result => {
                balance += result.color === 'white' ? 1 : -1;
              });
              sectionColorHistory[player.id] = balance;
            } catch (error) {
              console.warn(`Could not get color history for player ${player.id}:`, error.message);
              sectionColorHistory[player.id] = 0;
            }
          }

          // Create enhanced pairing system for this section only
          const sectionSystem = new EnhancedPairingSystem(playersWithPoints, {
            previousPairings,
            colorHistory: sectionColorHistory,
            section: sectionName,
            tournamentId,
            db,
            round: nextRound,
            pairingSystem: 'advanced_swiss' // Use advanced Swiss system
          });

          // Generate pairings for this section only using bbpPairings
          const generatedPairings = await sectionSystem.generatePairings();
          
          // Assign board numbers and section info
          generatedPairings.forEach((pairing, index) => {
            pairing.board = index + 1;
            pairing.section = sectionName;
            pairing.round = nextRound;
            pairing.tournament_id = tournamentId;
          });

          // Store pairings using the robust storage system
          const storeResult = await pairingStorage.storePairings(tournamentId, nextRound, generatedPairings, {
            clearExisting: false,
            validateBeforeStore: true,
            validateRoundSeparation: false, // Allow section independence
            section: sectionName
          });

          // Automatically record bye results for players with byes
          for (const pairing of generatedPairings) {
            if (pairing.is_bye && pairing.white_player_id && !pairing.black_player_id) {
              try {
                // Calculate bye points
                const byePoints = calculateByePoints(pairing.bye_type);
                
                // Record bye result for the white player
                await new Promise((resolve, reject) => {
                  const resultId = uuidv4();
                  db.run(
                    `INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points, pairing_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [resultId, tournamentId, pairing.white_player_id, nextRound, 
                     null, 'white', `bye_${pairing.bye_type || 'bye'}`, byePoints, pairing.id],
                    function(err) {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });
                
                console.log(`[NextRoundGeneration] Automatically recorded bye result for player ${pairing.white_player_id}: ${byePoints} points`);
              } catch (error) {
                console.error(`[NextRoundGeneration] Error recording bye result for player ${pairing.white_player_id}:`, error.message);
              }
            }
          }

          resolve({
            success: true,
            message: `Round ${nextRound} pairings generated and stored successfully for section "${sectionName}"`,
            pairings: generatedPairings,
            sectionResults: {
              [sectionName]: {
                success: true,
                pairingsCount: generatedPairings.length,
                playersCount: players.length
              }
            },
            ...storeResult
          });
        } catch (error) {
          reject(error);
        }
      };

      sectionGeneration().then(resolve).catch(reject);
    });

    res.json(generateResponse);

  } catch (error) {
    console.error('Error generating next round:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// EDIT FUNCTIONS
// ============================================================================

/**
 * Swap players in a pairing
 */
router.post('/:pairingId/swap-players', async (req, res) => {
  const { pairingId } = req.params;

  try {
    // Get the current pairing
    const pairing = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM pairings WHERE id = ?', [pairingId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!pairing) {
      return res.status(404).json({ success: false, message: 'Pairing not found' });
    }

    // Swap white and black players
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE pairings SET white_player_id = ?, black_player_id = ?, white_name = ?, black_name = ? WHERE id = ?',
        [
          pairing.black_player_id,
          pairing.white_player_id,
          pairing.black_name,
          pairing.white_name,
          pairingId
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: 'Players swapped successfully' });

  } catch (error) {
    console.error('Error swapping players:', error);
    res.status(500).json({ success: false, message: 'Failed to swap players' });
  }
});

/**
 * Update board number for a pairing
 */
router.put('/:pairingId/board-number', async (req, res) => {
  const { pairingId } = req.params;
  const { boardNumber } = req.body;

  if (!boardNumber || boardNumber < 1) {
    return res.status(400).json({ success: false, message: 'Invalid board number' });
  }

  try {
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE pairings SET board_number = ? WHERE id = ?',
        [boardNumber, pairingId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: 'Board number updated successfully' });

  } catch (error) {
    console.error('Error updating board number:', error);
    res.status(500).json({ success: false, message: 'Failed to update board number' });
  }
});

/**
 * Delete a pairing
 */
router.delete('/:pairingId', async (req, res) => {
  const { pairingId } = req.params;

  try {
    // Check if pairing exists
    const pairing = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM pairings WHERE id = ?', [pairingId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!pairing) {
      return res.status(404).json({ success: false, message: 'Pairing not found' });
    }

    // Delete the pairing
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM pairings WHERE id = ?', [pairingId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: 'Pairing deleted successfully' });

  } catch (error) {
    console.error('Error deleting pairing:', error);
    res.status(500).json({ success: false, message: 'Failed to delete pairing' });
  }
});

/**
 * Create a manual pairing
 */
router.post('/manual', async (req, res) => {
  const { tournamentId, sectionName, round, boardNumber, whitePlayerId, blackPlayerId } = req.body;

  if (!tournamentId || !sectionName || !round || !boardNumber) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    // Check if tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    let whiteName = 'TBD';
    let blackName = 'TBD';

    // If players are provided, fetch their names
    if (whitePlayerId) {
      const whitePlayer = await new Promise((resolve, reject) => {
        db.get('SELECT name FROM players WHERE id = ?', [whitePlayerId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (whitePlayer) whiteName = whitePlayer.name;
    }

    if (blackPlayerId) {
      const blackPlayer = await new Promise((resolve, reject) => {
        db.get('SELECT name FROM players WHERE id = ?', [blackPlayerId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (blackPlayer) blackName = blackPlayer.name;
    }

    // Create manual pairing
    const pairingId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO pairings (id, tournament_id, round, board_number, section, white_player_id, black_player_id, white_name, black_name, result, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [pairingId, tournamentId, round, boardNumber, sectionName, whitePlayerId || null, blackPlayerId || null, whiteName, blackName, null],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const newPairing = {
      id: pairingId,
      tournament_id: tournamentId,
      round: round,
      board_number: boardNumber,
      section: sectionName,
      white_player_id: whitePlayerId || null,
      black_player_id: blackPlayerId || null,
      white_name: whiteName,
      black_name: blackName,
      result: null
    };

    res.json({ 
      success: true, 
      message: 'Manual pairing created successfully',
      pairing: newPairing
    });

  } catch (error) {
    console.error('Error creating manual pairing:', error);
    res.status(500).json({ success: false, message: 'Failed to create manual pairing' });
  }
});

/**
 * Swap two pairings (exchange players between boards)
 */
router.post('/swap', async (req, res) => {
  const { pairingId1, pairingId2 } = req.body;

  if (!pairingId1 || !pairingId2) {
    return res.status(400).json({ success: false, message: 'Both pairing IDs are required' });
  }

  try {
    // Get both pairings
    const [pairing1, pairing2] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM pairings WHERE id = ?', [pairingId1], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM pairings WHERE id = ?', [pairingId2], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    ]);

    if (!pairing1 || !pairing2) {
      return res.status(404).json({ success: false, message: 'One or both pairings not found' });
    }

    // Swap all data between the two pairings
    await Promise.all([
      new Promise((resolve, reject) => {
        db.run(
          `UPDATE pairings 
           SET white_player_id = ?, black_player_id = ?, white_name = ?, black_name = ?
           WHERE id = ?`,
          [pairing2.white_player_id, pairing2.black_player_id, pairing2.white_name, pairing2.black_name, pairingId1],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }),
      new Promise((resolve, reject) => {
        db.run(
          `UPDATE pairings 
           SET white_player_id = ?, black_player_id = ?, white_name = ?, black_name = ?
           WHERE id = ?`,
          [pairing1.white_player_id, pairing1.black_player_id, pairing1.white_name, pairing1.black_name, pairingId2],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      })
    ]);

    res.json({ 
      success: true, 
      message: 'Pairings swapped successfully'
    });

  } catch (error) {
    console.error('Error swapping pairings:', error);
    res.status(500).json({ success: false, message: 'Failed to swap pairings' });
  }
});

/**
 * Swap individual players between two pairings
 */
router.post('/swap-players', async (req, res) => {
  const { pairingId1, pairingId2, position1, position2 } = req.body;

  if (!pairingId1 || !pairingId2 || !position1 || !position2) {
    return res.status(400).json({ success: false, message: 'All parameters are required' });
  }

  try {
    // Get both pairings
    const [pairing1, pairing2] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM pairings WHERE id = ?', [pairingId1], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM pairings WHERE id = ?', [pairingId2], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    ]);

    if (!pairing1 || !pairing2) {
      return res.status(404).json({ success: false, message: 'One or both pairings not found' });
    }

    // Get the player IDs from the source positions
    const player1Id = position1 === 'white' ? pairing1.white_player_id : pairing1.black_player_id;
    const player1Name = position1 === 'white' ? pairing1.white_name : pairing1.black_name;
    
    const player2Id = position2 === 'white' ? pairing2.white_player_id : pairing2.black_player_id;
    const player2Name = position2 === 'white' ? pairing2.white_name : pairing2.black_name;

    // Swap the players
    await Promise.all([
      new Promise((resolve, reject) => {
        if (position2 === 'white') {
          db.run(
            `UPDATE pairings SET white_player_id = ?, white_name = ? WHERE id = ?`,
            [player1Id, player1Name, pairingId2],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        } else {
          db.run(
            `UPDATE pairings SET black_player_id = ?, black_name = ? WHERE id = ?`,
            [player1Id, player1Name, pairingId2],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        }
      }),
      new Promise((resolve, reject) => {
        if (position1 === 'white') {
          db.run(
            `UPDATE pairings SET white_player_id = ?, white_name = ? WHERE id = ?`,
            [player2Id, player2Name, pairingId1],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        } else {
          db.run(
            `UPDATE pairings SET black_player_id = ?, black_name = ? WHERE id = ?`,
            [player2Id, player2Name, pairingId1],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        }
      })
    ]);

    res.json({ 
      success: true, 
      message: 'Players swapped successfully'
    });

  } catch (error) {
    console.error('Error swapping players:', error);
    res.status(500).json({ success: false, message: 'Failed to swap players' });
  }
});

/**
 * Test SMS credentials
 * POST /api/pairings/test-sms
 */
router.post('/test-sms', async (req, res) => {
  const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = req.body;
  
  try {
    // Validate credentials
    if (!twilio_account_sid || !twilio_auth_token || !twilio_phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Missing required Twilio credentials'
      });
    }
    
    // Test sending SMS
    const twilio = require('twilio');
    const client = twilio(twilio_account_sid, twilio_auth_token);
    
    // Send a test message to a verified test number
    const testMessage = await client.messages.create({
      body: '✅ Test message from tournament system. SMS notifications are working!',
      from: twilio_phone_number,
      to: '+19802203489' // Your verified test number
    });
    
    res.json({
      success: true,
      message: 'Test SMS sent successfully',
      messageId: testMessage.sid,
      status: testMessage.status
    });
    
  } catch (error) {
    console.error('SMS test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test SMS',
      code: error.code
    });
  }
});

/**
 * Send SMS notifications for pairings (manual trigger)
 * POST /api/pairings/notifications/sms
 */
router.post('/notifications/sms', async (req, res) => {
  const { tournamentId, round, pairings } = req.body;

  try {
    if (!tournamentId || !round) {
      res.status(400).json({ 
        success: false,
        error: 'tournamentId and round are required' 
      });
      return;
    }

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      res.status(400).json({ 
        success: false,
        error: 'SMS notifications not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.' 
      });
      return;
    }

    // If pairings not provided, fetch them from database
    let pairingsToSend = pairings;
    if (!pairingsToSend || pairingsToSend.length === 0) {
      pairingsToSend = await pairingStorage.getRoundPairings(tournamentId, round);
      
      if (!pairingsToSend || pairingsToSend.length === 0) {
        res.status(404).json({ 
          success: false,
          error: `No pairings found for tournament ${tournamentId}, round ${round}` 
        });
        return;
      }
    }

    console.log(`[SMS Notifications API] Sending notifications for tournament ${tournamentId}, round ${round}`);
    const result = await smsService.sendPairingNotifications(tournamentId, round, pairingsToSend);

    res.json({ 
      success: true,
      message: `SMS notifications sent successfully`,
      result: result
    });

  } catch (error) {
    console.error('[SMS Notifications API] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * Send pairing emails via webhook (manual trigger)
 * POST /api/pairings/notifications/email
 */
router.post('/notifications/email', async (req, res) => {
  const { tournamentId, round, sectionName } = req.body;

  try {
    if (!tournamentId || !round) {
      res.status(400).json({ 
        success: false,
        error: 'tournamentId and round are required' 
      });
      return;
    }

    // Get tournament data
    const tournament = await pairingStorage.getTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ 
        success: false,
        error: `Tournament ${tournamentId} not found` 
      });
      return;
    }

    // Check if notifications are enabled
    if (!tournament.notifications_enabled) {
      res.status(400).json({ 
        success: false,
        error: 'Email notifications are disabled for this tournament' 
      });
      return;
    }

    // Get pairings for the round and section
    let pairings;
    if (sectionName) {
      pairings = await pairingStorage.getRoundPairingsForSection(tournamentId, round, sectionName);
    } else {
      pairings = await pairingStorage.getRoundPairings(tournamentId, round);
    }

    if (!pairings || pairings.length === 0) {
      res.status(404).json({ 
        success: false,
        error: `No pairings found for tournament ${tournamentId}, round ${round}${sectionName ? `, section ${sectionName}` : ''}` 
      });
      return;
    }

    console.log(`[Email Notifications API] Sending notifications for tournament ${tournamentId}, round ${round}${sectionName ? `, section ${sectionName}` : ''}`);
    
    // Send webhook notification
    await sendPairingNotificationWebhook(tournamentId, round, pairings, tournament);

    res.json({ 
      success: true,
      message: `Email notifications sent successfully`,
      pairingsCount: pairings.length
    });

  } catch (error) {
    console.error('[Email Notifications API] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ============================================================================
// LICHESS ONLINE-RATED TOURNAMENT ENDPOINTS
// ============================================================================

/**
 * Create or setup Lichess tournament for online-rated tournament
 */
router.post('/online-rated/setup', async (req, res) => {
  const { tournamentId, lichessTeamId, clock, variant, description, password } = req.body;

  try {
    // Get tournament info
    const tournament = await pairingStorage.getTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Validate it's an online-rated tournament
    if (tournament.format !== 'online-rated') {
      res.status(400).json({ 
        error: 'This endpoint is only for online-rated tournaments' 
      });
      return;
    }

    // Parse settings
    const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
    const lichessApiToken = settings.online_rated_settings?.lichess_api_token || process.env.LICHESS_API_TOKEN;

    if (!lichessApiToken) {
      res.status(400).json({ 
        error: 'Lichess API token required. Set online_rated_settings.lichess_api_token or LICHESS_API_TOKEN environment variable' 
      });
      return;
    }

    if (!lichessTeamId) {
      res.status(400).json({ 
        error: 'Lichess team ID required' 
      });
      return;
    }

    if (!clock || !clock.limit || !clock.increment) {
      res.status(400).json({ 
        error: 'Clock settings required: {limit: seconds, increment: seconds}' 
      });
      return;
    }

    // Initialize Lichess integration
    const lichess = new LichessSwissIntegration({
      token: lichessApiToken
    });

    // Create Swiss tournament on Lichess
    const result = await lichess.createSwissTournament({
      teamId: lichessTeamId,
      name: tournament.name,
      clock: clock,
      variant: variant || 'standard',
      rated: true,
      nbRounds: tournament.rounds,
      description: description || `Online rated chess tournament: ${tournament.name}`,
      password: password
    });

    if (!result.success) {
      res.status(400).json({ 
        error: result.error 
      });
      return;
    }

    // Store Lichess tournament info in settings
    const updatedSettings = {
      ...settings,
      online_rated_settings: {
        ...settings.online_rated_settings,
        lichess_tournament_id: result.id,
        lichess_team_id: lichessTeamId,
        clock_limit: clock.limit,
        clock_increment: clock.increment,
        variant: variant || 'standard',
        is_rated: true,
        description: description,
        password: password
      }
    };

    // Update tournament with Lichess info
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tournaments SET settings = ? WHERE id = ?',
        [JSON.stringify(updatedSettings), tournamentId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    res.json({ 
      success: true,
      lichessTournamentId: result.id,
      publicUrl: result.publicUrl,
      message: 'Lichess tournament created successfully'
    });

  } catch (error) {
    console.error('Error setting up Lichess tournament:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

/**
 * Sync pairings from Lichess for online-rated tournament
 */
router.post('/online-rated/sync-pairings', async (req, res) => {
  const { tournamentId, round } = req.body;

  try {
    // Get tournament info
    const tournament = await pairingStorage.getTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Validate it's an online-rated tournament
    if (tournament.format !== 'online-rated') {
      res.status(400).json({ 
        error: 'This endpoint is only for online-rated tournaments' 
      });
      return;
    }

    // Get Lichess tournament ID
    const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
    const lichessTournamentId = settings.online_rated_settings?.lichess_tournament_id;

    if (!lichessTournamentId) {
      res.status(400).json({ 
        error: 'Lichess tournament not set up yet. Use /setup endpoint first.' 
      });
      return;
    }

    const lichessApiToken = settings.online_rated_settings?.lichess_api_token || process.env.LICHESS_API_TOKEN;

    if (!lichessApiToken) {
      res.status(400).json({ 
        error: 'Lichess API token required' 
      });
      return;
    }

    // Initialize Lichess integration
    const lichess = new LichessSwissIntegration({
      token: lichessApiToken
    });

    // Get pairings from Lichess
    const roundResult = await lichess.getRoundPairings(lichessTournamentId, round);

    if (!roundResult.success) {
      res.status(400).json({ 
        error: roundResult.error 
      });
      return;
    }

    // Convert to internal format
    const lichessPairings = lichess.convertPairingsToInternalFormat(roundResult.data.pairings || []);

    // Map Lichess usernames to player IDs in our database
    const playerMap = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, lichess_username FROM players WHERE tournament_id = ?',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const usernameToPlayerId = {};
    playerMap.forEach(player => {
      if (player.lichess_username) {
        usernameToPlayerId[player.lichess_username.toLowerCase()] = player.id;
      }
    });

    // Map pairings to internal players
    const internalPairings = lichessPairings.map((pairing, index) => {
      return {
        board: index + 1,
        white_player_id: usernameToPlayerId[pairing.white_player_id?.toLowerCase()] || pairing.white_player_id,
        black_player_id: usernameToPlayerId[pairing.black_player_id?.toLowerCase()] || pairing.black_player_id,
        is_bye: pairing.is_bye,
        round: round
      };
    });

    // Store pairings using the pairing storage service
    const storageResult = await pairingStorage.storePairings(
      tournamentId,
      round,
      internalPairings,
      { clearExisting: true, validateBeforeStore: false }
    );

    res.json({ 
      success: true,
      message: `Synced ${storageResult.storedCount} pairings from Lichess`,
      pairings: storageResult.pairings
    });

  } catch (error) {
    console.error('Error syncing pairings from Lichess:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

/**
 * Sync standings from Lichess
 */
router.get('/online-rated/:tournamentId/standings', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // Get tournament info
    const tournament = await pairingStorage.getTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Validate it's an online-rated tournament
    if (tournament.format !== 'online-rated') {
      res.status(400).json({ 
        error: 'This endpoint is only for online-rated tournaments' 
      });
      return;
    }

    // Get Lichess tournament ID
    const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
    const lichessTournamentId = settings.online_rated_settings?.lichess_tournament_id;

    if (!lichessTournamentId) {
      res.status(400).json({ 
        error: 'Lichess tournament not set up yet' 
      });
      return;
    }

    const lichessApiToken = settings.online_rated_settings?.lichess_api_token || process.env.LICHESS_API_TOKEN;

    if (!lichessApiToken) {
      res.status(400).json({ 
        error: 'Lichess API token required' 
      });
      return;
    }

    // Initialize Lichess integration
    const lichess = new LichessSwissIntegration({
      token: lichessApiToken
    });

    // Get standings from Lichess
    const standingsResult = await lichess.getStandings(lichessTournamentId);

    if (!standingsResult.success) {
      res.status(400).json({ 
        error: standingsResult.error 
      });
      return;
    }

    res.json({ 
      success: true,
      standings: standingsResult.data
    });

  } catch (error) {
    console.error('Error getting standings from Lichess:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

module.exports = router;
