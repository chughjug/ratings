# Heroku Deployment for 2PlayerChess Integration

## Overview
This document explains how the 2PlayerChess integration works on Heroku and the architecture decisions.

## Architecture

### Production (Heroku)
- **Main App Server**: Runs on Heroku's `web` dyno (port 5000)
  - Serves the main tournament management application
  - Serves 2PlayerChess static files at `/2playerchess/*`
  - Hosts the 2PlayerChess room API endpoints

### Development (Local)
- **Main App Server**: Runs on port 5000
- **2PlayerChess Server**: Runs separately on port 8080
  - Handles Socket.io connections for real-time game communication
  - Uses native Socket.io server from 2PlayerChess-master

## Current Implementation

### File Serving
The main Express server serves 2PlayerChess files:
```javascript
// Serve 2PlayerChess static files
app.use('/2playerchess', express.static(path.join(__dirname, '../2PlayerChess-master/views')));

// Serve 2PlayerChess main HTML
app.get('/2playerchess/', (req, res) => {
  res.sendFile(path.join(__dirname, '../2PlayerChess-master/views/chess.html'));
});
```

### API Endpoints
Room management is handled through the main server:
- `POST /api/chess2player/create-room` - Create custom rooms
- `GET /api/chess2player/room/:roomCode` - Check room status

### Frontend Integration
The `chess.html` wrapper adapts based on environment:
- **Production**: Uses relative URLs to `/2playerchess/`
- **Development**: Points to `http://localhost:8080/` for Socket.io

## Important Notes

### Socket.io Compatibility
⚠️ **Current Limitation**: The 2PlayerChess application uses Socket.io for real-time communication. On Heroku, we need to ensure Socket.io works properly through the main Express server.

### Room Storage
- Rooms are stored in-memory in the main Express server
- TODO: Consider Redis for persistent room storage across dyno restarts

### Procfile Configuration
```
web: npm start
chess: cd 2PlayerChess-master && npm install && node index.js
```

The `chess` dyno starts the standalone 2PlayerChess server, but in production we should integrate Socket.io into the main server instead.

## Deployment Steps

1. **Ensure all 2PlayerChess files are committed**:
   ```bash
   git add 2PlayerChess-master/
   git add client/src/components/OnlineGameIntegration.tsx
   git add client/public/chess.html
   git add server/index.js
   git add server/routes/chess2player.js
   git commit -m "Add 2PlayerChess integration"
   ```

2. **Push to Heroku**:
   ```bash
   git push heroku main
   ```

3. **Verify deployment**:
   - Check that `/2playerchess/` serves the chess game
   - Test room creation via API
   - Verify Socket.io connections work

## Future Improvements

1. **Integrate Socket.io into main server**: Instead of running separate dynos, add Socket.io to the main Express server
2. **Use Redis for rooms**: Persist rooms across dyno restarts
3. **WebSocket support**: Ensure Heroku can handle WebSocket connections properly
4. **Add socket.io-client dependency**: Ensure the client can connect to Socket.io

## Troubleshooting

### Issue: Socket.io not connecting
- Check that WebSockets are enabled on Heroku
- Verify firewall rules allow WebSocket connections
- Check browser console for connection errors

### Issue: Rooms not persisting
- Rooms are stored in-memory and will be lost on dyno restart
- Consider implementing Redis for persistent storage

### Issue: CORS errors
- Ensure CORS is properly configured in the main server
- Check that Socket.io CORS settings are correct

## Testing Locally

1. Start main server: `npm run dev`
2. Start 2PlayerChess server: `cd 2PlayerChess-master && node index.js`
3. Visit `http://localhost:3000/chess.html?room=TEST&name=Player1&color=white`

## References

- [Socket.io Heroku Guide](https://socket.io/docs/v4/using-multiple-nodes/)
- [Heroku WebSocket Support](https://devcenter.heroku.com/articles/websockets)
