/**
 * Local Registration Form Test Runner
 * Tests the registration form with PayPal locally
 */

const axios = require('axios');
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:5000';
const TEST_TOURNAMENT_ID = process.argv[2] || 'test-tournament-id';

console.log('🚀 Starting Local Registration Form Test');
console.log('='.repeat(60));
console.log('');
console.log('Make sure your local server is running on port 5000');
console.log('Run: npm start (in the root directory)');
console.log('');
console.log('Testing tournament:', TEST_TOURNAMENT_ID);
console.log('');

// Wait for server to be ready
async function waitForServer() {
  console.log('⏳ Waiting for server to start...');
  
  for (let i = 0; i < 30; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/api/health`);
      if (response.status === 200) {
        console.log('✅ Server is ready!');
        return true;
      }
    } catch (error) {
      // Server not ready yet
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n❌ Server did not start in 30 seconds');
  console.log('Please make sure to run: npm start');
  return false;
}

// Test registration
async function testRegistration() {
  console.log('');
  console.log('🧪 Testing Registration Endpoint...');
  
  try {
    // Test tournament info endpoint
    const infoResponse = await axios.get(
      `${BASE_URL}/api/registrations/tournament/${TEST_TOURNAMENT_ID}/info`
    );
    console.log('✅ Tournament info endpoint accessible');
    
    // Test registration with PayPal
    const registrationData = {
      tournament_id: TEST_TOURNAMENT_ID,
      player_name: 'Test Player',
      email: 'test@example.com',
      phone: '1234567890',
      uscf_id: '12345',
      payment_method: 'paypal',
      payment_status: 'pending'
    };
    
    const submitResponse = await axios.post(
      `${BASE_URL}/api/registrations/submit`,
      registrationData
    );
    
    console.log('✅ Registration submission works');
    console.log('Response:', submitResponse.data);
    
    return true;
  } catch (error) {
    if (error.response) {
      console.log('❌ Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
    return false;
  }
}

// Test payment endpoints
async function testPaymentEndpoints() {
  console.log('');
  console.log('🧪 Testing Payment Endpoints...');
  
  try {
    // Test PayPal order creation
    const orderData = {
      amount: 25.00,
      currency: 'USD',
      tournamentId: TEST_TOURNAMENT_ID,
      playerId: 'test-player',
      description: 'Test entry fee'
    };
    
    const response = await axios.post(
      `${BASE_URL}/api/payments/paypal/create-order`,
      orderData
    );
    
    console.log('✅ PayPal order creation works');
    console.log('Response:', response.data);
    
    return true;
  } catch (error) {
    if (error.response) {
      console.log('⚠️  Payment endpoint:', error.response.status, error.response.data);
    } else {
      console.log('⚠️  Payment endpoint error:', error.message);
    }
    console.log('This is expected if payment routes are not set up locally');
    return false;
  }
}

// Run tests
async function runTests() {
  // Wait for server
  const serverReady = await waitForServer();
  if (!serverReady) {
    process.exit(1);
  }
  
  // Run tests
  await testRegistration();
  await testPaymentEndpoints();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Local tests complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Open browser to: http://localhost:5000');
  console.log('2. Create or select a tournament');
  console.log('3. Click "Register" tab');
  console.log('4. You should see payment buttons');
  console.log('');
  
  process.exit(0);
}

runTests();

