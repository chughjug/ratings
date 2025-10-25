# Complete Google Apps Script - 1200+ Lines

> **IMPORTANT**: Copy this entire code block and paste it into your Google Apps Script editor.

```javascript
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
  API_BASE_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com', // Production tournament system URL
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
// SAFE UI HELPER
// ============================================================================

/**
 * Safely show an alert dialog, with console fallback for non-UI contexts
 * @param {string} message - The message to display
 */
function safeAlert(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    // If UI is not available (e.g., from a trigger), log to console instead
    console.log('Alert: ' + message);
  }
}

// [CODE CONTINUES... 1200+ LINES TOTAL]
// Please refer to the file at /google-apps-script.js for the complete code
```

## How to Use

1. Copy the complete code from `/google-apps-script.js`
2. Open your Google Sheet
3. Click **Extensions → Apps Script**
4. Delete any existing code
5. Paste the complete script
6. Click **Save**
7. In the console, run: `setup()`
8. Then run: `setupFormImport('your-tournament-id', 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com')`

## Complete Code Location

The full 1200+ line code is available at:
- **File**: `/google-apps-script.js` in the repository root
- **Direct Link**: Copy from the Google Forms Connector modal in your tournament settings

## Configuration

Update these values in the copied script:

```javascript
const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: 'your-google-form-id',  // Get this from your Google Form URL
  API_BASE_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com',  // Production tournament system URL
  API_KEY: 'your-api-key',
  TOURNAMENT_ID: 'your-tournament-id',
  CHECK_INTERVAL: 5,
  SEND_CONFIRMATION_EMAILS: true,
  AUTO_ASSIGN_SECTIONS: true,
  LOOKUP_RATINGS: true
};
```

## ⚙️ Your Tournament Configuration

**Production API Endpoint**: `https://chess-tournament-director-6ce5e76147d7.herokuapp.com`

**Available Endpoints**:
- Tournament Info: `/api/registration/{tournamentId}/info`
- Forms Config: `/api/registration/{tournamentId}/forms-config`
- Player Import: `/api/players/api-import/{tournamentId}`
- Player Registration: `/api/registrations/submit`

**Quick Setup**:
1. Get your tournament ID from the tournament URL
2. Update `TOURNAMENT_ID` in the script
3. Run `setupFormImport('your-tournament-id')`

## Support

See the documentation files:
- `GOOGLE_FORMS_SETUP_QUICK_START.md` - Quick start guide
- `GOOGLE_FORMS_DYNAMIC_CONFIG.md` - Complete technical guide  
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
