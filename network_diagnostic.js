#!/usr/bin/env node

/**
 * Network Diagnostic Script
 * Helps troubleshoot network connectivity issues
 */

const axios = require('axios');
const { spawn } = require('child_process');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function checkServerStatus() {
  console.log('🔍 Checking server status...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/players/test`, {
      timeout: 5000
    });
    
    console.log('✅ Server is running and responding');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.log('❌ Server is not responding');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   → Server is not running on port 5000');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   → Cannot resolve localhost');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   → Server is running but not responding');
    }
    
    return false;
  }
}

async function checkPortAvailability() {
  console.log('\n🔍 Checking port availability...');
  
  return new Promise((resolve) => {
    const netstat = spawn('netstat', ['-an'], { shell: true });
    let output = '';
    
    netstat.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    netstat.on('close', (code) => {
      const port5000 = output.includes(':5000');
      const port3000 = output.includes(':3000');
      
      console.log(`   Port 5000 (API): ${port5000 ? '✅ In use' : '❌ Available'}`);
      console.log(`   Port 3000 (Client): ${port3000 ? '✅ In use' : '❌ Available'}`);
      
      resolve({ port5000, port3000 });
    });
    
    netstat.on('error', (err) => {
      console.log('   Could not check port status:', err.message);
      resolve({ port5000: false, port3000: false });
    });
  });
}

async function testSearchEndpoint() {
  console.log('\n🔍 Testing search endpoint...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/players/search?q=smith&limit=5`, {
      timeout: 10000
    });
    
    console.log('✅ Search endpoint is working');
    console.log(`   Status: ${response.status}`);
    console.log(`   Players found: ${response.data.data?.players?.length || 0}`);
    return true;
  } catch (error) {
    console.log('❌ Search endpoint failed');
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking environment variables...');
  
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    API_URL: process.env.API_URL,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL
  };
  
  console.log('   Environment variables:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`   ${key}: ${value || 'Not set'}`);
  });
  
  return envVars;
}

async function runNetworkDiagnostic() {
  console.log('🚀 Starting Network Diagnostic...\n');
  
  try {
    // Check environment variables
    const envVars = await checkEnvironmentVariables();
    
    // Check port availability
    const ports = await checkPortAvailability();
    
    // Check server status
    const serverRunning = await checkServerStatus();
    
    // Test search endpoint if server is running
    let searchWorking = false;
    if (serverRunning) {
      searchWorking = await testSearchEndpoint();
    }
    
    // Summary
    console.log('\n📊 Network Diagnostic Summary:');
    console.log('==============================');
    
    console.log(`\n🌐 Server Status:`);
    console.log(`   Running: ${serverRunning ? '✅ Yes' : '❌ No'}`);
    console.log(`   Port 5000: ${ports.port5000 ? '✅ In use' : '❌ Available'}`);
    
    console.log(`\n🔍 API Endpoints:`);
    console.log(`   Search: ${searchWorking ? '✅ Working' : '❌ Failed'}`);
    
    console.log(`\n⚙️  Configuration:`);
    console.log(`   API URL: ${API_BASE_URL}`);
    console.log(`   Environment: ${envVars.NODE_ENV || 'development'}`);
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (!serverRunning) {
      console.log('   1. Start the server: npm run server');
      console.log('   2. Check if port 5000 is available');
      console.log('   3. Verify server dependencies are installed');
    }
    
    if (serverRunning && !searchWorking) {
      console.log('   1. Check server logs for errors');
      console.log('   2. Verify search service dependencies');
      console.log('   3. Test with a simpler endpoint first');
    }
    
    if (!ports.port5000 && !serverRunning) {
      console.log('   1. Port 5000 is available - server should start');
    }
    
    console.log('\n🔧 Quick Fixes:');
    console.log('   • Restart server: npm run server');
    console.log('   • Clear browser cache and reload');
    console.log('   • Check firewall settings');
    console.log('   • Verify localhost resolution');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Run the diagnostic
if (require.main === module) {
  runNetworkDiagnostic();
}

module.exports = {
  checkServerStatus,
  checkPortAvailability,
  testSearchEndpoint,
  checkEnvironmentVariables,
  runNetworkDiagnostic
};
