const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const router = express.Router();

/**
 * Store game room information for a pairing
 */
router.post('/games/create', (req, res) => {
  const { tournamentId, pairingId, round, roomCode, timeControl, whiteUrl, blackUrl, whiteToken, blackToken, whitePlayerId, blackPlayerId } = req.body;

  if (!tournamentId || !pairingId || !round || !roomCode) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  const id = uuidv4();

  db.run(
    `INSERT INTO online_games (id, tournament_id, pairing_id, round, room_code, game_url, white_url, black_url, white_token, black_token, time_control, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', datetime('now'))`,
    [id, tournamentId, pairingId, round, roomCode, whiteUrl || '', whiteUrl, blackUrl, whiteToken, blackToken, timeControl],
    function(err) {
      if (err) {
        console.error('Error creating game:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to create game'
        });
      }

      res.json({
        success: true,
        data: {
          id,
          whiteUrl,
          blackUrl,
          roomCode
        }
      });
    }
  );
});

/**
 * Get all games for a tournament round
 */
router.get('/games/:tournamentId/round/:round', (req, res) => {
  const { tournamentId, round } = req.params;

  db.all(
    `SELECT og.*, 
            p.id as pairing_id,
            pw.name as white_player_name,
            pb.name as black_player_name
     FROM online_games og
     LEFT JOIN pairings p ON og.pairing_id = p.id
     LEFT JOIN players pw ON p.white_player_id = pw.id
     LEFT JOIN players pb ON p.black_player_id = pb.id
     WHERE og.tournament_id = ? AND og.round = ?
     ORDER BY og.created_at`,
    [tournamentId, round],
    (err, rows) => {
      if (err) {
        console.error('Error fetching games:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch games'
        });
      }

      res.json({
        success: true,
        data: rows
      });
    }
  );
});

/**
 * Update game result from online game
 */
router.put('/games/:id/result', (req, res) => {
  const { id } = req.params;
  const { result, pgn } = req.body;

  db.run(
    `UPDATE online_games 
     SET result = ?, pgn = ?, status = 'completed', completed_at = datetime('now')
     WHERE id = ?`,
    [result, pgn, id],
    function(err) {
      if (err) {
        console.error('Error updating game result:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update game result'
        });
      }

      // Also update the pairing result if pairing_id exists
      if (result) {
        db.get(
          'SELECT pairing_id FROM online_games WHERE id = ?',
          [id],
          (err, row) => {
            if (!err && row && row.pairing_id) {
              db.run(
                `UPDATE pairings SET result = ?, pgn = ? WHERE id = ?`,
                [result, pgn, row.pairing_id]
              );
            }
          }
        );
      }

      res.json({
        success: true,
        message: 'Game result updated successfully'
      });
    }
  );
});

/**
 * Get game details
 */
router.get('/games/:id', (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM online_games WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        console.error('Error fetching game:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch game'
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }

      res.json({
        success: true,
        data: row
      });
    }
  );
});

// In-memory store for 2PlayerChess rooms (replicated from 2PlayerChess-master/index.js)
// TODO: In production, use Redis or database for persistent room storage
let chessRooms = {};

/**
 * Create a custom 2PlayerChess room
 */
router.post('/create-room', (req, res) => {
  const { roomCode, whitePlayer, blackPlayer, whitePlayerId, blackPlayerId, timeControl } = req.body;
  
  if (!roomCode || !whitePlayer || !blackPlayer) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: roomCode, whitePlayer, blackPlayer'
    });
  }
  
  // Create room with predefined players
  chessRooms[roomCode] = {
    first: whitePlayer,
    firstID: whitePlayerId || '',
    second: blackPlayer,
    secondID: blackPlayerId || '',
    whitePlayer: whitePlayer,
    blackPlayer: blackPlayer,
    timeControl: timeControl || '15',
    customRoom: true
  };
  
  console.log(`Custom room created: ${roomCode} for ${whitePlayer} vs ${blackPlayer}`);
  
  res.json({
    success: true,
    roomCode: roomCode,
    message: `Room ${roomCode} created for ${whitePlayer} (White) vs ${blackPlayer} (Black)`
  });
});

/**
 * Check if a 2PlayerChess room exists
 */
router.get('/room/:roomCode', (req, res) => {
  const { roomCode } = req.params;
  
  if (chessRooms[roomCode]) {
    res.json({
      success: true,
      room: chessRooms[roomCode]
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Room not found'
    });
  }
});

module.exports = router;
