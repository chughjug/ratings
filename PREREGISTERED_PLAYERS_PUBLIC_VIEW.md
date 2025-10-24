# Active Players List in Public Tournament View

## Overview

This feature adds a "Players" tab to the public tournament display, showing a list of all active players currently participating in the tournament.

## Changes Made

### 1. Backend Changes

#### File: `server/routes/tournaments.js`

**Endpoint**: `GET /api/tournaments/:id/public`

Added active players data to the public tournament endpoint response:

```javascript
// Get active players list
const activePlayersList = await new Promise((resolve, reject) => {
  db.all(
    `SELECT id, name, rating, section, uscf_id, status, created_at
     FROM players
     WHERE tournament_id = ? AND status = 'active'
     ORDER BY section, rating DESC NULLS LAST, name`,
    [id],
    (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    }
  );
});
```

**Response includes:**
- `id`: Player ID
- `name`: Player's name
- `rating`: Chess rating (typically USCF rating)
- `section`: Tournament section
- `uscf_id`: USCF ID if available
- `status`: Player status (always 'active' for this query)
- `created_at`: When player was added to tournament

### 2. Frontend Changes

#### File: `client/src/pages/PublicTournamentDisplay.tsx`

**Updated Interface:**
Added `activePlayersList` field to `PublicDisplayData` interface:

```typescript
interface PublicDisplayData {
  tournament: any;
  pairings: any[];
  standings: any[];
  currentRound: number;
  teamStandings?: any[];
  prizes?: any[];
  analytics?: any;
  activePlayersList?: any[];  // NEW
}
```

**Updated State:**
Added 'preregistered' to the activeTab type (reused for players display):

```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'pairings' | 'standings' | 'teams' | 'prizes' | 'analytics' | 'preregistered'>('overview');
```

**Added Tab Button:**
New tab button in the navigation showing count of active players:

```typescript
{data?.activePlayersList && data.activePlayersList.length > 0 && (
  <button
    onClick={() => setActiveTab('preregistered')}
    className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
      activeTab === 'preregistered'
        ? 'bg-gray-100 text-black'
        : 'text-gray-600 hover:text-black hover:bg-gray-50'
    }`}
  >
    Players ({data.activePlayersList.length})
  </button>
)}
```

**Added Tab Content:**
Comprehensive table display showing:
- **Name**: Player's name
- **USCF ID**: Chess rating organization ID
- **Rating**: Player's current rating
- **Section**: Tournament section they're registered in
- **Joined**: When the player was added to the tournament

## Features

### Conditional Display
- The "Players" tab only appears when there are active players in the tournament
- Tab shows count of players: `Players (X)`
- Automatically displays all active players

### Player Information
- **Name**: Clearly displayed as primary identifier
- **USCF ID**: Shows chess rating organization ID if available
- **Rating**: Player's chess rating (key information for tournament viewers)
- **Section**: Shows which section/bracket the player is in
- **Joined**: Registration date of when player was added to tournament

### Responsive Design
- Full-width table on desktop
- Horizontally scrollable on mobile devices
- Consistent styling with other tournament tabs

### Sorting
- Players sorted by section (alphabetically)
- Within each section, sorted by rating (highest first)
- Players without ratings listed last

## How It Works

1. **Data Fetch**: When a public tournament page loads, the API fetches all active players
2. **Display**: A "Players" tab appears in the tab navigation showing the player count
3. **User Interaction**: Users can click the "Players" tab to view the full participant list
4. **Details**: Each player's information is displayed in a clean table format

## Database Schema

Data is pulled from the `players` table with the following relevant columns:

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  name TEXT NOT NULL,
  uscf_id TEXT,
  rating INTEGER,
  section TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'bye', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
)
```

## API Response Format

The `/api/tournaments/:id/public` endpoint now returns:

```json
{
  "success": true,
  "data": {
    "tournament": { /* tournament details */ },
    "pairings": [ /* pairings data */ ],
    "standings": [ /* standings data */ ],
    "currentRound": 1,
    "activePlayersList": [
      {
        "id": "player-id-1",
        "name": "John Doe",
        "rating": 1800,
        "section": "Open",
        "uscf_id": "12345678",
        "status": "active",
        "created_at": "2025-10-24T10:00:00Z"
      },
      {
        "id": "player-id-2",
        "name": "Jane Smith",
        "rating": 1650,
        "section": "Open",
        "uscf_id": "87654321",
        "status": "active",
        "created_at": "2025-10-24T10:05:00Z"
      },
      ...
    ]
  }
}
```

## Public Tournament URL

Public tournaments can be viewed at:
- `/public/tournaments/:id` - Generic public tournament view
- `/public/organizations/:slug/tournaments/:tournamentId` - Organization-specific view

## Filter Criteria

Active players shown are those with:
- `status` = 'active'
- Sorted by section and rating
- Only includes current tournament participants

## Styling

- **Background Colors**: White table with alternating hover effects
- **Text Colors**: Dark gray for headers, black for content
- **Rating Display**: Centered, bold font for emphasis
- **Icons**: Users icon shown in empty state
- **Responsive**: Full overflow-x handling for mobile devices

## Future Enhancements

Potential improvements could include:
- Search/filter by player name
- Sort by different criteria (rating, section, join date)
- Export player list as CSV/PDF
- Player profile links
- Player performance statistics
- Filter by section
- Rating distribution chart

## Testing

To test this feature:

1. Create a tournament with several players and enable public view
2. Navigate to the public tournament view
3. Verify the "Players" tab appears with the correct count
4. Click the tab and verify all active players display correctly
5. Check that players are sorted by section then rating
6. Test responsive design on mobile devices
7. Verify ratings display correctly for players with/without ratings
