const LichessApiService = require('./lichessApi');
const db = require('../database');

class LichessGameService {
  constructor() {
    this.lichessApi = new LichessApiService();
  }

  /**
   * Create Lichess games for tournament pairings
   */
  async createGamesForPairings(tournamentId, round, accessToken, options = {}) {
    try {
      // Get pairings for the round
      const pairings = await this.getPairingsForRound(tournamentId, round);
      
      if (pairings.length === 0) {
        throw new Error('No pairings found for this round');
      }

      // Get tournament information
      const tournament = await this.getTournamentInfo(tournamentId);
      
      // Parse time control
      const timeControl = this.parseTimeControl(tournament.time_control);
      
      // Create games based on pairing type
      if (options.createSwissTournament) {
        return await this.createSwissTournamentGames(tournament, pairings, accessToken, timeControl);
      } else {
        return await this.createIndividualChallenges(tournament, pairings, accessToken, timeControl);
      }
    } catch (error) {
      console.error('Error creating Lichess games:', error);
      throw error;
    }
  }

  /**
   * Create a Swiss tournament on Lichess and add players
   */
  async createSwissTournamentGames(tournament, pairings, accessToken, timeControl) {
    try {
      // Create Swiss tournament
      const swissData = {
        name: tournament.name,
        rounds: tournament.rounds,
        timeControl: timeControl,
        description: `Chess tournament: ${tournament.name}`,
        startDate: new Date().toISOString()
      };

      const lichessTournament = await this.lichessApi.createSwissTournament(accessToken, swissData);
      
      // Get all unique players from pairings
      const players = this.extractPlayersFromPairings(pairings);
      
      // Add players to tournament (this would need to be implemented in the API)
      // For now, we'll return the tournament info
      return {
        type: 'swiss',
        lichessTournament: lichessTournament,
        players: players,
        message: 'Swiss tournament created. Players need to join manually.'
      };
    } catch (error) {
      console.error('Error creating Swiss tournament:', error);
      throw error;
    }
  }

  /**
   * Create individual challenges for each pairing
   */
  async createIndividualChallenges(tournament, pairings, accessToken, timeControl) {
    try {
      const challenges = [];
      const errors = [];

      for (const pairing of pairings) {
        try {
          // Skip byes and unpaired players
          if (pairing.bye_type || !pairing.white_player_id || !pairing.black_player_id) {
            continue;
          }

          // Get player information
          const whitePlayer = await this.getPlayerInfo(pairing.white_player_id);
          const blackPlayer = await this.getPlayerInfo(pairing.black_player_id);

          // Check if players have Lichess usernames
          if (!whitePlayer.lichess_username || !blackPlayer.lichess_username) {
            errors.push({
              pairingId: pairing.id,
              error: `Missing Lichess username for ${whitePlayer.name} or ${blackPlayer.name}`
            });
            continue;
          }

          // Create challenge
          const challenge = await this.lichessApi.createChallenge(
            accessToken,
            whitePlayer,
            blackPlayer,
            timeControl
          );

          challenges.push({
            pairingId: pairing.id,
            challengeId: challenge.id,
            whitePlayer: whitePlayer.name,
            blackPlayer: blackPlayer.name,
            lichessUrl: `https://lichess.org/${challenge.id}`,
            status: 'created'
          });

          // Update pairing with challenge information
          await this.updatePairingWithChallenge(pairing.id, challenge.id);

        } catch (error) {
          console.error(`Error creating challenge for pairing ${pairing.id}:`, error);
          errors.push({
            pairingId: pairing.id,
            error: error.message
          });
        }
      }

      return {
        type: 'challenges',
        challenges: challenges,
        errors: errors,
        totalCreated: challenges.length,
        totalErrors: errors.length
      };
    } catch (error) {
      console.error('Error creating individual challenges:', error);
      throw error;
    }
  }

