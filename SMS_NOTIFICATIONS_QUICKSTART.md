# SMS Notifications - Quick Start ✅

## Status: Configured and Ready

Your Twilio account is now configured and ready to send SMS notifications for tournament pairings!

### Configuration Details

- ✅ **Account SID**: Configured
- ✅ **Phone Number**: Configured
- ✅ **Status**: Connected and Verified

---

## How It Works

### Automatic Notifications

When you generate pairings for any tournament round, the system will **automatically** send text messages to players who have phone numbers in their profiles.

**No additional action required!** Just generate pairings as normal.

---

## Adding Player Phone Numbers

Players need phone numbers in their profiles to receive notifications. You can add them:

### Option 1: Manual Entry (Individual Players)
1. Go to your tournament
2. Click "Players" tab
3. Add or edit a player
4. Include their phone number (format: (888) 314-8546 or 8883148546)
5. Save

### Option 2: CSV Import
Include a `phone` column in your CSV file when importing players:

```csv
name,uscf_id,rating,phone
John Doe,12345,1800,18883148546
Jane Smith,67890,1650,4155551234
```

### Option 3: Registration Form
Add a phone field to your tournament registration form.

---

## Testing

### Quick Test

1. **Add a test player** with your own phone number
2. **Generate pairings** for Round 1
3. **Check your phone** - you should receive a text message!

### Manual API Test

```bash
curl -X POST http://localhost:5000/api/pairings/notifications/sms \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "your-tournament-id",
    "round": 1
  }'
```

---

## Message Format

Players will receive concise messages (optimized for Twilio trial accounts):

```
🏆 R2 WHITE vs Jane Smith Board 5
```

Or for black:
```
🏆 R2 BLACK vs John Doe Board 3
```

**Format:** Tournament icon + Round + Color + Opponent + Board
**Length:** Under 160 characters (Twilio trial limit)

---

## API Endpoints

### Automatic (when generating pairings)
```
POST /api/pairings/generate/section
```
SMS notifications sent automatically ✅

### Manual trigger
```
POST /api/pairings/notifications/sms
Body: {
  "tournamentId": "...",
  "round": 1
}
```

---

## Cost Estimate

Twilio charges ~$0.0075 per SMS in the US.

**Example**: 50 players × 7 rounds = 350 messages = **$2.63**

Your free trial includes $15.50 credit - enough for hundreds of messages!

---

## Troubleshooting

### SMS Not Sending?
1. Check that players have phone numbers in their profiles
2. Look for console logs: `[SMS Notifications]`
3. Verify Twilio credentials: `node test-twilio-config.js`

### Missing Phone Numbers?
- CSV import must include a `phone` column
- Phone numbers are auto-formatted (handles various formats)

### Server Logs
Check for messages like:
```
[SMS Notifications] Attempting to send text notifications for Round 2
[SMS Notifications] Sent 10 of 10 messages for Round 2
```

---

## Next Steps

1. ✅ **Twilio is configured** - DONE
2. **Add phone numbers** to your players
3. **Generate pairings** - SMS will be sent automatically!

---

## For Production Deployment

When deploying to Heroku or another platform:

```bash
# Set environment variables (use your actual Twilio credentials)
heroku config:set TWILIO_ACCOUNT_SID=your_account_sid_here
heroku config:set TWILIO_AUTH_TOKEN=your_auth_token_here
heroku config:set TWILIO_PHONE_NUMBER=your_phone_number_here
```

---

## More Information

See `SMS_NOTIFICATIONS_SETUP.md` for detailed documentation.

