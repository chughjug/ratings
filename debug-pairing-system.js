#!/usr/bin/env node

/**
 * Debug Pairing System
 * Test what's actually happening with the pairing generation
 */

const { EnhancedPairingSystem } = require('./server/utils/enhancedPairingSystem');

console.log('🔍 Debugging Pairing System\n');

// Test data
const testPlayers = [
  { 
    id: '1', 
    name: 'STEVE ALAPPATT', 
    rating: 1800, 
    uscf_id: '12345678',
    points: 0, 
    colorPreference: 'white', 
    absoluteColorPreference: false, 
    strongColorPreference: false, 
    colorImbalance: 0, 
    matches: [] 
  },
  { 
    id: '2', 
    name: 'ESHWAR KOTHAPALLI', 
    rating: 1750, 
    uscf_id: '87654321',
    points: 0, 
    colorPreference: 'black', 
    absoluteColorPreference: false, 
    strongColorPreference: false, 
    colorImbalance: 0, 
    matches: [] 
  },
  { 
    id: '3', 
    name: 'JOHN SMITH', 
    rating: 1700, 
    uscf_id: '11223344',
    points: 0, 
    colorPreference: 'none', 
    absoluteColorPreference: false, 
    strongColorPreference: false, 
    colorImbalance: 0, 
    matches: [] 
  },
  { 
    id: '4', 
    name: 'JANE DOE', 
    rating: 1650, 
    uscf_id: '44332211',
    points: 0, 
    colorPreference: 'white', 
    absoluteColorPreference: true, 
    strongColorPreference: false, 
    colorImbalance: 1, 
    matches: [] 
  }
];

console.log('Testing EnhancedPairingSystem with fide_dutch...');

const system = new EnhancedPairingSystem(testPlayers, {
  round: 1,
  section: 'Open',
  tournamentId: 'debug-test',
  pairingSystem: 'fide_dutch'
});

console.log('System options:', system.options);
console.log('Pairing system:', system.options.pairingSystem);

try {
  const pairings = system.generatePairings();
  console.log('\nGenerated pairings:');
  console.log(JSON.stringify(pairings, null, 2));
  
  // Check if it's using bbpPairings
  console.log('\nChecking if bbpPairings is being used...');
  console.log('Pairing count:', pairings.length);
  
  if (pairings.length > 0) {
    console.log('First pairing structure:', Object.keys(pairings[0]));
    console.log('Has white_player_id?', 'white_player_id' in pairings[0]);
    console.log('Has black_player_id?', 'black_player_id' in pairings[0]);
    console.log('Has is_bye?', 'is_bye' in pairings[0]);
  }
  
} catch (error) {
  console.error('Error generating pairings:', error);
  console.error('Stack trace:', error.stack);
}

console.log('\nTesting direct bbpPairings...');
try {
  const { BBPPairings } = require('./server/utils/bbpPairings');
  const bbp = new BBPPairings();
  const directPairings = bbp.generateDutchPairings(testPlayers, {
    round: 1,
    section: 'Open',
    tournamentId: 'debug-test'
  });
  
  console.log('Direct bbpPairings result:');
  console.log(JSON.stringify(directPairings, null, 2));
  
} catch (error) {
  console.error('Error with direct bbpPairings:', error);
  console.error('Stack trace:', error.stack);
}
