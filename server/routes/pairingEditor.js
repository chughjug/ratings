const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const router = express.Router();

// ============================================================================
// ADVANCED PAIRING EDITOR API ENDPOINTS
// ============================================================================

/**
 * Update a single pairing
 */
router.put('/pairing/:pairingId', async (req, res) => {
  try {
    const { pairingId } = req.params;
    const updates = req.body;

    // Validate required fields
    if (!pairingId) {
      return res.status(400).json({
        success: false,
        error: 'Pairing ID is required'
      });
    }

    // Check if pairing exists
    const existingPairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!existingPairing) {
      return res.status(404).json({
        success: false,
        error: 'Pairing not found'
      });
    }

    // Update pairing
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'white_id', 'white_name', 'white_rating',
      'black_id', 'black_name', 'black_rating',
      'board', 'result', 'section'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateValues.push(pairingId);

    const updateQuery = `
      UPDATE pairings 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await new Promise((resolve, reject) => {
      db.run(updateQuery, updateValues, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

    // Fetch updated pairing
    const updatedPairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      success: true,
      pairing: updatedPairing
    });

  } catch (error) {
    console.error('Error updating pairing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pairing'
    });
  }
});

/**
 * Swap players in a pairing
 */
router.post('/pairing/:pairingId/swap', async (req, res) => {
  try {
    const { pairingId } = req.params;

    // Get current pairing
    const pairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!pairing) {
      return res.status(404).json({
        success: false,
        error: 'Pairing not found'
      });
    }

    // Swap white and black players
    const updateQuery = `
      UPDATE pairings 
      SET 
        white_id = ?,
        white_name = ?,
        white_rating = ?,
        black_id = ?,
        black_name = ?,
        black_rating = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await new Promise((resolve, reject) => {
      db.run(updateQuery, [
        pairing.black_id,
        pairing.black_name,
        pairing.black_rating,
        pairing.white_id,
        pairing.white_name,
        pairing.white_rating,
        pairingId
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

    // Fetch updated pairing
    const updatedPairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      success: true,
      pairing: updatedPairing
    });

  } catch (error) {
    console.error('Error swapping players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to swap players'
    });
  }
});

/**
 * Swap two pairings (exchange their board numbers)
 */
router.post('/pairings/swap', async (req, res) => {
  try {
    const { pairingId1, pairingId2 } = req.body;

    if (!pairingId1 || !pairingId2) {
      return res.status(400).json({
        success: false,
        error: 'Both pairing IDs are required'
      });
    }

    // Get both pairings
    const pairing1 = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairingId1],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const pairing2 = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairingId2],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!pairing1 || !pairing2) {
      return res.status(404).json({
        success: false,
        error: 'One or both pairings not found'
      });
    }

    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Update pairing 1 with pairing 2's board
      db.run(
        'UPDATE pairings SET board = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [pairing2.board, pairingId1],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            throw err;
          }
        }
      );

      // Update pairing 2 with pairing 1's board
      db.run(
        'UPDATE pairings SET board = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [pairing1.board, pairingId2],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            throw err;
          }
        }
      );

      // Commit transaction
      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({
            success: false,
            error: 'Failed to swap pairings'
          });
        } else {
          res.json({
            success: true,
            message: 'Pairings swapped successfully'
          });
        }
      });
    });

  } catch (error) {
    console.error('Error swapping pairings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to swap pairings'
    });
  }
});

/**
 * Move a player from one pairing to another
 */
