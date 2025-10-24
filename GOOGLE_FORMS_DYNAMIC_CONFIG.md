# Google Forms Connector - Dynamic Configuration Guide

## Overview

The Google Forms Connector now supports **dynamic, tournament-specific configuration** that automatically adapts to your deployment domain and tournament settings. This eliminates the need for hardcoded configuration values and ensures the system works seamlessly across different environments (localhost, Heroku, custom domains, etc.).

## Key Features

✅ **Dynamic Domain Detection** - Automatically uses the correct API URL based on where your system is deployed
✅ **Tournament-Specific Settings** - Each tournament can have custom Google Forms settings
✅ **Zero Hardcoding** - No need to manually update configuration values
✅ **Fallback Support** - Works offline with sensible defaults if API is unreachable
✅ **Environment Agnostic** - Works on localhost, Heroku, AWS, or any custom domain

## How It Works

### 1. Configuration Fetching Flow

```
Google Apps Script
    ↓ (calls setupFormImport with tournament ID)
    ↓
API Endpoint: /api/registration/{tournamentId}/forms-config
    ↓ (server analyzes request domain)
    ↓
Returns Configuration:
  - API_BASE_URL: [dynamically determined from request host]
  - FORM_ID: [from tournament settings]
  - TOURNAMENT_ID: [from parameter]
  - API_KEY: [from environment]
  - Other tournament-specific settings
    ↓
Google Apps Script stores config in FORMS_CONFIG object
    ↓
All future API calls use the dynamic configuration
```

### 2. Setup Instructions

#### For Development (localhost)

```javascript
// In Google Apps Script, run this once:
setupFormImport(
  'your-tournament-id',
  'http://localhost:5000'  // or your dev server port
);
```

#### For Production (Heroku)

```javascript
// In Google Apps Script, run this once:
setupFormImport(
  'your-tournament-id',
  'https://chess-tournament-director.herokuapp.com'
);
```

#### For Custom Domain

```javascript
// In Google Apps Script, run this once:
setupFormImport(
  'your-tournament-id',
  'https://mytournaments.example.com'
);
```

### 3. Initial Configuration in Tournament Settings

To enable Google Forms import for a tournament, you need to store settings in the tournament's `settings` JSON field:

```json
{
  "google_forms_config": {
    "ENABLE_FORM_IMPORT": true,
    "FORM_ID": "your-google-form-id-here",
    "CHECK_INTERVAL": 5,
    "SEND_CONFIRMATION_EMAILS": true,
    "AUTO_ASSIGN_SECTIONS": true,
    "LOOKUP_RATINGS": true
  }
}
```

## API Endpoint

### GET /api/registration/{tournamentId}/forms-config

Retrieves tournament-specific Google Forms Connector configuration.

**Request:**
```
GET /api/registration/399a6188-406c-45ea-b078-ae37a0fdd509/forms-config
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "ENABLE_FORM_IMPORT": true,
    "FORM_ID": "15fTL-FenfGKK3s_6IMcu6FeeYFONIyJUD9s0eWSqCS4",
    "API_BASE_URL": "https://chess-tournament-director-6ce5e76147d7.herokuapp.com",
    "API_KEY": "demo-key-123",
    "TOURNAMENT_ID": "399a6188-406c-45ea-b078-ae37a0fdd509",
    "CHECK_INTERVAL": 5,
    "SEND_CONFIRMATION_EMAILS": true,
    "AUTO_ASSIGN_SECTIONS": true,
    "LOOKUP_RATINGS": true,
    "tournament": {
      "id": "399a6188-406c-45ea-b078-ae37a0fdd509",
      "name": "Summer Chess Championship",
      "format": "round-robin",
      "rounds": 7,
      "city": "Boston",
      "state": "MA",
      "location": "Community Center",
      "start_date": "2025-06-01",
      "end_date": "2025-08-15",
      "allow_registration": true
    }
  }
}
```

**Response (Error - Tournament Not Found):**
```json
{
  "success": false,
  "error": "Tournament not found"
}
```

## Configuration Object Structure

### FORMS_CONFIG

```javascript
{
  // Core Configuration
  ENABLE_FORM_IMPORT: boolean,        // Enable/disable form import
  FORM_ID: string,                    // Google Form ID
  API_BASE_URL: string,               // API server URL (DYNAMIC)
  API_KEY: string,                    // API authentication key
  TOURNAMENT_ID: string,              // Tournament ID
  CHECK_INTERVAL: number,             // Minutes between checks
  
  // Import Options
  SEND_CONFIRMATION_EMAILS: boolean,  // Send emails to imported players
  AUTO_ASSIGN_SECTIONS: boolean,      // Automatically assign player sections
  LOOKUP_RATINGS: boolean,            // Lookup ratings from USCF/FIDE
  
  // Internal State
  _initialized: boolean               // Configuration loaded from API
}
```

## Google Apps Script Functions

### setupFormImport(tournamentId, apiBaseUrl)

Main setup function to configure and enable form import.

**Parameters:**
- `tournamentId` (string): Your tournament ID
- `apiBaseUrl` (string, optional): API server URL (defaults to `http://localhost:3000`)

