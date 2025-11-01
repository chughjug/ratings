const axios = require('axios');

/**
 * Lichess Swiss Tournament Integration
 * 
 * This module handles creating Swiss tournaments on Lichess and retrieving
 * the auto-generated pairings per round.
 * 
 * Based on the Lichess Swiss API documentation:
 * https://lichess.org/api#tag/Swiss-tournaments
 */
class LichessSwissIntegration {
  constructor(config = {}) {
    this.apiBaseUrl = config.apiBaseUrl || 'https://lichess.org/api';
    this.token = config.token;
  }

  /**
   * Create a new Swiss tournament on Lichess
   * 
   * @param {Object} tournamentConfig - Tournament configuration
   * @param {string} tournamentConfig.teamId - Lichess team slug (required)
   * @param {string} tournamentConfig.name - Tournament name (required)
   * @param {Object} tournamentConfig.clock - Clock settings {limit: seconds, increment: seconds}
   * @param {string} tournamentConfig.variant - Chess variant (default: 'standard')
   * @param {boolean} tournamentConfig.rated - Whether rated (default: true)
   * @param {number} tournamentConfig.nbRounds - Number of rounds
   * @param {number} tournamentConfig.minutes - Tournament duration in minutes
   * @param {number} tournamentConfig.startsAt - Start time (Unix timestamp in ms)
   * @param {string} tournamentConfig.description - Tournament description (Markdown)
   * @param {Object} tournamentConfig.pause - Pause settings
   * @param {string} tournamentConfig.password - Tournament password
   * @returns {Promise<Object>} { success: boolean, id?: string, error?: string }
   */
  async createSwissTournament(tournamentConfig) {
    try {
      if (!this.token) {
        throw new Error('Lichess API token is required');
      }

      const requiredFields = ['teamId', 'name', 'clock'];
      for (const field of requiredFields) {
        if (!tournamentConfig[field]) {
          throw new Error(`Required field missing: ${field}`);
        }
      }

      // Prepare form data
      const params = new URLSearchParams();
      params.append('teamId', tournamentConfig.teamId);
      params.append('name', tournamentConfig.name);
      // Ensure clock values are integers
      const clockLimit = parseInt(tournamentConfig.clock.limit);
      const clockIncrement = parseInt(tournamentConfig.clock.increment);
      
      if (isNaN(clockLimit) || isNaN(clockIncrement)) {
        throw new Error('Clock limit and increment must be valid integers');
      }
      
      params.append('clock', JSON.stringify({
        limit: clockLimit,
        increment: clockIncrement
      }));
      params.append('variant', tournamentConfig.variant || 'standard');
      // Lichess expects rated as 'true' or 'false' string
      const ratedValue = tournamentConfig.rated !== undefined ? tournamentConfig.rated : true;
      params.append('rated', ratedValue ? 'true' : 'false');

      if (tournamentConfig.nbRounds) {
        params.append('nbRounds', tournamentConfig.nbRounds);
      }
      if (tournamentConfig.minutes) {
        params.append('minutes', tournamentConfig.minutes);
      }
      if (tournamentConfig.startsAt) {
        params.append('startsAt', tournamentConfig.startsAt);
      }
      if (tournamentConfig.description) {
        params.append('description', tournamentConfig.description);
      }
      if (tournamentConfig.pause) {
        params.append('pause', JSON.stringify(tournamentConfig.pause));
      }
      if (tournamentConfig.password) {
        params.append('password', tournamentConfig.password);
      }

      console.log('[Lichess] Creating Swiss tournament with params:', params.toString());
      console.log('[Lichess] API URL:', `${this.apiBaseUrl}/swiss/new`);
      
      const response = await axios.post(
        `${this.apiBaseUrl}/swiss/new`,
        params.toString(),
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response.data && response.data.ok && response.data.id) {
        return {
          success: true,
          id: response.data.id,
          publicUrl: `https://lichess.org/swiss/${response.data.id}`
        };
      } else {
        return {
          success: false,
          error: 'Failed to create tournament: Invalid response from Lichess'
        };
      }
    } catch (error) {
      console.error('Error creating Lichess Swiss tournament:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error config:', error.config);
      
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create tournament'
      };
    }
  }

  /**
   * Get Swiss tournament information
   * 
   * @param {string} tournamentId - Lichess tournament ID
   * @returns {Promise<Object>} Tournament info including current round and pairings
   */
  async getSwissTournament(tournamentId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/swiss/${tournamentId}`,
        {
          headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting Lichess Swiss tournament:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get pairings for a specific round
   * 
   * @param {string} tournamentId - Lichess tournament ID
   * @param {number} roundNum - Round number (1-indexed)
   * @returns {Promise<Object>} Round pairings and games
   */
  async getRoundPairings(tournamentId, roundNum) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/swiss/${tournamentId}/${roundNum}`,
        {
          headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting round pairings:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get current standings
   * 
   * @param {string} tournamentId - Lichess tournament ID
   * @returns {Promise<Object>} Array of players with standings
   */
  async getStandings(tournamentId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/swiss/${tournamentId}/standings`,
        {
          headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error getting standings:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get all players in the tournament
   * 
   * @param {string} tournamentId - Lichess tournament ID
   * @returns {Promise<Object>} Array of players (ND-JSON format)
   */
  async getPlayers(tournamentId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/swiss/${tournamentId}/players`,
        {
          headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
          responseType: 'text' // ND-JSON format
        }
      );

      // Parse ND-JSON (newline-delimited JSON)
      const players = response.data
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      return {
        success: true,
        data: players
      };
    } catch (error) {
      console.error('Error getting players:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get all games from the tournament
   * 
   * @param {string} tournamentId - Lichess tournament ID
   * @returns {Promise<Object>} Array of games (ND-JSON format)
   */
  async getGames(tournamentId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/swiss/${tournamentId}/games`,
        {
          headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
          responseType: 'text' // ND-JSON format
        }
      );

      // Parse ND-JSON
      const games = response.data
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      return {
        success: true,
        data: games
      };
    } catch (error) {
      console.error('Error getting games:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Convert Lichess round pairings to internal format
   * 
   * @param {Array} lichessPairings - Pairings from Lichess API
   * @returns {Array} Converted pairings in internal format
   */
  convertPairingsToInternalFormat(lichessPairings) {
    return lichessPairings.map((pairing, index) => ({
      board: index + 1,
      white_player_id: pairing.white || null,
      black_player_id: pairing.black || null,
      lichess_game_id: pairing.game?.id || null,
      lichess_game_url: pairing.game?.id ? `https://lichess.org/${pairing.game.id}` : null,
      result: null, // Result will be updated when game finishes
      is_bye: !pairing.white || !pairing.black
    }));
  }

  /**
   * Convert Lichess game result to internal format
   * 
   * @param {string} winner - 'white', 'black', or null for draw
   * @returns {string} Internal result format: '1-0', '0-1', or '1/2-1/2'
   */
  convertGameResult(winner) {
    if (!winner) return '1/2-1/2';
    return winner === 'white' ? '1-0' : '0-1';
  }
}

module.exports = LichessSwissIntegration;

