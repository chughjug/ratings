# Embeddable Tournament API

## Overview

The Tournament Embeddable API provides complete tournament data in a format that allows external websites to reconstruct and display the full public tournament page. This endpoint returns all necessary data including tournament information, all rounds of pairings, standings, prizes, and organization branding.

## Endpoint

```
GET /api/tournaments/:id/embed
```

## Query Parameters

- `format` (optional): Response format
  - `json` (default): Returns JSON data
  - `html`: Returns an HTML view with formatted JSON

## Response Format

The API returns a comprehensive JSON object containing:

### Metadata
- `success`: Boolean indicating success
- `meta`: Object with generation timestamp, tournament ID, format, and version
- `generatedAt`: ISO timestamp of when the data was generated

### Tournament Data

```json
{
  "tournament": {
    "id": "tournament-id",
    "name": "Tournament Name",
    "format": "swiss",
    "rounds": 5,
    "time_control": "G/90",
    "start_date": "2024-01-01",
    "end_date": "2024-01-03",
    "status": "active",
    "city": "City",
    "state": "State",
    "location": "Location Name",
    "chief_td_name": "TD Name",
    "chief_td_uscf_id": "12345678",
    "website": "https://example.com",
    "fide_rated": false,
    "uscf_rated": true,
    "allow_registration": true,
    "is_public": true,
    "public_url": "/public/tournament-id",
    "logo_url": "https://example.com/logo.png",
    "tournament_information": "Tournament description...",
    "settings": {
      "tie_break_criteria": ["buchholz", "sonnebornBerger"],
      "sections": []
    }
  }
}
```

### Players Data

Complete list of all players with their information:

```json
{
  "players": [
    {
      "id": "player-id",
      "name": "Player Name",
      "rating": 1500,
      "uscf_id": "12345678",
      "fide_id": "12345678",
      "section": "Open",
      "status": "active",
      "notes": ""
    }
  ]
}
```

### Pairings Data

All pairings from all rounds:

```json
{
  "pairings": [
    {
      "id": "pairing-id",
      "tournament_id": "tournament-id",
      "round": 1,
      "board": 1,
      "white_player_id": "player-1-id",
      "black_player_id": "player-2-id",
      "result": "1-0",
      "section": "Open",
      "white_name": "Player 1",
      "white_rating": 1600,
      "white_uscf_id": "12345678",
      "black_name": "Player 2",
      "black_rating": 1500,
      "black_uscf_id": "87654321"
    }
  ]
}
```

### Pairings By Round

Pairings grouped by round for easy access:

```json
{
  "pairingsByRound": {
    "1": [/* pairings for round 1 */],
    "2": [/* pairings for round 2 */],
    "3": [/* pairings for round 3 */]
  }
}
```

### Standings Data

Standings with tiebreakers and round-by-round results:

```json
{
  "standings": [
    {
      "id": "player-id",
      "name": "Player Name",
      "rating": 1500,
      "section": "Open",
      "uscf_id": "12345678",
      "total_points": 3.5,
      "games_played": 4,
      "wins": 3,
      "losses": 1,
      "draws": 1,
      "rank": 1,
      "tiebreakers": {
        "buchholz": 8.5,
        "sonnebornBerger": 4.25,
        "performanceRating": 1600,
        "modifiedBuchholz": 9.5,
        "cumulative": 3.5
      },
      "roundResults": {
        "1": {
          "result": "1-0",
          "opponent_name": "Opponent",
          "opponent_rating": 1400,
          "points": 1,
          "color": "white",
          "board": 1
        }
      }
    }
  ],
  "standingsBySection": {
    "Open": [/* standings for Open section */],
    "U1600": [/* standings for U1600 section */]
  }
}
```

### Prizes Data

Tournament prize information:

```json
{
  "prizes": [
    {
      "id": "prize-id",
      "tournament_id": "tournament-id",
      "name": "1st Place",
      "type": "cash",
      "position": 1,
      "rating_category": "",
      "section": "Open",
      "amount": 100,
      "description": "First place prize",
      "conditions": []
    }
  ]
}
```

### Organization Data

If the tournament belongs to an organization, branding and settings are included:

```json
{
  "organization": {
    "id": "org-id",
    "name": "Organization Name",
    "slug": "organization-slug",
    "website": "https://example.com",
    "logoUrl": "https://example.com/logo.png",
    "branding": {
      "theme": {
        "primaryColor": "#1a1a1a",
        "secondaryColor": "#333333",
        "backgroundColor": "#ffffff"
      },
      "layout": {
        "headerStyle": "default",
        "cardStyle": "modern"
      }
    }
  }
}
```

### Statistics

Quick tournament statistics:

```json
{
  "statistics": {
    "totalPlayers": 50,
    "activePlayers": 48,
    "totalGames": 200,
    "completedGames": 180,
    "averageRating": 1500
  }
}
```

## Usage Examples

### Basic Usage

```javascript
// Fetch tournament data
const response = await fetch('/api/tournaments/TOURNAMENT-ID/embed');
const data = await response.json();

console.log(data.tournament.name); // Tournament name
console.log(data.currentRound); // Current round number
console.log(data.standings); // All standings
```

### Using with React

