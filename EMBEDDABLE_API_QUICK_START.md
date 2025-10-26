# Embeddable Tournament API - Quick Start

## Overview

The embeddable tournament API provides **complete tournament data** in a single API call, allowing you to reconstruct and display the full public tournament page on any website.

## Endpoint

```
GET /api/tournaments/:id/embed
```

## Quick Demo

1. **Test the endpoint locally:**
   ```bash
   # Start the server
   npm run dev
   
   # Visit the test page
   open http://localhost:3000/test-embed-tournament.html
   ```

2. **Or test directly via browser:**
   ```
   http://localhost:5000/api/tournaments/YOUR-TOURNAMENT-ID/embed
   ```

## What Data is Included?

The API returns a comprehensive JSON object with:

- ✅ **Tournament metadata** (name, format, dates, location, etc.)
- ✅ **All players** with ratings and status
- ✅ **All pairings** from all rounds
- ✅ **Pairings grouped by round** for easy display
- ✅ **Current standings** with tiebreakers
- ✅ **Round-by-round results** for each player
- ✅ **Prize information**
- ✅ **Organization branding** (if tournament belongs to an org)
- ✅ **Tournament statistics**

## Basic Usage

### JavaScript Example

```javascript
// Fetch tournament data
const response = await fetch('/api/tournaments/TOURNAMENT-ID/embed');
const data = await response.json();

// Display tournament name
console.log(data.tournament.name);

// Display current round
console.log(`Round ${data.currentRound} of ${data.tournament.rounds}`);

// Display standings
data.standings.forEach(player => {
  console.log(`${player.rank}. ${player.name} - ${player.total_points} points`);
});

// Display pairings for a specific round
const round5Pairings = data.pairingsByRound[5];
round5Pairings.forEach(pairing => {
  console.log(`Board ${pairing.board}: ${pairing.white_name} vs ${pairing.black_name}`);
});
```

### React Example

```jsx
import React, { useState, useEffect } from 'react';

function TournamentEmbed({ tournamentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/embed`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setData(data);
        }
        setLoading(false);
      });
  }, [tournamentId]);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Tournament not found</div>;

  return (
    <div>
      <h1>{data.tournament.name}</h1>
      <p>Round {data.currentRound} of {data.tournament.rounds}</p>
      
      {/* Standings */}
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {data.standings.map(player => (
            <tr key={player.id}>
              <td>{player.rank}</td>
              <td>{player.name}</td>
              <td>{player.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Response Structure

```json
{
  "success": true,
  "meta": {
    "generatedAt": "2024-01-01T12:00:00.000Z",
    "tournamentId": "tournament-id",
    "format": "embed",
    "version": "1.0.0"
  },
  "tournament": {
    "id": "...",
    "name": "Chess Tournament",
    "format": "swiss",
    "rounds": 5,
    "status": "active",
    ...
  },
  "currentRound": 3,
  "players": [...],
  "pairings": [...],
  "pairingsByRound": {
    "1": [...],
    "2": [...],
    "3": [...]
  },
  "standings": [...],
  "standingsBySection": {...},
  "prizes": [...],
  "organization": {...},
  "statistics": {
    "totalPlayers": 50,
    "activePlayers": 48,
    "totalGames": 200,
    "completedGames": 180,
    "averageRating": 1500
  }
}
```

## Use Cases

### 1. Display Tournament on External Website

```html
<!-- Embed on any website -->
<script>
fetch('/api/tournaments/YOUR-TOURNAMENT-ID/embed')
  .then(res => res.json())
  .then(data => {
    // Customize and display the data
    document.getElementById('tournament-name').textContent = data.tournament.name;
    // ... render pairings, standings, etc.
  });
</script>
```

### 2. Build Custom Tournament Widget

Create a custom widget that displays tournament information with your own styling.

### 3. Mobile App Integration

Fetch tournament data in mobile apps without building the entire UI.

### 4. Third-Party Integration

Allow third-party websites to display tournament data with their own branding.

## Testing

### Local Testing

1. Get a tournament ID from your database
2. Make a request to: `http://localhost:5000/api/tournaments/[ID]/embed`
3. View the JSON response

### Use the Demo HTML File

1. Open `test-embed-tournament.html` in your browser
2. Enter a tournament ID
3. Click "Load Tournament"
4. View the formatted display

### Heroku Testing

1. Deploy to Heroku:
   ```bash
   git add .
   git commit -m "Add embeddable API endpoint"
   git push heroku main
   ```

2. Test the endpoint on Heroku:
   ```bash
   # Get your app URL
   heroku apps:info
   
   # Test the endpoint
   curl https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-ID/embed
   ```

3. The endpoint is now accessible from any domain with CORS enabled!

## Benefits

✅ **Single API call** - Get all data at once  
✅ **Complete data** - Everything needed to reconstruct the page  
✅ **Flexible** - Use the data however you want  
✅ **No dependencies** - Pure JSON, no SDK required  
✅ **Includes branding** - Organization colors, logos, etc.  
✅ **Always fresh** - Data regenerated on each request  

## Heroku Deployment

The embed endpoint is fully configured for Heroku with proper CORS headers. It will be accessible at:

```
https://YOUR-APP-NAME.herokuapp.com/api/tournaments/:id/embed
```

**Key Features for Heroku:**
- ✅ CORS enabled for all origins
- ✅ Preflight OPTIONS requests handled
- ✅ Works in iframes
- ✅ Accessible from any domain
- ✅ No authentication required

See `HEROKU_EMBED_API_GUIDE.md` for complete Heroku deployment and integration guide.

## Additional Resources

- See `EMBEDDABLE_TOURNAMENT_API.md` for complete API documentation
- See `HEROKU_EMBED_API_GUIDE.md` for Heroku-specific instructions
- See `test-embed-tournament.html` for a working demo
- Check the server logs for endpoint usage

## Questions?

The embeddable API makes it easy to display tournament data anywhere. You have full control over how the data is displayed and styled. The endpoint works seamlessly on Heroku with proper CORS configuration.

