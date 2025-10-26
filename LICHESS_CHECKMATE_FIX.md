# Checkmate Detection Fix

## Issue
The checkmate detection function was not working correctly. The game was resetting `checkmate=false` before checking for checkmate conditions.

## Fix
Moved the `findCheckMate()` call to **after** the check/reset logic, ensuring:
1. The move is completed and notated
2. Check/stalemate flags are reset
3. **Then** checkmate is evaluated on the new position

## Changes Made
**File**: `2PlayerChess-master/views/chess.html`

**Before** (Line ~2287):
```javascript
findCheckMate()
//findStaleMate()

removePieceClicks()
...
check=false;
checkmate=false;  // ❌ Reset before checking!
```

**After**:
```javascript
removePieceClicks()
...
check=false;
// Checkmate reset removed - let it be evaluated
findCheckMate()  // ✅ Check after state reset
```

## How It Works
1. After a move is made, the game state is updated
2. `check` flag is reset to false
3. `findCheckMate()` is called to evaluate the new position
4. If checkmate is detected, game ends with appropriate message

## Testing
- Checkmate should now be properly detected
- Game should end when checkmate occurs
- Proper notation with "#" for checkmate moves
- Game result message displayed (1-0 or 0-1)
