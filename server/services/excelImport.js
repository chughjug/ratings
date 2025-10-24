const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { lookupAndUpdatePlayer } = require('./ratingLookup');
const { getUSCFInfo } = require('./ratingLookup');
const { searchUSChessPlayersSubSecond } = require('./playerSearch');
const { Worker } = require('worker_threads');

// Enhanced LRU cache for rating lookups (reused from CSV import)
class LRUCache {
  constructor(maxSize = 10000, ttl = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }

  set(key, value) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }
}

// Global caches with larger capacity
const ratingCache = new LRUCache(10000, 30 * 60 * 1000); // 30 minutes, 10000 entries

/**
 * Parse Excel file and extract player data
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Array>} Array of parsed player objects
 */
async function parseExcelFile(filePath) {
  return new Promise((resolve, reject) => {
    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Get the first worksheet (or the one named 'Players' if it exists)
      let worksheet = workbook.Sheets['Players'] || workbook.Sheets[workbook.SheetNames[0]];
      
      if (!worksheet) {
        throw new Error('No worksheets found in Excel file');
      }
      
      // Convert worksheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Use first row as headers
        defval: '', // Default value for empty cells
        raw: false // Convert all values to strings
      });
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must have at least a header row and one data row');
      }
      
      // Extract headers from first row
      const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
      
      // Process data rows
      const players = [];
      const errors = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        try {
          // Skip empty rows
          if (row.every(cell => !cell || cell.toString().trim() === '')) {
            continue;
          }
          
          // Create row object with headers as keys
          const rowObj = {};
          headers.forEach((header, index) => {
            rowObj[header] = row[index] ? row[index].toString().trim() : '';
          });
          
          // Normalize column names (case-insensitive)
          const normalizedRow = {};
          Object.keys(rowObj).forEach(key => {
            const normalizedKey = key.toLowerCase().trim();
            normalizedRow[normalizedKey] = rowObj[key];
          });
          
          // Extract player data with flexible column mapping
          const player = {
            name: normalizedRow.name || normalizedRow['player name'] || normalizedRow['full name'] || '',
            uscf_id: normalizedRow.uscf_id || normalizedRow['uscf id'] || normalizedRow['uscf'] || normalizedRow['member id'] || '',
            fide_id: normalizedRow.fide_id || normalizedRow['fide id'] || normalizedRow['fide'] || '',
            rating: normalizedRow.rating || normalizedRow['uscf rating'] || normalizedRow['regular rating'] || '',
            section: normalizedRow.section || normalizedRow['division'] || normalizedRow['class'] || '',
            team_name: normalizedRow.team_name || normalizedRow['team name'] || normalizedRow['team'] || '',
            status: 'active', // Always default to active for imported players
            state: normalizedRow.state || normalizedRow['state/province'] || '',
            city: normalizedRow.city || normalizedRow['city/town'] || '',
            email: normalizedRow.email || normalizedRow['email address'] || '',
            phone: normalizedRow.phone || normalizedRow['phone number'] || '',
            bye_rounds: normalizedRow['bye rounds'] || normalizedRow['bye_rounds'] || normalizedRow['byes'] || '',
            expiration_date: normalizedRow['expiration date'] || normalizedRow['expiration_date'] || normalizedRow['expires'] || '',
            notes: normalizedRow.notes || normalizedRow['comments'] || normalizedRow['remarks'] || ''
          };
          
          // Clean up the data
          Object.keys(player).forEach(key => {
            if (typeof player[key] === 'string') {
              player[key] = player[key].trim();
              if (player[key] === '') player[key] = null;
            }
          });
          
          // Convert rating to number if it's a valid number
          if (player.rating && !isNaN(player.rating)) {
            player.rating = parseInt(player.rating);
          } else if (player.rating) {
            player.rating = null;
          }
          
          // Only add players with at least a name
          if (player.name) {
            players.push(player);
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            error: error.message,
            data: row
          });
        }
      }
      
      resolve({ players, errors });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Validate Excel data and return validation results
 * @param {Array} players - Array of player objects
 * @returns {Object} Validation results with valid players and errors
 */
