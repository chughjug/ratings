/**
 * Team Tournament Management Service
 * Handles team creation, management, and team-based pairings
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Create a new team
 */
function createTeam(db, tournamentId, teamData) {
  return new Promise((resolve, reject) => {
    const teamId = uuidv4();
    const { name, captainId, boardCount = 4 } = teamData;
    
    db.run(
      'INSERT INTO teams (id, tournament_id, name, captain_id, board_count) VALUES (?, ?, ?, ?, ?)',
      [teamId, tournamentId, name, captainId, boardCount],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(teamId);
      }
    );
  });
}

/**
 * Add a player to a team
 */
function addTeamMember(db, teamId, playerId, boardNumber) {
  return new Promise((resolve, reject) => {
    const memberId = uuidv4();
    
    db.run(
      'INSERT INTO team_members (id, team_id, player_id, board_number) VALUES (?, ?, ?, ?)',
      [memberId, teamId, playerId, boardNumber],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(memberId);
      }
    );
  });
}

/**
 * Remove a player from a team
 */
function removeTeamMember(db, teamId, playerId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM team_members WHERE team_id = ? AND player_id = ?',
      [teamId, playerId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

/**
 * Get all teams for a tournament
 */
function getTournamentTeams(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        t.*,
        p.name as captain_name,
        COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN players p ON t.captain_id = p.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
      WHERE t.tournament_id = ?
      GROUP BY t.id
      ORDER BY t.name
    `;
    
    db.all(query, [tournamentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Get team members for a specific team
 */
function getTeamMembers(db, teamId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        tm.*,
        p.name,
        p.rating,
        p.uscf_id,
        p.fide_id
      FROM team_members tm
      JOIN players p ON tm.player_id = p.id
      WHERE tm.team_id = ?
      ORDER BY tm.board_number
    `;
    
    db.all(query, [teamId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Generate team pairings for a round
 */
function generateTeamPairings(db, tournamentId, round) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get all active teams
      const teams = await getTournamentTeams(db, tournamentId);
      const activeTeams = teams.filter(team => team.status === 'active');
      
      if (activeTeams.length < 2) {
        resolve([]);
        return;
      }
      
      // Get team standings
      const teamStandings = await calculateTeamStandings(db, tournamentId);
      
      // Sort teams by score
      const sortedTeams = teamStandings.sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        // Add tiebreakers here if needed
        return 0;
      });
      
      const pairings = [];
      const needsBye = sortedTeams.length % 2 === 1;
      
      if (needsBye) {
        // Give bye to lowest scoring team
        const byeTeam = sortedTeams.pop();
        pairings.push({
          team_id: byeTeam.team_id,
          opponent_team_id: null,
          is_bye: true,
          board: 1
        });
      }
      
      // Pair remaining teams
      for (let i = 0; i < sortedTeams.length; i += 2) {
        if (i + 1 < sortedTeams.length) {
          pairings.push({
            team_id: sortedTeams[i].team_id,
            opponent_team_id: sortedTeams[i + 1].team_id,
            is_bye: false,
            board: Math.floor(i / 2) + 1
          });
        }
      }
      
      resolve(pairings);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculate team standings
 */
function calculateTeamStandings(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        t.id as team_id,
        t.name as team_name,
        COALESCE(SUM(tr.team_score), 0) as score,
        COUNT(tr.id) as matches_played,
        COALESCE(SUM(CASE WHEN tr.result = 'win' THEN 1 ELSE 0 END), 0) as wins,
        COALESCE(SUM(CASE WHEN tr.result = 'draw' THEN 1 ELSE 0 END), 0) as draws,
        COALESCE(SUM(CASE WHEN tr.result = 'loss' THEN 1 ELSE 0 END), 0) as losses
      FROM teams t
      LEFT JOIN team_results tr ON t.id = tr.team_id
      WHERE t.tournament_id = ? AND t.status = 'active'
      GROUP BY t.id, t.name
      ORDER BY score DESC, wins DESC, draws DESC
    `;
    
    db.all(query, [tournamentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Record team match result
 */
function recordTeamResult(db, tournamentId, round, teamId, opponentTeamId, teamScore, opponentScore) {
  return new Promise((resolve, reject) => {
    const resultId = uuidv4();
    let result = 'draw';
    
    if (teamScore > opponentScore) {
      result = 'win';
    } else if (teamScore < opponentScore) {
      result = 'loss';
    }
    
    db.run(
      'INSERT INTO team_results (id, tournament_id, team_id, round, opponent_team_id, team_score, opponent_score, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [resultId, tournamentId, teamId, round, opponentTeamId, teamScore, opponentScore, result],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(resultId);
      }
    );
  });
}

/**
 * Get team match results for a round
 */
function getTeamResults(db, tournamentId, round) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        tr.*,
        t1.name as team_name,
        t2.name as opponent_team_name
      FROM team_results tr
      JOIN teams t1 ON tr.team_id = t1.id
      LEFT JOIN teams t2 ON tr.opponent_team_id = t2.id
      WHERE tr.tournament_id = ? AND tr.round = ?
      ORDER BY tr.board
    `;
    
    db.all(query, [tournamentId, round], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  createTeam,
  addTeamMember,
  removeTeamMember,
  getTournamentTeams,
  getTeamMembers,
  generateTeamPairings,
  calculateTeamStandings,
  recordTeamResult,
  getTeamResults
};
