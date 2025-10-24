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
  generateRoundRobinPairingsForQuad(quad, round = 1) {
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
    
    const roundPairings = this.generateRoundRobinRound(players, roundIndex);
    
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
   */
  generateRoundRobinRound(players, roundNumber) {
    const pairings = [];
    const n = players.length;
    
    if (n < 2) return pairings;
    
    // Add bye if odd number of players
    let playerList = [...players];
    let byePlayer = null;
    if (n % 2 === 1) {
      byePlayer = playerList.pop();
      playerList.push(null); // placeholder for bye
    }

    const numRounds = playerList.length - 1;
    if (roundNumber >= numRounds) {
      return pairings;
    }

    // Use standard Berger tables algorithm for round-robin
    // Fix positions for each round
    const fixed = 0;
    const rotations = [];
    
    for (let i = 0; i < playerList.length; i++) {
      rotations[i] = playerList[(i - roundNumber + playerList.length) % playerList.length];
    }

    // Create pairings from rotated list
    for (let i = 0; i < rotations.length / 2; i++) {
      const white = rotations[i];
      const black = rotations[rotations.length - 1 - i];

      if (white === null) {
        // Bye for the black player
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
        // Bye for the white player
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
        // Normal pairing
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
