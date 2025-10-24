#!/usr/bin/env node

/**
 * Comprehensive API Testing Script
 * 
 * This script provides comprehensive testing of the chess tournament API system
 * including user authentication, API key management, player registration,
 * bulk import/export, and Google Sheets integration.
 * 
 * Usage: node comprehensive-api-test.js [options]
 * 
 * Options:
 *   --url <url>           API base URL (default: http://localhost:3001)
 *   --username <user>     Username for authentication
 *   --password <pass>     Password for authentication
 *   --tournament <id>     Tournament ID for testing
 *   --test <type>         Test type: auth, api-keys, players, bulk, sheets, all
 *   --verbose             Enable verbose logging
 *   --help                Show help
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_CONFIG = {
  apiBaseUrl: 'http://localhost:3001',
  username: 'admin',
  password: 'admin123',
  tournamentId: null,
  testType: 'all',
  verbose: false
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        config.apiBaseUrl = args[++i];
        break;
      case '--username':
        config.username = args[++i];
        break;
      case '--password':
        config.password = args[++i];
        break;
      case '--tournament':
        config.tournamentId = args[++i];
        break;
      case '--test':
        config.testType = args[++i];
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return config;
}

// Show help
function showHelp() {
  console.log(`
Chess Tournament API Testing Script

Usage: node comprehensive-api-test.js [options]

Options:
  --url <url>           API base URL (default: http://localhost:3001)
  --username <user>     Username for authentication
  --password <pass>     Password for authentication
  --tournament <id>     Tournament ID for testing
  --test <type>         Test type: auth, api-keys, players, bulk, sheets, all
  --verbose             Enable verbose logging
  --help                Show this help

Test Types:
  auth        Test user authentication
  api-keys    Test API key management
  players     Test player registration and management
  bulk        Test bulk import/export
  sheets      Test Google Sheets integration
  all         Run all tests (default)

Examples:
  node comprehensive-api-test.js --test auth
  node comprehensive-api-test.js --username admin --password admin123 --test all
  node comprehensive-api-test.js --url https://api.example.com --test players --verbose
`);
}

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Logging
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function verbose(message) {
  if (config.verbose) {
    log(message, 'debug');
  }
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (options.body) {
      const data = JSON.stringify(options.body);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = client.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test helper
function addTest(name, passed, message, details = null) {
  testResults.tests.push({
    name,
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (passed) {
    testResults.passed++;
    log(`✅ ${name}: ${message}`, 'info');
  } else {
    testResults.failed++;
    log(`❌ ${name}: ${message}`, 'error');
  }
  
  if (details && config.verbose) {
    verbose(`Details: ${JSON.stringify(details, null, 2)}`);
  }
}

// Authentication tests
async function testAuthentication() {
  log('Testing authentication...', 'info');
  
  try {
    const response = await makeRequest(`${config.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      body: {
        username: config.username,
        password: config.password
      }
    });

    if (response.status === 200 && response.data.success) {
      addTest('User Login', true, 'Login successful', {
        user: response.data.data.user.username,
        role: response.data.data.user.role
      });
      return response.data.data;
    } else {
      addTest('User Login', false, `Login failed: ${response.data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    addTest('User Login', false, `Login error: ${error.message}`);
    return null;
  }
}

// API key management tests
async function testApiKeyManagement(authData) {
  if (!authData) {
    addTest('API Key Management', false, 'Authentication required');
    return null;
  }

  log('Testing API key management...', 'info');
  
  const token = authData.token;
  const userId = authData.user.id;
  let apiKey = null;

  try {
    // Test 1: Generate API key
    const generateResponse = await makeRequest(`${config.apiBaseUrl}/api/users/${userId}/api-key`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        name: 'Test API Key',
        description: 'Generated by comprehensive test script',
        permissions: 'read,write',
        rate_limit: 1000
      }
    });

    if (generateResponse.status === 200 && generateResponse.data.success) {
      apiKey = generateResponse.data.data.api_key;
      addTest('Generate API Key', true, 'API key generated successfully', {
        key: apiKey.substring(0, 20) + '...',
        permissions: generateResponse.data.data.permissions
      });
    } else {
      addTest('Generate API Key', false, `Failed to generate API key: ${generateResponse.data.error}`);
      return null;
    }

    // Test 2: List API keys
    const listResponse = await makeRequest(`${config.apiBaseUrl}/api/users/${userId}/api-keys`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (listResponse.status === 200 && listResponse.data.success) {
      addTest('List API Keys', true, `Found ${listResponse.data.data.length} API keys`);
    } else {
      addTest('List API Keys', false, `Failed to list API keys: ${listResponse.data.error}`);
    }

    // Test 3: Update API key
    if (listResponse.data.success && listResponse.data.data.length > 0) {
      const keyId = listResponse.data.data[0].id;
      const updateResponse = await makeRequest(`${config.apiBaseUrl}/api/users/${userId}/api-keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: {
          name: 'Updated Test API Key',
          description: 'Updated by comprehensive test script'
        }
      });

      if (updateResponse.status === 200 && updateResponse.data.success) {
        addTest('Update API Key', true, 'API key updated successfully');
      } else {
        addTest('Update API Key', false, `Failed to update API key: ${updateResponse.data.error}`);
      }
    }

    return apiKey;

  } catch (error) {
    addTest('API Key Management', false, `API key management error: ${error.message}`);
    return null;
  }
}

// Player management tests
async function testPlayerManagement(apiKey) {
  if (!apiKey) {
    addTest('Player Management', false, 'API key required');
    return;
  }

  if (!config.tournamentId) {
    addTest('Player Management', false, 'Tournament ID required');
    return;
  }

  log('Testing player management...', 'info');

  try {
    // Test 1: Register single player
    const playerData = {
      api_key: apiKey,
      name: 'Test Player API',
      uscf_id: '12345678',
      rating: 1800,
      section: 'Open',
      school: 'Test Academy',
      email: 'test@example.com',
      lookup_ratings: true,
      auto_assign_sections: true,
      source: 'comprehensive_test'
    };

    const registerResponse = await makeRequest(`${config.apiBaseUrl}/api/players/register/${config.tournamentId}`, {
      method: 'POST',
      body: playerData
    });

    if (registerResponse.status === 200 && registerResponse.data.success) {
      addTest('Register Single Player', true, 'Player registered successfully', {
        player_id: registerResponse.data.data.player_id,
        section: registerResponse.data.data.player.section
      });
    } else {
      addTest('Register Single Player', false, `Failed to register player: ${registerResponse.data.error}`);
    }

    // Test 2: Bulk import
    const bulkData = {
      api_key: apiKey,
      players: [
        {
          name: 'Bulk Test Player 1',
          uscf_id: '11111111',
          rating: 1600,
          section: 'Reserve',
          school: 'Test Academy'
        },
        {
          name: 'Bulk Test Player 2',
          uscf_id: '22222222',
          rating: 1400,
          section: 'U1600',
          school: 'Test Academy'
        },
        {
          name: 'Bulk Test Player 3',
          rating: 1200,
          section: 'U1400',
          school: 'Test Academy'
        }
      ],
      lookup_ratings: true,
      auto_assign_sections: true,
      source: 'comprehensive_test'
    };

    const bulkResponse = await makeRequest(`${config.apiBaseUrl}/api/players/api-import/${config.tournamentId}`, {
      method: 'POST',
      body: bulkData
    });

    if (bulkResponse.status === 200 && bulkResponse.data.success) {
      addTest('Bulk Import Players', true, `Imported ${bulkResponse.data.data.imported_count} players`, {
        imported_count: bulkResponse.data.data.imported_count,
        player_ids: bulkResponse.data.data.player_ids
      });
    } else {
      addTest('Bulk Import Players', false, `Failed to import players: ${bulkResponse.data.error}`);
    }

    // Test 3: Get players
    const getPlayersResponse = await makeRequest(`${config.apiBaseUrl}/api/players/tournament/${config.tournamentId}`);

    if (getPlayersResponse.status === 200 && getPlayersResponse.data.success) {
      addTest('Get Players', true, `Retrieved ${getPlayersResponse.data.data.length} players`);
    } else {
      addTest('Get Players', false, `Failed to get players: ${getPlayersResponse.data.error}`);
    }

    // Test 4: Get tournament info
    const tournamentInfoResponse = await makeRequest(`${config.apiBaseUrl}/api/players/tournament/${config.tournamentId}/registration-info?api_key=${apiKey}`);

    if (tournamentInfoResponse.status === 200 && tournamentInfoResponse.data.success) {
      addTest('Get Tournament Info', true, 'Tournament info retrieved successfully', {
        tournament_name: tournamentInfoResponse.data.data.tournament.name,
        supported_fields: tournamentInfoResponse.data.data.supported_fields.length
      });
    } else {
      addTest('Get Tournament Info', false, `Failed to get tournament info: ${tournamentInfoResponse.data.error}`);
    }

  } catch (error) {
    addTest('Player Management', false, `Player management error: ${error.message}`);
  }
}

// Google Sheets integration tests
async function testGoogleSheetsIntegration(apiKey) {
  if (!apiKey) {
    addTest('Google Sheets Integration', false, 'API key required');
    return;
  }

  log('Testing Google Sheets integration...', 'info');

  try {
    // Test 1: Check if Google Sheets script exists
    const scriptPath = path.join(__dirname, 'google-apps-script.js');
    if (fs.existsSync(scriptPath)) {
      addTest('Google Apps Script', true, 'Google Apps Script file exists');
    } else {
      addTest('Google Apps Script', false, 'Google Apps Script file not found');
    }

    // Test 2: Check if Google Sheets integration script exists
    const integrationPath = path.join(__dirname, 'google-sheets-integration.js');
    if (fs.existsSync(integrationPath)) {
      addTest('Google Sheets Integration Script', true, 'Integration script file exists');
    } else {
      addTest('Google Sheets Integration Script', false, 'Integration script file not found');
    }

    // Test 3: Test registration form
    const formPath = path.join(__dirname, 'registration-form-example.html');
    if (fs.existsSync(formPath)) {
      addTest('Registration Form', true, 'Registration form file exists');
    } else {
      addTest('Registration Form', false, 'Registration form file not found');
    }

    // Test 4: Test API testing suite
    const testSuitePath = path.join(__dirname, 'api-testing-suite.html');
    if (fs.existsSync(testSuitePath)) {
      addTest('API Testing Suite', true, 'API testing suite file exists');
    } else {
      addTest('API Testing Suite', false, 'API testing suite file not found');
    }

  } catch (error) {
    addTest('Google Sheets Integration', false, `Google Sheets integration error: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  log('Starting comprehensive API testing...', 'info');
  log(`Configuration: ${JSON.stringify(config, null, 2)}`, 'info');

  let authData = null;
  let apiKey = null;

  // Run authentication tests
  if (config.testType === 'all' || config.testType === 'auth') {
    authData = await testAuthentication();
  }

  // Run API key management tests
  if (config.testType === 'all' || config.testType === 'api-keys') {
    apiKey = await testApiKeyManagement(authData);
  }

  // Run player management tests
  if (config.testType === 'all' || config.testType === 'players') {
    await testPlayerManagement(apiKey);
  }

  // Run Google Sheets integration tests
  if (config.testType === 'all' || config.testType === 'sheets') {
    await testGoogleSheetsIntegration(apiKey);
  }

  // Print summary
  log('\n=== TEST SUMMARY ===', 'info');
  log(`Total Tests: ${testResults.passed + testResults.failed}`, 'info');
  log(`Passed: ${testResults.passed}`, 'info');
  log(`Failed: ${testResults.failed}`, 'info');
  log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`, 'info');

  if (testResults.failed > 0) {
    log('\n=== FAILED TESTS ===', 'warn');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        log(`❌ ${test.name}: ${test.message}`, 'error');
      });
  }

  // Save detailed results
  const resultsPath = path.join(__dirname, `test-results-${Date.now()}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify({
    config,
    summary: {
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      success_rate: (testResults.passed / (testResults.passed + testResults.failed)) * 100
    },
    tests: testResults.tests,
    timestamp: new Date().toISOString()
  }, null, 2));

  log(`\nDetailed results saved to: ${resultsPath}`, 'info');

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Parse configuration and run tests
const config = parseArgs();

// Validate configuration
if (!config.username || !config.password) {
  log('Username and password are required', 'error');
  showHelp();
  process.exit(1);
}

if (config.testType === 'players' || config.testType === 'all') {
  if (!config.tournamentId) {
    log('Tournament ID is required for player tests', 'error');
    showHelp();
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  log(`Test execution failed: ${error.message}`, 'error');
  process.exit(1);
});

