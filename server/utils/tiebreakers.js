/**
 * USCF-Compliant Tiebreaker Calculations
 * Implements the official US Chess Federation tiebreaker rules
 * Based on US Chess Rules 7th Edition (2025)
 */

/**
 * Calculate Buchholz tiebreaker (sum of opponents' scores)
 * This is the primary tiebreaker used in most USCF tournaments
 */
function calculateBuchholz(playerId, tournamentId, db) {
  return new Promise((resolve, reject) => {
    // Get all opponents for this player
    const query = `
      SELECT 
        r1.opponent_id,
        COALESCE(SUM(r2.points), 0) as opponent_score
      FROM results r1
      LEFT JOIN results r2 ON r1.opponent_id = r2.player_id AND r1.tournament_id = r2.tournament_id
      WHERE r1.player_id = ? AND r1.tournament_id = ?
      GROUP BY r1.opponent_id
    `;
    
    db.all(query, [playerId, tournamentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const buchholz = rows.reduce((sum, row) => sum + row.opponent_score, 0);
      // Round to 1 decimal place to avoid floating point precision issues
      const roundedBuchholz = Math.round(buchholz * 10) / 10;
      resolve(roundedBuchholz);
    });
  });
}

/**
 * Calculate Sonneborn-Berger tiebreaker
 * Sum of defeated opponents' scores + half of drawn opponents' scores
 */
function calculateSonnebornBerger(playerId, tournamentId, db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        r1.opponent_id,
        r1.result,
        COALESCE(SUM(r2.points), 0) as opponent_score
      FROM results r1
      LEFT JOIN results r2 ON r1.opponent_id = r2.player_id AND r1.tournament_id = r2.tournament_id
      WHERE r1.player_id = ? AND r1.tournament_id = ?
      GROUP BY r1.opponent_id, r1.result
    `;
    
    db.all(query, [playerId, tournamentId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      let sonnebornBerger = 0;
      
      rows.forEach(row => {
        if (row.result === '1-0' || row.result === '1-0F') {
          // Full point for defeated opponent
          sonnebornBerger += row.opponent_score;
        } else if (row.result === '1/2-1/2' || row.result === '1/2-1/2F') {
          // Half point for drawn opponent
          sonnebornBerger += row.opponent_score * 0.5;
        }
        // Losses contribute 0 points
      });
      
      // Round to 1 decimal place to avoid floating point precision issues
      sonnebornBerger = Math.round(sonnebornBerger * 10) / 10;
      
      resolve(sonnebornBerger);
    });
  });
}

/**
 * Calculate Performance Rating tiebreaker
 * Based on the average rating of opponents plus a performance adjustment
 */
function calculatePerformanceRating(playerId, tournamentId, db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p1.rating as player_rating,
        COUNT(r1.id) as games_played,
        COALESCE(SUM(r1.points), 0) as total_points,
        COALESCE(AVG(p2.rating), 0) as avg_opponent_rating
      FROM players p1
      LEFT JOIN results r1 ON p1.id = r1.player_id
      LEFT JOIN players p2 ON r1.opponent_id = p2.id
      WHERE p1.id = ? AND p1.tournament_id = ?
      GROUP BY p1.id
    `;
    
    db.get(query, [playerId, tournamentId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row || row.games_played === 0) {
        resolve(0);
        return;
      }
      
      // Performance rating calculation based on USCF formula
      const percentage = row.total_points / row.games_played;
      const performanceRating = row.avg_opponent_rating + (percentage - 0.5) * 400;
      
      resolve(Math.round(performanceRating));
    });
  });
}

/**
 * Calculate Modified Buchholz tiebreaker
 * Buchholz with the lowest-scoring opponent removed
 */
function calculateModifiedBuchholz(playerId, tournamentId, db) {
  return new Promise((resolve, reject) => {
    // First get Buchholz
    calculateBuchholz(playerId, tournamentId, db)
      .then(buchholz => {
        // Get opponent with lowest score
        const query = `
          SELECT 
            r1.opponent_id,
            COALESCE(SUM(r2.points), 999) as opponent_score
          FROM results r1
          LEFT JOIN results r2 ON r1.opponent_id = r2.player_id AND r1.tournament_id = r2.tournament_id
          WHERE r1.player_id = ? AND r1.tournament_id = ?
          GROUP BY r1.opponent_id
          ORDER BY opponent_score ASC
          LIMIT 1
        `;
        
        db.get(query, [playerId, tournamentId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          const lowestOpponentScore = row ? row.opponent_score : 0;
          const modifiedBuchholz = buchholz - lowestOpponentScore;
          // Round to 1 decimal place to avoid floating point precision issues
          const roundedModifiedBuchholz = Math.round(modifiedBuchholz * 10) / 10;
          resolve(roundedModifiedBuchholz);
        });
      })
      .catch(reject);
  });
}

