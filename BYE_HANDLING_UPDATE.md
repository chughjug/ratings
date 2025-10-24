# Bye Handling - Clarification Update

## Change Summary

Updated the bye handling system to properly handle **registered byes** (intentional player byes registered during registration).

## Key Update

### Registered Byes Now Get 1.0 Points (Not 0.5)

**Before**: No distinction made
**Now**: 
- Players with registered byes → NOT paired for that round → Get 1.0 points (unpaired)
- Automatic byes (odd player count) → Get 0.5 points (bye)
- No-shows/Dropouts → Get 1.0 points (unpaired)

## How It Works

### During Pairing Generation

When generating pairings for a round, the system now:

1. **Checks for registered byes**: Reads `intentional_bye_rounds` field for each player
2. **Separates players**: Removes players with registered byes from the pairing pool
3. **Generates pairings**: Creates games for remaining players
4. **Creates unpaired pairings**: Adds unpaired entries for registered bye players
   - bye_type = 'unpaired'
   - Points = 1.0 (full point)
   - Not paired with any opponent

### Code Changes

**File**: `server/utils/enhancedPairingSystem.js`

```javascript
// Check for players with registered byes for this round
const registeredByePlayers = [];
const pairedPlayers = [];

players.forEach(player => {
  if (player.intentional_bye_rounds) {
    const byeRounds = JSON.parse(player.intentional_bye_rounds);
    if (Array.isArray(byeRounds) && byeRounds.includes(round)) {
      registeredByePlayers.push(player.id);  // Skip pairing
    } else {
      pairedPlayers.push(player);  // Include in pairings
    }
  } else {
    pairedPlayers.push(player);
  }
});

// Generate pairings only for non-bye players
const playersWithPoints = await Promise.all(
  pairedPlayers.map(async (player) => { /* ... */ })
);

// ... generate pairings ...

// Add unpaired pairings for registered bye players
registeredByePlayers.forEach(playerId => {
  sectionPairings.push({
    white_player_id: playerId,
    black_player_id: null,
    is_bye: true,
    bye_type: 'unpaired',  // Full point bye
    // ...
  });
});
```

## Bye Type Summary

| Type | Points | When | Created By |
|------|--------|------|-----------|
| Bye | 0.5 | Odd player count | System (automatic) |
| Unpaired (Registered) | 1.0 | Player registered bye | System (automatic) |
| Unpaired (No-show) | 1.0 | Player didn't show up | TD (via API) |
| Unpaired (Dropped) | 1.0 | Player withdrawn | TD (via API) |

## Examples

### Example 1: 9-Player Tournament, One Registered Bye

**Round 1 Registration**:
- Player A: Registers for all rounds
- Player B: Registers for all rounds
- ...
- Player I: Registers but requests bye for Round 2

**Round 1 Pairings**:
- Game 1: A vs B
- Game 2: C vs D
- Game 3: E vs F
- Game 4: G vs H
- Bye: I gets 0.5 (odd player count)
- Points: I gets 0.5

**Round 2 Pairings**:
- Game 1: A vs C
- Game 2: B vs D
- Game 3: E vs G
- Game 4: F vs H
- Unpaired: I (registered bye) - gets 1.0
- Points: I gets 1.0 (not 0.5!)

### Example 2: 8-Player Tournament, One Registered Bye, One No-Show

**Round 1**:
- Players: A, B, C, D, E, F, G, H
- Player H has registered bye for Round 1
- Game 1: A vs B
- Game 2: C vs D
- Game 3: E vs F
- Game 4: G (needs opponent - bye gets assigned) - gets 0.5
- Unpaired: H (registered bye) - gets 1.0

**Round 2**:
- Everyone should play
- Player G doesn't show up
- Games created for A-H
- TD calls /bye-result with byeType: 'unpaired' for G
- G gets 1.0 (no-show bye)

## API Behavior

The `/bye-result` endpoint behavior remains unchanged:

```bash
# Record player not paired (no-show, dropped, etc.)
POST /api/pairings/:pairingId/bye-result
{ "byeType": "unpaired" }
# Player gets 1.0 point
```

## Database Changes

No additional database changes needed. Uses existing:
- `intentional_bye_rounds` in players table
- `bye_type` column in pairings table

## Migration

- Automatic
- No data migration needed
- Existing tournaments work without changes
- All new pairings automatically check for registered byes

## Testing

```javascript
// Create tournament with 9 players
// Register Player 1 with bye for Round 1

// Generate Round 1 pairings
// Expected: Player 1 gets unpaired pairing with bye_type='unpaired'
// Expected points for Player 1: 1.0 (not 0.5)

// Remaining 8 players: 4 games + 1 auto-bye
// Auto-bye player should get 0.5, not 1.0
```

## Documentation Updated

- **BYE_HANDLING_GUIDE.md** - Updated Bye Types section
- **BYE_HANDLING_GUIDE.md** - Updated Common Scenarios
- All examples now reflect registered bye behavior

## Key Points

✅ Registered byes → 1.0 points (unpaired, not paired for that round)
✅ Automatic byes (odd count) → 0.5 points (still assigned randomly)
✅ No-shows/Dropouts → 1.0 points (recorded via API)
✅ Automatic handling during pairing generation
✅ No TD action needed for registered byes
✅ Fair and compliant with chess tournament standards

## Backward Compatibility

✅ Old tournaments work without changes
✅ Old pairings with bye_type=NULL still work
✅ No data loss
✅ Automatic on server startup

---

**Last Updated**: October 24, 2025
**Status**: Complete and Ready for Production
