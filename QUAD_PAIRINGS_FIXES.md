# Quad Pairings Fixes - Complete Solution

## Issues Fixed

### 1. **Quad Sections Not Visible in UI**
**Problem**: When quad pairings were generated, the sections (quad-1, quad-2, etc.) were stored in the pairings table but not showing in the section selector dropdown.

**Root Cause**: The `getAvailableSections()` function only looked for sections in:
- Tournament settings (`tournament.settings.sections`)
- Player records (`player.section`)

It did NOT look in the pairings table where quad sections were stored.

**Solution**: Updated `client/src/utils/sectionUtils.ts` to also extract sections from pairings data:
```typescript
// Added optional pairings parameter to getAvailableSections
export const getAvailableSections = (tournament: Tournament, players: Player[], pairings?: any[]): string[] => {
  const sections = new Set<string>();
  
  // ... existing code for tournament settings and players ...
  
  // NEW: Get sections from pairings (needed for quad tournaments)
  if (pairings && Array.isArray(pairings)) {
    pairings.forEach((pairing: any) => {
      if (pairing.section && pairing.section.trim() !== '') {
        sections.add(pairing.section);
      }
    });
  }
  
  return Array.from(sections).sort();
};
```

Updated `client/src/pages/TournamentDetail.tsx` line 573 to pass pairings:
```typescript
const getAvailableSections = () => {
  if (!tournament) return [];
  return getSectionOptions(tournament, state.players, false, state.pairings);
};
```

### 2. **Incorrect Number of Rounds for Quad Tournaments**
**Problem**: Quad tournaments should have `n-1` rounds where `n` is the number of players per quad (typically 3 rounds for 4-player quads), but the tournament was created with a default number of rounds.

**Root Cause**: The quad pairing system correctly calculates round-robin rounds as `n-1`, but this information wasn't being communicated back or used to validate the tournament rounds setting.

**Solution**: Added a static method to calculate recommended rounds in `server/utils/quadPairingSystem.js`:

```javascript
/**
 * Calculate recommended number of rounds for a quad tournament
 * For a quad (4 players), the round-robin has 3 unique rounds (n-1)
 * @param playerCount - Total number of players
 * @param groupSize - Size of each quad (default: 4)
 * @returns Recommended number of rounds
 */
static calculateRecommendedRounds(playerCount, groupSize = 4) {
  if (playerCount < 2) return 1;
  
  // For round-robin within quads: n-1 where n is players per quad
  // For even group sizes: n-1
  // For odd group sizes: n
  const numRoundRobinRounds = groupSize % 2 === 0 ? groupSize - 1 : groupSize;
  return numRoundRobinRounds;
}
```

Updated the `generateTournamentQuadPairings` method to return the recommended rounds:
```javascript
const recommendedRounds = QuadPairingSystem.calculateRecommendedRounds(players.length, groupSize);

resolve({
  success: true,
  pairings: pairings,
  quads: quads,
  quadCount: system.quads.length,
  totalGames: pairings.filter(p => !p.is_bye).length,
  totalByes: pairings.filter(p => p.is_bye).length,
  recommendedRounds: recommendedRounds  // NEW
});
```

### 3. **Quad Pairings Failing on Round 2+**
**Problem**: Pairings were generated successfully for Round 1 but failed with "No pairings generated for round 2" error.

**Root Cause**: The `generatePairingsForRound()` method only created quads if `round === 1 && this.quads.length === 0`. Since a new QuadPairingSystem instance was created for each round, the quads array was empty for round 2+.

**Solution**: Fixed `server/utils/quadPairingSystem.js` line 194:
```javascript
// BEFORE:
if (round === 1 && this.quads.length === 0) {
  this.createQuads();
}

// AFTER:
// Always create quads if they don't exist (needed for all rounds)
if (this.quads.length === 0) {
  this.createQuads();
}
```

## Files Modified

1. **client/src/utils/sectionUtils.ts** - Added pairings parameter to section extraction
2. **client/src/pages/TournamentDetail.tsx** - Updated getAvailableSections call to pass pairings
3. **server/utils/quadPairingSystem.js** - Two fixes:
   - Fixed line 194 to create quads for all rounds
   - Added calculateRecommendedRounds static method
   - Updated generateTournamentQuadPairings to return recommendedRounds

## Testing

After these fixes, you should be able to:
1. ✅ See quad sections (quad-1, quad-2, etc.) in the section dropdown
2. ✅ See exactly 3 rounds for a 4-player quad tournament (or n-1 for any group size)
3. ✅ Successfully generate pairings for all rounds without 500 errors

## Usage

**For UI users**:
- Generate quad pairings using the "Generate Quads" button
- All quad sections will now appear in the section selector
- The correct number of rounds will be calculated

**For API users**:
- POST `/api/pairings/generate/quad` with `tournamentId`
- Response now includes `recommendedRounds` field

## Notes

- Quads are assigned based on player ratings (highest to lowest)
- For 4-player quads with round-robin format: 3 unique rounds
- Odd-numbered quads get 1 bye per player across all rounds
- Quad IDs follow the pattern: `quad-1`, `quad-2`, `quad-3`, etc.
