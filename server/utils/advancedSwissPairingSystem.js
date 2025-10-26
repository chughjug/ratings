/**
 * Advanced Swiss Pairing System
 * Based on algorithms from swiss-system-chess-tournament-master and tournament-manager-master
 */

class AdvancedSwissPairingSystem {
  constructor(players, options = {}) {
    this.players = players;
    this.options = {
      pairingSystem: 'swiss',
      tiebreakerOrder: ['buchholz', 'sonneborn_berger', 'direct_encounter', 'performance_rating'],
      colorBalanceRules: 'fide',
      accelerationSettings: {
        enabled: false,
        type: 'standard',
        rounds: 2,
      },
      byeSettings: {
        fullPointBye: true,
        avoidUnratedDropping: true
      },
      ...options
    };
    
    this.previousPairings = options.previousPairings || [];
    this.colorHistory = options.colorHistory || {};
    this.round = options.round || 1;
    this.section = options.section || 'Open';
    this.tournamentId = options.tournamentId;
    this.db = options.db;
    
    // Initialize player info with scores and opponents
    this.playerInfo = this.initializePlayerInfo();
    this.brackets = this.createScoreBrackets();
  }

  /**
   * Initialize player information including scores, opponents, and color history
   */
  initializePlayerInfo() {
    const playerInfo = {};
    
    for (const player of this.players) {
      playerInfo[player.id] = {
        player: player,
        score: player.points || 0,
        opponents: new Set(),
        colors: '',
        floats: '',
        rating: player.rating || 0,
        title: player.title || '',
        name: player.name,
        paired: false,
        downfloater: false,
        upfloater: false
      };
    }

    // Process previous pairings to build opponent history and color history
    for (const pairing of this.previousPairings) {
      if (pairing.white_player_id && pairing.black_player_id) {
        const whiteInfo = playerInfo[pairing.white_player_id];
        const blackInfo = playerInfo[pairing.black_player_id];
        
        if (whiteInfo && blackInfo) {
          // Add opponents
          whiteInfo.opponents.add(pairing.black_player_id);
          blackInfo.opponents.add(pairing.white_player_id);
          
          // Add colors
          whiteInfo.colors += 'W';
          blackInfo.colors += 'B';
        }
      }
    }

    return playerInfo;
  }

  /**
   * Create score brackets (groups of players with same score)
   */
  createScoreBrackets() {
    const brackets = {};
    
    for (const [playerId, info] of Object.entries(this.playerInfo)) {
      const score = info.score;
      if (!brackets[score]) {
        brackets[score] = [];
      }
      brackets[score].push(playerId);
    }
    
    return brackets;
  }

  /**
   * Get players who have intentional byes for the current round
   */
  getPlayersWithIntentionalByes() {
    const playersWithByes = new Set();
    
    console.log(`[AdvancedSwissPairingSystem] Checking intentional byes for round ${this.round}`);
    console.log(`[AdvancedSwissPairingSystem] Players data:`, this.players.map(p => ({ 
      id: p.id, 
      name: p.name, 
      bye_rounds: p.bye_rounds, 
      intentional_bye_rounds: p.intentional_bye_rounds 
    })));
    
    for (const player of this.players) {
      // Check both bye_rounds and intentional_bye_rounds columns
      const byeRounds = player.bye_rounds || player.intentional_bye_rounds;
      
      if (byeRounds && byeRounds.trim() !== '') {
        try {
          // Parse comma-separated round numbers
          const rounds = byeRounds.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
          
          if (rounds.includes(this.round)) {
            playersWithByes.add(player.id);
            console.log(`[AdvancedSwissPairingSystem] Player ${player.name} has intentional bye for round ${this.round}`);
          }
        } catch (error) {
          console.warn(`[AdvancedSwissPairingSystem] Error parsing bye rounds for player ${player.name}: ${error.message}`);
        }
      }
    }
    
    console.log(`[AdvancedSwissPairingSystem] Found ${playersWithByes.size} players with intentional byes:`, Array.from(playersWithByes));
    return playersWithByes;
  }

