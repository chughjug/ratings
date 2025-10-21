/**
 * Round-Robin Tournament Service
 * Handles round-robin tournament pairings and management
 */

/**
 * Generate round-robin pairings for a given number of players
 * Uses the standard round-robin algorithm
 */
function generateRoundRobinPairings(players, round) {
  if (players.length < 2) {
    return [];
  }
  
  const n = players.length;
  const isOdd = n % 2 === 1;
  const actualN = isOdd ? n + 1 : n; // Add dummy player if odd number
  
  // Create array with dummy player if needed
  const playerArray = [...players];
  if (isOdd) {
    playerArray.push({ id: 'dummy', name: 'Bye', isDummy: true });
  }
  
  const pairings = [];
  const totalRounds = actualN - 1;
  
  // Round-robin algorithm
  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    if (roundNum === round) {
      // Generate pairings for this specific round
      for (let i = 0; i < actualN / 2; i++) {
        const home = playerArray[i];
        const away = playerArray[actualN - 1 - i];
        
        // Skip if either player is dummy
        if (home.isDummy || away.isDummy) {
          if (home.isDummy) {
            pairings.push({
              white_player_id: away.id,
              black_player_id: null,
              is_bye: true,
              board: i + 1
            });
          } else if (away.isDummy) {
            pairings.push({
              white_player_id: home.id,
              black_player_id: null,
              is_bye: true,
              board: i + 1
            });
          }
        } else {
          // Alternate colors based on round and board
          const isWhiteHome = (roundNum + i) % 2 === 0;
          pairings.push({
            white_player_id: isWhiteHome ? home.id : away.id,
            black_player_id: isWhiteHome ? away.id : home.id,
            is_bye: false,
            board: i + 1
          });
        }
      }
      break;
    }
    
    // Rotate players for next round (except first player)
    const firstPlayer = playerArray[0];
    const lastPlayer = playerArray[actualN - 1];
    const secondPlayer = playerArray[1];
    
    // Move last player to second position
    playerArray[1] = lastPlayer;
    playerArray[actualN - 1] = secondPlayer;
    
    // Rotate all other players
    for (let i = 2; i < actualN - 1; i++) {
      const temp = playerArray[i];
      playerArray[i] = playerArray[i + 1];
      playerArray[i + 1] = temp;
    }
  }
  
  return pairings;
}

/**
 * Generate all round-robin pairings for a tournament
 */
function generateAllRoundRobinPairings(players) {
  if (players.length < 2) {
    return [];
  }
  
  const n = players.length;
  const isOdd = n % 2 === 1;
  const actualN = isOdd ? n + 1 : n;
  const totalRounds = actualN - 1;
  
  const allPairings = [];
  
  // Create array with dummy player if needed
  const playerArray = [...players];
  if (isOdd) {
    playerArray.push({ id: 'dummy', name: 'Bye', isDummy: true });
  }
  
  // Generate pairings for each round
  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const roundPairings = [];
    
    for (let i = 0; i < actualN / 2; i++) {
      const home = playerArray[i];
      const away = playerArray[actualN - 1 - i];
      
      // Skip if either player is dummy
      if (home.isDummy || away.isDummy) {
        if (home.isDummy) {
          roundPairings.push({
            white_player_id: away.id,
            black_player_id: null,
            is_bye: true,
            board: i + 1,
            round: roundNum
          });
        } else if (away.isDummy) {
          roundPairings.push({
            white_player_id: home.id,
            black_player_id: null,
            is_bye: true,
            board: i + 1,
            round: roundNum
          });
        }
      } else {
        // Alternate colors based on round and board
        const isWhiteHome = (roundNum + i) % 2 === 0;
        roundPairings.push({
          white_player_id: isWhiteHome ? home.id : away.id,
          black_player_id: isWhiteHome ? away.id : home.id,
          is_bye: false,
          board: i + 1,
          round: roundNum
        });
      }
    }
    
    allPairings.push({
      round: roundNum,
      pairings: roundPairings
    });
    
    // Rotate players for next round (except first player)
    if (roundNum < totalRounds) {
      const firstPlayer = playerArray[0];
      const lastPlayer = playerArray[actualN - 1];
      const secondPlayer = playerArray[1];
      
      // Move last player to second position
      playerArray[1] = lastPlayer;
      playerArray[actualN - 1] = secondPlayer;
      
      // Rotate all other players
      for (let i = 2; i < actualN - 1; i++) {
        const temp = playerArray[i];
        playerArray[i] = playerArray[i + 1];
        playerArray[i + 1] = temp;
      }
    }
  }
  
  return allPairings;
}

/**
 * Calculate round-robin standings
 */
function calculateRoundRobinStandings(players, results) {
  const standings = players.map(player => {
    const playerResults = results.filter(r => r.player_id === player.id);
    const points = playerResults.reduce((sum, r) => sum + (r.points || 0), 0);
    const gamesPlayed = playerResults.length;
    const wins = playerResults.filter(r => r.result === '1-0' || r.result === '1-0F').length;
    const draws = playerResults.filter(r => r.result === '1/2-1/2' || r.result === '1/2-1/2F').length;
    const losses = playerResults.filter(r => r.result === '0-1' || r.result === '0-1F').length;
    
    return {
      ...player,
      points,
      gamesPlayed,
      wins,
      draws,
      losses,
      percentage: gamesPlayed > 0 ? (points / gamesPlayed) : 0
    };
  });
  
  // Sort by points (descending), then by percentage (descending)
  return standings.sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    return b.percentage - a.percentage;
  });
}

/**
 * Get round-robin tournament statistics
 */
function getRoundRobinStats(players, results) {
  const totalGames = results.length;
  const totalRounds = Math.ceil(players.length / 2);
  const completedRounds = Math.max(...results.map(r => r.round || 0), 0);
  
  const winDistribution = {
    white: results.filter(r => r.result === '1-0' || r.result === '1-0F').length,
    black: results.filter(r => r.result === '0-1' || r.result === '0-1F').length,
    draws: results.filter(r => r.result === '1/2-1/2' || r.result === '1/2-1/2F').length
  };
  
  return {
    totalPlayers: players.length,
    totalRounds,
    completedRounds,
    totalGames,
    winDistribution,
    averagePoints: results.reduce((sum, r) => sum + (r.points || 0), 0) / Math.max(players.length, 1)
  };
}

module.exports = {
  generateRoundRobinPairings,
  generateAllRoundRobinPairings,
  calculateRoundRobinStandings,
  getRoundRobinStats
};
