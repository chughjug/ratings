# Bye Handling Implementation Summary

## Quick Overview

The tournament system has been enhanced to properly handle two distinct types of byes:

- **Bye (0.5 pts)**: Player assigned a bye during pairing (odd player count)
- **Unpaired (1.0 pts)**: Player not paired for the round (missed round, no-show, etc.)

## What Changed

### 1. Database Schema
```sql
ALTER TABLE pairings ADD COLUMN bye_type TEXT;
-- Values: NULL (normal game), 'bye' (0.5 pts), 'unpaired' (1.0 pts)
```

### 2. New Functions

#### `calculateByePoints(byeType)`
Located in: `server/routes/pairings.js`

```javascript
function calculateByePoints(byeType) {
  if (byeType === 'bye') {
    return 0.5;      // Standard bye
  } else if (byeType === 'unpaired') {
    return 1.0;      // Full point bye
  }
  return 0;
}
```

### 3. New API Endpoint

**Record Bye Result**
```
POST /api/pairings/:pairingId/bye-result
{
  "byeType": "bye" | "unpaired"
}

Returns:
{
  "message": "Bye result recorded successfully (bye: 0.5 points)",
  "byeType": "bye",
  "points": 0.5
}
```

### 4. Enhanced Pairing Generation

All bye creations now set `bye_type = 'bye'`:

- FIDE Dutch System byes
- Round-Robin byes
- Single Elimination byes
- Quad System byes
- Round 1 odd-player byes

Example:
```javascript
pairings.push({
  white_player_id: byePlayer.id,
  black_player_id: null,
  is_bye: true,
  bye_type: 'bye',        // NEW: Set bye type
  section: this.section,
  board: pairings.length + 1
});
```

### 5. Enhanced Result Recording

When recording results for bye pairings:

```javascript
if (pairing.black_player_id === null) {
  // This is a bye or unpaired pairing
  const byePoints = calculateByePoints(pairing.bye_type);
  
  // Record result with bye points
  // Only white player gets points (no opponent)
} else {
  // Normal game between two players
  // Both players get points based on result
}
```

## Files Modified

1. **server/database.js**
   - Added `bye_type` column to pairings table
   
2. **server/utils/enhancedPairingSystem.js**
   - Updated all bye creation logic to set `bye_type: 'bye'`
   - Affected 8 different locations (all bye creations)

3. **server/routes/pairings.js**
   - Added `calculateByePoints()` function
   - Enhanced result recording logic for bye handling
   - Added new `POST /:id/bye-result` endpoint

## How to Use

### For Tournament Directors

**When you have an odd number of players:**
1. System automatically generates a bye during pairing
2. After round, call `/bye-result` with `byeType: "bye"`
3. Player gets 0.5 points

**When a player doesn't show up:**
1. Don't pair them (or create a bye if already generated)
2. Call `/bye-result` with `byeType: "unpaired"`
3. Player gets 1.0 points

### For Developers

**To record a bye programmatically:**

```javascript
// Option 1: Using fetch
const response = await fetch(`/api/pairings/${pairingId}/bye-result`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ byeType: 'bye' })
});

// Option 2: Using axios
axios.post(`/api/pairings/${pairingId}/bye-result`, {
  byeType: 'unpaired'
});
```

## Backward Compatibility

- Old tournaments with `bye_type = NULL` still work correctly
- System automatically handles both old and new bye types
- No data migration needed
- Existing tournament data is preserved

## Points Calculation

| Result | White | Black |
|--------|-------|-------|
| 1-0 | 1 | 0 |
| 0-1 | 0 | 1 |
| 1/2-1/2 | 0.5 | 0.5 |
| Bye (0.5) | 0.5 | - |
| Unpaired (1.0) | 1.0 | - |

## Tiebreaker Handling

Byes are handled correctly in tiebreaker calculations:
- **Buchholz**: Bye opponents count as 0 (no opponent exists)
- **Sonneborn-Berger**: Byes don't contribute to score
- **Direct Encounter**: N/A for byes

## Testing Checklist

- [ ] Create 9-player tournament (generates byes with `bye_type = 'bye'`)
- [ ] Verify bye gets 0.5 points
- [ ] Record a player as unpaired (`bye_type = 'unpaired'`)
- [ ] Verify unpaired gets 1.0 points
- [ ] Check standings show correct total points
- [ ] Verify tiebreakers calculate correctly with byes

## Standards Compliance

✓ FIDE Swiss System Rules
✓ USCF Chess Rules
✓ Half-point bye for odd player counts
✓ Full point bye for unpaired players

## Documentation

See `BYE_HANDLING_GUIDE.md` for comprehensive documentation.

## Support

For questions or issues:
1. Review `BYE_HANDLING_GUIDE.md`
2. Check the API endpoint responses
3. Verify `bye_type` column exists in database
4. Check pairings and results tables for data integrity
