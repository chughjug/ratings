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
      validateRoundSeparation = true
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

        // Step 3: Check for existing pairings
        this.getExistingPairingsCount(tournamentId, round).then((existingPairings) => {
          if (existingPairings > 0 && !clearExisting) {
            reject(new Error(`Round ${round} already has ${existingPairings} pairings. Use clearExisting=true to replace them.`));
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
   * Get pairings for a specific round
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
 * Generate and store pairings for a round - ENHANCED VERSION
 * This endpoint uses the enhanced pairing system for complete section independence
 */
router.post('/generate', async (req, res) => {
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
      message: `Round ${currentRound} pairings generated and stored successfully`,
      pairings: result.pairings,
      sectionResults: result.sectionResults,
      metadata: result.metadata
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

    // Generate pairings using the enhanced FIDE Dutch algorithm
    const pairingResult = generateEnhancedSwissPairings(players, currentRound, {
      previousPairings,
      tournamentSettings: tournament,
      section: sectionName
    });
    const generatedPairings = pairingResult.pairings;

    // Store pairings using the robust storage system
    const storeResult = await pairingStorage.storePairings(tournamentId, currentRound, generatedPairings, {
      clearExisting: false,
      validateBeforeStore: true,
      validateRoundSeparation: true
    });

    res.json({ 
      success: true,
      message: `Round ${currentRound} pairings generated and stored successfully for section "${sectionName}"`,
      ...storeResult
    });

  } catch (error) {
    console.error('Error generating pairings for section:', error);
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
 * Get round status - ENHANCED VERSION
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

    // Use the enhanced pairing system for status checking
    const roundStatus = await EnhancedPairingSystem.isRoundComplete(tournamentId, roundNum, db);
    const pairings = await pairingStorage.getRoundPairings(tournamentId, roundNum);
    
    // Check if previous rounds are complete
    let previousRoundsComplete = true;
    if (roundNum > 1) {
      const previousRoundStatus = await EnhancedPairingSystem.isRoundComplete(tournamentId, roundNum - 1, db);
      previousRoundsComplete = previousRoundStatus.isComplete;
    }
    
    res.json({
      success: true,
      tournamentId,
      round: roundNum,
      totalPairings: roundStatus.totalPairings,
      completedPairings: roundStatus.completedPairings,
      incompletePairings: roundStatus.incompleteCount,
      completionPercentage: roundStatus.totalPairings > 0 ? 
        Math.round((roundStatus.completedPairings / roundStatus.totalPairings) * 100) : 0,
      isComplete: roundStatus.isComplete,
      hasPairings: pairings.length > 0,
      canGenerateNextRound: roundStatus.isComplete,
      previousRoundsComplete: previousRoundsComplete,
      incompleteSections: roundStatus.incompleteSections
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
    // Get basic standings data
    const basicStandings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.id, p.name, p.rating, p.section, p.uscf_id,
                COALESCE(SUM(r.points), 0) as total_points,
                COUNT(r.id) as games_played,
                COUNT(CASE WHEN r.result = '1-0' OR r.result = '1-0F' THEN 1 END) as wins,
                COUNT(CASE WHEN r.result = '0-1' OR r.result = '0-1F' THEN 1 END) as losses,
                COUNT(CASE WHEN r.result = '1/2-1/2' OR r.result = '1/2-1/2F' THEN 1 END) as draws
         FROM players p
         LEFT JOIN results r ON p.id = r.player_id
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
