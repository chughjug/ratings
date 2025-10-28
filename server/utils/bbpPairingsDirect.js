/**
 * Direct implementation of bbpPairings logic
 * Based on the exact C++ code from bbpPairings-master
 */

class BBPPairingsDirect {
  constructor() {
    this.COLOR_WHITE = 'white';
    this.COLOR_BLACK = 'black';
    this.COLOR_NONE = 'none';
  }

  /**
   * Check if two color preferences are compatible
   * From common.h lines 101-109
   */
  colorPreferencesAreCompatible(preference0, preference1) {
    return preference0 !== preference1 || 
           preference0 === this.COLOR_NONE || 
           preference1 === this.COLOR_NONE;
  }

  /**
   * Check if player is eligible for bye
   * From common.h lines 115-128
   */
  eligibleForBye(player) {
    for (const match of player.matches || []) {
      if (!match.gameWasPlayed && 
          match.participatedInPairing && 
          match.matchScore === 'win') {
        return false;
      }
    }
    return true;
  }

  /**
   * Find first color difference between two players
   * From common.cpp lines 216-242
   */
  findFirstColorDifference(player0, player1) {
    let iterator0 = (player0.matches || []).slice().reverse();
    let iterator1 = (player1.matches || []).slice().reverse();
    
    // Skip unplayed games
    iterator0 = iterator0.filter(match => match.gameWasPlayed);
    iterator1 = iterator1.filter(match => match.gameWasPlayed);
    
    let color0 = this.COLOR_NONE;
    let color1 = this.COLOR_NONE;
    
    for (let i = 0; i < Math.min(iterator0.length, iterator1.length); i++) {
      if (iterator0[i].color !== iterator1[i].color) {
        color0 = iterator0[i].color;
        color1 = iterator1[i].color;
        break;
      }
    }
    
    return { color0, color1 };
  }

  /**
   * Choose neutral color preference between two players
   * From common.cpp lines 250-316
   */
  choosePlayerNeutralColor(player, opponent) {
    if (this.colorPreferencesAreCompatible(player.colorPreference, opponent.colorPreference)) {
      if (player.colorPreference !== this.COLOR_NONE) {
        return player.colorPreference;
      } else if (opponent.colorPreference !== this.COLOR_NONE) {
        return this.invert(opponent.colorPreference);
      } else {
        return this.COLOR_NONE;
      }
    } else if (player.absoluteColorPreference && 
               (player.colorImbalance > opponent.colorImbalance || !opponent.absoluteColorPreference)) {
      return player.colorPreference;
    } else if (opponent.absoluteColorPreference && 
               (opponent.colorImbalance > player.colorImbalance || !player.absoluteColorPreference)) {
      return this.invert(opponent.colorPreference);
    } else if (player.strongColorPreference && !opponent.strongColorPreference) {
      return player.colorPreference;
    } else if (opponent.strongColorPreference && !player.strongColorPreference) {
      return this.invert(opponent.colorPreference);
    } else {
      const { color0, color1 } = this.findFirstColorDifference(player, opponent);
      if (color0 !== this.COLOR_NONE && color1 !== this.COLOR_NONE) {
        return color1;
      } else {
        return this.COLOR_NONE;
      }
    }
  }

  /**
   * Invert color
   */
  invert(color) {
    return color === this.COLOR_WHITE ? this.COLOR_BLACK : this.COLOR_WHITE;
  }

  /**
   * Choose player color - main color assignment function
   * Color equalization takes precedence over higher seed getting white
   */
  choosePlayerColor(player1, player2, tournament) {
    const colorHistory = tournament.colorHistory || {};
    
    // Get color balance for each player
    const getColorBalance = (playerId) => {
      const history = colorHistory[playerId] || [];
      if (!Array.isArray(history)) return 0;
      return history.reduce((sum, color) => sum + (color === 1 ? 1 : -1), 0);
    };
    
    const balance1 = getColorBalance(player1.id);
    const balance2 = getColorBalance(player2.id);
    
    // Rule 1: Player with more black pieces should get white (highest priority)
    if (balance1 < balance2) {
      return this.COLOR_WHITE; // player1 gets white
    } else if (balance1 > balance2) {
      return this.COLOR_BLACK; // player1 gets black (player2 gets white)
    }
    
    // Equal balance: use consistent ordering (color equalization takes precedence)
    return player1.id < player2.id ? this.COLOR_WHITE : this.COLOR_BLACK;
  }

  /**
   * Compare players by accelerated score rank
   * Simplified version for ranking
   */
  acceleratedScoreRankCompare(player1, player2, tournament) {
    const score1 = player1.scoreWithAcceleration || player1.points || 0;
    const score2 = player2.scoreWithAcceleration || player2.points || 0;
    
    if (score1 !== score2) {
      return score1 > score2;
    }
    
    // Tiebreak by rating
    const rating1 = player1.rating || 0;
    const rating2 = player2.rating || 0;
    return rating1 > rating2;
  }

  /**
   * Generate Round 1 pairings with proper Swiss system pattern
   * Based on Swiss system Round 1 rules: 1 vs n/2+1, 2 vs n/2+2, etc.
   */
  generateRound1Pairings(players, tournament) {
    // Sort players by rating (descending)
    const sortedPlayers = players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const pairings = [];
    
    const halfLength = Math.floor(sortedPlayers.length / 2);
    
    for (let i = 0; i < halfLength; i++) {
      const player1 = sortedPlayers[i]; // Higher rated (1, 2, 3, ...)
      const player2 = sortedPlayers[i + halfLength]; // Lower rated (n/2+1, n/2+2, ...)
      
      // Use bbpPairings color assignment logic for proper color balancing
      const whiteColor = this.choosePlayerColor(player1, player2, tournament);
      const whitePlayer = whiteColor === this.COLOR_WHITE ? player1 : player2;
      const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
      
      pairings.push({
        white_player_id: whitePlayer.id,
        black_player_id: blackPlayer.id,
        is_bye: false,
        section: tournament.section,
        round: tournament.round
      });
    }
    
    return pairings;
  }


  /**
   * Generate Swiss pairings for subsequent rounds
   * Simplified version of the full Dutch algorithm
   */
  generateSwissPairings(players, tournament) {
    console.log(`[BBPPairingsDirect] generateSwissPairings called with ${players.length} players for round ${tournament.round}`);
    
    // Sort players by score, then rating
    const sortedPlayers = players.sort((a, b) => {
      const scoreA = a.points || 0;
      const scoreB = b.points || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.rating || 0) - (a.rating || 0);
    });
    
    console.log(`[BBPPairingsDirect] Sorted players:`, sortedPlayers.map(p => ({ id: p.id, name: p.name, points: p.points, rating: p.rating })));
    
    const pairings = [];
    const used = new Set();
    
    for (let i = 0; i < sortedPlayers.length; i++) {
      if (used.has(i)) continue;
      
      let bestOpponent = null;
      let bestScore = -1;
      
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        if (used.has(j)) continue;
        
        // Check if players can be paired
        if (this.canBePaired(sortedPlayers[i], sortedPlayers[j], tournament)) {
          const score = this.calculatePairingScore(sortedPlayers[i], sortedPlayers[j], tournament);
          if (score > bestScore) {
            bestScore = score;
            bestOpponent = j;
          }
        }
      }
      
      if (bestOpponent !== null) {
        const player1 = sortedPlayers[i];
        const player2 = sortedPlayers[bestOpponent];
        
        // Use the color assignment algorithm
        const tournamentWithBoard = { ...tournament, boardNumber: pairings.length + 1 };
        const whiteColor = this.choosePlayerColor(player1, player2, tournamentWithBoard);
        const whitePlayer = whiteColor === this.COLOR_WHITE ? player1 : player2;
        const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: tournament.section,
          round: tournament.round
        });
        
        used.add(i);
        used.add(bestOpponent);
      }
    }
    
    console.log(`[BBPPairingsDirect] Generated ${pairings.length} Swiss pairings`);
    return pairings;
  }

  /**
   * Check if two players can be paired
   */
  async canBePaired(player1, player2, tournament, db = null) {
    // Ensure players aren't paired with themselves
    if (player1.id === player2.id) {
      return false;
    }
    
    // If no database provided, use simplified checking
    if (!db) {
      return true;
    }
    
    // Check if players have already met in this tournament
    return new Promise((resolve, reject) => {
      const query = `
        SELECT COUNT(*) as count 
        FROM pairings 
        WHERE tournament_id = ? 
        AND (
          (white_player_id = ? AND black_player_id = ?) 
          OR (white_player_id = ? AND black_player_id = ?)
        )
      `;
      
      db.get(query, [
        tournament.id || tournament.tournament_id,
        player1.id,
        player2.id,
        player2.id,
        player1.id
      ], (err, row) => {
        if (err) {
          console.error('Error checking pairing history:', err);
          // Default to allowing the pairing if we can't check
          resolve(true);
          return;
        }
        
        // Players haven't met if count is 0
        resolve(row.count === 0);
      });
    });
  }

  /**
   * Calculate pairing score (higher is better)
   */
  calculatePairingScore(player1, player2, tournament) {
    let score = 0;
    
    // Prefer similar ratings
    const ratingDiff = Math.abs((player1.rating || 0) - (player2.rating || 0));
    score += 1000 - ratingDiff; // Higher score for smaller difference
    
    // Prefer similar scores
    const scoreDiff = Math.abs((player1.points || 0) - (player2.points || 0));
    score += 500 - scoreDiff; // Higher score for similar scores
    
    return score;
  }

  /**
   * Generate Dutch pairings for a round
   */
  generateDutchPairings(players, tournament) {
    if (tournament.round === 1) {
      return this.generateRound1Pairings(players, tournament);
    } else {
      return this.generateSwissPairings(players, tournament);
    }
  }


  /**
   * Generate tournament pairings (placeholder)
   */
  generateTournamentPairings(tournament) {
    // This would be implemented to handle multiple sections
    return [];
  }
}

module.exports = { BBPPairingsDirect };

