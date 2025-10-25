/**
 * BBP Pairings Burstein System Implementation
 * JavaScript port of the Burstein pairing system from bbpPairings-master
 * 
 * Implements the Burstein system with sophisticated tiebreak calculations
 * Based on FIDE Burstein system rules
 */

const MatchingComputer = require('./matchingComputer');
const { Tournament, Player, Color, invertColor } = require('./tournament');

class BursteinSystem {
  constructor(tournament, options = {}) {
    this.tournament = tournament;
    this.options = {
      maxPlayers: 9999,
      maxPoints: 1998,
      maxRounds: 20,
      ...options
    };
  }

  /**
   * Compute pairings using Burstein system
   */
  computeMatching(tournament, ostream = null) {
    // Get active players and calculate tiebreak scores
    const sortedPlayers = this.getSortedPlayersWithTiebreaks(tournament);
    
    if (sortedPlayers.length < 2) {
      return [];
    }

    // Handle bye player
    let byePlayer = null;
    let playersToPair = [...sortedPlayers];
    
    if (sortedPlayers.length % 2 === 1) {
      byePlayer = this.selectByePlayer(sortedPlayers);
      playersToPair = sortedPlayers.filter(p => p.id !== byePlayer.id);
    }

    // Generate pairings for remaining players
    const pairings = this.generatePairings(playersToPair);
    
    // Add bye pairing if needed
    if (byePlayer) {
      pairings.push({
        white_player_id: byePlayer.id,
        black_player_id: null,
        is_bye: true,
        bye_type: 'bye'
      });
    }
    
    return pairings;
  }

  /**
   * Get sorted players with tiebreak calculations
   */
  getSortedPlayersWithTiebreaks(tournament) {
    const activePlayers = tournament.players.filter(player => 
      player.isValid && player.matches.length <= tournament.playedRounds
    );

    // Calculate adjusted scores and tiebreaks
    const playersWithTiebreaks = activePlayers.map(player => {
      const adjustedScore = this.calculateAdjustedScore(player, tournament);
      const sonnebornBerger = this.calculateSonnebornBerger(player, tournament);
      const buchholz = this.calculateBuchholz(player, tournament);
      const median = this.calculateMedian(player, tournament);
      
      return {
        ...player,
        adjustedScore,
        sonnebornBerger,
        buchholz,
        median,
        metricScores: {
          playerScore: player.scoreWithAcceleration(tournament),
          sonnebornBerger,
          buchholzTiebreak: buchholz,
          medianTiebreak: median,
          rankIndex: player.rankIndex
        }
      };
    });

    // Sort by score, then by tiebreaks
    return playersWithTiebreaks.sort((a, b) => {
      const scoreA = a.scoreWithAcceleration ? a.scoreWithAcceleration(tournament) : a.points || 0;
      const scoreB = b.scoreWithAcceleration ? b.scoreWithAcceleration(tournament) : b.points || 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // Tiebreakers in order: Sonneborn-Berger, Buchholz, Median, Rank
      if (a.sonnebornBerger !== b.sonnebornBerger) {
        return b.sonnebornBerger - a.sonnebornBerger;
      }
      
      if (a.buchholz !== b.buchholz) {
        return b.buchholz - a.buchholz;
      }
      
      if (a.median !== b.median) {
        return b.median - a.median;
      }
      
      return a.rankIndex - b.rankIndex;
    });
  }

  /**
   * Calculate adjusted score (unplayed games count as draws)
   */
  calculateAdjustedScore(player, tournament) {
    let adjustedScore = player.acceleration(tournament);
    
    player.matches.forEach(match => {
      if (match.gameWasPlayed) {
        adjustedScore += tournament.getPoints(player, match);
      } else {
        adjustedScore += tournament.pointsForDraw;
      }
    });
    
    return adjustedScore;
  }

