# Custom Rooms Implementation for 2PlayerChess

## Overview
This implementation allows you to create custom chess game rooms with predefined players, colors, and pairing information.

## Features

### 1. Automatic Room Creation
- When generating game links for a pairing, the system automatically creates a room in the 2PlayerChess server
- Each room is assigned a unique code based on tournament ID, pairing ID, and round
- Players are pre-assigned colors (white/black) based on their pairing

### 2. Player-Specific Game Links
Each player gets a personalized game link with:
- **Room code**: Unique identifier for their game
- **Player name**: Automatically filled from tournament data
- **Color assignment**: White or Black based on pairing
- **Authentication token**: Security verification
- **Time control**: Tournament-specific time settings

### 3. Auto-Join Functionality
When players click their link:
- Room automatically creates (if first player)
- Player automatically joins with correct color
- No need to manually enter room codes or names
- Game interface loads immediately

## Technical Implementation

### Backend API (`2PlayerChess-master/index.js`)

#### POST `/api/create-room`
Creates a custom room with predefined players.

**Request Body:**
```json
{
  "roomCode": "ABC123",
  "whitePlayer": "John Doe",
  "blackPlayer": "Jane Smith",
  "whitePlayerId": "user123",
  "blackPlayerId": "user456",
  "timeControl": "15+5"
}
```

**Response:**
```json
{
  "success": true,
  "roomCode": "ABC123",
  "message": "Room ABC123 created for John Doe (White) vs Jane Smith (Black)"
}
```

#### GET `/api/room/:roomCode`
Checks if a room exists and returns its information.

### Frontend Integration (`client/src/components/OnlineGameIntegration.tsx`)

The `generateGameUrls` function now:
1. Creates a unique room code
2. Calls the 2PlayerChess API to create the room
3. Generates player-specific URLs with all necessary parameters
4. Returns separate links for white and black players

### Auto-Join Logic (`2PlayerChess-master/views/chess.html`)

When the page loads, it:
1. Parses URL parameters (room, name, color, tc)
2. Hides the "Start Game" / "Join Game" buttons
3. Shows the game interface
4. Automatically emits a 'join' event with the room details
5. Sets the player's name and color

## URL Format

### Example Game Link
```
http://localhost:3000/chess.html?room=TOURNA-R12345-R1&name=John%20Doe&playerId=abc123&token=xyz789&color=white&tc=15+5
```

### Parameters
- `room`: Unique room identifier
- `name`: Player's name (URL encoded)
- `playerId`: Unique player identifier
- `token`: Security authentication token
- `color`: Either "white" or "black"
- `tc`: Time control in format "MINUTES+INCREMENT"

## Usage Flow

1. **Generate Games**: Tournament organizer clicks "Generate Games" in the pairing interface
2. **Room Creation**: System creates room in 2PlayerChess server with pairing details
3. **Link Distribution**: Separate links generated for white and black players
4. **Player Access**: Each player clicks their personalized link
5. **Auto-Join**: Player automatically joins room with correct color
6. **Game Starts**: When both players are present, game begins

## Benefits

- **No Manual Entry**: Players don't need to enter room codes
- **Color Enforcement**: Ensures correct color assignment based on pairing
- **Security**: Authentication tokens verify player identity
- **Seamless Experience**: Direct access to game without extra steps
- **Pairing Integration**: Fully integrated with tournament pairing system

## Error Handling

- If room creation fails, the system falls back to auto-creation when first player joins
- Invalid tokens are logged but don't prevent game access
- Network errors are handled gracefully with user notifications

## Future Enhancements

- Server-side token verification
- Link expiration after round ends
- QR code generation for mobile access
- Result auto-sync with tournament system
- Spectator mode for completed games
