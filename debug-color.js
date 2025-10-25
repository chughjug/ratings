#!/usr/bin/env node

/**
 * Debug Color Assignment
 * Debug why the color assignment is wrong
 */

const { BBPPairings } = require('./server/utils/bbpPairings');

console.log('🔍 Debugging Color Assignment\n');

// Test with just two players
const player1 = { 
  id: '1', 
  name: 'GM GADIR GUSEINOV', 
  rating: 2622, 
  points: 0, 
  colorPreference: 'black', 
  absoluteColorPreference: false, 
  strongColorPreference: false, 
  colorImbalance: 0, 
  matches: [] 
};

const player2 = { 
  id: '2', 
  name: 'GM ATHANASIOS MASTROVASILIS', 
  rating: 2514, 
  points: 0, 
  colorPreference: 'none', 
  absoluteColorPreference: false, 
  strongColorPreference: false, 
  colorImbalance: 0, 
  matches: [] 
};

const bbpPairings = new BBPPairings();
const tournament = {
  round: 1,
  section: 'CHAMPIONSHIP 2DAY',
  tournamentId: 'test-tournament',
  colorHistory: {}
};

console.log('Players:');
console.log(`  Player 1: ${player1.name} (${player1.rating})`);
console.log(`  Player 2: ${player2.name} (${player2.rating})`);
console.log(`  Higher rated: ${player1.rating > player2.rating ? player1.name : player2.name}`);

console.log('\nColor Assignment:');
const whitePlayer = bbpPairings.assignColorsSwiss(player1, player2, tournament);
const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;

console.log(`  White: ${whitePlayer.name} (${whitePlayer.rating})`);
console.log(`  Black: ${blackPlayer.name} (${blackPlayer.rating})`);

console.log('\nExpected: Higher rated player should be white');
console.log(`  Expected white: ${player1.rating > player2.rating ? player1.name : player2.name}`);
console.log(`  Actual white: ${whitePlayer.name}`);
console.log(`  Correct: ${whitePlayer.name === (player1.rating > player2.rating ? player1.name : player2.name) ? 'YES' : 'NO'}`);