  /**
   * Check if a player has already received a bye in previous rounds
   */
  hasPlayerReceivedBye(playerId) {
    // Check previous pairings to see if player has received a bye
    if (!this.previousPairings || this.previousPairings.length === 0) {
      console.log(`[AdvancedSwissPairingSystem] No previous pairings available for bye check`);
      return false;
    }
    
    console.log(`[AdvancedSwissPairingSystem] Checking if player ${playerId} has received bye. Previous pairings:`, this.previousPairings);
    
    for (const pairing of this.previousPairings) {
      console.log(`[AdvancedSwissPairingSystem] Checking pairing: white=${pairing.white_player_id}, black=${pairing.black_player_id}, is_bye=${pairing.is_bye}, round=${pairing.round}`);
      
      if (pairing.white_player_id === playerId && 
          pairing.black_player_id === null && 
          pairing.is_bye && 
          pairing.round < this.round) {
        console.log(`[AdvancedSwissPairingSystem] Player ${playerId} already received bye in round ${pairing.round}`);
        return true;
      }
    }
    
    console.log(`[AdvancedSwissPairingSystem] Player ${playerId} has not received bye before`);
    return false;
  }

  /**
   * Generate pairings using advanced Swiss system
   */
  generatePairings() {
    console.log(`[AdvancedSwissPairingSystem] Generating pairings for round ${this.round}`);
    
    // Filter out players with intentional byes for this round
    const playersWithByes = this.getPlayersWithIntentionalByes();
    const playersWithoutByes = this.players.filter(player => !playersWithByes.has(player.id));
    
    console.log(`[AdvancedSwissPairingSystem] ${playersWithByes.size} players have intentional byes, ${playersWithoutByes.length} players available for pairing`);
    
    // Create bye pairings for players with intentional byes
    const byePairings = Array.from(playersWithByes).map((playerId, index) => {
      const player = this.players.find(p => p.id === playerId);
      return {
        white_player_id: player.id,
        black_player_id: null,
        white_name: player.name,
        black_name: null,
        white_rating: player.rating,
        black_rating: null,
        round: this.round,
        board: 0, // Will be assigned later
        section: this.section,
        tournament_id: this.tournamentId,
        result: null,
        is_bye: true,
        bye_type: 'bye' // Intentional bye gets 1/2 point
      };
    });
    
    // Handle odd number of players with automatic 1.0 point bye BEFORE generating regular pairings
    let automaticByePairing = null;
    let playersForRegularPairing = [...playersWithoutByes];
    
    if (playersWithoutByes.length % 2 === 1) {
      // Find the player who should get the automatic bye (lowest rated who hasn't had a bye yet)
      const availableForBye = playersWithoutByes.filter(player => {
        // Check if player has already received a bye in previous rounds
        return !this.hasPlayerReceivedBye(player.id);
      });
      
      if (availableForBye.length > 0) {
        // Sort by rating (ascending) to get lowest rated player
        const byePlayer = availableForBye.sort((a, b) => (a.rating || 0) - (b.rating || 0))[0];
        
        // Remove the bye player from the regular pairing pool
        playersForRegularPairing = playersWithoutByes.filter(p => p.id !== byePlayer.id);
        
        automaticByePairing = {
          white_player_id: byePlayer.id,
          black_player_id: null,
          white_name: byePlayer.name,
          black_name: null,
          white_rating: byePlayer.rating,
          black_rating: null,
          round: this.round,
          board: 0, // Will be assigned later
          section: this.section,
          tournament_id: this.tournamentId,
          result: null,
          is_bye: true,
          bye_type: 'unpaired' // Automatic bye gets 1.0 point
        };
        
        console.log(`[AdvancedSwissPairingSystem] Player ${byePlayer.name} gets automatic 1.0 point bye for odd player count`);
      }
    }
    
    // Generate pairings for remaining players (now guaranteed to be even number)
    let regularPairings = [];
    if (playersForRegularPairing.length >= 2) {
      // Temporarily replace players array for pairing generation
      const originalPlayers = this.players;
      this.players = playersForRegularPairing;
      
      if (this.round === 1) {
        regularPairings = this.pairFirstRound();
      } else {
        regularPairings = this.pairSwissRound();
      }
      
      // Restore original players array
      this.players = originalPlayers;
    }
    
    // Combine all pairings
    const allPairings = [...byePairings, ...regularPairings];
    if (automaticByePairing) {
      allPairings.push(automaticByePairing);
    }
    
    // Assign proper board numbers
    allPairings.forEach((pairing, index) => {
      pairing.board = index + 1;
    });
    
    const totalByes = byePairings.length + (automaticByePairing ? 1 : 0);
    console.log(`[AdvancedSwissPairingSystem] Generated ${allPairings.length} total pairings (${totalByes} byes, ${regularPairings.length} regular)`);
    return allPairings;
  }

