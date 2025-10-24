#!/usr/bin/env node

/**
 * Google Sheets Integration for Chess Tournament Registration
 * 
 * This script provides integration with Google Sheets for:
 * 1. Reading player data from Google Sheets
 * 2. Syncing data to tournament via API
 * 3. Writing registration data back to sheets
 * 
 * Setup:
 * 1. Enable Google Sheets API in Google Cloud Console
 * 2. Create service account and download credentials JSON
 * 3. Share your Google Sheet with the service account email
 * 4. Set GOOGLE_CREDENTIALS_PATH environment variable
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_KEY = process.env.API_KEY || 'demo-key-123';
const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials.json';

class GoogleSheetsIntegration {
  constructor(tournamentId, spreadsheetId, sheetName = 'Players') {
    this.tournamentId = tournamentId;
    this.spreadsheetId = spreadsheetId;
    this.sheetName = sheetName;
    this.sheets = null;
    this.auth = null;
  }

  async initialize() {
    try {
      // Load credentials
      const credentials = JSON.parse(fs.readFileSync(GOOGLE_CREDENTIALS_PATH, 'utf8'));
      
      // Create JWT auth client
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      // Initialize sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      console.log('✓ Google Sheets API initialized');
    } catch (error) {
      console.error('Error initializing Google Sheets:', error.message);
      throw error;
    }
  }

  async readPlayersFromSheet() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:Z`, // Read all columns
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        return [];
      }

      // First row is headers
      const headers = rows[0];
      const players = [];

      // Map data rows to player objects
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const player = {};

        headers.forEach((header, index) => {
          const value = row[index] || '';
          const fieldName = this.mapHeaderToField(header);
          if (fieldName && value.trim() !== '') {
            player[fieldName] = value.trim();
          }
        });

        // Only include players with names
        if (player.name) {
          players.push(player);
        }
      }

      console.log(`✓ Read ${players.length} players from Google Sheet`);
      return players;
    } catch (error) {
      console.error('Error reading from Google Sheet:', error.message);
      throw error;
    }
  }

  mapHeaderToField(header) {
    const mapping = {
      'Name': 'name',
      'Full Name': 'name',
      'Player Name': 'name',
      'USCF ID': 'uscf_id',
      'USCF': 'uscf_id',
      'Member ID': 'uscf_id',
      'FIDE ID': 'fide_id',
      'FIDE': 'fide_id',
      'Rating': 'rating',
      'USCF Rating': 'rating',
      'Regular Rating': 'rating',
      'Section': 'section',
      'Division': 'section',
      'Class': 'section',
      'School': 'school',
      'Grade': 'grade',
      'Email': 'email',
      'Email Address': 'email',
      'Phone': 'phone',
      'Phone Number': 'phone',
      'State': 'state',
      'State/Province': 'state',
      'City': 'city',
      'City/Town': 'city',
      'Notes': 'notes',
      'Parent Name': 'parent_name',
      'Parent Email': 'parent_email',
      'Parent Phone': 'parent_phone',
      'Emergency Contact': 'emergency_contact',
      'Emergency Phone': 'emergency_phone',
      'T-Shirt Size': 'tshirt_size',
      'Shirt Size': 'tshirt_size',
      'Dietary Restrictions': 'dietary_restrictions',
      'Special Needs': 'special_needs',
      'Status': 'status'
    };

    return mapping[header] || null;
  }

  async syncPlayersToTournament(players) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/players/api-import/${this.tournamentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: API_KEY,
          players: players,
          lookup_ratings: true,
          auto_assign_sections: true,
          source: 'google_sheets'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✓ Successfully synced ${result.data.imported_count} players to tournament`);
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error syncing players to tournament:', error.message);
      throw error;
    }
  }

  async writeResultsToSheet(results) {
    try {
      // Add results to a new sheet or append to existing
      const resultsData = [
        ['Sync Results', 'Timestamp', 'Player Count', 'Success', 'Errors'],
        [new Date().toISOString(), results.data.imported_count, 'true', '']
      ];

      // Add individual player results if available
      if (results.data.rating_lookup_results) {
        resultsData.push(['', '', '', '', '']);
        resultsData.push(['Player Name', 'USCF ID', 'Rating Lookup', 'Rating', 'Section']);
        
        results.data.rating_lookup_results.forEach(player => {
          resultsData.push([
            player.name,
            player.uscf_id || '',
            player.success ? 'Success' : 'Failed',
            player.rating || '',
            player.assignedSection || ''
          ]);
        });
      }

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'SyncResults!A:E',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: resultsData
        }
      });

      console.log('✓ Results written to Google Sheet');
    } catch (error) {
      console.error('Error writing results to sheet:', error.message);
    }
  }

  async createRegistrationFormSheet() {
    try {
      // Create a new sheet for registration form data
      const formData = [
        ['Registration Form Fields', '', '', ''],
        ['Field Name', 'Required', 'Type', 'Description'],
        ['name', 'Yes', 'Text', 'Player full name'],
        ['uscf_id', 'No', 'Text', 'USCF member ID for rating lookup'],
        ['fide_id', 'No', 'Text', 'FIDE member ID'],
        ['rating', 'No', 'Number', 'Player rating (0-3000)'],
        ['section', 'No', 'Text', 'Tournament section (auto-assigned if not provided)'],
        ['school', 'No', 'Text', 'School name'],
        ['grade', 'No', 'Text', 'Grade level'],
        ['email', 'No', 'Email', 'Player email address'],
        ['phone', 'No', 'Text', 'Phone number'],
        ['state', 'No', 'Text', 'State/Province'],
        ['city', 'No', 'Text', 'City'],
        ['parent_name', 'No', 'Text', 'Parent/Guardian name'],
        ['parent_email', 'No', 'Email', 'Parent email'],
        ['parent_phone', 'No', 'Text', 'Parent phone'],
        ['emergency_contact', 'No', 'Text', 'Emergency contact name'],
        ['emergency_phone', 'No', 'Text', 'Emergency contact phone'],
        ['tshirt_size', 'No', 'Text', 'T-shirt size'],
        ['dietary_restrictions', 'No', 'Text', 'Dietary restrictions'],
        ['special_needs', 'No', 'Text', 'Special needs or accommodations'],
        ['notes', 'No', 'Text', 'Additional notes'],
        ['', '', '', ''],
        ['API Endpoint', `${API_BASE_URL}/api/players/register/${this.tournamentId}`, '', ''],
        ['API Key', API_KEY, '', ''],
        ['Webhook Support', 'Yes', '', 'Send webhook_url in request for notifications']
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'RegistrationForm!A:D',
        valueInputOption: 'RAW',
        resource: {
          values: formData
        }
      });

      console.log('✓ Registration form documentation created in Google Sheet');
    } catch (error) {
      console.error('Error creating registration form sheet:', error.message);
    }
  }

  async fullSync() {
    try {
      console.log('🔄 Starting full sync from Google Sheets...');
      
      // Read players from sheet
      const players = await this.readPlayersFromSheet();
      
      if (players.length === 0) {
        console.log('No players found in sheet');
        return;
      }

      // Sync to tournament
      const results = await this.syncPlayersToTournament(players);
      
      // Write results back to sheet
      await this.writeResultsToSheet(results);
      
      console.log('✅ Full sync completed successfully');
      return results;
    } catch (error) {
      console.error('❌ Full sync failed:', error.message);
      throw error;
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node google-sheets-integration.js <tournament-id> <spreadsheet-id> [sheet-name]');
    console.log('');
    console.log('Environment variables:');
    console.log('  API_BASE_URL - Tournament API base URL (default: http://localhost:3001)');
    console.log('  API_KEY - API key for authentication (default: demo-key-123)');
    console.log('  GOOGLE_CREDENTIALS_PATH - Path to Google credentials JSON file');
    process.exit(1);
  }

  const tournamentId = args[0];
  const spreadsheetId = args[1];
  const sheetName = args[2] || 'Players';

  try {
    const integration = new GoogleSheetsIntegration(tournamentId, spreadsheetId, sheetName);
    await integration.initialize();
    
    // Create registration form documentation
    await integration.createRegistrationFormSheet();
    
    // Perform full sync
    await integration.fullSync();
    
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = GoogleSheetsIntegration;

