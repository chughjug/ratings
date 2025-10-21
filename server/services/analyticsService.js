/**
 * Tournament Analytics Service
 * Provides comprehensive analytics and insights for tournaments
 */

/**
 * Get tournament overview statistics
 */
function getTournamentOverview(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        t.*,
        COUNT(DISTINCT p.id) as total_players,
        COUNT(DISTINCT r.id) as total_games,
        COUNT(DISTINCT CASE WHEN r.round = 1 THEN r.id END) as round_1_games,
        COUNT(DISTINCT CASE WHEN r.round = 2 THEN r.id END) as round_2_games,
        COUNT(DISTINCT CASE WHEN r.round = 3 THEN r.id END) as round_3_games,
        COUNT(DISTINCT CASE WHEN r.round = 4 THEN r.id END) as round_4_games,
        COUNT(DISTINCT CASE WHEN r.round = 5 THEN r.id END) as round_5_games,
        COUNT(DISTINCT CASE WHEN r.round = 6 THEN r.id END) as round_6_games,
        COUNT(DISTINCT CASE WHEN r.round = 7 THEN r.id END) as round_7_games,
        COUNT(DISTINCT CASE WHEN r.round = 8 THEN r.id END) as round_8_games,
        COUNT(DISTINCT CASE WHEN r.round = 9 THEN r.id END) as round_9_games,
        COUNT(DISTINCT CASE WHEN r.round = 10 THEN r.id END) as round_10_games
      FROM tournaments t
      LEFT JOIN players p ON t.id = p.tournament_id AND p.status = 'active'
      LEFT JOIN results r ON t.id = r.tournament_id
      WHERE t.id = ?
      GROUP BY t.id
    `;
    
    db.get(query, [tournamentId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

/**
 * Get player performance analytics
 */
function getPlayerPerformanceAnalytics(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.rating,
        p.uscf_id,
        p.fide_id,
        p.section,
        COUNT(r.id) as games_played,
        COALESCE(SUM(r.points), 0) as total_points,
        COALESCE(AVG(r.points), 0) as average_points,
        COUNT(CASE WHEN r.result = '1-0' OR r.result = '1-0F' THEN 1 END) as wins,
        COUNT(CASE WHEN r.result = '1/2-1/2' OR r.result = '1/2-1/2F' THEN 1 END) as draws,
        COUNT(CASE WHEN r.result = '0-1' OR r.result = '0-1F' THEN 1 END) as losses,
        COUNT(CASE WHEN r.color = 'white' THEN 1 END) as white_games,
        COUNT(CASE WHEN r.color = 'black' THEN 1 END) as black_games,
        COALESCE(AVG(CASE WHEN r.color = 'white' THEN r.points END), 0) as white_performance,
        COALESCE(AVG(CASE WHEN r.color = 'black' THEN r.points END), 0) as black_performance
      FROM players p
      LEFT JOIN results r ON p.id = r.player_id
      WHERE p.tournament_id = ? AND p.status = 'active'
      GROUP BY p.id
      ORDER BY total_points DESC, wins DESC
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
 * Get rating performance analysis
 */
function getRatingPerformanceAnalysis(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p.rating,
        COUNT(p.id) as player_count,
        COALESCE(AVG(r.points), 0) as avg_performance,
        COALESCE(SUM(r.points), 0) as total_points,
        COUNT(r.id) as total_games
      FROM players p
      LEFT JOIN results r ON p.id = r.player_id
      WHERE p.tournament_id = ? AND p.status = 'active' AND p.rating IS NOT NULL
      GROUP BY p.rating
      ORDER BY p.rating DESC
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
 * Get section performance analysis
 */
function getSectionPerformanceAnalysis(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        COALESCE(p.section, 'Open') as section,
        COUNT(DISTINCT p.id) as player_count,
        COALESCE(AVG(r.points), 0) as avg_performance,
        COALESCE(SUM(r.points), 0) as total_points,
        COUNT(r.id) as total_games,
        COALESCE(AVG(p.rating), 0) as avg_rating,
        MIN(p.rating) as min_rating,
        MAX(p.rating) as max_rating
      FROM players p
      LEFT JOIN results r ON p.id = r.player_id
      WHERE p.tournament_id = ? AND p.status = 'active'
      GROUP BY COALESCE(p.section, 'Open')
      ORDER BY avg_performance DESC
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
 * Get game result distribution
 */
function getGameResultDistribution(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        result,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM results WHERE tournament_id = ?), 2) as percentage
      FROM results
      WHERE tournament_id = ?
      GROUP BY result
      ORDER BY count DESC
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
 * Get color performance analysis
 */
function getColorPerformanceAnalysis(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        color,
        COUNT(*) as games,
        COALESCE(AVG(points), 0) as avg_points,
        COUNT(CASE WHEN result = '1-0' OR result = '1-0F' THEN 1 END) as wins,
        COUNT(CASE WHEN result = '1/2-1/2' OR result = '1/2-1/2F' THEN 1 END) as draws,
        COUNT(CASE WHEN result = '0-1' OR result = '0-1F' THEN 1 END) as losses,
        ROUND(COUNT(CASE WHEN result = '1-0' OR result = '1-0F' THEN 1 END) * 100.0 / COUNT(*), 2) as win_percentage
      FROM results
      WHERE tournament_id = ? AND color IS NOT NULL
      GROUP BY color
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
 * Get round-by-round analysis
 */
function getRoundByRoundAnalysis(db, tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        round,
        COUNT(*) as games_played,
        COALESCE(AVG(points), 0) as avg_points,
        COUNT(CASE WHEN result = '1-0' OR result = '1-0F' THEN 1 END) as white_wins,
        COUNT(CASE WHEN result = '0-1' OR result = '0-1F' THEN 1 END) as black_wins,
        COUNT(CASE WHEN result = '1/2-1/2' OR result = '1/2-1/2F' THEN 1 END) as draws
      FROM results
      WHERE tournament_id = ?
      GROUP BY round
      ORDER BY round
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
 * Get top performers by various metrics
 */
function getTopPerformers(db, tournamentId, limit = 10) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.rating,
        p.section,
        COUNT(r.id) as games_played,
        COALESCE(SUM(r.points), 0) as total_points,
        COALESCE(AVG(r.points), 0) as avg_performance,
        COUNT(CASE WHEN r.result = '1-0' OR r.result = '1-0F' THEN 1 END) as wins,
        COUNT(CASE WHEN r.result = '1/2-1/2' OR r.result = '1/2-1/2F' THEN 1 END) as draws,
        COUNT(CASE WHEN r.result = '0-1' OR r.result = '0-1F' THEN 1 END) as losses,
        ROUND(COUNT(CASE WHEN r.result = '1-0' OR r.result = '1-0F' THEN 1 END) * 100.0 / COUNT(r.id), 2) as win_percentage
      FROM players p
      LEFT JOIN results r ON p.id = r.player_id
      WHERE p.tournament_id = ? AND p.status = 'active'
      GROUP BY p.id
      HAVING games_played > 0
      ORDER BY total_points DESC, win_percentage DESC, wins DESC
      LIMIT ?
    `;
    
    db.all(query, [tournamentId, limit], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Get comprehensive tournament analytics
 */
async function getComprehensiveAnalytics(db, tournamentId) {
  try {
    const [
      overview,
      playerPerformance,
      ratingPerformance,
      sectionPerformance,
      gameDistribution,
      colorPerformance,
      roundAnalysis,
      topPerformers
    ] = await Promise.all([
      getTournamentOverview(db, tournamentId),
      getPlayerPerformanceAnalytics(db, tournamentId),
      getRatingPerformanceAnalysis(db, tournamentId),
      getSectionPerformanceAnalysis(db, tournamentId),
      getGameResultDistribution(db, tournamentId),
      getColorPerformanceAnalysis(db, tournamentId),
      getRoundByRoundAnalysis(db, tournamentId),
      getTopPerformers(db, tournamentId)
    ]);
    
    return {
      overview,
      playerPerformance,
      ratingPerformance,
      sectionPerformance,
      gameDistribution,
      colorPerformance,
      roundAnalysis,
      topPerformers,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getTournamentOverview,
  getPlayerPerformanceAnalytics,
  getRatingPerformanceAnalysis,
  getSectionPerformanceAnalysis,
  getGameResultDistribution,
  getColorPerformanceAnalysis,
  getRoundByRoundAnalysis,
  getTopPerformers,
  getComprehensiveAnalytics
};
