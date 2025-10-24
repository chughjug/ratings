# Complete Deployment Guide - Google Forms Connector + Dynamic Configuration

## Overview

This guide covers deploying the Chess Tournament Director system with the new **dynamic Google Forms Connector** that automatically detects and uses the correct API domain.

## What's New in This Release

✅ **Dynamic Configuration** - `FORMS_CONFIG` automatically fetches tournament-specific settings from API
✅ **Domain Auto-Detection** - Works on localhost, Heroku, AWS, or custom domains without code changes
✅ **Complete 1279-Line Script** - Full Google Apps Script ready to copy and paste
✅ **Tournament-Specific Settings** - Each tournament can have its own form configuration
✅ **API Endpoint** - New `/api/registration/{tournamentId}/forms-config` endpoint

## Prerequisites

- Node.js 14+ and npm installed
- Heroku CLI installed (`heroku login`)
- Git repository initialized
- Google Account with Google Forms
- Database (SQLite or compatible)

## Part 1: Backend Deployment (Heroku)

### Step 1: Prepare Environment Variables

Create or update `.env` file:

```bash
NODE_ENV=production
PORT=5000
DATABASE_PATH=./chess_tournaments.db
API_KEY=your-secure-api-key-here
API_KEYS=your-secure-api-key-here,another-key,demo-key-123
CORS_ORIGIN=https://your-heroku-app.herokuapp.com
```

### Step 2: Verify Backend Code

The following files should be updated:

1. **`server/routes/registration.js`** - Has new `/forms-config` endpoint
2. **`server/index.js`** - CORS configuration for Heroku
3. **`package.json`** - All dependencies included

### Step 3: Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create Heroku app (if new)
heroku create chess-tournament-director

# Set environment variables on Heroku
heroku config:set NODE_ENV=production
heroku config:set API_KEY=your-secure-key
heroku config:set API_KEYS=your-secure-key,demo-key-123

# Deploy code
git add .
git commit -m "Deploy: Dynamic Google Forms configuration system"
git push heroku main

# Verify deployment
heroku open
heroku logs --tail

# Test the API endpoint
curl https://chess-tournament-director.herokuapp.com/api/registration/your-tournament-id/forms-config
```

### Step 4: Verify Heroku Deployment

```bash
# Check if server is running
heroku logs --tail

# Test database connection
heroku run node -e "const db = require('./server/database'); console.log('DB connected')"

# View environment variables
heroku config
```

## Part 2: Google Forms Setup

### Step 1: Create Google Form

1. Go to [Google Forms](https://forms.google.com)
2. Create a new form for your tournament
3. Add form fields:
   - Player Name (required)
   - USCF ID (optional)
   - Email (optional)
   - Phone (optional)
   - Other fields as needed

### Step 2: Get Form ID

1. Open your Google Form
2. Click the URL bar
3. Copy the ID from: `https://docs.google.com/forms/d/[FORM_ID]/edit`
4. Save this ID - you'll need it in Step 4

### Step 3: Store Form Configuration in Tournament

Update your tournament settings with:

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

## Part 3: Google Apps Script Setup

### Step 1: Get the Complete Script

The complete Google Apps Script is in: `/ratings/google-apps-script.js`

This file contains:
- ✓ All 1279 lines of code
- ✓ Dynamic configuration loading
- ✓ Form response handling
- ✓ Player import logic
- ✓ Rating lookups
- ✓ Auto-section assignment

### Step 2: Create Google Sheet (if needed)

