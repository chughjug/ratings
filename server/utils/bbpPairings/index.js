/**
 * BBP Pairings Main Interface
 * JavaScript implementation of the bbpPairings pairing system
 * 
 * This is the main entry point that provides the same interface
 * as the original bbpPairings C++ implementation
 */

const DutchSystem = require('./dutchSystem');
const BursteinSystem = require('./bursteinSystem');
const { Tournament, Player, Match, Color, MatchScore, invertColor, invertMatchScore } = require('./tournament');
const { TRFScoringSystem, TRFExtensions, TRFOutputGenerator, FIDEDutchCompliance } = require('./trfCompliance');

class BBPPairings {
  constructor() {
    this.systems = {
      'dutch': DutchSystem,
      'burstein': BursteinSystem
    };
  }

  /**
   * Generate pairings for a tournament
   * This is the main entry point that replaces the existing pairing system
   */
  static async generatePairings(tournamentId, round, db, options = {}) {
    try {
      console.log(`[BBPPairings] Generating pairings for tournament ${tournamentId}, round ${round}`);
      
      // Get tournament data
      const tournamentData = await BBPPairings.getTournamentData(tournamentId, round, db);
      
      // Create tournament object with TRF-compliant scoring
      const trfScoring = new TRFScoringSystem(tournamentData.settings.scoringPoints);
      const tournament = new Tournament({
        ...tournamentData.settings,
        scoringSystem: trfScoring
      });
      tournament.playedRounds = round - 1;
      tournament.expectedRounds = tournamentData.expectedRounds;
      
      // Add players to tournament
      tournamentData.players.forEach(playerData => {
        tournament.addPlayer(playerData);
      });
      
      // Update player data
      tournament.updatePlayerData();
      
      // Determine pairing system
      const pairingSystem = tournamentData.settings.pairing_method || 'dutch';
      console.log(`[BBPPairings] Using pairing system: ${pairingSystem}`);
      
      // Generate pairings
      let pairings = [];
      if (pairingSystem === 'dutch') {
        const dutchSystem = new DutchSystem(tournament);
        pairings = dutchSystem.computeMatching(tournament);
      } else if (pairingSystem === 'burstein') {
        const bursteinSystem = new BursteinSystem(tournament);
        pairings = bursteinSystem.computeMatching(tournament);
      } else {
        throw new Error(`Unsupported pairing system: ${pairingSystem}`);
      }
      
      // Format pairings for database storage
      const formattedPairings = BBPPairings.formatPairingsForStorage(pairings, tournamentId, round);
      
      // Generate TRF-compliant output
      const trfOutput = new TRFOutputGenerator();
      const trfPairingOutput = trfOutput.generatePairingOutput(pairings);
      
      console.log(`[BBPPairings] Generated ${formattedPairings.length} pairings`);
      
      return {
        success: true,
        pairings: formattedPairings,
        trfOutput: trfPairingOutput,
        metadata: {
          tournamentId,
          round,
          pairingSystem,
          totalPairings: formattedPairings.length,
          byeCount: formattedPairings.filter(p => p.is_bye).length,
          trfCompliant: true
        }
      };
      
    } catch (error) {
      console.error(`[BBPPairings] Error generating pairings:`, error.message);
      return {
        success: false,
        error: error.message,
        pairings: []
      };
    }
  }

