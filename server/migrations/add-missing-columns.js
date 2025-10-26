const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use Heroku's DATABASE_URL or fall back to local path
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../chess_tournaments.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    console.error('Database path:', dbPath);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database for migration');
    console.log('Database path:', dbPath);
  }
});

// Add missing columns to existing tables
db.serialize(() => {
  console.log('Starting database migration...');
  
  // Add tournament_information column if it doesn't exist
  db.run(`
    ALTER TABLE tournaments ADD COLUMN tournament_information TEXT
  `, (err) => {
    if (err && err.message.includes('duplicate column name')) {
      console.log('Column tournament_information already exists');
    } else if (err) {
      console.error('Error adding tournament_information column:', err);
    } else {
      console.log('✓ Added tournament_information column');
    }
  });

  // Add any other missing columns
  const columnsToCheck = [
    { name: 'logo_url', type: 'TEXT' },
    { name: 'city', type: 'TEXT' },
    { name: 'state', type: 'TEXT' },
    { name: 'location', type: 'TEXT' },
    { name: 'chief_td_name', type: 'TEXT' },
    { name: 'chief_td_uscf_id', type: 'TEXT' },
    { name: 'chief_arbiter_name', type: 'TEXT' },
    { name: 'chief_arbiter_fide_id', type: 'TEXT' },
    { name: 'chief_organizer_name', type: 'TEXT' },
    { name: 'chief_organizer_fide_id', type: 'TEXT' },
    { name: 'expected_players', type: 'INTEGER' },
    { name: 'website', type: 'TEXT' },
    { name: 'public_url', type: 'TEXT' }
  ];

  columnsToCheck.forEach(({ name, type }) => {
    db.run(
      `ALTER TABLE tournaments ADD COLUMN ${name} ${type}`,
      (err) => {
        if (err && err.message.includes('duplicate column name')) {
          console.log(`Column ${name} already exists`);
        } else if (err) {
          console.error(`Error adding ${name} column:`, err);
        } else {
          console.log(`✓ Added ${name} column`);
        }
      }
    );
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Migration completed successfully');
    }
    process.exit(0);
  });
});



