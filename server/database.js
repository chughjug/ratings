const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'chess_tournaments.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Handle database errors
db.on('error', (err) => {
  console.error('Database error:', err);
});

// Ensure database is properly closed on process exit
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

// Initialize database tables
db.serialize(() => {
  // Tournaments table
  db.run(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      format TEXT NOT NULL,
      rounds INTEGER NOT NULL,
      time_control TEXT,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'created',
      settings TEXT,
      city TEXT,
      state TEXT,
      location TEXT,
      chief_td_name TEXT,
      chief_td_uscf_id TEXT,
      chief_arbiter_name TEXT,
      chief_arbiter_fide_id TEXT,
      chief_organizer_name TEXT,
      chief_organizer_fide_id TEXT,
      expected_players INTEGER,
      website TEXT,
      fide_rated BOOLEAN DEFAULT 0,
      uscf_rated BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Players table
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      name TEXT NOT NULL,
      uscf_id TEXT,
      fide_id TEXT,
      rating INTEGER,
      section TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'bye', 'inactive')),
      expiration_date TEXT,
      intentional_bye_rounds TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);

  // Add expiration_date column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE players ADD COLUMN expiration_date TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add intentional_bye_rounds column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE players ADD COLUMN intentional_bye_rounds TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add notes column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE players ADD COLUMN notes TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add US Chess specific columns to tournaments table (for existing databases)
  const usChessColumns = [
    'city TEXT',
    'state TEXT', 
    'location TEXT',
    'chief_td_name TEXT',
    'chief_td_uscf_id TEXT',
    'chief_arbiter_name TEXT',
    'chief_arbiter_fide_id TEXT',
    'chief_organizer_name TEXT',
    'chief_organizer_fide_id TEXT',
    'expected_players INTEGER',
    'website TEXT',
    'fide_rated BOOLEAN DEFAULT 0',
    'uscf_rated BOOLEAN DEFAULT 1'
  ];

  usChessColumns.forEach(column => {
    db.run(`ALTER TABLE tournaments ADD COLUMN ${column}`, (err) => {
      // Ignore error if column already exists
    });
  });

  // Pairings table
  db.run(`
    CREATE TABLE IF NOT EXISTS pairings (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      round INTEGER NOT NULL,
      board INTEGER NOT NULL,
      white_player_id TEXT,
      black_player_id TEXT,
      result TEXT,
      section TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (white_player_id) REFERENCES players (id),
      FOREIGN KEY (black_player_id) REFERENCES players (id)
    )
  `);

  // Add section column to pairings table if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE pairings ADD COLUMN section TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add color column to pairings table if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE pairings ADD COLUMN color TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Results table
  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      player_id TEXT,
      round INTEGER NOT NULL,
      opponent_id TEXT,
      color TEXT,
      result TEXT,
      points REAL DEFAULT 0,
      pairing_id TEXT,
      board INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (player_id) REFERENCES players (id),
      FOREIGN KEY (opponent_id) REFERENCES players (id),
      FOREIGN KEY (pairing_id) REFERENCES pairings (id)
    )
  `);

  // Add pairing_id and board columns to results table if they don't exist (for existing databases)
  db.run(`
    ALTER TABLE results ADD COLUMN pairing_id TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE results ADD COLUMN board INTEGER
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE results ADD COLUMN color TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Player inactive rounds table
  db.run(`
    CREATE TABLE IF NOT EXISTS player_inactive_rounds (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      player_id TEXT,
      round INTEGER NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (player_id) REFERENCES players (id),
      UNIQUE(tournament_id, player_id, round)
    )
  `);

  // Teams table for team tournaments
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      name TEXT NOT NULL,
      captain_id TEXT,
      board_count INTEGER DEFAULT 4,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (captain_id) REFERENCES players (id)
    )
  `);

  // Team members table
  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      player_id TEXT,
      board_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id),
      FOREIGN KEY (player_id) REFERENCES players (id),
      UNIQUE(team_id, board_number)
    )
  `);

  // Team results table
  db.run(`
    CREATE TABLE IF NOT EXISTS team_results (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      team_id TEXT,
      round INTEGER,
      opponent_team_id TEXT,
      team_score REAL,
      opponent_score REAL,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (team_id) REFERENCES teams (id),
      FOREIGN KEY (opponent_team_id) REFERENCES teams (id)
    )
  `);

  // Users table for authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'td', 'user')),
      is_active BOOLEAN DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User sessions table for JWT token management
  db.run(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Prizes table
  db.run(`
    CREATE TABLE IF NOT EXISTS prizes (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('cash', 'trophy', 'medal', 'plaque')),
      position INTEGER,
      rating_category TEXT,
      section TEXT,
      amount REAL,
      description TEXT,
      conditions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
    )
  `);

  // Prize distributions table
  db.run(`
    CREATE TABLE IF NOT EXISTS prize_distributions (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      prize_id TEXT NOT NULL,
      amount REAL,
      position INTEGER,
      rating_category TEXT,
      section TEXT,
      tie_group INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
      FOREIGN KEY (prize_id) REFERENCES prizes (id) ON DELETE CASCADE
    )
  `);

  // Tournament permissions table
  db.run(`
    CREATE TABLE IF NOT EXISTS tournament_permissions (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission TEXT NOT NULL CHECK (permission IN ('owner', 'editor', 'viewer')),
      granted_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (granted_by) REFERENCES users (id),
      UNIQUE(tournament_id, user_id)
    )
  `);

  // Audit log table for tracking changes
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Tournament templates table
  db.run(`
    CREATE TABLE IF NOT EXISTS tournament_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      template_data TEXT NOT NULL,
      created_by TEXT NOT NULL,
      is_public BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);
});

module.exports = db;
