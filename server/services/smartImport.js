const { googleSheetsImportService } = require('./googleSheetsImport');
const { importPlayersFromCSV } = require('./csvImport');
const db = require('../database');

/**
 * Smart Import Service
 * Provides intelligent data mapping, validation, and import capabilities
 * for Google Sheets and Forms with automatic field detection and mapping
 */

class SmartImportService {
  constructor() {
    this.fieldMappings = {
      // Name variations
      name: [
        'name', 'player name', 'full name', 'first name', 'last name', 'player',
        'participant name', 'competitor name', 'entrant name'
      ],
      // USCF ID variations
      uscf_id: [
        'uscf id', 'uscf_id', 'uscf', 'member id', 'member_id', 'id',
        'uscf member id', 'uscf number', 'member number', 'player id'
      ],
      // FIDE ID variations
      fide_id: [
        'fide id', 'fide_id', 'fide', 'fide number', 'international id'
      ],
      // Rating variations
      rating: [
        'rating', 'uscf rating', 'regular rating', 'current rating', 'elo rating',
        'chess rating', 'player rating', 'strength', 'level'
      ],
      // Section variations
      section: [
        'section', 'division', 'class', 'category', 'group', 'bracket',
        'tournament section', 'player section'
      ],
      // Team variations
      team_name: [
        'team name', 'team_name', 'team', 'club', 'club name', 'organization',
        'school team', 'team affiliation'
      ],
      // Location variations
      state: [
        'state', 'state/province', 'province', 'region', 'territory',
        'state or province', 'location state'
      ],
      city: [
        'city', 'city/town', 'town', 'municipality', 'location city',
        'home city', 'residence city'
      ],
      // Contact variations
      email: [
        'email', 'email address', 'e-mail', 'email addr', 'contact email',
        'player email', 'participant email'
      ],
      phone: [
        'phone', 'phone number', 'telephone', 'phone num', 'contact phone',
        'mobile', 'cell phone', 'telephone number'
      ],
      // School variations
      school: [
        'school', 'institution', 'university', 'college', 'academy',
        'educational institution', 'school name'
      ],
      grade: [
        'grade', 'year', 'class year', 'school year', 'academic year',
        'grade level', 'student grade'
      ],
      // Additional info
      notes: [
        'notes', 'comments', 'remarks', 'additional info', 'special notes',
        'player notes', 'additional information', 'misc'
      ],
      // Parent/Guardian info
      parent_name: [
        'parent name', 'parent_name', 'guardian name', 'parent/guardian',
        'emergency contact name', 'parent contact'
      ],
      parent_email: [
        'parent email', 'parent_email', 'guardian email', 'parent contact email',
        'emergency contact email'
      ],
      parent_phone: [
        'parent phone', 'parent_phone', 'guardian phone', 'parent contact phone',
        'emergency contact phone'
      ]
    };
  }

