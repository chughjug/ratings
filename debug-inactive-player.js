#!/usr/bin/env node

/**
 * Simple test to debug inactive player issue
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugInactivePlayer() {
  console.log('🔍 Debug Inactive Player Issue');
  console.log('==============================\n');

  try {
    // Step 1: Create tournament
    console.log('📝 Creating tournament...');
    const tournamentResponse = await axios.post(`${BASE_URL}/tournaments`, {
      name: 'Debug Inactive Test Tournament',
      format: 'swiss',
      rounds: 1,
      time_control: '90+30',
      start_date: new Date().toISOString().split('T')[0],
      status: 'active'
    });

    const tournamentId = tournamentResponse.data.data.id;
    console.log(`✅ Tournament ID: ${tournamentId}\n`);

    // Step 2: Add 3 players (1 inactive)
    console.log('👥 Adding 3 players (1 inactive)...');
    const players = [
      { name: 'Alice Johnson', rating: 1800, status: 'active' },
      { name: 'Bob Smith', rating: 1700, status: 'active' },
      { name: 'Charlie Brown', rating: 1600, status: 'inactive' }
    ];
    
    for (const player of players) {
      await axios.post(`${BASE_URL}/players`, {
        tournament_id: tournamentId,
        name: player.name,
        rating: player.rating,
        status: player.status
      });
      console.log(`✅ Added ${player.name} (${player.status})`);
    }
    console.log('');

    // Step 3: Check players endpoint to see if status is stored
    console.log('🔍 Checking players endpoint...');
    const playersResponse = await axios.get(`${BASE_URL}/tournaments/${tournamentId}/players`);
    console.log('📊 Players from API:');
    playersResponse.data.forEach(player => {
      console.log(`   - ${player.name}: status=${player.status}, rating=${player.rating}`);
    });
    console.log('');

    // Step 4: Generate pairings
    console.log('🎯 Generating pairings...');
    
    const pairingsResponse = await axios.post(`${BASE_URL}/pairings/generate/section`, {
      tournamentId: tournamentId,
      round: 1,
      sectionName: 'Open',
      clearExisting: true
    });

    console.log('📊 Pairing Response:');
    console.log(JSON.stringify(pairingsResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Error details:', error.response.data.error);
    }
  }
}

// Run the test
if (require.main === module) {
  debugInactivePlayer().catch(console.error);
}

module.exports = { debugInactivePlayer };