  /**
   * Pair first round - highest rated vs lowest rated
   */
  pairFirstRound() {
    console.log(`[AdvancedSwissPairingSystem] Pairing first round`);
    
    // Sort players by rating (descending)
    const sortedPlayers = [...this.players].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const pairings = [];
    
    const halfCount = Math.floor(sortedPlayers.length / 2);
    
    // Pair top half with bottom half
    for (let i = 0; i < halfCount; i++) {
      const whitePlayer = sortedPlayers[i];
      const blackPlayer = sortedPlayers[halfCount + i];
      
      pairings.push({
        white_player_id: whitePlayer.id,
        black_player_id: blackPlayer.id,
        white_name: whitePlayer.name,
        black_name: blackPlayer.name,
        white_rating: whitePlayer.rating,
        black_rating: blackPlayer.rating,
        round: this.round,
        board: 0, // Will be assigned later
        section: this.section,
        tournament_id: this.tournamentId,
        result: null,
        is_bye: false
      });
    }
    
    console.log(`[AdvancedSwissPairingSystem] Generated ${pairings.length} pairings for first round`);
    return pairings;
  }

  /**
   * Pair Swiss rounds using score brackets and advanced algorithms
   */
  pairSwissRound() {
    console.log(`[AdvancedSwissPairingSystem] Pairing Swiss round ${this.round}`);
    
    const pairings = [];
    const sortedBrackets = Object.keys(this.brackets)
      .map(score => parseFloat(score))
      .sort((a, b) => b - a); // Sort by score descending
    
    console.log(`[AdvancedSwissPairingSystem] Score brackets:`, sortedBrackets);
    
    let downfloaters = [];
    let boardNumber = 1;
    
    // Process each score bracket from highest to lowest
    for (const score of sortedBrackets) {
      const bracket = this.brackets[score];
      console.log(`[AdvancedSwissPairingSystem] Processing bracket with score ${score}:`, bracket.length, 'players');
      
      // Add downfloaters to this bracket
      if (downfloaters.length > 0) {
        bracket.unshift(...downfloaters);
        downfloaters = [];
      }
      
      // Process players in this bracket
      const bracketPairings = this.pairBracket(bracket, boardNumber);
      pairings.push(...bracketPairings.pairings);
      boardNumber += bracketPairings.pairings.length;
      
      // Collect any remaining unpaired players as downfloaters
      const unpairedPlayers = bracket.filter(playerId => !this.playerInfo[playerId].paired);
      if (unpairedPlayers.length > 0) {
        console.log(`[AdvancedSwissPairingSystem] ${unpairedPlayers.length} unpaired players in bracket ${score}`);
        downfloaters.push(...unpairedPlayers);
      }
    }
    
    // Handle any remaining downfloaters
    if (downfloaters.length > 0) {
      console.log(`[AdvancedSwissPairingSystem] Handling ${downfloaters.length} remaining downfloaters`);
      const remainingPairings = this.pairRemainingPlayers(downfloaters, boardNumber);
      pairings.push(...remainingPairings);
    }
    
    console.log(`[AdvancedSwissPairingSystem] Generated ${pairings.length} pairings for Swiss round`);
    return pairings;
  }

  /**
   * Pair players within a score bracket
   */
  pairBracket(bracket, startBoardNumber) {
    const pairings = [];
    let boardNumber = startBoardNumber;
    
    // Sort players in bracket by rating (descending)
    const sortedBracket = bracket.sort((a, b) => {
      const playerA = this.playerInfo[a];
      const playerB = this.playerInfo[b];
      return (playerB.rating || 0) - (playerA.rating || 0);
    });
    
    // Try to pair players using transposition algorithm
    const bracketPairings = this.pairBracketWithTransposition(sortedBracket);
    
    for (const pairing of bracketPairings) {
      const whitePlayer = this.playerInfo[pairing.white];
      const blackPlayer = this.playerInfo[pairing.black];
      
      pairings.push({
        white_player_id: whitePlayer.player.id,
        black_player_id: blackPlayer.player.id,
        white_name: whitePlayer.player.name,
        black_name: blackPlayer.player.name,
        white_rating: whitePlayer.player.rating,
        black_rating: blackPlayer.player.rating,
        round: this.round,
        board: boardNumber++,
        section: this.section,
        tournament_id: this.tournamentId,
        result: null,
        is_bye: false
      });
      
      // Mark players as paired
      whitePlayer.paired = true;
      blackPlayer.paired = true;
    }
    
    return { pairings, boardNumber };
  }

