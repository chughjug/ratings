const axios = require('axios');

class LichessService {
  constructor() {
    this.baseURL = 'https://lichess.org/api';
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Rate limiting to respect Lichess API limits
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
   * Get player profile from Lichess
   * @param {string} username - Lichess username
   * @returns {Promise<Object>} - Player profile data
   */
  async getPlayerProfile(username) {
    try {
      const cacheKey = `profile_${username}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/user/${username}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
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
        createdAt: profile.createdAt,
        lastSeenAt: profile.lastSeenAt,
        seenAt: profile.seenAt,
        playTime: profile.playTime,
        language: profile.language,
        profile: profile.profile || {},
        completionRate: profile.completionRate,
        count: profile.count || {},
        followable: profile.followable || false,
        following: profile.following || false,
        blocking: profile.blocking || false,
        followsYou: profile.followsYou || false,
        stats: stats,
        recentGames: games
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Lichess player profile:', error);
      throw new Error(`Failed to fetch Lichess profile for ${username}: ${error.message}`);
    }
  }

  /**
   * Get player statistics from Lichess
   * @param {string} username - Lichess username
   * @returns {Promise<Object>} - Player statistics
   */
  async getPlayerStats(username) {
    try {
      const cacheKey = `stats_${username}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/user/${username}/rating-history`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const ratingHistory = response.data;

      // Get current ratings
      const profile = await this.getPlayerProfile(username);
      const ratings = profile.perfs || {};

      const result = {
        rapid: this.extractRating(ratings.rapid),
        blitz: this.extractRating(ratings.blitz),
        bullet: this.extractRating(ratings.bullet),
        classical: this.extractRating(ratings.classical),
        puzzle: this.extractRating(ratings.puzzle),
        totalGames: this.calculateTotalGames(ratings),
        winRate: this.calculateWinRate(ratings),
        bestRating: this.getBestRating(ratings),
        currentRating: this.getCurrentRating(ratings),
        ratingHistory: this.processRatingHistory(ratingHistory)
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Lichess player stats:', error);
      return {
        rapid: null,
        blitz: null,
        bullet: null,
        classical: null,
        puzzle: null,
        totalGames: 0,
        winRate: 0,
        bestRating: 0,
        currentRating: 0,
        ratingHistory: []
      };
    }
  }

  /**
   * Get player games from Lichess
   * @param {string} username - Lichess username
   * @param {number} limit - Number of games to fetch
   * @returns {Promise<Array>} - Recent games
   */
  async getPlayerGames(username, limit = 10) {
    try {
      const cacheKey = `games_${username}_${limit}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/games/user/${username}`, {
        params: {
          max: limit,
          rated: true
        },
        headers: {
          'Accept': 'application/x-ndjson'
        }
      });

      const games = response.data.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      const result = games.map(game => ({
        id: game.id,
        url: `https://lichess.org/${game.id}`,
        timeControl: game.clock?.initial ? `${game.clock.initial / 60}+${game.clock.increment}` : 'Unknown',
        timeClass: game.speed,
        rules: game.rules,
        variant: game.variant,
        white: {
          username: game.players.white.user.name,
          rating: game.players.white.rating,
          result: game.players.white.result
        },
        black: {
          username: game.players.black.user.name,
          rating: game.players.black.rating,
          result: game.players.black.result
        },
        createdAt: game.createdAt,
        lastMoveAt: game.lastMoveAt,
        rated: game.rated,
        status: game.status,
        winner: game.winner,
        fen: game.fen,
        pgn: game.pgn
      }));

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Lichess player games:', error);
      return [];
    }
  }

  /**
   * Search for players on Lichess
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Search results
   */
  async searchPlayers(query) {
    try {
      const cacheKey = `search_${query}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      // Lichess doesn't have a direct search API, so we'll use the leaderboard
      const response = await axios.get(`${this.baseURL}/player/top/50/classical`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const leaderboard = response.data;

      const results = leaderboard.users
        .filter(user => 
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          (user.name && user.name.toLowerCase().includes(query.toLowerCase()))
        )
        .map(user => ({
          username: user.username,
          name: user.name || user.username,
          rating: user.perfs.classical.rating,
          title: user.title || null,
          country: user.country || null,
          source: 'lichess'
        }));

      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Error searching Lichess players:', error);
      return [];
    }
  }

  /**
   * Get tournament information from Lichess
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Tournament data
   */
  async getTournament(tournamentId) {
    try {
      const cacheKey = `tournament_${tournamentId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/tournament/${tournamentId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const tournament = response.data;

      const result = {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        url: `https://lichess.org/tournament/${tournament.id}`,
        status: tournament.status,
        createdAt: tournament.createdAt,
        startsAt: tournament.startsAt,
        finishesAt: tournament.finishesAt,
        timeControl: tournament.clock,
        variant: tournament.variant,
        rated: tournament.rated,
        system: tournament.system,
        players: tournament.players || [],
        rounds: tournament.rounds || [],
        prizes: tournament.prizes || []
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Lichess tournament:', error);
      throw new Error(`Failed to fetch Lichess tournament ${tournamentId}: ${error.message}`);
    }
  }

  /**
   * Get live games from Lichess
   * @returns {Promise<Array>} - Live games
   */
  async getLiveGames() {
    try {
      const cacheKey = 'live_games';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/stream/games`, {
        headers: {
          'Accept': 'application/x-ndjson'
        }
      });

      const games = response.data.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      const result = games.map(game => ({
        id: game.id,
        url: `https://lichess.org/${game.id}`,
        timeControl: game.clock ? `${game.clock.initial / 60}+${game.clock.increment}` : 'Unknown',
        timeClass: game.speed,
        variant: game.variant,
        white: {
          username: game.players.white.user.name,
          rating: game.players.white.rating
        },
        black: {
          username: game.players.black.user.name,
          rating: game.players.black.rating
        },
        createdAt: game.createdAt,
        rated: game.rated,
        fen: game.fen
      }));

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Lichess live games:', error);
      return [];
    }
  }

  /**
   * Get puzzle of the day from Lichess
   * @returns {Promise<Object>} - Puzzle data
   */
  async getPuzzleOfTheDay() {
    try {
      const cacheKey = 'puzzle_daily';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/puzzle/daily`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const puzzle = response.data;

      const result = {
        id: puzzle.id,
        url: `https://lichess.org/training/${puzzle.id}`,
        rating: puzzle.rating,
        plays: puzzle.plays,
        solution: puzzle.solution,
        themes: puzzle.themes || [],
        gameUrl: puzzle.gameUrl,
        pgn: puzzle.pgn,
        fen: puzzle.fen,
        color: puzzle.color
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Lichess puzzle:', error);
      throw new Error(`Failed to fetch Lichess puzzle: ${error.message}`);
    }
  }

  /**
   * Get team information from Lichess
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} - Team data
   */
  async getTeam(teamId) {
    try {
      const cacheKey = `team_${teamId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/team/${teamId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const team = response.data;

      const result = {
        id: team.id,
        name: team.name,
        description: team.description,
        url: `https://lichess.org/team/${team.id}`,
        open: team.open,
        leader: team.leader,
        leaders: team.leaders || [],
        nbMembers: team.nbMembers,
        createdAt: team.createdAt,
        members: team.members || []
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Lichess team:', error);
      throw new Error(`Failed to fetch Lichess team ${teamId}: ${error.message}`);
    }
  }

  /**
   * Get TV games from Lichess
   * @returns {Promise<Array>} - TV games
   */
  async getTVGames() {
    try {
      const cacheKey = 'tv_games';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      await this.rateLimit();
      
      const response = await axios.get(`${this.baseURL}/tv/channels`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const channels = response.data;

      const result = channels.map(channel => ({
        channel: channel.channel,
        user: channel.user,
        rating: channel.rating,
        timeControl: channel.timeControl,
        variant: channel.variant,
        gameId: channel.gameId,
        url: `https://lichess.org/${channel.gameId}`
      }));

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Lichess TV games:', error);
      return [];
    }
  }

  // Helper methods
  extractRating(ratingData) {
    if (!ratingData) return null;
    return {
      rating: ratingData.rating,
      games: ratingData.games || 0,
      rd: ratingData.rd || 0,
      prog: ratingData.prog || 0,
      prov: ratingData.prov || false
    };
  }

  calculateTotalGames(ratings) {
    let total = 0;
    const timeControls = ['rapid', 'blitz', 'bullet', 'classical'];
    
    timeControls.forEach(tc => {
      if (ratings[tc] && ratings[tc].games) {
        total += ratings[tc].games;
      }
    });
    
    return total;
  }

  calculateWinRate(ratings) {
    // Lichess doesn't provide win/loss data in the same way as Chess.com
    // This is a simplified calculation
    const totalGames = this.calculateTotalGames(ratings);
    if (totalGames === 0) return 0;
    
    // Estimate based on rating progression
    let totalProg = 0;
    const timeControls = ['rapid', 'blitz', 'bullet', 'classical'];
    
    timeControls.forEach(tc => {
      if (ratings[tc] && ratings[tc].prog) {
        totalProg += ratings[tc].prog;
      }
    });
    
    // Rough estimate: positive progression suggests >50% win rate
    return totalProg > 0 ? 55 : 45;
  }

  getBestRating(ratings) {
    let best = 0;
    const timeControls = ['rapid', 'blitz', 'bullet', 'classical'];
    
    timeControls.forEach(tc => {
      if (ratings[tc] && ratings[tc].rating > best) {
        best = ratings[tc].rating;
      }
    });
    
    return best;
  }

  getCurrentRating(ratings) {
    // Return the highest current rating across all time controls
    let current = 0;
    const timeControls = ['rapid', 'blitz', 'bullet', 'classical'];
    
    timeControls.forEach(tc => {
      if (ratings[tc] && ratings[tc].rating > current) {
        current = ratings[tc].rating;
      }
    });
    
    return current;
  }

  processRatingHistory(ratingHistory) {
    return ratingHistory.map(entry => ({
      name: entry.name,
      points: entry.points,
      date: entry.date
    }));
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
   * Test Lichess API connection
   * @returns {Promise<Object>} - Connection status
   */
  async testConnection() {
    try {
      await this.rateLimit();
      const response = await axios.get(`${this.baseURL}/user/magnuscarlsen`);
      return {
        success: true,
        message: 'Lichess API connection successful',
        responseTime: Date.now() - this.lastRequestTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Lichess API connection failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = new LichessService();
