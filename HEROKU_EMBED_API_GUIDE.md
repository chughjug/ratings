# Heroku Embeddable API Guide

## Overview

The embeddable tournament API is fully configured to work on Heroku with proper CORS headers and security settings. This guide shows you how to use it after deployment.

## Heroku Deployment

The endpoint will be available at:
```
https://YOUR-APP-NAME.herokuapp.com/api/tournaments/:id/embed
```

## CORS Configuration

The embed endpoint is configured to allow requests from any origin on Heroku:

- ✅ **Access-Control-Allow-Origin: *** - Allows requests from any domain
- ✅ **Access-Control-Allow-Methods:** GET, OPTIONS
- ✅ **Access-Control-Max-Age:** 24 hours
- ✅ **Preflight support:** OPTIONS requests are handled

## Using the API on Heroku

### Example URLs

Replace `YOUR-APP-NAME` with your Heroku app name:

```javascript
// Get tournament data
const url = 'https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-TOURNAMENT-ID/embed';
const response = await fetch(url);
const data = await response.json();
```

### Cross-Origin Requests

The endpoint works with JavaScript fetch from any domain:

```javascript
// This works from any website
fetch('https://YOUR-APP-NAME.herokuapp.com/api/tournaments/ID/embed')
  .then(res => res.json())
  .then(data => {
    console.log(data.tournament.name);
  });
```

## Embedding on External Websites

### Basic Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Tournament Display</title>
</head>
<body>
  <div id="tournament"></div>

  <script>
    // Replace with your Heroku app URL and tournament ID
    fetch('https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-TOURNAMENT-ID/embed')
      .then(res => res.json())
      .then(data => {
        document.getElementById('tournament').innerHTML = `
          <h1>${data.tournament.name}</h1>
          <p>Round ${data.currentRound} of ${data.tournament.rounds}</p>
          <p>Players: ${data.statistics.totalPlayers}</p>
        `;
      });
  </script>
</body>
</html>
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const HEROKU_API_URL = 'https://YOUR-APP-NAME.herokuapp.com/api';

function TournamentEmbed({ tournamentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${HEROKU_API_URL}/tournaments/${tournamentId}/embed`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, [tournamentId]);

  if (loading) return <div>Loading tournament...</div>;
  if (!data) return <div>Tournament not found</div>;

  return (
    <div>
      <h1>{data.tournament.name}</h1>
      <p>Round {data.currentRound} of {data.tournament.rounds}</p>
      {/* Render standings, pairings, etc. */}
    </div>
  );
}

export default TournamentEmbed;
```

## Iframe Embedding

The API can be embedded in iframes on any domain:

```html
<iframe 
  src="https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-TOURNAMENT-ID/embed?format=html"
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

## Testing on Heroku

### 1. Test with curl

```bash
curl https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-TOURNAMENT-ID/embed
```

### 2. Test in Browser

Open in browser:
```
https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-TOURNAMENT-ID/embed
```

### 3. Test CORS

From any domain, open browser console and run:

```javascript
fetch('https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-TOURNAMENT-ID/embed')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error('CORS Error:', err));
```

If CORS is working, you'll see the tournament data in the console.

## Troubleshooting

### CORS Errors

If you see CORS errors:

1. Check that the endpoint is deployed to Heroku
2. Verify the URL is correct (include https://)
3. Check browser console for specific error messages
4. Ensure you're using the embed endpoint (`/embed`)

### 404 Errors

If you get 404:
1. Verify the tournament ID exists
2. Check the URL format: `/api/tournaments/ID/embed`
3. Ensure the tournament is public

### Timeout Errors

If requests timeout:
1. Check Heroku logs: `heroku logs --tail`
2. Database queries may be slow with large tournaments
3. Consider increasing Heroku dyno resources if needed

## Production Considerations

### Security

- ✅ The endpoint allows requests from any origin (public API)
- ✅ No authentication required (intended for public tournaments)
- ✅ Rate limiting is applied globally
- ✅ Helmet security headers are configured

### Performance

- Data is fetched fresh on each request
- Consider caching on the client side
- Large tournaments may take 1-2 seconds to load
- Use compression if available on Heroku

### Rate Limits

Current rate limits:
- 1000 requests per 15 minutes per IP

For higher traffic, consider:
- Increasing rate limits in `server/index.js`
- Using a CDN in front of Heroku
- Implementing caching

## API Response Format

The API returns JSON with this structure:

```json
{
  "success": true,
  "meta": {
    "generatedAt": "2024-01-01T12:00:00.000Z",
    "tournamentId": "tournament-id",
    "format": "embed",
    "version": "1.0.0"
  },
  "tournament": { /* tournament details */ },
  "currentRound": 3,
  "players": [ /* all players */ ],
  "pairings": [ /* all pairings */ ],
  "pairingsByRound": { /* grouped by round */ },
  "standings": [ /* standings */ ],
  "standingsBySection": { /* grouped by section */ },
  "prizes": [ /* prizes */ ],
  "organization": { /* branding if applicable */ },
  "statistics": { /* quick stats */ }
}
```

## Example Integration

### Wordpress Website

Add this to your Wordpress page or post:

```html
<div id="tournament-widget"></div>

<script>
fetch('https://YOUR-APP-NAME.herokuapp.com/api/tournaments/YOUR-ID/embed')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('tournament-widget');
    container.innerHTML = `
      <h2>${data.tournament.name}</h2>
      <table>
        <thead>
          <tr><th>Rank</th><th>Name</th><th>Points</th></tr>
        </thead>
        <tbody>
          ${data.standings.slice(0, 10).map(player => `
            <tr>
              <td>${player.rank}</td>
              <td>${player.name}</td>
              <td>${player.total_points}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  });
</script>
```

### Squarespace

Add the JavaScript code to a Code Block and the HTML to a Markdown Block.

### Generic HTML Site

Copy the test file (`test-embed-tournament.html`) and customize as needed.

## Next Steps

1. Deploy to Heroku
2. Get your Heroku app URL
3. Test the endpoint
4. Integrate into your website
5. Share the endpoint URL with partners

## Support

For issues or questions:
- Check Heroku logs: `heroku logs --tail`
- Verify tournament IDs exist in the database
- Test CORS from browser console
- Check network tab for request details

