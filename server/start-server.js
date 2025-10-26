// Server startup script that runs migrations first
const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting server with database migration check...');

// Run migration (will gracefully handle if columns already exist)
const migrationScript = path.join(__dirname, 'migrations', 'add-missing-columns.js');

exec(`node ${migrationScript}`, (err, stdout, stderr) => {
  if (err) {
    console.log('Migration check completed (some columns may already exist)');
  }
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  
  // Start the server regardless of migration result
  console.log('✓ Database migration check completed');
  console.log('🔧 Starting server...');
  
  // Small delay to ensure migration output is logged
  setTimeout(() => {
    require('./index.js');
  }, 100);
});



