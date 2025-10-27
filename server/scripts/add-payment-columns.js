const db = require('../database');

console.log('Adding payment columns to tournaments table...');

db.serialize(() => {
  db.run(`ALTER TABLE tournaments ADD COLUMN entry_fee REAL DEFAULT 0`, (err) => {
    if (err) console.log('entry_fee column:', err.message.includes('duplicate') ? 'already exists' : err.message);
  });
  
  db.run(`ALTER TABLE tournaments ADD COLUMN paypal_client_id TEXT`, (err) => {
    if (err) console.log('paypal_client_id column:', err.message.includes('duplicate') ? 'already exists' : err.message);
  });
  
  db.run(`ALTER TABLE tournaments ADD COLUMN paypal_secret TEXT`, (err) => {
    if (err) console.log('paypal_secret column:', err.message.includes('duplicate') ? 'already exists' : err.message);
  });
  
  db.run(`ALTER TABLE tournaments ADD COLUMN stripe_publishable_key TEXT`, (err) => {
    if (err) console.log('stripe_publishable_key column:', err.message.includes('duplicate') ? 'already exists' : err.message);
  });
  
  db.run(`ALTER TABLE tournaments ADD COLUMN stripe_secret_key TEXT`, (err) => {
    if (err) console.log('stripe_secret_key column:', err.message.includes('duplicate') ? 'already exists' : err.message);
  });
  
  db.run(`ALTER TABLE tournaments ADD COLUMN payment_method TEXT DEFAULT 'both'`, (err) => {
    if (err) console.log('payment_method column:', err.message.includes('duplicate') ? 'already exists' : err.message);
    
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      console.log('\nMigration complete!');
      process.exit(0);
    });
  });
});

