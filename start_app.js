#!/usr/bin/env node

/**
 * Start Application Script
 * Properly starts both client and server to avoid network errors
 */

const { spawn } = require('child_process');
const path = require('path');

let serverProcess = null;
let clientProcess = null;

function cleanup() {
  console.log('\n🛑 Shutting down application...');
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    console.log('   Server stopped');
  }
  
  if (clientProcess) {
    clientProcess.kill('SIGTERM');
    console.log('   Client stopped');
  }
  
  process.exit(0);
}

// Handle cleanup on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

async function startServer() {
  console.log('🚀 Starting server...');
  
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server/index.js'], {
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd()
    });
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[SERVER] ${output.trim()}`);
      
      // Check if server is ready
      if (output.includes('Server running on port') || output.includes('listening on port')) {
        console.log('✅ Server is ready!');
        resolve(true);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`[SERVER ERROR] ${error.trim()}`);
    });
    
    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error.message);
      reject(error);
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Server exited with code ${code}`);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverProcess.killed) {
        console.log('✅ Server started (timeout reached)');
        resolve(true);
      }
    }, 30000);
  });
}

async function startClient() {
  console.log('🌐 Starting client...');
  
  return new Promise((resolve, reject) => {
    clientProcess = spawn('npm', ['start'], {
      stdio: 'pipe',
      shell: true,
      cwd: path.join(process.cwd(), 'client')
    });
    
    clientProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[CLIENT] ${output.trim()}`);
      
      // Check if client is ready
      if (output.includes('webpack compiled') || output.includes('Local:')) {
        console.log('✅ Client is ready!');
        resolve(true);
      }
    });
    
    clientProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`[CLIENT ERROR] ${error.trim()}`);
    });
    
    clientProcess.on('error', (error) => {
      console.error('❌ Failed to start client:', error.message);
      reject(error);
    });
    
    clientProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Client exited with code ${code}`);
        reject(new Error(`Client exited with code ${code}`));
      }
    });
    
    // Timeout after 60 seconds
    setTimeout(() => {
      if (!clientProcess.killed) {
        console.log('✅ Client started (timeout reached)');
        resolve(true);
      }
    }, 60000);
  });
}

async function startApplication() {
  console.log('🎯 Starting Chess Tournament Application...\n');
  
  try {
    // Start server first
    await startServer();
    
    // Wait a moment for server to fully initialize
    console.log('⏳ Waiting for server to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start client
    await startClient();
    
    console.log('\n🎉 Application started successfully!');
    console.log('   • Server: http://localhost:5000');
    console.log('   • Client: http://localhost:3000');
    console.log('   • Press Ctrl+C to stop');
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('\n❌ Failed to start application:', error.message);
    cleanup();
  }
}

// Run the application
if (require.main === module) {
  startApplication();
}

module.exports = {
  startServer,
  startClient,
  startApplication
};
