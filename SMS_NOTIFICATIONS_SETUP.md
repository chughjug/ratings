# SMS Text Notifications Setup Guide

This guide explains how to configure and use SMS text notifications for tournament pairings.

## Overview

The system can automatically send text notifications to players when pairings are generated for each round. This uses Twilio as the SMS provider.

## Features

- ✅ Automatic text notifications when pairings are generated
- ✅ Customizable messages with tournament details
- ✅ Bulk sending with rate limiting
- ✅ Fallback to email if SMS not configured
- ✅ Manual API endpoint for triggering notifications
- ✅ Support for all players with phone numbers

## Requirements

1. **Twilio Account** (free trial available)
2. **Twilio Phone Number**
3. **Environment Variables**

## Setup Instructions

### 1. Create a Twilio Account

1. Go to [Twilio](https://www.twilio.com/)
2. Sign up for a free account (includes $15.50 credit)
3. Get your Account SID and Auth Token from the dashboard

### 2. Get a Twilio Phone Number

1. In the Twilio Console, go to Phone Numbers → Manage → Buy a Number
2. Choose a number (free trial accounts get a phone number included)
3. Copy your phone number (e.g., +12345678901)

### 3. Configure Environment Variables

Add these environment variables to your application:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12345678901

# Optional: Fallback email (used if Twilio not configured)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
SMS_FALLBACK_EMAIL=fallback@example.com
```

#### For Local Development (.env file)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12345678901
```

#### For Heroku Deployment

```bash
heroku config:set TWILIO_ACCOUNT_SID=your_account_sid_here
heroku config:set TWILIO_AUTH_TOKEN=your_auth_token_here
heroku config:set TWILIO_PHONE_NUMBER=+12345678901
```

### 4. Add Player Phone Numbers

Players need to have phone numbers in their profiles. You can add phone numbers:

1. **Manual Entry**: When adding players individually, include their phone number
2. **CSV Import**: Include a "phone" column in your CSV import
3. **Registration Form**: Include phone field in registration forms

Phone numbers will be automatically formatted to E.164 format (e.g., +11234567890)

### 5. Enable Notifications

The system automatically sends text notifications when:
- Pairings are generated for a round
- Twilio credentials are configured
- Players have phone numbers

No additional setup needed once Twilio is configured!

## Message Format

Players receive text messages like this:

```
🏆 Tournament Name - Round 2 Pairings

You are playing as WHITE against Jane Smith
Board: 5
Time Control: G/90+30
Location: Chess Club

Good luck! 🎯
```

The message includes:
- Tournament name
- Round number
- Color (WHITE/BLACK)
- Opponent name
- Board number
- Time control
- Location

## API Endpoints

### Automatic Notifications

Text notifications are automatically sent when you generate pairings:

```
POST /api/pairings/generate/section
```

The response includes SMS notification status:
```json
{
  "success": true,
  "message": "Round 2 pairings generated and stored successfully",
  "pairings": [...],
  "smsNotifications": {
    "sentCount": 10,
    "failedCount": 0,
    "total": 10
  }
}
```

### Manual Notifications

You can also manually trigger SMS notifications:

```
POST /api/pairings/notifications/sms
```

**Request Body:**
```json
{
  "tournamentId": "tournament-id",
  "round": 2,
  "pairings": []  // Optional - will fetch from database if not provided
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS notifications sent successfully",
  "result": {
    "sentCount": 10,
    "failedCount": 0,
    "total": 10,
    "results": {
      "successful": [...],
      "failed": [...]
    }
  }
}
```

## Testing

### 1. Test Twilio Configuration

You can test if Twilio is configured correctly:

```bash
curl -X POST http://localhost:5000/api/pairings/notifications/sms \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "your-tournament-id",
    "round": 1
  }'
```

### 2. Test with a Single Player

1. Add a test player with your phone number
2. Generate pairings for that player
3. You should receive a text message

### 3. Monitor SMS Status

Check the server logs for SMS notification status:

```
[SMS Notifications] Attempting to send text notifications for Round 2
[SMS Notifications] Sent 10 of 10 messages for Round 2
[SMS Notifications] SMS notification results: {...}
```

## Troubleshooting

### SMS Not Sending

1. **Check Environment Variables**
   ```bash
   # Check if variables are set
   echo $TWILIO_ACCOUNT_SID
   echo $TWILIO_AUTH_TOKEN
   ```

2. **Check Server Logs**
   Look for messages like:
   ```
   [SMS Notifications] SMS notifications skipped - Twilio not configured
   ```

3. **Verify Phone Numbers**
   - Phone numbers must be stored in the `players` table
   - They should be in valid format (will be auto-formatted to E.164)

### Rate Limiting

Twilio has rate limits:
- Trial accounts: 1 message per second
- Paid accounts: Higher limits

The system automatically batches messages (5 at a time with 500ms delay) to avoid rate limits.

### Twilio Errors

Common Twilio errors:

- **21211**: Invalid phone number format
  - Solution: Ensure phone numbers include country code (e.g., +1 for US)

- **21608**: Unsubscribed recipient
  - Solution: Player has opted out of SMS. They need to text START to your Twilio number.

- **21614**: Invalid destination phone number
  - Solution: Check that the phone number is valid and active

## Costs

### Twilio Pricing

- **US Numbers**: ~$0.0075 per message
- **International**: Varies by country
- **Free Trial**: $15.50 credit included

### Example Costs

For a 50-player tournament with 7 rounds:
- 50 players × 7 rounds = 350 messages
- 350 × $0.0075 = $2.63

## Best Practices

1. **Add Phone Numbers During Registration**
   - Include phone as optional field
   - Set expectations about SMS notifications

2. **Respect Opt-Outs**
   - Monitor for "STOP" responses
   - Remove players from SMS list if they opt out

3. **Use for Important Updates**
   - Pairings are critical
   - Consider cost for non-critical updates

4. **Test First**
   - Send a test to yourself
   - Verify message format
   - Check delivery time

## Integration with Email Notifications

SMS and email notifications work together:

- **SMS**: Immediate, concise updates
- **Email**: Detailed information with links

Players can receive both SMS and email notifications for the same pairings.

## Advanced Configuration

### Custom Message Templates

Edit `server/services/smsService.js` to customize messages:

```javascript
message: `🏆 ${tournament.name} - Round ${round} Pairings\n\n` +
        `You are playing as ${color} against ${opponentName}\n` +
        `Board: ${boardNumber}\n\n` +
        `Good luck! 🎯`
```

### Batch Processing

Adjust batch size and delay in `smsService.sendPairingNotifications()`:

```javascript
const results = await this.sendBulkSMS(messages, {
  tournamentId,
  round,
  batchSize: 5,    // Messages per batch
  delay: 500       // Delay between batches (ms)
});
```

## Security

1. **Protect Credentials**
   - Never commit Twilio credentials to git
   - Use environment variables
   - Rotate credentials periodically

2. **Phone Number Validation**
   - Automatically validates phone numbers
   - Formats to E.164 standard
   - Handles invalid numbers gracefully

3. **Rate Limiting**
   - Prevents abuse
   - Protects Twilio account
   - Maintains delivery reliability

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify Twilio dashboard for message status
3. Review this documentation

## Additional Resources

- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)




