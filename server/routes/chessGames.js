const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const crypto = require('crypto');
const router = express.Router();

// Helper function to generate secure token
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to generate password from email or phone
function generatePlayerPassword(email, phone) {
  if (email && email.trim()) {
    return email.trim().toLowerCase();
  }
  if (phone && phone.trim()) {
    // Extract last 4 digits of phone number
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length >= 4) {
      return digitsOnly.slice(-4);
    }
  }
  // Default password if neither email nor phone available
  return '1234';
}

// Create a new custom chess game with socket.io room and player links
router.post('/create-custom', async (req, res) => {
  const {
    whiteName,
    blackName,
    timeControl, // Format: "10+0" or { minutes: 10, increment: 0 }
    whitePlayerId, // Optional: player ID to look up email/phone
    blackPlayerId, // Optional: player ID to look up email/phone
    whitePassword, // Optional: pre-generated password
    blackPassword, // Optional: pre-generated password
    whiteRating, // Optional: player rating
    blackRating, // Optional: player rating
    organizationLogo, // Optional: organization logo URL
    baseUrl // Optional: organization base URL (if provided, use instead of request host)
  } = req.body;

  // Validate inputs
  if (!whiteName || !blackName) {
    return res.status(400).json({ 
      success: false,
      error: 'whiteName and blackName are required' 
    });
  }

  // Parse time control (default to 3+2)
  let initialTimeMinutes = 3;
  let incrementSeconds = 2;
  let delaySeconds = 0;
  
  if (timeControl) {
    if (typeof timeControl === 'string') {
      // Use OnlineGameService to parse time control (handles G45D5, G45 + 10, etc.)
      const OnlineGameService = require('../services/onlineGameService');
      const parsed = OnlineGameService.parseTimeControl(timeControl);
      initialTimeMinutes = parsed.minutes || 3;
      incrementSeconds = parsed.increment || 2;
      delaySeconds = parsed.delay || 0;
    } else if (typeof timeControl === 'object') {
      initialTimeMinutes = timeControl.minutes || 3;
      incrementSeconds = timeControl.increment || 2;
      delaySeconds = timeControl.delay || 0;
    }
  }

  // Fetch player emails/phones if player IDs provided and passwords not already set
  let whitePass = whitePassword;
  let blackPass = blackPassword;

  if (!whitePass && whitePlayerId) {
    try {
      const whitePlayer = await new Promise((resolve, reject) => {
        db.get('SELECT email, phone FROM players WHERE id = ?', [whitePlayerId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (whitePlayer) {
        whitePass = generatePlayerPassword(whitePlayer.email, whitePlayer.phone);
      }
    } catch (error) {
      console.error('Error fetching white player info:', error);
    }
  }

  if (!blackPass && blackPlayerId) {
    try {
      const blackPlayer = await new Promise((resolve, reject) => {
        db.get('SELECT email, phone FROM players WHERE id = ?', [blackPlayerId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (blackPlayer) {
        blackPass = generatePlayerPassword(blackPlayer.email, blackPlayer.phone);
      }
    } catch (error) {
      console.error('Error fetching black player info:', error);
    }
  }

  // Generate unique room code
  const roomCode = Math.random().toString(36).substr(2, 10).toUpperCase();
  
  // Import chessRoomsService
  const chessRoomsService = require('../services/chessRooms');
  
  // Create room with both players pre-set
  // Note: first player (white) will connect first, second (black) will connect second
  const roomData = {
    first: whiteName,
    firstID: '', // Will be set when white player connects
    second: blackName,
    secondID: '', // Will be set when black player connects
    moveObj: [],
    moveCount: 0,
    passwords: {
      white: whitePass,
      black: blackPass
    },
    options: {
      timeControls: delaySeconds > 0 
        ? `G${initialTimeMinutes}D${delaySeconds}` 
        : `${initialTimeMinutes}+${incrementSeconds}`,
      initialTimeMinutes,
      incrementSeconds,
      delaySeconds: delaySeconds || 0
    }
  };

  // Set room asynchronously
  chessRoomsService.setRoom(roomCode, roomData).then(() => {
    // Use provided baseUrl if available, otherwise fall back to request host
    const linkBaseUrl = baseUrl || `${req.protocol}://${req.get('host')}`;
    
    // Generate links with room code and player info (passwords handled by PlayChess component)
    // Format time control: G45D5 for delay, or G45+10 for increment, or 45+10 standard
    let timeControlParam = '';
    if (delaySeconds > 0) {
      timeControlParam = `G${initialTimeMinutes}D${delaySeconds}`;
    } else if (incrementSeconds > 0) {
      timeControlParam = `${initialTimeMinutes}+${incrementSeconds}`;
    } else {
      timeControlParam = `${initialTimeMinutes}`;
    }
    
    // White link includes name, room code, color, ratings, time control, and logo
    let whiteLink = `${linkBaseUrl}/play-chess?room=${roomCode}&name=${encodeURIComponent(whiteName)}&color=white`;
    whiteLink += `&time=${encodeURIComponent(timeControlParam)}`;
    if (whiteRating) {
      whiteLink += `&whiteRating=${whiteRating}`;
    }
    if (blackRating) {
      whiteLink += `&blackRating=${blackRating}`;
    }
    if (organizationLogo) {
      whiteLink += `&logo=${encodeURIComponent(organizationLogo)}`;
    }
    
    // Black link includes name, room code, color, ratings, time control, and logo
    let blackLink = `${linkBaseUrl}/play-chess?room=${roomCode}&name=${encodeURIComponent(blackName)}&color=black`;
    blackLink += `&time=${encodeURIComponent(timeControlParam)}`;
    if (whiteRating) {
      blackLink += `&whiteRating=${whiteRating}`;
    }
    if (blackRating) {
      blackLink += `&blackRating=${blackRating}`;
    }
    if (organizationLogo) {
      blackLink += `&logo=${encodeURIComponent(organizationLogo)}`;
    }
    
    res.json({
      success: true,
      gameId: roomCode,
      whiteLink,
      blackLink,
      whiteName,
      blackName,
      whitePassword: whitePass,
      blackPassword: blackPass,
      timeControl: {
        minutes: initialTimeMinutes,
        increment: incrementSeconds,
        display: incrementSeconds > 0 ? `${initialTimeMinutes}+${incrementSeconds}` : `${initialTimeMinutes}`
      },
      createdAt: new Date().toISOString()
    });
  }).catch((error) => {
    console.error('Error creating custom game room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game room'
    });
  });
});

// Create game for a specific pairing (manual creation)
router.post('/create-for-pairing', async (req, res) => {
  const { pairingId } = req.body;

  if (!pairingId) {
    return res.status(400).json({
      success: false,
      error: 'pairingId is required'
    });
  }

  try {
    // Get pairing details
    db.get('SELECT * FROM pairings WHERE id = ?', [pairingId], async (err, pairing) => {
      if (err) {
        console.error('Error finding pairing:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to find pairing'
        });
      }

      if (!pairing) {
        return res.status(404).json({
          success: false,
          error: 'Pairing not found'
        });
      }

      // Check if game already exists
      if (pairing.game_id && pairing.white_link && pairing.black_link) {
        return res.json({
          success: true,
          message: 'Game already exists for this pairing',
          gameId: pairing.game_id,
          whiteLink: pairing.white_link,
          blackLink: pairing.black_link
        });
      }

      // Get tournament to get time control
      db.get('SELECT * FROM tournaments WHERE id = ?', [pairing.tournament_id], async (tournamentErr, tournament) => {
        if (tournamentErr || !tournament) {
          return res.status(500).json({
            success: false,
            error: 'Failed to find tournament'
          });
        }

        // Use OnlineGameService to create the game
        const OnlineGameService = require('../services/onlineGameService');
        
        // Try to get organization URL from tournament settings or organization record
        let baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Check tournament settings for organization URL
        if (tournament.settings) {
          try {
            const settings = typeof tournament.settings === 'string' 
              ? JSON.parse(tournament.settings) 
              : tournament.settings;
            
            // Check for organization URL in settings
            if (settings.organization_url) {
              baseUrl = settings.organization_url;
              // Ensure it doesn't have trailing slash
              baseUrl = baseUrl.replace(/\/$/, '');
            }
          } catch (e) {
            console.warn('Error parsing tournament settings for organization URL:', e);
          }
        }
        
        // If not in settings, check organization record
        if (tournament.organization_id && baseUrl === `${req.protocol}://${req.get('host')}`) {
          try {
            const org = await new Promise((resolve, reject) => {
              db.get(
                'SELECT website, settings FROM organizations WHERE id = ?',
                [tournament.organization_id],
                (err, row) => {
                  if (err) reject(err);
                  else resolve(row);
                }
              );
            });
            
            if (org) {
              // Check organization settings for public URL or custom domain
              if (org.settings) {
                try {
                  const orgSettings = typeof org.settings === 'string' 
                    ? JSON.parse(org.settings) 
                    : org.settings;
                  
                  if (orgSettings?.advanced?.customDomain) {
                    baseUrl = `https://${orgSettings.advanced.customDomain}`;
                    baseUrl = baseUrl.replace(/\/$/, '');
                  } else if (orgSettings?.seo?.canonicalUrl) {
                    baseUrl = orgSettings.seo.canonicalUrl;
                    baseUrl = baseUrl.replace(/\/$/, '');
                  }
                } catch (e) {
                  console.warn('Error parsing organization settings:', e);
                }
              }
              
              // Fall back to organization website if available
              if (baseUrl === `${req.protocol}://${req.get('host')}` && org.website) {
                baseUrl = org.website;
                baseUrl = baseUrl.replace(/\/$/, '');
              }
            }
          } catch (error) {
            console.warn('Error fetching organization for base URL:', error);
          }
        }
        
        // Use request host for API calls (actual server), baseUrl for link generation (organization URL if set)
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        try {
          const result = await OnlineGameService.createGameForPairing(pairing, tournament, baseUrl, serverUrl);
          
          if (result.success) {
            res.json({
              success: true,
              message: 'Game created successfully',
              gameId: result.gameId,
              whiteLink: result.whiteLink,
              blackLink: result.blackLink,
              pairingId: result.pairingId
            });
          } else {
            res.status(500).json({
              success: false,
              error: result.error || 'Failed to create game'
            });
          }
        } catch (error) {
          console.error('Error creating game for pairing:', error);
          res.status(500).json({
            success: false,
            error: error.message || 'Failed to create game'
          });
        }
      });
    });
  } catch (error) {
    console.error('Error in create-for-pairing:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Verify game password
router.post('/verify-password', async (req, res) => {
  console.log('[verify-password] Request received:', {
    roomCode: req.body.roomCode,
    playerColor: req.body.playerColor,
    hasPassword: !!req.body.password,
    timestamp: new Date().toISOString()
  });

  const { roomCode, password, playerColor } = req.body;

  if (!roomCode || !playerColor) {
    console.log('[verify-password] Missing required fields');
    return res.status(400).json({
      success: false,
      error: 'roomCode and playerColor are required'
    });
  }

  if (playerColor !== 'white' && playerColor !== 'black') {
    console.log('[verify-password] Invalid playerColor:', playerColor);
    return res.status(400).json({
      success: false,
      error: 'playerColor must be "white" or "black"'
    });
  }

  try {
    const chessRoomsService = require('../services/chessRooms');
    const normalizedRoomCode = roomCode.toUpperCase();
    console.log('[verify-password] Looking up room:', normalizedRoomCode);
    
    const room = await chessRoomsService.getRoom(normalizedRoomCode);

    if (!room) {
      console.log('[verify-password] Room not found:', normalizedRoomCode);
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    console.log('[verify-password] Room found, checking password for:', playerColor);
    const expectedPassword = room.passwords?.[playerColor];

    if (!expectedPassword) {
      // No password required for this player
      console.log('[verify-password] No password required');
      return res.json({
        success: true,
        verified: true,
        passwordRequired: false
      });
    }

    // Password is required
    if (!password) {
      console.log('[verify-password] Password required but not provided');
      return res.json({
        success: true,
        verified: false,
        passwordRequired: true
      });
    }

    // Normalize password comparison (case-insensitive, trimmed)
    const normalizedInput = password.trim().toLowerCase();
    const normalizedExpected = expectedPassword.trim().toLowerCase();

    const verified = normalizedInput === normalizedExpected;
    console.log('[verify-password] Password verification result:', verified);

    return res.json({
      success: true,
      verified,
      passwordRequired: true
    });
  } catch (error) {
    console.error('[verify-password] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify password',
      message: error.message
    });
  }
});

// Update pairing result when game ends
router.post('/update-result', (req, res) => {
  const { gameId, result } = req.body;

  if (!gameId || !result) {
    return res.status(400).json({
      success: false,
      error: 'gameId and result are required'
    });
  }

  // Convert result string to standard chess notation
  let pairingResult = null;
  
  if (result.includes('White wins') || result.includes('Black wins by resignation') || result.includes('Black wins on time')) {
    pairingResult = '1-0'; // White wins
  } else if (result.includes('Black wins') || result.includes('White wins by resignation') || result.includes('White wins on time')) {
    pairingResult = '0-1'; // Black wins
  } else if (result.includes('Draw')) {
    pairingResult = '1/2-1/2'; // Draw
  }

  if (!pairingResult) {
    return res.status(400).json({
      success: false,
      error: 'Invalid result format. Expected game result string.'
    });
  }

  // Find pairing by game_id and update result
  db.get('SELECT * FROM pairings WHERE game_id = ?', [gameId], (err, pairing) => {
    if (err) {
      console.error('Error finding pairing:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to find pairing'
      });
    }

    if (!pairing) {
      return res.status(404).json({
        success: false,
        error: 'Pairing not found for this game'
      });
    }

    // Update pairing result
    db.run(
      'UPDATE pairings SET result = ? WHERE game_id = ?',
      [pairingResult, gameId],
      function(updateErr) {
        if (updateErr) {
          console.error('Error updating pairing result:', updateErr);
          return res.status(500).json({
            success: false,
            error: 'Failed to update pairing result'
          });
        }

        console.log(`[Game Result] Updated pairing ${pairing.id} with result ${pairingResult} from game ${gameId}`);

        // Also update results table if needed
        // This ensures standings are calculated correctly
        res.json({
          success: true,
          message: 'Pairing result updated successfully',
          pairingId: pairing.id,
          result: pairingResult
        });
      }
    );
  });
});

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

// Start all clocks for games in a tournament round
router.post('/start-all-clocks', async (req, res) => {
  const { tournamentId, round } = req.body;

  if (!tournamentId || round === undefined) {
    return res.status(400).json({
      success: false,
      error: 'tournamentId and round are required'
    });
  }

  try {
    const chessRoomsService = require('../services/chessRooms');
    
    // Get all games for this round from online_games table
    const gamesFromTable = await new Promise((resolve, reject) => {
      db.all(
        `SELECT room_code FROM online_games WHERE tournament_id = ? AND round = ?`,
        [tournamentId, round],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Also get games from pairings table (game_id stored there)
    const gamesFromPairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT game_id as room_code FROM pairings 
         WHERE tournament_id = ? AND round = ? AND game_id IS NOT NULL AND game_id != ''`,
        [tournamentId, round],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Combine and deduplicate room codes
    const allRoomCodes = new Set();
    gamesFromTable.forEach((g) => {
      if (g.room_code) allRoomCodes.add(g.room_code);
    });
    gamesFromPairings.forEach((g) => {
      if (g.room_code) allRoomCodes.add(g.room_code);
    });

    const games = Array.from(allRoomCodes).map(roomCode => ({ room_code: roomCode }));

    if (games.length === 0) {
      return res.json({
        success: true,
        message: 'No games found for this round',
        started: 0,
        total: 0
      });
    }

    let startedCount = 0;
    const errors = [];

    // Start clock for each game
    for (const game of games) {
      if (!game.room_code) continue;

      try {
        const room = await chessRoomsService.getRoom(game.room_code);
        if (room && room.clock) {
          // Initialize clock if not already running
          if (!room.clock.isRunning) {
            room.clock.isRunning = true;
            room.clock.lastUpdate = Date.now();
            
            // If delay is configured, start delay period for white
            if (room.clock.delayMs && room.clock.delayMs > 0) {
              room.clock.delayStartTime = Date.now();
            }
            
            await chessRoomsService.setRoom(game.room_code, room);
            startedCount++;
          }
        } else if (room && !room.clock) {
          // Room exists but clock not initialized - initialize it
          if (room.options && room.options.timeControls) {
            const OnlineGameService = require('../services/onlineGameService');
            const parsed = OnlineGameService.parseTimeControl(room.options.timeControls);
            const minutes = parsed.minutes || 3;
            const increment = parsed.increment || 2;
            const delay = parsed.delay || 0;
            const initialTimeMs = minutes * 60 * 1000;

            room.clock = {
              blackTimeMs: initialTimeMs,
              whiteTimeMs: initialTimeMs,
              activeColor: 'white',
              lastUpdate: Date.now(),
              isRunning: true,
              incrementMs: increment * 1000,
              delayMs: delay * 1000,
              delayStartTime: delay > 0 ? Date.now() : null
            };
            
            await chessRoomsService.setRoom(game.room_code, room);
            startedCount++;
          }
        }
      } catch (error) {
        console.error(`Error starting clock for room ${game.room_code}:`, error);
        errors.push(game.room_code);
      }
    }

    res.json({
      success: true,
      message: `Started clocks for ${startedCount} of ${games.length} games`,
      started: startedCount,
      total: games.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error starting all clocks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start clocks',
      details: error.message
    });
  }
});

module.exports = router;

