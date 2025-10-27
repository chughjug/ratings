const axios = require('axios');

const tournamentId = '0d40d92c-ed28-44df-aa91-f2e992e89d86';

console.log('Verifying and setting PayPal credentials...\n');

// First, get current tournament
axios.get(`https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/tournaments/${tournamentId}`)
  .then(tournamentResponse => {
    console.log('Current tournament data:');
    console.log('- Entry Fee:', tournamentResponse.data.data.entry_fee);
    console.log('- PayPal Client ID:', tournamentResponse.data.data.paypal_client_id ? tournamentResponse.data.data.paypal_client_id.substring(0, 30) + '...' : 'MISSING');
    console.log('- Payment Method:', tournamentResponse.data.data.payment_method);
    
    // Update to ensure PayPal only
    const updateData = {
      entry_fee: 20,
      paypal_client_id: 'AazRC_i2xdF__MU_m_qFHsypNKktktCbUbBh9drb40409ApWHq2WW7Ico9WtEIoCEdCQsSNn4P0fb26-',
      paypal_secret: 'EMOh5-fOvQnLarujK7ZC5mGRJ1R61sGtLTqF2G13GPq7lPyg92NKlXiyOhTGxK0EYvfMFNgEIEg03j-',
      payment_method: 'paypal',  // PayPal only, not 'both'
      stripe_publishable_key: null,
      stripe_secret_key: null
    };
    
    console.log('\nUpdating tournament...');
    return axios.put(`https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/tournaments/${tournamentId}`, updateData);
  })
  .then(async (updateResponse) => {
    console.log('✅ Tournament updated!');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify it saved
    const verify = await axios.get(`https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/tournaments/${tournamentId}`);
    console.log('\n✅ Verified in Database:');
    console.log('- Entry Fee:', verify.data.data.entry_fee);
    console.log('- Payment Method:', verify.data.data.payment_method);
    console.log('- PayPal Client ID:', verify.data.data.paypal_client_id ? verify.data.data.paypal_client_id.substring(0, 30) + '...' : 'STILL MISSING');
    console.log('- PayPal Secret:', verify.data.data.paypal_secret ? '***SET***' : 'MISSING');
    
    // Now check what the registration API returns
    const regApi = await axios.get(`https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/registrations/tournament/${tournamentId}/info`);
    console.log('\n✅ Registration API Returns:');
    console.log('- Entry Fee:', regApi.data.data.entry_fee);
    console.log('- Payment Enabled:', regApi.data.data.payment_enabled);
    console.log('- Payment Method:', regApi.data.data.payment_settings.payment_method);
    console.log('- PayPal Client ID:', regApi.data.data.payment_settings.paypal_client_id ? '***SET***' : 'MISSING');
  })
  .catch(error => {
    console.error('❌ Error:', error.response?.data || error.message);
  });

