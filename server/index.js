const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
    },
  },
}));

// Rate limiting - more generous for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs (increased for development)
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : true
    : [
        'http://localhost:3000', 
        'http://localhost:5000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000'
      ],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
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

// Use routes
console.log('Setting up routes...');

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/registrations', registrationRoutes);

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
const db = require('./database');
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('DBF file maintenance enabled - files will be automatically generated when missing');
});
