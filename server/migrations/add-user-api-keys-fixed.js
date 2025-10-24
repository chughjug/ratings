const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../chess_tournaments.db');

function addUserApiKeys() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    } else {
      console.log('Connected to SQLite database for API keys migration');
    }
  });

  db.serialize(() => {
    console.log('Adding API key columns to users table...');
    
    // Add non-unique columns first
    const newColumns = [
      'api_key_created_at DATETIME',
      'api_key_last_used DATETIME',
      'api_key_usage_count INTEGER DEFAULT 0',
      'api_key_permissions TEXT DEFAULT "read,write"',
      'api_key_rate_limit INTEGER DEFAULT 1000',
      'api_key_expires_at DATETIME'
    ];

    newColumns.forEach((column, index) => {
      const columnName = column.split(' ')[0];
      
      db.run(`ALTER TABLE users ADD COLUMN ${column}`, (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log(`✓ Column ${columnName} already exists`);
          } else {
            console.error(`Error adding column ${columnName}:`, err.message);
          }
        } else {
          console.log(`✓ Added column: ${columnName}`);
        }
      });
    });

    // Add api_key column (non-unique first)
    db.run(`ALTER TABLE users ADD COLUMN api_key TEXT`, (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log('✓ Column api_key already exists');
        } else {
          console.error('Error adding api_key column:', err.message);
        }
      } else {
        console.log('✓ Added column: api_key');
      }
    });

    // Create API keys table for better management
    db.run(`
      CREATE TABLE IF NOT EXISTS user_api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        permissions TEXT DEFAULT "read,write",
        rate_limit INTEGER DEFAULT 1000,
        usage_count INTEGER DEFAULT 0,
        last_used DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating user_api_keys table:', err.message);
      } else {
        console.log('✓ Created user_api_keys table');
      }
    });

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_api_keys_key ON user_api_keys(api_key)`, (err) => {
      if (err) {
        console.error('Error creating index on api_key:', err.message);
      } else {
        console.log('✓ Created index on api_key column');
      }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id)`, (err) => {
      if (err) {
        console.error('Error creating index on user_id:', err.message);
      } else {
        console.log('✓ Created index on user_id column');
      }
    });

    // Generate API keys for existing users
    db.all('SELECT id, username FROM users', (err, users) => {
      if (err) {
        console.error('Error fetching users:', err.message);
      } else {
        console.log(`Generating API keys for ${users.length} existing users...`);
        
        users.forEach(user => {
          const apiKey = generateApiKey();
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Expires in 1 year
          
          db.run(
            'UPDATE users SET api_key = ?, api_key_created_at = CURRENT_TIMESTAMP, api_key_expires_at = ? WHERE id = ?',
            [apiKey, expiresAt.toISOString(), user.id],
            (err) => {
              if (err) {
                console.error(`Error generating API key for user ${user.username}:`, err.message);
              } else {
                console.log(`✓ Generated API key for user: ${user.username}`);
              }
            }
          );
        });
      }
    });
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('API keys migration completed successfully');
    }
  });
}

function generateApiKey() {
  // Generate a more complex API key format: ctk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  const prefix = 'ctk_';
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('hex');
  return prefix + key;
}

// Run migration if called directly
if (require.main === module) {
  addUserApiKeys();
}

module.exports = addUserApiKeys;

