const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const crypto = require('crypto');
const router = express.Router();

// Helper function to generate secure token
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create a new custom chess game with links
router.post('/create', (req, res) => {
  const {
    whitePlayer,
    blackPlayer,
    whitePlayerName,
    blackPlayerName,
    initialTimeMinutes = 10,
    incrementSeconds = 0
  } = req.body;

  const gameId = uuidv4();
  const whiteToken = generateSecureToken();
  const blackToken = generateSecureToken();
  const now = new Date().toISOString();
  const initialTimeMs = initialTimeMinutes * 60 * 1000;
  
  const timeControlSettings = JSON.stringify({
    initialTimeMinutes,
    incrementSeconds,
    initialTimeMs
  });

  db.run(
    `INSERT INTO chess_games (
      id, white_player, black_player, white_token, black_token,
      white_time_ms, black_time_ms, initial_time_ms, time_control_settings,
      move_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      gameId,
      whitePlayer || null,
      blackPlayer || null,
      whiteToken,
      blackToken,
      initialTimeMs,
      initialTimeMs,
      initialTimeMs,
      timeControlSettings,
      0,
      now,
      now
    ],
    function(err) {
      if (err) {
        console.error('Error creating chess game:', err);
        return res.status(500).json({ error: 'Failed to create game' });
      }

      res.json({
        success: true,
        game: {
          id: gameId,
          whiteToken,
          blackToken,
          whitePlayer: whitePlayerName || 'White',
          blackPlayer: blackPlayerName || 'Black',
          whiteUrl: `${req.protocol}://${req.get('host')}/game/${gameId}/white/${whiteToken}`,
          blackUrl: `${req.protocol}://${req.get('host')}/game/${gameId}/black/${blackToken}`,
          initialTimeMinutes,
          incrementSeconds,
          createdAt: now
        }
      });
    }
  );
});

// Create a new chess game (for saving existing games)
router.post('/', (req, res) => {
  const {
    whitePlayer,
    blackPlayer,
    pgn,
    result,
    whiteTimeMs,
    blackTimeMs,
    initialTimeMs,
    moveCount
  } = req.body;

  if (!pgn) {
    return res.status(400).json({ error: 'PGN is required' });
  }

  const gameId = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO chess_games (
      id, white_player, black_player, pgn, result, 
      white_time_ms, black_time_ms, initial_time_ms, move_count,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      gameId,
      whitePlayer || null,
      blackPlayer || null,
      pgn,
      result || null,
      whiteTimeMs || null,
      blackTimeMs || null,
      initialTimeMs || null,
      moveCount || 0,
      now,
      now
    ],
    function(err) {
      if (err) {
        console.error('Error creating chess game:', err);
        return res.status(500).json({ error: 'Failed to create game' });
      }

      res.json({
        success: true,
        game: {
          id: gameId,
          whitePlayer,
          blackPlayer,
          pgn,
          result,
          whiteTimeMs,
          blackTimeMs,
          initialTimeMs,
          moveCount,
          createdAt: now,
          updatedAt: now
        }
      });
    }
  );
});

// Get all chess games
router.get('/', (req, res) => {
  db.all(
    `SELECT * FROM chess_games ORDER BY created_at DESC LIMIT 100`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching chess games:', err);
        return res.status(500).json({ error: 'Failed to fetch games' });
      }

      res.json({
        success: true,
        games: rows
      });
    }
  );
});

// Get a specific chess game by ID and token (for accessing shared games)
router.get('/access/:id/:color/:token', (req, res) => {
  const { id, color, token } = req.params;

  if (!['white', 'black'].includes(color)) {
    return res.status(400).json({ error: 'Invalid color. Must be "white" or "black"' });
  }

  db.get(
    `SELECT * FROM chess_games WHERE id = ? AND ${color}_token = ?`,
    [id, token],
    (err, row) => {
      if (err) {
        console.error('Error fetching chess game:', err);
        return res.status(500).json({ error: 'Failed to fetch game' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Game not found or invalid token' });
      }

      // Parse time control settings
      let timeControlSettings = null;
      if (row.time_control_settings) {
        try {
          timeControlSettings = JSON.parse(row.time_control_settings);
        } catch (e) {
          console.error('Error parsing time control settings:', e);
        }
      }

      res.json({
        success: true,
        game: {
          ...row,
          playerColor: color,
          timeControlSettings
        }
      });
    }
  );
});

// Get a specific chess game by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM chess_games WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error('Error fetching chess game:', err);
        return res.status(500).json({ error: 'Failed to fetch game' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.json({
        success: true,
        game: row
      });
    }
  );
});

// Update a chess game
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    whitePlayer,
    blackPlayer,
    pgn,
    result,
    whiteTimeMs,
    blackTimeMs,
    moveCount
  } = req.body;

  const updates = [];
  const values = [];

  if (whitePlayer !== undefined) {
    updates.push('white_player = ?');
    values.push(whitePlayer);
  }
  if (blackPlayer !== undefined) {
    updates.push('black_player = ?');
    values.push(blackPlayer);
  }
  if (pgn !== undefined) {
    updates.push('pgn = ?');
    values.push(pgn);
  }
  if (result !== undefined) {
    updates.push('result = ?');
    values.push(result);
  }
  if (whiteTimeMs !== undefined) {
    updates.push('white_time_ms = ?');
    values.push(whiteTimeMs);
  }
  if (blackTimeMs !== undefined) {
    updates.push('black_time_ms = ?');
    values.push(blackTimeMs);
  }
  if (moveCount !== undefined) {
    updates.push('move_count = ?');
    values.push(moveCount);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  db.run(
    `UPDATE chess_games SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        console.error('Error updating chess game:', err);
        return res.status(500).json({ error: 'Failed to update game' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.json({
        success: true,
        message: 'Game updated successfully'
      });
    }
  );
});

// Delete a chess game
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM chess_games WHERE id = ?`,
    [id],
    function(err) {
      if (err) {
        console.error('Error deleting chess game:', err);
        return res.status(500).json({ error: 'Failed to delete game' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      res.json({
        success: true,
        message: 'Game deleted successfully'
      });
    }
  );
});

module.exports = router;

