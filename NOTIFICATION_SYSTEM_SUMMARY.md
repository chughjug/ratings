# Pairing Notification System - Complete Implementation

## 📋 What Was Created

I've implemented a complete email notification system for tournament pairings that automatically notifies tournament directors and players when pairings are generated.

## 🎯 System Components

### 1. Backend Webhook Integration
**File**: `server/routes/pairings.js`
- Added `sendPairingNotificationWebhook()` function
- Sends POST request to Google Apps Script when pairings generated
- Includes complete pairing data (boards, players, ratings, sections)
- Triggered on `/api/pairings/generate/section` endpoint
- Non-blocking: webhook failure doesn't affect pairing generation

### 2. Google Apps Script
**File**: `google-apps-script-pairings.gs`
- Web app that receives webhook POST requests
- Processes pairings data
- Sends beautifully formatted emails with:
  - Tournament details
  - Round information
  - All pairings with player names and ratings
  - Section organization
  - Player instructions
- Supports multiple recipient options:
  - Tournament directors only
  - All players in the round
  - Custom list from Google Sheet

### 3. Documentation
Created comprehensive guides:
- `PAIRING_NOTIFICATION_SETUP.md` - Full setup and configuration guide
- `WEBHOOK_QUICK_START.md` - 3-step quick start guide
- This file - System overview

## 🚀 Quick Setup (3 Steps)

### Step 1: Deploy Google Apps Script
1. Go to https://script.google.com
2. Create new project
3. Copy all code from `google-apps-script-pairings.gs`
4. Deploy as Web app (Deploy → New deployment → Web app)
5. Copy the deployment URL

### Step 2: Set Environment Variable
Add to `.env` or your hosting platform:
```bash
PAIRING_NOTIFICATION_WEBHOOK=https://script.google.com/macros/d/.../usercontent
```

### Step 3: Configure Recipients
Edit CONFIG in Google Apps Script:
```javascript
DEFAULT_RECIPIENTS: ['tournament-director@example.com']
SEND_TO_ROUND_PARTICIPANTS: true
```

## 📧 Email Features

Recipients receive professional emails with:
- ✅ Tournament name and format
- ✅ Round number
- ✅ All pairings organized by board
- ✅ Player names and ratings
- ✅ Section information
- ✅ Professional HTML styling
- ✅ Plain text fallback
- ✅ Player instructions

## 🔧 Configuration Options

### Recipient Modes

**Mode 1: Directors Only**
```javascript
SEND_TO_ROUND_PARTICIPANTS: false
DEFAULT_RECIPIENTS: ['td@example.com']
```

**Mode 2: Directors + Players in Round**
```javascript
SEND_TO_ROUND_PARTICIPANTS: true
DEFAULT_RECIPIENTS: ['td@example.com']
```

**Mode 3: From Google Sheet**
```javascript
SHEET_ID: 'your-sheet-id'
SHEET_NAME: 'Players'
EMAIL_COLUMN: 'B'
```

### Email Customization

```javascript
// Change subject line
SUBJECT_TEMPLATE: 'Round {round} Pairings - {tournamentName}'

// Add/modify CC and BCC
CC_EMAILS: ['cc@example.com']
BCC_EMAILS: ['archive@example.com']
```

## 📤 Webhook Flow

```
User Generates Pairings
        ↓
Backend generates pairings with /api/pairings/generate/section
        ↓
Backend sends webhook POST to Google Apps Script
        ↓
Google Apps Script receives webhook
        ↓
Apps Script processes recipients list
        ↓
Apps Script builds email with HTML + plain text
        ↓
Emails sent via Gmail
        ↓
Tournament directors and/or players receive notification ✉️
```

## 🧪 Testing

### Test in Google Apps Script
1. Open the Apps Script project
2. Select `testSendEmail` function
3. Click "Run"
4. Check email within 1-2 seconds

### Test via API
```bash
curl -X POST http://localhost:5000/api/pairings/generate/section \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "test-tournament",
    "round": 1,
    "sectionName": "Open"
  }'
```

## 📊 Webhook Payload Format

The backend sends this data to the Google Apps Script:

```json
{
  "event": "pairings_generated",
  "tournament": {
    "id": "tournament-123",
    "name": "Spring Tournament 2024",
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

## ⚙️ Advanced Features

### Logging to Google Sheet
The system automatically creates a "Notification Log" sheet that records:
- Timestamp
- Tournament name
- Round number
- Number of pairings
- Recipients count
- Status

### Multiple Email Templates
Easily create different templates for:
- Swiss system tournaments
- Quad tournaments
- Round-robin tournaments
- Special events

### Custom Logic
The CONFIG section in Apps Script is easily customizable:
```javascript
// Add custom logic for recipient selection
// Modify buildEmailContent() for custom templates
// Add additional fields to webhook payload in backend
```

## 🐛 Troubleshooting

### Webhook Not Receiving?
```bash
# Check backend logs
tail -f server.log | grep webhook

# Check environment variable is set
echo $PAIRING_NOTIFICATION_WEBHOOK
```

### Emails Not Sending?
1. Check Google Apps Script execution logs
2. Run `testSendEmail()` to verify Gmail access
3. Check spam folder
4. Verify recipient emails are valid

### Rate Limiting?
If sending many emails, add delays in Apps Script:
```javascript
Utilities.sleep(1000); // 1 second delay between emails
```

## 📝 Files Created/Modified

### Created Files
- `google-apps-script-pairings.gs` - Complete Google Apps Script
- `PAIRING_NOTIFICATION_SETUP.md` - Full documentation
- `WEBHOOK_QUICK_START.md` - Quick start guide
- `NOTIFICATION_SYSTEM_SUMMARY.md` - This file

### Modified Files
- `server/routes/pairings.js` - Added webhook integration

## 🔐 Security Notes

- Webhook URL is public but random (Google-generated)
- Only accepts POST requests with specific event type
- No sensitive data in webhook payload
- Google Apps Script credentials secured by Google
- Email sending uses authenticated Gmail account

## 📚 Documentation Files

1. **WEBHOOK_QUICK_START.md** - Start here! 3-step setup
2. **PAIRING_NOTIFICATION_SETUP.md** - Comprehensive guide with troubleshooting
3. **NOTIFICATION_SYSTEM_SUMMARY.md** - This overview file

## 🎉 What's Next?

1. ✅ Deploy the Google Apps Script
2. ✅ Set the webhook URL environment variable
3. ✅ Test with `testSendEmail()` function
4. ✅ Generate pairings and verify emails arrive
5. ✅ Customize email template if desired
6. ✅ Configure recipient list

## Support & Questions

- Review setup documentation
- Check Google Apps Script execution logs
- Test the `testSendEmail()` function
- Verify backend logs show webhook being sent
- Ensure email addresses are valid

---

**System Status**: ✅ Ready to deploy

All components are integrated and ready to use. Follow the Quick Start guide in `WEBHOOK_QUICK_START.md` to get started!
