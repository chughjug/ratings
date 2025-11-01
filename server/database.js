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
      public_display_config TEXT,
      registration_settings TEXT,
      entry_fee REAL DEFAULT 0,
      paypal_client_id TEXT,
      paypal_secret TEXT,
      stripe_publishable_key TEXT,
      stripe_secret_key TEXT,
      payment_method TEXT DEFAULT 'both',
      twilio_account_sid TEXT,
      twilio_auth_token TEXT,
      twilio_phone_number TEXT,
      sms_notifications_enabled BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id)
    )
  `);

  // Add payment columns if they don't exist
  db.serialize(() => {
    db.run(`ALTER TABLE tournaments ADD COLUMN entry_fee REAL DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding entry_fee column:', err.message);
      }
    });
    
    db.run(`ALTER TABLE tournaments ADD COLUMN paypal_client_id TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding paypal_client_id column:', err.message);
      }
    });
    
    db.run(`ALTER TABLE tournaments ADD COLUMN paypal_secret TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding paypal_secret column:', err.message);
      }
    });
    
    db.run(`ALTER TABLE tournaments ADD COLUMN stripe_publishable_key TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding stripe_publishable_key column:', err.message);
      }
    });
    
    db.run(`ALTER TABLE tournaments ADD COLUMN stripe_secret_key TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding stripe_secret_key column:', err.message);
      }
    });
    
    db.run(`ALTER TABLE tournaments ADD COLUMN payment_method TEXT DEFAULT 'both'`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding payment_method column:', err.message);
      }
    });

    db.run(`ALTER TABLE tournaments ADD COLUMN twilio_account_sid TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding twilio_account_sid column:', err.message);
      }
    });

    db.run(`ALTER TABLE tournaments ADD COLUMN twilio_auth_token TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding twilio_auth_token column:', err.message);
      }
    });

    db.run(`ALTER TABLE tournaments ADD COLUMN twilio_phone_number TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding twilio_phone_number column:', err.message);
      }
    });

    db.run(`ALTER TABLE tournaments ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding sms_notifications_enabled column:', err.message);
      }
    });
  });

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

  // Add public_display_config column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE tournaments ADD COLUMN public_display_config TEXT
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

  // Teams table for team tournaments (Team vs Team format)
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      name TEXT NOT NULL,
      captain_id TEXT,
      section TEXT DEFAULT 'Open',
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (captain_id) REFERENCES players (id),
      UNIQUE(tournament_id, name)
    )
  `);

  // Add section column to teams table if it doesn't exist (migration for existing databases)
  db.run(`
    ALTER TABLE teams ADD COLUMN section TEXT DEFAULT 'Open'
  `, (err) => {
    // Ignore error if column already exists
  });

  // Team members table for team tournaments
  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      board_number INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
      UNIQUE(team_id, player_id)
    )
  `);

  // Team results table for tracking team match results
  db.run(`
    CREATE TABLE IF NOT EXISTS team_results (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      team_id TEXT NOT NULL,
      opponent_team_id TEXT,
      team_score REAL DEFAULT 0,
      opponent_score REAL DEFAULT 0,
      result TEXT CHECK (result IN ('win', 'loss', 'draw', 'bye')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (team_id) REFERENCES teams (id),
      FOREIGN KEY (opponent_team_id) REFERENCES teams (id),
      UNIQUE(tournament_id, round, team_id)
    )
  `);

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
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'payment_pending', 'payment_completed')),
      payment_amount REAL,
      payment_method TEXT,
      payment_status TEXT,
      payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      rejected_at DATETIME,
      approval_notes TEXT,
      rejection_notes TEXT,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);

  // Add payment fields to registrations if they don't exist
  db.run(`
    ALTER TABLE registrations ADD COLUMN payment_amount REAL
  `, (err) => {});
  
  db.run(`
    ALTER TABLE registrations ADD COLUMN payment_method TEXT
  `, (err) => {});
  
  db.run(`
    ALTER TABLE registrations ADD COLUMN payment_status TEXT
  `, (err) => {});
  
  db.run(`
    ALTER TABLE registrations ADD COLUMN payment_id TEXT
  `, (err) => {});

  // Add registration_settings column to tournaments table if it doesn't exist
  db.run(`
    ALTER TABLE tournaments ADD COLUMN registration_settings TEXT
  `, (err) => {});

  // Add notification settings columns to tournaments table if they don't exist
  db.run(`
    ALTER TABLE tournaments ADD COLUMN notifications_enabled BOOLEAN DEFAULT 0
  `, (err) => {});
  
  db.run(`
    ALTER TABLE tournaments ADD COLUMN webhook_url TEXT
  `, (err) => {});

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

  // Prizes table - defines prize configurations for tournaments
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE
    )
  `);

  // Prize distributions table - tracks which players received which prizes
  db.run(`
    CREATE TABLE IF NOT EXISTS prize_distributions (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      prize_id TEXT,
      prize_name TEXT NOT NULL,
      prize_type TEXT NOT NULL CHECK (prize_type IN ('cash', 'trophy', 'medal', 'plaque')),
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

  // Add payment settings to organizations table
  db.run(`
    ALTER TABLE organizations ADD COLUMN payment_settings TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Payments table for tracking transactions
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tournament_id TEXT,
      registration_id TEXT,
      player_id TEXT,
      organization_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'usd',
      payment_method TEXT NOT NULL,
      payment_intent_id TEXT,
      order_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      FOREIGN KEY (organization_id) REFERENCES organizations (id)
    )
  `);

  // Payment configurations table for storing TD credentials
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_configurations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
      account_id TEXT NOT NULL,
      account_email TEXT,
      access_token_encrypted TEXT,
      refresh_token_encrypted TEXT,
      is_active BOOLEAN DEFAULT 1,
      is_production BOOLEAN DEFAULT 0,
      webhook_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      UNIQUE(organization_id, provider)
    )
  `);

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

  // Club members table - tracks chess players as members of clubs/organizations
  db.run(`
    CREATE TABLE IF NOT EXISTS club_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      uscf_id TEXT,
      fide_id TEXT,
      rating INTEGER,
      quick_rating INTEGER,
      blitz_rating INTEGER,
      expiration_date TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      country TEXT DEFAULT 'US',
      notes TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      membership_start_date TEXT,
      membership_end_date TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // Indexes for faster lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_club_members_org ON club_members(organization_id)
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_club_members_uscf ON club_members(uscf_id)
  `);

  // Club announcements table
  db.run(`
    CREATE TABLE IF NOT EXISTS club_announcements (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id TEXT NOT NULL,
      is_pinned BOOLEAN DEFAULT 0,
      is_published BOOLEAN DEFAULT 0,
      published_at DATETIME,
      expires_at DATETIME,
      target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'active_members', 'inactive_members', 'custom')),
      target_member_ids TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users (id)
    )
  `);

  // Club email campaigns table
  db.run(`
    CREATE TABLE IF NOT EXISTS club_email_campaigns (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      content_html TEXT,
      content_text TEXT,
      sender_name TEXT,
      sender_email TEXT,
      reply_to_email TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
      scheduled_at DATETIME,
      sent_at DATETIME,
      target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'active_members', 'inactive_members', 'custom')),
      target_member_ids TEXT,
      total_recipients INTEGER DEFAULT 0,
      total_sent INTEGER DEFAULT 0,
      total_delivered INTEGER DEFAULT 0,
      total_opened INTEGER DEFAULT 0,
      total_clicked INTEGER DEFAULT 0,
      total_bounced INTEGER DEFAULT 0,
      total_failed INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `);

  // Club email tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS club_email_tracking (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      member_id TEXT,
      recipient_email TEXT NOT NULL,
      tracking_token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
      sent_at DATETIME,
      delivered_at DATETIME,
      opened_at DATETIME,
      clicked_at DATETIME,
      opened_count INTEGER DEFAULT 0,
      clicked_count INTEGER DEFAULT 0,
      bounce_reason TEXT,
      error_message TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES club_email_campaigns (id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES club_members (id) ON DELETE SET NULL
    )
  `);

  // Club ratings table - custom rating system for clubs
  db.run(`
    CREATE TABLE IF NOT EXISTS club_ratings (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      rating_type TEXT DEFAULT 'regular' CHECK (rating_type IN ('regular', 'quick', 'blitz', 'tournament')),
      rating INTEGER NOT NULL,
      rating_deviation INTEGER DEFAULT 350,
      volatility REAL DEFAULT 0.06,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      last_game_date TEXT,
      peak_rating INTEGER,
      peak_rating_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES club_members (id) ON DELETE CASCADE,
      UNIQUE(organization_id, member_id, rating_type)
    )
  `);

  // Club rating history table
  db.run(`
    CREATE TABLE IF NOT EXISTS club_rating_history (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      rating_type TEXT NOT NULL,
      rating_before INTEGER,
      rating_after INTEGER,
      rating_change INTEGER,
      tournament_id TEXT,
      game_id TEXT,
      opponent_id TEXT,
      result TEXT CHECK (result IN ('win', 'loss', 'draw')),
      game_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES club_members (id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE SET NULL
    )
  `);

  // Indexes for email tracking
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign ON club_email_tracking(campaign_id)
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_email_tracking_member ON club_email_tracking(member_id)
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_email_tracking_token ON club_email_tracking(tracking_token)
  `);

  // Indexes for club ratings
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_club_ratings_org_member ON club_ratings(organization_id, member_id)
  `);
  
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_club_rating_history_member ON club_rating_history(member_id)
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

  // Custom pages table for public tournament display
  db.run(`
    CREATE TABLE IF NOT EXISTS custom_pages (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      UNIQUE(tournament_id, slug)
    )
  `);

  // Migration: Add missing prize_id column to prize_distributions if it doesn't exist
  db.run(`
    ALTER TABLE prize_distributions ADD COLUMN prize_id TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Migration: Add missing prize_name column to prize_distributions if it doesn't exist
  db.run(`
    ALTER TABLE prize_distributions ADD COLUMN prize_name TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Migration: Add missing rating_category column to prize_distributions if it doesn't exist
  db.run(`
    ALTER TABLE prize_distributions ADD COLUMN rating_category TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  // Migration: Drop old section_id column if it exists (from outdated schema)
  db.run(`
    CREATE TEMPORARY TABLE temp_prizes AS 
    SELECT * FROM prizes
  `, (err) => {
    // This is just a test query, will fail gracefully if prizes table doesn't exist yet
  });
});

module.exports = db;
