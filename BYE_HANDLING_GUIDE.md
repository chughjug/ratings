# Bye Handling System Guide

## Overview

This document explains how the tournament system now handles byes and unpaired rounds differently to ensure fair tournament scoring according to FIDE and USCF standards.

## Bye Types

The system now distinguishes between two types of non-games:

### 1. **Bye** (0.5 points)
- **When**: A player is automatically assigned a bye during pairing generation due to odd player count
- **Points**: Player receives **1/2 point** (0.5)
- **Used for**: Swiss system tournaments where the number of players is odd
- **Example**: In a 9-player tournament, one player receives a bye each round
- **Database value**: `bye_type = 'bye'`
- **Registration**: NOT registered ahead of time; assigned automatically during pairing

### 2. **Unpaired / Full Point Bye** (1.0 points)
- **When**: A player is not paired for a round
- **Points**: Player receives **1 full point** (1.0)
- **Scenarios**:
  - Player registered with intentional bye for this round
  - Player didn't show up (no-show)
  - Player was dropped from tournament
  - Player is unavailable for this round
- **Database value**: `bye_type = 'unpaired'`

## How It Works

### Database Changes

A new column `bye_type` has been added to the `pairings` table:

```sql
ALTER TABLE pairings ADD COLUMN bye_type TEXT;
```

- `NULL` = Normal game (both players assigned)
- `'bye'` = 0.5 point bye
- `'unpaired'` = 1.0 point bye

### Pairing Generation

When pairings are generated and an odd number of players exists in a score group:

1. The system automatically creates a bye for one player (typically the lowest-rated)
2. This bye is marked with `bye_type = 'bye'`
3. The player receives 0.5 points for this round

Example in `enhancedPairingSystem.js`:
```javascript
pairings.push({
  white_player_id: byePlayer.id,
  black_player_id: null,
  is_bye: true,
  bye_type: 'bye',  // Standard bye: 0.5 points
  section: this.section,
  board: pairings.length + 1
});
```

### Result Recording

When a game result is recorded:

#### For Normal Games (2 players):
```javascript
// Points calculated: 1 for win, 0.5 for draw, 0 for loss
const whitePoints = calculatePoints(result, 'white');
const blackPoints = calculatePoints(result, 'black');
```

#### For Bye Pairings (1 player, black_player_id = NULL):
```javascript
// Calculate bye points based on bye_type
const byePoints = calculateByePoints(pairing.bye_type);
// Returns: 0.5 for 'bye', 1.0 for 'unpaired'
```

### Recording Bye Results

Use the new API endpoint to record bye results:

```bash
POST /api/pairings/:pairingId/bye-result
Content-Type: application/json

{
  "byeType": "bye"        // or "unpaired"
}
```

Response:
```json
{
  "message": "Bye result recorded successfully (bye: 0.5 points)",
  "byeType": "bye",
  "points": 0.5
}
```

## API Endpoints

### Record Result (Standard Game)
```bash
PUT /api/pairings/:id/result
Content-Type: application/json

{
  "result": "1-0"  // or "0-1", "1/2-1/2", "1-0F", "0-1F", "1/2-1/2F"
}
```

### Record Bye Result
```bash
POST /api/pairings/:id/bye-result
Content-Type: application/json

{
  "byeType": "bye"        // 0.5 points - player assigned bye during pairing
}
```

or

```bash
POST /api/pairings/:id/bye-result
Content-Type: application/json

{
  "byeType": "unpaired"   // 1.0 points - player not paired/unpaired
}
```

## Points System

### Result Calculation

The system now calculates points based on the scenario:

| Scenario | Points | Notes |
|----------|--------|-------|
| Win (1-0) | 1 point | Player won the game |
| Loss (0-1) | 0 points | Player lost the game |
| Draw (1/2-1/2) | 0.5 points | Game ended in draw |
| Bye | 0.5 points | Standard bye (odd player count) |
| Unpaired | 1.0 points | Player not paired this round |

### Code Implementation

```javascript
/**
 * Calculate points for bye or unpaired result
 * @param byeType - 'bye' for 1/2 point bye, 'unpaired' for full point bye
 * @returns points earned
 */
function calculateByePoints(byeType) {
  if (byeType === 'bye') {
    return 0.5; // Standard bye: 1/2 point
  } else if (byeType === 'unpaired') {
    return 1.0; // Full point bye (player wasn't paired at all)
  }
  return 0; // No bye
}
```

## Standings and Scoring

When calculating final standings:

1. **Total Points**: Sum of all points including byes and unpaired
2. **Games Played**: Count of actual games (NOT including byes/unpaired)
3. **Results Breakdown**: Shows wins, losses, draws (NOT counting byes)

