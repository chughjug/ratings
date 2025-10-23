# Swiss System Pairing Integration

This document describes the integration of the Swiss system pairing algorithm from the `swiss-system-chess-tournament-master` folder into the current tournament management system.

## Overview

The Swiss system pairing algorithm has been successfully integrated and provides a more accurate implementation of FIDE Swiss system rules, including:

- Proper score group handling
- Transposition logic for optimal pairings
- Color preference management
- Downfloater/upfloater handling
- Repeat pairing avoidance
- FIDE title-based ordering

## Files Added/Modified

### New Files
- `server/utils/swissSystemPairing.js` - The main Swiss system pairing implementation

### Modified Files
- `server/routes/pairings.js` - Added support for Swiss system pairing

## Usage

### Option 1: Use Swiss System by Default
To enable Swiss system pairing for all tournaments, add this to your tournament settings:

```json
{
  "use_swiss_system": true
}
```

### Option 2: Use Swiss System for Specific Rounds
Use the new endpoint to generate pairings with the Swiss system algorithm:

```bash
POST /api/pairings/generate/swiss-system
{
  "tournamentId": "your-tournament-id",
  "round": 2
}
```

### Option 3: Automatic Detection
The system will automatically use Swiss system pairing if the tournament settings contain `"use_swiss_system": true`.

## API Endpoints

### Generate Swiss System Pairings
```
POST /api/pairings/generate/swiss-system
```

**Request Body:**
```json
{
  "tournamentId": "string",
  "round": "number"
}
```

**Response:**
```json
{
  "message": "Swiss system pairings generated successfully",
  "pairings": [
    {
      "board": 1,
      "white_player_id": "player-id",
      "black_player_id": "player-id",
      "section": "Open"
    }
  ],
  "algorithm": "swiss-system",
  "sections": ["Open"]
}
```

## Algorithm Features

### 1. Score Group Processing
- Players are grouped by their current score
- Groups are processed in descending order (highest scores first)
- Downfloaters are properly handled between groups

### 2. Transposition Logic
- When multiple valid pairings exist within a score group, the algorithm tries all possible transpositions
- This ensures optimal pairing selection based on Swiss system rules

### 3. Color Assignment
- Implements proper FIDE color preference rules
- Considers previous color history
- Avoids giving the same color three times in a row

### 4. Repeat Pairing Avoidance
- Tracks all previous pairings
- Ensures players don't meet the same opponent twice
- Uses transposition to find valid pairings when repeats would occur

### 5. FIDE Title Ordering
- Orders players by FIDE titles (GM > IM > FM > CM > WGM > WIM > WFM > WCM)
- Uses rating as secondary criteria
- Alphabetical ordering as final tiebreaker

## Testing

The integration has been thoroughly tested with:
- First round pairings (top half vs bottom half)
- Subsequent rounds with previous results
- Odd number of players (bye handling)
- Color preference management
- Repeat pairing avoidance

## Compatibility

The Swiss system pairing is fully compatible with:
- Existing tournament formats
- Section-based tournaments
- Team tournaments
- All existing API endpoints

## Migration

No migration is required. The new Swiss system pairing works alongside the existing pairing algorithms. You can:

1. Continue using the existing pairing algorithm (default)
2. Enable Swiss system pairing for specific tournaments
3. Use the new endpoint for Swiss system pairings

## Performance

The Swiss system algorithm is optimized for performance:
- Efficient transposition generation
- Minimal database queries
- Fast pairing generation even for large tournaments

## Future Enhancements

Potential future improvements:
- Buchholz score integration
- Sonneborn-Berger score support
- Advanced color balancing
- Tournament-specific pairing rules
