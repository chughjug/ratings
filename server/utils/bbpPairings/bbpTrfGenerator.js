/**
 * BBP Pairings TRF Generator
 * JavaScript implementation of the C++ bbpPairings TRF generation logic
 * Based on the exact format from bbpPairings-master/src/fileformats/trf.cpp
 */

const { Tournament, Player, Match, Color, MatchScore } = require('./tournament');

class BBPTrfGenerator {
  constructor() {
    // Default scoring system as per bbpPairings C++ code
    this.defaultScoring = {
      pointsForWin: 10,        // 1.0 in tenths
      pointsForDraw: 5,        // 0.5 in tenths
      pointsForLoss: 0,        // 0.0 in tenths
      pointsForZeroPointBye: 0, // 0.0 in tenths
      pointsForForfeitLoss: 0,  // 0.0 in tenths
      pointsForPairingAllocatedBye: 10 // 1.0 in tenths
    };
  }

  /**
   * Generate TRF file content from tournament data
   * This follows the exact format from bbpPairings C++ writeFile function
   */
  generateTrfFile(tournament, options = {}) {
    const lines = [];
    
    // Add seed line if provided
    if (options.seed !== undefined) {
      lines.push(this.generateSeedLine(options.seed));
    }
    
    // Add XXR line if tournament is not complete
    if (tournament.playedRounds < tournament.expectedRounds) {
      lines.push(`XXR ${tournament.expectedRounds}`);
    }
    
    // Compute ranks
    const ranks = this.computeRanks(tournament);
    
    // Add player lines (001 lines)
    for (const player of tournament.players) {
      if (player.id > 9999) {
        throw new Error('The output file format only supports player IDs up to 9999.');
      }
      if (player.rating > 9999) {
        throw new Error('The output file format only supports ratings up to 9999.');
      }
      
      const playerLine = this.generatePlayerLine(player, ranks[player.id]);
      lines.push(playerLine);
    }
    
    // Add empty line after players
    lines.push('');
    
    // Add scoring system extensions if not default
    const scoringExtensions = this.generateScoringExtensions(tournament);
    if (scoringExtensions.length > 0) {
      lines.push(...scoringExtensions);
      lines.push(''); // Empty line after scoring extensions
    }
    
    // Add acceleration extensions if not default
    const accelerationExtensions = this.generateAccelerationExtensions(tournament);
    if (accelerationExtensions.length > 0) {
      lines.push(...accelerationExtensions);
    }
    
    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Generate seed line (012 line)
   */
  generateSeedLine(seed) {
    return `012 AutoTest Tournament ${seed}`;
  }

  /**
   * Generate player line (001 line)
   * This follows the exact format from bbpPairings C++ code
   */
  generatePlayerLine(player, rank) {
    const playerId = (player.id + 1).toString().padStart(4);
    const name = 'Test'.padEnd(10);
    const fideId = (player.id + 1).toString().padStart(4, '0');
    const title = 'Player'.padEnd(4);
    const playerId2 = (player.id + 1).toString().padStart(4);
    const rating = player.rating.toString().padStart(19);
    const empty = ''.padEnd(28);
    
    const gamesString = this.stringifyGames(player, rank);
    
    return `001 ${playerId}${name}${fideId}${title}${playerId2}${rating}${empty}${gamesString}`;
  }

  /**
   * Generate games string for a player
   * This follows the exact format from bbpPairings C++ stringifyGames function
   */
  stringifyGames(player, rank) {
    if (player.scoreWithoutAcceleration > 999) {
      throw new Error('The output file format does not support scores above 99.9.');
    }
    
    let result = '';
    
    // Points (4 digits, right-aligned)
    result += player.scoreWithoutAcceleration.toString().padStart(4);
    
    // Rank (5 digits, right-aligned)
    result += (rank + 1).toString().padStart(5);
    
    // Games
    for (const match of player.matches) {
      result += '  ';
      
      if (!match.participatedInPairing) {
        // Unplayed game
        result += '0000 - ';
        if (match.matchScore === 'WIN') {
          result += 'F'; // Full-point bye
        } else if (match.matchScore === 'DRAW') {
          result += 'H'; // Half-point bye
        } else {
          result += 'Z'; // Zero-point bye
        }
      } else if (match.opponent === player.id) {
        // Bye
        result += '0000 - U';
      } else {
        // Normal game
        const opponentId = (match.opponent + 1).toString().padStart(4);
        const color = match.color === 'WHITE' ? 'w' : 'b';
        
        let resultCode;
        if (match.gameWasPlayed) {
          if (match.matchScore === 'WIN') {
            resultCode = '1';
          } else if (match.matchScore === 'DRAW') {
            resultCode = '=';
          } else {
            resultCode = '0';
          }
        } else {
          if (match.matchScore === 'WIN') {
            resultCode = '+';
          } else {
            resultCode = '-';
          }
        }
        
        result += `${opponentId} ${color} ${resultCode}`;
      }
    }
    
    return result;
  }

  /**
   * Generate scoring system extensions (BBW, BBD, BBL, BBZ, BBF, BBU)
   * This follows the exact format from bbpPairings C++ code
   */
  generateScoringExtensions(tournament) {
    const extensions = [];
    const scoring = tournament.scoringSystem || this.defaultScoring;
    
    // Check if we need to output scoring extensions
    const needsScoring = 
      scoring.pointsForWin !== 10 ||
      scoring.pointsForDraw !== 5 ||
      scoring.pointsForLoss !== 0 ||
      scoring.pointsForZeroPointBye !== 0 ||
      scoring.pointsForForfeitLoss !== 0 ||
      scoring.pointsForPairingAllocatedBye !== 10;
    
    if (!needsScoring) {
      return extensions;
    }
    
    // Check for limits
    if (
      scoring.pointsForWin > 999 ||
      scoring.pointsForDraw > 999 ||
      scoring.pointsForLoss > 999 ||
      scoring.pointsForZeroPointBye > 999 ||
      scoring.pointsForForfeitLoss > 999 ||
      scoring.pointsForPairingAllocatedBye > 999
    ) {
      throw new Error('The output file format does not support scores above 99.9.');
    }
    
    // Basic scoring (BBW, BBD)
    if (
      scoring.pointsForWin !== 10 ||
      scoring.pointsForDraw !== 5 ||
      scoring.pointsForLoss !== 0 ||
      scoring.pointsForZeroPointBye !== 0 ||
      scoring.pointsForForfeitLoss !== 0
    ) {
      extensions.push(`BBW ${scoring.pointsForWin.toString().padStart(4)}`);
      extensions.push(`BBD ${scoring.pointsForDraw.toString().padStart(4)}`);
    }
    
    // Loss and bye scoring (BBL, BBZ, BBF)
    if (
      scoring.pointsForLoss !== 0 ||
      scoring.pointsForZeroPointBye !== 0 ||
      scoring.pointsForForfeitLoss !== 0
    ) {
      extensions.push(`BBL ${scoring.pointsForLoss.toString().padStart(4)}`);
      extensions.push(`BBZ ${scoring.pointsForZeroPointBye.toString().padStart(4)}`);
      extensions.push(`BBF ${scoring.pointsForForfeitLoss.toString().padStart(4)}`);
    }
    
    // Pairing-allocated bye scoring (BBU)
    if (scoring.pointsForWin !== scoring.pointsForPairingAllocatedBye) {
      extensions.push(`BBU ${scoring.pointsForPairingAllocatedBye.toString().padStart(4)}`);
    }
    
    return extensions;
  }

  /**
   * Generate acceleration extensions (XXA lines)
   * This follows the exact format from bbpPairings C++ code
   */
  generateAccelerationExtensions(tournament) {
    const extensions = [];
    
    if (tournament.defaultAcceleration) {
      return extensions;
    }
    
    for (const player of tournament.players) {
      if (player.accelerations && player.accelerations.length > 0) {
        let line = `XXA ${(player.id + 1).toString().padStart(4)}`;
        
        for (const acceleration of player.accelerations) {
          if (acceleration > 999) {
            throw new Error('The output file format does not support scores above 99.9.');
          }
          line += acceleration.toString().padStart(5);
        }
        
        extensions.push(line);
      }
    }
    
    return extensions;
  }

  /**
   * Compute tournament ranks for players
   * This follows the exact algorithm from bbpPairings C++ computeRanks function
   */
  computeRanks(tournament) {
    // Create list of player pointers for sorting
    const rankedPlayers = tournament.players.map(player => ({ player, score: player.scoreWithoutAcceleration || 0 }));
    
    // Sort by unaccelerated score (descending)
    rankedPlayers.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      // Secondary sort by rating (descending)
      return (b.player.rating || 0) - (a.player.rating || 0);
    });
    
