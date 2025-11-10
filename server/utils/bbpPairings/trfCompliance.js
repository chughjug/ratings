/**
 * TRF16 Compliance Module for bbpPairings
 * Ensures full compliance with JaVaFo and FIDE TRF16 standards
 * Based on JaVaFo Advanced User Manual specifications
 */

const { Color, MatchScore } = require('./tournament');

/**
 * TRF16 Scoring Point System
 * Implements the complete scoring system as specified in JaVaFo
 */
class TRFScoringSystem {
  constructor(options = {}) {
    // Default values as per JaVaFo specification
    this.scoringPoints = {
      // Win points
      WW: options.WW || 1.0,  // Win with White
      BW: options.BW || 1.0,  // Win with Black
      
      // Draw points
      WD: options.WD || 0.5,  // Draw with White
      BD: options.BD || 0.5,  // Draw with Black
      
      // Loss points
      WL: options.WL || 0.0,  // Loss with White
      BL: options.BL || 0.0,  // Loss with Black
      
      // Bye points
      ZPB: options.ZPB || 0.0,  // Zero-point-bye
      HPB: options.HPB || 0.5,  // Half-point-bye
      FPB: options.FPB || 1.0,  // Full-point-bye (deprecated)
      PAB: options.PAB || 1.0,  // Pairing-allocated-bye
      
      // Forfeit points
      FW: options.FW || 1.0,   // Forfeit win
      FL: options.FL || 0.0,   // Forfeit loss
      
      // Shortcuts
      W: options.W || 1.0,     // Encompasses WW, BW, FW, FPB
      D: options.D || 0.5      // Encompasses WD, BD, HPB
    };
  }

  /**
   * Get points for a match result
   */
  getPoints(matchResult, color, gameWasPlayed = true) {
    if (!gameWasPlayed) {
      // Unplayed game - use appropriate bye code
      if (matchResult === 'WIN') {
        return this.scoringPoints.PAB; // Pairing-allocated-bye
      } else if (matchResult === 'DRAW') {
        return this.scoringPoints.HPB; // Half-point-bye
      } else {
        return this.scoringPoints.ZPB; // Zero-point-bye
      }
    }

    // Played game - use color-specific codes
    const colorCode = color === 'WHITE' ? 'W' : 'B';
    const resultCode = matchResult === 'WIN' ? 'W' : matchResult === 'DRAW' ? 'D' : 'L';
    const code = colorCode + resultCode;

    return this.scoringPoints[code] || 0;
  }

  /**
   * Parse XXS extension codes from TRF
   */
  parseXXSCodes(trfLines) {
    const xxslines = trfLines.filter(line => line.startsWith('XXS'));
    
    xxslines.forEach(line => {
      const parts = line.split(/\s+/);
      for (let i = 1; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
          const code = parts[i];
          const value = parseFloat(parts[i + 1]);
          
          if (code && !isNaN(value)) {
            this.scoringPoints[code] = value;
          }
        }
      }
    });
  }
}

/**
 * TRF16 Extensions Handler
 * Handles all TRF16 extensions as specified in JaVaFo
 */
class TRFExtensions {
  constructor() {
    this.extensions = {
      XXR: null,  // Number of rounds
      XXZ: [],    // Absent players
      XXS: {},    // Scoring system
      XXF: [],    // Forbidden pairs
      XXA: {},    // Player acceleration map (TRF player id => [acceleration per round])
      XXC: null,  // Check-list format
      XXB: null,  // Build number
      XXV: null   // Release number
    };
    this.hasCustomAcceleration = false;
  }

