# Quad Tournament Format Guide

## Overview

Quad tournaments are a flexible tournament format where players are divided into small groups of 4 (quads), with each player playing every other player within their quad. This format is popular in chess because it:

- Provides guaranteed games for all players
- Groups players by rating level for fair competition
- Creates multiple mini-tournaments within a single event
- Allows easy scheduling and faster completion
- Provides flexible seeding and grouping options

## System Architecture

### Core Components

#### 1. **QuadPairingSystem** (`server/utils/quadPairingSystem.js`)
The backend utility that handles all quad-related logic:

```javascript
class QuadPairingSystem {
  // Group players by rating into quads of 4
  createQuads()
  
  // Generate round-robin pairings within each quad
  generateRoundRobinPairingsForQuad(quad, round)
  
  // Get quad assignments for display
  getQuadAssignments()
  
  // Static method for tournament-wide generation
  static generateTournamentQuadPairings(tournamentId, round, db, options)
}
```

#### 2. **QuadTournamentDisplay** (`client/src/components/QuadTournamentDisplay.tsx`)
React component for displaying quad tournaments with:

- Summary statistics (total quads, players, current round)
- Expandable quad groups showing all players
- Standings within each quad
- Pairings organized by quad
- Results tracking

#### 3. **Updated Tournament Type** (`client/src/types/index.ts`)
New tournament format type and settings:

```typescript
format: 'quad' // New format option

quad_settings?: {
  group_size: number; // Always 4 for quad
  pairing_type: 'round_robin' | 'swiss'; // How to pair within quads
  group_assignment: 'rating' | 'random' | 'custom'; // How to assign players
  min_players_per_group?: number;
  allow_byes_in_groups?: boolean;
  cross_group_pairings?: boolean; // Allow pairings across groups later
}
```

## How It Works

### Player Distribution Algorithm

Players are distributed into quads using a **snake/zigzag pattern** based on rating:

1. **Sort players by rating** (highest to lowest)
2. **Create containers** for each quad (e.g., 20 players = 5 quads)
3. **Distribute using snake pattern**:
   - Fill quad 1 positions 1-4
   - Fill quad 2 positions 1-4
   - Fill quad 3 positions 1-4, etc.
   - Then reverse and fill backwards for even distribution

Example with 16 players (4 quads):
```
Ratings: 1800, 1750, 1700, 1650, 1600, 1550, 1500, 1450, 1400, 1350, 1300, 1250, 1200, 1150, 1100, 1050

Quad 1: 1800, 1650, 1400, 1050 (mixed strength)
Quad 2: 1750, 1600, 1350, 1100 (mixed strength)
Quad 3: 1700, 1550, 1300, 1150 (mixed strength)
Quad 4: 1500, 1450, 1250, 1200 (mixed strength)
```

### Round-Robin Pairings Within Quads

For 4 players (A, B, C, D):
- **Round 1**: A vs B, C vs D
- **Round 2**: A vs C, B vs D
- **Round 3**: A vs D, B vs C

Total: 6 games (3 per player)

For 3 players:
- **Round 1**: A vs B, C gets bye
- **Round 2**: A vs C, B gets bye
- **Round 3**: B vs C, A gets bye

Total: 3 games (1 per player per round)

## API Endpoints

### Generate Quad Pairings

```http
POST /api/pairings/generate/quad
Content-Type: application/json

{
  "tournamentId": "tournament-uuid",
  "round": 1,
  "clearExisting": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quad pairings generated for round 1",
  "data": {
    "tournamentId": "tournament-uuid",
    "round": 1,
    "quadCount": 5,
    "totalGames": 15,
    "totalByes": 0,
    "quads": [
      {
        "id": "quad-1",
        "number": 1,
        "players": [
          {
            "id": "player-1",
            "name": "Player A",
            "rating": 1800
          },
          // ... more players
        ]
      }
      // ... more quads
    ],
    "pairingsCount": 15
  }
}
```

### Get Quad Assignments

```http
GET /api/pairings/quad/:tournamentId/assignments
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tournamentId": "tournament-uuid",
    "quads": [
      {
        "id": "quad-1",
        "number": 1,
        "players": [
          {
            "id": "player-1",
            "name": "Player A",
            "rating": 1800,
            "section": "Open"
          },
          // ... more players
        ]
      }
      // ... more quads
    ],
    "quadCount": 5,
    "totalPlayers": 20,
    "avgPlayersPerQuad": 4
  }
}
```

## Creating a Quad Tournament

### Step 1: Create Tournament

When creating a new tournament:

```javascript
POST /api/tournaments
{
  "name": "Spring Quad Tournament",
  "format": "quad",  // Set format to 'quad'
  "rounds": 3,
  "time_control": "90+30",
  "start_date": "2025-03-01",
  "end_date": "2025-03-01",
  "settings": {
    "quad_settings": {
      "group_size": 4,
      "pairing_type": "round_robin",
      "group_assignment": "rating",
      "allow_byes_in_groups": true,
      "cross_group_pairings": false
    }
  }
}
```

### Step 2: Add Players

Add players to the tournament. The system will automatically assign them to quads based on rating when pairings are generated.

### Step 3: Generate Pairings

For Round 1, call the quad generation endpoint:

```bash
curl -X POST http://localhost:3001/api/pairings/generate/quad \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "your-tournament-id",
    "round": 1
  }'
```

### Step 4: View and Manage Pairings

- Players are automatically assigned to quads based on rating
- Each quad is displayed with its 4 players
- Pairings within each quad follow round-robin rules
- Results can be entered for each pairing