  /**
   * Calculate Sonneborn-Berger score
   */
  calculateSonnebornBerger(player, tournament) {
    let totalScore = 0;
    
    player.matches.forEach(match => {
      if (match.gameWasPlayed) {
        const opponent = tournament.getPlayer(match.opponent);
        if (opponent) {
          const opponentAdjustedScore = this.calculateAdjustedScore(opponent, tournament);
          const playerResult = this.getPlayerResult(match, player.id);
          
          if (playerResult === 1) {
            totalScore += opponentAdjustedScore; // Full points for wins
          } else if (playerResult === 0.5) {
            totalScore += opponentAdjustedScore * 0.5; // Half points for draws
          }
        }
      } else {
        // Unplayed game - use virtual opponent score
        const virtualOpponentScore = this.getVirtualOpponentScore(player, match, tournament);
        const playerResult = this.getPlayerResult(match, player.id);
        
        if (playerResult === 1) {
          totalScore += virtualOpponentScore;
        } else if (playerResult === 0.5) {
          totalScore += virtualOpponentScore * 0.5;
        }
      }
    });
    
    return totalScore;
  }

  /**
   * Calculate Buchholz score
   */
  calculateBuchholz(player, tournament) {
    let totalScore = 0;
    
    player.matches.forEach(match => {
      if (match.gameWasPlayed) {
        const opponent = tournament.getPlayer(match.opponent);
        if (opponent) {
          totalScore += this.calculateAdjustedScore(opponent, tournament);
        }
      } else {
        totalScore += this.getVirtualOpponentScore(player, match, tournament);
      }
    });
    
    return totalScore;
  }

  /**
   * Calculate Median score (Buchholz with highest and lowest removed)
   */
  calculateMedian(player, tournament) {
    if (tournament.playedRounds <= 2) {
      return 0;
    }
    
    const opponentScores = [];
    
    player.matches.forEach(match => {
      if (match.gameWasPlayed) {
        const opponent = tournament.getPlayer(match.opponent);
        if (opponent) {
          opponentScores.push(this.calculateAdjustedScore(opponent, tournament));
        }
      } else {
        opponentScores.push(this.getVirtualOpponentScore(player, match, tournament));
      }
    });
    
    if (opponentScores.length === 0) return 0;
    
    // Sort and remove highest and lowest
    opponentScores.sort((a, b) => a - b);
    const trimmedScores = opponentScores.slice(1, -1);
    
    return trimmedScores.reduce((sum, score) => sum + score, 0);
  }

  /**
   * Get virtual opponent score for unplayed games
   */
  getVirtualOpponentScore(player, match, tournament) {
    if (match.matchScore === 'LOSS') {
      return tournament.pointsForWin;
    } else if (match.matchScore === 'DRAW') {
      return tournament.pointsForDraw;
    } else if (match.opponent === player.id && match.participatedInPairing) {
      return tournament.pointsForPairingAllocatedBye < tournament.pointsForWin
        ? (tournament.pointsForPairingAllocatedBye < tournament.pointsForDraw
           ? tournament.pointsForWin
           : tournament.pointsForDraw)
        : tournament.pointsForWin;
    } else {
      return tournament.pointsForForfeitLoss;
    }
  }

  /**
   * Get player result from a match
   */
  getPlayerResult(match, playerId) {
    if (!match.result) return 0;
    
    const isWhite = match.white_player_id === playerId;
    
    if (match.result === '1-0') {
      return isWhite ? 1 : 0;
    } else if (match.result === '0-1') {
      return isWhite ? 0 : 1;
    } else if (match.result === '1/2-1/2') {
      return 0.5;
    }
    
    return 0;
  }

  /**
   * Select bye player (lowest ranked eligible player)
   */
  selectByePlayer(players) {
    // Find lowest ranked player eligible for bye
    for (let i = players.length - 1; i >= 0; i--) {
      if (this.isEligibleForBye(players[i])) {
        return players[i];
      }
    }
    
    // If no eligible player found, return lowest ranked
    return players[players.length - 1];
  }

