/**
 * BBP Pairings Tournament Structure
 * JavaScript implementation of the tournament data structure
 * Based on the C++ implementation from bbpPairings-master
 */

class Tournament {
  constructor(options = {}) {
    this.players = [];
    this.playedRounds = 0;
    this.expectedRounds = options.expectedRounds || 0;
    this.pointsForWin = options.pointsForWin || 10;
    this.pointsForDraw = options.pointsForDraw || 5;
    this.pointsForLoss = options.pointsForLoss || 0;
    this.pointsForZeroPointBye = options.pointsForZeroPointBye || 0;
    this.pointsForForfeitLoss = options.pointsForForfeitLoss || 0;
    this.pointsForPairingAllocatedBye = options.pointsForPairingAllocatedBye || 10;
    this.initialColor = options.initialColor || 'WHITE';
    this.defaultAcceleration = options.defaultAcceleration || true;
  }

  /**
   * Add a player to the tournament
   */
  addPlayer(playerData) {
    const player = new Player(playerData);
    this.players.push(player);
    return player;
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  /**
   * Get points for a match result
   */
  getPoints(player, match) {
    if (match.matchScore === 'LOSS') {
      return match.participatedInPairing
        ? (match.gameWasPlayed ? this.pointsForLoss : this.pointsForForfeitLoss)
        : this.pointsForZeroPointBye;
    } else if (match.matchScore === 'WIN') {
      return match.opponent === player.id && match.participatedInPairing
        ? this.pointsForPairingAllocatedBye
        : this.pointsForWin;
    } else {
      return this.pointsForDraw;
    }
  }

  /**
   * Update player data after each round
   */
  updatePlayerData() {
    this.players.forEach(player => {
      player.updateColorPreferences();
      player.updateAccelerations(this);
      player.updateByeTracking();
    });
  }
}

class Player {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '';
    this.rating = data.rating || 0;
    this.matches = data.matches || [];
    this.accelerations = data.accelerations || [];
    this.forbiddenPairs = data.forbiddenPairs || [];
    this.colorImbalance = 0;
    this.rankIndex = data.rankIndex || 0;
    this.scoreWithoutAcceleration = data.scoreWithoutAcceleration || data.points || 0;
    this.points = data.points || 0;
    this.colorPreference = 'NONE';
    this.repeatedColor = 'NONE';
    this.strongColorPreference = false;
    this.isValid = data.isValid !== false;
    
    // Bye tracking
    this.byeCount = data.byeCount || 0;
    this.halfPointByeCount = data.halfPointByeCount || 0;
    this.fullByeCount = data.fullByeCount || 0;
    this.byeRounds = data.byeRounds || [];
    this.intentionalByeRounds = data.intentionalByeRounds || [];
  }

  /**
   * Get score with acceleration
   */
  scoreWithAcceleration(tournament, roundsBack = 0) {
    let score = this.scoreWithoutAcceleration || this.points || 0;
    let roundIndex = tournament.playedRounds;
    
    while (roundsBack > 0) {
      roundIndex--;
      if (roundIndex < this.matches.length) {
        score -= tournament.getPoints(this, this.matches[roundIndex]);
      }
      roundsBack--;
    }

    const acceleration = this.acceleration(tournament);
    const result = score + acceleration;
    
    if (result < score) {
      throw new Error('Accelerated score overflow');
    }
    
    return result;
  }

  /**
   * Get acceleration for current round
   */
  acceleration(tournament) {
    return tournament.playedRounds >= this.accelerations.length
      ? 0
      : this.accelerations[tournament.playedRounds];
  }

  /**
   * Check if player has absolute color imbalance
   */
  absoluteColorImbalance() {
    return this.colorImbalance > 1;
  }

  /**
   * Check if player has absolute color preference
   */
  absoluteColorPreference() {
    return this.absoluteColorImbalance() || this.repeatedColor !== 'NONE';
  }

