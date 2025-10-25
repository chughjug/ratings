const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

class QRCodeService {
  constructor() {
    this.qrCodeOptions = {
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    };
  }

  /**
   * Generate QR code for pairings
   * @param {string} tournamentId - Tournament ID
   * @param {number} round - Round number
   * @param {Object} options - QR code options
   * @returns {Promise<Object>} - QR code data
   */
  async generatePairingsQR(tournamentId, round, options = {}) {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const pairingsUrl = `${baseUrl}/tournaments/${tournamentId}/pairings/${round}`;
      
      const qrCodeData = await this.generateQRCode(pairingsUrl, {
        ...this.qrCodeOptions,
        ...options,
        title: `Round ${round} Pairings`
      });

      return {
        success: true,
        data: {
          url: pairingsUrl,
          qrCode: qrCodeData,
          tournamentId,
          round,
          type: 'pairings'
        }
      };
    } catch (error) {
      console.error('Error generating pairings QR code:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for standings
   * @param {string} tournamentId - Tournament ID
   * @param {Object} options - QR code options
   * @returns {Promise<Object>} - QR code data
   */
  async generateStandingsQR(tournamentId, options = {}) {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const standingsUrl = `${baseUrl}/tournaments/${tournamentId}/standings`;
      
      const qrCodeData = await this.generateQRCode(standingsUrl, {
        ...this.qrCodeOptions,
        ...options,
        title: 'Tournament Standings'
      });

      return {
        success: true,
        data: {
          url: standingsUrl,
          qrCode: qrCodeData,
          tournamentId,
          type: 'standings'
        }
      };
    } catch (error) {
      console.error('Error generating standings QR code:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for player check-in
   * @param {string} tournamentId - Tournament ID
   * @param {string} playerId - Player ID
   * @param {Object} options - QR code options
   * @returns {Promise<Object>} - QR code data
   */
  async generatePlayerCheckInQR(tournamentId, playerId, options = {}) {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const checkInUrl = `${baseUrl}/tournaments/${tournamentId}/check-in/${playerId}`;
      
      const qrCodeData = await this.generateQRCode(checkInUrl, {
        ...this.qrCodeOptions,
        ...options,
        title: 'Player Check-In'
      });

      return {
        success: true,
        data: {
          url: checkInUrl,
          qrCode: qrCodeData,
          tournamentId,
          playerId,
          type: 'check-in'
        }
      };
    } catch (error) {
      console.error('Error generating player check-in QR code:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for tournament info
   * @param {string} tournamentId - Tournament ID
   * @param {Object} options - QR code options
   * @returns {Promise<Object>} - QR code data
   */
  async generateTournamentQR(tournamentId, options = {}) {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const tournamentUrl = `${baseUrl}/tournaments/${tournamentId}`;
      
      const qrCodeData = await this.generateQRCode(tournamentUrl, {
        ...this.qrCodeOptions,
        ...options,
        title: 'Tournament Info'
      });

      return {
        success: true,
        data: {
          url: tournamentUrl,
          qrCode: qrCodeData,
          tournamentId,
          type: 'tournament'
        }
      };
    } catch (error) {
      console.error('Error generating tournament QR code:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for custom content
   * @param {string} content - Content to encode
   * @param {Object} options - QR code options
   * @returns {Promise<Object>} - QR code data
   */
  async generateCustomQR(content, options = {}) {
    try {
      const qrCodeData = await this.generateQRCode(content, {
        ...this.qrCodeOptions,
        ...options,
        title: 'Custom QR Code'
      });

      return {
        success: true,
        data: {
          content,
          qrCode: qrCodeData,
          type: 'custom'
        }
      };
    } catch (error) {
      console.error('Error generating custom QR code:', error);
      throw error;
    }
  }

  /**
   * Generate QR code with custom styling
   * @param {string} content - Content to encode
   * @param {Object} options - QR code options
   * @returns {Promise<string>} - Base64 encoded QR code
   */
  async generateQRCode(content, options = {}) {
    try {
      const qrOptions = {
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };

      // Generate QR code as base64 string
      const qrCodeDataURL = await QRCode.toDataURL(content, qrOptions);
      
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  /**
   * Generate QR code and save to file
   * @param {string} content - Content to encode
   * @param {string} filePath - File path to save
   * @param {Object} options - QR code options
   * @returns {Promise<Object>} - File info
   */
  async generateQRCodeFile(content, filePath, options = {}) {
    try {
      const qrOptions = {
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256,
        ...options
      };

      // Generate QR code as buffer
      const qrCodeBuffer = await QRCode.toBuffer(content, qrOptions);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Save to file
      await fs.writeFile(filePath, qrCodeBuffer);
      
      return {
        success: true,
        filePath,
        size: qrCodeBuffer.length,
        options: qrOptions
      };
    } catch (error) {
      console.error('Error generating QR code file:', error);
      throw error;
    }
  }

  /**
   * Generate multiple QR codes for tournament
   * @param {string} tournamentId - Tournament ID
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Multiple QR codes
   */
  async generateTournamentQRCodes(tournamentId, options = {}) {
    try {
      const { includePairings = true, includeStandings = true, includeTournament = true, rounds = [] } = options;
      const qrCodes = {};

      // Generate tournament QR code
      if (includeTournament) {
        qrCodes.tournament = await this.generateTournamentQR(tournamentId, options);
      }

      // Generate standings QR code
      if (includeStandings) {
        qrCodes.standings = await this.generateStandingsQR(tournamentId, options);
      }

      // Generate pairings QR codes for each round
      if (includePairings && rounds.length > 0) {
        qrCodes.pairings = {};
        for (const round of rounds) {
          qrCodes.pairings[`round_${round}`] = await this.generatePairingsQR(tournamentId, round, options);
        }
      }

      return {
        success: true,
        data: qrCodes,
        tournamentId,
        generated: Object.keys(qrCodes).length
      };
    } catch (error) {
      console.error('Error generating tournament QR codes:', error);
      throw error;
    }
  }

  /**
   * Generate QR codes for all players
   * @param {string} tournamentId - Tournament ID
   * @param {Array} players - Array of player objects
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Player QR codes
   */
  async generatePlayerQRCodes(tournamentId, players, options = {}) {
    try {
      const playerQRCodes = {};

      for (const player of players) {
        if (player.id) {
          playerQRCodes[player.id] = await this.generatePlayerCheckInQR(
            tournamentId, 
            player.id, 
            {
              ...options,
              title: `Check-in: ${player.name}`
            }
          );
        }
      }

      return {
        success: true,
        data: playerQRCodes,
        tournamentId,
        playerCount: players.length,
        generated: Object.keys(playerQRCodes).length
      };
    } catch (error) {
      console.error('Error generating player QR codes:', error);
      throw error;
    }
  }

  /**
   * Generate QR code with custom logo overlay
   * @param {string} content - Content to encode
   * @param {string} logoPath - Path to logo image
   * @param {Object} options - QR code options
   * @returns {Promise<Object>} - QR code with logo
   */
  async generateQRCodeWithLogo(content, logoPath, options = {}) {
    try {
      // This would require additional image processing libraries
      // For now, return basic QR code
      const qrCodeData = await this.generateQRCode(content, options);
      
      return {
        success: true,
        data: {
          qrCode: qrCodeData,
          logoPath,
          content,
          type: 'qr_with_logo'
        },
        note: 'Logo overlay feature requires additional image processing setup'
      };
    } catch (error) {
      console.error('Error generating QR code with logo:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for print format
   * @param {string} content - Content to encode
   * @param {Object} options - Print options
   * @returns {Promise<Object>} - Print-ready QR code
   */
  async generatePrintQRCode(content, options = {}) {
    try {
      const printOptions = {
        type: 'png',
        quality: 1.0,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 512, // Higher resolution for printing
        ...options
      };

      const qrCodeData = await this.generateQRCode(content, printOptions);
      
      return {
        success: true,
        data: {
          qrCode: qrCodeData,
          content,
          type: 'print_ready',
          resolution: '512x512',
          format: 'PNG'
        }
      };
    } catch (error) {
      console.error('Error generating print QR code:', error);
      throw error;
    }
  }

  /**
   * Validate QR code content
   * @param {string} content - Content to validate
   * @returns {Object} - Validation result
   */
  validateQRContent(content) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check content length
    if (content.length > 2953) {
      validation.isValid = false;
      validation.errors.push('Content too long for QR code (max 2953 characters)');
    }

    // Check for special characters
    if (!/^[\x00-\x7F]*$/.test(content)) {
      validation.warnings.push('Non-ASCII characters may not display correctly');
    }

    // Check URL format
    if (content.startsWith('http')) {
      try {
        new URL(content);
      } catch (error) {
        validation.warnings.push('URL format may be invalid');
      }
    }

    // Suggest optimizations
    if (content.length > 1000) {
      validation.suggestions.push('Consider shortening URL or content for better QR code readability');
    }

    return validation;
  }
}

module.exports = new QRCodeService();
