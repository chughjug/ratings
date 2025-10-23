const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'chess_tournaments.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Getting organization information...\n');

// Get all organizations
db.all("SELECT id, name, slug, description FROM organizations", [], (err, rows) => {
  if (err) {
    console.error('Error fetching organizations:', err);
    return;
  }

  console.log('📋 Available Organizations:');
  console.log('=' .repeat(50));
  
  rows.forEach((org, index) => {
    console.log(`${index + 1}. ${org.name}`);
    console.log(`   ID: ${org.id}`);
    console.log(`   Slug: ${org.slug}`);
    console.log(`   Description: ${org.description || 'No description'}`);
    console.log('');
  });

  // Find the Police Chess Club specifically
  const policeOrg = rows.find(org => org.slug === 'police');
  if (policeOrg) {
    console.log('🎯 Police Chess Club Details:');
    console.log('=' .repeat(50));
    console.log(`Name: ${policeOrg.name}`);
    console.log(`ID: ${policeOrg.id}`);
    console.log(`Slug: ${policeOrg.slug}`);
    console.log(`Public URL: http://localhost:3000/public/organizations/${policeOrg.slug}`);
    console.log(`Settings URL: http://localhost:3000/organizations/${policeOrg.id}/settings`);
    console.log('');
    console.log('🎨 To customize this organization:');
    console.log('1. Go to: http://localhost:3000/organizations/' + policeOrg.id + '/settings');
    console.log('2. Click on the "Customization" tab');
    console.log('3. Edit colors, fonts, layout, and more!');
    console.log('4. Click "Save Changes" to apply');
    console.log('5. View your changes at: http://localhost:3000/public/organizations/' + policeOrg.slug);
  } else {
    console.log('❌ Police Chess Club not found. Available organizations are listed above.');
  }

  db.close();
});

console.log('💡 Tip: Use the organization ID in the settings URL to access customization features.');