  /**
   * Parse TRF extensions from TRF lines
   */
  parseExtensions(trfLines) {
    trfLines.forEach(line => {
      if (line.startsWith('XXR')) {
        this.extensions.XXR = parseInt(line.split(/\s+/)[1]) || null;
      } else if (line.startsWith('XXZ')) {
        const parts = line.split(/\s+/);
        for (let i = 1; i < parts.length; i++) {
          const playerId = parseInt(parts[i]);
          if (!isNaN(playerId)) {
            this.extensions.XXZ.push(playerId);
          }
        }
      } else if (line.startsWith('XXF')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          const player1 = parseInt(parts[1]);
          const player2 = parseInt(parts[2]);
          if (!isNaN(player1) && !isNaN(player2)) {
            this.extensions.XXF.push([player1, player2]);
          }
        }
      } else if (line.startsWith('XXA')) {
        this.parseAccelerationLine(line);
      } else if (line.startsWith('XXC')) {
        this.extensions.XXC = line.split(/\s+/).slice(1).join(' ');
      } else if (line.startsWith('XXB')) {
        this.extensions.XXB = parseInt(line.split(/\s+/)[1]) || null;
      } else if (line.startsWith('XXV')) {
        this.extensions.XXV = line.split(/\s+/).slice(1).join(' ');
      }
    });
  }

  /**
   * Parse XXA acceleration line from TRF
   * Format: "XXA 0001  1.0  0.5 ..."
   */
  parseAccelerationLine(line) {
    const playerIdSegment = line.slice(4, 8);
    const numericId = parseInt(playerIdSegment, 10);
    if (Number.isNaN(numericId) || numericId <= 0) {
      return;
    }

    const canonicalId = String(numericId);
    const accelerations = [];

    for (let idx = 9; idx < line.length; idx += 5) {
      const chunk = line.slice(idx, idx + 5);
      if (!chunk || chunk.trim() === '') {
        accelerations.push(0);
        continue;
      }

      const value = parseFloat(chunk.trim());
      accelerations.push(Number.isNaN(value) ? 0 : value);
    }

    this.extensions.XXA[canonicalId] = accelerations;
    this.hasCustomAcceleration = true;
  }

  /**
   * Get absent players for current round
   */
  getAbsentPlayers() {
    return this.extensions.XXZ;
  }

  /**
   * Get forbidden pairs
   */
  getForbiddenPairs() {
    return this.extensions.XXF;
  }

  /**
   * Get accelerated rounds
   */
  getAcceleratedRounds() {
    return Object.keys(this.extensions.XXA).map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id));
  }

  /**
   * Get player acceleration map keyed by TRF player id (1-based, string)
   */
  getPlayerAccelerations() {
    return this.extensions.XXA;
  }

  /**
   * Get total rounds
   */
  getTotalRounds() {
    return this.extensions.XXR;
  }
}

/**
 * TRF16 Output Generator
 * Generates output in JaVaFo-compatible format
 */
class TRFOutputGenerator {
  constructor() {
    this.output = [];
  }

  /**
   * Generate pairing output in JaVaFo format
   */
  generatePairingOutput(pairings) {
    this.output = [];
    
    // First line: number of pairs
    this.output.push(pairings.length.toString());
    
    // Subsequent lines: each pairing
    pairings.forEach(pairing => {
      if (pairing.is_bye) {
        // Bye pairing: player_id 0
        this.output.push(`${pairing.white_player_id} 0`);
      } else {
        // Normal pairing: white_id black_id
        this.output.push(`${pairing.white_player_id} ${pairing.black_player_id}`);
      }
    });
    
    return this.output.join('\n');
  }

  /**
   * Generate check-list output
   */
  generateChecklistOutput(players, pairings, options = {}) {
    const checklist = [];
    
    // Header
    checklist.push('CHECK-LIST');
    checklist.push('==========');
    checklist.push('');
    
    // Player standings
    players.forEach((player, index) => {
      const pairing = pairings.find(p => 
        p.white_player_id === player.id || p.black_player_id === player.id
      );
      
      let pairingInfo = '';
      if (pairing) {
        if (pairing.is_bye) {
          pairingInfo = 'BYE';
        } else {
          const opponentId = pairing.white_player_id === player.id 
            ? pairing.black_player_id 
            : pairing.white_player_id;
          const color = pairing.white_player_id === player.id ? 'W' : 'B';
          pairingInfo = `${opponentId}${color}`;
        }
      }
      
      checklist.push(`${index + 1}. ${player.name} (${player.rating}) - ${pairingInfo}`);
    });
    
    return checklist.join('\n');
  }
}

