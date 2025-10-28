const axios = require('axios');

const tournamentId = '0d40d92c-ed28-44df-aa91-f2e992e89d86';

console.log('Waiting 5 seconds for app to be fully restarted...\n');
await new Promise(resolve => setTimeout(resolve, 5000));

const updateData = {
  entry_fee: 20,
  paypal_client_id: 'AazRC_i2xdF__MU_m_qFHsypNKktktCbUbBh9drb40409ApWHq2WW7Ico9WtEIoCEdCQsSNn4P0fb26-',
  paypal_secret: 'EMOh5-fOvQnLarujK7ZC5mGRJ1R61sGtLTqF2G13GPq7lPyg92NKlXiyOhTGxK0EYvfMFNgEIEg03j-',
  payment_method: 'paypal'
};

console.log('Sending PayPal credentials to tournament...\n');

axios.put(`https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/tournaments/${tournamentId}`, updateData)
  .then(async (response) => {
    console.log('✅ Update successful!');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verify = await axios.get(`https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/registrations/tournament/${tournamentId}/info`);
    console.log('\n✅ Verification:');
    console.log('- Entry Fee:', verify.data.data.entry_fee);
    console.log('- PayPal Client ID:', verify.data.data.payment_settings.paypal_client_id ? '***SET***' : 'MISSING');
    console.log('- Payment Method:', verify.data.data.payment_settings.payment_method);
    
    if (verify.data.data.entry_fee === 20 && verify.data.data.payment_settings.paypal_client_id) {
      console.log('\n🎉 SUCCESS! PayPal credentials are configured!');
    } else {
      console.log('\n⚠️  Still missing credentials. Check database columns.');
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.response?.data || error.message);
  });



