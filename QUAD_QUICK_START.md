# Quad Tournament System - Quick Start

## For Tournament Organizers

### 1. Create a Quad Tournament

**Step 1:** Go to "Create Tournament"
**Step 2:** Fill out tournament details:
- Name: "Spring Quad Tournament"
- Format: **Quad System** ← Select this
- Rounds: 3 (minimum recommended)
- Time Control: 90+30 (or your preferred)
- Dates: Set start and end dates

**Step 3:** Save Tournament

### 2. Add Players

**Step 1:** Go to Tournament Detail
**Step 2:** Click "Add Player" or "Bulk Add"
**Step 3:** Enter player names and ratings
- ⚠️ **Important**: Add ratings for proper seeding!
- Players will be automatically grouped by rating

### 3. Generate Pairings

**Step 1:** Go to Pairings tab
**Step 2:** Click "Generate Quad Pairings" (or use API)
**Step 3:** System automatically:
- Groups players into quads of 4 by rating
- Generates round-robin pairings
- Shows all quads and their matchups

### 4. Manage Results

**Step 1:** Enter results for each game
**Step 2:** System automatically calculates:
- Points for each player
- Quad standings
- Overall tournament results

### 5. Next Rounds

**Step 1:** Complete results for current round
**Step 2:** Click "Generate Round 2"
**Step 3:** Repeat for remaining rounds

---

## For Developers

### API Endpoints

#### Generate Quad Pairings
```bash
POST /api/pairings/generate/quad
Content-Type: application/json

{
  "tournamentId": "uuid-here",
  "round": 1,
  "clearExisting": false
}
```

#### Get Quad Assignments
```bash
GET /api/pairings/quad/{tournamentId}/assignments
```

### Using the Component

```typescript
import QuadTournamentDisplay from '../components/QuadTournamentDisplay';

<QuadTournamentDisplay
  quads={quads}
  pairings={pairings}
  standings={standings}
  currentRound={currentRound}
  totalRounds={tournament.rounds}
/>
```

### Key Files

| File | Purpose |
|------|---------|
| `server/utils/quadPairingSystem.js` | Core pairing logic |
| `client/src/components/QuadTournamentDisplay.tsx` | UI component |
| `client/src/types/index.ts` | Type definitions |
| `server/routes/pairings.js` | API endpoints |

### Tournament Settings

```typescript
{
  format: "quad",
  settings: {
    quad_settings: {
      group_size: 4,
      pairing_type: "round_robin",
      group_assignment: "rating",
      allow_byes_in_groups: true,
      cross_group_pairings: false
    }
  }
}
```

---

## Algorithm Overview

### 1. Player Sorting
- Players sorted by rating (highest first)

### 2. Quad Creation
- Create containers: `numQuads = Math.ceil(playerCount / 4)`
- Fill using snake pattern for balanced distribution

### 3. Round-Robin Generation
For each quad of 4 players:
```
Round 1: P1 vs P2, P3 vs P4
Round 2: P1 vs P3, P2 vs P4
Round 3: P1 vs P4, P2 vs P3
```

### 4. Bye Handling
- Quads with < 4 players get automatic byes
- Byes distributed evenly across rounds
- Each player gets 1 point for bye

---

## Example Scenario

### 20-Player Tournament

```
Input: 20 players with ratings

Processing:
├─ Sort by rating: 1900→1050
├─ Create 5 quads
├─ Distribute using snake pattern
└─ Generate round-robin pairings

Output:
├─ Quad 1: Player A (1900), B (1650), C (1400), D (1050)
├─ Quad 2: Player E (1850), F (1600), G (1350), H (1000)
├─ Quad 3: Player I (1800), J (1550), K (1300), L (950)
├─ Quad 4: Player M (1750), N (1500), O (1250), P (900)
└─ Quad 5: Player Q (1700), R (1450), S (1200), T (850)

Each Quad: 6 games (3 per player)
Total Games: 30 per round × 3 rounds = 90 games
```

---

## Common Tasks

### Create Tournament via API

```javascript
const response = await fetch('/api/tournaments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Spring Quad',
    format: 'quad',
    rounds: 3,
    settings: {
      quad_settings: {
        group_size: 4,
        pairing_type: 'round_robin',
        group_assignment: 'rating'
      }
    }
  })
});
```

### Generate Pairings via API

```javascript
const response = await fetch('/api/pairings/generate/quad', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tournamentId: 'tournament-id',
    round: 1,
    clearExisting: false
  })
});

const data = await response.json();
console.log(`Generated ${data.data.totalGames} games`);
```

### Display Quad Tournament

```typescript
const [quads, setQuads] = useState([]);
const [pairings, setPairings] = useState([]);
const [standings, setStandings] = useState([]);

useEffect(() => {
  // Fetch data and set state
  fetchQuadData();
}, [tournamentId]);

return (
  <QuadTournamentDisplay
    quads={quads}
    pairings={pairings}
    standings={standings}
    currentRound={1}
    totalRounds={3}
  />
);
```

---

## Troubleshooting

### Issue: Players not grouped correctly
**Solution**: Verify players have ratings. System sorts by rating first.

### Issue: "No active players" error
**Solution**: Add players to tournament and ensure status is "active"

### Issue: Pairings not generating
**Solution**: 
1. Check tournament format is "quad"
2. Verify no pairings already exist
3. Use `clearExisting: true` to force regenerate

### Issue: Component not showing
**Solution**: Ensure you're passing:
- `quads` array with proper structure
- `pairings` array with quad IDs
- `currentRound` as a number

---

## Performance Notes

- **Quad Creation**: O(n log n) - dominated by sorting
- **Pairing Generation**: O(q × 16) where q = number of quads
- **Database Storage**: O(3q) for 3-round tournament

For 100 players:
- ~25 quads
- ~75 games per round
- ~225 total games (3 rounds)
- Generation time: < 100ms

---

## What's Next?

After implementing quad tournaments:

1. ✅ Create and manage quad tournaments
2. ✅ Automatically seed players by rating
3. ✅ Generate round-robin pairings
4. ✅ View and manage results
5. 🔜 Add UI for quad pairing in TournamentDetail
6. 🔜 Support cross-quad pairings
7. 🔜 Custom group sizes (3, 4, 5, etc.)

---

## Resources

- **Full Guide**: See `QUAD_TOURNAMENT_GUIDE.md`
- **Implementation Details**: See `QUAD_IMPLEMENTATION_SUMMARY.md`
- **Code**: `server/utils/quadPairingSystem.js`

---

**Quick Start Version**: 1.0  
**Last Updated**: October 24, 2025
