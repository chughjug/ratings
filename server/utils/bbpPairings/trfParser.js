/**
 * TRF16 Parser for bbpPairings
 * Parses TRF16 format input as specified in JaVaFo Advanced User Manual
 * Supports all TRF16 extensions and ensures full compliance
 */

const { TRFScoringSystem, TRFExtensions } = require('./trfCompliance');
const { Tournament, Player, Match, Color, MatchScore } = require('./tournament');

class TRFParser {
  constructor() {
    this.scoringSystem = new TRFScoringSystem();
    this.extensions = new TRFExtensions();
  }

  /**
   * Parse TRF16 file content
   */
  parseTRF(trfContent) {
    const lines = trfContent.split('\n').map(line => line.trim()).filter(line => line);
    
    // Parse extensions first
    this.extensions.parseExtensions(lines);
    this.scoringSystem.parseXXSCodes(lines);
    
    // Parse tournament header
    const tournament = this.parseTournamentHeader(lines);
    
    // Parse players
    const players = this.parsePlayers(lines);
    
    // Parse pairings
    const pairings = this.parsePairings(lines);
    
    return {
      tournament,
      players,
      pairings,
      extensions: this.extensions.extensions,
      scoringSystem: this.scoringSystem
    };
  }

  /**
   * Parse tournament header from TRF
   */
  parseTournamentHeader(lines) {
    const headerLine = lines.find(line => line.startsWith('001'));
    if (!headerLine) {
      throw new Error('Invalid TRF: Missing tournament header (001 line)');
    }

    // Parse tournament header according to TRF16 specification
    const tournament = {
      id: headerLine.substring(3, 8).trim(),
      name: headerLine.substring(8, 38).trim(),
      city: headerLine.substring(38, 58).trim(),
      federation: headerLine.substring(58, 61).trim(),
      startDate: headerLine.substring(61, 69).trim(),
      endDate: headerLine.substring(69, 77).trim(),
      totalRounds: this.extensions.getTotalRounds() || parseInt(headerLine.substring(77, 79).trim()) || 0,
      type: headerLine.substring(79, 81).trim(),
      chiefArbiter: headerLine.substring(81, 111).trim(),
      deputyArbiters: headerLine.substring(111, 141).trim(),
      timeControl: headerLine.substring(141, 151).trim(),
      ratingSystem: headerLine.substring(151, 161).trim(),
      round: headerLine.substring(161, 163).trim()
    };

    return tournament;
  }

  /**
   * Parse players from TRF
   */
  parsePlayers(lines) {
    const playerLines = lines.filter(line => line.startsWith('001') && line.length > 200);
    const players = [];

    playerLines.forEach(line => {
      const player = this.parsePlayerLine(line);
      if (player) {
        players.push(player);
      }
    });

    return players;
  }

  /**
   * Parse individual player line
   */
  parsePlayerLine(line) {
    if (line.length < 200) {
      return null; // Invalid player line
    }

    const player = {
      id: line.substring(3, 8).trim(),
      name: line.substring(8, 38).trim(),
      federation: line.substring(38, 41).trim(),
      fideId: line.substring(41, 51).trim(),
      fideTitle: line.substring(51, 56).trim(),
      rating: parseInt(line.substring(56, 60).trim()) || 0,
      rapidRating: parseInt(line.substring(60, 64).trim()) || 0,
      blitzRating: parseInt(line.substring(64, 68).trim()) || 0,
      birthYear: parseInt(line.substring(68, 72).trim()) || 0,
      sex: line.substring(72, 73).trim(),
      points: parseFloat(line.substring(81, 85).trim()) || 0,
      rank: parseInt(line.substring(85, 88).trim()) || 0,
      matches: []
    };

    // Parse match results
    for (let round = 1; round <= 20; round++) {
      const startPos = 88 + (round - 1) * 10;
      const endPos = startPos + 10;
      
      if (endPos <= line.length) {
        const matchResult = line.substring(startPos, endPos).trim();
        if (matchResult && matchResult !== '0000') {
          const match = this.parseMatchResult(matchResult, round);
          if (match) {
            player.matches.push(match);
          }
        }
      }
    }

    return player;
  }

  /**
   * Parse match result from TRF format
   */
  parseMatchResult(resultCode, round) {
    if (resultCode.length < 4) return null;

    const opponentId = resultCode.substring(0, 4);
    const result = resultCode.substring(5, 8);
    const color = resultCode.substring(8, 9);
    const specialCode = resultCode.substring(9, 10);

    let matchScore = 'LOSS';
    let gameWasPlayed = true;
    let participatedInPairing = true;

    // Parse result
    if (result === '1-0') {
      matchScore = 'WIN';
    } else if (result === '0-1') {
      matchScore = 'LOSS';
    } else if (result === '1/2') {
      matchScore = 'DRAW';
    } else if (result === '000') {
      gameWasPlayed = false;
      matchScore = 'LOSS';
    }

    // Parse special codes
    if (specialCode === 'Z') {
      // Zero-point bye
      gameWasPlayed = false;
      participatedInPairing = false;
      matchScore = 'LOSS';
    } else if (specialCode === 'H') {
      // Half-point bye
      gameWasPlayed = false;
      participatedInPairing = true;
      matchScore = 'DRAW';
    } else if (specialCode === 'F') {
      // Full-point bye (deprecated)
      gameWasPlayed = false;
      participatedInPairing = true;
      matchScore = 'WIN';
    } else if (specialCode === 'U') {
      // Unplayed game
      gameWasPlayed = false;
      participatedInPairing = true;
      matchScore = 'LOSS';
    }

    // Parse color
    let playerColor = 'NONE';
    if (color === 'w') {
      playerColor = 'WHITE';
    } else if (color === 'b') {
      playerColor = 'BLACK';
    }

    return new Match(
      opponentId,
      playerColor,
      matchScore,
      gameWasPlayed,
      participatedInPairing
    );
  }

