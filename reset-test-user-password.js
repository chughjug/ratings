const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'server', 'chess_tournaments.db');
const db = new sqlite3.Database(dbPath);

console.log('🔐 Resetting password for test user...\n');

// New password
const newPassword = 'password123';

// Simple hash (not secure, but works for testing)
const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

// Update the user's password
db.run(
  'UPDATE users SET password_hash = ? WHERE email = ?',
  [hashedPassword, 'a@a.com'],
  function(err) {
    if (err) {
      console.error('Error updating password:', err);
      return;
    }

    console.log('✅ Password updated successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: a@a.com`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n🌐 Access URLs:');
    console.log('   Login: http://localhost:3000');
    console.log('   Dashboard: http://localhost:3000/dashboard');
    console.log('   Organization Settings: http://localhost:3000/organizations/4e904d3d-0442-4020-8a76-ccc1399ec80c/settings');
    console.log('   Public Page: http://localhost:3000/public/organizations/police');
    
    db.close();
  }
);

console.log('🔄 Processing password reset...');