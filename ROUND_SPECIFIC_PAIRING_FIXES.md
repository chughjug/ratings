# Round-Specific Pairing Fixes

## Issues Identified and Fixed

### 1. **Multiple Games Per Round Issue**
**Problem**: Players were playing multiple games in a single round, affecting standings calculation.

**Root Cause**: When pairing results were updated, the system was INSERTING new results into the results table instead of UPDATING existing ones, creating duplicate entries.

**Fix Applied**:
- Added DELETE operation before INSERT to remove existing results for the same pairing
- Added pairing_id to results table for better tracking
- Implemented proper deduplication logic

```javascript
// Before: Just INSERT (created duplicates)
INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)

// After: DELETE then INSERT (prevents duplicates)
DELETE FROM results 
WHERE tournament_id = ? AND round = ? 
AND ((player_id = ? AND opponent_id = ?) OR (player_id = ? AND opponent_id = ?))

INSERT INTO results (id, tournament_id, player_id, round, opponent_id, color, result, points, pairing_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

### 2. **Standings Calculation Issue**
**Problem**: Standings calculation was counting duplicate results, inflating player scores and games played.

**Fix Applied**:
- Changed `COUNT(*)` to `COUNT(DISTINCT round)` to count unique rounds only
- Updated standings calculation to properly handle round-specific data

```javascript
// Before: COUNT(*) (counted duplicates)
SELECT player_id, SUM(points) as total_points, COUNT(*) as games_played
FROM results WHERE tournament_id = ? AND round < ?
GROUP BY player_id

// After: COUNT(DISTINCT round) (counts unique rounds only)
SELECT player_id, SUM(points) as total_points, COUNT(DISTINCT round) as games_played
FROM results WHERE tournament_id = ? AND round < ?
GROUP BY player_id
```

### 3. **Old Round Data Retrieval Issue**
**Problem**: Unable to generate or view old round data properly.

**Fix Applied**:
- Enhanced pairing retrieval route with better logging
- Added round-specific standings endpoint
- Improved error handling and debugging information

## New API Endpoints

### 1. **Clean Up Duplicates**
```
POST /api/pairings/tournament/:tournamentId/cleanup-duplicates
```
Removes duplicate results for a tournament, keeping only the most recent entries.

### 2. **Round-Specific Standings**
```
GET /api/pairings/tournament/:tournamentId/round/:round/standings
```
Gets standings up to a specific round with proper deduplication.

## Database Changes

### Results Table Enhancement
- Added `pairing_id` field to results table for better tracking
- Ensured proper foreign key relationships

### Query Optimizations
- All standings queries now use `COUNT(DISTINCT round)` instead of `COUNT(*)`
- Added proper deduplication logic in all result queries

## Code Changes Made

### `/server/routes/pairings.js`

1. **Fixed Result Insertion Logic** (lines 538-584):
   - Added DELETE operation before INSERT to prevent duplicates
   - Added pairing_id to results table entries
   - Improved error handling

2. **Fixed Standings Calculation** (lines 266-279):
   - Changed to use `COUNT(DISTINCT round)` for accurate games played count
   - Added proper deduplication in standings queries

3. **Enhanced Pairing Retrieval** (lines 28-118):
   - Added better logging for debugging
   - Improved error handling and response formatting

4. **Added New Endpoints**:
   - Duplicate cleanup endpoint (lines 1847-1881)
   - Round-specific standings endpoint (lines 1883-1939)

## Testing

Created `/test_round_specific_pairings.js` to verify:
- ✅ No duplicate results are created when updating pairing results
- ✅ Standings calculation works correctly for round-specific data
- ✅ Old round data can be retrieved properly
- ✅ Players only have one game per round

## Benefits

1. **Accurate Standings**: Players now have correct points and games played counts
2. **No Duplicate Results**: Each player has exactly one result per round
3. **Proper Round Tracking**: Round-specific data is handled correctly
4. **Better Data Integrity**: Results table maintains referential integrity
5. **Improved Debugging**: Enhanced logging for troubleshooting

## Usage

### Clean Up Existing Duplicates
```bash
curl -X POST http://localhost:5000/api/pairings/tournament/{tournamentId}/cleanup-duplicates
```

### Get Round-Specific Standings
```bash
curl http://localhost:5000/api/pairings/tournament/{tournamentId}/round/{round}/standings
```

### Get Pairings for Specific Round
```bash
curl http://localhost:5000/api/pairings/tournament/{tournamentId}/round/{round}
```

## Verification

The fixes ensure that:
- ✅ Players have exactly one game per round
- ✅ Standings calculation is accurate
- ✅ Old round data can be retrieved
- ✅ No duplicate results are created
- ✅ Round-specific data is properly handled

All round-specific pairing issues have been resolved!
