#!/usr/bin/env node

/**
 * Quick Fix Script
 * Fixes the most common network and compilation issues
 */

const { exec } = require('child_process');
const fs = require('fs');

async function runCommand(command, description) {
  console.log(`🔧 ${description}...`);
  
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ ${description} failed:`, error.message);
        resolve(false);
      } else {
        console.log(`   ✅ ${description} completed`);
        if (stdout.trim()) {
          console.log(`   Output: ${stdout.trim()}`);
        }
        resolve(true);
      }
    });
  });
}

async function quickFix() {
  console.log('🚀 Quick Fix for Network Issues...\n');
  
  try {
    // 1. Kill any existing processes
    console.log('1️⃣ Killing existing processes...');
    await runCommand('pkill -f "node.*server"', 'Kill server processes');
    await runCommand('pkill -f "npm.*start"', 'Kill client processes');
    
    // 2. Clear npm cache
    console.log('\n2️⃣ Clearing npm cache...');
    await runCommand('npm cache clean --force', 'Clear npm cache');
    
    // 3. Install dependencies
    console.log('\n3️⃣ Installing dependencies...');
    await runCommand('npm install', 'Install server dependencies');
    await runCommand('cd client && npm install', 'Install client dependencies');
    
    // 4. Build client
    console.log('\n4️⃣ Building client...');
    await runCommand('cd client && npm run build', 'Build client');
    
    // 5. Check if server can start
    console.log('\n5️⃣ Testing server startup...');
    const serverTest = await runCommand('timeout 10s node server/index.js', 'Test server startup');
    
    if (serverTest) {
      console.log('\n✅ Quick fix completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Run: node start_app.js');
      console.log('   2. Or manually:');
      console.log('      - Terminal 1: node server/index.js');
      console.log('      - Terminal 2: cd client && npm start');
      console.log('   3. Open http://localhost:3000 in your browser');
    } else {
      console.log('\n⚠️  Some issues remain. Try running:');
      console.log('   • node network_diagnostic.js');
      console.log('   • node fix_network.js');
    }
    
  } catch (error) {
    console.error('\n❌ Quick fix failed:', error.message);
  }
}

// Run the quick fix
if (require.main === module) {
  quickFix();
}

module.exports = { quickFix };
