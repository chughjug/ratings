#!/usr/bin/env node

const { searchUSChessPlayers, getPlayerDetails } = require('./server/services/playerSearchNoSelenium');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔍 US Chess Player Search\n');
    console.log('Usage:');
    console.log('  node search-player.js "player name" [maxResults]');
    console.log('  node search-player.js "aarush chugh" 5');
    console.log('  node search-player.js "smith" 10');
    console.log('\nExamples:');
    console.log('  node search-player.js "aarush chugh"');
    console.log('  node search-player.js "john smith" 3');
    process.exit(0);
  }
  
  const searchTerm = args[0];
  const maxResults = parseInt(args[1]) || 5;
  
  console.log('🔍 US Chess Player Search\n');
  console.log(`Searching for: "${searchTerm}"`);
  console.log(`Max results: ${maxResults}\n`);
  
  try {
    const results = await searchUSChessPlayers(searchTerm, maxResults);
    
    console.log(`Found ${results.length} results:`);
    console.log('=' .repeat(50));
    
    results.forEach((player, i) => {
      console.log(`${i + 1}. ${player.name}`);
      console.log(`   USCF ID: ${player.memberId}`);
      console.log(`   State: ${player.state || 'N/A'}`);
      console.log(`   Regular Rating: ${player.rating || 'N/A'}`);
      if (player.ratings.quick) console.log(`   Quick Rating: ${player.ratings.quick}`);
      if (player.ratings.blitz) console.log(`   Blitz Rating: ${player.ratings.blitz}`);
      if (player.ratings.online_regular) console.log(`   Online Regular: ${player.ratings.online_regular}`);
      if (player.ratings.online_quick) console.log(`   Online Quick: ${player.ratings.online_quick}`);
      if (player.ratings.online_blitz) console.log(`   Online Blitz: ${player.ratings.online_blitz}`);
      if (player.expiration_date) console.log(`   Expiration: ${player.expiration_date}`);
      if (player.isMockData) {
        console.log(`   📝 Mock data for development/testing`);
      } else {
        console.log(`   ✅ Real data from US Chess`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Search failed:', error.message);
    process.exit(1);
  }
}

main();