**Usage:**
```javascript
// Setup with explicit parameters
setupFormImport('your-tournament-id', 'https://your-domain.com');

// Setup using pre-configured tournament ID
setupFormImport();
```

### fetchFormsConfig(tournamentId, apiBaseUrl)

Fetches configuration from the API (called automatically by setupFormImport).

**Returns:** boolean (true if successful)

**Usage:**
```javascript
const success = fetchFormsConfig('your-tournament-id', 'https://your-domain.com');
if (success) {
  console.log('Configuration loaded from API');
}
```

## Examples

### Example 1: Basic Setup

```javascript
// In Google Apps Script, paste this and run it once:

// Set your tournament ID and API URL
FORMS_CONFIG.TOURNAMENT_ID = '399a6188-406c-45ea-b078-ae37a0fdd509';
FORMS_CONFIG.API_BASE_URL = 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com';

// Now setup the form import
setupFormImport();
```

### Example 2: Multi-Tournament Setup

If you have multiple Google Sheets, each can connect to a different tournament:

**Sheet 1 - Tournament A:**
```javascript
setupFormImport('tournament-a-id', 'https://chess.example.com');
```

**Sheet 2 - Tournament B:**
```javascript
setupFormImport('tournament-b-id', 'https://chess.example.com');
```

### Example 3: Development to Production Migration

```javascript
// Development setup
setupFormImport('tournament-id', 'http://localhost:5000');

// When moving to production, just change the URL:
setupFormImport('tournament-id', 'https://chess-tournament-director.herokuapp.com');
// The tournament ID and form ID don't change!
```

## Troubleshooting

### Issue: "Configuration failed to load from API"

**Causes:**
1. Tournament ID doesn't exist
2. API server is not running
3. Wrong API URL provided
4. Network/CORS issues

**Solution:**
1. Verify tournament ID in your system
2. Check that API server is running
3. Test the endpoint in browser:
   ```
   https://your-api-domain.com/api/registration/your-tournament-id/forms-config
   ```
4. Check browser console for CORS errors

### Issue: "API_BASE_URL is still pointing to wrong domain"

**Solution:**
The dynamic configuration automatically detects the domain from the request. If you're still seeing the wrong domain:
1. Clear browser cache
2. Run `setupFormImport()` again
3. Check that you're using the correct API URL when calling the function

### Issue: Form responses are not importing

**Checks:**
1. Verify Google Forms Connector is enabled in tournament settings
2. Verify FORM_ID is correct in tournament settings
3. Check Google Apps Script console for errors
4. Run "Check for New Responses Now" from the menu manually
5. Verify API connection with "Test Connection" from the menu

## Database Schema

When storing tournament settings with Google Forms config:

```sql
UPDATE tournaments 
SET settings = JSON_OBJECT(
  'google_forms_config', JSON_OBJECT(
    'ENABLE_FORM_IMPORT', true,
    'FORM_ID', '15fTL-FenfGKK3s_6IMcu6FeeYFONIyJUD9s0eWSqCS4',
    'CHECK_INTERVAL', 5,
    'SEND_CONFIRMATION_EMAILS', true,
    'AUTO_ASSIGN_SECTIONS', true,
    'LOOKUP_RATINGS', true
  )
)
WHERE id = 'your-tournament-id';
```

## Best Practices

1. **Always use the dynamic setup** - Don't hardcode configuration values
2. **Store Form ID in tournament settings** - Makes it easy to change without code updates
3. **Test the endpoint** - Verify the `/forms-config` endpoint works before importing
4. **Monitor imports** - Check the FormImportLog sheet to ensure successful imports
5. **Use environment variables** - Store API keys in environment variables, not in code

## Migration Guide (From Old System)

If you were using the old hardcoded configuration:

**Old Way (❌ Don't do this anymore):**
```javascript
const FORMS_CONFIG = {
  FORM_ID: '15fTL-FenfGKK3s_6IMcu6FeeYFONIyJUD9s0eWSqCS4',
  API_BASE_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/',
  TOURNAMENT_ID: '399a6188-406c-45ea-b078-ae37a0fdd509',
  // ... other hardcoded values
};
```

**New Way (✅ Do this instead):**
```javascript
// In your Google Sheet, call this function once:
setupFormImport(
  '399a6188-406c-45ea-b078-ae37a0fdd509',  // Tournament ID
  'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/'  // Your domain
);

// Then store Form ID in the tournament settings in the web app
// The configuration is now dynamic and will work on any domain!
```

## Benefits

| Aspect | Old System | New System |
|--------|-----------|-----------|
| **Domain Changes** | Manual code update required | Automatic detection |
| **Multiple Tournaments** | Difficult, need separate scripts | Single script, multiple configs |
| **Deployment** | Hard-coded values cause issues | Works everywhere automatically |
| **Maintenance** | High - must update code manually | Low - configuration in database |
| **Security** | API keys in code (risky) | API keys from environment |
| **Scalability** | Limited | Unlimited tournaments |

## Support

For issues or questions about the dynamic configuration system, check:
1. Google Apps Script console for error messages
2. The FormImportLog sheet for import history
3. The API endpoint response with browser developer tools
4. Server logs for API errors