router.post('/pairings/move-player', async (req, res) => {
  try {
    const { fromPairingId, toPairingId, position } = req.body;

    if (!fromPairingId || !toPairingId || !position) {
      return res.status(400).json({
        success: false,
        error: 'fromPairingId, toPairingId, and position are required'
      });
    }

    if (!['white', 'black'].includes(position)) {
      return res.status(400).json({
        success: false,
        error: 'Position must be "white" or "black"'
      });
    }

    // Get source pairing
    const fromPairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [fromPairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!fromPairing) {
      return res.status(404).json({
        success: false,
        error: 'Source pairing not found'
      });
    }

    // Get target pairing
    const toPairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [toPairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!toPairing) {
      return res.status(404).json({
        success: false,
        error: 'Target pairing not found'
      });
    }

    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Remove player from source pairing
      const removeQuery = position === 'white' 
        ? 'UPDATE pairings SET white_id = NULL, white_name = "TBD", white_rating = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        : 'UPDATE pairings SET black_id = NULL, black_name = "TBD", black_rating = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

      db.run(removeQuery, [fromPairingId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          throw err;
        }
      });

      // Add player to target pairing
      const addQuery = position === 'white'
        ? 'UPDATE pairings SET white_id = ?, white_name = ?, white_rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        : 'UPDATE pairings SET black_id = ?, black_name = ?, black_rating = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

      const addValues = position === 'white'
        ? [fromPairing.white_id, fromPairing.white_name, fromPairing.white_rating, toPairingId]
        : [fromPairing.black_id, fromPairing.black_name, fromPairing.black_rating, toPairingId];

      db.run(addQuery, addValues, (err) => {
        if (err) {
          db.run('ROLLBACK');
          throw err;
        }
      });

      // Commit transaction
      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({
            success: false,
            error: 'Failed to move player'
          });
        } else {
          res.json({
            success: true,
            message: 'Player moved successfully'
          });
        }
      });
    });

  } catch (error) {
    console.error('Error moving player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to move player'
    });
  }
});

/**
 * Delete a pairing
 */
router.delete('/pairing/:pairingId', async (req, res) => {
  try {
    const { pairingId } = req.params;

    // Check if pairing exists
    const pairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!pairing) {
      return res.status(404).json({
        success: false,
        error: 'Pairing not found'
      });
    }

    // Delete pairing
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM pairings WHERE id = ?',
        [pairingId],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      message: 'Pairing deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting pairing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete pairing'
    });
  }
});

/**
 * Duplicate a pairing
 */
router.post('/pairing/:pairingId/duplicate', async (req, res) => {
  try {
    const { pairingId } = req.params;
    const { newBoard } = req.body;

    // Get original pairing
    const originalPairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [pairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!originalPairing) {
      return res.status(404).json({
        success: false,
        error: 'Original pairing not found'
      });
    }

    // Create new pairing
    const newPairingId = uuidv4();
    const insertQuery = `
      INSERT INTO pairings (
        id, tournament_id, round, section, board,
        white_id, white_name, white_rating,
        black_id, black_name, black_rating,
        result, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    await new Promise((resolve, reject) => {
      db.run(insertQuery, [
        newPairingId,
        originalPairing.tournament_id,
        originalPairing.round,
        originalPairing.section,
        newBoard || originalPairing.board + 1,
        originalPairing.white_id,
        originalPairing.white_name,
        originalPairing.white_rating,
        originalPairing.black_id,
        originalPairing.black_name,
        originalPairing.black_rating,
        originalPairing.result
      ], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

    // Fetch new pairing
    const newPairing = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM pairings WHERE id = ?',
        [newPairingId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      success: true,
      pairing: newPairing
    });

  } catch (error) {
    console.error('Error duplicating pairing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate pairing'
    });
  }
});

/**
 * Bulk update pairings
 */
router.put('/pairings/bulk', async (req, res) => {
  try {
    const { pairings } = req.body;

    if (!Array.isArray(pairings) || pairings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Pairings array is required'
      });
    }

    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      let completed = 0;
      let errors = [];

      pairings.forEach((pairing, index) => {
        const updateQuery = `
          UPDATE pairings 
          SET 
            white_id = ?, white_name = ?, white_rating = ?,
            black_id = ?, black_name = ?, black_rating = ?,
            board = ?, result = ?, section = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        db.run(updateQuery, [
          pairing.white_id,
          pairing.white_name,
          pairing.white_rating,
          pairing.black_id,
          pairing.black_name,
          pairing.black_rating,
          pairing.board,
          pairing.result,
          pairing.section,
          pairing.id
        ], function(err) {
          if (err) {
            errors.push({ index, error: err.message });
          }
          completed++;

          if (completed === pairings.length) {
            if (errors.length > 0) {
              db.run('ROLLBACK');
              res.status(400).json({
                success: false,
                error: 'Some pairings failed to update',
                details: errors
              });
            } else {
              db.run('COMMIT', (err) => {
                if (err) {
                  res.status(500).json({
                    success: false,
                    error: 'Failed to commit bulk update'
                  });
                } else {
                  res.json({
                    success: true,
                    message: `Updated ${pairings.length} pairings successfully`
                  });
                }
              });
            }
          }
        });
      });
    });

  } catch (error) {
    console.error('Error bulk updating pairings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update pairings'
    });
  }
});

