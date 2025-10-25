const axios = require('axios');

class ChessComService {
  constructor() {
    this.baseURL = 'https://api.chess.com/pub';
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Rate limiting to respect Chess.com API limits
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => 
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get player profile from Chess.com
   * @param {string} username - Chess.com username
   * @returns {Promise<Object>} - Player profile data
   */
  async getPlayerProfile(username) {
    try {
      const cacheKey = `profile_${username}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/player/${username}`);
      const profile = response.data;

      // Get additional stats
      const [stats, games] = await Promise.all([
        this.getPlayerStats(username),
        this.getPlayerGames(username, 1) // Get recent games
      ]);

      const result = {
        username: profile.username,
        name: profile.name || profile.username,
        title: profile.title || null,
        avatar: profile.avatar || null,
        location: profile.location || null,
        country: profile.country || null,
        joined: profile.joined,
        lastOnline: profile.last_online,
        followers: profile.followers,
        isStreamer: profile.is_streamer || false,
        twitchUrl: profile.twitch_url || null,
        stats: stats,
        recentGames: games
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Chess.com player profile:', error);
      throw new Error(`Failed to fetch Chess.com profile for ${username}: ${error.message}`);
    }
  }

  /**
   * Get player statistics from Chess.com
   * @param {string} username - Chess.com username
   * @returns {Promise<Object>} - Player statistics
   */
  async getPlayerStats(username) {
    try {
      const cacheKey = `stats_${username}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/player/${username}/stats`);
      const stats = response.data;

      const result = {
        rapid: this.extractRating(stats.chess_rapid),
        blitz: this.extractRating(stats.chess_blitz),
        bullet: this.extractRating(stats.chess_bullet),
        daily: this.extractRating(stats.chess_daily),
        puzzle: this.extractRating(stats.tactics),
        lessons: this.extractRating(stats.lessons),
        totalGames: this.calculateTotalGames(stats),
        winRate: this.calculateWinRate(stats),
        bestRating: this.getBestRating(stats),
        currentRating: this.getCurrentRating(stats)
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Chess.com player stats:', error);
      return {
        rapid: null,
        blitz: null,
        bullet: null,
        daily: null,
        puzzle: null,
        lessons: null,
        totalGames: 0,
        winRate: 0,
        bestRating: 0,
        currentRating: 0
      };
    }
  }

  /**
   * Get player games from Chess.com
   * @param {string} username - Chess.com username
   * @param {number} limit - Number of games to fetch
   * @returns {Promise<Array>} - Recent games
   */
  async getPlayerGames(username, limit = 10) {
    try {
      const cacheKey = `games_${username}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/player/${username}/games/2024/12`);
      const games = response.data.games || [];

      const result = games.slice(0, limit).map(game => ({
        url: game.url,
        timeControl: game.time_control,
        timeClass: game.time_class,
        rules: game.rules,
        white: {
          username: game.white.username,
          rating: game.white.rating,
          result: game.white.result
        },
        black: {
          username: game.black.username,
          rating: game.black.rating,
          result: game.black.result
        },
        endTime: game.end_time,
        rated: game.rated,
        fen: game.fen,
        pgn: game.pgn
      }));

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Chess.com player games:', error);
      return [];
    }
  }

  /**
   * Search for players on Chess.com
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Search results
   */
  async searchPlayers(query) {
    try {
      const cacheKey = `search_${query}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      // Chess.com doesn't have a direct search API, so we'll simulate it
      // In a real implementation, you might use their leaderboard or other endpoints
      const response = await axios.get(`${this.baseURL}/leaderboards`);
      const leaderboards = response.data;

      const results = [];
      
      // Search in rapid leaderboard
      if (leaderboards.live_rapid) {
        const rapidPlayers = leaderboards.live_rapid.slice(0, 50);
        const matches = rapidPlayers.filter(player => 
          player.username.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...matches.map(player => ({
          username: player.username,
          name: player.name || player.username,
          rating: player.rating,
          title: player.title || null,
          country: player.country || null,
          source: 'chess.com'
        })));
      }

      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Error searching Chess.com players:', error);
      return [];
    }
  }

  /**
   * Get tournament information from Chess.com
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Tournament data
   */
  async getTournament(tournamentId) {
    try {
      const cacheKey = `tournament_${tournamentId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/tournament/${tournamentId}`);
      const tournament = response.data;

      const result = {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        url: tournament.url,
        status: tournament.status,
        startTime: tournament.start_time,
        endTime: tournament.end_time,
        timeControl: tournament.time_control,
        timeClass: tournament.time_class,
        rules: tournament.rules,
        players: tournament.players || [],
        rounds: tournament.rounds || [],
        prizes: tournament.prizes || []
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Chess.com tournament:', error);
      throw new Error(`Failed to fetch Chess.com tournament ${tournamentId}: ${error.message}`);
    }
  }

  /**
   * Get live games from Chess.com
   * @returns {Promise<Array>} - Live games
   */
  async getLiveGames() {
    try {
      const cacheKey = 'live_games';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/games`);
      const games = response.data.games || [];

      const result = games.map(game => ({
        id: game.id,
        url: game.url,
        timeControl: game.time_control,
        timeClass: game.time_class,
        rules: game.rules,
        white: {
          username: game.white.username,
          rating: game.white.rating
        },
        black: {
          username: game.black.username,
          rating: game.black.rating
        },
        startTime: game.start_time,
        rated: game.rated,
        fen: game.fen
      }));

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Chess.com live games:', error);
      return [];
    }
  }

