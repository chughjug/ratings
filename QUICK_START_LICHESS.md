# Quick Start: Online-Rated Tournaments

## 🚀 Getting Started in 5 Minutes

### Step 1: Set Up Lichess Account

1. Create account: https://lichess.org/signup
2. Create team: https://lichess.org/team/create
   - Choose a unique team name
   - Make yourself team leader
3. Generate API token: https://lichess.org/account/oauth/token/create
   - App name: "Chess Tournament Manager"
   - Scopes: ✅ Check `tournament:write`
   - Copy the token (starts with `lip_...`)

**Important**: Save your Lichess API token and team slug - you'll need them!

### Step 2: Configure Environment

Create a `.env` file in your project root:

```bash
LICHESS_API_TOKEN=lip_YOUR_TOKEN_HERE
LICHESS_TEAM_ID=your-team-slug
```

Or export in your shell:

```bash
export LICHESS_API_TOKEN=lip_YOUR_TOKEN_HERE
export LICHESS_TEAM_ID=your-team-slug
```

### Step 3: Start Your Server

```bash
npm start
# or
node server.js
```

### Step 4: Run Test

```bash
node test-lichess-complete.js
```

Expected output:
```
✅ Tournament created: abc-123
✅ Lichess tournament created: ABC123def
   Public URL: https://lichess.org/swiss/ABC123def
```

### Step 5: Verify on Lichess

1. Visit the tournament URL from Step 4
2. Click "Start Tournament"
3. Join with your Lichess account
4. Wait for pairings (generated automatically)

## 📝 Creating a Tournament via UI

1. Go to your application
2. Click "Create Tournament"
3. Fill in:
   - Name: Your tournament name
   - Format: Select "Online Rated (Lichess Swiss)"
   - Rounds: 5-7 recommended
4. Click "Create"
5. Navigate to tournament settings
6. Find "Lichess Integration" section
7. Enter:
   - Lichess Team ID: Your team slug
   - Clock: 180 seconds, 2 increment
8. Click "Setup Lichess Tournament"
9. Copy the Lichess URL
10. Share with players

## 🎮 Managing the Tournament

### Starting a Round

**On Lichess**:
1. Open tournament page
2. When ~90% games finished in current round
3. Click "Next Round"
4. Lichess auto-generates pairings

### Syncing Pairings

**In your app**:
```javascript
POST /api/pairings/online-rated/sync-pairings
{
  "tournamentId": "your-tournament-id",
  "round": 1
}
```

### Getting Standings

```javascript
GET /api/pairings/online-rated/your-tournament-id/standings
```

## 🔧 Common Issues

### "Invalid token"
→ Generate new token with `tournament:write` scope

### "Team not found"
→ Check team slug is correct and you're team leader

### "400 Bad Request"
→ Check server logs for detailed error
→ See `LICHESS_TROUBLESHOOTING.md`

### Pairings not generating
→ Start tournament on Lichess
→ Click "Next Round" when ready

## 📚 Full Documentation

- `ONLINE_RATED_TOURNAMENT_GUIDE.md` - Complete feature guide
- `LICHESS_TROUBLESHOOTING.md` - Troubleshooting guide
- `RUN_LICHESS_TESTS.md` - Detailed testing instructions

## 🎯 Key Differences from Regular Swiss

| Feature | Regular Swiss | Online Rated |
|---------|---------------|--------------|
| Pairings | Local generation | Lichess server |
| Ratings | USCF/local | Lichess ratings |
| Games | Manual entry | Lichess integration |
| Start Round | Click "Generate" | Click "Next Round" on Lichess |
| Pairing Control | Full control | Lichess algorithm |

## 💡 Pro Tips

1. **Test First**: Always test with a small tournament
2. **Team Setup**: Create dedicated team for each tournament series
3. **Player Matching**: Ensure `lichess_username` matches Lichess accounts
4. **Sync Often**: Sync standings after each round
5. **Monitor Logs**: Watch server logs for Lichess errors

## 🆘 Need Help?

1. Check `LICHESS_TROUBLESHOOTING.md`
2. Review server logs
3. Test with `test-lichess-complete.js`
4. Check Lichess API docs: https://lichess.org/api

