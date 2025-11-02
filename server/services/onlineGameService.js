const axios = require('axios');
const db = require('../database');

/**
 * Online Game Service
 * Handles creation and management of custom chess games for online tournaments
 */
class OnlineGameService {
  /**
   * Check if tournament format requires custom games
   */
  static isOnlineTournament(format) {
    return format === 'online' || format === 'online-rated';
  }

  /**
   * Parse time control string into minutes and increment
   * Supports formats: "3+2", "10+0", "45+15", etc.
   */
  static parseTimeControl(timeControl) {
    const defaultTimeControl = { minutes: 3, increment: 2 }; // Default 3+2
    
    if (!timeControl || typeof timeControl !== 'string') {
      return defaultTimeControl;
    }

    const parts = timeControl.split('+');
    if (parts.length === 0) {
      return defaultTimeControl;
    }

    const minutes = parseInt(parts[0]) || defaultTimeControl.minutes;
    const increment = parts[1] ? parseInt(parts[1]) : defaultTimeControl.increment;

    return { minutes, increment };
  }

  /**
   * Helper function to generate password from email or phone
   */
  static generatePlayerPassword(email, phone) {
    if (email && email.trim()) {
      return email.trim().toLowerCase();
    }
    if (phone && phone.trim()) {
      // Extract last 4 digits of phone number
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length >= 4) {
        return digitsOnly.slice(-4);
      }
    }
    // Default password if neither email nor phone available
    return '1234';
  }

  /**
   * Create custom game for a pairing
   */
  static async createGameForPairing(pairing, tournament, baseUrl) {
    try {
      // Get player names, contact info, and ratings
      const [whitePlayer, blackPlayer] = await Promise.all([
        new Promise((resolve, reject) => {
          db.get('SELECT name, email, phone, rating FROM players WHERE id = ?', [pairing.white_player_id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        }),
        new Promise((resolve, reject) => {
          db.get('SELECT name, email, phone, rating FROM players WHERE id = ?', [pairing.black_player_id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        })
      ]);

      if (!whitePlayer || !blackPlayer) {
        throw new Error(`Could not find players for pairing ${pairing.id}`);
      }

      // Generate passwords from email or phone
      const whitePassword = this.generatePlayerPassword(whitePlayer.email, whitePlayer.phone);
      const blackPassword = this.generatePlayerPassword(blackPlayer.email, blackPlayer.phone);

      // Parse time control
      const { minutes, increment } = this.parseTimeControl(tournament.time_control);
      const timeControlString = `${minutes}+${increment}`;

      // Create custom game via API with player IDs for password generation
      const gameResponse = await axios.post(`${baseUrl}/api/games/create-custom`, {
        whiteName: whitePlayer.name,
        blackName: blackPlayer.name,
        whitePlayerId: pairing.white_player_id,
        blackPlayerId: pairing.black_player_id,
        whiteRating: whitePlayer.rating,
        blackRating: blackPlayer.rating,
        timeControl: timeControlString
      });

      if (!gameResponse.data.success) {
        throw new Error(gameResponse.data.error || 'Failed to create game');
      }

      // Update pairing with game information
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE pairings 
           SET game_id = ?, white_link = ?, black_link = ? 
           WHERE id = ?`,
          [
            gameResponse.data.gameId,
            gameResponse.data.whiteLink,
            gameResponse.data.blackLink,
            pairing.id
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return {
        success: true,
        pairingId: pairing.id,
        gameId: gameResponse.data.gameId,
        whiteLink: gameResponse.data.whiteLink,
        blackLink: gameResponse.data.blackLink
      };
    } catch (error) {
      console.error(`[OnlineGameService] Error creating game for pairing ${pairing.id}:`, error.message);
      return {
        success: false,
        pairingId: pairing.id,
        error: error.message
      };
    }
  }

  /**
   * Create games for all pairings in a round
   */
  static async createGamesForRound(tournamentId, round, sectionName, tournament, baseUrl) {
    // Get all pairings for this round and section
    const pairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM pairings 
         WHERE tournament_id = ? AND round = ? AND COALESCE(section, 'Open') = ?`,
        [tournamentId, round, sectionName],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Filter out byes and pairings that already have games
    const pairingsNeedingGames = pairings.filter(
      p => !p.is_bye && 
           p.white_player_id && 
           p.black_player_id &&
           (!p.game_id || !p.white_link || !p.black_link)
    );

    if (pairingsNeedingGames.length === 0) {
      console.log(`[OnlineGameService] All pairings already have games for round ${round}, section ${sectionName}`);
      return {
        success: true,
        created: 0,
        failed: 0,
        results: []
      };
    }

    console.log(`[OnlineGameService] Creating ${pairingsNeedingGames.length} games for round ${round}, section ${sectionName}`);

    // Create games in parallel (with limit to avoid overwhelming the system)
    const BATCH_SIZE = 5;
    const results = [];
    
    for (let i = 0; i < pairingsNeedingGames.length; i += BATCH_SIZE) {
      const batch = pairingsNeedingGames.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(pairing => this.createGameForPairing(pairing, tournament, baseUrl))
      );
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < pairingsNeedingGames.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const created = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[OnlineGameService] Created ${created} games, ${failed} failed for round ${round}, section ${sectionName}`);

    return {
      success: failed === 0,
      created,
      failed,
      results
    };
  }
}

module.exports = OnlineGameService;
