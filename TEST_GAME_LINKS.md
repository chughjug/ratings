# Test Game Links

## Quick Test Links

### White Player Link
```
http://localhost:3000/chess.html?room=TESTROOM2024&name=Alice%20White&playerId=player-white-001&token=test-token-white&color=white&tc=10+0
```

### Black Player Link
```
http://localhost:3000/chess.html?room=TESTROOM2024&name=Bob%20Black&playerId=player-black-001&token=test-token-black&color=black&tc=10+0
```

## Parameters Breakdown

### Room Code
- Both players share: `TESTROOM2024`
- This ensures they join the same game

### Player Names
- White: `Alice White`
- Black: `Bob Black`

### Player IDs
- White: `player-white-001`
- Black: `player-black-001`

### Security Tokens
- White: `test-token-white`
- Black: `test-token-black`

### Color Assignment
- White player gets: `color=white`
- Black player gets: `color=black`

### Time Control
- Both players: `10+0` (10 minutes, no increment)

## Testing Instructions

1. **Open both links** in separate browser windows or tabs
2. **First player** (usually White) will see the game interface load
3. **Second player** joins and both see the board
4. The game is ready to play!

## Alternative Test Links with Different Time Controls

### 15+5 (15 minutes + 5 second increment)

**White:**
```
http://localhost:3000/chess.html?room=TEST-15PLUS5&name=Player%20One&playerId=p1&token=t1&color=white&tc=15+5
```

**Black:**
```
http://localhost:3000/chess.html?room=TEST-15PLUS5&name=Player%20Two&playerId=p2&token=t2&color=black&tc=15+5
```

### Blitz 3+0 (3 minutes, no increment)

**White:**
```
http://localhost:3000/chess.html?room=TEST-BLITZ&name=Speed%20White&playerId=sw&token=tw&color=white&tc=3+0
```

**Black:**
```
http://localhost:3000/chess.html?room=TEST-BLITZ&name=Speed%20Black&playerId=sb&token=tb&color=black&tc=3+0
```

### Rapid 20+2 (20 minutes + 2 second increment)

**White:**
```
http://localhost:3000/chess.html?room=TEST-RAPID&name=Rapid%20White&playerId=rw&token=rw&color=white&tc=20+2
```

**Black:**
```
http://localhost:3000/chess.html?room=TEST-RAPID&name=Rapid%20Black&playerId=rb&token=rb&color=black&tc=20+2
```

## Production URLs (Heroku)

When deployed to Heroku, replace `localhost:3000` with your Heroku app URL:

```
https://your-app-name.herokuapp.com/chess.html?room=TESTROOM&name=Player&playerId=123&token=abc&color=white&tc=10+0
```

## Custom Room Creation

To create a new custom room, use this format:
```
ROOM CODE: [Your choice, e.g., "MYGAME2024"]
WHITE PLAYER: [Name]
BLACK PLAYER: [Name]
TIME CONTROL: [Format: MINUTES+INCREMENT]
```

Then construct the URLs as shown above.

## Troubleshooting

- **Both players can't connect**: Make sure the 2PlayerChess server is running on port 8080
- **Wrong color showing**: Check the `color=` parameter (should be `white` or `black`)
- **Can't start game**: Ensure both players have clicked their respective links
- **Room not found**: Verify both players are using the exact same room code
