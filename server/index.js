const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Increase max listeners to prevent memory leak warning
process.setMaxListeners(20);

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Trust proxy for rate limiting behind reverse proxy (Heroku)
app.set('trust proxy', 1);

// Security middleware - Configure helmet to allow iframe embedding
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://www.paypal.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.paypal.com", "https://js.stripe.com", "https://www.paypalobjects.com", "https://code.jquery.com"],
      imgSrc: ["'self'", "data:", "https:", "https://www.paypal.com", "https://www.paypalobjects.com"],
      connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000", "ws://localhost:*", "http:", "https:", "ws:", "wss:", "https://api-m.sandbox.paypal.com", "https://api-m.paypal.com"],
      frameSrc: ["'self'", "https://www.paypal.com", "https://js.stripe.com", "https://hooks.stripe.com", "https://www.paypalobjects.com"],
      frameAncestors: ["*"], // Allow embedding in iframes from any origin
      fontSrc: ["'self'", "data:", "https:", "https://www.paypal.com"],
      childSrc: ["'self'", "https://www.paypal.com"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  xFrameOptions: false, // Explicitly disable X-Frame-Options to allow iframe embedding
  originAgentCluster: false,
}));

// Add custom header middleware AFTER helmet to ensure iframe headers are set correctly
app.use((req, res, next) => {
  // Explicitly set CSP frame-ancestors to allow all origins
  const csp = res.getHeader('Content-Security-Policy');
  if (csp && typeof csp === 'string') {
    // Remove existing frame-ancestors directive (with or without semicolon)
    let updatedCsp = csp.replace(/frame-ancestors[^;]*;?\s*/g, '');
    // Clean up any double semicolons that might result
    updatedCsp = updatedCsp.replace(/;\s*;/g, ';');
    // Trim trailing semicolons/spaces and add frame-ancestors
    updatedCsp = updatedCsp.replace(/;\s*$/, '');
    // Add frame-ancestors directive with proper semicolon
    res.setHeader('Content-Security-Policy', updatedCsp + (updatedCsp.endsWith(';') ? '' : '; ') + 'frame-ancestors *');
  }
  // Ensure X-Frame-Options is not set (it might interfere)
  res.removeHeader('X-Frame-Options');
  next();
});

// Rate limiting - more generous for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs (increased for development)
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
});

// Middleware - Enhanced CORS for Heroku deployment
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, allow the Heroku app domain and any subdomains
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [
        process.env.CORS_ORIGIN,
        `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`,
        `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/`,
        'https://*.herokuapp.com',
        // Add common production domains
        'https://chess-tournament-director.herokuapp.com',
        'https://chess-tournament-director.herokuapp.com/'
      ].filter(Boolean);
      
      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace('*', '.*');
          return new RegExp(pattern).test(origin);
        }
        return origin === allowed;
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
    }
    
    // In development, allow localhost origins
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      const allowedDevOrigins = [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000'
      ];
      
      if (allowedDevOrigins.includes(origin)) {
        return callback(null, true);
      }
    }
    
    // For all other cases, allow the request (permissive for Heroku)
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin', 
    'Cache-Control', 
    'Pragma', 
    'Expires',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 hours
}));

// Add request timeout handling
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({
      success: false,
      error: 'Request timeout'
    });
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files with cache control
app.use(express.static(path.join(__dirname, '../client/build'), {
  maxAge: 0, // Don't cache HTML, CSS, JS to ensure latest version
  etag: true,
  lastModified: true,
  // Add Cache-Control headers
  setHeaders: (res, filePath) => {
    // For service worker, always prevent caching
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // For index.html, prevent aggressive caching
    else if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // For static assets, allow short-term caching
    else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    }
  }
}));

// Serve 2PlayerChess static files (at /chess)
app.use('/chess', express.static(path.join(__dirname, '../2PlayerChess-master/views')));

// Serve 2PlayerChess main HTML
app.get('/chess', (req, res) => {
  res.sendFile(path.join(__dirname, '../2PlayerChess-master/views/chess.html'));
});

// Serve 2PlayerChess chess.html directly (for game links)
app.get('/chess/chess.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../2PlayerChess-master/views/chess.html'));
});

// Also serve at legacy /2playerchess path for backwards compatibility
app.use('/2playerchess', express.static(path.join(__dirname, '../2PlayerChess-master/views')));
app.get('/2playerchess/', (req, res) => {
  res.sendFile(path.join(__dirname, '../2PlayerChess-master/views/chess.html'));
});
app.get('/2playerchess/chess.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../2PlayerChess-master/views/chess.html'));
});

