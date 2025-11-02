const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTournament() {
  log('\n=== Creating Team Tournament ===', 'blue');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/tournaments`, {
      name: 'Test Team Tournament - Multi Section',
      format: 'team-tournament',
      rounds: 3,
      time_control: 'G/90+30',
      start_date: new Date().toISOString().split('T')[0],
      city: 'Test City',
      state: 'TS',
      settings: {
        sections: [
          { name: 'Elementary', rating_min: 0, rating_max: 999 },
          { name: 'Middle', rating_min: 1000, rating_max: 1499 },
          { name: 'High', rating_min: 1500, rating_max: 3000 }
        ]
      }
    });
    
    if (response.data.success) {
      const tournament = response.data.data;
      log(`✓ Tournament created: ${tournament.name} (ID: ${tournament.id})`, 'green');
      return tournament;
    } else {
      throw new Error(response.data.error || 'Failed to create tournament');
    }
  } catch (error) {
    log(`✗ Error creating tournament: ${error.response?.data?.error || error.message}`, 'red');
    throw error;
  }
}

async function importPlayers(tournamentId) {
  log('\n=== Importing Players ===', 'blue');
  
  // Create test players data
  const players = [
    // Elementary Section - Team A
    { name: 'Alice Anderson', rating: 800, section: 'Elementary', team: 'Red Dragons', uscf_id: 'E001' },
    { name: 'Bob Brown', rating: 750, section: 'Elementary', team: 'Red Dragons', uscf_id: 'E002' },
    { name: 'Charlie Chen', rating: 700, section: 'Elementary', team: 'Red Dragons', uscf_id: 'E003' },
    { name: 'Diana Davis', rating: 650, section: 'Elementary', team: 'Red Dragons', uscf_id: 'E004' },
    { name: 'Eve Evans', rating: 600, section: 'Elementary', team: 'Red Dragons', uscf_id: 'E005' },
    
    // Elementary Section - Team B
    { name: 'Frank Foster', rating: 850, section: 'Elementary', team: 'Blue Knights', uscf_id: 'E006' },
    { name: 'Grace Green', rating: 780, section: 'Elementary', team: 'Blue Knights', uscf_id: 'E007' },
    { name: 'Henry Hill', rating: 720, section: 'Elementary', team: 'Blue Knights', uscf_id: 'E008' },
    { name: 'Ivy Irving', rating: 680, section: 'Elementary', team: 'Blue Knights', uscf_id: 'E009' },
    { name: 'Jack Jones', rating: 630, section: 'Elementary', team: 'Blue Knights', uscf_id: 'E010' },
    
    // Elementary Section - Team C
    { name: 'Kelly King', rating: 820, section: 'Elementary', team: 'Green Tigers', uscf_id: 'E011' },
    { name: 'Liam Lee', rating: 770, section: 'Elementary', team: 'Green Tigers', uscf_id: 'E012' },
    { name: 'Mia Moore', rating: 710, section: 'Elementary', team: 'Green Tigers', uscf_id: 'E013' },
    { name: 'Noah Nelson', rating: 670, section: 'Elementary', team: 'Green Tigers', uscf_id: 'E014' },
    { name: 'Olivia Olson', rating: 620, section: 'Elementary', team: 'Green Tigers', uscf_id: 'E015' },
    
    // Middle Section - Team A
    { name: 'Peter Parker', rating: 1200, section: 'Middle', team: 'Wildcats', uscf_id: 'M001' },
    { name: 'Quinn Quick', rating: 1150, section: 'Middle', team: 'Wildcats', uscf_id: 'M002' },
    { name: 'Rachel Rose', rating: 1100, section: 'Middle', team: 'Wildcats', uscf_id: 'M003' },
    { name: 'Sam Smith', rating: 1050, section: 'Middle', team: 'Wildcats', uscf_id: 'M004' },
    { name: 'Tom Taylor', rating: 1000, section: 'Middle', team: 'Wildcats', uscf_id: 'M005' },
    
    // Middle Section - Team B
    { name: 'Uma Underwood', rating: 1250, section: 'Middle', team: 'Thunderbolts', uscf_id: 'M006' },
    { name: 'Victor Vega', rating: 1180, section: 'Middle', team: 'Thunderbolts', uscf_id: 'M007' },
    { name: 'Wendy White', rating: 1120, section: 'Middle', team: 'Thunderbolts', uscf_id: 'M008' },
    { name: 'Xavier Xeno', rating: 1080, section: 'Middle', team: 'Thunderbolts', uscf_id: 'M009' },
    { name: 'Yara Young', rating: 1020, section: 'Middle', team: 'Thunderbolts', uscf_id: 'M010' },
    
    // High Section - Team A
    { name: 'Zoe Zane', rating: 1800, section: 'High', team: 'Chess Champions', uscf_id: 'H001' },
    { name: 'Alex Ace', rating: 1750, section: 'High', team: 'Chess Champions', uscf_id: 'H002' },
    { name: 'Blake Best', rating: 1700, section: 'High', team: 'Chess Champions', uscf_id: 'H003' },
    { name: 'Casey Crown', rating: 1650, section: 'High', team: 'Chess Champions', uscf_id: 'H004' },
    { name: 'Drew Deuce', rating: 1600, section: 'High', team: 'Chess Champions', uscf_id: 'H005' },
    
    // High Section - Team B
    { name: 'Emma Elite', rating: 1850, section: 'High', team: 'Grandmasters', uscf_id: 'H006' },
    { name: 'Finn First', rating: 1780, section: 'High', team: 'Grandmasters', uscf_id: 'H007' },
    { name: 'Gina Grand', rating: 1720, section: 'High', team: 'Grandmasters', uscf_id: 'H008' },
    { name: 'Hank High', rating: 1680, section: 'High', team: 'Grandmasters', uscf_id: 'H009' },
    { name: 'Iris Ideal', rating: 1620, section: 'High', team: 'Grandmasters', uscf_id: 'H010' }
  ];
  
  const importedPlayers = [];
  for (const player of players) {
    try {
      const response = await axios.post(`${API_BASE_URL}/players`, {
        tournament_id: tournamentId,
        name: player.name,
        rating: player.rating,
        section: player.section,
        uscf_id: player.uscf_id,
        status: 'active'
      });
      
      if (response.data.success) {
        importedPlayers.push({
          ...response.data.data,
          originalTeam: player.team,
          originalSection: player.section
        });
        log(`  ✓ ${player.name} (${player.section} - ${player.team})`, 'green');
      }
    } catch (error) {
      log(`  ✗ Error importing ${player.name}: ${error.response?.data?.error || error.message}`, 'red');
    }
  }
  
  log(`\n✓ Imported ${importedPlayers.length}/${players.length} players`, 'green');
  return importedPlayers;
}

async function createTeams(tournamentId, players) {
  log('\n=== Creating Teams ===', 'blue');
  
  // Group players by section and team
  const teamsBySection = {};
  players.forEach(player => {
    const section = player.originalSection || player.section || 'Open';
    const teamName = player.originalTeam || 'Unnamed';
    
    if (!teamsBySection[section]) {
      teamsBySection[section] = {};
    }
    if (!teamsBySection[section][teamName]) {
      teamsBySection[section][teamName] = [];
    }
    teamsBySection[section][teamName].push(player);
  });
  
  const teams = [];
  for (const [section, teamsInSection] of Object.entries(teamsBySection)) {
    for (const [teamName, teamPlayers] of Object.entries(teamsInSection)) {
      // Sort by rating (descending)
      teamPlayers.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      try {
        const response = await axios.post(`${API_BASE_URL}/teams/team-tournament/${tournamentId}/create`, {
          name: teamName,
          section: section,
          captain_id: teamPlayers[0].id
        });
        
        if (response.data.success) {
          const team = response.data.data;
          teams.push({ team, players: teamPlayers, section });
          log(`✓ Created team: ${teamName} (${section}) - ${teamPlayers.length} players`, 'green');
        }
      } catch (error) {
        log(`✗ Error creating team ${teamName}: ${error.response?.data?.error || error.message}`, 'red');
      }
    }
  }
  
  return teams;
}

async function addPlayersToTeams(teams) {
  log('\n=== Adding Players to Teams ===', 'blue');
  
  for (const { team, players } of teams) {
    log(`  Adding players to ${team.name}...`, 'yellow');
    for (const player of players) {
      try {
        await axios.post(`${API_BASE_URL}/teams/team-tournament/${team.id}/add-player`, {
          player_id: player.id
        });
      } catch (error) {
        log(`    ✗ Error adding ${player.name}: ${error.response?.data?.error || error.message}`, 'red');
      }
    }
    log(`    ✓ Added ${players.length} players`, 'green');
  }
}

async function generatePairings(tournamentId, round) {
  log(`\n=== Generating Pairings for Round ${round} ===`, 'blue');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/pairings/generate/team-swiss`, {
      tournamentId: tournamentId,
      round: round
    });
    
    if (response.data.success) {
      const pairings = response.data.pairings || [];
      log(`✓ Generated ${pairings.length} individual pairings`, 'green');
      
      if (pairings.length > 0) {
        // Group by team matches
        const teamMatches = {};
        pairings.forEach(p => {
          const key = `${p.team1_id || p.team1Id || 'BYE'}_${p.team2_id || p.team2Id || 'BYE'}`;
          if (!teamMatches[key]) {
            teamMatches[key] = {
              team1: p.team1_name || p.team1Name || 'BYE',
              team2: p.team2_name || p.team2Name || 'BYE',
              section: p.section || 'Unknown',
              boards: []
            };
          }
          if (p.white_name && p.black_name) {
            teamMatches[key].boards.push({
              board: p.board || '?',
              white: p.white_name,
              black: p.black_name
            });
          }
        });
        
        log(`\n  Team Matches:`, 'yellow');
        Object.values(teamMatches).forEach(match => {
          log(`    ${match.team1} vs ${match.team2} (${match.section}) - ${match.boards.length} boards`, 'yellow');
        });
      } else {
        log(`  ⚠ No pairings returned - check server logs`, 'yellow');
      }
      
      return response.data;
    } else {
      throw new Error(response.data.error || 'Failed to generate pairings');
    }
  } catch (error) {
    log(`✗ Error generating pairings: ${error.response?.data?.error || error.message}`, 'red');
    if (error.response?.data) {
      log(`  Details: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    throw error;
  }
}

async function checkStandings(tournamentId) {
  log('\n=== Team Standings ===', 'blue');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/teams/team-tournament/${tournamentId}`);
    
    if (response.data.success) {
      const teams = response.data.teams || [];
      
      // Group by section
      const teamsBySection = {};
      teams.forEach(team => {
        const section = team.section || 'Open';
        if (!teamsBySection[section]) {
          teamsBySection[section] = [];
        }
        teamsBySection[section].push(team);
      });
      
      for (const [section, sectionTeams] of Object.entries(teamsBySection)) {
        log(`\n${section} Section:`, 'yellow');
        sectionTeams.forEach((team, idx) => {
          log(`  ${idx + 1}. ${team.name} - ${team.member_count || 0} members`, 'green');
        });
      }
    }
  } catch (error) {
    log(`✗ Error fetching standings: ${error.response?.data?.error || error.message}`, 'red');
  }
}

async function main() {
  try {
    log('\n═══════════════════════════════════════════════════════════════', 'blue');
    log('  Test Team Tournament Setup', 'blue');
    log('═══════════════════════════════════════════════════════════════', 'blue');
    
    // Step 1: Create tournament
    const tournament = await createTournament();
    const tournamentId = tournament.id;
    
    // Step 2: Import players
    const players = await importPlayers(tournamentId);
    
    // Step 3: Create teams
    const teams = await createTeams(tournamentId, players);
    
    // Step 4: Add players to teams
    await addPlayersToTeams(teams);
    
    // Step 5: Generate Round 1 pairings
    await generatePairings(tournamentId, 1);
    
    // Step 6: Check standings
    await checkStandings(tournamentId);
    
    log('\n═══════════════════════════════════════════════════════════════', 'green');
    log(`  ✓ Tournament setup complete!`, 'green');
    log(`  Tournament ID: ${tournamentId}`, 'green');
    log(`  View at: https://chess-tournament-director-6ce5e76147d7.herokuapp.com/tournaments/${tournamentId}`, 'green');
    log('═══════════════════════════════════════════════════════════════', 'green');
    
  } catch (error) {
    log(`\n✗ Script failed: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    process.exit(1);
  }
}

main();