  /**
   * Check if player is eligible for bye
   */
  isEligibleForBye(player) {
    for (const match of player.matches) {
      if (!match.gameWasPlayed && 
          match.participatedInPairing && 
          match.matchScore === 'WIN') {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate pairings using score groups
   */
  generatePairings(players) {
    const pairings = [];
    const used = new Set();
    
    // Group players by score
    const scoreGroups = this.groupPlayersByScore(players);
    const sortedScores = Object.keys(scoreGroups).sort((a, b) => parseFloat(b) - parseFloat(a));
    
    // Process each score group
    for (const score of sortedScores) {
      const group = scoreGroups[score];
      const groupPairings = this.pairScoreGroup(group, used);
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
      const score = player.scoreWithAcceleration ? player.scoreWithAcceleration(this.tournament) : player.points || 0;
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
  pairScoreGroup(group, used) {
    const pairings = [];
    const sortedGroup = [...group].sort((a, b) => {
      // Sort by tiebreaks within score group
      if (a.sonnebornBerger !== b.sonnebornBerger) {
        return b.sonnebornBerger - a.sonnebornBerger;
      }
      if (a.buchholz !== b.buchholz) {
        return b.buchholz - a.buchholz;
      }
      if (a.median !== b.median) {
        return b.median - a.median;
      }
      return a.rankIndex - b.rankIndex;
    });
    
    // Pair top half vs bottom half
    const half = Math.floor(sortedGroup.length / 2);
    const topHalf = sortedGroup.slice(0, half);
    const bottomHalf = sortedGroup.slice(half);
    
    for (let i = 0; i < topHalf.length; i++) {
      const topPlayer = topHalf[i];
      const bottomPlayer = bottomHalf[i];
      
      if (!used.has(topPlayer.id) && !used.has(bottomPlayer.id)) {
        if (this.areCompatible(topPlayer, bottomPlayer)) {
          const whitePlayer = this.assignColors(topPlayer, bottomPlayer);
          const blackPlayer = whitePlayer.id === topPlayer.id ? bottomPlayer : topPlayer;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false
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
   * Check if two players are compatible
   */
  areCompatible(player1, player2) {
    // Check forbidden pairs
    if (player1.forbiddenPairs && player1.forbiddenPairs.has(player2.id)) {
      return false;
    }
    if (player2.forbiddenPairs && player2.forbiddenPairs.has(player1.id)) {
      return false;
    }
    
    // Check color preferences
    const player1HasColorPref = player1.absoluteColorPreference ? player1.absoluteColorPreference() : false;
    const player2HasColorPref = player2.absoluteColorPreference ? player2.absoluteColorPreference() : false;
    
    if (player1HasColorPref && player2HasColorPref) {
      if (player1.colorPreference === player2.colorPreference) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Find alternative pairing
   */
  findAlternativePairing(topPlayer, bottomPlayer, group, pairings, used) {
    // Try to find alternative within the group
    for (const alternative of group) {
      if (alternative.id !== topPlayer.id && 
          alternative.id !== bottomPlayer.id &&
          !used.has(alternative.id)) {
        
        if (this.areCompatible(topPlayer, alternative)) {
          const whitePlayer = this.assignColors(topPlayer, alternative);
          const blackPlayer = whitePlayer.id === topPlayer.id ? alternative : topPlayer;
          
          pairings.push({
            white_player_id: whitePlayer.id,
            black_player_id: blackPlayer.id,
            is_bye: false
          });
          
          used.add(topPlayer.id);
          used.add(alternative.id);
          return;
        }
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
   * Assign colors based on Burstein system rules
   */
  assignColors(player1, player2) {
    const balance1 = this.getColorBalance(player1);
    const balance2 = this.getColorBalance(player2);
    
    // Rule 1: Player with more black pieces should get white
    if (balance1 < balance2) {
      return player1;
    } else if (balance1 > balance2) {
      return player2;
    }
    
    // Rule 2: Avoid same color three times in a row
    const lastColors1 = this.getLastTwoColors(player1);
    const lastColors2 = this.getLastTwoColors(player2);
    
    if (lastColors1 === 'WW') return player2;
    if (lastColors2 === 'WW') return player1;
    if (lastColors1 === 'BB') return player1;
    if (lastColors2 === 'BB') return player2;
    
    // Rule 3: Higher ranked player gets due color
    if (player1.rankIndex !== player2.rankIndex) {
      return player1.rankIndex < player2.rankIndex ? player1 : player2;
    }
    
    // Rule 4: Final tiebreaker
    return player1.id < player2.id ? player1 : player2;
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

module.exports = BursteinSystem;
