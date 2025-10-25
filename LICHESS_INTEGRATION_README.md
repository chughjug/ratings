# Lichess Integration for Chess Tournament Management

This document describes the Lichess API integration that allows tournament directors to create online games directly from their tournament pairings.

## Features

### 🔐 OAuth2 Authentication
- Secure authentication with Lichess using OAuth2 with PKCE
- Automatic token management and refresh
- User profile integration

### 🏆 Tournament Management
- Create Swiss tournaments on Lichess
- Sync tournament data between local and Lichess systems
- Real-time tournament status updates

### 🎮 Game Creation
- Generate individual challenges for each pairing
- Create bulk pairings for multiple games
- Support for various time controls
- Automatic game result synchronization

### 📊 Result Synchronization
- Sync game results from Lichess to local database
- Import PGN games for analysis
- Update tournament standings automatically

## Setup Instructions

### 1. Lichess OAuth Setup

Lichess now uses a PKCE-based OAuth system that doesn't require traditional client registration. The integration works out of the box with a default client ID.

**No registration required!** The system uses PKCE (Proof Key for Code Exchange) for secure authentication.

### 2. Environment Variables (Optional)

You can optionally customize the client ID and redirect URI in your `.env` file:

```env
# Lichess OAuth Configuration (optional)
LICHESS_CLIENT_ID=your_custom_client_id
LICHESS_REDIRECT_URI=http://localhost:3000/api/lichess/callback

# For production, use your actual domain
# LICHESS_REDIRECT_URI=https://yourdomain.com/api/lichess/callback
```

**Note**: If you don't set these environment variables, the system will use sensible defaults:
- `LICHESS_CLIENT_ID`: `chess-tournament-director`
- `LICHESS_REDIRECT_URI`: 
  - Development: `http://localhost:3000/api/lichess/callback`
  - Production: `https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/lichess/callback`

### 3. Database Migration

The integration adds several new columns to your database:

```sql
-- Players table
ALTER TABLE players ADD COLUMN lichess_username TEXT;

-- Pairings table
ALTER TABLE pairings ADD COLUMN lichess_challenge_id TEXT;
ALTER TABLE pairings ADD COLUMN lichess_game_id TEXT;
ALTER TABLE pairings ADD COLUMN lichess_status TEXT;
ALTER TABLE pairings ADD COLUMN pgn TEXT;

-- Tournaments table
ALTER TABLE tournaments ADD COLUMN lichess_tournament_id TEXT;
ALTER TABLE tournaments ADD COLUMN lichess_integration_enabled BOOLEAN DEFAULT 0;
```

Run the migration:
```bash
node server/migrations/add-lichess-integration.js
```

## API Endpoints

### Authentication
- `GET /api/lichess/auth` - Initiate OAuth flow
- `GET /api/lichess/callback` - OAuth callback handler

### Tournament Management
- `POST /api/lichess/tournament/create` - Create Swiss tournament
- `POST /api/lichess/tournament/:id/join` - Join tournament
- `GET /api/lichess/tournament/:id` - Get tournament info
- `GET /api/lichess/tournament/:id/results` - Get tournament results
- `GET /api/lichess/tournament/:id/games` - Get tournament games
- `POST /api/lichess/tournament/:id/sync` - Sync results to local DB

### Game Management
- `POST /api/lichess/challenges/create` - Create individual challenges
- `POST /api/lichess/bulk-pairing` - Create bulk pairings
- `GET /api/lichess/games/:id/export` - Export game (PGN/JSON)

### User Management
- `GET /api/lichess/users/search?query=username` - Search users
- `GET /api/lichess/users/:username` - Get user data

## Usage Guide

### 1. Basic Integration

The Lichess integration component is automatically included in the tournament overview page. It provides:

- **Authentication**: Connect your Lichess account
- **Tournament Creation**: Create a Swiss tournament on Lichess
- **Player Mapping**: Map local players to Lichess usernames
- **Result Sync**: Synchronize game results

### 2. Creating Games