  /**
   * Pair bracket using transposition algorithm with color equalization priority
   */
  pairBracketWithTransposition(players) {
    const pairings = [];
    const n = players.length;
    
    if (n === 0) return pairings;
    if (n === 1) return pairings; // Single player will be handled as downfloater
    
    // Sort players by color balance first, then by rating
    // ENHANCED: Prioritize color equalization even for top players
    const sortedPlayers = players.sort((a, b) => {
      const colorPrefA = this.getColorPreference(this.playerInfo[a]);
      const colorPrefB = this.getColorPreference(this.playerInfo[b]);
      
      // Prioritize color equalization: players with extreme color preferences first
      const colorPriorityA = Math.abs(colorPrefA);
      const colorPriorityB = Math.abs(colorPrefB);
      
      // STRONG color equalization priority - even top players must swap colors
      if (colorPriorityA !== colorPriorityB) {
        return colorPriorityB - colorPriorityA; // Higher priority first
      }
      
      // If same color priority, sort by rating
      const ratingA = this.playerInfo[a].rating || 0;
      const ratingB = this.playerInfo[b].rating || 0;
      return ratingB - ratingA;
    });
    
    // Split into upper and lower halves
    const upperHalf = sortedPlayers.slice(0, Math.floor(n / 2));
    const lowerHalf = sortedPlayers.slice(Math.floor(n / 2));
    
    console.log(`[AdvancedSwissPairingSystem] Transposition with color priority: upper=${upperHalf.length}, lower=${lowerHalf.length}`);
    
    // Try all permutations of lower half
    const permutations = this.generatePermutations(lowerHalf);
    
    for (const permutedLower of permutations) {
      const validPairing = this.tryPairingWithColorOptimization(upperHalf, permutedLower);
      if (validPairing) {
        return validPairing;
      }
    }
    
    // If transposition fails, try greedy approach with color priority
    console.log(`[AdvancedSwissPairingSystem] Transposition failed, trying greedy approach with color priority`);
    return this.pairBracketGreedyWithColorPriority(players);
  }

  /**
   * Try pairing upper half with permuted lower half with color optimization
   */
  tryPairingWithColorOptimization(upperHalf, lowerHalf) {
    const pairings = [];
    
    for (let i = 0; i < upperHalf.length; i++) {
      const upperPlayer = upperHalf[i];
      const lowerPlayer = lowerHalf[i];
      
      // Check if these players can be paired (haven't played before)
      if (this.canPairPlayers(upperPlayer, lowerPlayer)) {
        const colorAssignment = this.assignColorsWithEqualization(upperPlayer, lowerPlayer);
        pairings.push({
          white: colorAssignment.white,
          black: colorAssignment.black
        });
      } else {
        return null; // Invalid pairing
      }
    }
    
    return pairings;
  }

  /**
   * Assign colors with priority for color equalization
   */
  assignColorsWithEqualization(playerId1, playerId2) {
    const info1 = this.playerInfo[playerId1];
    const info2 = this.playerInfo[playerId2];
    
    const colorPref1 = this.getColorPreference(info1);
    const colorPref2 = this.getColorPreference(info2);
    
    // Calculate color equalization score for each possible assignment
    const assignment1 = { white: playerId1, black: playerId2 };
    const assignment2 = { white: playerId2, black: playerId1 };
    
    const score1 = this.calculateColorEqualizationScore(assignment1);
    const score2 = this.calculateColorEqualizationScore(assignment2);
    
    // Choose assignment that provides better color equalization
    if (score1 > score2) {
      return assignment1;
    } else if (score2 > score1) {
      return assignment2;
    }
    
    // If equal, use consistent ordering (color equalization takes precedence)
    return playerId1 < playerId2 ? assignment1 : assignment2;
  }

