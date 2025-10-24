const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const path = require('path');

/**
 * Google Sheets Import Service
 * Handles importing player data from Google Sheets and Forms
 * using Google Sheets API with service account authentication
 */

class GoogleSheetsImportService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.forms = null;
    this.credentialsPath = path.join(__dirname, '../../fluent-cinema-476115-a6-e76b30820fd1.json');
  }

  /**
   * Initialize Google API authentication
   * @returns {Promise<void>}
   */
  async initializeAuth() {
    try {
      if (this.auth) {
        return; // Already initialized
      }

      console.log('🔐 Initializing Google API authentication...');

      // Check if credentials file exists
      const fs = require('fs');
      if (!fs.existsSync(this.credentialsPath)) {
        throw new Error(`Credentials file not found at ${this.credentialsPath}`);
      }

      // Load service account credentials
      const credentials = require(this.credentialsPath);
      
      // Validate credentials structure
      if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
        throw new Error('Invalid credentials file structure. Missing required fields.');
      }

      // Create JWT client
      this.auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/forms.readonly'
        ]
      });

      // Initialize Google APIs
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.forms = google.forms({ version: 'v1', auth: this.auth });

      console.log('✅ Google API authentication initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google API authentication:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Import players from Google Sheets
   * @param {string} spreadsheetId - Google Sheets spreadsheet ID
   * @param {string} range - Range to import (e.g., 'Sheet1!A1:Z1000')
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async importFromSheets(spreadsheetId, range = 'Sheet1!A1:Z1000', options = {}) {
    try {
      console.log(`📊 Importing from Google Sheets: ${spreadsheetId}`);
      console.log(`📏 Range: ${range}`);

      // Check for demo mode
      if (spreadsheetId === 'demo' || spreadsheetId === 'demo-sheet') {
        return this.getDemoData();
      }

      // Initialize authentication if needed
      await this.initializeAuth();

      // Get spreadsheet data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });

      const values = response.data.values;
      
      if (!values || values.length === 0) {
        return {
          success: false,
          error: 'No data found in the specified range',
          players: [],
          errors: []
        };
      }

      console.log(`📋 Found ${values.length} rows of data`);

      // Parse the data
      const { players, errors } = this.parseSheetData(values, options);

      return {
        success: true,
        players,
        errors,
        metadata: {
          spreadsheetId,
          range,
          totalRows: values.length,
          validPlayers: players.length,
          errors: errors.length
        }
      };

    } catch (error) {
      console.error('❌ Error importing from Google Sheets:', error);
      
      // Handle specific Google API errors
      if (error.code === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please check that the Google Sheets API is enabled and the service account has proper permissions.',
          players: [],
          errors: []
        };
      } else if (error.code === 403) {
        return {
          success: false,
          error: `Access denied. Please share the spreadsheet with the service account email: ${this.auth?.email || 'service-account@project.iam.gserviceaccount.com'}`,
          players: [],
          errors: []
        };
      } else if (error.code === 404) {
        return {
          success: false,
          error: 'Spreadsheet not found. Please check the spreadsheet ID and ensure it exists.',
          players: [],
          errors: []
        };
      } else if (error.code === 400) {
        return {
          success: false,
          error: 'Invalid range or spreadsheet format. Please check the range specification.',
          players: [],
          errors: []
        };
      }

      // Check for specific error messages
      if (error.message && error.message.includes('invalid authentication credentials')) {
        return {
          success: false,
          error: 'Invalid service account credentials. Please verify the credentials file and ensure the Google Sheets API is enabled.',
          players: [],
          errors: []
        };
      }

      return {
        success: false,
        error: `Failed to import from Google Sheets: ${error.message}`,
        players: [],
        errors: []
      };
    }
  }

  /**
   * Import players from Google Forms
   * @param {string} formId - Google Forms form ID
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async importFromForms(formId, options = {}) {
    try {
      console.log(`📝 Importing from Google Forms: ${formId}`);

      // Initialize authentication if needed
      await this.initializeAuth();

      // Get form responses
      const response = await this.forms.forms.responses.list({
        formId,
        pageSize: 1000 // Maximum allowed
      });

      const responses = response.data.responses || [];
      
      if (responses.length === 0) {
        return {
          success: false,
          error: 'No responses found in the form',
          players: [],
          errors: []
        };
      }

      console.log(`📋 Found ${responses.length} form responses`);

      // Parse the responses
      const { players, errors } = this.parseFormResponses(responses, options);

      return {
        success: true,
        players,
        errors,
        metadata: {
          formId,
          totalResponses: responses.length,
          validPlayers: players.length,
          errors: errors.length
        }
      };

    } catch (error) {
      console.error('❌ Error importing from Google Forms:', error);
      
      // Handle specific Google API errors
      if (error.code === 403) {
        return {
          success: false,
          error: 'Access denied. Please ensure the form is shared with the service account email.',
          players: [],
          errors: []
        };
      } else if (error.code === 404) {
        return {
          success: false,
          error: 'Form not found. Please check the form ID.',
          players: [],
          errors: []
        };
      }

      return {
        success: false,
        error: `Failed to import from Google Forms: ${error.message}`,
        players: [],
        errors: []
      };
    }
  }

  /**
   * Get spreadsheet information
   * @param {string} spreadsheetId - Google Sheets spreadsheet ID
   * @returns {Promise<Object>} Spreadsheet information
   */
  async getSpreadsheetInfo(spreadsheetId) {
    try {
      await this.initializeAuth();

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      });

      const spreadsheet = response.data;
      
      return {
        success: true,
        data: {
          title: spreadsheet.properties.title,
          sheets: spreadsheet.sheets.map(sheet => ({
            title: sheet.properties.title,
            sheetId: sheet.properties.sheetId,
            rowCount: sheet.properties.gridProperties.rowCount,
            columnCount: sheet.properties.gridProperties.columnCount
          }))
        }
      };

    } catch (error) {
      console.error('❌ Error getting spreadsheet info:', error);
      return {
        success: false,
        error: `Failed to get spreadsheet information: ${error.message}`
      };
    }
  }

  /**
   * Get form information
   * @param {string} formId - Google Forms form ID
   * @returns {Promise<Object>} Form information
   */
  async getFormInfo(formId) {
    try {
      await this.initializeAuth();

      const response = await this.forms.forms.get({
        formId
      });

      const form = response.data;
      
      return {
        success: true,
        data: {
          title: form.info.title,
          description: form.info.description,
          questions: form.items.map(item => ({
            questionId: item.questionItem?.question?.questionId,
            title: item.title,
            type: item.questionItem?.question?.type
          }))
        }
      };

    } catch (error) {
      console.error('❌ Error getting form info:', error);
      return {
        success: false,
        error: `Failed to get form information: ${error.message}`
      };
    }
  }

  /**
   * Parse Google Sheets data into player objects
   * @param {Array} values - Raw sheet data
   * @param {Object} options - Parse options
   * @returns {Object} Parsed players and errors
   */
  parseSheetData(values, options = {}) {
    const players = [];
    const errors = [];

    if (values.length < 2) {
      errors.push({
        row: 1,
        error: 'Spreadsheet must have at least a header row and one data row'
      });
      return { players, errors };
    }

    // First row is headers
    const headers = values[0].map(h => h ? h.toString().toLowerCase().trim() : '');
    console.log('📋 Headers found:', headers);

    // Map headers to player fields
    const fieldMapping = this.mapHeadersToFields(headers);

    // Process data rows
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowNumber = i + 1;

      try {
        const player = this.parsePlayerRow(row, headers, fieldMapping, rowNumber);
        if (player) {
          players.push(player);
        }
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
          data: row
        });
      }
    }

    console.log(`✅ Parsed ${players.length} players with ${errors.length} errors`);
    return { players, errors };
  }

  /**
   * Parse Google Forms responses into player objects
   * @param {Array} responses - Form responses
   * @param {Object} options - Parse options
   * @returns {Object} Parsed players and errors
   */
  parseFormResponses(responses, options = {}) {
    const players = [];
    const errors = [];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const responseNumber = i + 1;

      try {
        const player = this.parseFormResponse(response, responseNumber);
        if (player) {
          players.push(player);
        }
      } catch (error) {
        errors.push({
          response: responseNumber,
          error: error.message,
          data: response
        });
      }
    }

    console.log(`✅ Parsed ${players.length} players from form responses with ${errors.length} errors`);
    return { players, errors };
  }

  /**
   * Map spreadsheet headers to player fields
   * @param {Array} headers - Column headers
   * @returns {Object} Field mapping
   */
  mapHeadersToFields(headers) {
    const mapping = {};
    
    // Common field mappings
    const fieldMappings = {
      name: ['name', 'player name', 'full name', 'first name', 'last name', 'player'],
      uscf_id: ['uscf id', 'uscf_id', 'uscf', 'member id', 'member_id', 'id'],
      fide_id: ['fide id', 'fide_id', 'fide', 'fide number'],
      rating: ['rating', 'uscf rating', 'regular rating', 'current rating', 'elo rating'],
      section: ['section', 'division', 'class', 'category', 'group'],
      team_name: ['team name', 'team_name', 'team', 'club', 'club name'],
      state: ['state', 'state/province', 'province', 'region'],
      city: ['city', 'city/town', 'town', 'municipality'],
      email: ['email', 'email address', 'e-mail', 'contact email'],
      phone: ['phone', 'phone number', 'telephone', 'contact phone'],
      school: ['school', 'institution', 'university', 'college'],
      grade: ['grade', 'year', 'class year', 'school year'],
      notes: ['notes', 'comments', 'remarks', 'additional info']
    };

    // Map each header to a field
    headers.forEach((header, index) => {
      if (!header) return;

      for (const [field, variations] of Object.entries(fieldMappings)) {
        if (variations.some(variation => header.includes(variation))) {
          mapping[field] = index;
          break;
        }
      }
    });

    console.log('🗺️ Field mapping:', mapping);
    return mapping;
  }

  /**
   * Parse a single row of spreadsheet data into a player object
   * @param {Array} row - Row data
   * @param {Array} headers - Column headers
   * @param {Object} fieldMapping - Field mapping
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object|null} Player object or null if invalid
   */
  parsePlayerRow(row, headers, fieldMapping, rowNumber) {
    const player = {
      status: 'active',
      source: 'google_sheets',
      import_timestamp: new Date().toISOString()
    };

    // Extract data based on field mapping
    Object.entries(fieldMapping).forEach(([field, columnIndex]) => {
      if (columnIndex < row.length && row[columnIndex] !== undefined) {
        const value = row[columnIndex];
        
        if (value !== null && value !== undefined && value !== '') {
          // Clean and convert the value
          player[field] = this.cleanFieldValue(field, value);
        }
      }
    });

    // Validate required fields
    if (!player.name || player.name.trim() === '') {
      throw new Error('Player name is required');
    }

    // Clean and normalize the name
    player.name = this.normalizeName(player.name);

    return player;
  }

  /**
   * Parse a single form response into a player object
   * @param {Object} response - Form response
   * @param {number} responseNumber - Response number for error reporting
   * @returns {Object|null} Player object or null if invalid
   */
  parseFormResponse(response, responseNumber) {
    const player = {
      status: 'active',
      source: 'google_forms',
      import_timestamp: new Date().toISOString()
    };

    // Extract answers from form response
    if (response.answers) {
      Object.entries(response.answers).forEach(([questionId, answer]) => {
        const value = this.extractAnswerValue(answer);
        if (value) {
          // Map common form questions to player fields
          const field = this.mapFormQuestionToField(questionId, answer);
          if (field) {
            player[field] = this.cleanFieldValue(field, value);
          }
        }
      });
    }

    // Validate required fields
    if (!player.name || player.name.trim() === '') {
      throw new Error('Player name is required');
    }

    // Clean and normalize the name
    player.name = this.normalizeName(player.name);

    return player;
  }

  /**
   * Extract value from form answer
   * @param {Object} answer - Form answer object
   * @returns {string|null} Extracted value
   */
  extractAnswerValue(answer) {
    if (answer.textAnswers && answer.textAnswers.answers) {
      return answer.textAnswers.answers[0]?.value || null;
    }
    return null;
  }

  /**
   * Map form question to player field
   * @param {string} questionId - Question ID
   * @param {Object} answer - Answer object
   * @returns {string|null} Field name or null
   */
  mapFormQuestionToField(questionId, answer) {
    // This is a simplified mapping - in practice, you'd want to analyze
    // the question text or use a more sophisticated mapping system
    const commonMappings = {
      'name': 'name',
      'email': 'email',
      'phone': 'phone',
      'rating': 'rating',
      'uscf': 'uscf_id',
      'fide': 'fide_id',
      'section': 'section',
      'team': 'team_name',
      'school': 'school',
      'grade': 'grade',
      'notes': 'notes'
    };

    // Try to find a mapping based on common patterns
    for (const [pattern, field] of Object.entries(commonMappings)) {
      if (questionId.toLowerCase().includes(pattern)) {
        return field;
      }
    }

    return null;
  }

  /**
   * Clean and convert field value based on field type
   * @param {string} field - Field name
   * @param {any} value - Raw value
   * @returns {any} Cleaned value
   */
  cleanFieldValue(field, value) {
    if (value === null || value === undefined) {
      return null;
    }

    const stringValue = value.toString().trim();

    switch (field) {
      case 'uscf_id':
      case 'fide_id':
        return stringValue.replace(/\D/g, ''); // Remove non-digits
      
      case 'rating':
        const rating = parseFloat(stringValue);
        return isNaN(rating) ? null : Math.max(0, Math.min(3000, rating));
      
      case 'email':
        return stringValue.toLowerCase();
      
      case 'phone':
        return stringValue.replace(/\D/g, ''); // Remove non-digits
      
      case 'grade':
        const grade = parseInt(stringValue);
        return isNaN(grade) ? null : grade;
      
      default:
        return stringValue;
    }
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
   * Get demo data for testing purposes
   * @returns {Object} Demo data
   */
  getDemoData() {
    console.log('🎭 Using demo data for testing');
    
    const demoPlayers = [
      {
        name: 'John Smith',
        uscf_id: '12345678',
        rating: 1800,
        section: 'Open',
        email: 'john.smith@email.com',
        phone: '555-0123',
        state: 'CA',
        city: 'San Francisco',
        status: 'active',
        source: 'google_sheets_demo',
        import_timestamp: new Date().toISOString()
      },
      {
        name: 'Sarah Johnson',
        uscf_id: '87654321',
        rating: 1650,
        section: 'U1800',
        email: 'sarah.johnson@email.com',
        phone: '555-0456',
        state: 'NY',
        city: 'New York',
        status: 'active',
        source: 'google_sheets_demo',
        import_timestamp: new Date().toISOString()
      },
      {
        name: 'Mike Chen',
        uscf_id: '11223344',
        rating: 1950,
        section: 'Open',
        email: 'mike.chen@email.com',
        phone: '555-0789',
        state: 'TX',
        city: 'Houston',
        status: 'active',
        source: 'google_sheets_demo',
        import_timestamp: new Date().toISOString()
      },
      {
        name: 'Emily Davis',
        uscf_id: '55667788',
        rating: 1420,
        section: 'U1600',
        email: 'emily.davis@email.com',
        phone: '555-0321',
        state: 'FL',
        city: 'Miami',
        status: 'active',
        source: 'google_sheets_demo',
        import_timestamp: new Date().toISOString()
      },
      {
        name: 'David Wilson',
        uscf_id: '99887766',
        rating: 2100,
        section: 'Open',
        email: 'david.wilson@email.com',
        phone: '555-0654',
        state: 'IL',
        city: 'Chicago',
        status: 'active',
        source: 'google_sheets_demo',
        import_timestamp: new Date().toISOString()
      }
    ];

    return {
      success: true,
      players: demoPlayers,
      errors: [],
      metadata: {
        spreadsheetId: 'demo',
        range: 'Sheet1!A1:Z1000',
        totalRows: 6, // Header + 5 players
        validPlayers: 5,
        errors: 0,
        demo: true
      }
    };
  }
}

// Create singleton instance
const googleSheetsImportService = new GoogleSheetsImportService();

module.exports = {
  GoogleSheetsImportService,
  googleSheetsImportService
};
