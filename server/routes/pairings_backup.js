const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { generateTeamRoundRobinPairings, generateIndividualSwissWithTeamScoring, validatePairings } = require('../utils/pairingAlgorithm');
const { createPairingSystem, getAvailablePairingSystems, getAvailableTiebreakers } = require('../utils/enhancedPairingSystem');
const { calculateTournamentTiebreakers, getDefaultTiebreakerOrder } = require('../utils/tiebreakers');
const roundRobinService = require('../services/roundRobinService');
const teamService = require('../services/teamService');
const { autoAssignPrizesOnRoundCompletion } = require('../services/prizeService');
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

    console.log(`Fetching pairings for tournament ${tournamentId}, round ${round}, format: ${tournament.format}`);

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
            console.error('Error fetching team pairings:', err);
            res.status(500).json({ error: err.message });
            return;
          }
          
          console.log(`Found ${rows.length} team pairings for round ${round}`);
          
          const formattedRows = rows.map(row => ({
            ...row,
            board_display: `Board ${row.board}`,
            team_display: row.team_name || '1-0F',
            opponent_display: row.opponent_team_name || '1-0F',
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
            console.error('Error fetching individual pairings:', err);
            res.status(500).json({ error: err.message });
            return;
          }
          
          console.log(`Found ${rows.length} individual pairings for round ${round}`);
          
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
    console.error('Error in get pairings route:', error);
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

    const currentRound = parseInt(round);
    
    // Validate round number
    if (currentRound < 1 || currentRound > tournament.rounds) {
      res.status(400).json({ 
        error: `Invalid round number. Round must be between 1 and ${tournament.rounds}` 
      });
      return;
    }

    // Check if this round already has pairings
    const existingPairings = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM pairings WHERE tournament_id = ? AND round = ?',
        [tournamentId, currentRound],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    if (existingPairings > 0) {
      res.status(400).json({ 
        error: `Round ${currentRound} already has pairings. Use the regenerate endpoint to create new pairings.`,
        existingPairings: existingPairings
      });
      return;
    }

    // Check if previous round is complete before allowing next round generation
    if (currentRound > 1) {
      const previousRound = currentRound - 1;
      
      // Check if previous round has incomplete pairings
      const incompletePairings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT section, COUNT(*) as count FROM pairings 
           WHERE tournament_id = ? AND round = ? AND result IS NULL
           GROUP BY section`,
          [tournamentId, previousRound],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      if (incompletePairings.length > 0) {
        const totalIncomplete = incompletePairings.reduce((sum, row) => sum + row.count, 0);
        const sectionDetails = incompletePairings.map(row => 
          `${row.section || 'Open'}: ${row.count} game${row.count !== 1 ? 's' : ''}`
        ).join(', ');
        
        res.status(400).json({ 
          error: `Cannot generate Round ${currentRound} pairings. Round ${previousRound} is not complete. ${totalIncomplete} games still need results (${sectionDetails}). Please complete Round ${previousRound} before generating Round ${currentRound} pairings.`,
          incompleteSections: incompletePairings.map(row => ({
            section: row.section || 'Open',
            incompleteCount: row.count
          }))
        });
        return;
      }
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
      // Team Swiss tournaments - use enhanced system
      try {
        const teamStandings = await teamService.calculateTeamStandings(db, tournamentId);
        const previousTeamPairings = await getPreviousTeamPairings(tournamentId, parseInt(round));
        
        // Convert team standings to player format for enhanced system
        const teamPlayers = teamStandings.map(team => ({
          id: team.team_id,
          name: team.team_name,
          points: team.points,
          rating: team.average_rating,
          section: 'Teams',
          isBye: false
        }));
        
        const enhancedSystem = createPairingSystem(teamPlayers, {
          pairingSystem: 'fide_dutch',
          tiebreakerOrder: ['buchholz', 'sonneborn_berger', 'direct_encounter'],
          colorBalanceRules: 'fide',
          accelerationSettings: { enabled: false },
          byeSettings: { fullPointBye: true, avoidUnratedDropping: true }
        });
        
        enhancedSystem.previousPairings = previousTeamPairings;
        enhancedSystem.round = parseInt(round);
        
        pairings = enhancedSystem.generatePairings();
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
      // Get previous results for tie-breaking (with proper deduplication)
      const results = await new Promise((resolve, reject) => {
        db.all(
          `SELECT player_id, SUM(points) as total_points, 
                  COUNT(DISTINCT round) as games_played
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
          `SELECT white_player_id, black_player_id, section, result, round FROM pairings 
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
          `SELECT player_id, color, round
           FROM results 
           WHERE tournament_id = ? AND round < ?
           ORDER BY player_id, round`,
          [tournamentId, round],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            
            const history = {};
            rows.forEach(row => {
              if (!history[row.player_id]) {
                history[row.player_id] = [];
              }
              // Convert color to numeric value: white = 1, black = -1
              history[row.player_id].push(row.color === 'white' ? 1 : -1);
            });
            resolve(history);
          }
        );
      });

      // Get team information for individual tournaments with teams
      // Note: team_members table was removed in migration, so we'll use empty team info
      const teamInfo = {};

      // Generate pairings
      console.log('Generating pairings for round', round, 'with', standings.length, 'players');
      console.log('Sections found:', [...new Set(standings.map(p => p.section || 'Open'))]);
      
      // Check if this is an individual tournament with team scoring
      const hasTeams = Object.keys(teamInfo).length > 0;
      const isIndividualWithTeams = tournament.format === 'swiss' && hasTeams;
      
      if (isIndividualWithTeams) {
        console.log('Generating individual Swiss pairings with team-based scoring');
        pairings = generateIndividualSwissWithTeamScoring(standings, round, inactiveRounds, previousPairings, colorHistory, tournament, teamInfo);
      } else {
        console.log('Generating enhanced Swiss pairings with FIDE Dutch system');
        // Use enhanced pairing system for all individual tournaments
        // Group players by section and generate pairings for each section
        const sectionGroups = {};
        standings.forEach(player => {
          const section = player.section || 'Open';
          if (!sectionGroups[section]) {
            sectionGroups[section] = [];
          }
          sectionGroups[section].push(player);
        });
        
        pairings = [];
        let globalBoardNumber = 1;
        Object.keys(sectionGroups).forEach(sectionName => {
          const enhancedSystem = createPairingSystem(sectionGroups[sectionName], {
            pairingSystem: 'fide_dutch',
            tiebreakerOrder: ['buchholz', 'sonneborn_berger', 'direct_encounter'],
            colorBalanceRules: 'fide',
            accelerationSettings: { enabled: false },
            byeSettings: { fullPointBye: true, avoidUnratedDropping: true },
            section: sectionName
          });
          
          enhancedSystem.previousPairings = previousPairings.filter(p => p.section === sectionName);
          enhancedSystem.colorHistory = colorHistory;
          enhancedSystem.round = round;
          
          const sectionPairings = enhancedSystem.generatePairings();
          
          // Assign continuous board numbers across all sections
          sectionPairings.forEach(pairing => {
            pairing.board = globalBoardNumber++;
          });
          
          pairings.push(...sectionPairings);
        });
      }
      
      console.log('Generated', pairings.length, 'pairings across', [...new Set(pairings.map(p => p.section))], 'sections');

      // Validate pairings
      validation = validatePairings(pairings, standings, round, previousPairings, colorHistory);
    }

    // Store pairings for this round (no clearing needed since we validated no existing pairings)
    if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin') {
      // Store team pairings for this round
      
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
      // Store individual pairings for this round (no clearing needed since we validated no existing pairings)
      
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

// Regenerate pairings for a round (clears existing pairings first)
router.post('/regenerate', async (req, res) => {
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

    const currentRound = parseInt(round);
    
    // Validate round number
    if (currentRound < 1 || currentRound > tournament.rounds) {
      res.status(400).json({ 
        error: `Invalid round number. Round must be between 1 and ${tournament.rounds}` 
      });
      return;
    }

    // Check if previous round is complete before allowing regeneration
    if (currentRound > 1) {
      const previousRound = currentRound - 1;
      
      // Check if previous round has incomplete pairings
      const incompletePairings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT section, COUNT(*) as count FROM pairings 
           WHERE tournament_id = ? AND round = ? AND result IS NULL
           GROUP BY section`,
          [tournamentId, previousRound],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      if (incompletePairings.length > 0) {
        const totalIncomplete = incompletePairings.reduce((sum, row) => sum + row.count, 0);
        const sectionDetails = incompletePairings.map(row => 
          `${row.section || 'Open'}: ${row.count} game${row.count !== 1 ? 's' : ''}`
        ).join(', ');
        
        res.status(400).json({ 
          error: `Cannot regenerate Round ${currentRound} pairings. Round ${previousRound} is not complete. ${totalIncomplete} games still need results (${sectionDetails}). Please complete Round ${previousRound} before regenerating Round ${currentRound} pairings.`,
          incompleteSections: incompletePairings.map(row => ({
            section: row.section || 'Open',
            incompleteCount: row.count
          }))
        });
        return;
      }
    }

    // Clear existing pairings for this round
    if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin') {
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
    } else {
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
    }

    // Now generate new pairings using the same logic as the generate endpoint
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

    // Generate pairings based on tournament format (same logic as generate endpoint)
    if (tournament.format === 'round-robin') {
      pairings = roundRobinService.generateRoundRobinPairings(players, currentRound);
    } else if (tournament.format === 'team-swiss') {
      // Team Swiss tournaments - use enhanced system
      try {
        const teamStandings = await teamService.calculateTeamStandings(db, tournamentId);
        const previousTeamPairings = await getPreviousTeamPairings(tournamentId, currentRound);
        
        const teamPlayers = teamStandings.map(team => ({
          id: team.team_id,
          name: team.team_name,
          points: team.points,
          rating: team.average_rating,
          section: 'Teams',
          isBye: false
        }));
        
        const enhancedSystem = createPairingSystem(teamPlayers, {
          pairingSystem: 'fide_dutch',
          tiebreakerOrder: ['buchholz', 'sonneborn_berger', 'direct_encounter'],
          colorBalanceRules: 'fide',
          accelerationSettings: { enabled: false },
          byeSettings: { fullPointBye: true, avoidUnratedDropping: true }
        });
        
        enhancedSystem.previousPairings = previousTeamPairings;
        enhancedSystem.round = currentRound;
        
        pairings = enhancedSystem.generatePairings();
      } catch (error) {
        console.error('Error generating team Swiss pairings:', error);
        res.status(500).json({ error: 'Failed to generate team pairings' });
        return;
      }
    } else if (tournament.format === 'team-round-robin') {
      try {
        const teamStandings = await teamService.calculateTeamStandings(db, tournamentId);
        pairings = generateTeamRoundRobinPairings(teamStandings, currentRound);
      } catch (error) {
        console.error('Error generating team round-robin pairings:', error);
        res.status(500).json({ error: 'Failed to generate team pairings' });
        return;
      }
    } else {
      // Swiss system (default) - same logic as generate endpoint
      const results = await new Promise((resolve, reject) => {
        db.all(
          `SELECT player_id, SUM(points) as total_points, 
                  COUNT(DISTINCT round) as games_played
           FROM results 
           WHERE tournament_id = ? AND round < ?
           GROUP BY player_id`,
          [tournamentId, currentRound],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      const standings = players.map(player => {
        const result = results.find(r => r.player_id === player.id);
        return {
          ...player,
          points: result ? result.total_points : 0,
          games_played: result ? result.games_played : 0
        };
      });

      const previousPairings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT white_player_id, black_player_id, section, result, round FROM pairings 
           WHERE tournament_id = ? AND round < ?`,
          [tournamentId, currentRound],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      const colorHistory = await new Promise((resolve, reject) => {
        db.all(
          `SELECT player_id, color, round
           FROM results 
           WHERE tournament_id = ? AND round < ?
           ORDER BY player_id, round`,
          [tournamentId, currentRound],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            
            const history = {};
            rows.forEach(row => {
              if (!history[row.player_id]) {
                history[row.player_id] = [];
              }
              history[row.player_id].push(row.color === 'white' ? 1 : -1);
            });
            resolve(history);
          }
        );
      });

      const teamInfo = {};

      console.log('Regenerating pairings for round', currentRound, 'with', standings.length, 'players');
      console.log('Sections found:', [...new Set(standings.map(p => p.section || 'Open'))]);
      
      const hasTeams = Object.keys(teamInfo).length > 0;
      const isIndividualWithTeams = tournament.format === 'swiss' && hasTeams;
      
      if (isIndividualWithTeams) {
        console.log('Regenerating individual Swiss pairings with team-based scoring');
        pairings = generateIndividualSwissWithTeamScoring(standings, currentRound, inactiveRounds, previousPairings, colorHistory, tournament, teamInfo);
      } else {
        console.log('Regenerating enhanced Swiss pairings with FIDE Dutch system');
        const sectionGroups = {};
        standings.forEach(player => {
          const section = player.section || 'Open';
          if (!sectionGroups[section]) {
            sectionGroups[section] = [];
          }
          sectionGroups[section].push(player);
        });
        
        pairings = [];
        let globalBoardNumber = 1;
        Object.keys(sectionGroups).forEach(sectionName => {
          const enhancedSystem = createPairingSystem(sectionGroups[sectionName], {
            pairingSystem: 'fide_dutch',
            tiebreakerOrder: ['buchholz', 'sonneborn_berger', 'direct_encounter'],
            colorBalanceRules: 'fide',
            accelerationSettings: { enabled: false },
            byeSettings: { fullPointBye: true, avoidUnratedDropping: true },
            section: sectionName
          });
          
          enhancedSystem.previousPairings = previousPairings.filter(p => p.section === sectionName);
          enhancedSystem.colorHistory = colorHistory;
          enhancedSystem.round = currentRound;
          
          const sectionPairings = enhancedSystem.generatePairings();
          
          sectionPairings.forEach(pairing => {
            pairing.board = globalBoardNumber++;
          });
          
          pairings.push(...sectionPairings);
        });
      }
      
      console.log('Regenerated', pairings.length, 'pairings across', [...new Set(pairings.map(p => p.section))], 'sections');

      validation = validatePairings(pairings, standings, currentRound, previousPairings, colorHistory);
    }

    // Save the regenerated pairings
    if (tournament.format === 'team-swiss' || tournament.format === 'team-round-robin') {
      const stmt = db.prepare(`
        INSERT INTO team_results (id, tournament_id, round, team_id, opponent_team_id, board)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      pairings.forEach((pairing) => {
        const id = uuidv4();
        stmt.run([
          id,
          tournamentId,
          currentRound,
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
          message: 'Team pairings regenerated successfully',
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
      const stmt = db.prepare(`
        INSERT INTO pairings (id, tournament_id, round, board, white_player_id, black_player_id, section)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      pairings.forEach((pairing) => {
        const id = uuidv4();
        stmt.run([
          id,
          tournamentId,
          currentRound,
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
          message: 'Pairings regenerated successfully',
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

    // Auto-assign prizes if this is the final round
    try {
      await autoAssignPrizesOnRoundCompletion(pairing.tournament_id, pairing.round, db);
    } catch (prizeError) {
      console.error('Error auto-assigning prizes:', prizeError);
      // Don't fail the result submission if prize assignment fails
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

// Check round completion status for a specific tournament, round, and section
router.get('/tournament/:tournamentId/round/:round/status', async (req, res) => {
  const { tournamentId, round } = req.params;
  const { section } = req.query;
  const roundNum = parseInt(round);

  try {
    // Get tournament info first
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

    // Validate round number
    if (roundNum < 1 || roundNum > tournament.rounds) {
      res.status(400).json({ 
        error: `Invalid round number. Round must be between 1 and ${tournament.rounds}` 
      });
      return;
    }

    // Get all pairings for this round and section
    const pairings = await new Promise((resolve, reject) => {
      const query = section 
        ? `SELECT id, result, section FROM pairings WHERE tournament_id = ? AND round = ? AND section = ?`
        : `SELECT id, result, section FROM pairings WHERE tournament_id = ? AND round = ?`;
      
      const params = section ? [tournamentId, roundNum, section] : [tournamentId, roundNum];
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Calculate completion stats
    const totalPairings = pairings.length;
    const completedPairings = pairings.filter(p => p.result && p.result !== 'TBD').length;
    const incompletePairings = totalPairings - completedPairings;
    const completionPercentage = totalPairings > 0 ? Math.round((completedPairings / totalPairings) * 100) : 0;
    const isComplete = totalPairings > 0 && completedPairings === totalPairings;

    // Check if this round has any pairings at all
    const hasPairings = totalPairings > 0;

    // Check if next round can be generated
    const canGenerateNextRound = isComplete && roundNum < tournament.rounds;

    // Check if previous rounds are complete (for validation)
    let previousRoundsComplete = true;
    if (roundNum > 1) {
      const previousRound = roundNum - 1;
      const previousPairings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT COUNT(*) as total, SUM(CASE WHEN result IS NOT NULL THEN 1 ELSE 0 END) as completed
           FROM pairings WHERE tournament_id = ? AND round = ?`,
          [tournamentId, previousRound],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows[0]);
          }
        );
      });
      
      previousRoundsComplete = previousPairings.total === 0 || previousPairings.completed === previousPairings.total;
    }

    res.json({
      tournamentId,
      round: roundNum,
      section: section || 'all',
      totalPairings,
      completedPairings,
      incompletePairings,
      completionPercentage,
      isComplete,
      hasPairings,
      canGenerateNextRound,
      previousRoundsComplete,
      nextRound: canGenerateNextRound ? roundNum + 1 : null,
      isLastRound: roundNum >= tournament.rounds,
      tournamentRounds: tournament.rounds,
      validation: {
        roundExists: hasPairings,
        roundComplete: isComplete,
        previousRoundsComplete: previousRoundsComplete,
        canGenerate: canGenerateNextRound || (!hasPairings && previousRoundsComplete)
      }
    });
  } catch (error) {
    console.error('Error checking round status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if round is complete for a specific section and move to next round
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

// Generate pairings using Swiss system algorithm
router.post('/generate/swiss-system', async (req, res) => {
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

    // Check if previous round is complete before allowing next round generation
    const currentRound = parseInt(round);
    if (currentRound > 1) {
      const previousRound = currentRound - 1;
      
      // Check if previous round has incomplete pairings
      const incompletePairings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT section, COUNT(*) as count FROM pairings 
           WHERE tournament_id = ? AND round = ? AND result IS NULL
           GROUP BY section`,
          [tournamentId, previousRound],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      if (incompletePairings.length > 0) {
        const totalIncomplete = incompletePairings.reduce((sum, row) => sum + row.count, 0);
        const sectionDetails = incompletePairings.map(row => 
          `${row.section || 'Open'}: ${row.count} game${row.count !== 1 ? 's' : ''}`
        ).join(', ');
        
        res.status(400).json({ 
          error: `Cannot generate Round ${currentRound} pairings. Round ${previousRound} is not complete. ${totalIncomplete} games still need results (${sectionDetails}). Please complete Round ${previousRound} before generating Round ${currentRound} pairings.`,
          incompleteSections: incompletePairings.map(row => ({
            section: row.section || 'Open',
            incompleteCount: row.count
          }))
        });
        return;
      }
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
        `SELECT white_player_id, black_player_id, section, result FROM pairings 
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
    // Note: team_members table was removed in migration, so we'll use empty team info
    const teamInfo = {};

    // Generate pairings using Swiss system algorithm
    console.log('Generating pairings using Swiss system algorithm for round', round, 'with', standings.length, 'players');
    
    // Group players by section and generate pairings for each section
    const sectionGroups = {};
    standings.forEach(player => {
      const section = player.section || 'Open';
      if (!sectionGroups[section]) {
        sectionGroups[section] = [];
      }
      sectionGroups[section].push(player);
    });
    
    const pairings = [];
    Object.keys(sectionGroups).forEach(sectionName => {
      const enhancedSystem = createPairingSystem(sectionGroups[sectionName], {
        pairingSystem: 'fide_dutch',
        tiebreakerOrder: ['buchholz', 'sonneborn_berger', 'direct_encounter'],
        colorBalanceRules: 'fide',
        accelerationSettings: { enabled: false },
        byeSettings: { fullPointBye: true, avoidUnratedDropping: true }
      });
      
      enhancedSystem.previousPairings = previousPairings.filter(p => p.section === sectionName);
      enhancedSystem.colorHistory = colorHistory;
      enhancedSystem.round = round;
      
      const sectionPairings = enhancedSystem.generatePairings();
      
      // Each section gets its own independent board numbering starting from 1
      sectionPairings.forEach((pairing, index) => {
        pairing.board = index + 1;
      });
      
      pairings.push(...sectionPairings);
    });
    
    console.log('Generated', pairings.length, 'pairings across', [...new Set(pairings.map(p => p.section))], 'sections');

    // Clear existing pairings for this round before generating new ones
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
    
    // Save pairings to pairings table
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
        message: 'Swiss system pairings generated successfully',
        pairings: pairings.map((p) => ({
          board: p.board,
          white_player_id: p.white_player_id,
          black_player_id: p.black_player_id,
          section: p.section
        })),
        algorithm: 'swiss-system',
        sections: [...new Set(pairings.map(p => p.section))]
      });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate pairings for a specific section only - COMPLETELY INDEPENDENT
router.post('/generate/section', async (req, res) => {
  const { tournamentId, round, sectionName } = req.body;

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

    // Check if previous round is complete for this section before allowing next round generation
    const currentRound = parseInt(round);
    if (currentRound > 1) {
      const previousRound = currentRound - 1;
      
      // Check if previous round has incomplete pairings for this specific section
      const incompletePairings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT COUNT(*) as count FROM pairings 
           WHERE tournament_id = ? AND round = ? AND section = ? AND result IS NULL`,
          [tournamentId, previousRound, sectionName],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      if (incompletePairings.length > 0 && incompletePairings[0].count > 0) {
        const incompleteCount = incompletePairings[0].count;
        
        res.status(400).json({ 
          error: `Cannot generate Round ${currentRound} pairings for section "${sectionName}". Round ${previousRound} is not complete for this section. ${incompleteCount} game${incompleteCount !== 1 ? 's' : ''} still need${incompleteCount === 1 ? 's' : ''} results. Please complete Round ${previousRound} for section "${sectionName}" before generating Round ${currentRound} pairings.`,
          incompleteCount: incompleteCount,
          section: sectionName,
          previousRound: previousRound
        });
        return;
      }
    }

    // Get players for the specific section only
    const players = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? AND section = ? AND status = "active" ORDER BY name',
        [tournamentId, sectionName],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (players.length < 1) {
      res.status(400).json({ error: `No active players found in section "${sectionName}"` });
      return;
    }

    // Get inactive rounds for players in this section only
    const inactiveRounds = await new Promise((resolve, reject) => {
      db.all(
        'SELECT pir.* FROM player_inactive_rounds pir JOIN players p ON pir.player_id = p.id WHERE p.tournament_id = ? AND p.section = ?',
        [tournamentId, sectionName],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get previous results for tie-breaking (section-specific)
    const results = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.player_id, SUM(r.points) as total_points, COUNT(*) as games_played
         FROM results r 
         JOIN players p ON r.player_id = p.id
         WHERE p.tournament_id = ? AND p.section = ? AND r.round < ?
         GROUP BY r.player_id`,
        [tournamentId, sectionName, round],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Create standings for this section only
    const standings = players.map(player => {
      const result = results.find(r => r.player_id === player.id);
      return {
        ...player,
        points: result ? result.total_points : 0,
        games_played: result ? result.games_played : 0
      };
    });

    // Get previous pairings for this section only
    const previousPairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.white_player_id, p.black_player_id, p.section 
         FROM pairings p
         JOIN players wp ON p.white_player_id = wp.id
         JOIN players bp ON p.black_player_id = bp.id
         WHERE wp.tournament_id = ? AND wp.section = ? AND bp.section = ? AND p.round < ?`,
        [tournamentId, sectionName, sectionName, round],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get color history for players in this section only
    const colorHistory = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.player_id, 
                SUM(CASE WHEN r.color = 'white' THEN 1 ELSE 0 END) as white_games,
                SUM(CASE WHEN r.color = 'black' THEN 1 ELSE 0 END) as black_games
         FROM results r
         JOIN players p ON r.player_id = p.id
         WHERE p.tournament_id = ? AND p.section = ? AND r.round < ?
         GROUP BY r.player_id`,
        [tournamentId, sectionName, round],
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

    // Get team information for players in this section only
    // Note: team_members table was removed in migration, so we'll use empty team info
    const teamInfo = {};

    // Generate pairings for this section only using the independent section function
    console.log(`Generating independent pairings for section "${sectionName}" only with ${standings.length} players`);
    
    // Use the completely independent section pairing function
    const { generateSwissPairingsForSection } = require('../utils/pairingAlgorithm');
    const pairings = generateSwissPairingsForSection(
      standings,
      round,
      sectionName,
      inactiveRounds,
      previousPairings,
      colorHistory,
      tournament,
      teamInfo
    );
    
    console.log(`Generated ${pairings.length} independent pairings for section "${sectionName}"`);

    // Validate pairings (section-specific)
    const validation = validatePairings(pairings, standings, round, previousPairings, colorHistory);

    // Clear existing pairings for this section and round before generating new ones
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM pairings 
         WHERE tournament_id = ? AND round = ? AND section = ?`,
        [tournamentId, round, sectionName],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    // Save pairings for this section
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
        message: `Independent pairings generated successfully for section "${sectionName}"`,
        pairings: pairings.map((p) => ({
          board: p.board,
          white_player_id: p.white_player_id,
          black_player_id: p.black_player_id,
          section: p.section
        })),
        validation: tournament.format === 'swiss' ? validation : null,
        section: sectionName,
        independence: 'complete'
      });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available pairing systems
router.get('/systems', (req, res) => {
  try {
    const systems = getAvailablePairingSystems();
    res.json(systems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available tiebreaker systems
router.get('/tiebreakers', (req, res) => {
  try {
    const tiebreakers = getAvailableTiebreakers();
    res.json(tiebreakers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate pairings using enhanced pairing system
router.post('/generate/enhanced', async (req, res) => {
  const { tournamentId, round, pairingSystem, tiebreakerOrder, accelerationSettings, colorBalanceRules, byeSettings, section } = req.body;

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

    // Check if previous round is complete
    const currentRound = parseInt(round);
    if (currentRound > 1) {
      const previousRound = currentRound - 1;
      
      if (section) {
        // If generating for a specific section, only check that section
        const incompleteCount = await new Promise((resolve, reject) => {
          db.get(
            `SELECT COUNT(*) as count FROM pairings p
             WHERE p.tournament_id = ? AND p.round = ? AND p.section = ? 
             AND NOT EXISTS (
               SELECT 1 FROM results r 
               WHERE r.tournament_id = p.tournament_id 
               AND r.round = p.round 
               AND ((r.player_id = p.white_player_id AND r.opponent_id = p.black_player_id) 
                    OR (r.player_id = p.black_player_id AND r.opponent_id = p.white_player_id))
               AND r.result IS NOT NULL
             )`,
            [tournamentId, previousRound, section],
            (err, row) => {
              if (err) reject(err);
              else resolve(row.count);
            }
          );
        });

        if (incompleteCount > 0) {
          res.status(400).json({ 
            error: `Cannot generate Round ${currentRound} pairings for ${section} section. Round ${previousRound} is not complete for this section. ${incompleteCount} game${incompleteCount !== 1 ? 's' : ''} still need${incompleteCount === 1 ? 's' : ''} results.`,
            section: section,
            incompleteCount: incompleteCount
          });
          return;
        }
      } else {
        // If generating for all sections, check all sections
        const incompletePairings = await new Promise((resolve, reject) => {
          db.all(
            `SELECT p.section, COUNT(*) as count FROM pairings p
             WHERE p.tournament_id = ? AND p.round = ? 
             AND NOT EXISTS (
               SELECT 1 FROM results r 
               WHERE r.tournament_id = p.tournament_id 
               AND r.round = p.round 
               AND ((r.player_id = p.white_player_id AND r.opponent_id = p.black_player_id) 
                    OR (r.player_id = p.black_player_id AND r.opponent_id = p.white_player_id))
               AND r.result IS NOT NULL
             )
             GROUP BY p.section`,
            [tournamentId, previousRound],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        if (incompletePairings.length > 0) {
          const totalIncomplete = incompletePairings.reduce((sum, row) => sum + row.count, 0);
          const sectionDetails = incompletePairings.map(row => 
            `${row.section || 'Open'}: ${row.count} game${row.count !== 1 ? 's' : ''}`
          ).join(', ');
          
          res.status(400).json({ 
            error: `Cannot generate Round ${currentRound} pairings. Round ${previousRound} is not complete. ${totalIncomplete} games still need results (${sectionDetails}).`,
            incompleteSections: incompletePairings.map(row => ({
              section: row.section || 'Open',
              incompleteCount: row.count
            }))
          });
          return;
        }
      }
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

    if (players.length < 2) {
      res.status(400).json({ error: 'Need at least 2 players to generate pairings' });
      return;
    }

    // Get previous results for standings
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

    // Get previous pairings
    const previousPairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT white_player_id, black_player_id, section, result FROM pairings 
         WHERE tournament_id = ? AND round < ?`,
        [tournamentId, round],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get color history
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
            history[row.player_id] = row.white_games - row.black_games;
          });
          resolve(history);
        }
      );
    });

    // Group players by section
    const sectionGroups = {};
    standings.forEach(player => {
      const playerSection = player.section || 'Open';
      if (!sectionGroups[playerSection]) {
        sectionGroups[playerSection] = [];
      }
      sectionGroups[playerSection].push(player);
    });

    // If a specific section is requested, only process that section
    const sectionsToProcess = section ? [section] : Object.keys(sectionGroups);

    // Generate pairings for each section
    const allPairings = [];

    sectionsToProcess.forEach(sectionName => {
      // Skip if section doesn't exist or has no players
      if (!sectionGroups[sectionName] || sectionGroups[sectionName].length === 0) {
        return;
      }
      const sectionPlayers = sectionGroups[sectionName];
      
      // Create enhanced pairing system instance
      const pairingSystemInstance = createPairingSystem(sectionPlayers, {
        pairingSystem: pairingSystem || 'fide_dutch',
        tiebreakerOrder: tiebreakerOrder || ['buchholz', 'sonneborn_berger', 'direct_encounter'],
        colorBalanceRules: colorBalanceRules || 'fide',
        accelerationSettings: accelerationSettings || { enabled: false },
        byeSettings: byeSettings || { fullPointBye: true, avoidUnratedDropping: true },
        previousPairings: previousPairings.filter(p => p.section === sectionName),
        colorHistory,
        round: currentRound,
        section: sectionName
      });

      // Generate pairings
      const sectionPairings = pairingSystemInstance.generatePairings();
      
      // Each section gets its own independent board numbering starting from 1
      sectionPairings.forEach((pairing, index) => {
        pairing.board = index + 1;
      });
      
      allPairings.push(...sectionPairings);
    });

    // Clear existing pairings and results for this round
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

    // Also clear any existing results for this round to prevent duplicates
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM results WHERE tournament_id = ? AND round = ?',
        [tournamentId, round],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Save pairings
    const stmt = db.prepare(`
      INSERT INTO pairings (id, tournament_id, round, board, white_player_id, black_player_id, section)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    allPairings.forEach((pairing) => {
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
        message: 'Enhanced pairings generated successfully',
        pairings: allPairings.map((p) => ({
          board: p.board,
          white_player_id: p.white_player_id,
          black_player_id: p.black_player_id,
          section: p.section
        })),
        pairing_system: pairingSystem || 'fide_dutch',
        sections: [...new Set(allPairings.map(p => p.section))]
      });
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean up duplicate results for a tournament
router.post('/tournament/:tournamentId/cleanup-duplicates', async (req, res) => {
  const { tournamentId } = req.params;

  try {
    // Find and remove duplicate results (keeping the most recent one)
    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM results 
         WHERE id IN (
           SELECT r1.id FROM results r1
           INNER JOIN results r2 ON r1.tournament_id = r2.tournament_id 
             AND r1.player_id = r2.player_id 
             AND r1.round = r2.round
             AND r1.opponent_id = r2.opponent_id
             AND r1.id < r2.id
           WHERE r1.tournament_id = ?
         )`,
        [tournamentId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    res.json({ 
      message: 'Duplicate results cleaned up successfully',
      tournamentId: tournamentId
    });
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate tournament pairing integrity
router.get('/tournament/:tournamentId/validate', async (req, res) => {
  const { tournamentId } = req.params;

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

    // Get all rounds and their status
    const rounds = [];
    const issues = [];
    const warnings = [];

    for (let round = 1; round <= tournament.rounds; round++) {
      const roundData = await new Promise((resolve, reject) => {
        db.all(
          `SELECT 
            COUNT(*) as total_pairings,
            SUM(CASE WHEN result IS NOT NULL THEN 1 ELSE 0 END) as completed_pairings,
            COUNT(DISTINCT section) as sections
           FROM pairings 
           WHERE tournament_id = ? AND round = ?`,
          [tournamentId, round],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows[0]);
          }
        );
      });

      const isComplete = roundData.total_pairings > 0 && 
                        roundData.completed_pairings === roundData.total_pairings;
      const hasPairings = roundData.total_pairings > 0;

      rounds.push({
        round,
        totalPairings: roundData.total_pairings,
        completedPairings: roundData.completed_pairings,
        sections: roundData.sections,
        isComplete,
        hasPairings
      });

      // Check for issues
      if (round > 1 && !rounds[round - 2].isComplete && hasPairings) {
        issues.push(`Round ${round} has pairings but Round ${round - 1} is not complete`);
      }

      if (round > 1 && !rounds[round - 2].hasPairings && hasPairings) {
        issues.push(`Round ${round} has pairings but Round ${round - 1} has no pairings`);
      }
    }

    // Check for data consistency issues
    const duplicatePairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT white_player_id, black_player_id, round, COUNT(*) as count
         FROM pairings 
         WHERE tournament_id = ? AND white_player_id IS NOT NULL AND black_player_id IS NOT NULL
         GROUP BY white_player_id, black_player_id, round
         HAVING COUNT(*) > 1`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (duplicatePairings.length > 0) {
      issues.push(`Found ${duplicatePairings.length} duplicate pairings`);
    }

    // Check for players with multiple pairings in same round
    const multiplePairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT player_id, round, COUNT(*) as count
         FROM (
           SELECT white_player_id as player_id, round FROM pairings WHERE tournament_id = ? AND white_player_id IS NOT NULL
           UNION ALL
           SELECT black_player_id as player_id, round FROM pairings WHERE tournament_id = ? AND black_player_id IS NOT NULL
         ) 
         GROUP BY player_id, round
         HAVING COUNT(*) > 1`,
        [tournamentId, tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (multiplePairings.length > 0) {
      issues.push(`Found ${multiplePairings.length} players with multiple pairings in the same round`);
    }

    // Check for missing results
    const missingResults = await new Promise((resolve, reject) => {
      db.all(
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

    if (missingResults.length > 0) {
      warnings.push(`Found ${missingResults.length} sections with missing results`);
    }

    const isValid = issues.length === 0;
    const hasWarnings = warnings.length > 0;

    res.json({
      tournamentId,
      isValid,
      hasWarnings,
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
  } catch (error) {
    console.error('Error validating tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get round-specific standings (fixed calculation)
router.get('/tournament/:tournamentId/round/:round/standings', async (req, res) => {
  const { tournamentId, round } = req.params;
  
  try {
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

    // Get results up to the specified round (with proper deduplication)
    const results = await new Promise((resolve, reject) => {
      db.all(
        `SELECT player_id, SUM(points) as total_points, 
                COUNT(DISTINCT round) as games_played
         FROM results 
         WHERE tournament_id = ? AND round <= ?
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

    // Sort by points (descending), then by rating (descending)
    standings.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    res.json(standings);
  } catch (error) {
    console.error('Error getting round standings:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
