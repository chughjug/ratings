/**
 * Club Rating Service
 * Handles calculation of club ratings using various rating systems
 */

class ClubRatingService {
  constructor() {
    this.defaultKFactor = 32;
    this.minRating = 100;
    this.maxRating = 3000;
  }

  /**
   * Calculate new rating using Elo system
   * @param {Object} params - Rating calculation parameters
   * @returns {Promise<Object>} - New rating and statistics
   */
  async calculateNewRating(params) {
    try {
      const {
        playerId,
        playerName,
        currentRating = 1200,
        tournamentResults = [],
        kFactor = this.defaultKFactor,
        ratingType = 'regular'
      } = params;

      if (!tournamentResults || tournamentResults.length === 0) {
        return {
          rating: currentRating,
          games_played: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          rating_change: 0
        };
      }

      let totalChange = 0;
      let wins = 0;
      let losses = 0;
      let draws = 0;

      // Process each game result
      for (const result of tournamentResults) {
        const { color, opponentRating, gameResult } = result;
        
        // Determine actual result (1 = win, 0.5 = draw, 0 = loss)
        let actualScore;
        switch (gameResult) {
          case '1-0':
            actualScore = color === 'W' ? 1 : 0;
            break;
          case '0-1':
            actualScore = color === 'B' ? 1 : 0;
            break;
          case '1/2-1/2':
            actualScore = 0.5;
            break;
          default:
            continue; // Skip invalid results
        }

        // Calculate expected score
        const expectedScore = this.calculateExpectedScore(currentRating, opponentRating);
        
        // Calculate rating change
        const ratingChange = kFactor * (actualScore - expectedScore);
        totalChange += ratingChange;

        // Update statistics
        if (actualScore === 1) wins++;
        else if (actualScore === 0) losses++;
        else if (actualScore === 0.5) draws++;
      }

      // Calculate new rating
      const newRating = Math.max(this.minRating, Math.min(this.maxRating, currentRating + totalChange));
      const ratingChange = newRating - currentRating;

      return {
        rating: Math.round(newRating),
        games_played: tournamentResults.length,
        wins,
        losses,
        draws,
        rating_change: Math.round(ratingChange)
      };
    } catch (error) {
      console.error('Error calculating new rating:', error);
      throw error;
    }
  }

  /**
   * Calculate expected score using Elo formula
   * @param {number} playerRating - Player's current rating
   * @param {number} opponentRating - Opponent's rating
   * @returns {number} - Expected score (0 to 1)
   */
  calculateExpectedScore(playerRating, opponentRating) {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Calculate performance rating
   * @param {Array} results - Array of game results
   * @returns {number} - Performance rating
   */
  calculatePerformanceRating(results) {
    if (!results || results.length === 0) {
      return 1200; // Default rating
    }

    let totalScore = 0;
    let totalOpponentRating = 0;

    for (const result of results) {
      const { opponentRating, gameResult } = result;
      
      let score;
      switch (gameResult) {
        case '1-0':
          score = 1;
          break;
        case '0-1':
          score = 0;
          break;
        case '1/2-1/2':
          score = 0.5;
          break;
        default:
          continue;
      }

      totalScore += score;
      totalOpponentRating += opponentRating;
    }

    if (totalOpponentRating === 0) {
      return 1200;
    }

    const averageOpponentRating = totalOpponentRating / results.length;
    const scorePercentage = totalScore / results.length;

    // Convert score percentage to rating difference
    const ratingDifference = Math.log(scorePercentage / (1 - scorePercentage)) * 400 / Math.log(10);
    
    return Math.round(averageOpponentRating + ratingDifference);
  }

  /**
   * Calculate rating distribution
   * @param {Array} ratings - Array of player ratings
   * @returns {Object} - Rating distribution statistics
   */
  calculateRatingDistribution(ratings) {
    if (!ratings || ratings.length === 0) {
      return {
        total: 0,
        average: 0,
        median: 0,
        standardDeviation: 0,
        percentiles: {}
      };
    }

    const sortedRatings = ratings.sort((a, b) => a - b);
    const total = sortedRatings.length;
    const sum = sortedRatings.reduce((acc, rating) => acc + rating, 0);
    const average = sum / total;

    // Calculate median
    const median = total % 2 === 0
      ? (sortedRatings[total / 2 - 1] + sortedRatings[total / 2]) / 2
      : sortedRatings[Math.floor(total / 2)];

    // Calculate standard deviation
    const variance = sortedRatings.reduce((acc, rating) => acc + Math.pow(rating - average, 2), 0) / total;
    const standardDeviation = Math.sqrt(variance);

    // Calculate percentiles
    const percentiles = {
      p10: this.getPercentile(sortedRatings, 10),
      p25: this.getPercentile(sortedRatings, 25),
      p50: median,
      p75: this.getPercentile(sortedRatings, 75),
      p90: this.getPercentile(sortedRatings, 90)
    };

    return {
      total,
      average: Math.round(average),
      median: Math.round(median),
      standardDeviation: Math.round(standardDeviation),
      percentiles
    };
  }

  /**
   * Get percentile value from sorted array
   * @param {Array} sortedArray - Sorted array of numbers
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} - Percentile value
   */
  getPercentile(sortedArray, percentile) {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedArray.length) {
      return sortedArray[sortedArray.length - 1];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Calculate rating change for a single game
   * @param {number} playerRating - Player's rating
   * @param {number} opponentRating - Opponent's rating
   * @param {number} actualScore - Actual score (1, 0.5, or 0)
   * @param {number} kFactor - K-factor for calculation
   * @returns {number} - Rating change
   */
  calculateGameRatingChange(playerRating, opponentRating, actualScore, kFactor = this.defaultKFactor) {
    const expectedScore = this.calculateExpectedScore(playerRating, opponentRating);
    return kFactor * (actualScore - expectedScore);
  }

  /**
   * Get appropriate K-factor based on player's rating and games played
   * @param {number} rating - Player's current rating
   * @param {number} gamesPlayed - Number of games played
   * @returns {number} - K-factor
   */
  getKFactor(rating, gamesPlayed) {
    // Adjust K-factor based on rating and experience
    if (gamesPlayed < 30) {
      return 40; // Higher K-factor for new players
    } else if (rating < 2100) {
      return 32; // Standard K-factor
    } else if (rating < 2400) {
      return 24; // Lower K-factor for strong players
    } else {
      return 16; // Lowest K-factor for masters
    }
  }
}

module.exports = new ClubRatingService();