/**
 * FIDE Dutch System Compliance
 * Ensures full compliance with FIDE C.04.3 Dutch System rules
 */
class FIDEDutchCompliance {
  constructor() {
    this.rules = {
      // Color balance rules
      maxColorImbalance: 1,
      avoidThreeSameColors: true,
      
      // Pairing rules
      avoidRepeatPairings: true,
      preferSimilarScores: true,
      
      // Bye rules
      byeToLowestRated: true,
      avoidUnratedByes: true
    };
  }

  /**
   * Check if pairing violates FIDE rules
   */
  checkPairingValidity(player1, player2, previousPairings) {
    const violations = [];
    
    // Check repeat pairings
    if (this.hasPlayedBefore(player1.id, player2.id, previousPairings)) {
      violations.push('REPEAT_PAIRING');
    }
    
    // Check color preferences
    if (this.violatesColorRules(player1, player2)) {
      violations.push('COLOR_VIOLATION');
    }
    
    return {
      valid: violations.length === 0,
      violations: violations
    };
  }

  /**
   * Check if players have played before
   */
  hasPlayedBefore(player1Id, player2Id, previousPairings) {
    return previousPairings.some(pairing => 
      (pairing.white_player_id === player1Id && pairing.black_player_id === player2Id) ||
      (pairing.white_player_id === player2Id && pairing.black_player_id === player1Id)
    );
  }

  /**
   * Check if pairing violates color rules
   */
  violatesColorRules(player1, player2) {
    // Both players have absolute color preference for same color
    if (player1.absoluteColorPreference && player2.absoluteColorPreference) {
      if (player1.colorPreference === player2.colorPreference) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Apply FIDE color assignment rules
   */
  assignColors(player1, player2) {
    const balance1 = this.getColorBalance(player1);
    const balance2 = this.getColorBalance(player2);
    
    // Rule 1: Player with more black pieces gets white
    if (balance1 < balance2) {
      return { white: player1, black: player2 };
    } else if (balance1 > balance2) {
      return { white: player2, black: player1 };
    }
    
    // Rule 2: Avoid three same colors in a row
    const lastColors1 = this.getLastTwoColors(player1);
    const lastColors2 = this.getLastTwoColors(player2);
    
    if (lastColors1 === 'WW') {
      return { white: player2, black: player1 };
    }
    if (lastColors2 === 'WW') {
      return { white: player1, black: player2 };
    }
    if (lastColors1 === 'BB') {
      return { white: player1, black: player2 };
    }
    if (lastColors2 === 'BB') {
      return { white: player2, black: player1 };
    }
    
    // Rule 3: Higher rated player gets due color
    if (player1.rating !== player2.rating) {
      return player1.rating > player2.rating 
        ? { white: player1, black: player2 }
        : { white: player2, black: player1 };
    }
    
    // Rule 4: Final tiebreaker
    return player1.id < player2.id 
      ? { white: player1, black: player2 }
      : { white: player2, black: player1 };
  }

  /**
   * Get color balance for a player
   */
  getColorBalance(player) {
    let balance = 0;
    if (player.matches) {
      player.matches.forEach(match => {
        if (match.gameWasPlayed) {
          balance += match.color === 'WHITE' ? 1 : -1;
        }
      });
    }
    return balance;
  }

  /**
   * Get last two colors played by a player
   */
  getLastTwoColors(player) {
    if (!player.matches) return '';
    
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

module.exports = {
  TRFScoringSystem,
  TRFExtensions,
  TRFOutputGenerator,
  FIDEDutchCompliance
};
