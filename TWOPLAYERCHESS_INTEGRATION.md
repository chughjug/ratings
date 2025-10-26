# 2PlayerChess Integration for Online Tournaments

This integration allows tournament directors to use the 2PlayerChess platform for online games instead of relying on Lichess or other external platforms. Players can play directly through the tournament management system with configurable time controls.

## Features

- **Generate Game Links**: Automatically create unique game room links for each pairing
- **Configurable Time Controls**: Set time controls (e.g., 45+15, 60+5) for all games
- **Direct Integration**: Games are created within the tournament system
- **Result Synchronization**: Game results can be automatically synced back to the tournament
- **Room-Based Access**: Each pairing gets a unique room code for secure game access

## How It Works

### 1. Creating Online Games

When you generate pairings for a tournament:

1. Navigate to the **Pairings** tab for your tournament
2. Click on the **"Online Game Generation"** section
3. Click **"Generate Games"** to create unique game links for all pairings
4. Copy and share each game link with the players in that pairing

### 2. Player Experience

1. Player 1 receives the game link and clicks to join the room
2. Player 1 is assigned White (or Black) automatically
3. Player 2 receives the same link and joins the room
4. When both players are present, the game starts with the configured time control
5. Players play the game in real-time with synchronized clocks
6. Game result (1-0, 0-1, 1/2-1/2) is recorded when the game ends

### 3. Time Controls

The system supports various time control formats:
- **G/45+15**: 45 minutes + 15 second increment
- **60+5**: 60 minutes + 5 second increment
- **5**: 5 minutes with no increment

### 4. Result Management

When a game is completed:
- The result can be manually entered by the tournament director
- Or automatically synced if the 2PlayerChess game reports the result
- The result updates the pairing in the tournament system
- Tournament standings are automatically updated

## Technical Details

### Database Schema

The integration adds an `online_games` table with the following fields:
- `id`: Unique game identifier
- `tournament_id`: Tournament reference
- `pairing_id`: Related pairing reference
- `round`: Round number
- `room_code`: Unique room code for the game
- `game_url`: Direct link to the game
- `time_control`: Time control settings
- `status`: Game status (created, started, completed)
- `result`: Game result
- `pgn`: Game notation (PGN format)

### API Endpoints

#### Create Game
```http
POST /api/chess2player/games/create
Content-Type: application/json

{
  "tournamentId": "tournament-id",
  "pairingId": "pairing-id",
  "round": 1,
  "roomCode": "ABC123",
  "timeControl": "45+15"
}
```

#### Get Games for Round
```http
GET /api/chess2player/games/:tournamentId/round/:round
```

#### Update Game Result
```http
PUT /api/chess2player/games/:id/result
Content-Type: application/json

{
  "result": "1-0",
  "pgn": "[Event \"Tournament\"] ..."
}
```

#### Get Game Details
```http
GET /api/chess2player/games/:id
```

## Setup Instructions

### 1. Database Migration

The integration requires a database migration. Run:

```bash
node server/migrations/add-online-games-table.js
```

This creates the `online_games` table and necessary indexes.

### 2. Server Configuration

The 2PlayerChess integration is automatically enabled in the server. The routes are registered at `/api/chess2player/*`.

### 3. Frontend Integration

The `OnlineGameIntegration` component is available for use in tournament detail pages. It provides:

- Game link generation
- Copy-to-clipboard functionality
- Visual game status indicators
- Time control display

## Usage Example

```typescript
import OnlineGameIntegration from '../components/OnlineGameIntegration';

<OnlineGameIntegration
  tournamentId={tournament.id}
  tournamentName={tournament.name}
  timeControl="G/45+15"
  round={currentRound}
  pairings={currentPairings}
  onGameCreated={(pairingId, gameUrl) => {
    console.log('Game created:', pairingId, gameUrl);
  }}
/>
```

## Advantages

### vs Lichess Integration
- **No Authentication Required**: Players don't need Lichess accounts
- **Direct Control**: Complete control over the game environment
- **No Rate Limits**: No API rate limiting concerns
- **Customization**: Fully customizable chess interface
- **Offline Capable**: Can run entirely within your infrastructure

### vs Chess.com
- **Self-Hosted**: No external dependencies
- **Cost-Effective**: No API costs or subscriptions
- **Privacy**: All games stored on your server
- **Custom Time Controls**: Any time control configuration

## Troubleshooting

### Games Not Starting
- Verify both players have clicked the game link
- Check that players are in the same room (match room codes)
- Ensure time control settings are valid

### Results Not Syncing
- Verify the game was completed
- Check that the result format matches tournament expectations
- Manually enter results if automatic sync fails

### Room Codes Not Working
- Ensure room codes are unique
- Check that room codes haven't expired
- Verify players are using the correct tournament-specific links

## Future Enhancements

Planned features:
- [ ] Automatic result synchronization
- [ ] Live game monitoring
- [ ] Spectator mode
- [ ] Game replay functionality
- [ ] Tournament-wide game links
- [ ] Mobile app support

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for errors
3. Verify database table creation
4. Check API endpoint responses

## License

This integration uses the 2PlayerChess platform, which is a two-player real-time chess game built with vanilla JS, jQuery, Socket.io, Bootstrap, and Express.
