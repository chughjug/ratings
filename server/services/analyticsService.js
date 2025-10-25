const db = require('../database');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive tournament analytics
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Analytics data
   */
  async getTournamentAnalytics(tournamentId) {
    try {
      const cacheKey = `tournament_analytics_${tournamentId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const analytics = await Promise.all([
        this.getTournamentOverview(tournamentId),
        this.getPlayerStatistics(tournamentId),
        this.getPairingAnalytics(tournamentId),
        this.getRatingDistribution(tournamentId),
        this.getPerformanceMetrics(tournamentId),
        this.getTimeAnalysis(tournamentId),
        this.getSectionAnalytics(tournamentId),
        this.getFinancialAnalytics(tournamentId)
      ]);

      const result = {
        overview: analytics[0],
        players: analytics[1],
        pairings: analytics[2],
        ratings: analytics[3],
        performance: analytics[4],
        timeAnalysis: analytics[5],
        sections: analytics[6],
        financial: analytics[7],
        generatedAt: new Date().toISOString()
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting tournament analytics:', error);
      throw error;
    }
  }

/**
 * Get tournament overview statistics
 */
  async getTournamentOverview(tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
          t.name,
          t.start_date,
          t.end_date,
          t.total_rounds,
          t.time_control,
          t.entry_fee,
          COUNT(p.id) as total_players,
          COUNT(CASE WHEN p.section = 'Open' THEN 1 END) as open_players,
          COUNT(CASE WHEN p.section = 'U1600' THEN 1 END) as u1600_players,
          COUNT(CASE WHEN p.section = 'U1200' THEN 1 END) as u1200_players,
          AVG(p.rating) as average_rating,
          MAX(p.rating) as highest_rating,
          MIN(p.rating) as lowest_rating,
          COUNT(CASE WHEN p.team_name IS NOT NULL THEN 1 END) as team_players
      FROM tournaments t
        LEFT JOIN players p ON t.id = p.tournament_id
      WHERE t.id = ?
      GROUP BY t.id
    `;
    
    db.get(query, [tournamentId], (err, row) => {
        if (err) return reject(err);
        resolve(row || {});
      });
  });
}

