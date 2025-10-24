const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../chess_tournaments.db');

function addPlayerFields() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    } else {
      console.log('Connected to SQLite database for migration');
    }
  });

  // Add new columns to players table
  const newColumns = [
    'school TEXT',
    'grade TEXT', 
    'email TEXT',
    'phone TEXT',
    'state TEXT',
    'city TEXT',
    'notes TEXT',
    'parent_name TEXT',
    'parent_email TEXT',
    'parent_phone TEXT',
    'emergency_contact TEXT',
    'emergency_phone TEXT',
    'tshirt_size TEXT',
    'dietary_restrictions TEXT',
    'special_needs TEXT',
    'source TEXT DEFAULT "manual"',
    'created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
  ];

  db.serialize(() => {
    console.log('Adding new columns to players table...');
    
    newColumns.forEach((column, index) => {
      const columnName = column.split(' ')[0];
      
      db.run(`ALTER TABLE players ADD COLUMN ${column}`, (err) => {
        if (err) {
          // Column might already exist, check if it's a "duplicate column name" error
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

    // Add index on source column for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_players_source ON players(source)`, (err) => {
      if (err) {
        console.error('Error creating index on source:', err.message);
      } else {
        console.log('✓ Created index on source column');
      }
    });

    // Add index on created_at for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_players_created_at ON players(created_at)`, (err) => {
      if (err) {
        console.error('Error creating index on created_at:', err.message);
      } else {
        console.log('✓ Created index on created_at column');
      }
    });
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Migration completed successfully');
    }
  });
}

// Run migration if called directly
if (require.main === module) {
  addPlayerFields();
}

module.exports = addPlayerFields;