  /**
   * Update color preferences based on match history
   */
  updateColorPreferences() {
    if (!this.isValid) return;

    let gamesAsWhite = 0;
    let gamesAsBlack = 0;
    let consecutiveCount = 0;
    let lastColor = null;

    this.matches.forEach(match => {
      if (match.gameWasPlayed) {
        if (match.color === 'WHITE') {
          gamesAsWhite++;
        } else if (match.color === 'BLACK') {
          gamesAsBlack++;
        }

        if (!consecutiveCount || match.color !== this.repeatedColor) {
          consecutiveCount = 1;
        } else {
          consecutiveCount++;
        }
        this.repeatedColor = match.color;
      }
    });

    const lowerColor = gamesAsWhite > gamesAsBlack ? 'BLACK' : 'WHITE';
    this.colorImbalance = lowerColor === 'BLACK'
      ? gamesAsWhite - gamesAsBlack
      : gamesAsBlack - gamesAsWhite;

    this.colorPreference = this.colorImbalance > 1 ? lowerColor
      : consecutiveCount > 1 ? this.invertColor(this.repeatedColor)
      : this.colorImbalance > 0 ? lowerColor
      : consecutiveCount ? this.invertColor(this.repeatedColor)
      : 'NONE';

    if (consecutiveCount <= 1) {
      this.repeatedColor = 'NONE';
    }

    this.strongColorPreference = !this.absoluteColorPreference() && this.colorImbalance !== 0;
  }

  /**
   * Update accelerations
   */
  updateAccelerations(tournament) {
    // Implementation depends on specific acceleration rules
    // This is a placeholder for the actual acceleration logic
  }

  /**
   * Invert color
   */
  invertColor(color) {
    return color === 'WHITE' ? 'BLACK' : color === 'BLACK' ? 'WHITE' : 'NONE';
  }

  /**
   * Update bye tracking based on match history
   */
  updateByeTracking() {
    if (!this.isValid) return;

    this.byeCount = 0;
    this.halfPointByeCount = 0;
    this.fullByeCount = 0;
    this.byeRounds = [];

    this.matches.forEach((match, index) => {
      if (!match.gameWasPlayed && match.participatedInPairing) {
        this.byeCount++;
        this.byeRounds.push(index + 1); // Round numbers are 1-indexed
        
        if (match.matchScore === 'WIN') {
          this.fullByeCount++;
        } else if (match.matchScore === 'DRAW') {
          this.halfPointByeCount++;
        }
      }
    });
  }

  /**
   * Check if player is eligible for a bye
   */
  isEligibleForBye(tournament) {
    // Players who have already received a bye in the current tournament are not eligible
    if (this.byeCount > 0) {
      return false;
    }
    
    // Players with intentional byes are not eligible for pairing-allocated byes
    if (this.intentionalByeRounds && this.intentionalByeRounds.length > 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if player is eligible for half-point bye
   */
  isEligibleForHalfPointBye(tournament) {
    // Players who have already received a full bye are eligible for half-point byes
    return this.fullByeCount > 0 && this.halfPointByeCount === 0;
  }

  /**
   * Get bye priority (lower is better for bye selection)
   */
  getByePriority() {
    // Priority based on bye history and rating
    let priority = this.byeCount * 1000; // Heavily penalize players who already had byes
    priority += this.rating || 0; // Use rating as tiebreaker
    return priority;
  }
}

class Match {
  constructor(opponent, color = 'NONE', matchScore = 'LOSS', gameWasPlayed = false, participatedInPairing = false) {
    this.opponent = opponent;
    this.color = color;
    this.matchScore = matchScore;
    this.gameWasPlayed = gameWasPlayed;
    this.participatedInPairing = participatedInPairing;
  }
}

/**
 * Color enumeration
 */
const Color = {
  WHITE: 'WHITE',
  BLACK: 'BLACK',
  NONE: 'NONE'
};

/**
 * Match score enumeration
 */
const MatchScore = {
  LOSS: 'LOSS',
  DRAW: 'DRAW',
  WIN: 'WIN'
};

/**
 * Invert color
 */
function invertColor(color) {
  return color === Color.WHITE ? Color.BLACK
    : color === Color.BLACK ? Color.WHITE
    : Color.NONE;
}

/**
 * Invert match score
 */
function invertMatchScore(matchScore) {
  return matchScore === MatchScore.LOSS ? MatchScore.WIN
    : matchScore === MatchScore.WIN ? MatchScore.LOSS
    : MatchScore.DRAW;
}

module.exports = {
  Tournament,
  Player,
  Match,
  Color,
  MatchScore,
  invertColor,
  invertMatchScore
};
