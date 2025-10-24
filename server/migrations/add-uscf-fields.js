const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../chess_tournaments.db');

function addUSCFFields() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      process.exit(1);
    } else {
      console.log('Connected to SQLite database for USCF fields migration');
    }
  });

  // Add new USCF-related columns to players table
  const newColumns = [
    'uscf_regular_rating_date TEXT',
    'uscf_name TEXT'
  ];

  db.serialize(() => {
    console.log('Adding USCF-related columns to players table...');
    
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
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('USCF fields migration completed successfully');
    }
  });
}

// Run migration if called directly
if (require.main === module) {
  addUSCFFields();
}

module.exports = addUSCFFields;
