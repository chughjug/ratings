/**
 * Google Apps Script for Real-time Chess Tournament Registration
 * 
 * This script runs in Google Sheets and automatically syncs player data
 * to your chess tournament system when new players are added.
 * 
 * Setup:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Replace the default code with this script
 * 4. Update the configuration section below
 * 5. Save and run the setup function
 */

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

const CONFIG = {
  // Tournament API settings
  API_BASE_URL: 'https://your-domain.com', // Replace with your tournament system URL
  API_KEY: 'demo-key-123', // Replace with your API key
  TOURNAMENT_ID: 'your-tournament-id', // Replace with your tournament ID
  
  // Google Sheet settings
  SHEET_NAME: 'Players', // Name of the sheet containing player data
  HEADER_ROW: 1, // Row number containing headers
  
  // Column mappings (adjust based on your sheet headers)
  COLUMN_MAPPINGS: {
    'A': 'name',           // Name column
    'B': 'uscf_id',        // USCF ID column
    'C': 'rating',         // Rating column
    'D': 'section',        // Section column
    'E': 'school',         // School column
    'F': 'grade',          // Grade column
    'G': 'email',          // Email column
    'H': 'phone',          // Phone column
    'I': 'state',          // State column
    'J': 'city',           // City column
    'K': 'parent_name',    // Parent name column
    'L': 'parent_email',   // Parent email column
    'M': 'notes'           // Notes column
  },
  
  // Sync settings
  AUTO_SYNC: true,         // Automatically sync when sheet changes
  SYNC_INTERVAL: 5,        // Minutes between automatic syncs
  WEBHOOK_URL: null        // Optional webhook URL for notifications
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Setup function - run this once to configure the sheet
 */
function setup() {
  console.log('Setting up Chess Tournament Registration...');
  
  // Create menu
  createMenu();
  
  // Set up triggers
  setupTriggers();
  
  // Create status sheet
  createStatusSheet();
  
  console.log('Setup complete! Use the "Chess Tournament" menu to sync players.');
}

/**
 * Create custom menu in Google Sheets
 */
function createMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Chess Tournament')
    .addItem('Sync All Players', 'syncAllPlayers')
    .addItem('Sync New Players Only', 'syncNewPlayers')
    .addItem('Test Connection', 'testConnection')
    .addItem('View Registration Info', 'showRegistrationInfo')
    .addSeparator()
    .addItem('Setup/Reconfigure', 'setup')
    .addToUi();
}

/**
 * Set up automatic triggers
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction().includes('ChessTournament')) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new triggers
  if (CONFIG.AUTO_SYNC) {
    // Trigger on sheet edit
    ScriptApp.newTrigger('onSheetEdit')
      .timeBased()
      .everyMinutes(CONFIG.SYNC_INTERVAL)
      .create();
  }
}

/**
 * Create a status sheet to track sync operations
 */
function createStatusSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let statusSheet = spreadsheet.getSheetByName('SyncStatus');
  
  if (!statusSheet) {
    statusSheet = spreadsheet.insertSheet('SyncStatus');
  }
  
  // Clear and set up headers
  statusSheet.clear();
  statusSheet.getRange('A1:F1').setValues([[
    'Timestamp', 'Action', 'Players Synced', 'Success', 'Errors', 'Details'
  ]]);
  
  // Format headers
  statusSheet.getRange('A1:F1').setFontWeight('bold');
  statusSheet.autoResizeColumns(1, 6);
}

/**
 * Sync all players from the sheet to the tournament
 */