Example query for standings:
```sql
SELECT p.id, p.name, p.rating, p.section,
       COALESCE(SUM(r.points), 0) as total_points,
       COUNT(r.id) as games_played,
       COUNT(CASE WHEN r.result = '1-0' OR r.result = '1-0F' THEN 1 END) as wins,
       COUNT(CASE WHEN r.result = '0-1' OR r.result = '0-1F' THEN 1 END) as losses,
       COUNT(CASE WHEN r.result = '1/2-1/2' OR r.result = '1/2-1/2F' THEN 1 END) as draws
FROM players p
LEFT JOIN results r ON p.id = r.player_id
WHERE p.tournament_id = ? AND p.status = 'active'
GROUP BY p.id
ORDER BY p.section, total_points DESC, p.rating DESC;
```

## Migration Guide

If you're upgrading from an older version:

### Step 1: Database Migration
The system automatically adds the `bye_type` column when you start the server:

```javascript
// In database.js
db.run(`
  ALTER TABLE pairings ADD COLUMN bye_type TEXT
`, (err) => {
  // Ignore error if column already exists
});
```

### Step 2: No Data Loss
- Existing pairings will have `bye_type = NULL`
- When recording results, the system handles both old and new byes correctly
- Existing tournament data is preserved

### Step 3: Update UI/Frontend
Update your frontend to:
1. Show bye type when displaying pairings
2. Display 0.5 or 1.0 points appropriately in standings
3. Use the new `/bye-result` endpoint when recording bye results

## Common Scenarios

### Scenario 1: Odd Number of Players
- **What happens**: System automatically creates a bye for one player
- **Points**: 0.5 (bye_type = 'bye')
- **Action**: TD needs to record the bye result via `/bye-result` endpoint

### Scenario 2: Player Doesn't Show Up
- **What happens**: Pairing stays as bye if created, or no pairing created
- **Points**: 1.0 (bye_type = 'unpaired')
- **Action**: TD records result with `byeType: 'unpaired'`

### Scenario 3: Player Intentional Bye Request
- **What happens**: Player registers with intentional bye for specific round(s)
- **System creates**: Unpaired pairing automatically during pairing generation
- **Points**: 1.0 (bye_type = 'unpaired') - Full point bye
- **Action**: Automatic - player is excluded from pairing for that round
- **Notes**: System reads `intentional_bye_rounds` field during pairing generation

### Scenario 4: Mixed Pairings
- Some players paired in games (get 0, 0.5, or 1 based on result)
- Some players may have registered byes (get 1.0 automatically)
- One additional player might get automatic bye if odd count (gets 0.5)
- Everyone gets fair treatment

## Tiebreakers with Byes

When calculating tiebreakers (Buchholz, Sonneborn-Berger, etc.):

1. **Buchholz Score**: Sum of opponent scores
   - For bye opponents: Count as 0 (no actual opponent)
   
2. **Sonneborn-Berger**: Sum of defeated opponent scores + half drawn opponent scores
   - For byes: No opponent, so no contribution

3. **Direct Encounter**: Result between two specific players
   - For byes: N/A (no direct encounter)

## Troubleshooting

### Issue: Players getting wrong bye points
**Solution**: 
1. Check `bye_type` in pairings table
2. Verify result was recorded with correct `byeType`
3. Clear and re-record if needed

### Issue: Standings not showing bye results
**Solution**:
1. Verify results are in the `results` table
2. Check that the `player_id` and `points` fields are correct
3. Refresh standings calculation

### Issue: Old tournaments showing NULL bye_type
**Solution**: This is normal. The system handles both NULL and specified bye_types.
Going forward, all new pairings will have bye_type set.

## Technical Details

### Files Modified
1. **server/database.js** - Added `bye_type` column
2. **server/utils/enhancedPairingSystem.js** - Set `bye_type` when creating byes
3. **server/routes/pairings.js** - New functions and endpoints:
   - `calculateByePoints()` - Calculate bye/unpaired points
   - `POST /:id/bye-result` - Record bye results
   - Updated result recording logic

### Key Functions

#### calculateByePoints(byeType)
```javascript
function calculateByePoints(byeType) {
  if (byeType === 'bye') {
    return 0.5; // Standard bye: 1/2 point
  } else if (byeType === 'unpaired') {
    return 1.0; // Full point bye
  }
  return 0; // No bye
}
```

#### calculatePoints(result, color)
Already existed, unchanged for normal game results

## Best Practices

1. **Always record bye results promptly** after the round
2. **Use correct byeType**: 
   - `'bye'` for players assigned during pairing
   - `'unpaired'` for players not paired for other reasons
3. **Check standings regularly** to ensure bye points are calculated correctly
4. **Document bye reasons** if system requires it (optional notes field)

## Standards Compliance

This implementation follows:
- **FIDE Standards**: Half-point byes for odd player counts in Swiss system
- **USCF Rules**: Standard bye scoring rules (28.5.1)
- **Chess.com Blitz**: Standard bye scoring

## Support

For issues or questions:
1. Check this guide first
2. Review database schema for `bye_type` column
3. Check pairings and results tables
4. Review recent API calls and responses