1. Go to [Google Sheets](https://sheets.google.com)
2. Create new spreadsheet
3. Name it (e.g., "Tournament Registration Import")

### Step 3: Add Google Apps Script

1. Open your Google Sheet
2. Click **Extensions → Apps Script**
3. Delete any existing code
4. Copy entire contents of `google-apps-script.js`
5. Paste into Apps Script editor
6. Click **Save**

### Step 4: Configure for Your Tournament

In Google Apps Script console, run:

```javascript
// Set your tournament ID and API domain
FORMS_CONFIG.TOURNAMENT_ID = 'your-tournament-id-here';
FORMS_CONFIG.API_BASE_URL = 'https://chess-tournament-director.herokuapp.com';

// Run setup
setup();

// Initialize form import with your settings
setupFormImport();
```

### Step 5: Verify Configuration Loaded

In Apps Script console, check:
- ✓ "Chess Tournament" menu appears
- ✓ "Google Forms Import" submenu appears
- ✓ Click "Chess Tournament" → "Test Connection"
- ✓ You should see: "✅ Connection successful!"

## Part 4: API Testing

### Test Configuration Endpoint

```bash
curl "https://chess-tournament-director.herokuapp.com/api/registration/your-tournament-id/forms-config"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "ENABLE_FORM_IMPORT": true,
    "FORM_ID": "your-form-id",
    "API_BASE_URL": "https://chess-tournament-director.herokuapp.com",
    "API_KEY": "your-key",
    "TOURNAMENT_ID": "your-tournament-id",
    "CHECK_INTERVAL": 5,
    "SEND_CONFIRMATION_EMAILS": true,
    "AUTO_ASSIGN_SECTIONS": true,
    "LOOKUP_RATINGS": true,
    "tournament": { /* tournament data */ }
  }
}
```

### Test Form Import Endpoint

```bash
curl -X POST "https://chess-tournament-director.herokuapp.com/api/players/api-import/your-tournament-id" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "demo-key-123",
    "players": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "rating": 1600
      }
    ],
    "lookup_ratings": true,
    "auto_assign_sections": true
  }'
```

## Part 5: Monitoring and Troubleshooting

### Check Heroku Logs

```bash
# Real-time logs
heroku logs --tail

# Specific app logs
heroku logs -n 100

# Errors only
heroku logs --tail | grep ERROR
```

### Check Google Apps Script Logs

1. Open Google Apps Script
2. Click the "Executions" tab (clock icon)
3. Look for errors or click on a recent run to see logs

### Monitor Form Imports

1. In Google Sheet, check "FormImportLog" sheet
2. Should show:
   - Timestamp of each import
   - Number of players imported
   - Success/failure status

### Common Issues

**Issue: "Configuration failed to load"**
- Check: Is Heroku app running?
- Check: Is tournament ID correct?
- Test endpoint in browser

**Issue: "Connection failed"**
- Verify API key is correct
- Check Heroku logs for errors
- Ensure API is deployed

**Issue: "No form responses importing"**
- Verify FORM_ID in tournament settings
- Check that Google Form has responses
- Look at FormImportLog sheet for errors

## Part 6: Scaling and Best Practices

### Security

```bash
# Rotate API keys regularly
heroku config:set API_KEY=$(openssl rand -base64 32)

# Use environment-specific keys
# Development: demo-key-123
# Production: Strong random key
```

### Performance

```bash
# Monitor database size
heroku run "du -h chess_tournaments.db"

# Check connection pool
heroku config:get DATABASE_POOL_SIZE
```

### Backups

```bash
# Backup database from Heroku
heroku run "sqlite3 chess_tournaments.db .dump" > backup.sql

# Backup file storage
heroku run "tar czf uploads-backup.tar.gz uploads/"
```

## Part 7: Rollback and Recovery

### If Something Goes Wrong

```bash
# View recent deployments
heroku releases

# Rollback to previous version
heroku rollback

# Or deploy specific commit
git push heroku commit-sha:main -f
```

### Database Recovery

```bash
# Reset database
heroku run "rm chess_tournaments.db && npm run setup:db"

# Restore from backup
heroku run sqlite3 chess_tournaments.db < backup.sql
```

## Deployment Checklist

- [ ] `.env` file configured with secure keys
- [ ] Backend code deployed to Heroku
- [ ] Database initialized on Heroku
- [ ] Google Form created with proper fields
- [ ] Tournament settings updated with form config
- [ ] Google Apps Script copied to Sheet
- [ ] FORMS_CONFIG.TOURNAMENT_ID set
- [ ] FORMS_CONFIG.API_BASE_URL set to Heroku domain
- [ ] setup() function run in Apps Script
- [ ] setupFormImport() function run
- [ ] "Test Connection" succeeds
- [ ] FormImportLog sheet created
- [ ] Test form submission completes
- [ ] Players appear in tournament system
- [ ] Logs show successful imports

## Documentation

For more details, see:
- `GOOGLE_FORMS_DYNAMIC_CONFIG.md` - Complete configuration guide
- `GOOGLE_FORMS_SETUP_QUICK_START.md` - Quick 5-minute setup
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details

## Support

If you encounter issues:
1. Check Heroku logs: `heroku logs --tail`
2. Check Google Apps Script logs: Extensions → Apps Script → Executions
3. Verify tournament settings have google_forms_config
4. Verify FORM_ID is correct
5. Test the `/forms-config` endpoint directly

## Next Steps

After successful deployment:
1. Run full test with real form submissions
2. Monitor FormImportLog sheet for imports
3. Verify players are properly assigned to sections
4. Set up email confirmations if enabled
5. Consider automating backups

---

**Version:** 1.0 - Complete Dynamic Google Forms Integration
**Last Updated:** October 24, 2025
**Status:** Production Ready ✅
