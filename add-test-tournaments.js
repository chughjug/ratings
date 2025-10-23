const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'chess_tournaments.db');
const db = new sqlite3.Database(dbPath);

// Get the organization ID for the police organization
const getOrgIdQuery = "SELECT id FROM organizations WHERE slug = 'police'";

db.get(getOrgIdQuery, [], function(err, row) {
  if (err) {
    console.error('Error getting organization ID:', err);
    db.close();
    return;
  }

  if (!row) {
    console.error('Organization not found');
    db.close();
    return;
  }

  const orgId = row.id;

  // Test tournaments for the police organization
  const testTournaments = [
    {
      id: 'tournament-1',
      organization_id: orgId,
      name: 'Spring Championship 2024',
      format: 'swiss',
      rounds: 5,
      time_control: '90+30',
      start_date: '2024-03-15',
      end_date: '2024-03-17',
      status: 'active',
      city: 'Downtown',
      location: 'Police Community Center',
      expected_players: 24,
      allow_registration: 1,
      is_public: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 'tournament-2',
      organization_id: orgId,
      name: 'Winter Blitz Tournament',
      format: 'blitz',
      rounds: 7,
      time_control: '3+2',
      start_date: '2023-12-10',
      end_date: '2023-12-10',
      status: 'completed',
      city: 'Downtown',
      location: 'Community Center',
      expected_players: 16,
      allow_registration: 0,
      is_public: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 'tournament-3',
      organization_id: orgId,
      name: 'Summer Rapid Open',
      format: 'rapid',
      rounds: 6,
      time_control: '15+10',
      start_date: '2024-06-20',
      end_date: '2024-06-22',
      status: 'created',
      city: 'Downtown',
      location: 'Chess Academy',
      expected_players: 32,
      allow_registration: 1,
      is_public: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 'tournament-4',
      organization_id: orgId,
      name: 'Fall Classic Championship',
      format: 'swiss',
      rounds: 7,
      time_control: '120+30',
      start_date: '2024-09-15',
      end_date: '2024-09-17',
      status: 'created',
      city: 'Downtown',
      location: 'Police Training Center',
      expected_players: 20,
      allow_registration: 1,
      is_public: 1,
      created_at: new Date().toISOString()
    }
  ];

  // Insert test tournaments
  const insertQuery = `
    INSERT OR REPLACE INTO tournaments (
      id, organization_id, name, format, rounds, time_control, 
      start_date, end_date, status, city, location, expected_players,
      allow_registration, is_public, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let completed = 0;
  testTournaments.forEach((tournament, index) => {
    db.run(insertQuery, [
      tournament.id,
      tournament.organization_id,
      tournament.name,
      tournament.format,
      tournament.rounds,
      tournament.time_control,
      tournament.start_date,
      tournament.end_date,
      tournament.status,
      tournament.city,
      tournament.location,
      tournament.expected_players,
      tournament.allow_registration,
      tournament.is_public,
      tournament.created_at
    ], function(err) {
      if (err) {
        console.error(`Error inserting tournament ${index + 1}:`, err);
      } else {
        console.log(`✅ Added tournament: ${tournament.name}`);
      }
      
      completed++;
      if (completed === testTournaments.length) {
        console.log('\n🎉 All test tournaments added successfully!');
        console.log('🌐 Visit http://localhost:3000/public/organizations/police to see the tournaments!');
        db.close();
      }
    });
  });
});