  /**
   * Sync results from Lichess tournament to local database
   */
  async syncTournamentResults(tournamentId, lichessTournamentId, accessToken) {
    try {
      // Get tournament results from Lichess
      const results = await this.lichessApi.getTournamentResults(lichessTournamentId);
      const games = await this.lichessApi.getTournamentGames(lichessTournamentId);

      let syncedCount = 0;
      const errors = [];

      for (const result of results) {
        try {
          // Find the corresponding pairing
          const pairing = await this.findPairingByLichessPlayers(
            tournamentId, 
            result.white, 
            result.black
          );

          if (pairing) {
            // Get the game PGN
            const game = games.find(g => g.id === result.gameId);
            const pgn = game ? await this.lichessApi.exportGame(game.id, 'pgn') : null;

            // Update pairing with result
            await this.updatePairingResult(
              pairing.id, 
              this.convertLichessResult(result.result),
              pgn,
              result.gameId
            );

            syncedCount++;
          }
        } catch (error) {
          console.error(`Error syncing result for game ${result.gameId}:`, error);
          errors.push({
            gameId: result.gameId,
            error: error.message
          });
        }
      }

      return {
        success: true,
        syncedCount: syncedCount,
        totalResults: results.length,
        errors: errors
      };
    } catch (error) {
      console.error('Error syncing tournament results:', error);
      throw error;
    }
  }

  /**
   * Get pairings for a specific round
   */
  async getPairingsForRound(tournamentId, round) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT p.*, 
               wp.name as white_name, wp.lichess_username as white_lichess_username,
               bp.name as black_name, bp.lichess_username as black_lichess_username
        FROM pairings p
        LEFT JOIN players wp ON p.white_player_id = wp.id
        LEFT JOIN players bp ON p.black_player_id = bp.id
        WHERE p.tournament_id = ? AND p.round = ?
        ORDER BY p.board
      `, [tournamentId, round], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Get tournament information
   */
  async getTournamentInfo(tournamentId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get player information
   */
  async getPlayerInfo(playerId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM players WHERE id = ?', [playerId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Parse time control string
   */
  parseTimeControl(timeControl) {
    if (!timeControl) {
      return { timeLimit: 30, increment: 0 };
    }

    const match = timeControl.match(/G\/(\d+)\+(\d+)/);
    if (match) {
      return {
        timeLimit: parseInt(match[1]),
        increment: parseInt(match[2])
      };
    }

    // Default fallback
    return { timeLimit: 30, increment: 0 };
  }

  /**
   * Extract unique players from pairings
   */
  extractPlayersFromPairings(pairings) {
    const players = new Map();
    
    pairings.forEach(pairing => {
      if (pairing.white_player_id && pairing.white_name) {
        players.set(pairing.white_player_id, {
          id: pairing.white_player_id,
          name: pairing.white_name,
          lichess_username: pairing.white_lichess_username
        });
      }
      if (pairing.black_player_id && pairing.black_name) {
        players.set(pairing.black_player_id, {
          id: pairing.black_player_id,
          name: pairing.black_name,
          lichess_username: pairing.black_lichess_username
        });
      }
    });

    return Array.from(players.values());
  }

  /**
   * Update pairing with challenge information
   */
  async updatePairingWithChallenge(pairingId, challengeId) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE pairings 
        SET lichess_challenge_id = ?, lichess_status = 'created'
        WHERE id = ?
      `, [challengeId, pairingId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  /**
   * Find pairing by Lichess player names
   */
  async findPairingByLichessPlayers(tournamentId, whitePlayer, blackPlayer) {
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
  async updatePairingResult(pairingId, result, pgn, lichessGameId) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE pairings 
        SET result = ?, pgn = ?, lichess_game_id = ?, lichess_status = 'completed'
        WHERE id = ?
      `, [result, pgn, lichessGameId, pairingId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  /**
   * Convert Lichess result to local format
   */
  convertLichessResult(lichessResult) {
    const resultMap = {
      '1-0': '1-0',
      '0-1': '0-1',
      '1/2-1/2': '1/2-1/2',
      '0-0': '0-0' // Abandoned
    };
    
    return resultMap[lichessResult] || lichessResult;
  }

  /**
   * Get Lichess integration status for tournament
   */
  async getIntegrationStatus(tournamentId) {
    try {
      // Check if tournament has Lichess integration
      const tournament = await this.getTournamentInfo(tournamentId);
      
      // Get pairings with Lichess data
      const pairings = await this.getPairingsForRound(tournamentId, 1); // Get first round as example
      
      const lichessPairings = pairings.filter(p => p.lichess_challenge_id);
      const playersWithLichess = pairings.filter(p => 
        p.white_lichess_username || p.black_lichess_username
      );

      return {
        hasIntegration: lichessPairings.length > 0,
        totalPairings: pairings.length,
        lichessPairings: lichessPairings.length,
        playersWithLichess: playersWithLichess.length,
        integrationRate: pairings.length > 0 ? (lichessPairings.length / pairings.length) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting integration status:', error);
      throw error;
    }
  }
}

module.exports = LichessGameService;
