/**
 * bbpPairings JavaScript Implementation
 * Based on the C++ bbpPairings library algorithms
 * Implements Dutch and Burstein Swiss system pairing algorithms
 */

class BbpPairings {
  constructor() {
    this.maxPlayers = 9999;
    this.maxPoints = 1998;
    this.maxRounds = 50;
  }

  /**
   * Check if a player is eligible for a bye
   * Based on bbpPairings eligibleForBye function
   */
  eligibleForBye(player) {
    for (const match of player.matches || []) {
      if (!match.gameWasPlayed && match.participatedInPairing && match.result === 'win') {
        return false; // Player already received a pairing-allocated bye
      }
    }
    return true;
  }

  /**
   * Check if two color preferences are compatible
   * Based on bbpPairings colorPreferencesAreCompatible function
   */
  colorPreferencesAreCompatible(pref1, pref2) {
    return pref1 !== pref2 || !pref1 || !pref2 || pref1 === 'none' || pref2 === 'none';
  }

  /**
   * Choose neutral color based on compatible preferences
   * Based on bbpPairings choosePlayerNeutralColor function
   */
  choosePlayerNeutralColor(player1, player2) {
    // Check if color preferences are compatible
    if (this.colorPreferencesAreCompatible(player1.colorPreference, player2.colorPreference)) {
      if (player1.colorPreference && player1.colorPreference !== 'none') {
        return player1.colorPreference;
      } else if (player2.colorPreference && player2.colorPreference !== 'none') {
        return player2.colorPreference === 'white' ? 'black' : 'white';
      } else {
        return null; // Both have no preference
      }
    }
    
    // Handle absolute color preferences
    if (player1.absoluteColorPreference && player2.absoluteColorPreference) {
      if (player1.colorImbalance > player2.colorImbalance) {
        return player1.colorPreference;
      } else if (player2.colorImbalance > player1.colorImbalance) {
        return player2.colorPreference === 'white' ? 'black' : 'white';
      }
    }
    
    // Handle strong color preferences
    if (player1.strongColorPreference && !player2.strongColorPreference) {
      return player1.colorPreference;
    }
    if (player2.strongColorPreference && !player1.strongColorPreference) {
      return player2.colorPreference === 'white' ? 'black' : 'white';
    }
    
    // Check for repeated color patterns
    const player1Colors = this.getLastTwoColors(player1);
    const player2Colors = this.getLastTwoColors(player2);
    
    if (player1Colors === 'WW' && player2Colors !== 'WW') {
      return 'black'; // Give black to player1
    }
    if (player2Colors === 'WW' && player1Colors !== 'WW') {
      return 'white'; // Give white to player1
    }
    
    return null; // No clear preference
  }

  /**
   * Get the last two colors played by a player
   */
  getLastTwoColors(player) {
    const colors = [];
    for (const match of (player.matches || []).slice(-2)) {
      if (match.gameWasPlayed) {
        colors.push(match.color === 'white' ? 'W' : 'B');
      }
    }
    return colors.join('');
  }

  /**
   * Choose player color based on bbpPairings algorithm
   * Based on bbpPairings choosePlayerColor function
   */
  choosePlayerColor(player, opponent, tournament) {
    const result = this.choosePlayerNeutralColor(player, opponent);
    
    if (result !== null) {
      return result === 'white' ? player : opponent;
    }
    
    // Default based on rank index (like bbpPairings)
    if (player.rankIndex !== undefined && opponent.rankIndex !== undefined) {
      return player.rankIndex < opponent.rankIndex ? player : opponent;
    }
    
    // Fallback to rating
    return (player.rating || 0) > (opponent.rating || 0) ? player : opponent;
  }

  /**
   * Compute edge weight for Dutch system pairing
   * Based on bbpPairings computeEdgeWeight function
   */
  computeEdgeWeight(player1, player2, sameScoreGroup, useDueColor) {
    // Check compatibility
    if (player1.forbiddenPairs && player1.forbiddenPairs.has(player2.id)) {
      return 0;
    }
    
    if (player1.absoluteColorPreference && player2.absoluteColorPreference && 
        player1.colorPreference === player2.colorPreference) {
      return 0;
    }
    
    let weight = 1; // Compatible multiplier
    
    if (sameScoreGroup) {
      weight += 1; // Same score group multiplier
      
      if (useDueColor && this.colorPreferencesAreCompatible(player1.colorPreference, player2.colorPreference)) {
        weight += 1; // Color multiplier
      }
    }
    
    return weight;
  }

