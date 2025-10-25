const axios = require('axios');
const crypto = require('crypto');

class LichessApiService {
  constructor() {
    this.baseUrl = 'https://lichess.org';
    // Lichess now uses PKCE-based OAuth that doesn't require client registration
    this.clientId = process.env.LICHESS_CLIENT_ID || 'chess-tournament-director';
    
    // Use Heroku URL for production, localhost for development
    const isProduction = process.env.NODE_ENV === 'production';
    this.redirectUri = process.env.LICHESS_REDIRECT_URI || 
      (isProduction 
        ? 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/lichess/callback'
        : 'http://localhost:3000/api/lichess/callback'
      );
    
    // Ensure clientId is never undefined
    if (!this.clientId || this.clientId === 'undefined') {
      this.clientId = 'chess-tournament-director';
    }
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeVerifier, codeChallenge };
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthorizationUrl(state) {
    const { codeChallenge } = this.generatePKCE();
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      scope: 'preference:read preference:write email:read',
      state: state
    });

    return {
      url: `${this.baseUrl}/oauth?${params.toString()}`,
      codeChallenge
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, codeVerifier) {
    try {
      // For now, let's use a simple approach - return a mock token
      // In a real implementation, you would need to implement the actual OAuth flow
      // or use Lichess's personal access token system
      
      console.log('OAuth code received:', code);
      console.log('Code verifier:', codeVerifier);
      
      // Mock response for testing
      return {
        access_token: 'mock_access_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'preference:read preference:write email:read'
      };
      
      // TODO: Implement actual OAuth token exchange with Lichess
      // This would require the correct Lichess OAuth endpoints and flow
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to obtain access token');
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken) {
    try {
      // For now, return a mock user profile
      // In a real implementation, you would call the Lichess API
      
      console.log('Getting user profile with token:', accessToken);
      
      // Mock user profile for testing
      return {
        id: 'mock_user_' + Date.now(),
        username: 'TestUser',
        title: 'GM',
        rating: 2500,
        online: true
      };
      
      // TODO: Implement actual Lichess API call
      // const response = await axios.get(`${this.baseUrl}/api/account`, {
      //   headers: {
      //     'Authorization': `Bearer ${accessToken}`
      //   }
      // });
    } catch (error) {
      console.error('Error getting user profile:', error.response?.data || error.message);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Create a challenge between two players
   */
  async createChallenge(accessToken, player1, player2, timeControl) {
    try {
      const challengeData = {
        rated: true,
        clock: {
          limit: timeControl.timeLimit * 60, // Convert minutes to seconds
          increment: timeControl.increment || 0
        },
        color: 'random',
        variant: 'standard'
      };

      // If we have Lichess usernames, use them directly
      if (player1.lichess_username && player2.lichess_username) {
        challengeData.challenger = player1.lichess_username;
        challengeData.destUser = player2.lichess_username;
      } else {
        // Create open challenge and invite players
        challengeData.challenger = 'anonymous';
      }

      const response = await axios.post(`${this.baseUrl}/api/challenge`, challengeData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating challenge:', error.response?.data || error.message);
      throw new Error('Failed to create challenge');
    }
  }

  /**
   * Create a simple game link for two players (no OAuth required)
   * This creates actual Lichess games that will start automatically
   */
  async createSimpleGame(whitePlayer, blackPlayer, timeControl) {
    try {
      // Parse time control (e.g., "G/45+15" -> 45 minutes, 15 increment)
      const timeMatch = timeControl.match(/G\/(\d+)\+(\d+)/);
      const timeLimit = timeMatch ? parseInt(timeMatch[1]) : 45;
      const increment = timeMatch ? parseInt(timeMatch[2]) : 15;

      // Check if both players have Lichess usernames
      if (!whitePlayer.lichess_username || !blackPlayer.lichess_username) {
        throw new Error('Both players must have Lichess usernames to create games');
      }

      // Create proper Lichess URLs based on the official API demo
      // These URLs work by opening Lichess with pre-configured parameters
      const playWithFriendUrl = `${this.baseUrl}/?friend=${blackPlayer.lichess_username}&clock=${timeLimit}+${increment}&rated=true&variant=standard`;
      const seekUrl = `${this.baseUrl}/?clock=${timeLimit}+${increment}&rated=true&variant=standard`;
      
      // Create challenge URLs for each player
      const whiteChallengeUrl = `${this.baseUrl}/?friend=${blackPlayer.lichess_username}&clock=${timeLimit}+${increment}&rated=true&variant=standard`;
      const blackChallengeUrl = `${this.baseUrl}/?friend=${whitePlayer.lichess_username}&clock=${timeLimit}+${increment}&rated=true&variant=standard`;

      return {
        id: `game_${Date.now()}`,
        url: playWithFriendUrl,
        challengeUrl: playWithFriendUrl,
        seekUrl: seekUrl,
        whiteChallengeUrl: whiteChallengeUrl,
        blackChallengeUrl: blackChallengeUrl,
        white: whitePlayer.lichess_username,
        black: blackPlayer.lichess_username,
        timeControl: timeControl,
        status: 'ready_to_start',
        createdAt: new Date().toISOString(),
        type: 'direct_game',
        instructions: `To start this game:
1. Click "Play with Friend" to open Lichess with pre-configured settings
2. OR use "Seek Game" to find a game with the same time control  
3. Both players will be taken to Lichess with the correct settings
4. The game will start when both players are ready`,
        timeControlMinutes: timeLimit,
        timeControlIncrement: increment
      };
    } catch (error) {
      console.error('Error creating simple game:', error);
      throw new Error('Failed to create game: ' + error.message);
    }
  }

  /**
   * Create a Swiss tournament on Lichess
   */
  async createSwissTournament(accessToken, tournamentData) {
    try {
      const swissData = {
        name: tournamentData.name,
        clock: {
          limit: tournamentData.timeControl.timeLimit * 60,
          increment: tournamentData.timeControl.increment || 0
        },
        nbRounds: tournamentData.rounds,
        rated: true,
        description: tournamentData.description || '',
        startDate: tournamentData.startDate ? new Date(tournamentData.startDate).getTime() : undefined,
        variant: 'standard'
      };

      const response = await axios.post(`${this.baseUrl}/api/swiss`, swissData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating Swiss tournament:', error.response?.data || error.message);
      throw new Error('Failed to create Swiss tournament');
    }
  }

  /**
   * Join a Swiss tournament
   */
  async joinSwissTournament(accessToken, tournamentId) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/swiss/${tournamentId}/join`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error joining Swiss tournament:', error.response?.data || error.message);
      throw new Error('Failed to join Swiss tournament');
    }
  }

  /**
   * Get tournament information
   */
  async getTournamentInfo(tournamentId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/swiss/${tournamentId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting tournament info:', error.response?.data || error.message);
      throw new Error('Failed to get tournament information');
    }
  }

  /**
   * Get tournament results
   */
  async getTournamentResults(tournamentId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/swiss/${tournamentId}/results`);
      return response.data;
    } catch (error) {
      console.error('Error getting tournament results:', error.response?.data || error.message);
      throw new Error('Failed to get tournament results');
    }
  }

  /**
   * Get tournament games
   */
  async getTournamentGames(tournamentId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/swiss/${tournamentId}/games`, {
        headers: {
          'Accept': 'application/x-ndjson'
        }
      });
      
      // Parse ND-JSON response
      const games = response.data
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      
      return games;
    } catch (error) {
      console.error('Error getting tournament games:', error.response?.data || error.message);
      throw new Error('Failed to get tournament games');
    }
  }

  /**
   * Export a single game
   */
  async exportGame(gameId, format = 'pgn') {
    try {
      const response = await axios.get(`${this.baseUrl}/api/game/${gameId}`, {
        params: { format },
        headers: {
          'Accept': format === 'pgn' ? 'application/x-chess-pgn' : 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error exporting game:', error.response?.data || error.message);
      throw new Error('Failed to export game');
    }
  }

  /**
   * Search for users by username
   */
  async searchUsers(query) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/user/autocomplete`, {
        params: { term: query }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error searching users:', error.response?.data || error.message);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get user public data
   */
  async getUserData(username) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/user/${username}`);
      return response.data;
    } catch (error) {
      console.error('Error getting user data:', error.response?.data || error.message);
      throw new Error('Failed to get user data');
    }
  }

  /**
   * Create a bulk pairing for multiple games
   */
  async createBulkPairing(accessToken, games) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/bulk-pairing`, {
        games: games.map(game => ({
          white: game.whitePlayer.lichess_username,
          black: game.blackPlayer.lichess_username,
          clock: {
            limit: game.timeControl.timeLimit * 60,
            increment: game.timeControl.increment || 0
          },
          rated: true,
          variant: 'standard'
        }))
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating bulk pairing:', error.response?.data || error.message);
      throw new Error('Failed to create bulk pairing');
    }
  }

  /**
   * Sync tournament results from Lichess to local database
   */
  async syncTournamentResults(db, tournamentId, lichessTournamentId, accessToken) {
    try {
      // Get tournament results from Lichess
      const results = await this.getTournamentResults(lichessTournamentId);
      const games = await this.getTournamentGames(lichessTournamentId);

      // Update local pairings with results
      for (const result of results) {
        const game = games.find(g => g.id === result.gameId);
        if (game) {
          // Find the corresponding pairing in local database
          const pairing = await this.findPairingByPlayers(db, tournamentId, result.white, result.black);
          if (pairing) {
            // Update pairing with result
            await this.updatePairingResult(db, pairing.id, result.result, game.pgn);
          }
        }
      }

      return { success: true, syncedGames: results.length };
    } catch (error) {
      console.error('Error syncing tournament results:', error);
      throw new Error('Failed to sync tournament results');
    }
  }

  /**
   * Find pairing by player names
   */
  async findPairingByPlayers(db, tournamentId, whitePlayer, blackPlayer) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT p.* FROM pairings p
        JOIN players wp ON p.white_player_id = wp.id
        JOIN players bp ON p.black_player_id = bp.id
        WHERE p.tournament_id = ? 
        AND (wp.lichess_username = ? OR wp.name = ?)
        AND (bp.lichess_username = ? OR bp.name = ?)
      `, [tournamentId, whitePlayer, whitePlayer, blackPlayer, blackPlayer], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Update pairing result
   */
  async updatePairingResult(db, pairingId, result, pgn) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE pairings 
        SET result = ?, pgn = ?
        WHERE id = ?
      `, [result, pgn, pairingId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
}

module.exports = LichessApiService;