  /**
   * Calculate color equalization score for a pairing assignment
   * ENHANCED: More aggressive color equalization scoring
   */
  calculateColorEqualizationScore(assignment) {
    const whiteInfo = this.playerInfo[assignment.white];
    const blackInfo = this.playerInfo[assignment.black];
    
    const whitePref = this.getColorPreference(whiteInfo);
    const blackPref = this.getColorPreference(blackInfo);
    
    let score = 0;
    
    // ENHANCED: More aggressive rewards for color equalization
    // Reward giving white to players who prefer white (negative preference)
    if (whitePref < 0) {
      score += Math.abs(whitePref) * 3; // Increased weight for color preference
    }
    
    // Reward giving black to players who prefer black (positive preference)
    if (blackPref > 0) {
      score += Math.abs(blackPref) * 3; // Increased weight for color preference
    }
    
    // ENHANCED: Stronger penalties for poor color assignments
    // Penalize giving white to players who strongly prefer black
    if (whitePref > 1) {
      score -= whitePref * 2; // Increased penalty
    }
    
    // Penalize giving black to players who strongly prefer white
    if (blackPref < -1) {
      score -= Math.abs(blackPref) * 2; // Increased penalty
    }
    
    // ENHANCED: Additional bonus for perfect color equalization
    // If both players get their preferred color, give extra bonus
    if (whitePref < 0 && blackPref > 0) {
      score += 5; // Bonus for perfect color equalization
    }
    
    return score;
  }

  /**
   * Check if two players can be paired (haven't played before)
   */
  canPairPlayers(playerId1, playerId2) {
    const info1 = this.playerInfo[playerId1];
    const info2 = this.playerInfo[playerId2];
    
    return !info1.opponents.has(playerId2) && !info2.opponents.has(playerId1);
  }

  /**
   * Assign colors based on color preferences and history
   */
  assignColors(playerId1, playerId2) {
    const info1 = this.playerInfo[playerId1];
    const info2 = this.playerInfo[playerId2];
    
    const colorPref1 = this.getColorPreference(info1);
    const colorPref2 = this.getColorPreference(info2);
    
    // Strong color preference rules
    if (colorPref1 <= -2 || colorPref2 >= 2) {
      return { white: playerId1, black: playerId2 };
    }
    if (colorPref1 >= 2 || colorPref2 <= -2) {
      return { white: playerId2, black: playerId1 };
    }
    
    // Moderate color preference rules
    if (colorPref1 === -1 || colorPref2 === 1) {
      return { white: playerId1, black: playerId2 };
    }
    if (colorPref1 === 1 || colorPref2 === -1) {
      return { white: playerId2, black: playerId1 };
    }
    
    // Equal color balance: use consistent ordering (not rating)
    // Color equalization takes precedence over higher seed getting white
    return playerId1 < playerId2 ? { white: playerId1, black: playerId2 } : { white: playerId2, black: playerId1 };
  }

  /**
   * Get color preference for a player (positive = prefers white, negative = prefers black)
   */
  getColorPreference(playerInfo) {
    let preference = 0;
    for (const color of playerInfo.colors) {
      preference += color === 'W' ? 1 : -1;
    }
    return preference;
  }

  /**
   * Pair remaining players using greedy approach
   */
  pairRemainingPlayers(players, startBoardNumber) {
    const pairings = [];
    let boardNumber = startBoardNumber;
    
    // Sort by color priority first, then by rating
    // ENHANCED: Strong color equalization priority for remaining players including top scorers
    const sortedPlayers = players.sort((a, b) => {
      const playerA = this.playerInfo[a];
      const playerB = this.playerInfo[b];
      
      const colorPrefA = this.getColorPreference(playerA);
      const colorPrefB = this.getColorPreference(playerB);
      
      const colorPriorityA = Math.abs(colorPrefA);
      const colorPriorityB = Math.abs(colorPrefB);
      
      // STRONG color equalization priority - even top players must swap colors
      if (colorPriorityA !== colorPriorityB) {
        return colorPriorityB - colorPriorityA;
      }
      
      return (playerB.rating || 0) - (playerA.rating || 0);
    });
    
    // Try to pair remaining players with color optimization
    const used = new Set();
    
    for (let i = 0; i < sortedPlayers.length; i++) {
      if (used.has(sortedPlayers[i])) continue;
      
      let bestOpponent = null;
      let bestColorScore = -Infinity;
      
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        if (used.has(sortedPlayers[j])) continue;
        
        if (this.canPairPlayers(sortedPlayers[i], sortedPlayers[j])) {
          // Calculate color equalization score for this potential pairing
          const assignment1 = { white: sortedPlayers[i], black: sortedPlayers[j] };
          const assignment2 = { white: sortedPlayers[j], black: sortedPlayers[i] };
          
          const score1 = this.calculateColorEqualizationScore(assignment1);
          const score2 = this.calculateColorEqualizationScore(assignment2);
          const maxScore = Math.max(score1, score2);
          
          if (maxScore > bestColorScore) {
            bestColorScore = maxScore;
            bestOpponent = sortedPlayers[j];
          }
        }
      }
      
      if (bestOpponent) {
        const colorAssignment = this.assignColorsWithEqualization(sortedPlayers[i], bestOpponent);
        const whitePlayer = this.playerInfo[colorAssignment.white];
        const blackPlayer = this.playerInfo[colorAssignment.black];
        
        pairings.push({
          white_player_id: whitePlayer.player.id,
          black_player_id: blackPlayer.player.id,
          white_name: whitePlayer.player.name,
          black_name: blackPlayer.player.name,
          white_rating: whitePlayer.player.rating,
          black_rating: blackPlayer.player.rating,
          round: this.round,
          board: boardNumber++,
          section: this.section,
          tournament_id: this.tournamentId,
          result: null,
          is_bye: false
        });
        
        used.add(sortedPlayers[i]);
        used.add(bestOpponent);
      }
    }
    
