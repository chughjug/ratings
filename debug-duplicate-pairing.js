#!/usr/bin/env node

/**
 * Simple test to debug the duplicate pairing issue
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function debugDuplicatePairing() {
  console.log('🔍 Debug Duplicate Pairing Issue');
  console.log('=================================\n');

  try {
    // Step 1: Create tournament
    console.log('📝 Creating tournament...');
    const tournamentResponse = await axios.post(`${BASE_URL}/tournaments`, {
      name: 'Debug Duplicate Test Tournament',
      format: 'swiss',
      rounds: 2,
      time_control: '90+30',
      start_date: new Date().toISOString().split('T')[0],
      status: 'active'
    });

    const tournamentId = tournamentResponse.data.data.id;
    console.log(`✅ Tournament ID: ${tournamentId}\n`);

    // Step 2: Add 5 players
    console.log('👥 Adding 5 players...');
    const players = [
      { name: 'Alice Johnson', rating: 1800 },
      { name: 'Bob Smith', rating: 1700 },
      { name: 'Charlie Brown', rating: 1600 },
      { name: 'Diana Prince', rating: 1500 },
      { name: 'Eve Wilson', rating: 1400 }
    ];
    
    for (const player of players) {
      await axios.post(`${BASE_URL}/players`, {
        tournament_id: tournamentId,
        name: player.name,
        rating: player.rating
      });
      console.log(`✅ Added ${player.name}`);
    }
    console.log('');

    // Step 3: Generate pairings for round 1
    console.log('🎯 Generating pairings for Round 1...');
    
    const pairingsResponse = await axios.post(`${BASE_URL}/pairings/generate/section`, {
      tournamentId: tournamentId,
      round: 1,
      sectionName: 'Open',
      clearExisting: true
    });

    console.log('📊 Round 1 Pairings:');
    const pairings = pairingsResponse.data.pairings || [];
    pairings.forEach((pairing, index) => {
      console.log(`   Board ${pairing.board}: ${pairing.white_player_id} vs ${pairing.black_player_id} (bye: ${pairing.is_bye}, type: ${pairing.bye_type})`);
    });

    // Step 4: Generate pairings for round 2
    console.log('\n🎯 Generating pairings for Round 2...');
    
    const pairingsResponse2 = await axios.post(`${BASE_URL}/pairings/generate/section`, {
      tournamentId: tournamentId,
      round: 2,
      sectionName: 'Open',
      clearExisting: true
    });

    console.log('📊 Round 2 Pairings:');
    const pairings2 = pairingsResponse2.data.pairings || [];
    pairings2.forEach((pairing, index) => {
      console.log(`   Board ${pairing.board}: ${pairing.white_player_id} vs ${pairing.black_player_id} (bye: ${pairing.is_bye}, type: ${pairing.bye_type})`);
    });

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Error details:', error.response.data.error);
    }
  }
}

// Run the test
if (require.main === module) {
  debugDuplicatePairing().catch(console.error);
}

module.exports = { debugDuplicatePairing };
