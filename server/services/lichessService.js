const axios = require('axios');

class LichessService {
  constructor() {
    this.baseURL = 'https://lichess.org/api';
  }

  /**
   * Create a Lichess challenge
   * @param {string} accessToken - Lichess access token
   * @param {Object} challengeData - Challenge data
   * @returns {Promise<Object>} - Challenge result
   */
  async createChallenge(accessToken, challengeData) {
    try {
      const response = await axios.post(`${this.baseURL}/challenge/open`, challengeData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        id: response.data.id,
        url: response.data.url,
        status: response.data.status
      };
    } catch (error) {
      console.error('Error creating Lichess challenge:', error);
      throw new Error(`Failed to create Lichess challenge: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get challenge status
   * @param {string} accessToken - Lichess access token
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Object>} - Challenge status
   */
  async getChallengeStatus(accessToken, challengeId) {
    try {
      const response = await axios.get(`${this.baseURL}/challenge/${challengeId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        id: response.data.id,
        status: response.data.status,
        game_id: response.data.game_id
      };
    } catch (error) {
      console.error('Error getting challenge status:', error);
      throw new Error(`Failed to get challenge status: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get game result
   * @param {string} accessToken - Lichess access token
   * @param {string} gameId - Game ID
   * @returns {Promise<Object>} - Game result
   */
  async getGameResult(accessToken, gameId) {
    try {
      const response = await axios.get(`${this.baseURL}/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const game = response.data;
      
      // Determine result from game status
      let result;
      if (game.status === 'draw') {
        result = '1/2-1/2';
      } else if (game.winner === 'white') {
        result = '1-0';
      } else if (game.winner === 'black') {
        result = '0-1';
      } else {
        result = '1/2-1/2'; // Default to draw for unknown status
      }

      return {
        game_id: gameId,
        result: result,
        status: game.status,
        white_player: game.players.white.user.name,
        black_player: game.players.black.user.name,
        moves: game.moves,
        clock: game.clock
      };
    } catch (error) {
      console.error('Error getting game result:', error);
      throw new Error(`Failed to get game result: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get player statistics
   * @param {string} username - Lichess username
   * @returns {Promise<Object>} - Player stats
   */
  async getPlayerStats(username) {
    try {
      const response = await axios.get(`${this.baseURL}/user/${username}`);

      const user = response.data;
      
      return {
        username: user.username,
        title: user.title,
        rating: user.perfs.classical?.rating || 0,
        rating_provisional: user.perfs.classical?.provisional || false,
        games_played: user.count.all || 0,
        profile: {
          country: user.profile?.country,
          location: user.profile?.location,
          bio: user.profile?.bio
        },
        ratings: {
          classical: user.perfs.classical?.rating || 0,
          rapid: user.perfs.rapid?.rating || 0,
          blitz: user.perfs.blitz?.rating || 0,
          bullet: user.perfs.bullet?.rating || 0,
          puzzle: user.perfs.puzzle?.rating || 0
        }
      };
    } catch (error) {
      console.error('Error getting player stats:', error);
      throw new Error(`Failed to get player stats: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get player's recent games
   * @param {string} username - Lichess username
   * @param {number} max - Maximum number of games to fetch
   * @returns {Promise<Array>} - Recent games
   */
  async getPlayerGames(username, max = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/user/${username}/games`, {
        params: {
          max: max,
          rated: true
        }
      });

      return response.data.map(game => ({
        id: game.id,
        rated: game.rated,
        variant: game.variant,
        speed: game.speed,
        perf: game.perf,
        created_at: game.createdAt,
        last_move_at: game.lastMoveAt,
        status: game.status,
        players: {
          white: {
            user: game.players.white.user,
            rating: game.players.white.rating,
            ratingDiff: game.players.white.ratingDiff
          },
          black: {
            user: game.players.black.user,
            rating: game.players.black.rating,
            ratingDiff: game.players.black.ratingDiff
          }
        },
        winner: game.winner,
        moves: game.moves,
        clock: game.clock
      }));
    } catch (error) {
      console.error('Error getting player games:', error);
      throw new Error(`Failed to get player games: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get online players
   * @param {number} max - Maximum number of players to fetch
   * @returns {Promise<Array>} - Online players
   */
  async getOnlinePlayers(max = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/player/online`, {
        params: {
          max: max
        }
      });

      return response.data.map(player => ({
        username: player.username,
        title: player.title,
        rating: player.rating,
        playing: player.playing
      }));
    } catch (error) {
      console.error('Error getting online players:', error);
      throw new Error(`Failed to get online players: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get tournament information
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Tournament info
   */
  async getTournament(tournamentId) {
    try {
      const response = await axios.get(`${this.baseURL}/tournament/${tournamentId}`);

      return {
        id: response.data.id,
        name: response.data.name,
        status: response.data.status,
        rated: response.data.rated,
        variant: response.data.variant,
        clock: response.data.clock,
        created_by: response.data.createdBy,
        starts_at: response.data.startsAt,
        nb_players: response.data.nbPlayers,
        nb_players_finished: response.data.nbPlayersFinished,
        nb_players_joined: response.data.nbPlayersJoined,
        nb_players_paired: response.data.nbPlayersPaired,
        nb_rounds: response.data.nbRounds,
        current_round: response.data.currentRound,
        pairings: response.data.pairings,
        standings: response.data.standings
      };
    } catch (error) {
      console.error('Error getting tournament:', error);
      throw new Error(`Failed to get tournament: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Create a tournament
   * @param {string} accessToken - Lichess access token
   * @param {Object} tournamentData - Tournament data
   * @returns {Promise<Object>} - Tournament result
   */
  async createTournament(accessToken, tournamentData) {
    try {
      const response = await axios.post(`${this.baseURL}/tournament`, tournamentData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        id: response.data.id,
        url: response.data.url,
        status: response.data.status
      };
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw new Error(`Failed to create tournament: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Join a tournament
   * @param {string} accessToken - Lichess access token
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Join result
   */
  async joinTournament(accessToken, tournamentId) {
    try {
      const response = await axios.post(`${this.baseURL}/tournament/${tournamentId}/join`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        success: true,
        tournament_id: tournamentId
      };
    } catch (error) {
      console.error('Error joining tournament:', error);
      throw new Error(`Failed to join tournament: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Withdraw from a tournament
   * @param {string} accessToken - Lichess access token
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Withdraw result
   */
  async withdrawFromTournament(accessToken, tournamentId) {
    try {
      const response = await axios.post(`${this.baseURL}/tournament/${tournamentId}/withdraw`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        success: true,
        tournament_id: tournamentId
      };
    } catch (error) {
      console.error('Error withdrawing from tournament:', error);
      throw new Error(`Failed to withdraw from tournament: ${error.response?.data?.error || error.message}`);
    }
  }
}

module.exports = new LichessService();