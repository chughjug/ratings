# Running Lichess Online-Rated Tournament Tests

## Prerequisites

1. **Server Running**: Start your development server
   ```bash
   npm start
   # or
   node server.js
   ```

2. **Lichess Account Setup**:
   - Create a Lichess account: https://lichess.org/signup
   - Create a team: https://lichess.org/team/create
   - Get promoted to team leader (required)
   - Generate API token: https://lichess.org/account/oauth/token/create
     - App name: "Tournament Pairings"
     - Scopes: Check **tournament:write**

3. **Environment Variables**:
   - `LICHESS_API_TOKEN`: Your Lichess API token (starts with `lip_...`)
   - `LICHESS_TEAM_ID`: Your team slug (e.g., `coders` from URL: `lichess.org/team/coders`)
   - `API_BASE_URL`: (Optional) Default: `http://localhost:5000/api`

## Test Scripts

### 1. Basic Test (`test-lichess-online-rated.js`)

Creates a tournament and sets up Lichess integration.

```bash
LICHESS_API_TOKEN=lip_xxx LICHESS_TEAM_ID=your-team-slug node test-lichess-online-rated.js
```

**What it tests**:
- ✅ Tournament creation with online-rated format
- ✅ Lichess tournament setup
- ✅ Standings endpoint

### 2. Complete Test (`test-lichess-complete.js`)

Creates tournament, adds players, and sets up full integration.

```bash
LICHESS_API_TOKEN=lip_xxx LICHESS_TEAM_ID=your-team-slug node test-lichess-complete.js
```

**What it tests**:
- ✅ Tournament creation
- ✅ Player registration
- ✅ Lichess tournament setup
- ✅ Standings endpoint

## Manual Testing Steps

### Step 1: Create Tournament

```bash
curl -X POST http://localhost:5000/api/tournaments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament",
    "format": "online-rated",
    "rounds": 3,
    "time_control": "3+2",
    "settings": {
      "online_rated_settings": {
        "lichess_api_token": "lip_YOUR_TOKEN"
      }
    }
  }'
```

Save the `tournamentId` from the response.

### Step 2: Setup Lichess

```bash
curl -X POST http://localhost:5000/api/pairings/online-rated/setup \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "YOUR_TOURNAMENT_ID",
    "lichessTeamId": "your-team-slug",
    "clock": {
      "limit": 180,
      "increment": 2
    },
    "variant": "standard"
  }'
```

Save the `lichessTournamentId` and `publicUrl`.

### Step 3: Add Players

```bash
curl -X POST http://localhost:5000/api/tournaments/YOUR_TOURNAMENT_ID/players \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Player",
    "lichess_username": "testplayer",
    "rating": 1500
  }'
```

### Step 4: Visit Lichess Tournament

Open the `publicUrl` from Step 2 in your browser:
- Start the tournament
- Join with players
- Wait for Round 1 pairings

### Step 5: Sync Pairings

```bash
curl -X POST http://localhost:5000/api/pairings/online-rated/sync-pairings \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "YOUR_TOURNAMENT_ID",
    "round": 1
  }'
```

### Step 6: View Standings

```bash
curl http://localhost:5000/api/pairings/online-rated/YOUR_TOURNAMENT_ID/standings
```

## Environment Configuration

### For Shell/Bash

```bash
export LICHESS_API_TOKEN=lip_xxx
export LICHESS_TEAM_ID=your-team-slug
export API_BASE_URL=http://localhost:5000/api
```

### For Windows CMD

```cmd
set LICHESS_API_TOKEN=lip_xxx
set LICHESS_TEAM_ID=your-team-slug
set API_BASE_URL=http://localhost:5000/api
```

### For PowerShell

```powershell
$env:LICHESS_API_TOKEN="lip_xxx"
$env:LICHESS_TEAM_ID="your-team-slug"
$env:API_BASE_URL="http://localhost:5000/api"
```

## Expected Output

### Successful Test

```
🧪 Complete End-to-End Test: Online-Rated Tournament
================================================================================

📋 Configuration:
   API Base: http://localhost:5000/api
   Lichess Token: lip_ABC123...
   Lichess Team: your-team

================================================================================
STEP 1: Create Tournament
================================================================================

📡 POST /tournaments
✅ Status: 200
✅ Tournament created: abc-123-def

================================================================================
STEP 2: Add Test Players
================================================================================

📡 POST /tournaments/abc-123-def/players
✅ Status: 200
   ✅ Added: Test Player 1 (test_player_1)

...

================================================================================
STEP 3: Setup Lichess Tournament
================================================================================

📡 POST /pairings/online-rated/setup
✅ Status: 200
✅ Lichess tournament created: ABC123def
   Public URL: https://lichess.org/swiss/ABC123def

🎉 COMPLETE TEST FINISHED!
```

### Failed Test

Check server logs for detailed error messages. Common issues:

1. **Invalid Token**: Token expired or wrong scope
2. **Team Not Found**: Wrong team slug or not leader
3. **Clock Invalid**: Non-integer values
4. **Network Error**: Server not running

## Troubleshooting

### Error: "Lichess API token is required"

- Set `LICHESS_API_TOKEN` environment variable
- Or include in tournament settings

### Error: "Invalid token"

- Generate new token: https://lichess.org/account/oauth/token/create
- Ensure token has `tournament:write` scope

### Error: "teamId: string required"

- Verify team slug is correct
- Check you're team leader, not just member

### Error: "Clock limit and increment must be valid integers"

- Ensure clock.limit and clock.increment are numbers
- Example: `{limit: 180, increment: 2}`

### Error: 401 Unauthorized

- Token invalid or expired
- Generate new API token

### Error: 429 Too Many Requests

- Rate limited by Lichess
- Wait before retrying
- Lichess allows ~1 request/second

## Next Steps After Tests

1. **Manual Verification**: Visit Lichess tournament URL
2. **Add More Players**: Use real Lichess accounts
3. **Start Tournament**: Click "Start" on Lichess
4. **Generate Pairings**: Let Lichess auto-generate
5. **Sync Results**: Use sync endpoint after each round

## Cleanup

Delete test tournaments:

```bash
curl -X DELETE http://localhost:5000/api/tournaments/YOUR_TOURNAMENT_ID
```

Or delete manually from the UI.

## Related Documentation

- `ONLINE_RATED_TOURNAMENT_GUIDE.md` - Full feature guide
- `LICHESS_TROUBLESHOOTING.md` - Common issues and solutions

