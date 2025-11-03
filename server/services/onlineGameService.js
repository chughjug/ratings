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
   * Supports formats:
   * - "3+2" = 3 minutes with 2 second increment
   * - "G45D5" = 45 minutes with 5 second delay
   * - "G45 + 10" = 45 minutes with 10 second increment
   * - "45+10" = 45 minutes with 10 second increment
   */
  static parseTimeControl(timeControl) {
    const defaultTimeControl = { minutes: 3, increment: 2 }; // Default 3+2
    
    if (!timeControl || typeof timeControl !== 'string') {
      return defaultTimeControl;
    }

    const trimmed = timeControl.trim();
    
    // Handle G prefix format: G45D5 or G45 + 10
    if (trimmed.startsWith('G')) {
      // Match G45D5 format (delay)
      const delayMatch = trimmed.match(/^G(\d+)D(\d+)$/i);
      if (delayMatch) {
        const minutes = parseInt(delayMatch[1]) || 3;
        const delay = parseInt(delayMatch[2]) || 0;
        // For delay, we treat it as increment since delay isn't fully supported in the current system
        // In a proper implementation, delay would need separate handling
        return { minutes, increment: delay, delay: delay };
      }
      
      // Match G45 + 10 format (increment with space)
      const spaceMatch = trimmed.match(/^G(\d+)\s*\+\s*(\d+)$/i);
      if (spaceMatch) {
        const minutes = parseInt(spaceMatch[1]) || 3;
        const increment = parseInt(spaceMatch[2]) || 0;
        return { minutes, increment, delay: 0 };
      }
      
      // Match G45+10 format (increment without space)
      const noSpaceMatch = trimmed.match(/^G(\d+)\+(\d+)$/i);
      if (noSpaceMatch) {
        const minutes = parseInt(noSpaceMatch[1]) || 3;
        const increment = parseInt(noSpaceMatch[2]) || 0;
        return { minutes, increment, delay: 0 };
      }
    }

    // Handle standard format: "45+10" or "3+2"
    const parts = trimmed.split('+');
    if (parts.length >= 1) {
      // Remove 'G' prefix if present
      const minutesStr = parts[0].replace(/^G/i, '').trim();
      const minutes = parseInt(minutesStr) || defaultTimeControl.minutes;
      const increment = parts[1] ? parseInt(parts[1].trim()) : defaultTimeControl.increment;
      return { minutes, increment, delay: 0 };
    }

    return defaultTimeControl;
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
   * @param {Object} pairing - The pairing object
   * @param {Object} tournament - The tournament object
   * @param {string} baseUrl - Base URL for generating game links (may be organization URL)
   * @param {string} serverUrl - Server URL for making API calls (defaults to baseUrl if not provided)
   */
  static async createGameForPairing(pairing, tournament, baseUrl, serverUrl = null) {
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

      // Fetch logo - prioritize tournament logo, fall back to organization logo
      let organizationLogo = null;
      
      // First, check if tournament has its own logo
      if (tournament.logo_url) {
        organizationLogo = tournament.logo_url;
      } else if (tournament.organization_id) {
        // Fall back to organization logo if tournament logo not available
        try {
          const org = await new Promise((resolve, reject) => {
            db.get('SELECT logo_url, branding_logo FROM organizations WHERE id = ?', [tournament.organization_id], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
          // Use branding_logo if available, otherwise fall back to logo_url
          organizationLogo = org?.branding_logo || org?.logo_url || null;
        } catch (error) {
          console.error('Error fetching organization logo:', error);
        }
      }

      // Create custom game via API with player IDs for password generation
      // Use serverUrl for API calls (actual server), baseUrl for link generation (may be organization URL)
      // If serverUrl not provided, use baseUrl (assumes baseUrl is the server URL)
      const apiServerUrl = serverUrl || baseUrl || 'http://localhost:5000';
      const gameResponse = await axios.post(`${apiServerUrl}/api/games/create-custom`, {
        whiteName: whitePlayer.name,
        blackName: blackPlayer.name,
        whitePlayerId: pairing.white_player_id,
        blackPlayerId: pairing.black_player_id,
        whiteRating: whitePlayer.rating,
        blackRating: blackPlayer.rating,
        timeControl: timeControlString,
        organizationLogo: organizationLogo,
        baseUrl: baseUrl // Pass baseUrl so it's used for generating the game links
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
   * @param {string} tournamentId - Tournament ID
   * @param {number} round - Round number
   * @param {string} sectionName - Section name
   * @param {Object} tournament - Tournament object
   * @param {string} baseUrl - Base URL for generating game links (may be organization URL)
   * @param {string} serverUrl - Server URL for making API calls (optional, defaults to baseUrl)
   */
  static async createGamesForRound(tournamentId, round, sectionName, tournament, baseUrl, serverUrl = null) {
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
        batch.map(pairing => this.createGameForPairing(pairing, tournament, baseUrl, serverUrl))
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