    // Handle any remaining unpaired players as byes
    for (const playerId of sortedPlayers) {
      if (!used.has(playerId)) {
        const player = this.playerInfo[playerId];
        pairings.push({
          white_player_id: player.player.id,
          black_player_id: null,
          white_name: player.player.name,
          black_name: null,
          white_rating: player.player.rating,
          black_rating: null,
          round: this.round,
          board: boardNumber++,
          section: this.section,
          tournament_id: this.tournamentId,
          result: 'bye',
          is_bye: true
        });
      }
    }
    
    return pairings;
  }

  /**
   * Pair bracket using greedy approach with color priority
   */
  pairBracketGreedyWithColorPriority(players) {
    const pairings = [];
    const used = new Set();
    
    // Sort players by color priority first, then by rating
    // ENHANCED: Strong color equalization priority for all players including top scorers
    const sortedPlayers = players.sort((a, b) => {
      const colorPrefA = this.getColorPreference(this.playerInfo[a]);
      const colorPrefB = this.getColorPreference(this.playerInfo[b]);
      
      const colorPriorityA = Math.abs(colorPrefA);
      const colorPriorityB = Math.abs(colorPrefB);
      
      // STRONG color equalization priority - even top players must swap colors
      if (colorPriorityA !== colorPriorityB) {
        return colorPriorityB - colorPriorityA;
      }
      
      const ratingA = this.playerInfo[a].rating || 0;
      const ratingB = this.playerInfo[b].rating || 0;
      return ratingB - ratingA;
    });
    
    for (let i = 0; i < sortedPlayers.length; i++) {
      if (used.has(sortedPlayers[i])) continue;
      
      let bestOpponent = null;
      let bestColorScore = -Infinity;
      
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        if (used.has(sortedPlayers[j])) continue;
        
        if (this.canPairPlayers(sortedPlayers[i], sortedPlayers[j])) {
          // Calculate color equalization score for this potential pairing
          const assignment1 = { white: sortedPlayers[i], black: sortedPlayers[j] };
          const assignment2 = { white: sortedPlayers[j], black: sortedPlayers[i] };
          
          const score1 = this.calculateColorEqualizationScore(assignment1);
          const score2 = this.calculateColorEqualizationScore(assignment2);
          const maxScore = Math.max(score1, score2);
          
          if (maxScore > bestColorScore) {
            bestColorScore = maxScore;
            bestOpponent = sortedPlayers[j];
          }
        }
      }
      
      if (bestOpponent) {
        const colorAssignment = this.assignColorsWithEqualization(sortedPlayers[i], bestOpponent);
        pairings.push({
          white: colorAssignment.white,
          black: colorAssignment.black
        });
        
        used.add(sortedPlayers[i]);
        used.add(bestOpponent);
      }
    }
    
    return pairings;
  }

  /**
   * Generate all permutations of an array
   */
  generatePermutations(arr) {
    if (arr.length <= 1) return [arr];
    
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      const perms = this.generatePermutations(rest);
      for (const perm of perms) {
        result.push([arr[i], ...perm]);
      }
    }
    
    return result;
  }
}

module.exports = { AdvancedSwissPairingSystem };
