# Tournament Format Update - Complete Summary

## Changes Made

### 1. Tournament Format Reduction
- Reduced from 11 formats to 2 formats:
  - **Swiss** - Traditional Swiss system pairing (unchanged)
  - **Online** - Online tournament with Lichess integration

### 2. Files Modified
- `client/src/types/index.ts` - Updated Tournament interface
- `client/src/pages/CreateTournament.tsx` - Updated format dropdown and disabled pairing settings for online
- `client/src/pages/TournamentDetail.tsx` - Added format check to only show Lichess integration for online tournaments

### 3. Key Features
- **Swiss tournaments** have no Lichess integration (as requested)
- **Online tournaments** show Lichess integration component
- Pairing method and type settings are disabled for online tournaments (since they use Lichess's pairing system)
- Team standings and pairings are not available for these formats (since team formats were removed)

### 4. Lichess Integration
- The LichessIntegration component only renders for tournaments with format === 'online'
- LichessIntegration is conditionally rendered in the overview tab
- Swiss tournaments will not show any Lichess integration UI

## Testing Checklist
- [ ] Create a Swiss tournament - verify no Lichess UI appears
- [ ] Create an Online tournament - verify Lichess integration appears
- [ ] Verify format dropdown only shows "Swiss System" and "Online (Lichess)"
- [ ] Verify pairing settings are disabled for online tournaments

## Removed Formats
- round-robin, knockout, team-swiss, team-round-robin, individual-team-swiss, blitz, rapid, simultaneous, multi-day, quad
