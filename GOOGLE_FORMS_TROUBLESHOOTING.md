# Google Forms Integration - Troubleshooting Guide

## Error: "Route not found"

This error means the API endpoint doesn't exist or is being called incorrectly.

### ✅ What We Fixed

Updated `syncPlayersToAPI()` function to:
1. **Better URL construction** - Removes trailing slashes
2. **Detailed logging** - Shows the exact URL being called
3. **HTTP status checking** - Catches HTTP errors properly
4. **Error details** - Shows full response for debugging

### 🔍 How to Debug

#### Step 1: Check the Console Logs

1. Open Google Apps Script editor
2. Look at the **Execution log** tab (or View → Execution log)
3. Run setupFormImport() again
4. You should see:
   ```
   Calling API: https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/tournament-2
   Payload: { api_key: "demo-key-123", players: [...], ... }
   API Response Status: 200
   API Response: { success: true, ... }
   ```

#### Step 2: Check What URL Is Being Called

The URL should be:
```
https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/tournament-2
```

Make sure:
- ✓ Base URL: `https://chess-tournament-director-6ce5e76147d7.herokuapp.com/`
- ✓ Endpoint: `/api/players/api-import/`
- ✓ Tournament ID: `tournament-2`

#### Step 3: Test the API Directly

From your terminal, try calling the API directly:
```bash
curl -X POST https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/players/api-import/tournament-2 \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "demo-key-123",
    "players": [
      {
        "name": "Test Player",
        "email": "test@example.com"
      }
    ],
    "lookup_ratings": true,
    "auto_assign_sections": true,
    "source": "google_sheets"
  }'
```

You should get:
```json
{ "success": true, "data": { ... } }
```

If you get "Route not found", the API endpoint doesn't exist or the server is down.

### 📋 Common Issues & Solutions

| Issue | Check | Solution |
|-------|-------|----------|
| Route not found | Is server running? | Run `npm start` in server directory |
| Route not found | Is tournament ID correct? | Check TOURNAMENT_ID in FORMS_CONFIG |
| Route not found | Is API URL correct? | Check API_BASE_URL in FORMS_CONFIG |
| Authentication error | API key valid? | Check API_KEY matches server's valid keys |
| Empty response | Players data? | Verify form fields are being extracted |
| Timeout | Server slow? | Check server logs: `tail -f server.log` |

### 🛠️ Next Steps

1. **Save** your updated Google Apps Script
2. **Check the console** - Look for "Calling API: ..." message
3. **Share the console output** - Tell me what URL it's calling
4. **If API returns error** - Share the full error message from "API Response: ..."

### ✅ Checklist

Before submitting a form, verify:
- [ ] FORM_ID is set (not 'your-form-id-here')
- [ ] API_BASE_URL is correct (https://chess-tournament-director-6ce5e76147d7.herokuapp.com/)
- [ ] TOURNAMENT_ID is correct (tournament-2)
- [ ] API_KEY is correct (demo-key-123)
- [ ] ENABLE_FORM_IMPORT is true
- [ ] Form has "Player Name" field (required)

### 📝 What to Tell Me

When sharing the error, include:
1. The full console output (copy from Execution log)
2. What you see in "Calling API: ..." message
3. The API Response (if any)
4. The exact error message

This will help fix the issue faster!

