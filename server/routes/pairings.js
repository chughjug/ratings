const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { generateSwissPairings, generateTeamSwissPairings, generateTeamRoundRobinPairings, validatePairings } = require('../utils/pairingAlgorithm');
const { calculateTournamentTiebreakers, getDefaultTiebreakerOrder } = require('../utils/tiebreakers');
const roundRobinService = require('../services/roundRobinService');
const teamService = require('../services/teamService');
const router = express.Router();

// Helper function to get previous team pairings
async function getPreviousTeamPairings(tournamentId, round) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT team_id, opponent_team_id, round 
       FROM team_results 
       WHERE tournament_id = ? AND round < ? AND opponent_team_id IS NOT NULL`,
      [tournamentId, round],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// Get pairings for a tournament round
router.get('/tournament/:tournamentId/round/:round', async (req, res) => {
  const { tournamentId, round } = req.params;
  const { display_format } = req.query; // Support different display formats
  
  try {
    // Get tournament format to determine pairing type
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

    if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin') {
      // Get team pairings
      db.all(
        `SELECT tr.*, 
                t1.name as team_name,
                t2.name as opponent_team_name
         FROM team_results tr
         LEFT JOIN teams t1 ON tr.team_id = t1.id
         LEFT JOIN teams t2 ON tr.opponent_team_id = t2.id
         WHERE tr.tournament_id = ? AND tr.round = ?
         ORDER BY tr.board`,
        [tournamentId, round],
        (err, rows) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          const formattedRows = rows.map(row => ({
            ...row,
            board_display: `Board ${row.board}`,
            team_display: row.team_name || 'BYE',
            opponent_display: row.opponent_team_name || 'BYE',
            is_bye: !row.opponent_team_id
          }));
          
          res.json(formattedRows);
        }
      );
    } else {
      // Get individual pairings
      db.all(
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
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          // Format response based on display format
          const formattedRows = rows.map(row => ({
            ...row,
            board_display: `Board ${row.board}`,
            white_display: formatPlayerDisplay(row.white_name, row.white_rating, row.white_uscf_id, display_format),
            black_display: formatPlayerDisplay(row.black_name, row.black_rating, row.black_uscf_id, display_format)
          }));
          
          res.json(formattedRows);
        }
      );
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to format player display based on format preference
function formatPlayerDisplay(name, rating, uscfId, format) {
  if (!name) return 'TBD';
  
  let display = name;
  
  if (format === 'compact') {
    if (rating) display += ` (${rating})`;
  } else if (format === 'detailed') {
    if (rating) display += ` - ${rating}`;
    if (uscfId) display += ` [${uscfId}]`;
  } else {
    // Default format
    if (rating) display += ` (${rating})`;
  }
  
  return display;
}

// Generate pairings for a round
router.post('/generate', async (req, res) => {
  const { tournamentId, round } = req.body;

  try {
    // Get tournament info
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

    // Get players
    const players = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? AND status = "active" ORDER BY name',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get inactive rounds for this tournament
    const inactiveRounds = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM player_inactive_rounds WHERE tournament_id = ?',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (players.length < 2) {
      res.status(400).json({ error: 'Need at least 2 players to generate pairings' });
      return;
    }

    let pairings = [];
    let validation = null;

    // Generate pairings based on tournament format
    if (tournament.format === 'round-robin') {
      // Generate round-robin pairings
      pairings = roundRobinService.generateRoundRobinPairings(players, parseInt(round));
    } else if (tournament.format === 'team-swiss') {
      // Team Swiss tournaments
      try {
        const teamStandings = await teamService.calculateTeamStandings(db, tournamentId);
        const previousTeamPairings = await getPreviousTeamPairings(tournamentId, parseInt(round));
        pairings = generateTeamSwissPairings(teamStandings, parseInt(round), previousTeamPairings, tournamentSettings);
      } catch (error) {
        console.error('Error generating team Swiss pairings:', error);
        res.status(500).json({ error: 'Failed to generate team pairings' });
        return;
      }
    } else if (tournament.format === 'team-round-robin') {
      // Team round-robin tournaments
      try {
        const teamStandings = await teamService.calculateTeamStandings(db, tournamentId);
        pairings = generateTeamRoundRobinPairings(teamStandings, parseInt(round));
      } catch (error) {
        console.error('Error generating team round-robin pairings:', error);
        res.status(500).json({ error: 'Failed to generate team pairings' });
        return;
      }
    } else {
      // Swiss system (default)
      // Get previous results for tie-breaking
      const results = await new Promise((resolve, reject) => {
        db.all(
          `SELECT player_id, SUM(points) as total_points, 
                  COUNT(*) as games_played
           FROM results 
           WHERE tournament_id = ? AND round < ?
           GROUP BY player_id`,
          [tournamentId, round],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Create standings
      const standings = players.map(player => {
        const result = results.find(r => r.player_id === player.id);
        return {
          ...player,
          points: result ? result.total_points : 0,
          games_played: result ? result.games_played : 0
        };
      });

      // Get previous pairings for this tournament to avoid repeat pairings
      const previousPairings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT white_player_id, black_player_id, section FROM pairings 
           WHERE tournament_id = ? AND round < ?`,
          [tournamentId, round],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Get color history for all players
      const colorHistory = await new Promise((resolve, reject) => {
        db.all(
          `SELECT player_id, 
                  SUM(CASE WHEN color = 'white' THEN 1 ELSE 0 END) as white_games,
                  SUM(CASE WHEN color = 'black' THEN 1 ELSE 0 END) as black_games
           FROM results 
           WHERE tournament_id = ? AND round < ?
           GROUP BY player_id`,
          [tournamentId, round],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            
            const history = {};
            rows.forEach(row => {
              // Positive means more white games, negative means more black games
              history[row.player_id] = row.white_games - row.black_games;
            });
            resolve(history);
          }
        );
      });

      // Get team information for individual tournaments with teams
      const teamInfo = await new Promise((resolve, reject) => {
        db.all(
          `SELECT tm.player_id, tm.team_id, t.name as team_name
           FROM team_members tm
           JOIN teams t ON tm.team_id = t.id
           WHERE t.tournament_id = ?`,
          [tournamentId],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            
            const teamMap = {};
            rows.forEach(row => {
              teamMap[row.player_id] = {
                team_id: row.team_id,
                team_name: row.team_name
              };
            });
            resolve(teamMap);
          }
        );
      });

      // Generate pairings
      console.log('Generating pairings for round', round, 'with', standings.length, 'players');
      console.log('Sections found:', [...new Set(standings.map(p => p.section || 'Open'))]);
      pairings = generateSwissPairings(standings, round, inactiveRounds, previousPairings, colorHistory, tournament, teamInfo);
      console.log('Generated', pairings.length, 'pairings across', [...new Set(pairings.map(p => p.section))], 'sections');

      // Validate pairings
      validation = validatePairings(pairings, standings, round, previousPairings, colorHistory);
    }

    // Clear existing pairings for this round before generating new ones
    if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin') {
      // Clear existing team pairings for this round
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM team_results WHERE tournament_id = ? AND round = ?',
          [tournamentId, round],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      // Save team pairings to team_results table
      const stmt = db.prepare(`
        INSERT INTO team_results (id, tournament_id, round, team_id, opponent_team_id, board)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      pairings.forEach((pairing) => {
        const id = uuidv4();
        stmt.run([
          id,
          tournamentId,
          round,
          pairing.team_id,
          pairing.opponent_team_id,
          pairing.board
        ]);
      });

      stmt.finalize((err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ 
          message: 'Team pairings generated successfully',
          pairings: pairings.map((p) => ({
            board: p.board,
            team_id: p.team_id,
            opponent_team_id: p.opponent_team_id,
            is_bye: p.is_bye
          })),
          validation: null,
          pairing_type: 'team'
        });
      });
    } else {
      // Clear existing individual pairings for this round
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM pairings WHERE tournament_id = ? AND round = ?',
          [tournamentId, round],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      // Save individual pairings to pairings table
      const stmt = db.prepare(`
        INSERT INTO pairings (id, tournament_id, round, board, white_player_id, black_player_id, section)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      pairings.forEach((pairing) => {
        const id = uuidv4();
        stmt.run([
          id,
          tournamentId,
          round,
          pairing.board,
          pairing.white_player_id,
          pairing.black_player_id,
          pairing.section
        ]);
      });

      stmt.finalize((err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ 
          message: 'Pairings generated successfully',
          pairings: pairings.map((p) => ({
            board: p.board,
            white_player_id: p.white_player_id,
            black_player_id: p.black_player_id,
            section: p.section
          })),
          validation: tournament.format === 'swiss' ? validation : null,
          pairing_type: tournament.settings ? JSON.parse(tournament.settings).pairing_type || 'standard' : 'standard'
        });
      });
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update pairing result
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

    // Save results to results table for both players
    if (pairing.white_player_id) {
      await new Promise((resolve, reject) => {
        const resultId = uuidv4();
        db.run(
          `INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [resultId, pairing.tournament_id, pairing.white_player_id, pairing.round, 
           pairing.black_player_id, 'white', result, whitePoints],
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
          `INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [resultId, pairing.tournament_id, pairing.black_player_id, pairing.round, 
           pairing.white_player_id, 'black', result, blackPoints],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({ message: 'Result updated successfully' });
  } catch (error) {
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

// Check if round is complete and move to next round
router.post('/tournament/:tournamentId/round/:round/complete', async (req, res) => {
  const { tournamentId, round } = req.params;
  const roundNum = parseInt(round);

  try {
    // Check if all pairings for this round have results, grouped by section
    const incompletePairingsBySection = await new Promise((resolve, reject) => {
      db.all(
        `SELECT section, COUNT(*) as count FROM pairings 
         WHERE tournament_id = ? AND round = ? AND result IS NULL
         GROUP BY section`,
        [tournamentId, roundNum],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (incompletePairingsBySection.length > 0) {
      const totalIncomplete = incompletePairingsBySection.reduce((sum, row) => sum + row.count, 0);
      const sectionDetails = incompletePairingsBySection.map(row => 
        `${row.section || 'Open'}: ${row.count} game${row.count !== 1 ? 's' : ''}`
      ).join(', ');
      
      res.status(400).json({ 
        error: `Round ${roundNum} is not complete. ${totalIncomplete} games still need results (${sectionDetails}).` 
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

    // Update tournament status if this was the last round
    if (roundNum >= tournament.rounds) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE tournaments SET status = ? WHERE id = ?',
          ['completed', tournamentId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      res.json({ 
        message: `Round ${roundNum} completed! Tournament finished.`,
        tournamentCompleted: true,
        nextRound: null
      });
    } else {
      res.json({ 
        message: `Round ${roundNum} completed! Ready for round ${roundNum + 1}.`,
        tournamentCompleted: false,
        nextRound: roundNum + 1
      });
    }
  } catch (error) {
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

    // Sort by score, then by tiebreakers in order
    standingsWithTiebreakers.sort((a, b) => {
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

    // Add rank to each player
    standingsWithTiebreakers.forEach((player, index) => {
      player.rank = index + 1;
    });

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
          const { calculatePrizeDistribution } = require('../services/prizeCalculator');
          const prizeDistributions = calculatePrizeDistribution(
            standingsWithTiebreakers,
            prizes.map(prize => ({
              ...prize,
              conditions: prize.conditions ? JSON.parse(prize.conditions) : [],
              amount: prize.amount ? parseFloat(prize.amount) : undefined
            })),
            tournament.settings ? JSON.parse(tournament.settings) : {}
          );

          // Add prize information to standings
          const prizeMap = {};
          prizeDistributions.forEach(distribution => {
            prizeMap[distribution.player_id] = distribution.prize_amount ? `$${distribution.prize_amount}` : distribution.prize_name;
          });

          standingsWithTiebreakers.forEach(player => {
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

      // Group round results by player
      const roundResultsByPlayer = {};
      roundResults.forEach(result => {
        if (!roundResultsByPlayer[result.player_id]) {
          roundResultsByPlayer[result.player_id] = {};
        }
        roundResultsByPlayer[result.player_id][result.round] = {
          result: result.result,
          opponent_name: result.opponent_name,
          opponent_rating: result.opponent_rating,
          points: result.points,
          color: result.color,
          board: result.board
        };
      });

      // Add round results to standings
      standingsWithTiebreakers.forEach(player => {
        player.roundResults = roundResultsByPlayer[player.id] || {};
      });
    }

    res.json(standingsWithTiebreakers);
  } catch (error) {
    console.error('Error calculating standings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pairings with customizable display options
router.get('/tournament/:tournamentId/display', (req, res) => {
  const { tournamentId } = req.params;
  const { 
    round, 
    display_format = 'default',
    show_ratings = 'true',
    show_uscf_ids = 'false',
    board_numbers = 'true'
  } = req.query;
  
  let query = `
    SELECT p.*, 
           wp.name as white_name, wp.rating as white_rating, wp.uscf_id as white_uscf_id,
           bp.name as black_name, bp.rating as black_rating, bp.uscf_id as black_uscf_id
    FROM pairings p
    LEFT JOIN players wp ON p.white_player_id = wp.id
    LEFT JOIN players bp ON p.black_player_id = bp.id
    WHERE p.tournament_id = ?
  `;
  
  const params = [tournamentId];
  
  if (round) {
    query += ' AND p.round = ?';
    params.push(round);
  } else {
    query += ' AND p.round = (SELECT MAX(round) FROM pairings WHERE tournament_id = ?)';
    params.push(tournamentId);
  }
  
  query += ' ORDER BY p.section, p.board';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const formattedRows = rows.map(row => {
      const formatted = {
        id: row.id,
        tournament_id: row.tournament_id,
        round: row.round,
        board: row.board,
        white_player_id: row.white_player_id,
        black_player_id: row.black_player_id,
        result: row.result,
        created_at: row.created_at
      };
      
      // Add display formatting based on options
      if (board_numbers === 'true') {
        formatted.board_display = `Board ${row.board}`;
      } else {
        formatted.board_display = row.board;
      }
      
      // Format white player
      formatted.white_display = formatPlayerForDisplay(
        row.white_name, 
        row.white_rating, 
        row.white_uscf_id, 
        show_ratings === 'true',
        show_uscf_ids === 'true',
        display_format
      );
      
      // Format black player
      formatted.black_display = formatPlayerForDisplay(
        row.black_name, 
        row.black_rating, 
        row.black_uscf_id, 
        show_ratings === 'true',
        show_uscf_ids === 'true',
        display_format
      );
      
      return formatted;
    });
    
    res.json({
      pairings: formattedRows,
      display_options: {
        format: display_format,
        show_ratings: show_ratings === 'true',
        show_uscf_ids: show_uscf_ids === 'true',
        board_numbers: board_numbers === 'true'
      }
    });
  });
});

// Helper function to format player display with customizable options
function formatPlayerForDisplay(name, rating, uscfId, showRatings, showUscfIds, format) {
  if (!name) return 'TBD';
  
  let display = name;
  
  if (format === 'compact') {
    if (showRatings && rating) display += ` (${rating})`;
  } else if (format === 'detailed') {
    if (showRatings && rating) display += ` - ${rating}`;
    if (showUscfIds && uscfId) display += ` [${uscfId}]`;
  } else {
    // Default format
    if (showRatings && rating) display += ` (${rating})`;
    if (showUscfIds && uscfId) display += ` [${uscfId}]`;
  }
  
  return display;
}

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
      const result = await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM team_results WHERE tournament_id = ? AND round = ?',
          [tournamentId, round],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });
      deletedCount = result;
    } else {
      // Clear individual pairings
      const result = await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM pairings WHERE tournament_id = ? AND round = ?',
          [tournamentId, round],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });
      deletedCount = result;
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

module.exports = router;
