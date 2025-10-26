const axios = require('axios');

const API_URL = 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api';

async function createOnlineTestTournament() {
  try {
    // Login or use a test account
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin'
    });

    const token = loginResponse.data.data.token;

    // Create online tournament
    const tournamentResponse = await axios.post(`${API_URL}/tournaments`, {
      name: 'Test Online Tournament - 2PlayerChess',
      format: 'online',
      rounds: 5,
      time_control: 'G/30+5',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      is_public: true,
      allow_registration: true,
      city: 'San Francisco',
      state: 'CA',
      location: 'Online',
      chief_td_name: 'Test TD',
      chief_td_uscf_id: '12345678',
      affiliate_id: 'A6000220',
      uscf_rated: true,
      settings: {
        tie_break_criteria: ['buchholz', 'sonnebornBerger'],
        sections: [{
          name: 'Open',
          min_rating: undefined,
          max_rating: undefined,
          description: 'Open section'
        }],
        pairing_type: 'standard',
        bye_points: 0.5
      }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Tournament created:', tournamentResponse.data);
    const tournamentId = tournamentResponse.data.data.id;

    // Add some test players
    const players = [
      { name: 'Player One', uscf_id: '12345001', rating: 1800, section: 'Open' },
      { name: 'Player Two', uscf_id: '12345002', rating: 1700, section: 'Open' },
      { name: 'Player Three', uscf_id: '12345003', rating: 1600, section: 'Open' },
      { name: 'Player Four', uscf_id: '12345004', rating: 1500, section: 'Open' },
      { name: 'Player Five', uscf_id: '12345005', rating: 1400, section: 'Open' },
      { name: 'Player Six', uscf_id: '12345006', rating: 1300, section: 'Open' },
      { name: 'Player Seven', uscf_id: '12345007', rating: 1200, section: 'Open' },
      { name: 'Player Eight', uscf_id: '12345008', rating: 1100, section: 'Open' }
    ];

    for (const player of players) {
      try {
        const playerResponse = await axios.post(`${API_URL}/players`, {
          ...player,
          tournament_id: tournamentId,
          status: 'active'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Added player: ${player.name}`);
      } catch (error) {
        console.error(`❌ Failed to add player ${player.name}:`, error.response?.data || error.message);
      }
    }

    console.log('\n✅ Test tournament created successfully!');
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Tournament URL: https://chess-tournament-director-6ce5e76147d7.herokuapp.com/tournaments/${tournamentId}`);
    console.log(`\nGo to: https://chess-tournament-director-6ce5e76147d7.herokuapp.com/tournaments/${tournamentId}`);
    console.log('\nSteps to test:');
    console.log('1. Login with username: admin, password: admin');
    console.log('2. Navigate to the test tournament');
    console.log('3. Go to Pairings tab');
    console.log('4. Select "Open" section');
    console.log('5. Generate pairings for Round 1');
    console.log('6. You should see the Online Game Generation component');
    console.log('7. Click "Generate Games" to create game links');

    return tournamentId;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

createOnlineTestTournament();