function syncAllPlayers() {
  try {
    console.log('Starting full sync...');
    logStatus('Full Sync Started', 0, true, '', '');
    
    const players = readPlayersFromSheet();
    
    if (players.length === 0) {
      logStatus('No Players Found', 0, false, '', 'No players found in sheet');
      SpreadsheetApp.getUi().alert('No players found in the sheet.');
      return;
    }
    
    const result = syncPlayersToAPI(players);
    
    if (result.success) {
      logStatus('Full Sync Complete', result.imported_count, true, '', '');
      SpreadsheetApp.getUi().alert(`Successfully synced ${result.imported_count} players!`);
    } else {
      logStatus('Full Sync Failed', 0, false, result.error, '');
      SpreadsheetApp.getUi().alert(`Sync failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Sync error:', error);
    logStatus('Sync Error', 0, false, error.toString(), '');
    SpreadsheetApp.getUi().alert(`Error: ${error.toString()}`);
  }
}

/**
 * Sync only new players (those without a sync status)
 */
function syncNewPlayers() {
  try {
    console.log('Starting new players sync...');
    logStatus('New Players Sync Started', 0, true, '', '');
    
    const players = readPlayersFromSheet();
    const newPlayers = filterNewPlayers(players);
    
    if (newPlayers.length === 0) {
      logStatus('No New Players', 0, true, '', 'All players already synced');
      SpreadsheetApp.getUi().alert('No new players to sync.');
      return;
    }
    
    const result = syncPlayersToAPI(newPlayers);
    
    if (result.success) {
      markPlayersAsSynced(newPlayers);
      logStatus('New Players Sync Complete', result.imported_count, true, '', '');
      SpreadsheetApp.getUi().alert(`Successfully synced ${result.imported_count} new players!`);
    } else {
      logStatus('New Players Sync Failed', 0, false, result.error, '');
      SpreadsheetApp.getUi().alert(`Sync failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('New players sync error:', error);
    logStatus('New Players Sync Error', 0, false, error.toString(), '');
    SpreadsheetApp.getUi().alert(`Error: ${error.toString()}`);
  }
}

/**
 * Test the API connection
 */
function testConnection() {
  try {
    const response = UrlFetchApp.fetch(`${CONFIG.API_BASE_URL}/api/players/tournament/${CONFIG.TOURNAMENT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.API_KEY}`
      }
    });
    
    if (response.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert('✅ Connection successful!');
      logStatus('Connection Test', 0, true, '', 'API connection successful');
    } else {
      SpreadsheetApp.getUi().alert('❌ Connection failed. Check your configuration.');
      logStatus('Connection Test', 0, false, `HTTP ${response.getResponseCode()}`, '');
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert(`❌ Connection error: ${error.toString()}`);
    logStatus('Connection Test', 0, false, error.toString(), '');
  }
}

/**
 * Show registration information and API details
 */
function showRegistrationInfo() {
  const info = `
Chess Tournament Registration Info

Tournament ID: ${CONFIG.TOURNAMENT_ID}
API Base URL: ${CONFIG.API_BASE_URL}
API Key: ${CONFIG.API_KEY}

Registration Endpoint:
${CONFIG.API_BASE_URL}/api/players/register/${CONFIG.TOURNAMENT_ID}

Supported Fields:
- name (required)
- uscf_id, fide_id, rating, section
- school, grade, email, phone
- state, city, notes
- parent_name, parent_email, parent_phone
- emergency_contact, emergency_phone
- tshirt_size, dietary_restrictions, special_needs

Webhook Support: ${CONFIG.WEBHOOK_URL ? 'Yes' : 'No'}
Auto Sync: ${CONFIG.AUTO_SYNC ? 'Yes' : 'No'}
  `;
  
  SpreadsheetApp.getUi().alert(info);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Read players from the configured sheet
 */
function readPlayersFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[CONFIG.HEADER_ROW - 1];
  const players = [];
  
  for (let i = CONFIG.HEADER_ROW; i < data.length; i++) {
    const row = data[i];
    const player = {};
    
    // Map columns to player fields
    Object.keys(CONFIG.COLUMN_MAPPINGS).forEach(column => {
      const fieldName = CONFIG.COLUMN_MAPPINGS[column];
      const columnIndex = column.charCodeAt(0) - 65; // Convert A=0, B=1, etc.
      const value = row[columnIndex];
      
      if (value && value.toString().trim() !== '') {
        player[fieldName] = value.toString().trim();
      }
    });
    
    // Only include players with names
    if (player.name) {
      players.push(player);
    }
  }
  
  return players;
}

/**
 * Filter out players that have already been synced
 */
function filterNewPlayers(players) {
  const statusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SyncStatus');
  if (!statusSheet) return players;
  
  const syncedNames = new Set();
  const data = statusSheet.getDataRange().getValues();
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const details = data[i][5]; // Details column
    if (details && details.includes('Synced:')) {
      const names = details.split('Synced:')[1].split(',');
      names.forEach(name => syncedNames.add(name.trim()));
    }
  }
  
  return players.filter(player => !syncedNames.has(player.name));
}