#### Option A: Swiss Tournament
1. Click "Create Tournament" in the Lichess integration panel
2. Players join the tournament manually on Lichess
3. Use "Sync Results" to import game results

#### Option B: Individual Challenges
1. Map players to their Lichess usernames
2. Click "Create Challenges" to generate individual games
3. Players receive challenge notifications on Lichess

### 3. Player Mapping

Before creating games, ensure players have Lichess usernames:

1. Go to the tournament players list
2. Edit each player to add their Lichess username
3. Or use the bulk import feature to add usernames

### 4. Result Synchronization

After games are played:
1. Click "Sync Results" in the Lichess integration panel
2. The system will automatically:
   - Fetch game results from Lichess
   - Update local pairings with results
   - Import PGN games for analysis
   - Update tournament standings

## Frontend Components

### LichessIntegration Component

```tsx
import LichessIntegration from '../components/LichessIntegration';

<LichessIntegration
  tournamentId="tournament-id"
  tournamentName="Tournament Name"
  timeControl="G/30+0"
  rounds={5}
  players={playersArray}
  onGamesCreated={(games) => {
    // Handle games created
  }}
/>
```

### LichessService

```typescript
import { lichessService } from '../services/lichessService';

// Check authentication
if (lichessService.isAuthenticated()) {
  // User is logged in
}

// Create tournament
const tournament = await lichessService.createSwissTournament(accessToken, {
  name: 'My Tournament',
  rounds: 5,
  timeControl: { timeLimit: 30, increment: 0 }
});
```

## Error Handling

The integration includes comprehensive error handling:

- **Authentication Errors**: Invalid tokens, expired sessions
- **API Errors**: Rate limiting, invalid requests
- **Network Errors**: Connection issues, timeouts
- **Data Errors**: Missing usernames, invalid pairings

All errors are displayed to the user with helpful messages and suggested actions.

## Rate Limiting

Lichess has rate limits on their API:
- **General API**: 2000 requests per hour
- **Challenge API**: 20 challenges per hour
- **Tournament API**: 10 tournaments per hour

The integration respects these limits and provides appropriate feedback.

## Security Considerations

1. **OAuth2 with PKCE**: Secure authentication flow
2. **Token Storage**: Tokens stored in localStorage (consider server-side storage for production)
3. **State Validation**: OAuth state parameter validation
4. **HTTPS Required**: All production deployments must use HTTPS

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - The new PKCE system doesn't require client registration
   - Verify redirect URI matches your environment
   - Check that the OAuth flow is completing properly

2. **"Failed to create tournament"**
   - Check if user has tournament creation permissions
   - Verify tournament name is unique
   - Check rate limits

3. **"Player not found"**
   - Ensure Lichess username is correct
   - Check if player exists on Lichess
   - Verify username spelling

4. **"Sync failed"**
   - Check if tournament exists on Lichess
   - Verify access token is valid
   - Check network connectivity

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=lichess:*
```

## Testing

Run the integration test:
```bash
node test-lichess-integration.js
```

This will test:
- OAuth initiation
- API endpoint availability
- Error handling
- Authentication flow

## Production Deployment

### Environment Variables
```env
LICHESS_CLIENT_ID=your_production_client_id
LICHESS_CLIENT_SECRET=your_production_client_secret
LICHESS_REDIRECT_URI=https://yourdomain.com/api/lichess/callback
```

### Security
- Use HTTPS for all production URLs
- Consider server-side token storage
- Implement proper CORS configuration
- Add rate limiting for API endpoints

### Monitoring
- Monitor API usage and rate limits
- Log authentication events
- Track sync success/failure rates
- Monitor error rates

## Support

For issues with the Lichess integration:

1. Check the [Lichess API Documentation](https://lichess.org/api)
2. Review error messages in the browser console
3. Check server logs for detailed error information
4. Verify OAuth app configuration

## Future Enhancements

Planned features:
- [ ] Automatic player matching by rating
- [ ] Tournament templates for common formats
- [ ] Real-time game monitoring
- [ ] Advanced result analysis
- [ ] Integration with other chess platforms
- [ ] Mobile app support
- [ ] Offline mode with sync