function validateExcelData(players) {
  const validPlayers = [];
  const errors = [];
  
  players.forEach((player, index) => {
    const playerErrors = [];
    
    // Required fields validation
    if (!player.name || player.name.trim() === '') {
      playerErrors.push('Name is required');
    }
    
    // USCF ID validation (if provided)
    if (player.uscf_id && !/^\d+$/.test(player.uscf_id)) {
      playerErrors.push('USCF ID must be numeric');
    }
    
    // FIDE ID validation (if provided)
    if (player.fide_id && !/^\d+$/.test(player.fide_id)) {
      playerErrors.push('FIDE ID must be numeric');
    }
    
    // Rating validation (if provided)
    if (player.rating && (isNaN(player.rating) || player.rating < 0 || player.rating > 3000)) {
      playerErrors.push('Rating must be a number between 0 and 3000');
    }
    
    // Bye rounds validation (if provided)
    if (player.bye_rounds && player.bye_rounds.trim() !== '') {
      const byeRounds = player.bye_rounds.split(',').map(r => r.trim());
      const invalidRounds = byeRounds.filter(r => isNaN(parseInt(r)) || parseInt(r) < 1);
      if (invalidRounds.length > 0) {
        playerErrors.push('Bye rounds must be comma-separated positive numbers (e.g., "1,3,5")');
      }
    }
    
    // Expiration date validation (if provided)
    if (player.expiration_date && player.expiration_date.trim() !== '') {
      const date = new Date(player.expiration_date);
      if (isNaN(date.getTime())) {
        playerErrors.push('Expiration date must be a valid date (YYYY-MM-DD format)');
      }
    }
    
    if (playerErrors.length > 0) {
      errors.push({
        row: index + 1,
        player: player.name || 'Unknown',
        errors: playerErrors
      });
    } else {
      validPlayers.push(player);
    }
  });
  
  return { validPlayers, errors };
}

/**
 * Generate Excel template with sample data
 * @returns {Buffer} Excel file buffer
 */
function generateExcelTemplate() {
  const headers = [
    'Name',
    'USCF ID',
    'FIDE ID',
    'Rating',
    'Section',
    'Team',
    'Status',
    'State',
    'City',
    'Email',
    'Phone',
    'Bye Rounds',
    'Expiration Date',
    'Notes'
  ];
  
  const sampleData = [
    [
      'John Doe',
      '12345678',
      '987654321',
      '1800',
      'Open',
      'Chess Club A',
      'active',
      'CA',
      'San Francisco',
      'john@example.com',
      '555-1234',
      '1,3',
      '2024-12-31',
      'Club champion'
    ],
    [
      'Jane Smith',
      '87654321',
      '',
      '1600',
      'Reserve',
      'Chess Club B',
      'active',
      'NY',
      'New York',
      'jane@example.com',
      '555-5678',
      '',
      '',
      ''
    ],
    [
      'Bob Johnson',
      '11223344',
      '123456789',
      '2000',
      'Open',
      'Chess Club A',
      'active',
      'TX',
      'Houston',
      'bob@example.com',
      '555-9999',
      '2',
      '2025-06-30',
      'FIDE Master'
    ],
    [
      'Alice Brown',
      '',
      '',
      '1400',
      'U1800',
      'Chess Club B',
      'active',
      'FL',
      'Miami',
      'alice@example.com',
      '555-7777',
      '',
      '',
      'Unrated player'
    ]
  ];
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create worksheet data
  const worksheetData = [headers, ...sampleData];
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  const columnWidths = [
    { wch: 15 }, // Name
    { wch: 12 }, // USCF ID
    { wch: 12 }, // FIDE ID
    { wch: 8 },  // Rating
    { wch: 10 }, // Section
    { wch: 15 }, // Team
    { wch: 8 },  // Status
    { wch: 8 },  // State
    { wch: 12 }, // City
    { wch: 20 }, // Email
    { wch: 12 }, // Phone
    { wch: 12 }, // Bye Rounds
    { wch: 15 }, // Expiration Date
    { wch: 20 }  // Notes
  ];
  worksheet['!cols'] = columnWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Players');
  
  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return excelBuffer;
}

/**
 * Import players from Excel data using the same logic as CSV import
 * @param {Object} db - Database connection
 * @param {string} tournamentId - Tournament ID
 * @param {Array} players - Array of valid player objects
 * @param {boolean} lookupRatings - Whether to lookup ratings for players with USCF IDs
 * @returns {Promise<Object>} Import results
 */
async function importPlayersFromExcel(db, tournamentId, players, lookupRatings = true) {
  // Reuse the CSV import logic since the data structure is the same
  const { importPlayersFromCSV } = require('./csvImport');
  return await importPlayersFromCSV(db, tournamentId, players, lookupRatings);
}

module.exports = {
  parseExcelFile,
  validateExcelData,
  importPlayersFromExcel,
  generateExcelTemplate
};
