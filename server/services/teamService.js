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
    const { name, captainId } = teamData;
    
    db.run(
      'INSERT INTO teams (id, tournament_id, name, captain_id) VALUES (?, ?, ?, ?)',
      [teamId, tournamentId, name, captainId],
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
function addTeamMember(db, teamId, playerId) {
  return new Promise((resolve, reject) => {
    const memberId = uuidv4();
    
    db.run(
      'INSERT INTO team_members (id, team_id, player_id) VALUES (?, ?, ?)',
      [memberId, teamId, playerId],
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
      ORDER BY p.rating DESC, p.name
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
 * Get team members for individual tournaments (players with team_id)
 */
function getIndividualTournamentTeamMembers(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p.id as player_id,
        p.name as player_name,
        p.rating,
        p.uscf_id,
        p.fide_id,
        p.team_id,
        t.name as team_name,
        COALESCE(SUM(r.points), 0) as total_points,
        COUNT(r.id) as games_played
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
      WHERE p.tournament_id = ? AND p.team_id IS NOT NULL AND p.status = 'active'
      GROUP BY p.id, p.name, p.rating, p.uscf_id, p.fide_id, p.team_id, t.name
      ORDER BY t.name, total_points DESC, p.rating DESC
    `;
    
    db.all(query, [tournamentId, tournamentId], (err, rows) => {
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
 * Calculate team standings for team tournaments
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
 * Calculate team standings for individual tournaments with team scoring
 * Players play individually but their results contribute to team scores
 * Implements USCF-compliant team scoring: sum of top 4 individual scores
 * Supports team tiebreakers: top 3 sum, top 2 sum, single highest, progressive
 */
async function calculateIndividualTournamentTeamStandings(db, tournamentId, scoringMethod = 'top_4', topN = 4) {
  return new Promise((resolve, reject) => {
    // USCF standard: sum of top 4 individual scores
    const query = `
      WITH team_player_scores AS (
        SELECT 
          p.team_id,
          t.name as team_name,
          p.id as player_id,
          p.name as player_name,
          p.rating,
          COALESCE(SUM(r.points), 0) as player_total_points,
          COUNT(r.id) as player_games_played,
          ROW_NUMBER() OVER (PARTITION BY p.team_id ORDER BY COALESCE(SUM(r.points), 0) DESC, p.rating DESC) as player_rank
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.id
        LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
        WHERE p.tournament_id = ? AND p.team_id IS NOT NULL AND p.status = 'active'
        GROUP BY p.team_id, t.name, p.id, p.name, p.rating
      ),
      team_top_scores AS (
        SELECT 
          team_id,
          team_name,
          SUM(CASE WHEN player_rank <= ? THEN player_total_points ELSE 0 END) as team_total_points,
          COUNT(CASE WHEN player_rank <= ? THEN 1 END) as counted_players,
          SUM(player_total_points) as all_players_total,
          COUNT(*) as total_members,
          -- Individual player scores for tiebreakers
          MAX(CASE WHEN player_rank = 1 THEN player_total_points END) as top_player_score,
          SUM(CASE WHEN player_rank <= 2 THEN player_total_points ELSE 0 END) as top_2_sum,
          SUM(CASE WHEN player_rank <= 3 THEN player_total_points ELSE 0 END) as top_3_sum,
          -- Individual game counts
          SUM(CASE WHEN player_rank <= ? THEN player_games_played ELSE 0 END) as counted_games,
          SUM(player_games_played) as total_games
        FROM team_player_scores
        GROUP BY team_id, team_name
      )
      SELECT 
        tts.*,
        COALESCE(tts.team_total_points / NULLIF(tts.counted_players, 0), 0) as avg_points_per_player,
        COALESCE(tts.counted_games / NULLIF(tts.counted_players, 0), 0) as avg_games_per_player
      FROM team_top_scores tts
      WHERE tts.team_total_points > 0 OR tts.total_members > 0
      ORDER BY tts.team_total_points DESC, tts.top_3_sum DESC, tts.top_2_sum DESC, tts.top_player_score DESC
    `;
    
    db.all(query, [tournamentId, tournamentId, topN, topN, topN], async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Add progressive tiebreakers (round-by-round cumulative scores)
      try {
        const enhancedRows = await addProgressiveTiebreakers(db, tournamentId, rows);
        resolve(enhancedRows);
      } catch (tiebreakerError) {
        console.error('Error calculating progressive tiebreakers:', tiebreakerError);
        resolve(rows); // Return basic standings if tiebreakers fail
      }
    });
  });
}

/**
 * Calculate team match results for individual tournaments with team scoring
 * Determines team match outcomes based on individual game results
 * Returns team match points: 1 for win, 0.5 for draw, 0 for loss
 */
async function calculateTeamMatchResults(db, tournamentId, round) {
  return new Promise((resolve, reject) => {
    const query = `
      WITH team_matchups AS (
        SELECT DISTINCT
          t1.id as team1_id,
          t1.name as team1_name,
          t2.id as team2_id,
          t2.name as team2_name
        FROM teams t1
        JOIN teams t2 ON t1.tournament_id = t2.tournament_id AND t1.id < t2.id
        WHERE t1.tournament_id = ? AND t1.status = 'active' AND t2.status = 'active'
      ),
      team_scores AS (
        SELECT 
          tm.team1_id,
          tm.team1_name,
          tm.team2_id,
          tm.team2_name,
          COALESCE(SUM(CASE WHEN tm1.player_id = r.player_id THEN r.points ELSE 0 END), 0) as team1_score,
          COALESCE(SUM(CASE WHEN tm2.player_id = r.player_id THEN r.points ELSE 0 END), 0) as team2_score,
          COUNT(CASE WHEN tm1.player_id = r.player_id OR tm2.player_id = r.player_id THEN 1 END) as games_played
        FROM team_matchups tm
        LEFT JOIN team_members tm1 ON tm.team1_id = tm1.team_id
        LEFT JOIN team_members tm2 ON tm.team2_id = tm2.team_id
        LEFT JOIN results r ON (tm1.player_id = r.player_id OR tm2.player_id = r.player_id) 
          AND r.tournament_id = ? AND r.round = ?
        GROUP BY tm.team1_id, tm.team1_name, tm.team2_id, tm.team2_name
      )
      SELECT 
        team1_id,
        team1_name,
        team2_id,
        team2_name,
        team1_score,
        team2_score,
        games_played,
        CASE 
          WHEN team1_score > team2_score THEN 1.0
          WHEN team1_score < team2_score THEN 0.0
          ELSE 0.5
        END as team1_match_points,
        CASE 
          WHEN team1_score > team2_score THEN 0.0
          WHEN team1_score < team2_score THEN 1.0
          ELSE 0.5
        END as team2_match_points
      FROM team_scores
      WHERE games_played > 0
      ORDER BY team1_name, team2_name
    `;
    
    db.all(query, [tournamentId, tournamentId, round], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Add progressive tiebreakers for team standings
 * Calculates round-by-round cumulative scores for top 4 players
 */
async function addProgressiveTiebreakers(db, tournamentId, teamStandings) {
  return new Promise((resolve, reject) => {
    // Get tournament rounds
    db.get('SELECT rounds FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!tournament) {
        resolve(teamStandings);
        return;
      }
      
      const totalRounds = tournament.rounds;
      
      // Calculate progressive scores for each team
      const progressiveQuery = `
        WITH team_player_scores AS (
          SELECT 
            p.team_id,
            p.id as player_id,
            COALESCE(SUM(r.points), 0) as player_total_points,
            ROW_NUMBER() OVER (PARTITION BY p.team_id ORDER BY COALESCE(SUM(r.points), 0) DESC, p.rating DESC) as player_rank
          FROM players p
          LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
          WHERE p.tournament_id = ? AND p.team_id IS NOT NULL AND p.status = 'active'
          GROUP BY p.team_id, p.id, p.rating
        ),
        team_progressive AS (
          SELECT 
            p.team_id,
            r.round,
            SUM(CASE WHEN tps.player_rank <= 4 THEN r.points ELSE 0 END) as round_team_score
          FROM players p
          LEFT JOIN results r ON p.id = r.player_id AND r.tournament_id = ?
          LEFT JOIN team_player_scores tps ON p.id = tps.player_id
          WHERE p.tournament_id = ? AND p.team_id IS NOT NULL AND p.status = 'active'
          GROUP BY p.team_id, r.round
        )
        SELECT 
          team_id,
          round,
          round_team_score
        FROM team_progressive
        ORDER BY team_id, round
      `;
      
      db.all(progressiveQuery, [tournamentId, tournamentId, tournamentId, tournamentId], (err, progressiveRows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Group progressive scores by team
        const teamProgressive = {};
        progressiveRows.forEach(row => {
          if (!teamProgressive[row.team_id]) {
            teamProgressive[row.team_id] = {};
          }
          teamProgressive[row.team_id][row.round] = row.round_team_score;
        });
        
        // Add progressive tiebreakers to standings
        const enhancedStandings = teamStandings.map(team => {
          const progressive = teamProgressive[team.team_id] || {};
          const progressiveScores = [];
          
          // Calculate cumulative scores round by round
          let cumulative = 0;
          for (let round = 1; round <= totalRounds; round++) {
            cumulative += (progressive[round] || 0);
            progressiveScores.push(cumulative);
          }
          
          return {
            ...team,
            progressive_scores: progressiveScores,
            progressive_tiebreaker: progressiveScores.join(',')
          };
        });
        
        // Re-sort with progressive tiebreakers
        enhancedStandings.sort((a, b) => {
          // Primary: Team total points
          if (a.team_total_points !== b.team_total_points) {
            return b.team_total_points - a.team_total_points;
          }
          
          // Secondary: Top 3 sum
          if (a.top_3_sum !== b.top_3_sum) {
            return b.top_3_sum - a.top_3_sum;
          }
          
          // Tertiary: Top 2 sum
          if (a.top_2_sum !== b.top_2_sum) {
            return b.top_2_sum - a.top_2_sum;
          }
          
          // Quaternary: Single highest
          if (a.top_player_score !== b.top_player_score) {
            return b.top_player_score - a.top_player_score;
          }
          
          // Quinary: Progressive tiebreaker (round-by-round comparison)
          const aProgressive = a.progressive_scores || [];
          const bProgressive = b.progressive_scores || [];
          
          for (let i = 0; i < Math.min(aProgressive.length, bProgressive.length); i++) {
            if (aProgressive[i] !== bProgressive[i]) {
              return bProgressive[i] - aProgressive[i];
            }
          }
          
          // Final: Team name (alphabetical)
          return a.team_name.localeCompare(b.team_name);
        });
        
        resolve(enhancedStandings);
      });
    });
  });
}

/**
 * Add team-specific tiebreakers to team standings
 * Includes Buchholz, Sonneborn-Berger, and performance ratings for teams
 */
async function addTeamTiebreakers(db, tournamentId, teamStandings) {
  return new Promise((resolve, reject) => {
    // Calculate team Buchholz (sum of opponents' scores for all team members)
    const buchholzQuery = `
      SELECT 
        t.id as team_id,
        COALESCE(SUM(opponent_scores.opponent_total_points), 0) as team_buchholz
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN results r1 ON tm.player_id = r1.player_id AND r1.tournament_id = ?
      LEFT JOIN (
        SELECT 
          player_id,
          COALESCE(SUM(points), 0) as opponent_total_points
        FROM results 
        WHERE tournament_id = ?
        GROUP BY player_id
      ) opponent_scores ON r1.opponent_id = opponent_scores.player_id
      WHERE t.tournament_id = ? AND t.status = 'active'
      GROUP BY t.id
    `;
    
    db.all(buchholzQuery, [tournamentId, tournamentId, tournamentId], (err, buchholzRows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Create map of team Buchholz scores
      const buchholzMap = {};
      buchholzRows.forEach(row => {
        buchholzMap[row.team_id] = row.team_buchholz;
      });
      
      // Calculate team Sonneborn-Berger
      calculateTeamSonnebornBerger(db, tournamentId, teamStandings).then(sonnebornMap => {
        // Add tiebreakers to standings
        const enhancedStandings = teamStandings.map(team => ({
          ...team,
          team_buchholz: buchholzMap[team.team_id] || 0,
          team_performance_rating: calculateTeamPerformanceRating(team),
          team_sonneborn_berger: sonnebornMap[team.team_id] || 0
        }));
        
        // Re-sort with tiebreakers
        enhancedStandings.sort((a, b) => {
          // Primary: Total game points
          if (a.total_game_points !== b.total_game_points) {
            return b.total_game_points - a.total_game_points;
          }
          
          // Secondary: Average game points
          if (a.avg_game_points !== b.avg_game_points) {
            return b.avg_game_points - a.avg_game_points;
          }
          
          // Tertiary: Team Buchholz
          if (a.team_buchholz !== b.team_buchholz) {
            return b.team_buchholz - a.team_buchholz;
          }
          
          // Quaternary: Wins
          if (a.wins !== b.wins) {
            return b.wins - a.wins;
          }
          
          // Quinary: Team performance rating
          if (a.team_performance_rating !== b.team_performance_rating) {
            return b.team_performance_rating - a.team_performance_rating;
          }
          
          // Final: Team name (alphabetical)
          return a.team_name.localeCompare(b.team_name);
        });
        
        resolve(enhancedStandings);
      }).catch(err => {
        console.error('Error calculating team Sonneborn-Berger:', err);
        // Fallback without Sonneborn-Berger
        const enhancedStandings = teamStandings.map(team => ({
          ...team,
          team_buchholz: buchholzMap[team.team_id] || 0,
          team_performance_rating: calculateTeamPerformanceRating(team),
          team_sonneborn_berger: 0
        }));
        
        enhancedStandings.sort((a, b) => {
          if (a.total_game_points !== b.total_game_points) {
            return b.total_game_points - a.total_game_points;
          }
          return a.team_name.localeCompare(b.team_name);
        });
        
        resolve(enhancedStandings);
      });
    });
  });
}

/**
 * Calculate team performance rating based on average team member performance
 */
function calculateTeamPerformanceRating(team) {
  if (!team.games_played || team.games_played === 0) {
    return 0;
  }
  
  // Simple performance rating calculation based on win percentage
  const winPercentage = team.total_game_points / team.games_played;
  
  // Base rating of 1200 + performance adjustment
  // This is a simplified calculation - in practice, you'd use actual opponent ratings
  const performanceRating = 1200 + (winPercentage - 0.5) * 400;
  
  return Math.round(performanceRating);
}

/**
 * Calculate team Sonneborn-Berger score
 * For teams, this is the sum of defeated opponents' scores plus half of drawn opponents' scores
 */
function calculateTeamSonnebornBerger(db, tournamentId, teamStandings) {
  return new Promise((resolve, reject) => {
    // Get all team match results
    const query = `
      SELECT 
        tr.team_id,
        tr.opponent_team_id,
        tr.team_score,
        tr.opponent_score,
        t.total_game_points as opponent_total_score
      FROM team_results tr
      JOIN (
        SELECT 
          team_id,
          SUM(team_score) as total_game_points
        FROM team_results
        WHERE tournament_id = ?
        GROUP BY team_id
      ) t ON tr.opponent_team_id = t.team_id
      WHERE tr.tournament_id = ?
    `;
    
    db.all(query, [tournamentId, tournamentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Calculate Sonneborn-Berger for each team
      const sonnebornMap = {};
      
      rows.forEach(row => {
        if (!sonnebornMap[row.team_id]) {
          sonnebornMap[row.team_id] = 0;
        }
        
        // Sonneborn-Berger = sum of opponent scores for wins + half of opponent scores for draws
        if (row.team_score > row.opponent_score) {
          // Win: add full opponent score
          sonnebornMap[row.team_id] += row.opponent_total_score;
        } else if (row.team_score === row.opponent_score) {
          // Draw: add half of opponent score
          sonnebornMap[row.team_id] += row.opponent_total_score * 0.5;
        }
        // Loss: nothing added
      });
      
      resolve(sonnebornMap);
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
  getIndividualTournamentTeamMembers,
  generateTeamPairings,
  calculateTeamStandings,
  calculateIndividualTournamentTeamStandings,
  calculateTeamMatchResults,
  addTeamTiebreakers,
  addProgressiveTiebreakers,
  calculateTeamPerformanceRating,
  recordTeamResult,
  getTeamResults
};
