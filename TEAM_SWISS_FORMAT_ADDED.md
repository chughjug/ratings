# Team Swiss Format Added

## Summary
Added "Team Swiss" as the 4th tournament format option alongside Swiss, Online (Lichess), and Quad.

## Files Modified
- `client/src/types/index.ts` - Added 'team-swiss' to format type
- `client/src/pages/CreateTournament.tsx` - Added Team Swiss option to dropdown

## Tournament Formats Now Available (4 Total)

1. **Swiss System** - Traditional individual Swiss pairings
2. **Online (Lichess)** - Online tournament with Lichess integration
3. **Quad Tournament** - Groups of 4 players playing round-robin within each quad
4. **Team Swiss** - Teams compete in Swiss format with board-by-board matchups

## Team Swiss Features

### How It Works
- Teams have a fixed number of players (typically 4-6)
- Each team fields players on boards (board 1 = strongest, board 4 = weakest)
- Teams are paired using Swiss system based on team match scores
- Individual boards play simultaneously (board 1 vs board 1, etc.)
- Team score = sum of all board results

### Scoring
- Each board: 1 point for win, 0.5 for draw, 0 for loss
- Team match: Total of all boards (e.g., 4-0, 2.5-1.5)
- Tiebreaks: Match points → Board points → Olympiad tiebreak → Sonneborn-Berger

### Pairing Logic
- Round 1: Top seed vs bottom seed (e.g., #1 vs #16)
- Subsequent rounds: Teams grouped by score, paired within score groups
- Colors balanced (alternate White/Black per round/board)
- No repeat pairings

### Typical Setup
- Number of rounds: log₂(n) to log₂(n)+1 (e.g., 7 rounds for 64 teams)
- Players per team: 4-6 (most common: 4)
- Organized by: Team names/captains
- Popular in: FIDE events, national leagues, club competitions

### Existing Support
The codebase already has team tournament support:
- Team standings display
- Team pairings display  
- Team scoring methods
- Team management UI components

### Next Steps for Full Implementation
1. Team creation/management interface
2. Player-to-board assignment
3. Team pairing algorithm (Swiss for teams)
4. Team scoring calculations
5. Board-specific result entry

## Status
✅ Format type added
✅ Dropdown option added
✅ UI ready for Team Swiss tournaments
⏳ Backend team pairing logic needed
⏳ Team management UI needed
⏳ Player board assignment needed

