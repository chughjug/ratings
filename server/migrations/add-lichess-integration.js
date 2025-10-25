const db = require('../database');

console.log('Adding Lichess integration columns...');

// Add Lichess columns to players table
db.run(`
  ALTER TABLE players ADD COLUMN lichess_username TEXT
`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding lichess_username to players:', err);
  } else {
    console.log('Added lichess_username column to players table');
  }
});

// Add Lichess columns to pairings table
db.run(`
  ALTER TABLE pairings ADD COLUMN lichess_challenge_id TEXT
`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding lichess_challenge_id to pairings:', err);
  } else {
    console.log('Added lichess_challenge_id column to pairings table');
  }
});

db.run(`
  ALTER TABLE pairings ADD COLUMN lichess_game_id TEXT
`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding lichess_game_id to pairings:', err);
  } else {
    console.log('Added lichess_game_id column to pairings table');
  }
});

db.run(`
  ALTER TABLE pairings ADD COLUMN lichess_status TEXT
`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding lichess_status to pairings:', err);
  } else {
    console.log('Added lichess_status column to pairings table');
  }
});

db.run(`
  ALTER TABLE pairings ADD COLUMN pgn TEXT
`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding pgn to pairings:', err);
  } else {
    console.log('Added pgn column to pairings table');
  }
});

// Add Lichess columns to tournaments table
db.run(`
  ALTER TABLE tournaments ADD COLUMN lichess_tournament_id TEXT
`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding lichess_tournament_id to tournaments:', err);
  } else {
    console.log('Added lichess_tournament_id column to tournaments table');
  }
});

db.run(`
  ALTER TABLE tournaments ADD COLUMN lichess_integration_enabled BOOLEAN DEFAULT 0
`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding lichess_integration_enabled to tournaments:', err);
  } else {
    console.log('Added lichess_integration_enabled column to tournaments table');
  }
});

console.log('Lichess integration migration completed');
