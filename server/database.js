const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use Heroku's DATABASE_URL or fall back to local path
const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'chess_tournaments.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    console.error('Database path:', dbPath);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    console.log('Database path:', dbPath);
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
      organization_id TEXT,
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
      allow_registration BOOLEAN DEFAULT 1,
      is_public BOOLEAN DEFAULT 0,
      public_url TEXT,
      logo_url TEXT,
      tournament_information TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id)
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
      team_name TEXT,
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

  // Add email column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE players ADD COLUMN email TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add phone column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE players ADD COLUMN phone TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add bye_rounds column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE players ADD COLUMN bye_rounds TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add team_name column for individual tournaments with team scoring
  db.run(`
    ALTER TABLE players ADD COLUMN team_name TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Remove board_number column from team_members table (migration for new team affiliation model)
  db.run(`
    ALTER TABLE team_members DROP COLUMN board_number
  `, (err) => {
    // Ignore error if column doesn't exist or can't be dropped
  });

  // Remove team tables (migration to simple team category model)
  db.run(`
    DROP TABLE IF EXISTS team_members
  `, (err) => {
    // Ignore error if table doesn't exist
  });
  
  db.run(`
    DROP TABLE IF EXISTS teams
  `, (err) => {
    // Ignore error if table doesn't exist
  });
  
  db.run(`
    DROP TABLE IF EXISTS team_results
  `, (err) => {
    // Ignore error if table doesn't exist
  });

  // Registrations table
  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_name TEXT NOT NULL,
      uscf_id TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      section TEXT,
      bye_requests TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      rejected_at DATETIME,
      approval_notes TEXT,
      rejection_notes TEXT,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);

  // Add US Chess specific columns to tournaments table (for existing databases)
  const usChessColumns = [
    'organization_id TEXT',
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
    'uscf_rated BOOLEAN DEFAULT 1',
    'allow_registration BOOLEAN DEFAULT 1',
    'is_public BOOLEAN DEFAULT 0',
    'public_url TEXT'
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

  // Add bye_type column to pairings table if it doesn't exist (for existing databases)
  // bye_type can be: 'bye' (1/2 point), 'unpaired' (1 full point), or null (normal game)
  db.run(`
    ALTER TABLE pairings ADD COLUMN bye_type TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Add is_bye column to pairings table if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE pairings ADD COLUMN is_bye BOOLEAN DEFAULT 0
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

  // Teams are now just a category field on players - no separate tables needed

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

  // Prize distributions table (simplified - no separate prizes table)
  db.run(`
    CREATE TABLE IF NOT EXISTS prize_distributions (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      prize_name TEXT NOT NULL,
      prize_type TEXT NOT NULL CHECK (prize_type IN ('cash', 'trophy', 'medal', 'plaque')),
      amount REAL,
      position INTEGER,
      section TEXT,
      tie_group INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
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

  // Enhanced pairing system tables
  db.run(`
    CREATE TABLE IF NOT EXISTS pairing_history (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      player1_id TEXT,
      player2_id TEXT,
      round INTEGER,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (player1_id) REFERENCES players (id),
      FOREIGN KEY (player2_id) REFERENCES players (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS color_preferences (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      player_id TEXT,
      preferred_color TEXT CHECK (preferred_color IN ('white', 'black', 'either')),
      priority INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pairing_overrides (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      round INTEGER,
      original_pairing_id TEXT,
      new_white_player_id TEXT,
      new_black_player_id TEXT,
      reason TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (original_pairing_id) REFERENCES pairings (id),
      FOREIGN KEY (new_white_player_id) REFERENCES players (id),
      FOREIGN KEY (new_black_player_id) REFERENCES players (id)
    )
  `);

  // Tournament templates table
  db.run(`
    CREATE TABLE IF NOT EXISTS tournament_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      format TEXT NOT NULL,
      settings TEXT,
      is_public BOOLEAN DEFAULT 0,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      usage_count INTEGER DEFAULT 0
    )
  `);

  // Player photos table
  db.run(`
    CREATE TABLE IF NOT EXISTS player_photos (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      player_id TEXT,
      photo_url TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  // Time controls table
  db.run(`
    CREATE TABLE IF NOT EXISTS time_controls (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      round INTEGER,
      time_per_player INTEGER,
      increment INTEGER,
      delay INTEGER,
      time_control_string TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);

  // Organizations table for multi-tenancy
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      website TEXT,
      logo_url TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      country TEXT DEFAULT 'US',
      is_active BOOLEAN DEFAULT 1,
      settings TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // Add branding fields to organizations table
  db.run(`
    ALTER TABLE organizations ADD COLUMN branding_logo TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE organizations ADD COLUMN branding_primary_color TEXT DEFAULT '#3b82f6'
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE organizations ADD COLUMN branding_secondary_color TEXT DEFAULT '#8b5cf6'
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE organizations ADD COLUMN branding_accent_color TEXT DEFAULT '#10b981'
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE organizations ADD COLUMN branding_settings TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Organization members table
  db.run(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      invited_by TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users (id),
      UNIQUE(organization_id, user_id)
    )
  `);

  // Organization invitations table
  db.run(`
    CREATE TABLE IF NOT EXISTS organization_invitations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      token TEXT UNIQUE NOT NULL,
      invited_by TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accepted_at DATETIME,
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by) REFERENCES users (id)
    )
  `);

  // Tournament archives table
  db.run(`
    CREATE TABLE IF NOT EXISTS tournament_archives (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      archive_name TEXT NOT NULL,
      archive_type TEXT CHECK (archive_type IN ('full', 'standings', 'pairings', 'results')),
      file_path TEXT NOT NULL,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);

  // Multi-day tournament days table
  db.run(`
    CREATE TABLE IF NOT EXISTS tournament_days (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      day_number INTEGER,
      date TEXT,
      rounds TEXT,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);

  // Knockout brackets table
  db.run(`
    CREATE TABLE IF NOT EXISTS knockout_brackets (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      round INTEGER,
      match_number INTEGER,
      player1_id TEXT,
      player2_id TEXT,
      winner_id TEXT,
      result TEXT,
      board_number INTEGER,
      is_bye BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (player1_id) REFERENCES players (id),
      FOREIGN KEY (player2_id) REFERENCES players (id),
      FOREIGN KEY (winner_id) REFERENCES players (id)
    )
  `);

  // Simultaneous players table
  db.run(`
    CREATE TABLE IF NOT EXISTS simultaneous_players (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      player_id TEXT,
      board_number INTEGER,
      name TEXT,
      rating INTEGER,
      result TEXT CHECK (result IN ('win', 'loss', 'draw')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  // Google Sheets sync configurations table
  db.run(`
    CREATE TABLE IF NOT EXISTS google_sheets_sync (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      spreadsheet_id TEXT NOT NULL,
      range TEXT DEFAULT 'Sheet1!A1:Z1000',
      sheet_name TEXT DEFAULT 'Players',
      api_key TEXT NOT NULL,
      lookup_ratings BOOLEAN DEFAULT 1,
      auto_assign_sections BOOLEAN DEFAULT 1,
      use_smart_import BOOLEAN DEFAULT 1,
      is_active BOOLEAN DEFAULT 0,
      last_sync_at DATETIME,
      last_sync_status TEXT,
      last_sync_error TEXT,
      sync_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);

  // Google Sheets sync logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS google_sheets_sync_logs (
      id TEXT PRIMARY KEY,
      sync_config_id TEXT NOT NULL,
      tournament_id TEXT NOT NULL,
      sync_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sync_completed_at DATETIME,
      status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
      players_imported INTEGER DEFAULT 0,
      players_updated INTEGER DEFAULT 0,
      errors_count INTEGER DEFAULT 0,
      error_message TEXT,
      sync_duration_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sync_config_id) REFERENCES google_sheets_sync (id),
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);
});

module.exports = db;