/**
 * Mark players as synced in the status sheet
 */
function markPlayersAsSynced(players) {
  const statusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SyncStatus');
  if (!statusSheet) return;
  
  const lastRow = statusSheet.getLastRow();
  const details = `Synced: ${players.map(p => p.name).join(', ')}`;
  statusSheet.getRange(lastRow, 6).setValue(details);
}

/**
 * Sync players to the tournament API
 */
function syncPlayersToAPI(players) {
  const payload = {
    api_key: CONFIG.API_KEY,
    players: players,
    lookup_ratings: true,
    auto_assign_sections: true,
    source: 'google_sheets'
  };
  
  const response = UrlFetchApp.fetch(`${CONFIG.API_BASE_URL}/api/players/api-import/${CONFIG.TOURNAMENT_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload)
  });
  
  const result = JSON.parse(response.getContentText());
  
  if (!result.success) {
    throw new Error(result.error || 'Unknown API error');
  }
  
  return result.data;
}

/**
 * Log status to the status sheet
 */
function logStatus(action, playersCount, success, errors, details) {
  const statusSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SyncStatus');
  if (!statusSheet) return;
  
  const timestamp = new Date();
  const newRow = [
    timestamp,
    action,
    playersCount,
    success ? 'Yes' : 'No',
    errors || '',
    details || ''
  ];
  
  statusSheet.appendRow(newRow);
}

/**
 * Trigger function for sheet edits
 */
function onSheetEdit() {
  // Only sync if auto-sync is enabled
  if (CONFIG.AUTO_SYNC) {
    try {
      syncNewPlayers();
    } catch (error) {
      console.error('Auto-sync error:', error);
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Run setup when script is first installed
function onInstall() {
  setup();
}

// ============================================================================
// GOOGLE FORMS EXTENSION
// ============================================================================
// This section enables automatic form response collection and import

/**
 * FORMS CONFIGURATION - UPDATE THESE VALUES FOR GOOGLE FORMS
 */
const FORMS_CONFIG = {
  // Set to true to enable automatic form response import
  ENABLE_FORM_IMPORT: true,
  
  // Your Google Form ID (get from form URL: https://forms.google.com/u/1/d/FORM_ID/edit)
  FORM_ID: 'your-form-id-here',
  
  // API Configuration (same as above)
  API_BASE_URL: CONFIG.API_BASE_URL,
  API_KEY: CONFIG.API_KEY,
  TOURNAMENT_ID: CONFIG.TOURNAMENT_ID,
  
  // How often to check for new responses (in minutes)
  CHECK_INTERVAL: 5,
  
  // Optional: Response limit per import
  RESPONSE_LIMIT: 100
};

/**
 * Setup form import triggers
 * Run this function to set up automatic form response collection
 */
function setupFormImport() {
  if (!FORMS_CONFIG.ENABLE_FORM_IMPORT) {
    console.log('Form import is disabled. Set ENABLE_FORM_IMPORT to true to enable.');
    return;
  }
  
  if (!FORMS_CONFIG.FORM_ID || FORMS_CONFIG.FORM_ID === 'your-form-id-here') {
    SpreadsheetApp.getUi().alert(
      'Error: Please set your FORM_ID in FORMS_CONFIG before setting up form import.'
    );
    return;
  }
  
  // Remove existing form import triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onFormSubmit' || 
        trigger.getHandlerFunction() === 'checkFormResponses') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new triggers
  // 1. On form submit trigger (real-time)
  ScriptApp.newTrigger('onFormSubmit')
    .onFormSubmit()
    .create();
  
  // 2. Periodic trigger (backup/batch processing)
  ScriptApp.newTrigger('checkFormResponses')
    .timeBased()
    .everyMinutes(FORMS_CONFIG.CHECK_INTERVAL)
    .create();
  
  console.log('Form import triggers set up successfully!');
  SpreadsheetApp.getUi().alert('✅ Form import configured! New form responses will be automatically imported.');
}

/**
 * Triggered automatically when form is submitted
 * This function is called immediately when someone submits the form
 */
function onFormSubmit(e) {
  if (!FORMS_CONFIG.ENABLE_FORM_IMPORT) {
    return;
  }
  
  try {
    console.log('Form submission detected...');
    
    // Get the form response
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();
    
    // Convert form response to player object
    const player = convertFormResponseToPlayer(itemResponses);
    
    if (!player || !player.name) {
      console.log('Invalid form response: missing name');
      return;
    }
    
    console.log(`New form submission: ${player.name}`);
    
    // Import the player immediately
    const result = syncPlayersToAPI([player]);
    
    if (result.success) {
      logFormImport(`Single Form Response: ${player.name}`, 1, true, '', 'Auto-imported on submission');
      
      // Optional: Send confirmation email
      if (player.email) {
        sendConfirmationEmail(player.email, player.name);
      }
    } else {
      logFormImport(`Failed: ${player.name}`, 0, false, result.error || 'Unknown error', '');
    }
  } catch (error) {
    console.error('Form submit error:', error);
    logFormImport('Form Submit Error', 0, false, error.toString(), '');
  }
}

/**
 * Check for new form responses and import them
 * This function can be triggered periodically or manually
 */
function checkFormResponses() {
  if (!FORMS_CONFIG.ENABLE_FORM_IMPORT) {
    console.log('Form import is disabled');
    return;
  }
  
  try {
    console.log('Checking for new form responses...');
    
    const form = FormApp.openById(FORMS_CONFIG.FORM_ID);
    const responses = form.getResponses();
    
    if (responses.length === 0) {
      console.log('No form responses found');
      return;
    }
    
    // Get the last imported timestamp
    const lastImportTime = getLastFormImportTime();
    
    // Filter new responses
    const newResponses = responses.filter(response => {
      const timestamp = response.getTimestamp();
      return !lastImportTime || timestamp > lastImportTime;
    });
    
    if (newResponses.length === 0) {
      console.log('No new responses since last import');
      return;
    }
    
    console.log(`Found ${newResponses.length} new form responses`);
    
    // Convert form responses to players
    const players = newResponses.map(response => {
      const itemResponses = response.getItemResponses();
      return convertFormResponseToPlayer(itemResponses);
    }).filter(player => player && player.name);
    
    if (players.length === 0) {
      console.log('No valid player data found in responses');
      return;
    }
    
    // Import all players
    const result = syncPlayersToAPI(players);
    
    if (result.success) {
      logFormImport(
        `Batch Import (${players.length} players)`,
        result.imported_count || players.length,
        true,
        '',
        `Imported: ${players.map(p => p.name).join(', ')}`
      );
      
      // Update last import time
      setLastFormImportTime(new Date());
      
      // Optional: Send confirmation emails
      players.forEach(player => {
        if (player.email) {
          sendConfirmationEmail(player.email, player.name);
        }
      });
    } else {
      logFormImport(
        'Batch Import Failed',
        0,
        false,
        result.error || 'Unknown error',
        `Failed to import ${players.length} players`
      );
    }
  } catch (error) {
    console.error('Form response check error:', error);
    logFormImport('Form Check Error', 0, false, error.toString(), '');
  }
}

/**
 * Convert a form response to a player object
 * Automatically detects field names from form questions
 */
function convertFormResponseToPlayer(itemResponses) {
  const player = {};
  
  // Map form questions to player fields
  itemResponses.forEach(itemResponse => {
    const question = itemResponse.getItem().getTitle().toLowerCase();
    const answer = itemResponse.getResponse();
    
    if (!answer) return;
    
    // Name field
    if (question.includes('name') || question.includes('player')) {
      if (question.includes('parent') || question.includes('guardian')) {
        player.parent_name = answer;
      } else {
        player.name = answer;
      }
    }
    
    // USCF ID
    if (question.includes('uscf') || question.includes('member id') || question.includes('membership')) {
      player.uscf_id = answer.toString().trim();
    }
    
    // FIDE ID
    if (question.includes('fide')) {
      player.fide_id = answer.toString().trim();
    }
    
    // Rating
    if (question.includes('rating') || question.includes('elo')) {
      const rating = parseFloat(answer);
      if (!isNaN(rating)) {
        player.rating = rating;
      }
    }
    
    // Section
    if (question.includes('section') || question.includes('division') || question.includes('category')) {
      player.section = answer;
    }
    
    // Email
    if (question.includes('email')) {
      if (question.includes('parent')) {
        player.parent_email = answer;
      } else {
        player.email = answer;
      }
    }
    
    // Phone
    if (question.includes('phone') || question.includes('telephone')) {
      if (question.includes('parent')) {
        player.parent_phone = answer;
      } else {
        player.phone = answer;
      }
    }
    
    // School
    if (question.includes('school') || question.includes('institution')) {
      player.school = answer;
    }
    
    // Grade
    if (question.includes('grade') || question.includes('year')) {
      player.grade = answer;
    }
    
    // City
    if (question.includes('city') || question.includes('town')) {
      player.city = answer;
    }
    
    // State
    if (question.includes('state') || question.includes('province')) {
      player.state = answer;
    }
    
    // Team
    if (question.includes('team') || question.includes('club') || question.includes('organization')) {
      player.team_name = answer;
    }
    
    // Notes
    if (question.includes('notes') || question.includes('comments') || question.includes('additional')) {
      player.notes = answer;
    }
    
    // Parent contact
    if (question.includes('emergency')) {
      if (question.includes('name')) {
        player.emergency_contact = answer;
      } else if (question.includes('phone') || question.includes('number')) {
        player.emergency_phone = answer;
      }
    }
  });
  
  return player;
}

/**
 * Manually import form responses
 */
function manualImportFormResponses() {
  if (!FORMS_CONFIG.FORM_ID || FORMS_CONFIG.FORM_ID === 'your-form-id-here') {
    SpreadsheetApp.getUi().alert('Please set your FORM_ID in FORMS_CONFIG first');
    return;
  }
  
  try {
    checkFormResponses();
    SpreadsheetApp.getUi().alert('Form responses imported successfully!');
  } catch (error) {
    SpreadsheetApp.getUi().alert(`Error importing form responses: ${error.toString()}`);
  }
}

/**
 * Get last form import time from properties
 */
function getLastFormImportTime() {
  const properties = PropertiesService.getScriptProperties();
  const lastTime = properties.getProperty('lastFormImportTime');
  return lastTime ? new Date(lastTime) : null;
}

/**
 * Set last form import time in properties
 */
function setLastFormImportTime(time) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('lastFormImportTime', time.toISOString());
}

/**
 * Log form import activity
 */
function logFormImport(action, count, success, error, details) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = spreadsheet.getSheetByName('FormImportLog');
  
  if (!logSheet) {
    logSheet = spreadsheet.insertSheet('FormImportLog');
    logSheet.getRange('A1:F1').setValues([[
      'Timestamp', 'Action', 'Responses Imported', 'Success', 'Error', 'Details'
    ]]);
    logSheet.getRange('A1:F1').setFontWeight('bold');
  }
  
  logSheet.appendRow([
    new Date(),
    action,
    count,
    success ? 'Yes' : 'No',
    error || '',
    details || ''
  ]);
}

/**
 * Send confirmation email to imported player
 */
function sendConfirmationEmail(email, playerName) {
  try {
    GmailApp.sendEmail(
      email,
      `Registration Confirmation - ${CONFIG.TOURNAMENT_ID}`,
      `Dear ${playerName},\n\nYour registration has been received and imported into the tournament system.\n\nTournament: ${CONFIG.TOURNAMENT_ID}\n\nThank you!\n\nIf you have any questions, please contact the tournament organizer.`
    );
  } catch (error) {
    console.log(`Failed to send confirmation email: ${error}`);
  }
}

/**
 * Add form import menu items
 */
function addFormImportMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Google Forms Import')
    .addItem('Setup Form Import (Auto)', 'setupFormImport')
    .addItem('Check for New Responses Now', 'checkFormResponses')
    .addItem('View Import Log', 'viewFormImportLog')
    .addToUi();
}

/**
 * View form import log
 */
function viewFormImportLog() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = spreadsheet.getSheetByName('FormImportLog');
  
  if (!logSheet) {
    SpreadsheetApp.getUi().alert('No form import log found. Run a form import first.');
    return;
  }
  
  spreadsheet.setActiveSheet(logSheet);
  SpreadsheetApp.getActiveRange().activate();
}

