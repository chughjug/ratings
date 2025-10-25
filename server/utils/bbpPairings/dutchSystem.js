/**
 * BBP Pairings Dutch System Implementation
 * JavaScript port of the Dutch pairing system from bbpPairings-master
 * 
 * Implements the sophisticated Dutch system with weighted matching
 * Based on FIDE Dutch system rules with algorithmic precision
 */

const MatchingComputer = require('./matchingComputer');
const { Tournament, Player, Color, invertColor } = require('./tournament');
const { FIDEDutchCompliance } = require('./trfCompliance');

class DutchSystem {
  constructor(tournament, options = {}) {
    this.tournament = tournament;
    this.options = {
      maxPlayers: 9999,
      maxPoints: 1998,
      maxRounds: 20,
      ...options
    };
    this.fideCompliance = new FIDEDutchCompliance();
  }

  /**
   * Compute pairings using Dutch system
   * This is the main entry point
   */
  computeMatching(tournament, ostream = null) {
    // Filter out absent players and sort by score
    const sortedPlayers = this.getSortedPlayers(tournament);
    
    if (sortedPlayers.length < 2) {
      return [];
    }

    // Initialize validity matching computer
    const validityComputer = this.initializeValidityComputer(sortedPlayers);
    
    // Check if pairing is possible
    validityComputer.computeMatching();
    if (!this.isMatchingComplete(validityComputer)) {
      throw new Error('No valid pairing exists');
    }

    // Generate actual pairings using optimal matching
    const pairings = this.generateOptimalPairings(sortedPlayers, validityComputer);
    
    return pairings;
  }

  /**
   * Get sorted players (active players sorted by score)
   */
  getSortedPlayers(tournament) {
    const activePlayers = tournament.players.filter(player => 
      player.isValid && player.matches.length <= tournament.playedRounds
    );

    // Add forbidden pairs from previous matches
    activePlayers.forEach(player => {
      player.matches.forEach(match => {
        if (match.gameWasPlayed) {
          if (Array.isArray(player.forbiddenPairs) && !player.forbiddenPairs.includes(match.opponent)) {
            player.forbiddenPairs.push(match.opponent);
          }
        }
      });
    });

    // Sort by accelerated score (descending)
    return activePlayers.sort((a, b) => {
      const scoreA = a.scoreWithAcceleration(tournament);
      const scoreB = b.scoreWithAcceleration(tournament);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // Tiebreaker: rank index
      return a.rankIndex - b.rankIndex;
    });
  }

  /**
   * Initialize validity matching computer
   */
  initializeValidityComputer(sortedPlayers) {
    const vertexCount = sortedPlayers.length + (sortedPlayers.length % 2);
    const computer = new MatchingComputer(vertexCount, 1);


    // Set edge weights based on compatibility
    for (let i = 0; i < sortedPlayers.length; i++) {
      for (let j = 0; j < sortedPlayers.length; j++) {
        if (i !== j) {
          const player1 = sortedPlayers[i];
          const player2 = sortedPlayers[j];
          const compatible = this.areCompatible(player1, player2, this.tournament);
          computer.setEdgeWeight(i, j, compatible ? 1 : 0);
        }
      }
      
      // Bye compatibility
      if (sortedPlayers.length % 2 === 1) {
        const eligibleForBye = this.isEligibleForBye(sortedPlayers[i]);
        computer.setEdgeWeight(i, sortedPlayers.length, eligibleForBye ? 1 : 0);
      }
    }

    return computer;
  }