/**
   * Get player statistics and performance
 */
  async getPlayerStatistics(tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.rating,
        p.section,
          p.score,
          p.final_rank,
          p.team_name,
          COUNT(CASE WHEN g.result = 'W' THEN 1 END) as wins,
          COUNT(CASE WHEN g.result = 'L' THEN 1 END) as losses,
          COUNT(CASE WHEN g.result = 'D' THEN 1 END) as draws,
          AVG(g.duration_minutes) as avg_game_duration,
          MAX(g.duration_minutes) as longest_game,
          MIN(g.duration_minutes) as shortest_game
      FROM players p
        LEFT JOIN games g ON p.id = g.player_id
        WHERE p.tournament_id = ?
      GROUP BY p.id
        ORDER BY p.final_rank
    `;
    
    db.all(query, [tournamentId], (err, rows) => {
        if (err) return reject(err);
        
        const stats = {
          totalPlayers: rows.length,
          averageScore: rows.reduce((sum, p) => sum + (p.score || 0), 0) / rows.length,
          topPerformers: rows.slice(0, 5),
          ratingImprovements: this.calculateRatingImprovements(rows),
          sectionBreakdown: this.calculateSectionBreakdown(rows),
          teamStatistics: this.calculateTeamStatistics(rows)
        };
        
        resolve(stats);
      });
    });
  }

  /**
   * Get pairing analytics
   */
  async getPairingAnalytics(tournamentId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          round,
          COUNT(*) as total_pairings,
          COUNT(CASE WHEN result = 'W' THEN 1 END) as decisive_games,
          COUNT(CASE WHEN result = 'D' THEN 1 END) as draws,
          AVG(rating_difference) as avg_rating_diff,
          COUNT(CASE WHEN rating_difference > 200 THEN 1 END) as mismatched_pairings
        FROM pairings
        WHERE tournament_id = ?
        GROUP BY round
        ORDER BY round
      `;
      
      db.all(query, [tournamentId], (err, rows) => {
        if (err) return reject(err);
        
        const analytics = {
          rounds: rows,
          totalPairings: rows.reduce((sum, r) => sum + r.total_pairings, 0),
          averageDrawRate: rows.reduce((sum, r) => sum + (r.draws / r.total_pairings), 0) / rows.length,
          pairingQuality: this.calculatePairingQuality(rows),
          colorBalance: this.calculateColorBalance(tournamentId)
        };
        
        resolve(analytics);
      });
    });
  }

  /**
   * Get rating distribution analysis
   */
  async getRatingDistribution(tournamentId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          rating,
          COUNT(*) as count,
          section
        FROM players
        WHERE tournament_id = ? AND rating IS NOT NULL
        ORDER BY rating
      `;
      
      db.all(query, [tournamentId], (err, rows) => {
        if (err) return reject(err);
        
        const distribution = {
          ranges: this.calculateRatingRanges(rows),
          histogram: this.createRatingHistogram(rows),
          percentiles: this.calculatePercentiles(rows),
          sectionDistribution: this.calculateSectionDistribution(rows)
        };
        
        resolve(distribution);
    });
  });
}

/**
   * Get performance metrics
 */
  async getPerformanceMetrics(tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        p.rating,
          p.score,
          p.final_rank,
          p.section,
          COUNT(g.id) as games_played,
          COUNT(CASE WHEN g.result = 'W' THEN 1 END) as wins,
          COUNT(CASE WHEN g.result = 'L' THEN 1 END) as losses,
          COUNT(CASE WHEN g.result = 'D' THEN 1 END) as draws
      FROM players p
        LEFT JOIN games g ON p.id = g.player_id
        WHERE p.tournament_id = ?
        GROUP BY p.id
    `;
    
    db.all(query, [tournamentId], (err, rows) => {
        if (err) return reject(err);
        
        const metrics = {
          performanceByRating: this.calculatePerformanceByRating(rows),
          upsets: this.calculateUpsets(rows),
          consistency: this.calculateConsistency(rows),
          improvement: this.calculateImprovement(rows)
        };
        
        resolve(metrics);
      });
    });
  }

  /**
   * Get time analysis
   */
  async getTimeAnalysis(tournamentId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          g.round,
          g.duration_minutes,
          g.result,
          p.section,
          p.rating
        FROM games g
        JOIN players p ON g.player_id = p.id
        WHERE p.tournament_id = ?
        ORDER BY g.round, g.duration_minutes
      `;
      
      db.all(query, [tournamentId], (err, rows) => {
        if (err) return reject(err);
        
        const timeAnalysis = {
          averageGameDuration: rows.reduce((sum, g) => sum + g.duration_minutes, 0) / rows.length,
          durationByRound: this.calculateDurationByRound(rows),
          durationBySection: this.calculateDurationBySection(rows),
          durationByResult: this.calculateDurationByResult(rows),
          timeDistribution: this.createTimeDistribution(rows)
        };
        
        resolve(timeAnalysis);
    });
  });
}

/**
   * Get section-specific analytics
 */
  async getSectionAnalytics(tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
          section,
          COUNT(*) as player_count,
          AVG(rating) as avg_rating,
          AVG(score) as avg_score,
          COUNT(CASE WHEN final_rank <= 3 THEN 1 END) as top_3_count
        FROM players
        WHERE tournament_id = ?
        GROUP BY section
        ORDER BY section
    `;
    
    db.all(query, [tournamentId], (err, rows) => {
        if (err) return reject(err);
        
        const sectionAnalytics = {
          sections: rows,
          competitiveness: this.calculateCompetitiveness(rows),
          sectionComparison: this.compareSections(rows)
        };
        
        resolve(sectionAnalytics);
      });
  });
}

