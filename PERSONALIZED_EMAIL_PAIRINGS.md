# 📧 Personalized Pairing Email Notifications

## Overview

The system now sends **personalized emails directly to each player** showing only their specific board and opponent information for each round.

## How It Works

### For Each Player:
✅ Emails are sent to their registered email address  
✅ Shows their board number  
✅ Shows their color (White or Black)  
✅ Shows their opponent's name and rating  
✅ Shows tournament and round details  
✅ Clear formatting with player info on colored backgrounds  

### Flow:

```
1. Pairings generated in backend
   ↓
2. Backend fetches each player's email from database
   ↓
3. Webhook sends data with emails to Google Apps Script
   ↓
4. Google Apps Script builds personalized email for each player
   ↓
5. Each player receives email with ONLY their pairing
   ↓
6. Email includes:
   - Their board number
   - Their color (⚪ White or ⚫ Black)
   - Their opponent's name and rating
   - Instructions to arrive 15 minutes early
```

## Email Format

### Sample Email Subject:
```
Round 1 Pairings - Spring Tournament 2024
```

### Sample Email Content:

```
YOUR PAIRING FOR ROUND 1

Tournament: Spring Tournament 2024
Format: SWISS
Round: 1 of 5
Section: Open

YOUR GAME DETAILS

Board #3

⚪ White
Alice Johnson
Rating: 1850

vs

⚫ Black
Bob Smith
Rating: 1820

IMPORTANT: 
Please arrive 15 minutes before the round starts.
Board: 3
Playing as: ⚪ White
Opponent: Bob Smith (1820)
```

## Database Requirements

Players table must have an `email` column:

```sql
ALTER TABLE players ADD COLUMN email TEXT;
```

## Configuration

### In Google Apps Script CONFIG:

```javascript
const CONFIG = {
  // No need to change - uses emails from pairings payload
  DEFAULT_RECIPIENTS: [],
  SEND_TO_ROUND_PARTICIPANTS: false,
  
  // Can still add CC/BCC
  CC_EMAILS: ['tournament-director@example.com'],
  BCC_EMAILS: [],
  
  SUBJECT_TEMPLATE: 'Round {round} Pairings - {tournamentName}',
};
```

## Backend Integration

### Updated sendPairingNotificationWebhook():

The function now:
1. Gets all pairings from the generation process
2. Fetches each player's email from the database
3. Includes emails in the webhook payload
4. Sends to Google Apps Script

### Webhook Payload Format:

```json
{
  "event": "pairings_generated",
  "tournament": {
    "id": "tournament-123",
    "name": "Spring Tournament",
    "format": "swiss",
    "rounds": 5
  },
  "round": 1,
  "pairings": [
    {
      "board": 1,
      "white": {
        "id": "player-1",
        "name": "Alice Johnson",
        "rating": 1850,
        "email": "alice@example.com"  // ← NEW
      },
      "black": {
        "id": "player-2",
        "name": "Bob Smith",
        "rating": 1820,
        "email": "bob@example.com"  // ← NEW
      },
      "section": "Open"
    }
  ]
}
```

## Google Apps Script Processing

### processPairingsNotification():

The function now:
1. Extracts all players from the pairings data
2. Creates a player map with their pairing info
3. For each player with an email:
   - Builds personalized email content
   - Sends individual email to that player
   - Logs success/failure

### buildPersonalizedEmailContent():

Creates email content showing:
- Player's board number
- Player's color with visual indicator
- Opponent's name and rating
- Tournament and round details
- Professional HTML formatting
- Both HTML and plain text versions

## Features

✅ **Per-Player Emails**
- Each player gets one email
- Shows only their pairing
- Personalized greeting and info

✅ **Color Coding**
- ⚪ White: Light background
- ⚫ Black: Dark background
- Visual matchup display

✅ **Complete Information**
- Board number
- Color assignment
- Opponent details
- Tournament context

✅ **Error Handling**
- Skips players without valid emails
- Logs all errors
- Continues if one fails

✅ **Professional Formatting**
- HTML + plain text versions
- Mobile-friendly
- Clear visual hierarchy

## Setup

### Step 1: Add Email Column to Players Table

```sql
ALTER TABLE players ADD COLUMN email TEXT;
```

Update existing players with their email addresses.

### Step 2: Deploy Updated Google Apps Script

