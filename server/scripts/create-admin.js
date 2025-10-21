const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingAdmin = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE role = "admin" LIMIT 1', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Skipping creation.');
      return;
    }

    // Create admin user
    const adminId = uuidv4();
    const username = 'admin';
    const email = 'admin@chess-tournament.com';
    const password = 'admin123'; // Change this in production!
    const passwordHash = await bcrypt.hash(password, 12);

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminId, username, email, passwordHash, 'System', 'Administrator', 'admin', 1],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Email: admin@chess-tournament.com');
    console.log('Password: admin123');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the admin password immediately after first login!');
    console.log('⚠️  IMPORTANT: Update the admin email address!');

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser().then(() => {
  console.log('Setup complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
