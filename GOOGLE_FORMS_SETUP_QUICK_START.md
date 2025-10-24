# Google Forms Connector - Quick Start Guide

## 5-Minute Setup

### Step 1: Store Tournament Settings (Web App)

Update your tournament with Google Forms configuration. This should be done in your tournament management interface or via API:

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

**How to find your Google Form ID:**
1. Open your Google Form
2. Click the URL bar
3. The ID is the long string between `/forms/d/` and `/edit`
4. Example: `https://docs.google.com/forms/d/1a2b3c4d5e6f7g/edit`
   - ID: `1a2b3c4d5e6f7g`

### Step 2: Copy Google Apps Script Code

1. Open the `google-apps-script.js` file in this repository
2. Go to your Google Sheet
3. Click Extensions → Apps Script
4. Delete any existing code
5. Paste the entire contents of `google-apps-script.js`
6. Click Save

### Step 3: Set Initial Configuration (Google Apps Script)

In Google Apps Script, set your tournament ID and API URL:

```javascript
// FORMS_CONFIG.TOURNAMENT_ID = 'your-tournament-id-here';
// FORMS_CONFIG.API_BASE_URL = 'http://localhost:5000';  // or your production domain
```

### Step 4: Run Setup Function

In Google Apps Script, run the `setup()` function once:

```javascript
setup();
```

This creates the necessary sheets and menus.

### Step 5: Initialize Forms Configuration

Run the `setupFormImport()` function with your tournament details:

**For Development:**
```javascript
setupFormImport('your-tournament-id', 'http://localhost:5000');
```

**For Heroku:**
```javascript
setupFormImport('your-tournament-id', 'https://chess-tournament-director.herokuapp.com');
```

**For Custom Domain:**
```javascript
setupFormImport('your-tournament-id', 'https://your-domain.com');
```

### Step 6: Verify It Works

1. Open your Google Sheet
2. Look for the new menu: "Chess Tournament" and "Google Forms Import"
3. Click "Chess Tournament" → "Test Connection"
4. You should see: "✅ Connection successful!"

That's it! Your Google Forms are now connected to your tournament system with the correct domain.

## What Happens Next?

- Every 5 minutes (or your configured interval), new form responses are checked
- Matching form fields are automatically extracted
- Players are imported to your tournament
- Confirmation emails are sent (if enabled)
- Player sections are auto-assigned (if enabled)
- Ratings are looked up (if enabled)

## Common Setup Scenarios

### Scenario 1: Single Tournament, Development

```javascript
// Once in Google Apps Script console:
FORMS_CONFIG.TOURNAMENT_ID = 'abc-123-def-456';
FORMS_CONFIG.API_BASE_URL = 'http://localhost:5000';
setupFormImport();
```

### Scenario 2: Multiple Tournaments

**Sheet 1 (Tournament A):**
```javascript
setupFormImport('tournament-a-id', 'https://my-site.com');
```

**Sheet 2 (Tournament B):**
```javascript
setupFormImport('tournament-b-id', 'https://my-site.com');
```

### Scenario 3: Moving from Development to Production

**Before (Development):**
```javascript
setupFormImport('my-tournament-id', 'http://localhost:5000');
```

**After (Production - Heroku):**
```javascript
setupFormImport('my-tournament-id', 'https://chess-tournament-director.herokuapp.com');
```

Just change the domain - that's it!

## Monitoring

### Check Import History

1. In your Google Sheet, look for the "FormImportLog" sheet
2. It shows:
   - Timestamp of each import
   - Number of players imported
   - Success/failure status
   - Any errors that occurred

### View Imported Players

1. Go back to the tournament web app
2. View the "Players" or "Pairings" section
3. Your imported players should appear

### Debugging

If imports aren't working:

1. **Open Google Apps Script console** (Extensions → Apps Script → Ctrl+Enter)
2. **Look for error messages** about:
   - Wrong tournament ID
   - Wrong API URL
   - Network errors
3. **Test the connection** from the "Chess Tournament" menu
4. **Check the endpoint** in your browser:
   - `https://your-api.com/api/registration/your-tournament-id/forms-config`

## Environment Variables (Optional)

If you want to use environment variables for the API key:

In your server's `.env` file:
```
API_KEY=your-secure-api-key-here
```

The system will automatically use this when fetching configuration.

## Troubleshooting

### "Configuration failed to load from API"

**Check:**
- [ ] Is your API server running?
- [ ] Is the tournament ID correct?
- [ ] Is the API URL correct?
- [ ] Are you connected to the internet?

**Test the endpoint:**
```
https://your-api.com/api/registration/your-tournament-id/forms-config
```

You should see a JSON response.

### "Form Import is disabled"

**Solution:** Set `ENABLE_FORM_IMPORT: true` in tournament settings.

### "No new responses since last import"

**This is normal.** The system is working correctly - there just aren't any new form responses.

### Forms keep pointing to wrong domain

1. Clear browser cache
2. Run `setupFormImport()` again
3. Verify you provided the correct API URL

## Next Steps

1. ✅ Complete the 5-minute setup above
2. 📝 Read the [Dynamic Configuration Guide](GOOGLE_FORMS_DYNAMIC_CONFIG.md) for details
3. 🧪 Test with a few form submissions
4. 📊 Monitor the FormImportLog sheet for imports
5. 🔧 Adjust settings in tournament configuration as needed

## Support

**Common Questions:**

**Q: Can I use the same Google Form for multiple tournaments?**
A: Yes! Each tournament has its own configuration. Just create different setup functions for each sheet.

**Q: What if my API domain changes?**
A: Just run setupFormImport() again with the new domain. No code changes needed!

**Q: Are my API keys secure?**
A: API keys from forms config are generated by the server. If you want to change it, update your server's environment variables.

**Q: Can I disable form import for a tournament?**
A: Yes, set `ENABLE_FORM_IMPORT: false` in tournament settings.

**Q: What fields are automatically extracted from forms?**
A: Name, USCF ID, FIDE ID, Rating, Section, Email, Phone, School, Grade, City, State, Parent Name, Parent Email, Parent Phone, Emergency Contact, Emergency Phone, and Notes.

---

**Ready to get started?** Follow the 5 steps above and you'll be importing form responses in minutes!
