# US Chess Player Search Integration

This document describes the new player search functionality that allows you to search for chess players on the US Chess website and import them directly into your tournaments.

## Features

- **Real-time Player Search**: Search for players by name on the US Chess website
- **Comprehensive Player Data**: Extract name, USCF ID, state, and all rating types
- **Seamless Integration**: Import search results directly into your tournament
- **Automatic Rating Lookup**: Automatically populate player ratings and expiration dates

## How It Works

### Backend (Server)

The player search functionality is implemented in `server/services/playerSearch.js` using Selenium WebDriver to:

1. Navigate to the US Chess player search page (`https://new.uschess.org/civicrm/player-search`)
2. Perform searches using the provided search terms
3. Extract player data from the results table with specific HTML selectors:
   - **Name**: From `<a>` tags in the first `<td>`
   - **Member ID**: From `<span>` elements in the second `<td>`
   - **State**: From `<span>` elements in the third `<td>`
   - **Ratings**: From `<span>` elements in the remaining `<td>` elements (regular, quick, blitz, online ratings)

### API Endpoints

Two new API endpoints have been added to `server/routes/players.js`:

#### 1. Search Players
```
GET /api/players/search?q={searchTerm}&limit={maxResults}
```

**Parameters:**
- `q` (required): Search term (player name)
- `limit` (optional): Maximum number of results (default: 10)

**Response:**
```json
{
  "players": [
    {
      "name": "Player Name",
      "memberId": "12345678",
      "state": "CA",
      "ratings": {
        "regular": 1800,
        "quick": 1750,
        "blitz": 1700,
        "online_regular": null,
        "online_quick": null,
        "online_blitz": null
      },
      "uscf_id": "12345678",
      "rating": 1800
    }
  ],
  "count": 1
}
```

#### 2. Get Player Details
```
GET /api/players/details/{uscfId}
```

**Parameters:**
- `uscfId` (required): USCF member ID

**Response:**
```json
{
  "uscf_id": "12345678",
  "name": "Player Name",
  "state": "CA",
  "ratings": {
    "regular": 1800,
    "quick": 1750,
    "blitz": 1700
  },
  "rating": 1800,
  "expiration_date": "2025-12-31"
}
```

### Frontend (Client)

The player search is integrated into the existing `AddPlayerModal` component:

1. **Search Button**: A "Search US Chess" button next to the player name field
2. **Search Modal**: A dedicated modal (`PlayerSearchModal`) for searching and selecting players
3. **Auto-population**: Selected players automatically populate the form fields

## Usage

### For Tournament Directors

1. **Open Add Player Modal**: Click "Add Player" in any tournament
2. **Search for Players**: Click "Search US Chess" next to the name field
3. **Enter Search Term**: Type at least 2 characters to start searching
4. **Select Player**: Click on a player from the search results
5. **Review Data**: The form will be automatically populated with:
   - Player name
   - USCF ID
   - Primary rating
6. **Add Player**: Click "Add Player" to import the player

### For Developers

#### Testing the Search Functionality

Run the test script to verify the search functionality:

```bash
node test_player_search.js
```

This will:
- Search for players with "Magnus" in their name
- Display the first 5 results
- Get detailed information for the first player found

#### Dependencies

Make sure to install the required dependencies:

```bash
npm install selenium-webdriver
```

#### Chrome WebDriver

The system uses Chrome WebDriver for web scraping. Make sure you have Chrome installed on your system. The WebDriver will be automatically managed by Selenium.

## Technical Details

### HTML Selectors Used

The scraper targets specific HTML elements on the US Chess website:

```javascript
// Main results table
'table.table.table-bordered tbody tr'

// Player name (first <td>)
'$(cells[0]).find("a")'

// Member ID (second <td>)
'$(cells[1]).find("span")'

// State (third <td>)
'$(cells[2]).find("span")'

// Ratings (remaining <td> elements)
'$(cells[i]).find("span")'
```

### Error Handling

- **Network Timeouts**: 10-15 second timeouts for page loads
- **Element Not Found**: Graceful handling of missing elements
- **Rate Limiting**: 2-second delays between requests to be respectful
- **User Agent**: Proper user agent headers to avoid blocking

### Performance Considerations

- **Headless Browsing**: Chrome runs in headless mode for better performance
- **Debounced Search**: Frontend waits 500ms after typing stops before searching
- **Result Limiting**: Default limit of 10 results to keep responses manageable
- **Connection Pooling**: WebDriver instances are properly closed after use

## Troubleshooting

### Common Issues

1. **No Results Found**
   - Check if the search term is at least 2 characters
   - Try different variations of the player name
   - Verify the US Chess website is accessible

2. **Search Timeout**
   - The US Chess website might be slow or temporarily unavailable
   - Check your internet connection
   - Try again in a few minutes

3. **Chrome WebDriver Issues**
   - Ensure Chrome is installed on your system
   - Check that Chrome is up to date
   - Verify Selenium WebDriver is properly installed

4. **Missing Player Data**
   - Some players might not have all rating types
   - State information might not be available for all players
   - Expiration dates are only available for detailed lookups

### Debug Mode

To enable debug logging, set the following environment variable:

```bash
DEBUG=playerSearch node server/index.js
```

## Future Enhancements

- **Bulk Import**: Import multiple players at once from search results
- **Advanced Filters**: Filter by rating range, state, or other criteria
- **Caching**: Cache search results to reduce API calls
- **Offline Mode**: Store frequently searched players locally
- **Rating History**: Track rating changes over time

## Security Considerations

- **Rate Limiting**: Built-in delays to avoid overwhelming the US Chess website
- **User Agent**: Proper identification to avoid being blocked
- **Error Handling**: Graceful failure without exposing sensitive information
- **Input Validation**: All search terms are validated and sanitized

## License

This functionality is part of the Chess Tournament Director system and follows the same MIT license.