  /**
   * Generate Dutch system pairings
   * Based on bbpPairings Dutch algorithm
   */
  generateDutchPairings(players, tournament) {
    const pairings = [];
    const used = new Set();
    
    // Sort players by score (descending)
    const sortedPlayers = [...players].sort((a, b) => {
      const scoreA = this.getPlayerScore(a, tournament);
      const scoreB = this.getPlayerScore(b, tournament);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (b.rating || 0) - (a.rating || 0);
    });
    
    // Group players by score
    const scoreGroups = this.groupPlayersByScore(sortedPlayers, tournament);
    
    for (const score of Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a))) {
      const group = scoreGroups[score];
      
      // Handle odd number of players with bye
      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            bye_type: 'bye'
          });
          group.splice(group.indexOf(byePlayer), 1);
          used.add(byePlayer.id);
        }
      }
      
      // Pair remaining players
      this.pairGroupDutch(group, pairings, used, tournament);
    }
    
    return pairings;
  }

  /**
   * Pair players within a group using Dutch system
   */
  pairGroupDutch(group, pairings, used, tournament) {
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const half = Math.floor(sortedGroup.length / 2);
    
    for (let i = 0; i < half; i++) {
      const topPlayer = sortedGroup[i];
      const bottomPlayer = sortedGroup[i + half];
      
      if (!used.has(topPlayer.id) && !used.has(bottomPlayer.id)) {
        const whitePlayer = this.choosePlayerColor(topPlayer, bottomPlayer, tournament);
        const blackPlayer = whitePlayer.id === topPlayer.id ? bottomPlayer : topPlayer;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false
        });
        
        used.add(topPlayer.id);
        used.add(bottomPlayer.id);
      }
    }
  }

  /**
   * Generate Burstein system pairings
   * Based on bbpPairings Burstein algorithm
   */
  generateBursteinPairings(players, tournament) {
    const pairings = [];
    const used = new Set();
    
    // Calculate tiebreak scores
    const playersWithScores = players.map(player => ({
      ...player,
      sonnebornBerger: this.calculateSonnebornBerger(player, tournament),
      buchholz: this.calculateBuchholz(player, tournament)
    }));
    
    // Sort by score and tiebreaks
    const sortedPlayers = playersWithScores.sort((a, b) => {
      const scoreA = this.getPlayerScore(a, tournament);
      const scoreB = this.getPlayerScore(b, tournament);
      if (scoreA !== scoreB) return scoreB - scoreA;
      if (a.sonnebornBerger !== b.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
      if (a.buchholz !== b.buchholz) return b.buchholz - a.buchholz;
      return (b.rating || 0) - (a.rating || 0);
    });
    
    // Group by score
    const scoreGroups = this.groupPlayersByScore(sortedPlayers, tournament);
    
    for (const score of Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a))) {
      const group = scoreGroups[score];
      
      // Handle bye
      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            bye_type: 'bye'
          });
          group.splice(group.indexOf(byePlayer), 1);
          used.add(byePlayer.id);
        }
      }
      
      // Pair remaining players
      this.pairGroupBurstein(group, pairings, used, tournament);
    }
    
    return pairings;
  }

  /**
   * Pair players within a group using Burstein system
   */
  pairGroupBurstein(group, pairings, used, tournament) {
    const sortedGroup = [...group].sort((a, b) => {
      if (a.sonnebornBerger !== b.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger;
      if (a.buchholz !== b.buchholz) return b.buchholz - a.buchholz;
      return (b.rating || 0) - (a.rating || 0);
    });
    
    for (let i = 0; i < sortedGroup.length - 1; i += 2) {
      const player1 = sortedGroup[i];
      const player2 = sortedGroup[i + 1];
      
      if (!used.has(player1.id) && !used.has(player2.id)) {
        const whitePlayer = this.choosePlayerColor(player1, player2, tournament);
        const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false
        });
        
        used.add(player1.id);
        used.add(player2.id);
      }
    }
  }

  /**
   * Select the best player for a bye
   */
  selectByePlayer(group) {
    const sortedGroup = [...group].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    
    for (const player of sortedGroup) {
      if (this.eligibleForBye(player)) {
        return player;
      }
    }
    
    return null;
  }

  /**
   * Group players by score
   */
  groupPlayersByScore(players, tournament) {
    const groups = {};
    
    for (const player of players) {
      const score = this.getPlayerScore(player, tournament);
      if (!groups[score]) {
        groups[score] = [];
      }
      groups[score].push(player);
    }
    
    return groups;
  }

  /**
   * Get player score
   */
  getPlayerScore(player, tournament) {
    let score = 0;
    for (const match of player.matches || []) {
      if (match.gameWasPlayed) {
        score += this.getMatchPoints(match, tournament);
      }
    }
    return score;
  }

  /**
   * Get match points
   */
  getMatchPoints(match, tournament) {
    switch (match.result) {
      case 'win': return tournament.pointsForWin || 1;
      case 'draw': return tournament.pointsForDraw || 0.5;
      case 'loss': return tournament.pointsForLoss || 0;
      default: return 0;
    }
  }

  /**
   * Calculate Sonneborn-Berger score
   */
  calculateSonnebornBerger(player, tournament) {
    let score = 0;
    for (const match of player.matches || []) {
      if (match.gameWasPlayed && match.opponent) {
        const opponentScore = this.getPlayerScore({ matches: match.opponentMatches || [] }, tournament);
        const matchPoints = this.getMatchPoints(match, tournament);
        score += opponentScore * matchPoints;
      }
    }
    return score;
  }

  /**
   * Calculate Buchholz score
   */
  calculateBuchholz(player, tournament) {
    let score = 0;
    for (const match of player.matches || []) {
      if (match.gameWasPlayed && match.opponent) {
        const opponentScore = this.getPlayerScore({ matches: match.opponentMatches || [] }, tournament);
        score += opponentScore;
      }
    }
    return score;
  }
}

module.exports = { BBPPairings: BbpPairings };
