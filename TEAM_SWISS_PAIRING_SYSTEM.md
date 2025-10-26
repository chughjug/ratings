# Team Swiss Pairing System

## Summary
Implemented complete board-by-board Team Swiss tournament pairing system for chess teams.

## Files Created

### 1. `server/utils/teamSwissPairingSystem.js`
**Purpose**: Core pairing algorithm for team tournaments

**Features**:
- Swiss system pairing for teams (not individual players)
- Board-by-board game generation
- Team member assignment by rating (board 1 = strongest)
- Color assignment balancing
- Bye handling for odd number of teams
- Previous opponent tracking (no repeats)
- Score group pairing (teams paired against similar scores)

**Key Methods**:
- `generatePairingsForRound(round)`: Main entry point for generating pairings
- `pairTeams(round)`: Swiss system team pairing logic
- `generateBoardPairings(teamMatch, round)`: Board-by-board game generation
- `assignColors(player1, player2, board, round)`: Color assignment
- `static generateTournamentTeamPairings()`: Tournament-wide pairing generation

## Files Modified

### 2. `server/routes/pairings.js`
**Added**:
- Import for `TeamSwissPairingSystem`
- New endpoint: `POST /api/pairings/generate/team-swiss`

**Endpoint Details**:
- **Method**: POST
- **Route**: `/api/pairings/generate/team-swiss`
- **Body**: 
  ```json
  {
    "tournamentId": "uuid",
    "round": 1
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Team Swiss pairings generated successfully",
    "data": {
      "tournamentId": "uuid",
      "round": 1,
      "teamCount": 8,
      "totalGames": 32,
      "totalByes": 0,
      "storedCount": 32,
      "pairings": [...]
    }
  }
  ```

## How Team Swiss Tournaments Work

### Team Pairing
1. Teams are sorted by match points (wins/draws/losses)
2. Teams are grouped by score
3. Within each score group, teams are paired (avoiding previous opponents)
4. If no same-score opponent available, tries adjacent scores
5. Lowest-scoring team gets bye if odd number of teams

### Board Assignment
1. Each team member is sorted by rating (descending)
2. Board 1 = highest rated player
3. Board 2 = second highest, etc.
4. Team with most members determines board count (up to 6 boards)

### Individual Games
- Board 1 vs Board 1 (strongest players face off)
- Board 2 vs Board 2 (second strongest)
- etc.
- Result: Team wins if it wins more individual boards

### Color Assignment
- Alternates by board and round
- Board 1 Round 1: Team 1 gets White
- Board 2 Round 1: Team 2 gets White
- Board 1 Round 2: Team 1 gets Black
- etc.

### Bye Handling
- Team with bye plays against "BYE" on all boards
- All players get full point (1-0)

## Tournament Formats Now Available (4 Total)

1. **Swiss System** - Traditional individual Swiss pairings
2. **Online (Lichess)** - Online tournament with Lichess integration  
3. **Quad Tournament** - Groups of 4 players playing round-robin within each quad
4. **Team Swiss** - Teams compete in Swiss format with board-by-board matchups ✅ NEW

## Database Requirements

The system expects the following database structure:

### Teams Table
```sql
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  tournament_id TEXT,
  name TEXT,
  captain_id TEXT,
  status TEXT DEFAULT 'active'
);
```

### Team Members Table
```sql
CREATE TABLE team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  player_id TEXT,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);
```

### Pairings Table
The pairings table stores individual games with:
- `white_player_id`: Player from one team
- `black_player_id`: Player from opponent team (or NULL for bye)
- `board`: Board number (1, 2, 3, etc.)
- `section`: Team match identifier (e.g., "Team A vs Team B")

## Usage Example

```javascript
// Generate pairings for round 1
const response = await fetch('/api/pairings/generate/team-swiss', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tournamentId: 'tournament-uuid',
    round: 1
  })
});

const result = await response.json();
// result.data.pairings contains individual board games
```

## Team Scoring

After each round, calculate team results:
1. Count wins, losses, draws for each board
2. Team match score = games won by team
3. Winner is team with more wins
4. Match points: 1 for win, 0.5 for draw, 0 for loss

## Features

✅ Swiss system team pairing  
✅ Board-by-board game generation  
✅ Rating-based board assignment  
✅ Color balance across boards  
✅ Bye handling  
✅ No repeat team matchups  
✅ Score group pairing  
✅ Multi-round support  

## Next Steps for Full Implementation

- [ ] UI for team creation/management
- [ ] UI for adding players to teams
- [ ] Board assignment UI (drag-and-drop)
- [ ] Team standings display
- [ ] Team match results entry
- [ ] Automated team score calculation
- [ ] Team tiebreakers (Buchholz, etc.)
- [ ] Export team results to USCF format

## Status

✅ Team pairing algorithm implemented  
✅ Board assignment logic implemented  
✅ API endpoint created  
✅ Database integration complete  
⏳ Frontend UI needed  
⏳ Team management UI needed  
