# "HTML Error" Fix - JSON Parsing Issue

## Problem
You were getting: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

This means the API returned HTML instead of JSON.

## What We Fixed

1. **Added HTML detection** - Checks if response starts with `<` (HTML tag)
2. **Better error messages** - Shows first 200 chars of error response
3. **Proper timeout** - 30-second timeout for slow servers
4. **Better JSON parsing** - Catches parse errors with details
5. **Response logging** - Logs first 500 chars (not entire response)

## New Code Behavior

Now when syncPlayersToAPI() runs, you'll see in the console:

```
✅ Success:
Calling API: https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/tournament-2
API Response Status: 200
API Response (first 500 chars): {"success":true,"message":"Successfully imported...
API call successful. Imported 1 players.

❌ If HTML error:
API returned HTML error page (status 404). Server may be down or endpoint doesn't exist.
Response: <!DOCTYPE html>...
```

## API Test Results

✅ **API is working!** Tested directly with curl:
```bash
$ curl -X POST https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/tournament-2 \
  -H "Content-Type: application/json" \
  -d '{"api_key": "demo-key-123", "players": [{"name": "Test Player"}], ...}'

Response:
{"success":true,"message":"Successfully imported 1 players","data":{"tournament_id":"tournament-2",...}}
```

✅ API endpoint EXISTS and is WORKING

## What Could Cause HTML Error

If you still get HTML error, check:

1. **Wrong API Base URL**
   - Should be: `https://chess-tournament-director-6ce5e76147d7.herokuapp.com/`
   - Check: Remove trailing `/` if present

2. **Wrong Tournament ID**
   - Should be: `tournament-2`
   - Check: Tournament exists in database

3. **Server Down**
   - Run: `npm start` in server directory
   - Check: Server logs for errors

4. **API Key Invalid**
   - Should be: `demo-key-123`
   - Check: Matches API_KEYS in .env

5. **Form ID Wrong**
   - Should be: `15fTL-FenfGKK3s_6IMcu6FeeYFONIyJUD9s0eWSqCS4`
   - Check: Form ID in FORMS_CONFIG matches your form

## Next Steps

1. **Save** updated Google Apps Script
2. **Submit** test form response
3. **Wait 1-5 minutes** for trigger to run
4. **Check console** for new messages
5. **Share output** if still failing

## Testing Checklist

- [ ] API_BASE_URL: https://chess-tournament-director-6ce5e76147d7.herokuapp.com/
- [ ] TOURNAMENT_ID: tournament-2
- [ ] API_KEY: demo-key-123
- [ ] FORM_ID: 15fTL-FenfGKK3s_6IMcu6FeeYFONIyJUD9s0eWSqCS4
- [ ] Server is running (npm start)
- [ ] Form has "Player Name" field

## Console Output Expected

When you submit a form and trigger runs:

```
✅ Good:
Form submission detected...
Converting form response to player...
New form submission: Test Player
Calling API: https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/tournament-2
API Response Status: 200
API call successful. Imported 1 players.

❌ Bad (if HTML error):
API returned HTML error page (status 404). Server may be down...
Response: <!DOCTYPE html>...
Form import failed
```

## If Still Failing

Please share:
1. Console output (copy from Execution log)
2. What you see in "Calling API: ..." message
3. The "API Response ..." line
4. Any error messages

