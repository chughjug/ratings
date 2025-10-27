const axios = require('axios');

const tournamentId = '0d40d92c-ed28-44df-aa91-f2e992e89d86';

console.log('Checking tournament info API...');

axios.get(`https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/registrations/tournament/${tournamentId}/info`)
  .then(response => {
    console.log('\nAPI Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\nPayment Settings:');
    console.log('- Entry Fee:', response.data.data?.entry_fee);
    console.log('- Payment Enabled:', response.data.data?.payment_enabled);
    console.log('- Payment Settings:', response.data.data?.payment_settings);
  })
  .catch(error => {
    console.error('Error:', error.response?.data || error.message);
  });