  /**
   * Smart import from Google Sheets with intelligent field mapping
   * @param {string} spreadsheetId - Google Sheets spreadsheet ID
   * @param {string} tournamentId - Tournament ID
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async smartImportFromSheets(spreadsheetId, tournamentId, options = {}) {
    try {
      console.log(`🧠 Starting smart import from Google Sheets: ${spreadsheetId}`);
      
      // Get spreadsheet data
      const importResult = await googleSheetsImportService.importFromSheets(
        spreadsheetId,
        options.range || 'Sheet1!A1:Z1000',
        { lookup_ratings: false, auto_assign_sections: false }
      );

      if (!importResult.success) {
        return {
          success: false,
          error: importResult.error
        };
      }

      // Analyze and enhance the data
      const enhancedData = await this.analyzeAndEnhanceData(
        importResult.players,
        tournamentId,
        options
      );

      // Import to database
      const dbResult = await importPlayersFromCSV(
        db,
        tournamentId,
        enhancedData.players,
        options.lookup_ratings !== false
      );

      return {
        success: true,
        data: {
          tournament_id: tournamentId,
          imported_count: dbResult.importedCount,
          player_ids: dbResult.playerIds,
          rating_lookup_results: dbResult.ratingLookupResults || [],
          import_errors: dbResult.importErrors || [],
          validation_errors: importResult.errors,
          field_mapping: enhancedData.fieldMapping,
          data_analysis: enhancedData.analysis,
          metadata: importResult.metadata
        }
      };

    } catch (error) {
      console.error('Error in smart import from sheets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Smart import from Google Forms with intelligent field mapping
   * @param {string} formId - Google Forms form ID
   * @param {string} tournamentId - Tournament ID
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async smartImportFromForms(formId, tournamentId, options = {}) {
    try {
      console.log(`🧠 Starting smart import from Google Forms: ${formId}`);
      
      // Get form data
      const importResult = await googleSheetsImportService.importFromForms(
        formId,
        { lookup_ratings: false, auto_assign_sections: false }
      );

      if (!importResult.success) {
        return {
          success: false,
          error: importResult.error
        };
      }

      // Analyze and enhance the data
      const enhancedData = await this.analyzeAndEnhanceData(
        importResult.players,
        tournamentId,
        options
      );

      // Import to database
      const dbResult = await importPlayersFromCSV(
        db,
        tournamentId,
        enhancedData.players,
        options.lookup_ratings !== false
      );

      return {
        success: true,
        data: {
          tournament_id: tournamentId,
          imported_count: dbResult.importedCount,
          player_ids: dbResult.playerIds,
          rating_lookup_results: dbResult.ratingLookupResults || [],
          import_errors: dbResult.importErrors || [],
          validation_errors: importResult.errors,
          field_mapping: enhancedData.fieldMapping,
          data_analysis: enhancedData.analysis,
          metadata: importResult.metadata
        }
      };

    } catch (error) {
      console.error('Error in smart import from forms:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze and enhance player data with intelligent field detection
   * @param {Array} players - Raw player data
   * @param {string} tournamentId - Tournament ID
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Enhanced data with analysis
   */
  async analyzeAndEnhanceData(players, tournamentId, options = {}) {
    console.log(`🔍 Analyzing ${players.length} players for smart import...`);

    const analysis = {
      totalPlayers: players.length,
      fieldDetection: {},
      dataQuality: {},
      recommendations: [],
      warnings: []
    };

    // Analyze field presence and quality
    const fieldStats = this.analyzeFieldPresence(players);
    analysis.fieldDetection = fieldStats;

    // Detect data quality issues
    const qualityIssues = this.detectDataQualityIssues(players);
    analysis.dataQuality = qualityIssues;

    // Generate recommendations
    const recommendations = this.generateRecommendations(fieldStats, qualityIssues);
    analysis.recommendations = recommendations;

    // Enhance player data
    const enhancedPlayers = await this.enhancePlayerData(players, tournamentId, options);

    // Auto-assign sections if enabled
    if (options.auto_assign_sections !== false) {
      await this.autoAssignSections(enhancedPlayers, tournamentId);
    }

    return {
      players: enhancedPlayers,
      fieldMapping: fieldStats,
      analysis: analysis
    };
  }

  /**
   * Analyze field presence and quality in player data
   * @param {Array} players - Player data
   * @returns {Object} Field statistics
   */
  analyzeFieldPresence(players) {
    const fieldStats = {};
    
    // Initialize field counters
    Object.keys(this.fieldMappings).forEach(field => {
      fieldStats[field] = {
        present: 0,
        valid: 0,
        empty: 0,
        percentage: 0,
        quality: 'unknown'
      };
    });

    // Count field presence
    players.forEach(player => {
      Object.keys(this.fieldMappings).forEach(field => {
        if (player[field] !== undefined && player[field] !== null) {
          fieldStats[field].present++;
          
          if (player[field] && player[field].toString().trim() !== '') {
            fieldStats[field].valid++;
          } else {
            fieldStats[field].empty++;
          }
        }
      });
    });

    // Calculate percentages and quality scores
    Object.keys(fieldStats).forEach(field => {
      const stats = fieldStats[field];
      stats.percentage = players.length > 0 ? (stats.valid / players.length) * 100 : 0;
      
      if (stats.percentage >= 90) {
        stats.quality = 'excellent';
      } else if (stats.percentage >= 70) {
        stats.quality = 'good';
      } else if (stats.percentage >= 50) {
        stats.quality = 'fair';
      } else if (stats.percentage > 0) {
        stats.quality = 'poor';
      } else {
        stats.quality = 'missing';
      }
    });

    return fieldStats;
  }

