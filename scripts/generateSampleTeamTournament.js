/**
 * Script to generate a sample team tournament with teams and players
 * 
 * Usage:
 *   node scripts/generateSampleTeamTournament.js
 * 
 * This will create:
 * - A team tournament named "Sample Team Championship 2024"
 * - 6 teams with 4-5 players each
 * - Players with varying ratings
 * - Initial round 1 pairings (optional)
 */

const db = require('../server/database');
const { v4: uuidv4 } = require('uuid');

// Sample team data
const teams = [
  {
    name: 'Chess Masters',
    players: [
      { name: 'Grandmaster Alpha', rating: 2500 },
      { name: 'Master Beta', rating: 2200 },
      { name: 'Expert Gamma', rating: 2000 },
      { name: 'Class A Delta', rating: 1800 },
      { name: 'Class B Echo', rating: 1600 }
    ]
  },
  {
    name: 'Tactical Knights',
    players: [
      { name: 'IM Foxtrot', rating: 2400 },
      { name: 'FM Golf', rating: 2300 },
      { name: 'Expert Hotel', rating: 1950 },
      { name: 'Class A India', rating: 1750 },
      { name: 'Class B Juliet', rating: 1550 }
    ]
  },
  {
    name: 'Strategic Rooks',
    players: [
      { name: 'Master Kilo', rating: 2250 },
      { name: 'Expert Lima', rating: 2050 },
      { name: 'Expert Mike', rating: 1900 },
      { name: 'Class A November', rating: 1700 },
      { name: 'Class B Oscar', rating: 1500 }
    ]
  },
  {
    name: 'Brilliant Bishops',
    players: [
      { name: 'FM Papa', rating: 2350 },
      { name: 'Expert Quebec', rating: 2100 },
      { name: 'Class A Romeo', rating: 1850 },
      { name: 'Class A Sierra', rating: 1725 },
      { name: 'Class B Tango', rating: 1575 }
    ]
  },
  {
    name: 'Swift Queens',
    players: [
      { name: 'IM Uniform', rating: 2450 },
      { name: 'Expert Victor', rating: 2150 },
      { name: 'Class A Whiskey', rating: 1825 },
      { name: 'Class B Xray', rating: 1650 },
      { name: 'Class C Yankee', rating: 1400 }
    ]
  },
  {
    name: 'Checkmate Kings',
    players: [
      { name: 'Master Zulu', rating: 2280 },
      { name: 'Expert Alpha2', rating: 2080 },
      { name: 'Class A Beta2', rating: 1780 },
      { name: 'Class B Gamma2', rating: 1620 },
      { name: 'Class C Delta2', rating: 1420 }
    ]
  }
];

async function generateSampleTeamTournament() {
  return new Promise((resolve, reject) => {
    console.log('🏁 Starting sample team tournament generation...\n');

    // Step 1: Create the tournament
    const tournamentId = uuidv4();
    const tournamentName = `Sample Team Championship ${new Date().getFullYear()}`;
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now

    console.log(`📋 Creating tournament: ${tournamentName}`);

    db.run(
      `INSERT INTO tournaments (
        id, name, format, rounds, time_control, start_date, end_date,
        city, state, location, is_public, allow_registration, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tournamentId,
        tournamentName,
        'team-tournament',
        5, // 5 rounds
        'G/90+30',
        startDate,
        endDate,
        'Sample City',
        'CA',
        'Chess Club Hall',
        1, // is_public
        1, // allow_registration
        'created' // status
      ],
      async (err) => {
        if (err) {
          console.error('❌ Error creating tournament:', err);
          return reject(err);
        }

        console.log(`✅ Tournament created with ID: ${tournamentId}\n`);

        try {
          // Step 2: Create teams and add players
          const teamIds = [];
          const allPlayerIds = [];

          for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            const teamId = uuidv4();
            teamIds.push(teamId);

            console.log(`👥 Creating team: ${team.name}`);

            // Create team (no captain for now)
            await new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO teams (id, tournament_id, name, status)
                 VALUES (?, ?, ?, ?)`,
                [teamId, tournamentId, team.name, 'active'],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });

            // Add players to tournament and assign to team
            const teamPlayerIds = [];
            for (let j = 0; j < team.players.length; j++) {
              const playerData = team.players[j];
              const playerId = uuidv4();
              teamPlayerIds.push(playerId);
              allPlayerIds.push(playerId);

              // Create player
              await new Promise((resolve, reject) => {
                db.run(
                  `INSERT INTO players (
                    id, tournament_id, name, rating, status, section
                  ) VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    playerId,
                    tournamentId,
                    playerData.name,
                    playerData.rating,
                    'active',
                    team.name // Store team name in section for backwards compatibility
                  ],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });

              // Add player to team (board numbers are determined dynamically by rating when pairing)
              await new Promise((resolve, reject) => {
                db.run(
                  `INSERT INTO team_members (id, team_id, player_id)
                   VALUES (?, ?, ?)`,
                  [uuidv4(), teamId, playerId],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });

              console.log(`  ✓ Added ${playerData.name} (Rating: ${playerData.rating})`);
            }

            console.log(`✅ Team "${team.name}" created with ${team.players.length} players\n`);
          }

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ Sample Team Tournament Generated Successfully!');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log(`Tournament ID: ${tournamentId}`);
          console.log(`Tournament Name: ${tournamentName}`);
          console.log(`Number of Teams: ${teamIds.length}`);
          console.log(`Total Players: ${allPlayerIds.length}`);
          console.log(`Format: team-tournament`);
          console.log(`Rounds: 5`);
          console.log(`\nTo view the tournament, navigate to:`);
          console.log(`http://localhost:3000/tournaments/${tournamentId}`);
          console.log(`\nOr access it via API:`);
          console.log(`GET http://localhost:5000/api/tournaments/${tournamentId}`);
          console.log(`\nTo generate Round 1 pairings, use:`);
          console.log(`POST http://localhost:5000/api/pairings/generate/team-swiss`);
          console.log(`Body: { "tournamentId": "${tournamentId}", "round": 1 }`);
          console.log('\n');

          resolve({
            tournamentId,
            tournamentName,
            teamIds,
            playerIds: allPlayerIds
          });

        } catch (error) {
          console.error('❌ Error creating teams/players:', error);
          reject(error);
        }
      }
    );
  });
}

// Run the script
if (require.main === module) {
  generateSampleTeamTournament()
    .then((result) => {
      console.log('✨ Generation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to generate sample tournament:', error);
      process.exit(1);
    });
}

module.exports = { generateSampleTeamTournament };