    // Assign ranks (1-based, highest score gets rank 1)
    const result = new Array(tournament.players.length);
    for (let i = 0; i < rankedPlayers.length; i++) {
      result[rankedPlayers[i].player.id] = i;
    }
    
    return result;
  }

  /**
   * Generate TRF file for a specific round with pairings
   * This creates a complete tournament file up to the specified round
   */
  generateTrfForRound(tournamentId, round, db) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get tournament data
        const tournamentData = await this.getTournamentDataForTrf(tournamentId, round, db);
        
        // Create tournament object
        const tournament = new Tournament({
          ...tournamentData.settings,
          playedRounds: round - 1,
          expectedRounds: tournamentData.expectedRounds
        });
        
        // Add players
        tournamentData.players.forEach(playerData => {
          tournament.addPlayer(playerData);
        });
        
        // Update player data
        tournament.updatePlayerData();
        
        // Generate TRF content
        const trfContent = this.generateTrfFile(tournament, {
          seed: tournamentData.seed || Date.now()
        });
        
        resolve({
          success: true,
          content: trfContent,
          tournament: tournamentData,
          metadata: {
            tournamentId,
            round,
            totalPlayers: tournament.players.length,
            playedRounds: tournament.playedRounds,
            expectedRounds: tournament.expectedRounds
          }
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get tournament data for TRF generation
   */
  async getTournamentDataForTrf(tournamentId, round, db) {
    return new Promise((resolve, reject) => {
      // Get tournament settings
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!tournament) {
          reject(new Error('Tournament not found'));
          return;
        }
        
        let settings = {};
        if (tournament.settings) {
          try {
            settings = JSON.parse(tournament.settings);
          } catch (parseError) {
            console.warn('Could not parse tournament settings:', parseError.message);
          }
        }
        
        // Get players
        db.all(
          'SELECT * FROM players WHERE tournament_id = ? AND status = "active" ORDER BY rating DESC',
          [tournamentId],
          (err, players) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Get ALL previous pairings for the tournament
            db.all(
              `SELECT 
                white_player_id,
                black_player_id,
                result,
                round,
                section,
                board
               FROM pairings 
               WHERE tournament_id = ? AND round < ?
               ORDER BY round, board`,
              [tournamentId, round],
              (err, allPairings) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                // Process each player with complete historical data
                const playerPromises = players.map(player => {
                  return new Promise((resolvePlayer) => {
                    // Get all matches for this player
                    const playerMatches = allPairings.filter(pairing => 
                      pairing.white_player_id === player.id || pairing.black_player_id === player.id
                    );
                    
                    // Calculate points and build match history
                    let totalPoints = 0;
                    const matches = [];
                    
                    playerMatches.forEach(pairing => {
                      const isWhite = pairing.white_player_id === player.id;
                      const opponentId = isWhite ? pairing.black_player_id : pairing.white_player_id;
                      
                      // Calculate points based on result
                      let points = 0;
                      let matchScore = 'LOSS';
                      let gameWasPlayed = true;
                      let participatedInPairing = true;
                      
                      if (pairing.result) {
                        if (pairing.result === '1-0') {
                          points = isWhite ? 1 : 0;
                          matchScore = isWhite ? 'WIN' : 'LOSS';
                        } else if (pairing.result === '0-1') {
                          points = isWhite ? 0 : 1;
                          matchScore = isWhite ? 'LOSS' : 'WIN';
                        } else if (pairing.result === '1/2-1/2') {
                          points = 0.5;
                          matchScore = 'DRAW';
                        } else if (pairing.result === '1-0F') {
                          points = isWhite ? 1 : 0;
                          matchScore = isWhite ? 'WIN' : 'LOSS';
                          gameWasPlayed = false;
                        } else if (pairing.result === '0-1F') {
                          points = isWhite ? 0 : 1;
                          matchScore = isWhite ? 'LOSS' : 'WIN';
                          gameWasPlayed = false;
                        } else {
                          // Unplayed game
                          gameWasPlayed = false;
                          participatedInPairing = false;
                        }
                      } else {
                        // No result yet
                        gameWasPlayed = false;
                        participatedInPairing = true;
                      }
                      
                      totalPoints += points;
                      
                      // Create match object
                      const match = new Match(
                        opponentId || player.id,
                        isWhite ? 'WHITE' : 'BLACK',
                        matchScore,
                        gameWasPlayed,
                        participatedInPairing
                      );
                      match.round = pairing.round;
                      matches.push(match);
                    });
                    
                    resolvePlayer({
                      ...player,
                      points: totalPoints,
                      scoreWithoutAcceleration: totalPoints * 10, // Convert to tenths
                      matches: matches,
                      isValid: true
                    });
                  });
                });
                
                Promise.all(playerPromises).then(playersWithData => {
                  // Re-sort players by points for proper ranking
                  playersWithData.sort((a, b) => {
                    if (a.points !== b.points) {
                      return b.points - a.points;
                    }
                    return (b.rating || 0) - (a.rating || 0);
                  });
                  
                  resolve({
                    settings: {
                      ...settings,
                      pointsForWin: (settings.pointsForWin || 1) * 10,
                      pointsForDraw: (settings.pointsForDraw || 0.5) * 10,
                      pointsForLoss: (settings.pointsForLoss || 0) * 10,
                      pointsForZeroPointBye: (settings.pointsForZeroPointBye || 0) * 10,
                      pointsForForfeitLoss: (settings.pointsForForfeitLoss || 0) * 10,
                      pointsForPairingAllocatedBye: (settings.pointsForPairingAllocatedBye || 1) * 10,
                      initialColor: settings.initialColor || 'WHITE',
                      defaultAcceleration: settings.defaultAcceleration !== false
                    },
                    expectedRounds: tournament.rounds,
                    players: playersWithData,
                    previousPairings: allPairings,
                    seed: settings.seed || Date.now()
                  });
                }).catch(reject);
              }
            );
          }
        );
      });
    });
  }
}

module.exports = BBPTrfGenerator;