  /**
   * Get puzzle of the day from Chess.com
   * @returns {Promise<Object>} - Puzzle data
   */
  async getPuzzleOfTheDay() {
    try {
      const cacheKey = 'puzzle_daily';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/puzzle`);
      const puzzle = response.data;

      const result = {
        title: puzzle.title,
        url: puzzle.url,
        image: puzzle.image,
        solution: puzzle.solution,
        rating: puzzle.rating,
        ratingDeviation: puzzle.rating_deviation,
        popularity: puzzle.popularity,
        nbPlays: puzzle.nb_plays,
        themes: puzzle.themes || [],
        gameUrl: puzzle.game_url,
        pgn: puzzle.pgn
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Chess.com puzzle:', error);
      throw new Error(`Failed to fetch Chess.com puzzle: ${error.message}`);
    }
  }

  /**
   * Get club information from Chess.com
   * @param {string} clubId - Club ID
   * @returns {Promise<Object>} - Club data
   */
  async getClub(clubId) {
    try {
      const cacheKey = `club_${clubId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/club/${clubId}`);
      const club = response.data;

      const result = {
        id: club.id,
        name: club.name,
        description: club.description,
        url: club.url,
        icon: club.icon,
        memberCount: club.member_count,
        created: club.created,
        visibility: club.visibility,
        joinRequest: club.join_request,
        admin: club.admin,
        members: club.members || []
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Chess.com club:', error);
      throw new Error(`Failed to fetch Chess.com club ${clubId}: ${error.message}`);
    }
  }

  // Helper methods
  extractRating(ratingData) {
    if (!ratingData || !ratingData.last) return null;
    return {
      rating: ratingData.last.rating,
      date: ratingData.last.date,
      best: ratingData.best?.rating || ratingData.last.rating,
      bestDate: ratingData.best?.date || ratingData.last.date,
      record: ratingData.record || { win: 0, loss: 0, draw: 0 }
    };
  }

  calculateTotalGames(stats) {
    let total = 0;
    const timeControls = ['chess_rapid', 'chess_blitz', 'chess_bullet', 'chess_daily'];
    
    timeControls.forEach(tc => {
      if (stats[tc] && stats[tc].record) {
        const record = stats[tc].record;
        total += (record.win || 0) + (record.loss || 0) + (record.draw || 0);
      }
    });
    
    return total;
  }

  calculateWinRate(stats) {
    const totalGames = this.calculateTotalGames(stats);
    if (totalGames === 0) return 0;
    
    let totalWins = 0;
    const timeControls = ['chess_rapid', 'chess_blitz', 'chess_bullet', 'chess_daily'];
    
    timeControls.forEach(tc => {
      if (stats[tc] && stats[tc].record) {
        totalWins += stats[tc].record.win || 0;
      }
    });
    
    return (totalWins / totalGames) * 100;
  }

  getBestRating(stats) {
    let best = 0;
    const timeControls = ['chess_rapid', 'chess_blitz', 'chess_bullet', 'chess_daily'];
    
    timeControls.forEach(tc => {
      if (stats[tc] && stats[tc].best && stats[tc].best.rating > best) {
        best = stats[tc].best.rating;
      }
    });
    
    return best;
  }

  getCurrentRating(stats) {
    // Return the highest current rating across all time controls
    let current = 0;
    const timeControls = ['chess_rapid', 'chess_blitz', 'chess_bullet', 'chess_daily'];
    
    timeControls.forEach(tc => {
      if (stats[tc] && stats[tc].last && stats[tc].last.rating > current) {
        current = stats[tc].last.rating;
      }
    });
    
    return current;
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

  /**
   * Test Chess.com API connection
   * @returns {Promise<Object>} - Connection status
   */
  async testConnection() {
    try {
      await this.rateLimit();
      const response = await axios.get(`${this.baseURL}/player/magnuscarlsen`);
      return {
        success: true,
        message: 'Chess.com API connection successful',
        responseTime: Date.now() - this.lastRequestTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Chess.com API connection failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = new ChessComService();
