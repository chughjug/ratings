/**
 * Quad Pairing System
 * Implements a quad tournament format where players are divided into groups of 4
 * by rating and play round-robin matches within each quad.
 * 
 * Features:
 * - Automatic grouping by rating
 * - Round-robin pairing within quads
 * - Cross-quad pairings for later rounds
 * - Bye handling for incomplete groups
 */

class QuadPairingSystem {
  constructor(players, options = {}) {
    this.players = players;
    this.options = {
      groupSize: 4,
      pairingType: 'round_robin', // 'round_robin' or 'swiss'
      groupAssignment: 'rating', // 'rating', 'random', or 'custom'
      allowByesInGroups: true,
      crossGroupPairings: false,
      ...options
    };
    this.quads = [];
    this.pairings = [];
  }

  /**
   * Create quads by dividing players into groups of 4 based on rating
   * Groups consecutive players from highest to lowest rating
   * Example: Players 1-4 = quad-1, Players 5-8 = quad-2, etc.
   */
  createQuads() {
    // Sort players by rating (highest first)
    const sortedPlayers = [...this.players].sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    });

    // Create quads by grouping consecutive players
    this.quads = [];
    const groupSize = this.options.groupSize;
    
    for (let i = 0; i < sortedPlayers.length; i += groupSize) {
      const quadNumber = Math.floor(i / groupSize) + 1;
      const quadPlayers = sortedPlayers.slice(i, i + groupSize);
      
      this.quads.push({
        id: `quad-${quadNumber}`,
        number: quadNumber,
        name: `Quad ${quadNumber}`,
        players: quadPlayers,
        playerCount: quadPlayers.length
      });
    }

    return this.quads;
  }

  /**
   * Generate round-robin pairings within a quad
   * For 4 players: 6 games total (3 per player)
   * For 3 players: 3 games total (1 per player in round 1)
   * For 2 players: 1 game total
   */
  generateRoundRobinPairingsForQuad(quad, round = 1, colorBalanceHistory = {}) {
    const players = quad.players;
    const pairings = [];

    if (players.length < 2) {
      // Single player gets a bye
      if (players.length === 1) {
        pairings.push({
          quadId: quad.id,
          white_player_id: players[0].id,
          white_name: players[0].name,
          white_rating: players[0].rating,
          black_player_id: null,
          black_name: 'BYE',
          black_rating: 0,
          is_bye: true
        });
      }
      return pairings;
    }

    // Generate pairings for the specific round
    // For n players, there are n-1 unique round-robin rounds
    // If tournament has more rounds, cycle through the pairings
    const n = players.length;
    const numRoundRobinRounds = n % 2 === 0 ? n - 1 : n;
    
    // Cycle through available round-robin rounds
    // Round 1 = index 0, Round 2 = index 1, etc.
    // If round > numRoundRobinRounds, wrap around
    const roundIndex = (round - 1) % numRoundRobinRounds;
    
    const roundPairings = this.generateRoundRobinRound(players, roundIndex, colorBalanceHistory);
    
    roundPairings.forEach(pairing => {
      pairings.push({
        ...pairing,
        quadId: quad.id
      });
    });

    return pairings;
  }

  /**
   * Generate pairings for a single round-robin round
   * Color equalization takes precedence over seeding
   */
  generateRoundRobinRound(players, roundNumber, colorBalanceHistory = {}) {
    const pairings = [];
    const n = players.length;
    
    if (n < 2) return pairings;
    
    // Track color balance for each player (white: +1, black: -1, target: 0)
    // Initialize from previous rounds if provided
    const colorBalance = {};
    players.forEach(p => colorBalance[p.id] = colorBalanceHistory[p.id] || 0);
    
    // For USCF standard quad pairing table:
    // For 4 players (Quads 1-4), use the standard 3-round table
    if (n === 4) {
      // Standard USCF quad pairing table with color equalization
      const standardPairings = this.getUSCFQuadPairings(players, roundNumber, colorBalance);
      return standardPairings;
    }
    
    // For other group sizes, use standard Berger table with color balancing
    let playerList = [...players];
    let byePlayer = null;
    if (n % 2 === 1) {
      byePlayer = playerList.pop();
      playerList.push(null);
    }

    const numRounds = playerList.length - 1;
    if (roundNumber >= numRounds) {
      return pairings;
    }

    // Rotate for this round
    const rotations = [];
    for (let i = 0; i < playerList.length; i++) {
      rotations[i] = playerList[(i - roundNumber + playerList.length) % playerList.length];
    }

    // Create pairings with color equalization priority
    for (let i = 0; i < rotations.length / 2; i++) {
      let white = rotations[i];
      let black = rotations[rotations.length - 1 - i];

      if (white !== null && black !== null) {
        // Normal pairing - assign colors based on color balance, not rating
        // Player with lower balance (fewer whites) should get white
        if (colorBalance[white.id] === colorBalance[black.id]) {
          // Equal balance - higher seed gets white (tiebreaker only)
          if (white.rating < black.rating) {
            [white, black] = [black, white];
          }
        } else if (colorBalance[white.id] < colorBalance[black.id]) {
          // white has fewer whites already - white stays white
          // no swap needed
        } else {
          // black has fewer whites already - swap
          [white, black] = [black, white];
        }
        
        // Update color balance
        colorBalance[white.id]++;
        colorBalance[black.id]--;
      }

      if (white === null) {
        if (black !== null) {
          pairings.push({
            white_player_id: black.id,
            white_name: black.name,
            white_rating: black.rating,
            black_player_id: null,
            black_name: 'BYE',
            black_rating: 0,
            is_bye: true
          });
        }
      } else if (black === null) {
        pairings.push({
          white_player_id: white.id,
          white_name: white.name,
          white_rating: white.rating,
          black_player_id: null,
          black_name: 'BYE',
          black_rating: 0,
          is_bye: true
        });
      } else {
        pairings.push({
          white_player_id: white.id,
          white_name: white.name,
          white_rating: white.rating,
          black_player_id: black.id,
          black_name: black.name,
          black_rating: black.rating,
          is_bye: false
        });
      }
    }

    return pairings;
  }

  /**
   * Get USCF standard quad pairings with color equalization
   * For 4 players labeled 1-4 by rating (1 = highest)
   * Color equalization takes precedence - players with fewer whites get white
   */
  getUSCFQuadPairings(players, roundNumber, colorBalance = {}) {
    // Sort players by rating (highest = 1, lowest = 4)
    const sortedPlayers = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const p1 = sortedPlayers[0]; // highest rated
    const p2 = sortedPlayers[1];
    const p3 = sortedPlayers[2];
    const p4 = sortedPlayers[3]; // lowest rated

    const pairings = [];
    
    // Initialize color balance if not provided
    players.forEach(p => {
      if (colorBalance[p.id] === undefined) {
        colorBalance[p.id] = 0;
      }
    });
    
    if (roundNumber === 0) {
      // Round 1: Standard USCF pairing is 1v4, 2v3
      // Color equalization: Give whites to players with lower current balance
      const match1_4 = this.balanceColors([p1, p4], colorBalance);
      const match2_3 = this.balanceColors([p2, p3], colorBalance);
      
      pairings.push(match1_4);
      pairings.push(match2_3);
    } else if (roundNumber === 1) {
      // Round 2: Standard is 3v1, 4v2
      const match3_1 = this.balanceColors([p3, p1], colorBalance);
      const match4_2 = this.balanceColors([p4, p2], colorBalance);
      
      pairings.push(match3_1);
      pairings.push(match4_2);
    } else if (roundNumber === 2) {
      // Round 3: Standard is 1v2, 3v4
      const match1_2 = this.balanceColors([p1, p2], colorBalance);
      const match3_4 = this.balanceColors([p3, p4], colorBalance);
      
      pairings.push(match1_2);
      pairings.push(match3_4);
    }

    return pairings;
  }

  /**
   * Balance colors between two players
   * Returns pairing with colors assigned based on color balance
   * Updates colorBalance in place
   */
  balanceColors(players, colorBalance) {
    const [playerA, playerB] = players;
    
    if (!playerA || !playerB) {
      // Bye
      const activePlayer = playerA || playerB;
      return {
        white_player_id: activePlayer.id,
        white_name: activePlayer.name,
        white_rating: activePlayer.rating,
        black_player_id: null,
        black_name: 'BYE',
        black_rating: 0,
        is_bye: true
      };
    }

    let white = playerA;
    let black = playerB;

    // Color equalization takes precedence
    if (colorBalance[playerA.id] === colorBalance[playerB.id]) {
      // Equal balance - higher rated player gets white (tiebreaker)
      if (playerA.rating < playerB.rating) {
        [white, black] = [black, white];
      }
    } else if (colorBalance[playerA.id] > colorBalance[playerB.id]) {
      // playerA has more whites - give white to playerB
      [white, black] = [black, white];
    }
    // else: playerA gets white (no swap)

    // Update color balance
    colorBalance[white.id] = (colorBalance[white.id] || 0) + 1;
    colorBalance[black.id] = (colorBalance[black.id] || 0) - 1;

    return {
      white_player_id: white.id,
      white_name: white.name,
      white_rating: white.rating,
      black_player_id: black.id,
      black_name: black.name,
      black_rating: black.rating,
      is_bye: false
    };
  }

  /**
   * Generate pairings for a specific round
   */
  generatePairingsForRound(round = 1) {
    const pairings = [];

    // Always create quads if they don't exist (needed for all rounds)
    if (this.quads.length === 0) {
      this.createQuads();
    }

    // Generate pairings for each quad
    this.quads.forEach(quad => {
      const quadPairings = this.generateRoundRobinPairingsForQuad(quad, round);
      pairings.push(...quadPairings);
    });

    return pairings;
  }

  /**
   * Get quad assignments for display
   */
  getQuadAssignments() {
    if (this.quads.length === 0) {
      this.createQuads();
    }

    return this.quads.map(quad => ({
      id: quad.id,
      number: quad.number,
      players: quad.players.map(p => ({
        id: p.id,
        name: p.name,
        rating: p.rating,
        section: p.section
      }))
    }));
  }

  /**
   * Calculate recommended number of rounds for a quad tournament
   * For a quad (4 players), the round-robin has 3 unique rounds (n-1)
   * @param playerCount - Total number of players
   * @param groupSize - Size of each quad (default: 4)
   * @returns Recommended number of rounds
   */
  static calculateRecommendedRounds(playerCount, groupSize = 4) {
    if (playerCount < 2) return 1;
    
    // For round-robin within quads: n-1 where n is players per quad
    // For even group sizes: n-1
    // For odd group sizes: n
    const numRoundRobinRounds = groupSize % 2 === 0 ? groupSize - 1 : groupSize;
    return numRoundRobinRounds;
  }

  /**
   * Static method to generate tournament-wide pairings
   */
  static async generateTournamentQuadPairings(tournamentId, round, db, options = {}) {
    return new Promise((resolve, reject) => {
      // Get all active players
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? AND status = "active" ORDER BY rating DESC',
        [tournamentId],
        (err, players) => {
          if (err) {
            reject(err);
            return;
          }

          if (players.length === 0) {
            reject(new Error('No active players found for quad pairing'));
            return;
          }

          const groupSize = options.groupSize || 4;
          const system = new QuadPairingSystem(players, options);
          const pairings = system.generatePairingsForRound(round);
          const quads = system.getQuadAssignments();
          const recommendedRounds = QuadPairingSystem.calculateRecommendedRounds(players.length, groupSize);

          resolve({
            success: true,
            pairings: pairings,
            quads: quads,
            quadCount: system.quads.length,
            totalGames: pairings.filter(p => !p.is_bye).length,
            totalByes: pairings.filter(p => p.is_bye).length,
            recommendedRounds: recommendedRounds
          });
        }
      );
    });
  }
}

module.exports = QuadPairingSystem;
