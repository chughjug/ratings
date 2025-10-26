const db = require('../database');
const path = require('path');

console.log('Starting migration: add-online-games-table');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS online_games (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      pairing_id TEXT,
      round INTEGER NOT NULL,
      room_code TEXT NOT NULL UNIQUE,
      game_url TEXT NOT NULL,
      white_url TEXT,
      black_url TEXT,
      white_token TEXT,
      black_token TEXT,
      white_player_id TEXT,
      black_player_id TEXT,
      time_control TEXT,
      status TEXT DEFAULT 'created',
      result TEXT,
      pgn TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id) ON DELETE CASCADE,
      FOREIGN KEY (pairing_id) REFERENCES pairings (id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating online_games table:', err);
      process.exit(1);
    } else {
      console.log('✅ online_games table created successfully');
      
      // Create indexes for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_online_games_tournament ON online_games(tournament_id)', (err) => {
        if (err) console.error('Error creating index:', err);
        else console.log('✅ Index on tournament_id created');
      });
      
      db.run('CREATE INDEX IF NOT EXISTS idx_online_games_pairing ON online_games(pairing_id)', (err) => {
        if (err) console.error('Error creating index:', err);
        else console.log('✅ Index on pairing_id created');
      });
      
      db.run('CREATE INDEX IF NOT EXISTS idx_online_games_round ON online_games(tournament_id, round)', (err) => {
        if (err) console.error('Error creating index:', err);
        else console.log('✅ Index on tournament_id, round created');
      });
      
      db.run('CREATE INDEX IF NOT EXISTS idx_online_games_room ON online_games(room_code)', (err) => {
        if (err) console.error('Error creating index:', err);
        else {
          console.log('✅ Index on room_code created');
          console.log('✅ Migration completed successfully');
          process.exit(0);
        }
      });
    }
  });
});