The `google-apps-script-pairings.gs` file now includes:
- `buildPersonalizedEmailContent()` - Creates player-specific emails
- Updated `processPairingsNotification()` - Sends individual emails
- Player extraction logic

### Step 3: Set Environment Variable

```bash
PAIRING_NOTIFICATION_WEBHOOK=https://script.google.com/macros/d/.../usercontent
```

### Step 4: Generate Pairings

When you generate pairings via `/api/pairings/generate/section`:

```bash
curl -X POST http://localhost:5000/api/pairings/generate/section \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "your-tournament-id",
    "round": 1,
    "sectionName": "Open"
  }'
```

Each player in the round receives a personalized email! ✉️

## Testing

### Test Function in Google Apps Script:

```javascript
function testSendEmail() {
  const testPayload = {
    event: 'pairings_generated',
    tournament: {
      id: 'test-tournament',
      name: 'Test Tournament',
      format: 'swiss',
      rounds: 5
    },
    round: 1,
    pairings: [
      {
        board: 1,
        white: {
          id: 'p1',
          name: 'Alice Johnson',
          rating: 1850,
          email: 'alice@example.com'
        },
        black: {
          id: 'p2',
          name: 'Bob Smith',
          rating: 1820,
          email: 'bob@example.com'
        },
        section: 'Open'
      }
    ]
  };
  
  processPairingsNotification(testPayload);
  Logger.log('Test emails sent');
}
```

## Logging

The system logs to a Google Sheet:
- Timestamp
- Tournament name
- Round number
- Number of pairings
- Emails sent
- Errors (if any)

## Troubleshooting

### Players Not Receiving Emails

**Check 1**: Verify email addresses in database
```sql
SELECT name, email FROM players WHERE tournament_id = 'your-tournament-id';
```

**Check 2**: Check Google Apps Script logs
- Open Google Apps Script editor
- Click "Execution log"
- Look for "Email sent to" messages

**Check 3**: Verify webhook is being called
- Check backend logs: `grep webhook server.log`

**Check 4**: Check email validity
- Ensure emails have @ symbol
- Verify no typos
- Check for spaces in email fields

### Email Format Issues

**Problem**: Emails look plain text only

**Solution**: Make sure Gmail is configured to receive HTML emails

**Problem**: Colors/styling not showing

**Solution**: Some email clients don't support inline CSS
- Plain text version is included as fallback
- Most clients support the HTML version

### Partial Emails Sent

**Problem**: Some players got emails, others didn't

**Possible causes**:
1. Some players missing email addresses
2. Invalid email format for some players
3. Gmail rate limiting (if >100 emails)

**Solution**:
1. Add missing emails to database
2. Fix invalid email formats
3. Add delays between emails in Apps Script (see Rate Limiting below)

## Advanced Configuration

### Rate Limiting

If sending many emails causes rate limits:

```javascript
// In processPairingsNotification()
let delay = 0;
playerPairings.forEach((playerInfo) => {
  // Add delay
  Utilities.sleep(delay);
  delay += 500; // 500ms between emails
  
  // Send email...
});
```

### Email Subject Customization

```javascript
// In CONFIG
SUBJECT_TEMPLATE: 'Round {round} - Your Pairing in {tournamentName}'
```

### CC Tournament Director

The director can be CC'd on all emails:

```javascript
// In CONFIG
CC_EMAILS: ['director@example.com']
```

### Different Templates by Format

```javascript
function buildPersonalizedEmailContent(tournament, round, playerInfo) {
  if (tournament.format === 'quad') {
    return buildQuadPairingEmail(tournament, round, playerInfo);
  } else if (tournament.format === 'round-robin') {
    return buildRoundRobinEmail(tournament, round, playerInfo);
  }
  // Default Swiss format...
}
```

## Summary

✅ **What Changed:**
- Backend fetches player emails and includes in webhook
- Google Apps Script sends individual emails to each player
- Each player sees only their pairing

✅ **What Players See:**
- Personal email with their specific board and opponent
- Professional formatting
- Clear instructions

✅ **Configuration:**
- Minimal setup - just add email column to players table
- Deploy updated Apps Script
- Set webhook environment variable

✅ **Testing:**
- Run `testSendEmail()` function
- Or generate real pairings and verify emails arrive

---

**Status**: ✅ READY FOR PERSONALIZED EMAILS

All components updated and tested. Players will now receive individual emails with their pairing information!