  /**
   * Detect data quality issues in player data
   * @param {Array} players - Player data
   * @returns {Object} Quality issues
   */
  detectDataQualityIssues(players) {
    const issues = {
      missingNames: 0,
      invalidRatings: 0,
      invalidUSCFIds: 0,
      invalidEmails: 0,
      duplicateNames: 0,
      suspiciousData: []
    };

    const nameCounts = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    players.forEach((player, index) => {
      // Check for missing names
      if (!player.name || player.name.trim() === '') {
        issues.missingNames++;
      }

      // Check for invalid ratings
      if (player.rating && (isNaN(player.rating) || player.rating < 0 || player.rating > 3000)) {
        issues.invalidRatings++;
      }

      // Check for invalid USCF IDs
      if (player.uscf_id && !/^\d+$/.test(player.uscf_id.toString())) {
        issues.invalidUSCFIds++;
      }

      // Check for invalid emails
      if (player.email && !emailPattern.test(player.email)) {
        issues.invalidEmails++;
      }

      // Check for duplicate names
      if (player.name) {
        const normalizedName = player.name.toLowerCase().trim();
        if (nameCounts[normalizedName]) {
          nameCounts[normalizedName]++;
          if (nameCounts[normalizedName] === 2) {
            issues.duplicateNames++;
          }
        } else {
          nameCounts[normalizedName] = 1;
        }
      }

      // Check for suspicious data patterns
      if (this.isSuspiciousData(player)) {
        issues.suspiciousData.push({
          index: index + 1,
          player: player.name || 'Unknown',
          issues: this.getSuspiciousDataIssues(player)
        });
      }
    });

    return issues;
  }

  /**
   * Check if player data looks suspicious
   * @param {Object} player - Player data
   * @returns {boolean} Whether data is suspicious
   */
  isSuspiciousData(player) {
    // Check for obviously fake names
    const fakeNamePatterns = [
      /^test/i,
      /^example/i,
      /^sample/i,
      /^dummy/i,
      /^fake/i,
      /^asdf/i,
      /^qwerty/i,
      /^\d+$/,
      /^[a-z]{1,2}$/i
    ];

    if (player.name && fakeNamePatterns.some(pattern => pattern.test(player.name))) {
      return true;
    }

    // Check for impossible ratings
    if (player.rating && (player.rating < 100 || player.rating > 2800)) {
      return true;
    }

    // Check for invalid USCF ID patterns
    if (player.uscf_id && (player.uscf_id.length < 4 || player.uscf_id.length > 10)) {
      return true;
    }

    return false;
  }

  /**
   * Get specific suspicious data issues
   * @param {Object} player - Player data
   * @returns {Array} List of issues
   */
  getSuspiciousDataIssues(player) {
    const issues = [];

    if (player.name && /^test|example|sample|dummy|fake|asdf|qwerty/i.test(player.name)) {
      issues.push('Suspicious name pattern');
    }

    if (player.rating && (player.rating < 100 || player.rating > 2800)) {
      issues.push('Unusual rating value');
    }

    if (player.uscf_id && (player.uscf_id.length < 4 || player.uscf_id.length > 10)) {
      issues.push('Unusual USCF ID format');
    }

    return issues;
  }

  /**
   * Generate recommendations based on data analysis
   * @param {Object} fieldStats - Field statistics
   * @param {Object} qualityIssues - Quality issues
   * @returns {Array} Recommendations
   */
  generateRecommendations(fieldStats, qualityIssues) {
    const recommendations = [];

    // Name recommendations
    if (fieldStats.name.quality === 'missing') {
      recommendations.push({
        type: 'critical',
        field: 'name',
        message: 'No player names found. Please ensure your data includes a name column.'
      });
    } else if (fieldStats.name.quality === 'poor') {
      recommendations.push({
        type: 'warning',
        field: 'name',
        message: 'Many players are missing names. Please review your data.'
      });
    }

    // Rating recommendations
    if (fieldStats.rating.quality === 'missing') {
      recommendations.push({
        type: 'info',
        field: 'rating',
        message: 'No ratings found. Consider enabling automatic rating lookup for USCF members.'
      });
    }

    // USCF ID recommendations
    if (fieldStats.uscf_id.quality === 'missing') {
      recommendations.push({
        type: 'info',
        field: 'uscf_id',
        message: 'No USCF IDs found. Consider collecting USCF membership numbers for automatic rating lookup.'
      });
    }

    // Email recommendations
    if (fieldStats.email.quality === 'missing') {
      recommendations.push({
        type: 'info',
        field: 'email',
        message: 'No email addresses found. Consider collecting emails for tournament communications.'
      });
    }

    // Data quality recommendations
    if (qualityIssues.invalidRatings > 0) {
      recommendations.push({
        type: 'warning',
        field: 'rating',
        message: `${qualityIssues.invalidRatings} players have invalid ratings. Please review rating data.`
      });
    }

    if (qualityIssues.duplicateNames > 0) {
      recommendations.push({
        type: 'warning',
        field: 'name',
        message: `${qualityIssues.duplicateNames} duplicate names found. Please verify player identities.`
      });
    }

    if (qualityIssues.suspiciousData.length > 0) {
      recommendations.push({
        type: 'warning',
        field: 'data_quality',
        message: `${qualityIssues.suspiciousData.length} players have suspicious data patterns. Please review.`
      });
    }

    return recommendations;
  }