// Note: chess2playerRoutes is already imported above with other routes

// Serve the Lichess OAuth demo page
app.get('/lichess-demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/test-lichess-oauth-demo.html'));
});

// Serve documentation files
app.use('/docs', express.static(path.join(__dirname, './public/docs')));

// Serve the complete google-apps-script.js file
app.get('/google-apps-script.js', (req, res) => {
  const scriptPath = path.join(__dirname, '../google-apps-script.js');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(scriptPath, (err) => {
    if (err) {
      console.error('Error serving google-apps-script.js:', err);
      res.status(404).json({
        success: false,
        error: 'Google Apps Script file not found'
      });
    }
  });
});

// Serve markdown files from root directory
app.get('/:filename.md', (req, res) => {
  const { filename } = req.params;
  // Sanitize filename to prevent directory traversal
  const sanitizedFilename = filename.replace(/\.\./g, '').replace(/\//g, '');
  const filePath = path.join(__dirname, '../', `${sanitizedFilename}.md`);
  
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        error: `Markdown file not found: ${filename}`
      });
    }
  });
});

// Documentation route that serves markdown files as plain text
app.get('/api/docs/:filename', (req, res) => {
  const { filename } = req.params;
  // Sanitize filename to prevent directory traversal
  const sanitizedFilename = filename.replace(/\.\./g, '').replace(/\//g, '');
  const filePath = path.join(__dirname, './public/docs', `${sanitizedFilename}.md`);
  
  res.sendFile(filePath, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } }, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        error: `Documentation file not found: ${filename}`
      });
    }
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const organizationRoutes = require('./routes/organizations');
const tournamentRoutes = require('./routes/tournaments');
const playerRoutes = require('./routes/players');
const pairingRoutes = require('./routes/pairings');
const exportRoutes = require('./routes/export');
const templateRoutes = require('./routes/templates');
const backupRoutes = require('./routes/backup');
const teamRoutes = require('./routes/teams');
const analyticsRoutes = require('./routes/analytics');
const registrationRoutes = require('./routes/registrations');
const enhancedFeaturesRoutes = require('./routes/enhancedFeatures');
const pairingEditorRoutes = require('./routes/pairingEditor');
const googleImportRoutes = require('./routes/googleImport');
const smsRoutes = require('./routes/sms');
const qrCodeRoutes = require('./routes/qrCodes');
const playerProfileRoutes = require('./routes/playerProfiles');
const liveStandingsRoutes = require('./routes/liveStandings');
const liveStandingsService = require('./services/liveStandingsService');
const paymentRoutes = require('./routes/payments');
const chessIntegrationRoutes = require('./routes/chessIntegrations');
const lichessRoutes = require('./routes/lichess');
const chess2playerRoutes = require('./routes/chess2player');
const trfExportRoutes = require('./routes/trfExport');
const uscfExportRoutes = require('./routes/uscfExport');
const customPagesRoutes = require('./routes/customPages');
const clubMembersRoutes = require('./routes/clubMembers');
const clubFeaturesRoutes = require('./routes/clubFeatures');
const chessGamesRoutes = require('./routes/chessGames');

// Use routes
console.log('Setting up routes...');

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/registrations', registrationRoutes);

// Registration form route - moved to React Router
// The /register/:tournamentId route is now handled by React Router in App.tsx
// This allows the Registration component to use RegistrationFormWithPayment with payment and custom form support

// All routes are now public (authentication disabled)
app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/pairings', pairingRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/enhanced', enhancedFeaturesRoutes);
app.use('/api/pairing-editor', pairingEditorRoutes);
app.use('/api/google-import', googleImportRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/qr-codes', qrCodeRoutes);
app.use('/api/player-profiles', playerProfileRoutes);
app.use('/api/live-standings', liveStandingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chess', chessIntegrationRoutes);
app.use('/api/lichess', lichessRoutes);
app.use('/api/chess2player', chess2playerRoutes);
app.use('/api/export', trfExportRoutes);
app.use('/api/export', uscfExportRoutes);
app.use('/api/custom-pages', customPagesRoutes);
app.use('/api/club-members', clubMembersRoutes);
app.use('/api/club-features', clubFeaturesRoutes);
app.use('/api/club-email', clubFeaturesRoutes); // Email tracking endpoints
app.use('/api/games', chessGamesRoutes);

console.log('Routes set up successfully');

// Serve React app for non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Handle different types of errors
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorMessage = 'Service temporarily unavailable';
  } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
    statusCode = 408;
    errorMessage = 'Request timeout';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Invalid request data';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorMessage = 'Unauthorized';
  }
  
  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Background maintenance to ensure DBF files are always ready
