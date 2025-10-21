#!/usr/bin/env node

/**
 * Network Fix Script
 * Automatically fixes common network issues
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function killExistingProcesses() {
  console.log('🔄 Killing existing processes...');
  
  return new Promise((resolve) => {
    // Kill processes on port 5000 and 3000
    exec('lsof -ti:5000,3000 | xargs kill -9', (error) => {
      if (error) {
        console.log('   No existing processes to kill');
      } else {
        console.log('   ✅ Killed existing processes');
      }
      resolve();
    });
  });
}

async function clearCache() {
  console.log('🧹 Clearing cache...');
  
  try {
    // Clear npm cache
    exec('npm cache clean --force', (error) => {
      if (error) {
        console.log('   npm cache clear failed:', error.message);
      } else {
        console.log('   ✅ npm cache cleared');
      }
    });
    
    // Clear node_modules and reinstall
    if (fs.existsSync('node_modules')) {
      console.log('   Removing node_modules...');
      fs.rmSync('node_modules', { recursive: true, force: true });
      console.log('   ✅ node_modules removed');
    }
    
    if (fs.existsSync('client/node_modules')) {
      console.log('   Removing client/node_modules...');
      fs.rmSync('client/node_modules', { recursive: true, force: true });
      console.log('   ✅ client/node_modules removed');
    }
    
  } catch (error) {
    console.log('   Cache clear error:', error.message);
  }
}

async function reinstallDependencies() {
  console.log('📦 Reinstalling dependencies...');
  
  return new Promise((resolve) => {
    exec('npm install', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ Server dependencies install failed:', error.message);
      } else {
        console.log('   ✅ Server dependencies installed');
      }
      
      // Install client dependencies
      exec('cd client && npm install', (error2, stdout2, stderr2) => {
        if (error2) {
          console.log('   ❌ Client dependencies install failed:', error2.message);
        } else {
          console.log('   ✅ Client dependencies installed');
        }
        resolve();
      });
    });
  });
}

async function buildClient() {
  console.log('🏗️  Building client...');
  
  return new Promise((resolve) => {
    exec('cd client && npm run build', (error, stdout, stderr) => {
      if (error) {
        console.log('   ❌ Client build failed:', error.message);
        console.log('   stderr:', stderr);
      } else {
        console.log('   ✅ Client built successfully');
      }
      resolve();
    });
  });
}

async function startServer() {
  console.log('🚀 Starting server...');
  
  return new Promise((resolve) => {
    const server = spawn('node', ['server/index.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    server.on('error', (error) => {
      console.log('   ❌ Server start failed:', error.message);
      resolve(false);
    });
    
    // Give server time to start
    setTimeout(() => {
      console.log('   ✅ Server started (checking in 3 seconds...)');
      resolve(true);
    }, 3000);
  });
}

async function testConnection() {
  console.log('🧪 Testing connection...');
  
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const axios = require('axios');
        const response = await axios.get('http://localhost:5000/api/players/test', {
          timeout: 5000
        });
        
        console.log('   ✅ Server is responding');
        console.log(`   Status: ${response.status}`);
        resolve(true);
      } catch (error) {
        console.log('   ❌ Server test failed:', error.message);
        resolve(false);
      }
    }, 2000);
  });
}

async function runNetworkFix() {
  console.log('🔧 Starting Network Fix...\n');
  
  try {
    // Step 1: Kill existing processes
    await killExistingProcesses();
    
    // Step 2: Clear cache
    await clearCache();
    
    // Step 3: Reinstall dependencies
    await reinstallDependencies();
    
    // Step 4: Build client
    await buildClient();
    
    // Step 5: Start server
    const serverStarted = await startServer();
    
    if (serverStarted) {
      // Step 6: Test connection
      const connectionWorking = await testConnection();
      
      console.log('\n🎯 Network Fix Summary:');
      console.log('========================');
      console.log(`Server Started: ${serverStarted ? '✅ Yes' : '❌ No'}`);
      console.log(`Connection Working: ${connectionWorking ? '✅ Yes' : '❌ No'}`);
      
      if (connectionWorking) {
        console.log('\n🎉 Network issues fixed! You can now use the application.');
        console.log('   • Open http://localhost:3000 in your browser');
        console.log('   • The API is running on http://localhost:5000');
      } else {
        console.log('\n⚠️  Server started but connection test failed.');
        console.log('   • Check server logs for errors');
        console.log('   • Try running: node network_diagnostic.js');
      }
    } else {
      console.log('\n❌ Failed to start server. Check the logs above for errors.');
    }
    
  } catch (error) {
    console.error('❌ Network fix failed:', error);
  }
}

// Run the fix
if (require.main === module) {
  runNetworkFix();
}

module.exports = {
  killExistingProcesses,
  clearCache,
  reinstallDependencies,
  buildClient,
  startServer,
  testConnection,
  runNetworkFix
};
