const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { EnhancedPairingSystem } = require('../utils/enhancedPairingSystem');
const { calculateTournamentTiebreakers, getDefaultTiebreakerOrder } = require('../utils/tiebreakers');
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
      let query = 'SELECT white_player_id, black_player_id, round FROM pairings WHERE tournament_id = ? AND round < ?';
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
        INSERT INTO pairings (id, tournament_id, round, board, white_player_id, black_player_id, section)
        VALUES (?, ?, ?, ?, ?, ?, ?)
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
          pairing.section || 'Open'
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
              section: pairing.section || 'Open'
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
                wp.name as white_name, wp.rating as white_rating, wp.uscf_id as white_uscf_id,
                bp.name as black_name, bp.rating as black_rating, bp.uscf_id as black_uscf_id
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
 * Generate pairings for a specific section
 */
router.post('/generate/section', async (req, res) => {
  const { tournamentId, round, sectionName } = req.body;

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

    // Get players for the specific section
    const players = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? AND status = "active" AND section = ? ORDER BY rating DESC',
        [tournamentId, sectionName],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (players.length === 0) {
      res.status(400).json({ error: `No active players found for section "${sectionName}"` });
      return;
    }

    // Get previous pairings for Swiss system (filtered by section)
    const previousPairings = await pairingStorage.getPreviousPairings(tournamentId, currentRound, sectionName);

    // Get color history for this section
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
        console.warn(`Could not get color history for player ${player.id}:`, error.message);
        sectionColorHistory[player.id] = 0;
      }
    }

    // Create enhanced pairing system for this section only
    const sectionSystem = new EnhancedPairingSystem(players, {
      previousPairings,
      colorHistory: sectionColorHistory,
      section: sectionName,
      tournamentId,
      db,
      round: currentRound
    });

    // Generate pairings for this section only
    const generatedPairings = sectionSystem.generatePairings();
    
    // Assign board numbers and section info
    generatedPairings.forEach((pairing, index) => {
      pairing.board = index + 1;
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

    if (existingSectionPairings > 0) {
      res.status(400).json({ 
        error: `Round ${currentRound} already has ${existingSectionPairings} pairings for section "${sectionName}". Use clearExisting=true to replace them.` 
      });
      return;
    }

    // Store pairings using the robust storage system
    const storeResult = await pairingStorage.storePairings(tournamentId, currentRound, generatedPairings, {
      clearExisting: false,
      validateBeforeStore: true,
      validateRoundSeparation: false, // Allow section independence
      section: sectionName
    });

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
                pw.name as white_name, pw.rating as white_rating, pw.uscf_id as white_uscf_id,
                pb.name as black_name, pb.rating as black_rating, pb.uscf_id as black_uscf_id
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

    if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin') {
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

  const validResults = ['1-0', '0-1', '1/2-1/2', '1-0F', '0-1F', '1/2-1/2F'];
  if (!validResults.includes(result)) {
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

    res.json({ message: 'Result updated successfully' });
  } catch (error) {
    console.error('Error updating result:', error);
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
         WHERE tournament_id = ? AND round = ? AND section = ? AND result IS NULL`,
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

module.exports = router;