  /**
   * Get tournament data from database with complete historical data
   */
  static async getTournamentData(tournamentId, round, db) {
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
            
            // Get ALL previous pairings for the tournament (not just current round)
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
                    const forbiddenPairs = [];
                    
                    playerMatches.forEach(pairing => {
                      const isWhite = pairing.white_player_id === player.id;
                      const opponentId = isWhite ? pairing.black_player_id : pairing.white_player_id;
                      
                      // Add to forbidden pairs
                      if (opponentId) {
                        if (!forbiddenPairs.includes(opponentId)) {
                          forbiddenPairs.push(opponentId);
                        }
                      }
                      
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
                    
                    // Calculate rank index based on current standings
                    const sortedPlayers = players.sort((a, b) => {
                      // This will be recalculated with proper points
                      return (b.rating || 0) - (a.rating || 0);
                    });
                    const rankIndex = sortedPlayers.findIndex(p => p.id === player.id);
                    
                    
                    // Calculate bye statistics
                    let byeCount = 0;
                    let halfPointByeCount = 0;
                    let fullByeCount = 0;
                    const byeRounds = [];
                    
                    matches.forEach((match, index) => {
                      if (!match.gameWasPlayed && match.participatedInPairing) {
                        byeCount++;
                        byeRounds.push(index + 1);
                        
                        if (match.matchScore === 'WIN') {
                          fullByeCount++;
                        } else if (match.matchScore === 'DRAW') {
                          halfPointByeCount++;
                        }
                      }
                    });

                    resolvePlayer({
                      ...player,
                      points: totalPoints,
                      scoreWithoutAcceleration: totalPoints,
                      matches: matches,
                      forbiddenPairs: forbiddenPairs,
                      rankIndex: rankIndex,
                      isValid: true,
                      byeCount: byeCount,
                      halfPointByeCount: halfPointByeCount,
                      fullByeCount: fullByeCount,
                      byeRounds: byeRounds,
                      // Ensure these methods work properly
                      scoreWithAcceleration: function(tournament) {
                        return this.scoreWithoutAcceleration || this.points || 0;
                      },
                      absoluteColorPreference: function() {
                        return this.colorPreference !== 'NONE';
                      },
                      isEligibleForBye: function(tournament) {
                        return this.byeCount === 0;
                      },
                      isEligibleForHalfPointBye: function(tournament) {
                        return this.fullByeCount > 0 && this.halfPointByeCount === 0;
                      },
                      getByePriority: function() {
                        let priority = this.byeCount * 1000;
                        priority += this.rating || 0;
                        return priority;
                      }
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
                  
                  // Update rank indices
                  playersWithData.forEach((player, index) => {
                    player.rankIndex = index;
                  });
                  
                  resolve({
                    settings: {
                      ...settings,
                      pointsForWin: settings.pointsForWin || 1,
                      pointsForDraw: settings.pointsForDraw || 0.5,
                      pointsForLoss: settings.pointsForLoss || 0,
                      pointsForZeroPointBye: settings.pointsForZeroPointBye || 0,
                      pointsForForfeitLoss: settings.pointsForForfeitLoss || 0,
                      pointsForPairingAllocatedBye: settings.pointsForPairingAllocatedBye || 1,
                      initialColor: settings.initialColor || 'WHITE',
                      defaultAcceleration: settings.defaultAcceleration !== false
                    },
                    expectedRounds: tournament.rounds,
                    players: playersWithData,
                    previousPairings: allPairings
                  });
                }).catch(reject);
              }
            );
          }
        );
      });
    });
  }

  /**
   * Format pairings for database storage
   */
  static formatPairingsForStorage(pairings, tournamentId, round) {
    return pairings.map((pairing, index) => ({
      id: require('uuid').v4(),
      tournament_id: tournamentId,
      round: round,
      board: index + 1,
      white_player_id: pairing.white_player_id,
      black_player_id: pairing.black_player_id,
      result: pairing.result || null,
      is_bye: pairing.is_bye || false,
      bye_type: pairing.bye_type || null,
      section: pairing.section || 'Open'
    }));
  }

  /**
   * Get available pairing systems
   */
  static getAvailablePairingSystems() {
    return [
      {
        id: 'dutch',
        name: 'FIDE Dutch System',
        description: 'Algorithmic Swiss system with weighted matching',
        suitableFor: 'FIDE-rated tournaments',
        features: ['Weighted matching algorithm', 'Color balance optimization', 'Repeat avoidance']
      },
      {
        id: 'burstein',
        name: 'Burstein System',
        description: 'Advanced Swiss system with sophisticated tiebreaks',
        suitableFor: 'High-level tournaments',
        features: ['Sonneborn-Berger tiebreaks', 'Buchholz calculations', 'Median scores']
      }
    ];
  }

  /**
   * Validate pairing system compatibility
   */
  static validatePairingSystem(systemId, tournamentSettings) {
    const availableSystems = this.getAvailablePairingSystems();
    const system = availableSystems.find(s => s.id === systemId);
    
    if (!system) {
      return {
        valid: false,
        error: `Unknown pairing system: ${systemId}`
      };
    }
    
    // Add specific validation rules here if needed
    return {
      valid: true,
      system: system
    };
  }
}

module.exports = {
  BBPPairings,
  Tournament,
  Player,
  Match,
  Color,
  MatchScore,
  invertColor,
  invertMatchScore
};
