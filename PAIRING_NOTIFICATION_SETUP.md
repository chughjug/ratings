# Pairing Notification System Setup Guide

This guide explains how to set up email notifications that are automatically sent when tournament pairings are generated.

## System Overview

The notification system has three components:

1. **Backend Webhook Sender** - Your Chess Tournament server sends pairings data
2. **Google Apps Script Receiver** - Receives webhook and processes notifications
3. **Email Service** - Sends formatted emails to recipients

## Step 1: Set Up Google Apps Script

### Create the Script

1. Go to [script.google.com](https://script.google.com)
2. Create a new project (click "+ New project")
3. Name it: `Chess Tournament Pairings Notifier`
4. Replace the default code with the complete script from `google-apps-script-pairings.gs`
5. Save the project

### Deploy as Web App

1. Click the **"Deploy"** button (top right)
2. Select **"New deployment"**
3. Click the gear icon and choose **"Web app"**
4. Configure:
   - **Execute as**: Your email address
   - **Who has access**: "Anyone"
5. Click **"Deploy"**
6. Copy the deployment URL (it will look like: `https://script.google.com/macros/d/.../usercontent`)
7. **Save this URL** - you'll need it for the backend

### Alternative: Using a Google Sheet for Player Emails

If you want to manage recipient emails in a Google Sheet:

1. Create or use an existing Google Sheet
2. Create a "Players" tab with columns:
   - Column A: Player Names
   - Column B: Email Addresses
3. Update the CONFIG in the Apps Script:
   ```javascript
   const CONFIG = {
     SHEET_ID: 'YOUR_SHEET_ID_HERE', // Found in Sheet URL
     SHEET_NAME: 'Players',
     EMAIL_COLUMN: 'B',
     PLAYER_NAME_COLUMN: 'A',
     // ... rest of config
   };
   ```

## Step 2: Configure Backend Environment

### Set Environment Variable

Add the webhook URL to your backend environment:

```bash
# In .env file or your hosting platform
PAIRING_NOTIFICATION_WEBHOOK=https://script.google.com/macros/d/.../usercontent
```

### For Heroku:

```bash
heroku config:set PAIRING_NOTIFICATION_WEBHOOK="https://script.google.com/macros/d/.../usercontent" --app your-app-name
```

### For Local Development:

Add to your `.env` file:
```
PAIRING_NOTIFICATION_WEBHOOK=https://script.google.com/macros/d/.../usercontent
```

## Step 3: Customize Notification Settings

Edit the CONFIG section in the Google Apps Script to customize:

### Email Recipients

```javascript
// Send to hardcoded recipients
DEFAULT_RECIPIENTS: [
  'td@example.com',
  'organizer@example.com'
],

// Or read from Google Sheet
SEND_TO_ALL_PLAYERS: false,
SEND_TO_ROUND_PARTICIPANTS: true, // Email players in the round
```

### Email Template

```javascript
// Subject line (supports {round} and {tournamentName} placeholders)
SUBJECT_TEMPLATE: 'Round {round} Pairings - {tournamentName}',

// Additional settings
INCLUDE_STANDINGS: true,
INCLUDE_BRACKET_VIEW: false,
```

### CC/BCC

```javascript
CC_EMAILS: ['another@example.com'],
BCC_EMAILS: ['archive@example.com'],
```

## Step 4: Test the System

### Option A: Test Webhook from Apps Script

1. In Google Apps Script, click "Run" > select `testSendEmail` function
2. Check the execution logs to see if test email was sent
3. Check your inbox

### Option B: Test from Backend

When you generate pairings, the webhook will automatically trigger:

```bash
curl -X POST http://localhost:5000/api/pairings/generate/section \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "test-tournament-id",
    "round": 1,
    "sectionName": "Open"
  }'
```

You should receive an email with the pairings.

## Step 5: Verify Configuration

### Check Backend Logs

```bash
# Look for webhook messages
tail -f server.log | grep -i webhook
```

Expected output:
```
Pairing notification webhook sent successfully
```

### Check Apps Script Logs

1. In Google Apps Script editor, click **"Execution log"** (bottom)
2. Should see entries like:
   ```
   Processing pairings for Tournament Name - Round 1
   Email sent to player@example.com
   ```

## Advanced Configuration

### Custom Email Template

Modify the `buildEmailContent()` function in the Apps Script to customize the email HTML:

```javascript
function buildEmailContent(tournament, round, pairings) {
  // Customize the HTML structure here
  let html = `
    <div>
      <!-- Your custom HTML -->
    </div>
  `;
  // ...
}
```

### Multiple Tournament Types

If you have different email templates for different tournament formats:

```javascript
function buildEmailContent(tournament, round, pairings) {
  if (tournament.format === 'quad') {
    return buildQuadEmailContent(tournament, round, pairings);
  } else if (tournament.format === 'swiss') {
    return buildSwissEmailContent(tournament, round, pairings);
  }
  // ...
}
```

### Include Player Email in Notification

To include player emails in the webhook payload, update the backend to fetch player emails:

```javascript
// In pairings.js - modify the webhook payload
pairings.forEach(p => {
  p.white.email = p.white_player_email; // Include from database
  p.black.email = p.black_player_email; // Include from database
});
```

### Send Emails via Gmail Account

By default, emails are sent from the Google Apps Script default Gmail account. To customize:

1. Use `GmailApp.sendEmail()` with the `from` parameter (if available in your plan)
2. Or use a third-party email service (SendGrid, Mailgun, etc.)

## Troubleshooting

### Webhook Not Receiving Requests

1. **Check Environment Variable**: Verify `PAIRING_NOTIFICATION_WEBHOOK` is set correctly
2. **Check Backend Logs**: Look for error messages
3. **Test Direct Call**: Make a manual HTTP request to the webhook URL

### Emails Not Sending

1. **Check Gmail Permissions**: The Apps Script needs Gmail permissions
2. **Review Apps Script Logs**: Look for error messages in execution log
3. **Check Recipient Addresses**: Ensure email addresses are valid
4. **Test Independently**: Run `testSendEmail()` function manually

### "Script resource exceeded" Error

If you send too many emails at once, Google might rate limit. Solution:

```javascript
// Add delay between emails in Apps Script
recipients.forEach((recipient, index) => {
  Utilities.sleep(1000); // 1 second delay between emails
  // Send email...
});
```

### Wrong Recipients Getting Emails

1. Check `CONFIG.DEFAULT_RECIPIENTS` array
2. Verify Google Sheet has correct emails in correct columns
3. Ensure `SEND_TO_ROUND_PARTICIPANTS` is set correctly

## Webhook Payload Format

When pairings are generated, the backend sends this JSON:

```json
{
  "event": "pairings_generated",
  "tournament": {
    "id": "tournament-123",
    "name": "Spring Chess Tournament 2024",
    "format": "swiss",
    "rounds": 5
  },
  "round": 1,
  "pairingsCount": 12,
  "timestamp": "2024-10-24T14:30:00.000Z",
  "pairings": [
    {
      "board": 1,
      "white": {
        "id": "player-1",
        "name": "Alice Johnson",
        "rating": 1850
      },
      "black": {
        "id": "player-2",
        "name": "Bob Smith",
        "rating": 1820
      },
      "section": "Open"
    }
  ]
}
```

## Email Output Example

The system sends both HTML-formatted and plain text versions of emails with:

- Tournament name and details
- Round number
- Board-by-board pairings with:
  - Player names
  - Ratings
  - Section info
- Formatted table for easy reading
- Instructions for players

## Next Steps

1. ✅ Deploy Google Apps Script
2. ✅ Configure environment variable
3. ✅ Test with `testSendEmail()`
4. ✅ Generate pairings and verify email receipt
5. ✅ Customize email template as needed
6. ✅ Set up recipient list (hardcoded or Sheet-based)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Apps Script execution logs
3. Check backend server logs for webhook errors
4. Verify Gmail permissions are granted to the Apps Script

## References

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Gmail Service Reference](https://developers.google.com/apps-script/reference/gmail)
- [Content Service (Webhooks)](https://developers.google.com/apps-script/reference/content)
