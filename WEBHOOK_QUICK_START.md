# Pairing Notification Webhook - Quick Start

Get pairings emailed to tournament directors and participants automatically!

## 3-Step Setup

### Step 1: Deploy Google Apps Script (5 minutes)

1. Go to https://script.google.com
2. Create new project → name it "Chess Tournament Pairings Notifier"
3. Copy all code from `google-apps-script-pairings.gs` into the editor
4. Click **Deploy** → **New deployment** → **Web app**
   - Execute as: Your email
   - Who has access: Anyone
5. Click **Deploy** and **copy the deployment URL**

Example URL looks like:
```
https://script.google.com/macros/d/1VxL-a1B2c3D4e5F6g7h8i9j0k/usercontent
```

### Step 2: Configure Backend (2 minutes)

**For local development** - add to `.env`:
```
PAIRING_NOTIFICATION_WEBHOOK=https://script.google.com/macros/d/YOUR_DEPLOYMENT_URL/usercontent
```

**For Heroku**:
```bash
heroku config:set PAIRING_NOTIFICATION_WEBHOOK="https://script.google.com/macros/d/YOUR_DEPLOYMENT_URL/usercontent"
```

**For Docker/Production** - set environment variable:
```bash
export PAIRING_NOTIFICATION_WEBHOOK="https://script.google.com/macros/d/YOUR_DEPLOYMENT_URL/usercontent"
```

### Step 3: Customize Recipients (2 minutes)

Edit the CONFIG section in your Google Apps Script:

```javascript
const CONFIG = {
  // Option 1: Hardcoded recipients
  DEFAULT_RECIPIENTS: [
    'tournament-director@example.com',
    'organizer@example.com'
  ],
  
  // Option 2: Send to players in the round
  SEND_TO_ROUND_PARTICIPANTS: true,
  
  // Or manage in a Google Sheet
  SHEET_ID: 'YOUR_SHEET_ID',
};
```

## That's It! 🎉

Now when you generate pairings, emails are automatically sent!

## Test It

### In Google Apps Script:
1. Click the play button → select `testSendEmail`
2. Check your email (should arrive in 1-2 seconds)

### Via API:
```bash
curl -X POST http://localhost:5000/api/pairings/generate/section \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "your-tournament-id",
    "round": 1,
    "sectionName": "Open"
  }'
```

Check your email for the pairings notification!

## Email Example

Recipients will receive a beautifully formatted email containing:

- ✅ Tournament name and details
- ✅ Round number
- ✅ All pairings with player names & ratings
- ✅ Organized by board
- ✅ Section information
- ✅ Instructions for players

## Recipient Options

### Option 1: Tournament Directors Only
```javascript
SEND_TO_ROUND_PARTICIPANTS: false,
DEFAULT_RECIPIENTS: ['td@example.com']
```

### Option 2: Email All Players
```javascript
SEND_TO_ROUND_PARTICIPANTS: true,
DEFAULT_RECIPIENTS: ['td@example.com']
```

The system will email both tournament directors AND all players in the round.

### Option 3: Use Google Sheet
1. Create a sheet with "Players" tab
2. Column A: Names, Column B: Emails
3. Update CONFIG:
```javascript
SHEET_ID: '1ABC-your-sheet-id-XYZ',
```

## Troubleshooting

### Not receiving emails?

1. **Check backend logs**: 
   ```bash
   grep "webhook" server.log
   ```

2. **Check Apps Script logs**: 
   - Open your Google Apps Script
   - Click "Execution log" at bottom
   - Look for errors or "Email sent to..." messages

3. **Test directly**:
   - In Apps Script, run `testSendEmail()` function
   - Check your spam folder

### Wrong email recipients?

1. Check `DEFAULT_RECIPIENTS` list
2. Verify Google Sheet (if using) has emails in column B
3. Check `SEND_TO_ROUND_PARTICIPANTS` setting

## Customize Email Template

Edit `buildEmailContent()` in Google Apps Script to customize:
- Subject line
- Email body (HTML)
- Plain text version
- Colors, fonts, layout

Example: Change subject from default to custom:
```javascript
SUBJECT_TEMPLATE: 'Round {round} Pairings for {tournamentName} - Please Review',
```

## What Gets Sent

### Webhook Payload (Backend → Apps Script)
```json
{
  "event": "pairings_generated",
  "tournament": {
    "name": "Spring Tournament 2024",
    "format": "swiss",
    "rounds": 5
  },
  "round": 1,
  "pairings": [
    {
      "board": 1,
      "white": {"name": "Alice", "rating": 1850},
      "black": {"name": "Bob", "rating": 1820},
      "section": "Open"
    }
  ]
}
```

### Email Format
- **Subject**: Round 1 Pairings - Spring Tournament 2024
- **Format**: HTML + Plain Text
- **Includes**: Tournament details, all pairings, ratings, sections
- **Professional styling**: Branded table, colors, clear formatting

## Features

- ✅ Automatic notifications when pairings generated
- ✅ Sends to tournament directors
- ✅ Optional: email all participating players
- ✅ Beautiful HTML email template
- ✅ Plain text fallback for email clients
- ✅ Supports multiple sections
- ✅ Includes ratings and player info
- ✅ Professional appearance
- ✅ Easy to customize
- ✅ Logging to Google Sheet (optional)

## Environment Variables Needed

```env
# Required
PAIRING_NOTIFICATION_WEBHOOK=https://script.google.com/macros/d/.../usercontent

# Optional (already configured in script)
# SENDGRID_API_KEY=... (if using SendGrid instead of Gmail)
```

## Next: Advanced Configuration

See `PAIRING_NOTIFICATION_SETUP.md` for:
- Custom email templates
- Multiple tournament types
- Sending via different email providers
- Advanced troubleshooting
- Including player stats
- Attachment handling

## Support

Questions? Check:
1. `PAIRING_NOTIFICATION_SETUP.md` - Full documentation
2. Google Apps Script execution logs
3. Backend server logs for webhook errors
4. Test function: `testSendEmail()` in Apps Script

---

**That's it!** Your tournament directors and players will now get email notifications whenever pairings are posted. 🏆
