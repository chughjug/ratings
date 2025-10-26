# Embeddable Tournament API - Implementation Summary

## Overview

I've created a comprehensive embeddable API endpoint that allows anyone to fetch complete tournament data and reconstruct the public tournament page on any website. This endpoint provides all necessary data in a single API call.

## What Was Added

### New API Endpoint

**Location:** `server/routes/tournaments.js`

**Endpoint:** `GET /api/tournaments/:id/embed`

This endpoint returns comprehensive tournament data including:
- Complete tournament metadata
- All players with ratings and status
- All pairings from all rounds
- Pairings grouped by round for easy display
- Current standings with tiebreakers
- Round-by-round results for each player
- Prize information
- Organization branding (if applicable)
- Tournament statistics

### Files Created

1. **`EMBEDDABLE_TOURNAMENT_API.md`**
   - Complete API documentation
   - Response structure details
   - Usage examples in multiple languages
   - Complete HTML example
   - Error handling guide

2. **`EMBEDDABLE_API_QUICK_START.md`**
   - Quick start guide
   - Basic usage examples
   - React integration example
   - Testing instructions

3. **`test-embed-tournament.html`**
   - Fully functional demo page
   - Interactive tournament viewer
   - Beautiful UI for displaying tournament data
   - Can be used as-is or as a template

4. **`EMBEDDABLE_API_SUMMARY.md`** (this file)
   - Implementation summary

## Key Features

### Single API Call
Instead of making multiple requests for different data, the embed endpoint returns everything in one call:
- Tournament info
- Players
- All rounds of pairings
- Standings
- Prizes
- Organization branding

### Grouped Data
The response includes both flat arrays and grouped data for convenience:
- `pairings` - All pairings in chronological order
- `pairingsByRound` - Pairings organized by round number
- `standings` - Flat array of all standings
- `standingsBySection` - Standings grouped by section

### Organization Branding
If the tournament belongs to an organization, the response includes:
- Organization name, slug, website
- Logo URL
- Complete branding configuration (colors, layout, theme)
- This allows embedded displays to match the organization's branding

### Statistics
Quick tournament stats are included:
- Total players
- Active players
- Total games
- Completed games
- Average rating

## Usage Examples

### Basic JavaScript
```javascript
const response = await fetch('/api/tournaments/TOURNAMENT-ID/embed');
const data = await response.json();

console.log(data.tournament.name);
console.log(data.currentRound);
console.log(data.standings);
```

### React Component
```jsx
function TournamentWidget({ id }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch(`/api/tournaments/${id}/embed`)
      .then(res => res.json())
      .then(setData);
  }, [id]);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{data.tournament.name}</h1>
      {/* Render standings, pairings, etc. */}
    </div>
  );
}
```

### HTML Embed
```html
<div id="tournament-display"></div>

<script>
fetch('/api/tournaments/YOUR-TOURNAMENT-ID/embed')
  .then(res => res.json())
  .then(data => {
    document.getElementById('tournament-display').innerHTML = 
      `<h1>${data.tournament.name}</h1>
       <p>Round ${data.currentRound}</p>
       <p>${data.statistics.totalPlayers} players</p>`;
  });
</script>
```

## Testing

### Test the Endpoint

1. **Get a tournament ID:**
   ```bash
   # Or check your database
   # Example: Get the ID of any public tournament
   ```

2. **Call the API:**
   ```bash
   curl http://localhost:5000/api/tournaments/YOUR-ID/embed
   ```

3. **Or open in browser:**
   ```
   http://localhost:5000/api/tournaments/YOUR-ID/embed
   ```

### Use the Demo Page

1. Start the server:
   ```bash
   npm run dev
   ```

2. Open the test file:
   ```
   http://localhost:3000/test-embed-tournament.html
   ```

3. Enter a tournament ID and click "Load Tournament"

### Test HTML Format

Add `?format=html` to see a formatted HTML view:
```
http://localhost:5000/api/tournaments/YOUR-ID/embed?format=html
```

## Response Structure

The API returns data in this structure:

```json
{
  "success": true,
  "meta": {
    "generatedAt": "ISO timestamp",
    "tournamentId": "id",
    "format": "embed",
    "version": "1.0.0"
  },
  "tournament": { /* tournament details */ },
  "currentRound": 3,
  "players": [ /* all players */ ],
  "pairings": [ /* all pairings */ ],
  "pairingsByRound": {
    "1": [ /* round 1 pairings */ ],
    "2": [ /* round 2 pairings */ ]
  },
  "standings": [ /* all standings */ ],
  "standingsBySection": {
    "Open": [ /* open section standings */ ]
  },
  "prizes": [ /* prize information */ ],
  "organization": { /* org branding if applicable */ },
  "statistics": {
    "totalPlayers": 50,
    "activePlayers": 48,
    "totalGames": 200,
    "completedGames": 180,
    "averageRating": 1500
  }
}
```

## Benefits

### For End Users
✅ View tournament data on any website  
✅ Consistent branding across platforms  
✅ No need to visit multiple pages  
✅ Always up-to-date information  

### For Developers
✅ Single API call gets everything  
✅ Easy to integrate  
✅ No authentication required for public tournaments  
✅ Flexible data structure  
✅ Complete examples provided  

### For Organizations
✅ Display tournaments on your own website  
✅ Customize the display to match your brand  
✅ Embed in iframes or directly  
✅ Mobile-friendly data format  

## Integration Points

The embeddable API can be integrated with:

- ✅ External websites
- ✅ Mobile apps
- ✅ Partner organizations
- ✅ Social media embeds
- ✅ Custom widgets
- ✅ Live score displays
- ✅ News websites
- ✅ Tournament results pages

## Code Location

**Server Route:** `server/routes/tournaments.js` (lines 1614-1938)

**Test Files:**
- `test-embed-tournament.html` - Interactive demo
- `EMBEDDABLE_TOURNAMENT_API.md` - Full documentation
- `EMBEDDABLE_API_QUICK_START.md` - Quick start guide

## Next Steps

1. **Test the endpoint** with a real tournament ID
2. **Customize the test HTML** to match your design
3. **Integrate into your website** using the examples provided
4. **Share the endpoint** with partners who want to display your tournaments

## Technical Details

### Data Processing
- Pairings are fetched from all rounds
- Standings are calculated with full tiebreakers
- Results are joined with player information
- Organization branding is included if available
- All data is fresh on each request

### Performance
- Single database query per data type
- Efficient joins for player information
- Grouped data for easy display
- Fresh data ensures accuracy

### Error Handling
- 404 for tournament not found
- 500 for server errors
- Detailed error messages in development
- Graceful handling of missing data

## Conclusion

The embeddable tournament API provides a complete solution for displaying tournament data anywhere. It's easy to use, well-documented, and includes working examples for immediate integration.