  /**
   * Parse pairings from TRF
   */
  parsePairings(lines) {
    const pairingLines = lines.filter(line => line.startsWith('002'));
    const pairings = [];

    pairingLines.forEach(line => {
      const pairing = this.parsePairingLine(line);
      if (pairing) {
        pairings.push(pairing);
      }
    });

    return pairings;
  }

  /**
   * Parse individual pairing line
   */
  parsePairingLine(line) {
    if (line.length < 20) return null;

    const whiteId = line.substring(3, 8).trim();
    const blackId = line.substring(8, 13).trim();
    const result = line.substring(13, 18).trim();
    const specialCode = line.substring(18, 19).trim();

    if (whiteId === '00000' || blackId === '00000') {
      return null; // Invalid pairing
    }

    return {
      white_player_id: whiteId,
      black_player_id: blackId,
      result: result,
      special_code: specialCode,
      is_bye: blackId === '00000'
    };
  }

  /**
   * Convert TRF data to bbpPairings format
   */
  convertToBBPFormat(trfData) {
    const tournament = new Tournament({
      expectedRounds: trfData.tournament.totalRounds,
      scoringSystem: trfData.scoringSystem
    });

    // Add players
    trfData.players.forEach(playerData => {
      const player = tournament.addPlayer({
        id: playerData.id,
        name: playerData.name,
        rating: playerData.rating,
        rankIndex: playerData.rank - 1,
        points: playerData.points,
        matches: playerData.matches,
        forbiddenPairs: this.extensions.getForbiddenPairs()
          .filter(pair => pair[0] === playerData.id || pair[1] === playerData.id)
          .map(pair => pair[0] === playerData.id ? pair[1] : pair[0])
      });
    });

    return {
      tournament,
      absentPlayers: this.extensions.getAbsentPlayers(),
      acceleratedRounds: this.extensions.getAcceleratedRounds()
    };
  }

  /**
   * Generate TRF output from pairings
   */
  generateTRFOutput(pairings, tournament, round) {
    const lines = [];
    
    // Tournament header
    const headerLine = this.formatTournamentHeader(tournament, round);
    lines.push(headerLine);
    
    // Player lines
    tournament.players.forEach(player => {
      const playerLine = this.formatPlayerLine(player, round);
      lines.push(playerLine);
    });
    
    // Pairing lines
    pairings.forEach(pairing => {
      const pairingLine = this.formatPairingLine(pairing, round);
      lines.push(pairingLine);
    });
    
    return lines.join('\n');
  }

  /**
   * Format tournament header line
   */
  formatTournamentHeader(tournament, round) {
    const line = '001'.padEnd(8) +
      tournament.name.padEnd(30) +
      tournament.city.padEnd(20) +
      tournament.federation.padEnd(3) +
      tournament.startDate.padEnd(8) +
      tournament.endDate.padEnd(8) +
      tournament.totalRounds.toString().padStart(2) +
      '00'.padEnd(2) +
      tournament.chiefArbiter.padEnd(30) +
      tournament.deputyArbiters.padEnd(30) +
      tournament.timeControl.padEnd(10) +
      tournament.ratingSystem.padEnd(10) +
      round.toString().padStart(2);
    
    return line;
  }

  /**
   * Format player line
   */
  formatPlayerLine(player, round) {
    let line = '001' +
      player.id.padStart(5) +
      player.name.padEnd(30) +
      player.federation.padEnd(3) +
      player.fideId.padEnd(10) +
      player.fideTitle.padEnd(5) +
      player.rating.toString().padStart(4) +
      player.rapidRating.toString().padStart(4) +
      player.blitzRating.toString().padStart(4) +
      player.birthYear.toString().padStart(4) +
      player.sex.padEnd(1) +
      ' '.repeat(8) +
      player.points.toFixed(1).padStart(4) +
      (player.rank || 0).toString().padStart(3);

    // Add match results
    for (let r = 1; r <= round; r++) {
      const match = player.matches.find(m => m.round === r);
      if (match) {
        line += this.formatMatchResult(match);
      } else {
        line += '0000     ';
      }
    }

    return line;
  }

  /**
   * Format match result
   */
  formatMatchResult(match) {
    const opponentId = match.opponent.padStart(4);
    let result = '000';
    let color = ' ';
    let specialCode = ' ';

    if (match.gameWasPlayed) {
      if (match.matchScore === 'WIN') {
        result = '1-0';
      } else if (match.matchScore === 'LOSS') {
        result = '0-1';
      } else if (match.matchScore === 'DRAW') {
        result = '1/2';
      }
      
      color = match.color === 'WHITE' ? 'w' : 'b';
    } else {
      result = '000';
      if (match.participatedInPairing) {
        if (match.matchScore === 'WIN') {
          specialCode = 'F'; // Full-point bye
        } else if (match.matchScore === 'DRAW') {
          specialCode = 'H'; // Half-point bye
        } else {
          specialCode = 'Z'; // Zero-point bye
        }
      } else {
        specialCode = 'U'; // Unplayed
      }
    }

    return opponentId + result + color + specialCode;
  }

  /**
   * Format pairing line
   */
  formatPairingLine(pairing, round) {
    const whiteId = pairing.white_player_id.padStart(5);
    const blackId = pairing.black_player_id ? pairing.black_player_id.padStart(5) : '00000';
    const result = '0000';
    const specialCode = pairing.is_bye ? 'B' : ' ';

    return '002' + whiteId + blackId + result + specialCode;
  }
}

module.exports = TRFParser;