/**
 * Validate pairings for conflicts
 */
router.post('/pairings/validate', async (req, res) => {
  try {
    const { pairings, tournamentId, round } = req.body;

    if (!Array.isArray(pairings)) {
      return res.status(400).json({
        success: false,
        error: 'Pairings array is required'
      });
    }

    const errors = [];
    const warnings = [];
    const playerGames = new Map();
    const boardNumbers = new Set();

    // Check for conflicts
    pairings.forEach((pairing, index) => {
      // Check for duplicate board numbers
      if (boardNumbers.has(pairing.board)) {
        errors.push({
          type: 'duplicate_board',
          message: `Duplicate board number ${pairing.board}`,
          pairingIndex: index,
          pairingId: pairing.id
        });
      }
      boardNumbers.add(pairing.board);

      // Check for players playing themselves
      if (pairing.white_id && pairing.black_id && pairing.white_id === pairing.black_id) {
        errors.push({
          type: 'self_pairing',
          message: `Player ${pairing.white_name} is paired against themselves`,
          pairingIndex: index,
          pairingId: pairing.id
        });
      }

      // Count games per player
      if (pairing.white_id) {
        const count = playerGames.get(pairing.white_id) || 0;
        playerGames.set(pairing.white_id, count + 1);
      }
      if (pairing.black_id) {
        const count = playerGames.get(pairing.black_id) || 0;
        playerGames.set(pairing.black_id, count + 1);
      }
    });

    // Check for players with multiple games
    playerGames.forEach((count, playerId) => {
      if (count > 1) {
        errors.push({
          type: 'multiple_games',
          message: `Player appears in ${count} games`,
          playerId: playerId
        });
      }
    });

    // Check for rating imbalances (warnings)
    pairings.forEach((pairing, index) => {
      if (pairing.white_rating && pairing.black_rating) {
        const ratingDiff = Math.abs(pairing.white_rating - pairing.black_rating);
        if (ratingDiff > 400) {
          warnings.push({
            type: 'rating_imbalance',
            message: `Large rating difference: ${ratingDiff} points`,
            pairingIndex: index,
            pairingId: pairing.id,
            ratingDiff
          });
        }
      }
    });

    res.json({
      success: true,
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalPairings: pairings.length,
        errorCount: errors.length,
        warningCount: warnings.length
      }
    });

  } catch (error) {
    console.error('Error validating pairings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate pairings'
    });
  }
});

/**
 * Get pairing history for a tournament
 */
router.get('/tournament/:tournamentId/history', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { round, section } = req.query;

    let query = `
      SELECT 
        p.*,
        'pairing_update' as action_type,
        p.updated_at as timestamp
      FROM pairings p
      WHERE p.tournament_id = ?
    `;
    
    const params = [tournamentId];

    if (round) {
      query += ' AND p.round = ?';
      params.push(round);
    }

    if (section) {
      query += ' AND p.section = ?';
      params.push(section);
    }

    query += ' ORDER BY p.updated_at DESC LIMIT 100';

    const history = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Error fetching pairing history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pairing history'
    });
  }
});

module.exports = router;