```jsx
import React, { useState, useEffect } from 'react';

function TournamentEmbed({ tournamentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/embed`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [tournamentId]);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Tournament not found</div>;

  return (
    <div>
      <h1>{data.tournament.name}</h1>
      <p>Round {data.currentRound} of {data.tournament.rounds}</p>
      <p>Total Players: {data.statistics.totalPlayers}</p>
      
      {/* Render standings */}
      <div>
        {data.standings.map(player => (
          <div key={player.id}>
            {player.rank}. {player.name} - {player.total_points} points
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Displaying Round Pairings

```javascript
function displayRoundPairings(data, round) {
  const pairings = data.pairingsByRound[round] || [];
  
  return pairings.map(pairing => (
    <div key={pairing.id}>
      Board {pairing.board}: {pairing.white_name} vs {pairing.black_name}
      {pairing.result && <span> ({pairing.result})</span>}
    </div>
  ));
}
```

### Using Organization Branding

```javascript
function applyOrganizationBranding(data) {
  if (!data.organization) return;
  
  const branding = data.organization.branding;
  if (!branding) return;
  
  // Apply theme colors
  if (branding.theme) {
    document.documentElement.style.setProperty('--primary-color', branding.theme.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', branding.theme.secondaryColor);
  }
  
  // Apply logo
  if (data.organization.logoUrl) {
    const logo = document.createElement('img');
    logo.src = data.organization.logoUrl;
    document.body.insertBefore(logo, document.body.firstChild);
  }
}
```

## Complete Example

Here's a complete HTML example that uses the embeddable API:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tournament Embed</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .tournament-header {
      background: #1a1a1a;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .round-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .round-tab {
      padding: 10px 20px;
      background: #f0f0f0;
      border: none;
      cursor: pointer;
      border-radius: 4px;
    }
    .round-tab.active {
      background: #1a1a1a;
      color: white;
    }
    .pairings-table {
      width: 100%;
      border-collapse: collapse;
    }
    .pairings-table th,
    .pairings-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .standings-table {
      width: 100%;
      border-collapse: collapse;
    }
    .standings-table th,
    .standings-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .standings-table th {
      background: #f0f0f0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="tournament-header">
    <h1 id="tournament-name">Loading...</h1>
    <p id="tournament-info">Loading tournament information...</p>
  </div>

  <div class="round-tabs" id="round-tabs"></div>

  <div id="pairings-container"></div>

  <h2>Current Standings</h2>
  <div id="standings-container"></div>

  <script>
    const TOURNAMENT_ID = 'YOUR-TOURNAMENT-ID-HERE';
    let tournamentData = null;

    async function fetchTournamentData() {
      try {
        const response = await fetch(`/api/tournaments/${TOURNAMENT_ID}/embed`);
        tournamentData = await response.json();

        if (!tournamentData.success) {
          throw new Error(tournamentData.error);
        }

        renderTournament(tournamentData);
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        document.body.innerHTML = `<div style="color: red;">Error loading tournament: ${error.message}</div>`;
      }
    }

    function renderTournament(data) {
      // Render header
      document.getElementById('tournament-name').textContent = data.tournament.name;
      document.getElementById('tournament-info').textContent = 
        `Round ${data.currentRound} of ${data.tournament.rounds} | ${data.statistics.totalPlayers} Players | ${data.statistics.completedGames}/${data.statistics.totalGames} Games Completed`;

      // Render round tabs
      renderRoundTabs(data);
      
      // Render current round pairings
      renderPairings(data, data.currentRound);
      
      // Render standings
      renderStandings(data);
    }

    function renderRoundTabs(data) {
      const container = document.getElementById('round-tabs');
      container.innerHTML = '';

      for (let round = 1; round <= data.tournament.rounds; round++) {
        const tab = document.createElement('button');
        tab.className = 'round-tab';
        tab.textContent = `Round ${round}`;
        if (round === data.currentRound) {
          tab.classList.add('active');
        }
        tab.onclick = () => {
          document.querySelectorAll('.round-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          renderPairings(data, round);
        };
        container.appendChild(tab);
      }
    }

    function renderPairings(data, round) {
      const pairings = data.pairingsByRound[round] || [];
      const container = document.getElementById('pairings-container');
      
      if (pairings.length === 0) {
        container.innerHTML = '<p>No pairings for this round yet.</p>';
        return;
      }

      let html = `<h2>Round ${round} Pairings</h2>
        <table class="pairings-table">
          <thead>
            <tr>
              <th>Board</th>
              <th>White</th>
              <th>Rating</th>
              <th>VS</th>
              <th>Black</th>
              <th>Rating</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>`;

      pairings.forEach(p => {
        html += `
          <tr>
            <td>${p.board}</td>
            <td>${p.white_name}</td>
            <td>${p.white_rating || 'Unrated'}</td>
            <td>vs</td>
            <td>${p.black_name}</td>
            <td>${p.black_rating || 'Unrated'}</td>
            <td>${p.result || 'TBD'}</td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    }

    function renderStandings(data) {
      const standings = data.standings;
      const container = document.getElementById('standings-container');
      
      let html = `
        <table class="standings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Rating</th>
              <th>Points</th>
              <th>Wins</th>
              <th>Draws</th>
              <th>Losses</th>
            </tr>
          </thead>
          <tbody>
      `;

      standings.forEach(player => {
        html += `
          <tr>
            <td>${player.rank}</td>
            <td>${player.name}</td>
            <td>${player.rating || 'Unrated'}</td>
            <td><strong>${player.total_points}</strong></td>
            <td>${player.wins}</td>
            <td>${player.draws}</td>
            <td>${player.losses}</td>
          </tr>
        `;
      });

      html += '</tbody></table>';
      container.innerHTML = html;
    }

    // Initialize
    fetchTournamentData();
  </script>
</body>
</html>
```

## Error Handling

The API returns error responses in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (in development mode)"
}
```

Common HTTP status codes:
- `200`: Success
- `404`: Tournament not found
- `500`: Server error

## Notes

- The API returns all data in a single request to minimize API calls
- Data includes all rounds of pairings and complete standings
- Organization branding is included if the tournament belongs to an organization
- The endpoint supports both JSON and HTML formats
- Data is regenerated on each request and includes a timestamp

