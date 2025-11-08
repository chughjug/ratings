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
  getLastTwoColors(player, colorHistory = {}) {
    // First try to get from color history if available
    if (colorHistory && colorHistory[player.id] && Array.isArray(colorHistory[player.id])) {
      return colorHistory[player.id].slice(-2).join('');
    }
    
    // Fallback to player matches
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
            bye_type: 'unpaired' // Full point bye for odd number of opponents
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
            bye_type: 'unpaired' // Full point bye for odd number of opponents
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

  /**
   * Generate Dutch system pairings
   * Based on bbpPairings Dutch algorithm
   */
  generateDutchPairings(players, tournament) {
    if (players.length < 2) return [];

    // Sort players by standings
    const sortedPlayers = this.sortPlayersByStandings(players, tournament);
    
    // Group by score
    const scoreGroups = this.groupPlayersByScore(sortedPlayers, tournament);
    
    const pairings = [];
    const used = new Set();
    
    // Process each score group
    const sortedScores = Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    for (const score of sortedScores) {
      const group = scoreGroups[score];
      
      // Handle odd number of players
      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            section: tournament.section || 'Open',
            board: pairings.length + 1
          });
          used.add(byePlayer.id);
        }
      }
      
      // Pair remaining players
      const remainingPlayers = group.filter(p => !used.has(p.id));
      for (let i = 0; i < remainingPlayers.length; i += 2) {
        if (i + 1 < remainingPlayers.length) {
          const player1 = remainingPlayers[i];
          const player2 = remainingPlayers[i + 1];
          
          // Assign colors based on bbpPairings algorithm
          const whitePlayer = this.assignColorsSwiss(player1, player2, tournament);
          const blackPlayer = whitePlayer === player1 ? player2 : player1;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: tournament.section || 'Open',
            board: pairings.length + 1
          });
          
          used.add(player1.id);
          used.add(player2.id);
        }
      }
    }
    
    return pairings;
  }

  /**
   * Generate Burstein system pairings
   * Based on bbpPairings Burstein algorithm
   */
  generateBursteinPairings(players, tournament) {
    if (players.length < 2) return [];

    // Sort players by standings
    const sortedPlayers = this.sortPlayersByStandings(players, tournament);
    
    // Group by score
    const scoreGroups = this.groupPlayersByScore(sortedPlayers, tournament);
    
    const pairings = [];
    const used = new Set();
    
    // Process each score group
    const sortedScores = Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    for (const score of sortedScores) {
      const group = scoreGroups[score];
      
      // Handle odd number of players
      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            section: tournament.section || 'Open',
            board: pairings.length + 1
          });
          used.add(byePlayer.id);
        }
      }
      
      // Pair remaining players
      const remainingPlayers = group.filter(p => !used.has(p.id));
      for (let i = 0; i < remainingPlayers.length; i += 2) {
        if (i + 1 < remainingPlayers.length) {
          const player1 = remainingPlayers[i];
          const player2 = remainingPlayers[i + 1];
          
          // Assign colors based on bbpPairings algorithm
          const whitePlayer = this.assignColorsSwiss(player1, player2, tournament);
          const blackPlayer = whitePlayer === player1 ? player2 : player1;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: tournament.section || 'Open',
            board: pairings.length + 1
          });
          
          used.add(player1.id);
          used.add(player2.id);
        }
      }
    }
    
    return pairings;
  }

  /**
   * Sort players by standings
   * Based on bbpPairings sortPlayersByStandings function
   */
  sortPlayersByStandings(players, tournament) {
    return [...players].sort((a, b) => {
      // First by points
      const scoreA = this.getPlayerScore(a, tournament);
      const scoreB = this.getPlayerScore(b, tournament);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // Then by rating
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      
      // Finally by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Assign colors for Swiss system
   * Based on bbpPairings assignColorsSwiss function
   */
  assignColorsSwiss(player1, player2, tournament = {}) {
    // Get color history for both players from tournament or player matches
    const player1Colors = this.getLastTwoColors(player1, tournament.colorHistory);
    const player2Colors = this.getLastTwoColors(player2, tournament.colorHistory);
    
    // PRIORITY 1: Avoid immediate color repeats (WW or BB)
    if (player1Colors === 'WW' && player2Colors !== 'WW') {
      return player2; // Give white to player2
    }
    if (player2Colors === 'WW' && player1Colors !== 'WW') {
      return player1; // Give white to player1
    }
    if (player1Colors === 'BB' && player2Colors !== 'BB') {
      return player1; // Give white to player1
    }
    if (player2Colors === 'BB' && player1Colors !== 'BB') {
      return player2; // Give white to player2
    }
    
    // PRIORITY 2: Check for neutral color preference
    const neutralColor = this.choosePlayerNeutralColor(player1, player2);
    if (neutralColor !== null) {
      return neutralColor === 'white' ? player1 : player2;
    }
    
    // PRIORITY 3: Handle absolute color preferences
    if (player1.absoluteColorPreference && player2.absoluteColorPreference) {
      if (player1.colorImbalance > player2.colorImbalance) {
        return player1.colorPreference === 'white' ? player1 : player2;
      } else if (player2.colorImbalance > player1.colorImbalance) {
        return player2.colorPreference === 'white' ? player2 : player1;
      }
    }
    
    // PRIORITY 4: Handle strong color preferences
    if (player1.strongColorPreference && !player2.strongColorPreference) {
      return player1.colorPreference === 'white' ? player1 : player2;
    }
    if (player2.strongColorPreference && !player1.strongColorPreference) {
      return player2.colorPreference === 'white' ? player2 : player1;
    }
    
    // PRIORITY 5: Balance colors based on current imbalance
    const imbalance1 = this.getColorBalance(player1);
    const imbalance2 = this.getColorBalance(player2);
    
    // If one player has more white games, give black to them
    if (imbalance1 > imbalance2) {
      return player2; // Give white to player2
    } else if (imbalance2 > imbalance1) {
      return player1; // Give white to player1
    }
    
    // PRIORITY 6: If both players have same imbalance, alternate based on last color
    const lastColor1 = player1Colors.slice(-1);
    const lastColor2 = player2Colors.slice(-1);
    
    if (lastColor1 === 'W' && lastColor2 !== 'W') {
      return player2; // Give white to player2
    }
    if (lastColor2 === 'W' && lastColor1 !== 'W') {
      return player1; // Give white to player1
    }
    if (lastColor1 === 'B' && lastColor2 !== 'B') {
      return player1; // Give white to player1
    }
    if (lastColor2 === 'B' && lastColor1 !== 'B') {
      return player2; // Give white to player2
    }
    
    // PRIORITY 7: Final fallback: give white to higher rated player
    return (player1.rating || 0) >= (player2.rating || 0) ? player1 : player2;
  }

  /**
   * Get color balance for a player
   */
  getColorBalance(player) {
    let whiteCount = 0;
    let blackCount = 0;
    
    for (const match of player.matches || []) {
      if (match.gameWasPlayed) {
        if (match.color === 'white') {
          whiteCount++;
        } else if (match.color === 'black') {
          blackCount++;
        }
      }
    }
    
    return whiteCount - blackCount;
  }

  /**
   * Generate Dutch System pairings
   * Based on bbpPairings Dutch algorithm
   */
  generateDutchPairings(players, tournament) {
    if (players.length < 2) return [];

    // Sort players by standings
    const sortedPlayers = this.sortPlayersByStandings(players);
    
    // Group players by score
    const scoreGroups = this.groupPlayersByScore(sortedPlayers);
    
    const pairings = [];
    
    // Process each score group
    for (const [score, group] of Object.entries(scoreGroups)) {
      if (group.length === 0) continue;
      
      // Handle odd number of players with bye
      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            bye_type: 'unpaired',
            section: tournament.section,
            round: tournament.round
          });
          
          // Remove bye player from group
          const byeIndex = group.findIndex(p => p.id === byePlayer.id);
          if (byeIndex !== -1) {
            group.splice(byeIndex, 1);
          }
        }
      }
      
      // Pair remaining players using proper Swiss system
      if (tournament.round === 1) {
        // Round 1: Pair top half vs bottom half (1v5, 2v6, 3v7, 4v8)
        const halfLength = Math.floor(group.length / 2);
        for (let i = 0; i < halfLength; i++) {
          const player1 = group[i]; // Higher rated player
          const player2 = group[i + halfLength]; // Lower rated player
          
          // Assign colors using Swiss system rules
          const whitePlayer = this.assignColorsSwiss(player1, player2, tournament);
          const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: tournament.section,
            round: tournament.round
          });
        }
      } else {
        // Subsequent rounds: Use proper Swiss system pairing
        const pairedPlayers = new Set();
        
        // Sort players within score group by tiebreakers (rating, then name)
        const sortedGroup = [...group].sort((a, b) => {
          // First by rating (descending)
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          // Then by name (ascending)
          return (a.name || '').localeCompare(b.name || '');
        });
        
        // Pair players using Swiss system rules
        for (let i = 0; i < sortedGroup.length; i++) {
          if (pairedPlayers.has(sortedGroup[i].id)) continue;
          
          let bestOpponent = null;
          let bestScore = -1;
          
          // Find the best available opponent
          for (let j = i + 1; j < sortedGroup.length; j++) {
            if (pairedPlayers.has(sortedGroup[j].id)) continue;
            
            // Check if they haven't played before (simplified check)
            const hasPlayedBefore = this.hasPlayedBefore(sortedGroup[i], sortedGroup[j], tournament);
            if (hasPlayedBefore) continue;
            
            // Calculate pairing score (lower is better)
            const pairingScore = this.calculateSwissPairingScore(sortedGroup[i], sortedGroup[j], tournament);
            
            if (bestOpponent === null || pairingScore < bestScore) {
              bestOpponent = sortedGroup[j];
              bestScore = pairingScore;
            }
          }
          
          // If no suitable opponent found, pair with next available player
          if (bestOpponent === null) {
            for (let j = i + 1; j < sortedGroup.length; j++) {
              if (!pairedPlayers.has(sortedGroup[j].id)) {
                bestOpponent = sortedGroup[j];
                break;
              }
            }
          }
          
          if (bestOpponent) {
            // Assign colors using Swiss system rules
            const whitePlayer = this.assignColorsSwiss(sortedGroup[i], bestOpponent, tournament);
            const blackPlayer = whitePlayer.id === sortedGroup[i].id ? bestOpponent : sortedGroup[i];
            
            pairings.push({
              white_player_id: whitePlayer.id,
              black_player_id: blackPlayer.id,
              is_bye: false,
              section: tournament.section,
              round: tournament.round
            });
            
            pairedPlayers.add(sortedGroup[i].id);
            pairedPlayers.add(bestOpponent.id);
          }
        }
      }
    }
    
    return pairings;
  }

  /**
   * Generate Burstein System pairings
   * Based on bbpPairings Burstein algorithm
   */
  generateBursteinPairings(players, tournament) {
    if (players.length < 2) return [];

    // Sort players by standings
    const sortedPlayers = this.sortPlayersByStandings(players);
    
    // Group players by score
    const scoreGroups = this.groupPlayersByScore(sortedPlayers);
    
    const pairings = [];
    
    // Process each score group
    for (const [score, group] of Object.entries(scoreGroups)) {
      if (group.length === 0) continue;
      
      // Handle odd number of players with bye
      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            bye_type: 'unpaired',
            section: tournament.section,
            round: tournament.round
          });
          
          // Remove bye player from group
          const byeIndex = group.findIndex(p => p.id === byePlayer.id);
          if (byeIndex !== -1) {
            group.splice(byeIndex, 1);
          }
        }
      }
      
      // Pair remaining players
      for (let i = 0; i < group.length; i += 2) {
        if (i + 1 < group.length) {
          const player1 = group[i];
          const player2 = group[i + 1];
          
          // Assign colors using Swiss system rules
          const whitePlayer = this.assignColorsSwiss(player1, player2, tournament);
          const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: tournament.section,
            round: tournament.round
          });
        }
      }
    }
    
    return pairings;
  }

  /**
   * Sort players by standings (points, then tiebreakers)
   */
  sortPlayersByStandings(players) {
    return [...players].sort((a, b) => {
      // First by points (descending)
      const pointsA = a.points || 0;
      const pointsB = b.points || 0;
      if (pointsA !== pointsB) {
        return pointsB - pointsA;
      }
      
      // Then by rating (descending)
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingA !== ratingB) {
        return ratingB - ratingA;
      }
      
      // Finally by name (ascending)
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  /**
   * Group players by score
   */
  groupPlayersByScore(players) {
    const groups = new Map();
    
    for (const player of players) {
      const score = player.points || 0;
      if (!groups.has(score)) {
        groups.set(score, []);
      }
      groups.get(score).push(player);
    }
    
    return groups;
  }

  /**
   * Select bye player from a group
   */
  selectByePlayer(group) {
    // Sort by rating (ascending) to give bye to lowest rated
    const sortedGroup = [...group].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    
    for (const player of sortedGroup) {
      if (this.eligibleForBye(player)) {
        return player;
      }
    }
    
    return null;
  }

  /**
   * Check if two players have played before
   */
  hasPlayedBefore(player1, player2, tournament) {
    // This is a simplified check - in a real implementation,
    // you would check the tournament's previous pairings
    // For now, return false to allow all pairings
    return false;
  }

  /**
   * Calculate Swiss pairing score (lower is better)
   */
  calculateSwissPairingScore(player1, player2, tournament) {
    let score = 0;
    
    // Prefer pairings with similar ratings
    const ratingDiff = Math.abs((player1.rating || 0) - (player2.rating || 0));
    score += ratingDiff / 100; // Normalize rating difference
    
    // Prefer pairings with different color preferences
    if (player1.colorPreference && player2.colorPreference) {
      if (player1.colorPreference === player2.colorPreference && player1.colorPreference !== 'none') {
        score += 10; // Penalty for same color preference
      }
    }
    
    // Prefer pairings with balanced color history
    const colorBalance1 = this.getColorBalance(player1);
    const colorBalance2 = this.getColorBalance(player2);
    const balanceDiff = Math.abs(colorBalance1 - colorBalance2);
    score += balanceDiff * 2; // Penalty for imbalanced colors
    
    return score;
  }

  /**
   * Check if two color preferences are compatible
   */
  colorPreferencesAreCompatible(pref1, pref2) {
    if (!pref1 || !pref2 || pref1 === 'none' || pref2 === 'none') {
      return true; // At least one is neutral
    }
    return pref1 !== pref2; // Different preferences are compatible
  }

  /**
   * Choose neutral color preference between two players
   */
  choosePlayerNeutralColor(player1, player2) {
    console.log(`[DEBUG] choosePlayerNeutralColor: Player1 pref: ${player1.colorPreference}, Player2 pref: ${player2.colorPreference}`);
    console.log(`[DEBUG] Player1 absolute: ${player1.absoluteColorPreference}, strong: ${player1.strongColorPreference}`);
    console.log(`[DEBUG] Player2 absolute: ${player2.absoluteColorPreference}, strong: ${player2.strongColorPreference}`);
    
    // Check if both players have compatible color preferences
    if (this.colorPreferencesAreCompatible(player1.colorPreference, player2.colorPreference)) {
      console.log(`[DEBUG] Color preferences are compatible`);
      if (player1.colorPreference && player1.colorPreference !== 'none') {
        // Player1 has a preference, so give them their preferred color
        // This means the white player gets the opposite color
        const result = player1.colorPreference === 'white' ? 'white' : 'black';
        console.log(`[DEBUG] Player1 has preference ${player1.colorPreference}, returning ${result} for white player`);
        return result;
      } else if (player2.colorPreference && player2.colorPreference !== 'none') {
        // Player2 has a preference, so give them their preferred color
        // This means the white player gets the opposite color
        const result = player2.colorPreference === 'white' ? 'white' : 'black';
        console.log(`[DEBUG] Player2 has preference ${player2.colorPreference}, returning ${result} for white player`);
        return result;
      } else {
        console.log(`[DEBUG] No clear preference, returning null`);
        return null; // No clear preference
      }
    }
    
    // Handle absolute color preferences
    if (player1.absoluteColorPreference && player2.absoluteColorPreference) {
      if (player1.colorPreference === player2.colorPreference) {
        console.log(`[DEBUG] Both have same absolute preference, returning null`);
        return null; // Incompatible
      }
      console.log(`[DEBUG] Returning player1 absolute preference: ${player1.colorPreference}`);
      return player1.colorPreference;
    }
    
    // Handle strong color preferences
    if (player1.strongColorPreference && !player2.strongColorPreference) {
      console.log(`[DEBUG] Player1 has strong preference: ${player1.colorPreference}`);
      return player1.colorPreference;
    }
    if (player2.strongColorPreference && !player1.strongColorPreference) {
      const result = player2.colorPreference === 'white' ? 'black' : 'white';
      console.log(`[DEBUG] Player2 has strong preference, returning opposite: ${result}`);
      return result;
    }
    
    console.log(`[DEBUG] No clear preference, returning null`);
    return null; // No clear preference
  }

  /**
   * Assign colors for Swiss system pairing
   * Based on bbpPairings color assignment algorithm
   */
  assignColorsSwiss(player1, player2, tournament = {}) {
    const player1Colors = this.getLastTwoColors(player1, tournament.colorHistory);
    const player2Colors = this.getLastTwoColors(player2, tournament.colorHistory);
    
    // PRIORITY 1: Avoid immediate color repeats (WW or BB)
    if (player1Colors === 'WW' && player2Colors !== 'WW') {
      return player2; // Give white to player2
    }
    if (player2Colors === 'WW' && player1Colors !== 'WW') {
      return player1; // Give white to player1
    }
    if (player1Colors === 'BB' && player2Colors !== 'BB') {
      return player1; // Give white to player1
    }
    if (player2Colors === 'BB' && player1Colors !== 'BB') {
      return player2; // Give white to player2
    }
    
    // PRIORITY 2: Check for neutral color preference (skip for Round 1)
    if (tournament.round > 1) {
      const neutralColor = this.choosePlayerNeutralColor(player1, player2);
      if (neutralColor !== null) {
        return neutralColor === 'white' ? player1 : player2;
      }
    }
    
    // PRIORITY 3: Handle absolute color preferences
    if (player1.absoluteColorPreference && player1.colorPreference === 'white') {
      return player1;
    }
    if (player1.absoluteColorPreference && player1.colorPreference === 'black') {
      return player2;
    }
    if (player2.absoluteColorPreference && player2.colorPreference === 'white') {
      return player2;
    }
    if (player2.absoluteColorPreference && player2.colorPreference === 'black') {
      return player1;
    }
    
    // PRIORITY 4: Handle strong color preferences
    if (player1.strongColorPreference && !player2.strongColorPreference) {
      return player1.colorPreference === 'white' ? player1 : player2;
    }
    if (player2.strongColorPreference && !player1.strongColorPreference) {
      return player2.colorPreference === 'white' ? player2 : player1;
    }
    
    // PRIORITY 5: Balance colors based on current imbalance
    const imbalance1 = this.getColorBalance(player1);
    const imbalance2 = this.getColorBalance(player2);
    
    if (imbalance1 > imbalance2) {
      return player2; // Give white to player2
    } else if (imbalance2 > imbalance1) {
      return player1; // Give white to player1
    }
    
    // PRIORITY 6: If both players have same imbalance, alternate based on last color
    const lastColor1 = player1Colors.slice(-1);
    const lastColor2 = player2Colors.slice(-1);
    
    if (lastColor1 === 'W' && lastColor2 !== 'W') {
      return player2; // Give white to player2
    }
    if (lastColor2 === 'W' && lastColor1 !== 'W') {
      return player1; // Give white to player1
    }
    if (lastColor1 === 'B' && lastColor2 !== 'B') {
      return player1; // Give white to player1
    }
    if (lastColor2 === 'B' && lastColor1 !== 'B') {
      return player2; // Give white to player2
    }
    
    // PRIORITY 7: Final fallback: give white to higher rated player
    return (player1.rating || 0) >= (player2.rating || 0) ? player1 : player2;
  }

  /**
   * Sort players by standings (points, then rating)
   */
  sortPlayersByStandings(players) {
    return players.sort((a, b) => {
      // First by points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // Then by rating (descending)
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  /**
   * Group players by score
   */
  groupPlayersByScore(players) {
    const groups = {};
    players.forEach(player => {
      const score = player.points || 0;
      if (!groups[score]) {
        groups[score] = [];
      }
      groups[score].push(player);
    });
    return groups;
  }

  /**
   * Select bye player from a group
   */
  selectByePlayer(group) {
    // Sort by rating (ascending) to give bye to lowest rated player
    const sortedGroup = [...group].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    for (const player of sortedGroup) {
      if (this.eligibleForBye(player)) {
        return player;
      }
    }
    return null;
  }

  /**
   * Generate Dutch system pairings
   * Main entry point for Dutch pairing algorithm
   */
  generateDutchPairings(players, tournament) {
    if (players.length < 2) return [];

    // For Round 1, sort by rating only
    let sortedPlayers;
    if (tournament.round === 1) {
      sortedPlayers = players.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      sortedPlayers = this.sortPlayersByStandings(players);
    }
    
    const scoreGroups = this.groupPlayersByScore(sortedPlayers);
    const pairings = [];

    for (const [score, group] of Object.entries(scoreGroups)) {
      if (group.length === 0) continue;

      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            bye_type: 'unpaired',
            section: tournament.section,
            round: tournament.round
          });
          const byeIndex = group.findIndex(p => p.id === byePlayer.id);
          if (byeIndex !== -1) {
            group.splice(byeIndex, 1);
          }
        }
      }

      if (tournament.round === 1) {
        // Round 1: Top half vs bottom half
        const halfLength = Math.floor(group.length / 2);
        for (let i = 0; i < halfLength; i++) {
          const player1 = group[i]; // Higher rated player (top half)
          const player2 = group[i + halfLength]; // Lower rated player (bottom half)
          
          // Alternate colors between boards: Board 1 = higher rated white, Board 2 = lower rated white, etc.
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
      } else {
        // Subsequent rounds: Swiss system pairing
        const pairedPlayers = new Set();
        const sortedGroup = [...group].sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          return (a.name || '').localeCompare(b.name || '');
        });

        for (let i = 0; i < sortedGroup.length; i++) {
          if (pairedPlayers.has(sortedGroup[i].id)) continue;

          let bestOpponent = null;
          let bestScore = -1;

          for (let j = i + 1; j < sortedGroup.length; j++) {
            if (pairedPlayers.has(sortedGroup[j].id)) continue;
            const hasPlayedBefore = this.hasPlayedBefore(sortedGroup[i], sortedGroup[j], tournament);
            if (hasPlayedBefore) continue;
            const pairingScore = this.calculateSwissPairingScore(sortedGroup[i], sortedGroup[j], tournament);
            if (bestOpponent === null || pairingScore < bestScore) {
              bestOpponent = sortedGroup[j];
              bestScore = pairingScore;
            }
          }

          if (bestOpponent === null) {
            for (let j = i + 1; j < sortedGroup.length; j++) {
              if (!pairedPlayers.has(sortedGroup[j].id)) {
                bestOpponent = sortedGroup[j];
                break;
              }
            }
          }

          if (bestOpponent) {
            const whitePlayer = this.assignColorsSwiss(sortedGroup[i], bestOpponent, tournament);
            const blackPlayer = whitePlayer.id === sortedGroup[i].id ? bestOpponent : sortedGroup[i];
            pairings.push({
              white_player_id: whitePlayer.id,
              black_player_id: blackPlayer.id,
              is_bye: false,
              section: tournament.section,
              round: tournament.round
            });
            pairedPlayers.add(sortedGroup[i].id);
            pairedPlayers.add(bestOpponent.id);
          }
        }
      }
    }
    return pairings;
  }

  /**
   * Generate Burstein system pairings
   * Main entry point for Burstein pairing algorithm
   */
  generateBursteinPairings(players, tournament) {
    if (players.length < 2) return [];

    const sortedPlayers = this.sortPlayersByStandings(players);
    const scoreGroups = this.groupPlayersByScore(sortedPlayers);
    const pairings = [];

    for (const [score, group] of Object.entries(scoreGroups)) {
      if (group.length === 0) continue;

      if (group.length % 2 === 1) {
        const byePlayer = this.selectByePlayer(group);
        if (byePlayer) {
          pairings.push({
            white_player_id: byePlayer.id,
            black_player_id: null,
            is_bye: true,
            bye_type: 'unpaired',
            section: tournament.section,
            round: tournament.round
          });
          const byeIndex = group.findIndex(p => p.id === byePlayer.id);
          if (byeIndex !== -1) {
            group.splice(byeIndex, 1);
          }
        }
      }

      if (tournament.round === 1) {
        // Round 1: Top half vs bottom half
        const halfLength = Math.floor(group.length / 2);
        for (let i = 0; i < halfLength; i++) {
          const player1 = group[i];
          const player2 = group[i + halfLength];
          const whitePlayer = this.assignColorsSwiss(player1, player2, tournament);
          const blackPlayer = whitePlayer.id === player1.id ? player2 : player1;
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: tournament.section,
            round: tournament.round
          });
        }
      } else {
        // Subsequent rounds: Burstein system pairing
        const pairedPlayers = new Set();
        const sortedGroup = [...group].sort((a, b) => {
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          if (ratingA !== ratingB) {
            return ratingB - ratingA;
          }
          return (a.name || '').localeCompare(b.name || '');
        });

        for (let i = 0; i < sortedGroup.length; i++) {
          if (pairedPlayers.has(sortedGroup[i].id)) continue;

          let bestOpponent = null;
          let bestScore = -1;

          for (let j = i + 1; j < sortedGroup.length; j++) {
            if (pairedPlayers.has(sortedGroup[j].id)) continue;
            const hasPlayedBefore = this.hasPlayedBefore(sortedGroup[i], sortedGroup[j], tournament);
            if (hasPlayedBefore) continue;
            const pairingScore = this.calculateSwissPairingScore(sortedGroup[i], sortedGroup[j], tournament);
            if (bestOpponent === null || pairingScore < bestScore) {
              bestOpponent = sortedGroup[j];
              bestScore = pairingScore;
            }
          }

          if (bestOpponent === null) {
            for (let j = i + 1; j < sortedGroup.length; j++) {
              if (!pairedPlayers.has(sortedGroup[j].id)) {
                bestOpponent = sortedGroup[j];
                break;
              }
            }
          }

          if (bestOpponent) {
            const whitePlayer = this.assignColorsSwiss(sortedGroup[i], bestOpponent, tournament);
            const blackPlayer = whitePlayer.id === sortedGroup[i].id ? bestOpponent : sortedGroup[i];
            pairings.push({
              white_player_id: whitePlayer.id,
              black_player_id: blackPlayer.id,
              is_bye: false,
              section: tournament.section,
              round: tournament.round
            });
            pairedPlayers.add(sortedGroup[i].id);
            pairedPlayers.add(bestOpponent.id);
          }
        }
      }
    }
    return pairings;
  }

  /**
   * Generate tournament pairings for all sections
   * Main entry point for tournament-wide pairing generation
   */
  async generateTournamentPairings(tournamentId, round, db, options = {}) {
    console.log(`[BBPPairings] Generating pairings for tournament ${tournamentId}, round ${round}`);
    
    try {
      // Get all players by section (including inactive players)
      const playersBySection = await new Promise((resolve, reject) => {
        db.all(
          'SELECT section FROM players WHERE tournament_id = ? AND (status = "active" OR status = "inactive") GROUP BY section',
          [tournamentId],
          (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(rows.map(row => row.section || 'Open'));
          }
        );
      });

      const allPairings = [];
      const sectionResults = {};

      for (const section of playersBySection) {
        console.log(`[BBPPairings] Processing section: ${section}`);
        
        // Get all players for this section (including inactive)
        const allPlayers = await new Promise((resolve, reject) => {
          db.all(
            `SELECT p.*, 
                    COALESCE(SUM(CASE WHEN pr.result = 'win' THEN 1 WHEN pr.result = 'draw' THEN 0.5 ELSE 0 END), 0) as points
             FROM players p
             LEFT JOIN pairings pr ON p.id = pr.white_player_id OR p.id = pr.black_player_id
             WHERE p.tournament_id = ? AND p.section = ? AND (p.status = 'active' OR p.status = 'inactive')
             GROUP BY p.id
             ORDER BY points DESC, p.rating DESC`,
            [tournamentId, section],
            (err, rows) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(rows);
            }
          );
        });

        // Separate active and inactive players
        const activePlayers = [];
        const byePlayers = [];
        
        for (const player of allPlayers) {
          // Check if player has intentional bye for this round
          let hasIntentionalBye = false;
          if (player.intentional_bye_rounds) {
            try {
              let byeRounds = [];
              if (typeof player.intentional_bye_rounds === 'string') {
                try {
                  byeRounds = JSON.parse(player.intentional_bye_rounds);
                } catch {
                  byeRounds = player.intentional_bye_rounds.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
                }
              } else if (Array.isArray(player.intentional_bye_rounds)) {
                byeRounds = player.intentional_bye_rounds;
              }
              hasIntentionalBye = byeRounds.includes(round);
            } catch (error) {
              console.warn(`[BBPPairings] Error parsing intentional_bye_rounds for player ${player.name}: ${error.message}`);
            }
          }
          
          // Inactive players or players with intentional byes should not be paired
          if (player.status === 'inactive') {
            byePlayers.push({ player, byeType: 'inactive' });
          } else if (hasIntentionalBye) {
            byePlayers.push({ player, byeType: 'unpaired' });
          } else {
            activePlayers.push(player);
          }
        }

        // Create bye pairings for non-playing players
        const byePairings = byePlayers.map(({ player, byeType }) => ({
          white_player_id: player.id,
          black_player_id: null,
          is_bye: true,
          bye_type: byeType,
          section: section,
          round: round,
          tournament_id: tournamentId,
          result: `bye_${byeType}`
        }));

        // Generate pairings only for active players
        let sectionPairings = [];
        if (activePlayers.length >= 2) {
          // Get color history for this section
          const colorHistory = await this.getColorHistory(tournamentId, section, db);

          // Create tournament object
          const tournament = {
            round: round,
            section: section,
            tournamentId: tournamentId,
            colorHistory: colorHistory,
            pointsForWin: options.pointsForWin || 1,
            pointsForDraw: options.pointsForDraw || 0.5,
            pointsForLoss: options.pointsForLoss || 0
          };

          // Generate pairings for this section
          sectionPairings = this.generateDutchPairings(activePlayers, tournament);
        }

        // Combine regular pairings and bye pairings
        const allSectionPairings = [...sectionPairings, ...byePairings];
        
        // Assign section, board numbers, tournament_id, and round to all pairings
        allSectionPairings.forEach((pairing, index) => {
          pairing.section = section;
          pairing.board = index + 1;
          pairing.tournament_id = tournamentId;
          pairing.round = round;
        });

        // Add all section pairings to the main list
        allPairings.push(...allSectionPairings);
        
        const registeredByeCount = byePlayers.filter(entry => entry.byeType === 'unpaired').length;
        const inactiveByeCount = byePlayers.filter(entry => entry.byeType === 'inactive').length;

        sectionResults[section] = {
          success: true,
          pairingsCount: allSectionPairings.length,
          playersCount: activePlayers.length + byePlayers.length,
          registeredByeCount
        };

        console.log(
          `[BBPPairings] Generated ${allSectionPairings.length} pairings for section ${section} ` +
          `(${activePlayers.length} active, ${registeredByeCount} registered byes, ${inactiveByeCount} inactive)`
        );
      }

      return {
        success: true,
        pairings: allPairings,
        sectionResults: sectionResults,
        metadata: {
          tournamentId: tournamentId,
          round: round,
          totalPairings: allPairings.length,
          sectionsProcessed: playersBySection.length,
          pairingSystem: 'fide_dutch',
          byeCount: allPairings.filter(p => p.is_bye).length
        }
      };

    } catch (error) {
      console.error(`[BBPPairings] Tournament pairing generation failed:`, error.message);
      return {
        success: false,
        error: error.message,
        pairings: [],
        sectionResults: {}
      };
    }
  }

  /**
   * Get color history for a section
   */
  async getColorHistory(tournamentId, section, db) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT white_player_id, black_player_id, result
         FROM pairings 
         WHERE tournament_id = ? AND section = ? AND result IS NOT NULL
         ORDER BY round, board`,
        [tournamentId, section],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          const colorHistory = {};
          rows.forEach(pairing => {
            if (pairing.white_player_id) {
              if (!colorHistory[pairing.white_player_id]) {
                colorHistory[pairing.white_player_id] = [];
              }
              colorHistory[pairing.white_player_id].push('white');
            }
            if (pairing.black_player_id) {
              if (!colorHistory[pairing.black_player_id]) {
                colorHistory[pairing.black_player_id] = [];
              }
              colorHistory[pairing.black_player_id].push('black');
            }
          });
          
          resolve(colorHistory);
        }
      );
    });
  }
}

module.exports = { BBPPairings: BbpPairings };