## UI Components

### QuadTournamentDisplay Usage

```typescript
import QuadTournamentDisplay from '../components/QuadTournamentDisplay';

<QuadTournamentDisplay
  quads={quads}
  pairings={pairings}
  standings={standings}
  currentRound={1}
  totalRounds={3}
  onPairingUpdate={(pairing) => {
    // Handle pairing update
  }}
/>
```

## Features

### 1. Automatic Quad Generation
- Players automatically distributed based on rating
- Snake pattern ensures balanced groups
- Handles odd numbers of players with byes

### 2. Round-Robin Pairings
- Each player plays every other player in their quad
- Automatic bye assignment for incomplete groups
- 3 rounds for 4 players, 3 rounds for 3 players, etc.

### 3. Visual Display
- Summary statistics at the top
- Expandable quad cards showing all details
- Standings within each quad
- Pairings organized by quad and round

### 4. Flexible Settings
- Choose pairing type (round-robin or swiss)
- Control player assignment method (rating, random, custom)
- Enable/disable byes
- Optional cross-quad pairings for advanced tournaments

### 5. Bye Management
- Automatic byes for incomplete groups
- Each player gets bye in different rounds
- Full point award for byes

## Advanced Features

### Custom Group Assignment

Instead of automatic rating-based assignment, you can manually assign players to quads:

1. Get current quad assignments
2. Modify as needed
3. Store custom assignment in database
4. Generate pairings using custom assignments

### Cross-Quad Pairings

For advanced tournaments, enable cross-quad pairings in later rounds:

```javascript
quad_settings: {
  cross_group_pairings: true,
  // In later rounds, players can be paired across quads
  // based on their standings
}
```

### Swiss System Within Quads

Change pairing method to swiss for more flexible scoring:

```javascript
quad_settings: {
  pairing_type: 'swiss', // Instead of round_robin
  // Pairings optimized by rating and score difference
}
```

## Standings Calculation

Quad standings are calculated using:

1. **Total Points**: Sum of all games within the quad
2. **Games Played**: Number of games completed
3. **Record**: Wins/Losses/Draws
4. **Tiebreakers** (if configured):
   - Buchholz (opponent score sum)
   - Sonneborn-Berger
   - Head-to-head results
   - Performance rating

## Limitations and Considerations

### Current Limitations
- Quads are always groups of 4 (configurable in future)
- Cross-quad pairings must be configured at tournament creation
- Bye points fixed at 1 point (customizable in future)

### Best Practices
1. **Ideal Player Count**: Multiples of 4 (16, 20, 24 players)
2. **Odd Numbers**: System handles well with automatic byes
3. **Rating Distribution**: Algorithm ensures balanced groups
4. **Scheduling**: All quads can play simultaneously
5. **Tournament Duration**: Plan for at least 3 rounds minimum

## Examples

### Example 1: 20-Player Quad Tournament

```
Participants: 20 players
Quads: 5 (4 players each)
Rounds: 3 (everyone plays everyone in their quad)
Total Games: 15 pairings per round
Duration: ~2-3 hours total

Schedule:
- 09:00 AM - Round 1 (15 games)
- 10:30 AM - Break
- 10:45 AM - Round 2 (15 games)
- 12:15 PM - Lunch Break
- 01:15 PM - Round 3 (15 games)
- 02:45 PM - Awards
```

### Example 2: 17-Player Quad Tournament

```
Participants: 17 players
Quads: 4 full + 1 with 1 player (gets bye structure)
Actually creates: 5 quads (4, 4, 4, 3, 2) with dynamic pairing

The system automatically handles uneven distribution:
- Some quads have 3 players (byes every round)
- Some quads have 4 players (full round-robin)
```

## Troubleshooting

### Issue: Players not being grouped properly
**Solution**: Check that all players have valid ratings. The system sorts by rating first.

### Issue: Too many byes in a quad
**Solution**: Try manual player assignment or enable cross-quad pairings after round 1.

### Issue: Pairings not generating
**Solution**: 
1. Verify tournament format is set to 'quad'
2. Confirm all active players are in database
3. Check server logs for specific errors
4. Verify no pairings already exist (use clearExisting: true)

## File Structure

```
/server
  /utils
    - quadPairingSystem.js (Core logic)
  /routes
    - pairings.js (Updated with quad endpoints)

/client/src
  /components
    - QuadTournamentDisplay.tsx (UI component)
  /types
    - index.ts (Updated types)
  /pages
    - CreateTournament.tsx (Updated with quad option)
    - TournamentDetail.tsx (Can integrate QuadTournamentDisplay)
```

## Future Enhancements

Potential improvements to the quad system:

1. **Configurable Group Size**: Support groups of 3, 4, 5, etc.
2. **Multiple Pairings Methods**: Swiss-style, round-robin variants
3. **Cross-Quad Advancement**: Top players advance to premium quads
4. **Dynamic Regrouping**: Groups reorganize between rounds based on scores
5. **Customizable Bye Points**: Configure full point vs half point for bye
6. **Integration with Team Scoring**: Team-based quad tournaments
7. **Analytics Dashboard**: Quad-specific performance metrics
8. **Export Functionality**: Print-friendly quad brackets and standings

## Support and Questions

For issues or questions about the quad tournament system:

1. Check server logs: `server.log`
2. Verify database schema includes pairings table
3. Ensure all quad_settings are properly configured
4. Test with sample data first

---

**Version**: 1.0  
**Last Updated**: October 24, 2025  
**Format**: Quad Tournament System for Chess Tournaments