/**
   * Get financial analytics
 */
  async getFinancialAnalytics(tournamentId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
          t.entry_fee,
          COUNT(p.id) as total_players,
          t.prize_fund,
          t.total_prizes
        FROM tournaments t
        LEFT JOIN players p ON t.id = p.tournament_id
        WHERE t.id = ?
        GROUP BY t.id
      `;
      
      db.get(query, [tournamentId], (err, row) => {
        if (err) return reject(err);
        
        const financial = {
          totalRevenue: (row.entry_fee || 0) * (row.total_players || 0),
          averageEntryFee: row.entry_fee || 0,
          prizeDistribution: this.calculatePrizeDistribution(row),
          costAnalysis: this.calculateCostAnalysis(row),
          profitability: this.calculateProfitability(row)
        };
        
        resolve(financial);
      });
    });
  }

  /**
   * Get system-wide analytics
   */
  async getSystemAnalytics() {
    try {
      const cacheKey = 'system_analytics';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const analytics = await Promise.all([
        this.getTournamentTrends(),
        this.getPlayerTrends(),
        this.getSystemMetrics(),
        this.getPopularFeatures()
      ]);

      const result = {
        tournaments: analytics[0],
        players: analytics[1],
        system: analytics[2],
        features: analytics[3],
        generatedAt: new Date().toISOString()
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error getting system analytics:', error);
      throw error;
    }
  }

  /**
   * Get tournament trends over time
   */
  async getTournamentTrends() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
          DATE(start_date) as date,
          COUNT(*) as tournament_count,
          AVG(COUNT(p.id)) as avg_players_per_tournament
        FROM tournaments t
        LEFT JOIN players p ON t.id = p.tournament_id
        WHERE start_date >= date('now', '-12 months')
        GROUP BY DATE(start_date)
        ORDER BY date
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
   * Get player trends
 */
  async getPlayerTrends() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
          section,
          COUNT(*) as player_count,
          AVG(rating) as avg_rating,
          COUNT(DISTINCT tournament_id) as tournaments_played
        FROM players
        WHERE created_at >= date('now', '-12 months')
        GROUP BY section
        ORDER BY player_count DESC
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
   * Get system metrics
 */
  async getSystemMetrics() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
          (SELECT COUNT(*) FROM tournaments) as total_tournaments,
          (SELECT COUNT(*) FROM players) as total_players,
          (SELECT COUNT(*) FROM games) as total_games,
          (SELECT COUNT(DISTINCT tournament_id) FROM players WHERE created_at >= date('now', '-30 days')) as active_tournaments_30d,
          (SELECT COUNT(*) FROM players WHERE created_at >= date('now', '-30 days')) as new_players_30d
      `;
      
      db.get(query, [], (err, row) => {
        if (err) return reject(err);
        resolve(row || {});
      });
    });
  }

  /**
   * Get popular features usage
   */
  async getPopularFeatures() {
    // This would track feature usage in a real implementation
    return {
      liveStandings: { usage: 85, satisfaction: 4.2 },
      qrCodes: { usage: 72, satisfaction: 4.5 },
      playerProfiles: { usage: 68, satisfaction: 4.3 },
      smsNotifications: { usage: 45, satisfaction: 4.1 },
      paymentProcessing: { usage: 38, satisfaction: 4.0 }
    };
  }

  // Helper methods for calculations
  calculateRatingImprovements(players) {
    // Calculate rating improvements based on performance
    return players.map(player => ({
      name: player.name,
      rating: player.rating,
      score: player.score,
      expectedScore: this.calculateExpectedScore(player.rating, players),
      improvement: (player.score || 0) - this.calculateExpectedScore(player.rating, players)
    }));
  }

  calculateExpectedScore(rating, players) {
    const avgRating = players.reduce((sum, p) => sum + (p.rating || 0), 0) / players.length;
    return 0.5 + (rating - avgRating) / 400;
  }

  calculateSectionBreakdown(players) {
    const sections = {};
    players.forEach(player => {
      const section = player.section || 'Unknown';
      sections[section] = (sections[section] || 0) + 1;
    });
    return sections;
  }

  calculateTeamStatistics(players) {
    const teams = {};
    players.forEach(player => {
      if (player.team_name) {
        if (!teams[player.team_name]) {
          teams[player.team_name] = { count: 0, totalScore: 0 };
        }
        teams[player.team_name].count++;
        teams[player.team_name].totalScore += player.score || 0;
      }
    });
    return teams;
  }

  calculatePairingQuality(pairings) {
    const totalPairings = pairings.reduce((sum, p) => sum + p.total_pairings, 0);
    const mismatchedPairings = pairings.reduce((sum, p) => sum + p.mismatched_pairings, 0);
    return {
      qualityScore: ((totalPairings - mismatchedPairings) / totalPairings) * 100,
      averageRatingDiff: pairings.reduce((sum, p) => sum + p.avg_rating_diff, 0) / pairings.length
    };
  }

  calculateColorBalance(tournamentId) {
    // This would calculate color balance from pairings data
    return { white: 50, black: 50, balanced: true };
  }

  calculateRatingRanges(players) {
    const ranges = {
      '0-1000': 0,
      '1000-1200': 0,
      '1200-1400': 0,
      '1400-1600': 0,
      '1600-1800': 0,
      '1800-2000': 0,
      '2000+': 0
    };

    players.forEach(player => {
      const rating = player.rating || 0;
      if (rating < 1000) ranges['0-1000']++;
      else if (rating < 1200) ranges['1000-1200']++;
      else if (rating < 1400) ranges['1200-1400']++;
      else if (rating < 1600) ranges['1400-1600']++;
      else if (rating < 1800) ranges['1600-1800']++;
      else if (rating < 2000) ranges['1800-2000']++;
      else ranges['2000+']++;
    });

    return ranges;
  }

  createRatingHistogram(players) {
    const bins = 20;
    const minRating = Math.min(...players.map(p => p.rating || 0));
    const maxRating = Math.max(...players.map(p => p.rating || 0));
    const binSize = (maxRating - minRating) / bins;
    
    const histogram = Array(bins).fill(0);
    players.forEach(player => {
      const bin = Math.floor((player.rating - minRating) / binSize);
      if (bin >= 0 && bin < bins) histogram[bin]++;
    });
    
    return histogram.map((count, index) => ({
      rating: minRating + (index * binSize),
      count
    }));
  }

  calculatePercentiles(players) {
    const ratings = players.map(p => p.rating || 0).sort((a, b) => a - b);
    return {
      p25: ratings[Math.floor(ratings.length * 0.25)],
      p50: ratings[Math.floor(ratings.length * 0.5)],
      p75: ratings[Math.floor(ratings.length * 0.75)],
      p90: ratings[Math.floor(ratings.length * 0.9)],
      p95: ratings[Math.floor(ratings.length * 0.95)]
    };
  }

  calculateSectionDistribution(players) {
    const sections = {};
    players.forEach(player => {
      const section = player.section || 'Unknown';
      sections[section] = (sections[section] || 0) + 1;
    });
    return sections;
  }

  calculatePerformanceByRating(players) {
    const ratingGroups = {};
    players.forEach(player => {
      const rating = Math.floor((player.rating || 0) / 100) * 100;
      if (!ratingGroups[rating]) {
        ratingGroups[rating] = { count: 0, totalScore: 0 };
      }
      ratingGroups[rating].count++;
      ratingGroups[rating].totalScore += player.score || 0;
    });
    
    return Object.entries(ratingGroups).map(([rating, data]) => ({
      rating: parseInt(rating),
      count: data.count,
      averageScore: data.totalScore / data.count
    }));
  }

  calculateUpsets(players) {
    // Calculate upsets based on rating differences and results
    return players.filter(player => {
      const expectedScore = this.calculateExpectedScore(player.rating, players);
      return (player.score || 0) > expectedScore + 0.5;
    }).length;
  }

  calculateConsistency(players) {
    // Calculate consistency based on score variance
    const scores = players.map(p => p.score || 0);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  calculateImprovement(players) {
    // Calculate improvement over tournament
    return players.map(player => ({
      name: player.name,
      startRating: player.rating,
      endRating: player.rating + ((player.score || 0) - 0.5) * 32, // Simplified rating change
      improvement: ((player.score || 0) - 0.5) * 32
    }));
  }

  calculateDurationByRound(games) {
    const roundDurations = {};
    games.forEach(game => {
      if (!roundDurations[game.round]) {
        roundDurations[game.round] = [];
      }
      roundDurations[game.round].push(game.duration_minutes);
    });
    
    return Object.entries(roundDurations).map(([round, durations]) => ({
      round: parseInt(round),
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations)
    }));
  }

  calculateDurationBySection(games) {
    const sectionDurations = {};
    games.forEach(game => {
      if (!sectionDurations[game.section]) {
        sectionDurations[game.section] = [];
      }
      sectionDurations[game.section].push(game.duration_minutes);
    });
    
    return Object.entries(sectionDurations).map(([section, durations]) => ({
      section,
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      count: durations.length
    }));
  }

  calculateDurationByResult(games) {
    const resultDurations = {};
    games.forEach(game => {
      if (!resultDurations[game.result]) {
        resultDurations[game.result] = [];
      }
      resultDurations[game.result].push(game.duration_minutes);
    });
    
    return Object.entries(resultDurations).map(([result, durations]) => ({
      result,
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      count: durations.length
    }));
  }

  createTimeDistribution(games) {
    const durations = games.map(g => g.duration_minutes).sort((a, b) => a - b);
    const bins = 10;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const binSize = (max - min) / bins;
    
    const distribution = Array(bins).fill(0);
    durations.forEach(duration => {
      const bin = Math.floor((duration - min) / binSize);
      if (bin >= 0 && bin < bins) distribution[bin]++;
    });
    
    return distribution.map((count, index) => ({
      time: min + (index * binSize),
      count
    }));
  }

  calculateCompetitiveness(sections) {
    return sections.map(section => ({
      section: section.section,
      competitiveness: section.avg_score / section.player_count,
      tightness: 1 - (section.avg_score / section.player_count)
    }));
  }

  compareSections(sections) {
    return {
      mostCompetitive: sections.reduce((max, s) => s.avg_score > max.avg_score ? s : max),
      leastCompetitive: sections.reduce((min, s) => s.avg_score < min.avg_score ? s : min),
      largest: sections.reduce((max, s) => s.player_count > max.player_count ? s : max),
      smallest: sections.reduce((min, s) => s.player_count < min.player_count ? s : min)
    };
  }

  calculatePrizeDistribution(tournament) {
    return {
      totalPrizeFund: tournament.prize_fund || 0,
      totalPrizes: tournament.total_prizes || 0,
      averagePrize: (tournament.prize_fund || 0) / (tournament.total_prizes || 1),
      prizePerPlayer: (tournament.prize_fund || 0) / (tournament.total_players || 1)
    };
  }

  calculateCostAnalysis(tournament) {
    const revenue = (tournament.entry_fee || 0) * (tournament.total_players || 0);
    const prizeFund = tournament.prize_fund || 0;
    const netRevenue = revenue - prizeFund;
    
    return {
      revenue,
      prizeFund,
      netRevenue,
      prizePercentage: (prizeFund / revenue) * 100,
      profitMargin: (netRevenue / revenue) * 100
    };
  }

  calculateProfitability(tournament) {
    const revenue = (tournament.entry_fee || 0) * (tournament.total_players || 0);
    const prizeFund = tournament.prize_fund || 0;
    const netRevenue = revenue - prizeFund;
    
    return {
      profitable: netRevenue > 0,
      roi: (netRevenue / revenue) * 100,
      breakEvenPlayers: Math.ceil(prizeFund / (tournament.entry_fee || 1))
    };
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new AnalyticsService();