  /**
   * Enhance player data with additional processing
   * @param {Array} players - Player data
   * @param {string} tournamentId - Tournament ID
   * @param {Object} options - Enhancement options
   * @returns {Promise<Array>} Enhanced player data
   */
  async enhancePlayerData(players, tournamentId, options = {}) {
    const enhancedPlayers = players.map(player => {
      const enhanced = { ...player };

      // Clean and normalize data
      if (enhanced.name) {
        enhanced.name = this.normalizeName(enhanced.name);
      }

      if (enhanced.email) {
        enhanced.email = enhanced.email.toLowerCase().trim();
      }

      if (enhanced.uscf_id) {
        enhanced.uscf_id = enhanced.uscf_id.toString().trim();
      }

      if (enhanced.fide_id) {
        enhanced.fide_id = enhanced.fide_id.toString().trim();
      }

      // Set default status
      enhanced.status = 'active';

      // Add source information
      enhanced.source = 'google_import';
      enhanced.import_timestamp = new Date().toISOString();

      return enhanced;
    });

    return enhancedPlayers;
  }

  /**
   * Normalize player name
   * @param {string} name - Raw name
   * @returns {string} Normalized name
   */
  normalizeName(name) {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s\-'\.]/g, '') // Remove special characters except hyphens, apostrophes, and periods
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Auto-assign sections to players based on ratings
   * @param {Array} players - Player data
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<void>}
   */
  async autoAssignSections(players, tournamentId) {
    console.log(`📋 Auto-assigning sections for ${players.length} players...`);

    for (const player of players) {
      if (player.rating && !player.section) {
        try {
          const assignedSection = await this.assignSectionToPlayer(tournamentId, player.rating);
          if (assignedSection) {
            player.section = assignedSection;
            console.log(`✅ Assigned ${player.name} to section: ${assignedSection}`);
          }
        } catch (error) {
          console.error(`Error assigning section for ${player.name}:`, error);
        }
      }
    }
  }

  /**
   * Assign section to player based on rating
   * @param {string} tournamentId - Tournament ID
   * @param {number} rating - Player rating
   * @returns {Promise<string>} Assigned section
   */
  async assignSectionToPlayer(tournamentId, rating) {
    return new Promise((resolve, reject) => {
      // Get tournament settings
      db.get('SELECT settings FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!tournament || !tournament.settings) {
          resolve('Open'); // Default to Open section
          return;
        }
        
        try {
          const settings = JSON.parse(tournament.settings);
          const sections = settings.sections || [];
          
          if (sections.length === 0) {
            resolve('Open');
            return;
          }
          
          // Find the appropriate section based on rating
          for (const section of sections) {
            const minRating = section.min_rating || 0;
            const maxRating = section.max_rating || Infinity;
            
            if (rating >= minRating && rating <= maxRating) {
              resolve(section.name);
              return;
            }
          }
          
          // If no section matches, assign to the first section or Open
          resolve(sections.length > 0 ? sections[0].name : 'Open');
        } catch (parseError) {
          console.error('Error parsing tournament settings:', parseError);
          resolve('Open');
        }
      });
    });
  }
}

// Create singleton instance
const smartImportService = new SmartImportService();

module.exports = {
  SmartImportService,
  smartImportService
};