const { exportTournamentDBF } = require('./services/dbfExport');
const fs = require('fs').promises;

async function ensureDBFFilesReady() {
  try {
    // Get all active tournaments
    const tournaments = await new Promise((resolve, reject) => {
      db.all('SELECT id, name FROM tournaments WHERE status = "active"', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const tournament of tournaments) {
      const exportPath = path.join(__dirname, 'exports', tournament.id);
      
      // Check if all DBF files exist
      const files = ['THEXPORT.DBF', 'TSEXPORT.DBF', 'TDEXPORT.DBF'];
      let needsExport = false;

      for (const file of files) {
        try {
          await fs.access(path.join(exportPath, file));
        } catch (error) {
          needsExport = true;
          break;
        }
      }

      // If any files are missing, generate them
      if (needsExport) {
        console.log(`Ensuring DBF files are ready for tournament: ${tournament.name}`);
        try {
          await fs.mkdir(exportPath, { recursive: true });
          await exportTournamentDBF(db, tournament.id, exportPath);
          console.log(`✓ DBF files ready for tournament: ${tournament.name}`);
        } catch (error) {
          console.error(`Failed to generate DBF files for tournament ${tournament.name}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in DBF maintenance:', error);
  }
}

// Run maintenance on startup and every 5 minutes
ensureDBFFilesReady();
setInterval(ensureDBFFilesReady, 5 * 60 * 1000); // 5 minutes

// Initialize Socket.io for 2PlayerChess
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 2PlayerChess game state (shared with routes)
const chessRoomsService = require('./services/chessRooms');
let userCount = 0;

// Initialize Socket.io event handlers for 2PlayerChess
io.on('connection', (socket) => {
  let moveCt = 0;
  socket.emit("this-user", socket.id);
  console.log("2PlayerChess socket.id:", socket.id);
  let gameRoomId;
  userCount++;
  console.log("2PlayerChess users:", userCount);

  socket.on('disconnect', () => {
    userCount--;
    console.log("2PlayerChess users:", userCount);
  });

  socket.on('newroom', (name) => {
    let newRoom = Math.random().toString(36).substr(2, 10).toUpperCase();
    chessRoomsService.setRoom(newRoom, { first: name, firstID: socket.id });
    gameRoomId = newRoom;
    socket.room = gameRoomId;
    socket.name = name;
    socket.join(newRoom, () => {
      console.log(`${socket.name} has joined ${newRoom}!`);
    });
    io.in(gameRoomId).emit('username', name);
    io.in(gameRoomId).emit('newroom', newRoom);
  });

  socket.on('get-current-time', (minsB, minsW, secsB, secsW, zeroB, zeroW) => {
    const room = chessRoomsService.getRoom(gameRoomId);
    if (room) {
      room.time = {
        minsB: minsB,
        minsW: minsW,
        secsB: secsB,
        secsW: secsW,
        zeroB: zeroB,
        zeroW: zeroW
      };
      chessRoomsService.setRoom(gameRoomId, room);
      const updatedRoom = chessRoomsService.getRoom(gameRoomId);
      console.log(updatedRoom.time);
      const time = room.time;
      io.in(gameRoomId).emit("get-current-time",
        time.minsB,
        time.minsW,
        time.secsB,
        time.secsW,
        time.zeroB,
        time.zeroW
      );
    }
  });

  socket.on("game-options", (radioVal, plus5Val, colorVal, rematch, id) => {
    const room = chessRoomsService.getRoom(gameRoomId);
    if (radioVal && room) {
      room.options = {
        playerOneIsWhite: colorVal,
        timeControls: radioVal,
        plus5secs: plus5Val
      };
      room.options.playerOneIsWhite;
      room.options.timeControls;
      room.options.plus5secs;
      chessRoomsService.setRoom(gameRoomId, room);

      io.in(gameRoomId).emit("game-options",
        room.options.timeControls,
        room.options.plus5secs,
        room.options.playerOneIsWhite,
        room.firstID,
        rematch,
        id
      );
      console.log(room);
    }
  });

  socket.on('validate', val => {
    let roomsKeys = Object.keys(chessRoomsService.getRooms());
    let valIsTrue = roomsKeys.some((room) => {
      return room == val;
    });
    socket.emit("validate", valIsTrue);
  });

  socket.on("checkmate", () => {
    io.in(gameRoomId).emit("checkmate");
  });

  socket.on("drawn-game", () => {
    io.in(gameRoomId).emit("drawn-game");
  });

  socket.on("send-current-position", (moveObj, moveCount) => {
    const room = chessRoomsService.getRoom(gameRoomId);
    if (room) {
      room.moveObj = moveObj;
      room.moveCount = moveCount;
      chessRoomsService.setRoom(gameRoomId, room);
      console.log(room.moveObj, room.moveCount);
    }
  });

  socket.on('join', (room, user, restart, moveCtClient, rematch) => {
    let user1 = "";
    let opponent = "";
    let rejoin = false;
    if (!restart) {
      moveCt = moveCtClient;
      console.log(moveCt);
      const existingRoom = chessRoomsService.getRoom(room);
      if (existingRoom && existingRoom.firstID != "") {
        existingRoom.second = user;
        existingRoom.secondID = socket.id;
        chessRoomsService.setRoom(room, existingRoom);
        socket.emit('this-user', existingRoom.secondID);
        user1 = user;
        opponent = existingRoom.first;
      } else {
        if (!existingRoom) {
          chessRoomsService.setRoom(room, {});
        }
        const newRoom = chessRoomsService.getRoom(room);
        newRoom.first = user;
        newRoom.firstID = socket.id;
        chessRoomsService.setRoom(room, newRoom);
        user1 = user;
        socket.emit('this-user', newRoom.firstID);
        opponent = newRoom.second || '';
        rejoin = true;
      }

      socket.name = user;
      socket.room = room;
      gameRoomId = room;
      socket.join(room, () => {
        console.log(`${socket.name} has joined ${room}!`);
      });
    }

    const currentRoom = chessRoomsService.getRoom(gameRoomId);
    if (io.sockets.adapter.rooms.get(gameRoomId) && io.sockets.adapter.rooms.get(gameRoomId).size == 2 && currentRoom) {
      io.in(gameRoomId).emit('username2',
        user1,
        opponent,
        room,
        false,
        rejoin,
        currentRoom.moveObj,
        currentRoom.moveCount.toString()
      );
    }
  });

  socket.on('chat-msg', (msg) => {
    io.in(gameRoomId).emit('chat-msg', msg, socket.name);
  });

  socket.on('offer-draw', () => {
    socket.to(gameRoomId).emit('offer-draw');
  });

  socket.on("decline-draw", () => {
    socket.to(gameRoomId).emit("decline-draw");
  });

  socket.on('move', (piece, pos, color, simulation, atk, server, move, pawnPromote) => {
    moveCt++;
    socket.to(gameRoomId).emit('move', piece, pos, color, simulation, atk, true, move, pawnPromote);
  });

  socket.on('resign', () => {
    console.log("RESIGNED");
    socket.to(gameRoomId).emit('resign');
  });

  socket.on("disable-chat", () => {
    socket.to(gameRoomId).emit("disable-chat");
  });

  socket.on("enable-chat", () => {
    socket.to(gameRoomId).emit("enable-chat");
  });

  socket.on('request-rematch', (thisUserID) => {
    socket.to(gameRoomId).emit('request-rematch', thisUserID);
  });

  socket.on('rematch-response', (val, id) => {
    socket.to(gameRoomId).emit("rematch-response", val, id);
  });

  // GAME FUNCTIONS
  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnected!`);

    if (io.sockets.adapter.rooms.get(gameRoomId) == undefined || io.sockets.adapter.rooms.get(gameRoomId).size === 0) {
      chessRoomsService.deleteRoom(gameRoomId);
      console.log(chessRoomsService.getRooms());
    } else {
      const room = chessRoomsService.getRoom(gameRoomId);
      let firstPlayerGone = Boolean(room && room.firstID == socket.id);
      if (firstPlayerGone && room) {
        room.firstID = "";
        room.first = "";
        chessRoomsService.setRoom(gameRoomId, room);
      }
      socket.to(gameRoomId).emit("p-disconnected", socket.name, firstPlayerGone);
    }
  });
});

console.log('⚡ 2PlayerChess Socket.io initialized');

// Enhanced server startup with better error handling
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'not set'}`);
  console.log(`📊 DBF file maintenance enabled - files will be automatically generated when missing`);
  
  // Initialize Live Standings WebSocket service
  liveStandingsService.initialize(server);
  console.log(`⚡ Live Standings WebSocket service initialized`);
  
  // Log server info for debugging
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Production server ready at: https://${process.env.HEROKU_APP_NAME || 'your-app'}.herokuapp.com`);
  } else {
    console.log(`🔧 Development server ready at: http://localhost:${PORT}`);
  }
});

// Enhanced error handling for server
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});