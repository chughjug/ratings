const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./database');
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

// Trust proxy for rate limiting behind reverse proxy (Heroku)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000", "ws://localhost:*", "http:", "https:"],
      frameSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

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
app.use(express.static(path.join(__dirname, '../client/build')));

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
const trfExportRoutes = require('./routes/trfExport');

// Use routes
console.log('Setting up routes...');

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/registrations', registrationRoutes);

// Registration form route
app.get('/register/:tournamentId', (req, res) => {
  const { tournamentId } = req.params;
  
  // Verify tournament exists
  db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
    if (err) {
      console.error('Error fetching tournament:', err);
      return res.status(500).send('Internal server error');
    }
    
    if (!tournament) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tournament Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; }
          </style>
        </head>
        <body>
          <h1 class="error">Tournament Not Found</h1>
          <p>The tournament you're looking for doesn't exist or has been removed.</p>
        </body>
        </html>
      `);
    }
    
    // Serve the registration form with tournament data
    const registrationFormPath = path.join(__dirname, '../registration-form-example.html');
    res.sendFile(registrationFormPath, (err) => {
      if (err) {
        console.error('Error serving registration form:', err);
        res.status(500).send('Error loading registration form');
      }
    });
  });
});

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
app.use('/api/export', trfExportRoutes);

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

// Enhanced server startup with better error handling
const server = app.listen(PORT, '0.0.0.0', () => {
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