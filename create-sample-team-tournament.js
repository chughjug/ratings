/**
 * Script to create a sample team tournament with multiple sections
 * Imports players from CSV, creates teams, and generates pairings
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const API_BASE_URL = process.env.API_BASE_URL || 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTournament() {
  log('\n=== Creating Team Tournament ===', 'blue');
  
  const tournamentData = {
    name: 'Sample Team Tournament - Multi-Section',
    format: 'team-tournament',
    rounds: 5,
    time_control: 'G/90;inc30',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    city: 'Various',
    state: 'CA',
    location: 'Multiple Cities'
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/tournaments`, tournamentData);
    log(`✓ Tournament created: ${response.data.data.name} (ID: ${response.data.data.id})`, 'green');
    return response.data.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
    const status = error.response?.status || 'No status';
    log(`✗ Error creating tournament (${status}): ${errorMsg}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log(`  Make sure the server is running at ${API_BASE_URL}`, 'yellow');
    }
    throw error;
  }
}

async function importPlayersFromCSV(tournamentId, csvPath) {
  log('\n=== Importing Players from CSV ===', 'blue');
  
  const playerData = []; // Store original CSV data with team_name
  const sections = new Set();
  const teamsBySection = {}; // Track teams per section
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        if (row.Name) {
          const section = row.Section || 'Open';
          const teamName = row['Team Name'] || row.Team || 'Unnamed Team';
          sections.add(section);
          
          // Track teams per section
          if (!teamsBySection[section]) {
            teamsBySection[section] = new Set();
          }
          teamsBySection[section].add(teamName);
          
          // Store original data including team_name for later use
          playerData.push({
            name: row.Name.trim(),
            uscf_id: row['USCF ID'] || null,
            rating: parseInt(row.Rating) || 0,
            section: section,
            team_name: teamName, // Keep for team assignment
            email: row.Email || null,
            city: row.City || null,
            state: row.State || null,
            status: row.Status || 'active'
          });
        }
      })
      .on('end', async () => {
        log(`✓ Parsed ${playerData.length} players from ${sections.size} sections`, 'green');
        log(`  Sections: ${Array.from(sections).join(', ')}`, 'yellow');
        
        // Log teams per section
        for (const [section, teams] of Object.entries(teamsBySection)) {
          log(`  ${section}: ${teams.size} teams (${Array.from(teams).join(', ')})`, 'yellow');
        }
        
        // Import players (without team_name - that's handled separately)
        try {
          const importPromises = playerData.map(player => {
            const { team_name, ...playerForImport } = player;
            return axios.post(`${API_BASE_URL}/players`, {
              tournament_id: tournamentId,
              ...playerForImport
            }).catch(err => {
              log(`  ⚠ Error importing ${player.name}: ${err.response?.data?.error || err.message}`, 'yellow');
              return null;
            });
          });
          
          const results = await Promise.all(importPromises);
          const successful = results.filter(r => r !== null);
          log(`✓ Imported ${successful.length}/${playerData.length} players`, 'green');
          
          // Map imported players back to their original data including team_name
          const playersWithTeamInfo = successful.map((result, index) => {
            const importedPlayer = result?.data?.data || result?.data;
            const originalData = playerData[results.indexOf(result)];
            return {
              ...importedPlayer,
              originalTeamName: originalData.team_name, // Preserve team assignment info
              originalSection: originalData.section
            };
          });
          
          resolve({ 
            players: playersWithTeamInfo, 
            sections: Array.from(sections),
            teamsBySection: Object.fromEntries(
              Object.entries(teamsBySection).map(([section, teams]) => [section, Array.from(teams)])
            )
          });
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function createTeamsFromSections(tournamentId, sections, players, teamsBySection) {
  log('\n=== Creating Teams from Sections ===', 'blue');
  log(`  Total players available: ${players.length}`, 'yellow');
  
  const teams = {};
  let totalTeamsCreated = 0;
  
  // Group players by section and team name
  for (const section of sections) {
    const sectionTeams = teamsBySection[section] || [];
    log(`  Processing section: ${section} (${sectionTeams.length} teams)`, 'yellow');
    
    for (const teamName of sectionTeams) {
      // Get players for this specific team in this section
      // Players now have originalTeamName and originalSection preserved
      const teamPlayers = players.filter(p => {
        const playerData = p.data || p;
        const playerSection = playerData.originalSection || playerData.section || 'Open';
        const playerTeamName = playerData.originalTeamName || playerData.team_name || playerData.team || '';
        const matches = playerSection === section && playerTeamName === teamName;
        return matches;
      });
      
      if (teamPlayers.length === 0) {
        log(`  ⚠ No players found for team ${teamName} in section ${section}`, 'yellow');
        continue;
      }
      
      log(`  Found ${teamPlayers.length} players for ${teamName}`, 'yellow');
      
      // Sort players by rating (descending) for board order
      teamPlayers.sort((a, b) => {
        const ratingA = (a.data || a).rating || 0;
        const ratingB = (b.data || b).rating || 0;
        return ratingB - ratingA;
      });
      
      try {
        const captainId = teamPlayers[0]?.data?.id || teamPlayers[0]?.id;
        if (!captainId) {
          log(`  ⚠ Skipping team ${teamName} - no captain ID available`, 'yellow');
          continue;
        }
        
        const response = await axios.post(`${API_BASE_URL}/teams/team-tournament/${tournamentId}/create`, {
          name: teamName,
          section: section,
          captain_id: captainId
        });
        
        const team = response.data.data;
        const key = `${section}_${teamName}`;
        teams[key] = { team, players: teamPlayers, section };
        totalTeamsCreated++;
        log(`✓ Created team: ${teamName} in ${section} section (${teamPlayers.length} players, ID: ${team.id})`, 'green');
      } catch (error) {
        const errorMsg = error.response?.data?.error || error.message;
        log(`✗ Error creating team ${teamName} in ${section}: ${errorMsg}`, 'red');
        // Continue with other teams even if one fails
      }
    }
  }
  
  log(`\n✓ Total teams created: ${totalTeamsCreated}`, 'green');
  return teams;
}

async function addPlayersToTeams(tournamentId, teams) {
  log('\n=== Adding Players to Teams ===', 'blue');
  
  for (const [key, { team, players, section }] of Object.entries(teams)) {
    log(`  Adding players to ${team.name} (${section})...`, 'yellow');
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const playerId = player.data?.id || player.id;
      const boardNumber = i + 1; // Board 1 = strongest player
      
      try {
        await axios.post(`${API_BASE_URL}/teams/team-tournament/${team.id}/add-player`, {
          player_id: playerId
        });
        // Only log first few players to avoid spam
        if (i < 3 || i === players.length - 1) {
          log(`    ✓ Added ${player.data?.name || player.name} to board ${boardNumber}`, 'green');
        }
      } catch (error) {
        log(`    ✗ Error adding player ${player.data?.name || player.name}: ${error.response?.data?.error || error.message}`, 'red');
      }
    }
    log(`    ✓ All ${players.length} players added to ${team.name}`, 'green');
  }
}

async function generatePairings(tournamentId, round) {
  log(`\n=== Generating Pairings for Round ${round} ===`, 'blue');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/pairings/generate/team-swiss`, {
      tournamentId: tournamentId,
      round: round
    });
    log(`✓ Generated ${response.data.pairings?.length || 0} pairings`, 'green');
    
    if (response.data.pairings) {
      log(`  Team matches: ${response.data.totalGames || 0}`, 'yellow');
    }
    
    return response.data;
  } catch (error) {
    log(`✗ Error generating pairings: ${error.response?.data?.error || error.message}`, 'red');
    if (error.response?.data) {
      log(`  Details: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    throw error;
  }
}

async function displayStandings(tournamentId) {
  log('\n=== Team Standings ===', 'blue');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/teams/tournament/${tournamentId}/standings`);
    const standings = response.data.standings || [];
    
    // Group by section
    const bySection = {};
    standings.forEach(team => {
      const section = team.section || 'Open';
      if (!bySection[section]) bySection[section] = [];
      bySection[section].push(team);
    });
    
    // Display standings by section
    for (const [section, teams] of Object.entries(bySection)) {
      log(`\n${section} Section:`, 'yellow');
      log('Rank | Team Name | MP | GP | W-D-L', 'yellow');
      log('----------------------------------------', 'yellow');
      
      teams.forEach((team, index) => {
        const rank = team.rank || index + 1;
        const mp = (team.match_points || 0).toFixed(1);
        const gp = (team.game_points || 0).toFixed(1);
        const wdl = `${team.match_wins || 0}-${team.match_draws || 0}-${team.match_losses || 0}`;
        log(`${rank.toString().padStart(2)}. | ${team.team_name.padEnd(20)} | ${mp.padStart(4)} | ${gp.padStart(4)} | ${wdl}`, 'green');
      });
    }
  } catch (error) {
    log(`✗ Error fetching standings: ${error.response?.data?.error || error.message}`, 'red');
  }
}

async function main() {
  log('\n═══════════════════════════════════════════════════════════════', 'blue');
  log('  Sample Team Tournament Setup Script', 'blue');
  log('═══════════════════════════════════════════════════════════════', 'blue');
  
  const csvPath = path.join(__dirname, 'sample_team_tournament_multi_teams.csv');
  
  if (!fs.existsSync(csvPath)) {
    log(`✗ CSV file not found: ${csvPath}`, 'red');
    process.exit(1);
  }
  
  try {
    // Step 1: Create tournament
    const tournament = await createTournament();
    const tournamentId = tournament.id;
    
    // Step 2: Import players
    const { players, sections, teamsBySection } = await importPlayersFromCSV(tournamentId, csvPath);
    
    // Step 3: Create teams (multiple teams per section)
    const teams = await createTeamsFromSections(tournamentId, sections, players, teamsBySection);
    
    // Step 4: Add players to teams
    await addPlayersToTeams(tournamentId, teams);
    
    // Step 5: Generate Round 1 pairings
    await generatePairings(tournamentId, 1);
    
    // Step 6: Display standings
    await displayStandings(tournamentId);
    
    log('\n═══════════════════════════════════════════════════════════════', 'green');
    log(`  ✓ Tournament setup complete!`, 'green');
    log(`  Tournament ID: ${tournamentId}`, 'green');
    log(`  View in browser at: http://localhost:3000/tournaments/${tournamentId}`, 'green');
    log('═══════════════════════════════════════════════════════════════', 'green');
    
  } catch (error) {
    log(`\n✗ Script failed: ${error.message}`, 'red');
    if (error.response) {
      log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };

