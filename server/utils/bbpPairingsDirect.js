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
   * From dutch.cpp lines 554-582
   */
  choosePlayerColor(player, opponent, tournament) {
    const result = this.choosePlayerNeutralColor(player, opponent);
    
    if (result !== this.COLOR_NONE) {
      return result;
    } else {
      // Fallback logic based on rank and initial color
      const playerRank = player.rankIndex || 0;
      const opponentRank = opponent.rankIndex || 0;
      const initialColor = tournament.initialColor || this.COLOR_WHITE;
      
      if (player.colorPreference === this.COLOR_NONE) {
        // Use rank-based alternation
        return (opponentRank & 1) ? initialColor : this.invert(initialColor);
      } else {
        // Use color preferences
        return this.acceleratedScoreRankCompare(player, opponent, tournament) 
          ? this.invert(opponent.colorPreference)
          : player.colorPreference;
      }
    }
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
   * Generate Round 1 pairings with proper color alternation
   * Based on Swiss system Round 1 rules
   */
  generateRound1Pairings(players, tournament) {
    // Sort players by rating (descending)
    const sortedPlayers = players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const pairings = [];
    
    const halfLength = Math.floor(sortedPlayers.length / 2);
    
    for (let i = 0; i < halfLength; i++) {
      const player1 = sortedPlayers[i]; // Higher rated
      const player2 = sortedPlayers[i + halfLength]; // Lower rated
      
      // For Round 1, use simple alternating pattern
      // Board 1: higher rated white, Board 2: lower rated white, etc.
      const whitePlayer = i % 2 === 0 ? player1 : player2;
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
   * Generate Dutch system pairings
   * Main entry point
   */
  generateDutchPairings(players, tournament) {
    if (players.length < 2) return [];
    
    if (tournament.round === 1) {
      return this.generateRound1Pairings(players, tournament);
    }
    
    // For subsequent rounds, use the full Dutch algorithm
    // This is a simplified version - the full algorithm is very complex
    return this.generateSwissPairings(players, tournament);
  }

  /**
   * Generate Swiss pairings for subsequent rounds
   * Simplified version of the full Dutch algorithm
   */
  generateSwissPairings(players, tournament) {
    // Sort players by score, then rating
    const sortedPlayers = players.sort((a, b) => {
      const scoreA = a.points || 0;
      const scoreB = b.points || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.rating || 0) - (a.rating || 0);
    });
    
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
        
        used.add(i);
        used.add(bestOpponent);
      }
    }
    
    return pairings;
  }

  /**
   * Check if two players can be paired
   */
  canBePaired(player1, player2, tournament) {
    // Check if they've played before
    for (const match of player1.matches || []) {
      if (match.opponent === player2.id && match.gameWasPlayed) {
        return false;
      }
    }
    
    // Check color preferences compatibility
    return this.colorPreferencesAreCompatible(player1.colorPreference, player2.colorPreference);
  }

  /**
   * Calculate pairing score (higher is better)
   */
  calculatePairingScore(player1, player2, tournament) {
    let score = 0;
    
    // Prefer similar ratings
    const ratingDiff = Math.abs((player1.rating || 0) - (player2.rating || 0));
    score += 1000 - ratingDiff; // Higher score for smaller difference
    
    // Prefer compatible color preferences
    if (this.colorPreferencesAreCompatible(player1.colorPreference, player2.colorPreference)) {
      score += 100;
    }
    
    return score;
  }
}

module.exports = { BBPPairingsDirect };