  /**
   * Check if two players are compatible for pairing
   */
  areCompatible(player1, player2, tournament) {
    // Check forbidden pairs (players who have already played)
    if (player1.forbiddenPairs && Array.isArray(player1.forbiddenPairs) && player1.forbiddenPairs.includes(player2.id)) {
      return false;
    }
    if (player2.forbiddenPairs && Array.isArray(player2.forbiddenPairs) && player2.forbiddenPairs.includes(player1.id)) {
      return false;
    }

    // Check color preferences
    if (player1.absoluteColorPreference && player2.absoluteColorPreference) {
      if (player1.colorPreference === player2.colorPreference) {
        // Check if this is the last round or if players are in top score threshold
        const topScoreThreshold = tournament.playedRounds * Math.max(tournament.pointsForWin, tournament.pointsForDraw) / 2;
        const isLastRound = tournament.playedRounds >= tournament.expectedRounds - 1;
        const isTopPlayer = player1.points > topScoreThreshold || player2.points > topScoreThreshold;
        
        if (!isLastRound && !isTopPlayer) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if player is eligible for bye
   */
  isEligibleForBye(player) {
    return player.isEligibleForBye(this.tournament);
  }

  /**
   * Check if player is eligible for half-point bye
   */
  isEligibleForHalfPointBye(player) {
    return player.isEligibleForHalfPointBye(this.tournament);
  }

  /**
   * Check if matching is complete
   */
  isMatchingComplete(computer) {
    const matching = computer.getMatching();
    for (let i = 0; i < matching.length; i++) {
      if (matching[i] === i) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate optimal pairings using weighted matching
   */
  generateOptimalPairings(sortedPlayers, validityComputer) {
    const pairings = [];
    const used = new Set();
    
    // Group players by score
    const scoreGroups = this.groupPlayersByScore(sortedPlayers);
    const sortedScores = Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    // Process each score group
    for (const score of sortedScores) {
      const group = scoreGroups[score];
      const groupPairings = this.pairScoreGroup(group, sortedPlayers, used);
      pairings.push(...groupPairings);
    }
    
    return pairings;
  }

  /**
   * Group players by score
   */
  groupPlayersByScore(players) {
    const groups = {};
    players.forEach(player => {
      const score = player.scoreWithAcceleration(this.tournament);
      if (!groups[score]) {
        groups[score] = [];
      }
      groups[score].push(player);
    });
    return groups;
  }

  /**
   * Pair players within a score group
   */
  pairScoreGroup(group, allPlayers, used) {
    const pairings = [];
    const sortedGroup = [...group].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    // Handle odd number of players
    if (sortedGroup.length % 2 === 1) {
      const byePlayer = this.selectByePlayer(sortedGroup);
      const isHalfPointBye = this.isEligibleForHalfPointBye(byePlayer);
      
      pairings.push({
        white_player_id: byePlayer.id,
        black_player_id: null,
        is_bye: true,
        bye_type: isHalfPointBye ? 'half_point_bye' : 'unpaired',
        result: isHalfPointBye ? '1/2-1/2' : '1-0',  // Full bye gets 1-0 (1 point), half-point bye gets 1/2-1/2
        section: 'Open'
      });
      used.add(byePlayer.id);
      
      // Remove bye player from group
      const byeIndex = sortedGroup.indexOf(byePlayer);
      sortedGroup.splice(byeIndex, 1);
    }
    
    // Pair remaining players using Dutch system
    const half = Math.floor(sortedGroup.length / 2);
    const topHalf = sortedGroup.slice(0, half);
    const bottomHalf = sortedGroup.slice(half);
    
    for (let i = 0; i < topHalf.length; i++) {
      const topPlayer = topHalf[i];
      const bottomPlayer = bottomHalf[i];
      
      if (!used.has(topPlayer.id) && !used.has(bottomPlayer.id)) {
        if (this.areCompatible(topPlayer, bottomPlayer, this.tournament)) {
          const whitePlayer = this.assignColors(topPlayer, bottomPlayer);
          const blackPlayer = whitePlayer.id === topPlayer.id ? bottomPlayer : topPlayer;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false,
            section: 'Open'
          });
          
          used.add(topPlayer.id);
          used.add(bottomPlayer.id);
        } else {
          // Find alternative pairing
          this.findAlternativePairing(topPlayer, bottomPlayer, sortedGroup, pairings, used);
        }
      }
    }
    
    return pairings;
  }

  /**
   * Select bye player using sophisticated algorithm
   */
  selectByePlayer(group) {
    // First, try to find players eligible for half-point byes
    const halfPointEligible = group.filter(player => this.isEligibleForHalfPointBye(player));
    if (halfPointEligible.length > 0) {
      // Select the player with the best bye priority (lowest rating among eligible)
      return halfPointEligible.reduce((best, player) => 
        player.getByePriority() < best.getByePriority() ? player : best
      );
    }

    // If no half-point bye eligible players, select from full bye eligible players
    const fullByeEligible = group.filter(player => this.isEligibleForBye(player));
    if (fullByeEligible.length > 0) {
      return fullByeEligible.reduce((best, player) => 
        player.getByePriority() < best.getByePriority() ? player : best
      );
    }

    // Fallback to lowest rated player (should rarely happen)
    return group.reduce((lowest, player) => 
      (player.rating || 0) < (lowest.rating || 0) ? player : lowest
    );
  }

  /**
   * Find alternative pairing when players are incompatible
   */
  findAlternativePairing(topPlayer, bottomPlayer, group, pairings, used) {
    // Try to find alternative within the same halves
    const half = Math.floor(group.length / 2);
    const topHalf = group.slice(0, half);
    const bottomHalf = group.slice(half);
    
    // Try swapping within top half
    for (const alternative of topHalf) {
      if (alternative.id !== topPlayer.id && 
          !used.has(alternative.id) &&
          this.areCompatible(alternative, bottomPlayer, this.tournament)) {
        
        const whitePlayer = this.assignColors(alternative, bottomPlayer);
        const blackPlayer = whitePlayer.id === alternative.id ? bottomPlayer : alternative;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: 'Open'
        });
        
        used.add(alternative.id);
        used.add(bottomPlayer.id);
        return;
      }
    }
    
    // Try swapping within bottom half
    for (const alternative of bottomHalf) {
      if (alternative.id !== bottomPlayer.id && 
          !used.has(alternative.id) &&
          this.areCompatible(topPlayer, alternative, this.tournament)) {
        
        const whitePlayer = this.assignColors(topPlayer, alternative);
        const blackPlayer = whitePlayer.id === topPlayer.id ? alternative : topPlayer;
        
        pairings.push({
          white_player_id: whitePlayer.id,
          black_player_id: blackPlayer.id,
          is_bye: false,
          section: 'Open'
        });
        
        used.add(topPlayer.id);
        used.add(alternative.id);
        return;
      }
    }
    
    // If no alternative found, give bye to top player
    pairings.push({
      white_player_id: topPlayer.id,
      black_player_id: null,
      is_bye: true,
      bye_type: 'bye'
    });
    
    used.add(topPlayer.id);
  }

  /**
   * Assign colors based on Dutch system rules
   * Now uses FIDE-compliant color assignment
   */
  assignColors(player1, player2) {
    const colorAssignment = this.fideCompliance.assignColors(player1, player2);
    return colorAssignment.white;
  }

  /**
   * Get color balance for a player
   */
  getColorBalance(player) {
    let balance = 0;
    player.matches.forEach(match => {
      if (match.gameWasPlayed) {
        balance += match.color === 'WHITE' ? 1 : -1;
      }
    });
    return balance;
  }

  /**
   * Get last two colors played by a player
   */
  getLastTwoColors(player) {
    const colors = [];
    player.matches.forEach(match => {
      if (match.gameWasPlayed) {
        colors.push(match.color === 'WHITE' ? 'W' : 'B');
      }
    });
    
    const lastTwo = colors.slice(-2);
    return lastTwo.join('');
  }
}

module.exports = DutchSystem;