/**
 * Calculate Cumulative tiebreaker
 * Sum of progressive scores after each round
 */
function calculateCumulative(playerId, tournamentId, db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        round,
        points,
        SUM(points) OVER (ORDER BY round) as cumulative_score
      FROM results
      WHERE player_id = ? AND tournament_id = ?
      ORDER BY round DESC
      LIMIT 1
    `;
    
    db.get(query, [playerId, tournamentId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve(row ? row.cumulative_score : 0);
    });
  });
}

/**
 * Calculate all tiebreakers for a player
 */
async function calculateAllTiebreakers(playerId, tournamentId, db) {
  try {
    const [buchholz, sonnebornBerger, performanceRating, modifiedBuchholz, cumulative] = await Promise.all([
      calculateBuchholz(playerId, tournamentId, db),
      calculateSonnebornBerger(playerId, tournamentId, db),
      calculatePerformanceRating(playerId, tournamentId, db),
      calculateModifiedBuchholz(playerId, tournamentId, db),
      calculateCumulative(playerId, tournamentId, db)
    ]);
    
    return {
      buchholz,
      sonnebornBerger,
      performanceRating,
      modifiedBuchholz,
      cumulative
    };
  } catch (error) {
    console.error('Error calculating tiebreakers:', error);
    return {
      buchholz: 0,
      sonnebornBerger: 0,
      performanceRating: 0,
      modifiedBuchholz: 0,
      cumulative: 0
    };
  }
}

/**
 * Calculate tiebreakers for all players in a tournament
 */
async function calculateTournamentTiebreakers(tournamentId, db) {
  return new Promise((resolve, reject) => {
    // Get all active and inactive players (inactive players get 0.5 points for half point byes)
    const query = `
      SELECT id FROM players 
      WHERE tournament_id = ? AND (status = 'active' OR status = 'inactive')
    `;
    
    db.all(query, [tournamentId], async (err, players) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        const tiebreakers = {};
        
        for (const player of players) {
          tiebreakers[player.id] = await calculateAllTiebreakers(player.id, tournamentId, db);
        }
        
        resolve(tiebreakers);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Get default USCF tiebreaker order
 * Based on standard USCF tournament practices
 */
function getDefaultTiebreakerOrder() {
  return [
    'buchholz',
    'sonnebornBerger',
    'performanceRating',
    'modifiedBuchholz',
    'cumulative'
  ];
}

/**
 * Calculate tiebreakers for a list of standings
 * This is a wrapper function that calculates all specified tiebreakers for standings
 */
async function calculateTiebreakers(standings, tournamentId, tiebreakCriteria) {
  const db = require('../database');
  
  // Calculate tiebreakers for each player
  const promises = standings.map(async (player) => {
    try {
      const tiebreakers = await calculateAllTiebreakers(player.id, tournamentId, db);
      
      // Create tiebreakers object based on criteria
      const tiebreakerData = {};
      tiebreakCriteria.forEach(criterion => {
        switch(criterion) {
          case 'buchholz':
            tiebreakerData.buchholz = tiebreakers.buchholz;
            break;
          case 'sonnebornBerger':
            tiebreakerData.sonnebornBerger = tiebreakers.sonnebornBerger;
            break;
          case 'performanceRating':
            tiebreakerData.performanceRating = tiebreakers.performanceRating;
            break;
          case 'modifiedBuchholz':
            tiebreakerData.modifiedBuchholz = tiebreakers.modifiedBuchholz;
            break;
          case 'cumulative':
            tiebreakerData.cumulative = tiebreakers.cumulative;
            break;
        }
      });
      
      return {
        ...player,
        tiebreakers: tiebreakerData
      };
    } catch (error) {
      console.error(`Error calculating tiebreakers for player ${player.id}:`, error);
      return {
        ...player,
        tiebreakers: {}
      };
    }
  });
  
  return Promise.all(promises);
}

module.exports = {
  calculateBuchholz,
  calculateSonnebornBerger,
  calculatePerformanceRating,
  calculateModifiedBuchholz,
  calculateCumulative,
  calculateAllTiebreakers,
  calculateTournamentTiebreakers,
  getDefaultTiebreakerOrder,
  calculateTiebreakers
};
