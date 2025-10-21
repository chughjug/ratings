/**
 * USCF-Compliant Prize Distribution Calculator
 * 
 * This service implements USCF rules for prize distribution:
 * - Cash prizes are combined and split equally among tied players
 * - Players receive only one cash prize (the highest value they qualify for)
 * - Trophies use tiebreakers to determine winners
 * - Players receive only one trophy (the most valuable they qualify for)
 * - Special prizes (upsets, best game) can be awarded in addition
 */

const { calculateTiebreakers } = require('../utils/tiebreakers');

/**
 * Calculate prize distribution for a tournament section
 * @param {Array} standings - Array of player standings with scores and tiebreakers
 * @param {Array} prizes - Array of prizes configured for the tournament
 * @param {Object} tournamentSettings - Tournament settings including tiebreak criteria
 * @returns {Array} Array of prize distributions
 */
function calculatePrizeDistribution(standings, prizes, tournamentSettings = {}) {
  if (!standings || standings.length === 0 || !prizes || prizes.length === 0) {
    return [];
  }

  const prizeDistributions = [];
  const awardedPlayers = new Set(); // Track players who have already received prizes
  
  // Group standings by section for section-specific prizes
  const sectionGroups = groupStandingsBySection(standings);
  
  // Process prizes for each section
  Object.keys(sectionGroups).forEach(sectionName => {
    const sectionStandings = sectionGroups[sectionName];
    const sectionPrizes = prizes.filter(p => !p.section || p.section === sectionName);
    
    if (sectionPrizes.length === 0) return;
    
    // Group prizes by type for processing
    const cashPrizes = sectionPrizes.filter(p => p.type === 'cash');
    const trophyPrizes = sectionPrizes.filter(p => p.type === 'trophy' || p.type === 'medal' || p.type === 'plaque');
    const specialPrizes = sectionPrizes.filter(p => p.conditions && p.conditions.length > 0);
    const ratingPrizes = sectionPrizes.filter(p => p.rating_category);

    // Process cash prizes first (USCF rule: one cash prize per player, highest value)
    const cashDistributions = processCashPrizes(sectionStandings, cashPrizes, tournamentSettings, sectionName);
    cashDistributions.forEach(dist => {
      prizeDistributions.push(dist);
      awardedPlayers.add(dist.player_id);
    });

    // Process trophy prizes (use tiebreakers, one trophy per player)
    const trophyDistributions = processTrophyPrizes(sectionStandings, trophyPrizes, tournamentSettings, awardedPlayers, sectionName);
    trophyDistributions.forEach(dist => {
      prizeDistributions.push(dist);
      awardedPlayers.add(dist.player_id);
    });

    // Process rating-based prizes (under sections)
    const ratingDistributions = processRatingPrizes(sectionStandings, ratingPrizes, tournamentSettings, awardedPlayers, sectionName);
    ratingDistributions.forEach(dist => {
      prizeDistributions.push(dist);
      awardedPlayers.add(dist.player_id);
    });

    // Process special prizes (can be awarded in addition to other prizes)
    const specialDistributions = processSpecialPrizes(sectionStandings, specialPrizes, tournamentSettings, sectionName);
    specialDistributions.forEach(dist => {
      prizeDistributions.push(dist);
    });
  });

  return prizeDistributions;
}

/**
 * Group standings by section for section-specific prize processing
 */
function groupStandingsBySection(standings) {
  const sectionGroups = {};
  
  standings.forEach(player => {
    const section = player.section || 'Open';
    if (!sectionGroups[section]) {
      sectionGroups[section] = [];
    }
    sectionGroups[section].push(player);
  });
  
  return sectionGroups;
}

/**
 * Process rating-based prizes (under sections like U1600, U1200, etc.)
 */
function processRatingPrizes(standings, ratingPrizes, tournamentSettings, awardedPlayers, sectionName) {
  const distributions = [];
  
  if (ratingPrizes.length === 0) return distributions;
  
  // Group standings by score to identify ties
  const scoreGroups = groupStandingsByScore(standings);
  
  // Process each rating category
  ratingPrizes.forEach(prize => {
    const ratingThreshold = parseRatingThreshold(prize.rating_category);
    if (!ratingThreshold) return;
    
    // Filter players who qualify for this rating category
    const qualifyingPlayers = standings.filter(player => 
      player.rating && player.rating < ratingThreshold
    );
    
    if (qualifyingPlayers.length === 0) return;
    
    // Group qualifying players by score
    const qualifyingScoreGroups = groupStandingsByScore(qualifyingPlayers);
    
    // Find applicable prizes for this rating category
    const applicablePrizes = findApplicableRatingPrizes(qualifyingScoreGroups, prize, standings);
    
    if (applicablePrizes.length > 0) {
      // Calculate total prize money for tied positions
      const totalPrizeMoney = applicablePrizes.reduce((sum, p) => sum + (p.amount || 0), 0);
      const prizePerPlayer = totalPrizeMoney / qualifyingPlayers.length;
      
      // Award prizes to qualifying players (if they haven't already received a prize)
      qualifyingPlayers.forEach((player, index) => {
        if (!awardedPlayers.has(player.id)) {
          distributions.push({
            player_id: player.id,
            player_name: player.name,
            prize_id: applicablePrizes[0].id,
            prize_name: applicablePrizes.map(p => p.name).join(' (tied)'),
            prize_type: prize.type,
            amount: prizePerPlayer,
            position: applicablePrizes[0].position,
            rating_category: prize.rating_category,
            section: sectionName,
            tie_group: qualifyingPlayers.length > 1 ? 1 : undefined
          });
          awardedPlayers.add(player.id);
        }
      });
    }
  });
  
  return distributions;
}

/**
 * Parse rating threshold from rating category string (e.g., "Under 1600" -> 1600)
 */
function parseRatingThreshold(ratingCategory) {
  if (!ratingCategory) return null;
  
  const match = ratingCategory.match(/under\s*(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

/**
 * Find applicable prizes for a rating category
 */
function findApplicableRatingPrizes(scoreGroups, prize, standings) {
  const applicablePrizes = [];
  
  // For rating-based prizes, we typically award based on position within the rating group
  // This is a simplified implementation - could be enhanced with more complex logic
  if (prize.position) {
    applicablePrizes.push(prize);
  }
  
  return applicablePrizes;
}

/**
 * Process cash prizes according to USCF rules
 * - Combine cash for tied positions and split equally
 * - Each player gets only one cash prize (highest value)
 */
function processCashPrizes(standings, cashPrizes, tournamentSettings, sectionName) {
  const distributions = [];
  const awardedPlayers = new Set();

  // Group standings by score to identify ties
  const scoreGroups = groupStandingsByScore(standings);

  // Process position-based cash prizes
  const positionPrizes = cashPrizes.filter(p => p.position && !p.rating_category && !p.section);
  
  for (const [score, players] of scoreGroups) {
    if (players.length === 0) continue;

    // Find prizes that apply to this score group
    const applicablePrizes = findApplicablePositionPrizes(score, players.length, positionPrizes, standings);
    
    if (applicablePrizes.length > 0) {
      // Calculate total prize money for tied positions
      const totalPrizeMoney = applicablePrizes.reduce((sum, prize) => sum + (prize.amount || 0), 0);
      const prizePerPlayer = totalPrizeMoney / players.length;

      // Award prizes to each tied player (if they haven't already received a cash prize)
      players.forEach((player, index) => {
        if (!awardedPlayers.has(player.id)) {
          distributions.push({
            player_id: player.id,
            player_name: player.name,
            prize_id: applicablePrizes[0].id, // Use first prize ID for reference
            prize_name: applicablePrizes.map(p => p.name).join(' (tied)'),
            prize_type: 'cash',
            amount: prizePerPlayer,
            position: applicablePrizes[0].position,
            section: sectionName,
            tie_group: players.length > 1 ? 1 : undefined
          });
          awardedPlayers.add(player.id);
        }
      });
    }
  }

  return distributions;
}

/**
 * Process trophy prizes using tiebreakers
 * - Use tiebreaker criteria to determine winners
 * - Each player gets only one trophy (most valuable)
 */
function processTrophyPrizes(standings, trophyPrizes, tournamentSettings, awardedPlayers, sectionName) {
  const distributions = [];
  const tiebreakCriteria = tournamentSettings.tie_break_criteria || ['buchholz', 'sonnebornBerger'];

  // Group standings by score
  const scoreGroups = groupStandingsByScore(standings);

  for (const [score, players] of scoreGroups) {
    if (players.length === 0) continue;

    // Sort players by tiebreakers to determine trophy winners
    const sortedPlayers = sortByTiebreakers(players, tiebreakCriteria);
    
    // Find applicable trophy prizes for this score group
    const positionTrophies = trophyPrizes.filter(p => p.position && !p.rating_category && !p.section);
    const applicableTrophies = findApplicablePositionPrizes(score, players.length, positionTrophies, standings);

    // Award trophies to top players (one per player)
    applicableTrophies.forEach((trophy, index) => {
      if (index < sortedPlayers.length) {
        const player = sortedPlayers[index];
        if (!awardedPlayers.has(player.id)) {
          distributions.push({
            player_id: player.id,
            player_name: player.name,
            prize_id: trophy.id,
            prize_name: trophy.name,
            prize_type: trophy.type,
            position: trophy.position,
            section: sectionName,
            tie_group: players.length > 1 ? 1 : undefined
          });
          awardedPlayers.add(player.id);
        }
      }
    });
  }

  return distributions;
}

/**
 * Process special prizes (upsets, best game, etc.)
 * These can be awarded in addition to other prizes
 */
function processSpecialPrizes(standings, specialPrizes, tournamentSettings, sectionName) {
  const distributions = [];

  specialPrizes.forEach(prize => {
    if (prize.conditions && prize.conditions.includes('biggest_upset')) {
      const biggestUpset = findBiggestUpset(standings);
      if (biggestUpset) {
        distributions.push({
          player_id: biggestUpset.id,
          player_name: biggestUpset.name,
          prize_id: prize.id,
          prize_name: prize.name,
          prize_type: prize.type,
          amount: prize.amount,
          section: sectionName,
          conditions: prize.conditions
        });
      }
    }

    // Add more special prize types as needed
    if (prize.conditions && prize.conditions.includes('best_game')) {
      // This would require game analysis - placeholder for now
      // Could be implemented with game result analysis
    }
  });

  return distributions;
}

/**
 * Group standings by score to identify ties
 */
function groupStandingsByScore(standings) {
  const scoreGroups = new Map();
  
  standings.forEach(player => {
    const score = player.total_points;
    if (!scoreGroups.has(score)) {
      scoreGroups.set(score, []);
    }
    scoreGroups.get(score).push(player);
  });

  return scoreGroups;
}

/**
 * Find prizes that apply to a specific score/position group
 */
function findApplicablePositionPrizes(score, tiedPlayersCount, prizes, standings) {
  const applicablePrizes = [];
  
  // Find the highest position that applies to this score
  let currentPosition = 1;
  for (const [s, players] of groupStandingsByScore(standings)) {
    if (s > score) {
      currentPosition += players.length;
    } else if (s === score) {
      break;
    }
  }

  // Find prizes that cover the tied positions
  const endPosition = currentPosition + tiedPlayersCount - 1;
  
  prizes.forEach(prize => {
    if (prize.position >= currentPosition && prize.position <= endPosition) {
      applicablePrizes.push(prize);
    }
  });

  return applicablePrizes;
}

/**
 * Sort players by tiebreaker criteria
 */
function sortByTiebreakers(players, tiebreakCriteria) {
  return players.sort((a, b) => {
    for (const criterion of tiebreakCriteria) {
      const aValue = a.tiebreakers && a.tiebreakers[criterion] ? a.tiebreakers[criterion] : 0;
      const bValue = b.tiebreakers && b.tiebreakers[criterion] ? b.tiebreakers[criterion] : 0;
      
      if (aValue !== bValue) {
        // Higher values are better for most tiebreakers
        return bValue - aValue;
      }
    }
    
    // Final tiebreak by rating (higher is better)
    const aRating = a.rating || 0;
    const bRating = b.rating || 0;
    return bRating - aRating;
  });
}

/**
 * Find the player with the biggest rating upset
 * This is a simplified implementation - could be enhanced with actual game results
 */
function findBiggestUpset(standings) {
  // For now, return the lowest-rated player with the highest score
  // This could be enhanced to analyze actual game results
  return standings
    .filter(p => p.rating && p.rating > 0)
    .sort((a, b) => {
      if (a.total_points !== b.total_points) {
        return b.total_points - a.total_points;
      }
      return a.rating - b.rating; // Lower rating with same score = bigger upset
    })[0];
}

/**
 * Calculate leftover prize money that wasn't awarded
 */
function calculateLeftoverPrizes(prizes, distributions) {
  const totalPrizeFund = prizes
    .filter(p => p.type === 'cash' && p.amount)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const awardedAmount = distributions
    .filter(d => d.prize_type === 'cash' && d.amount)
    .reduce((sum, d) => sum + d.amount, 0);
  
  return totalPrizeFund - awardedAmount;
}

/**
 * Validate prize configuration
 */
function validatePrizeConfiguration(prizes) {
  const errors = [];
  
  if (!prizes || prizes.length === 0) {
    return errors; // No prizes is valid
  }

  prizes.forEach((prize, index) => {
    if (!prize.name) {
      errors.push(`Prize ${index + 1}: Name is required`);
    }
    
    if (!prize.type || !['cash', 'trophy', 'medal', 'plaque'].includes(prize.type)) {
      errors.push(`Prize ${index + 1}: Type must be cash, trophy, medal, or plaque`);
    }
    
    if (prize.type === 'cash' && (!prize.amount || prize.amount <= 0)) {
      errors.push(`Prize ${index + 1}: Cash prizes must have a positive amount`);
    }
    
    if (!prize.position && !prize.rating_category && !prize.section && !prize.conditions) {
      errors.push(`Prize ${index + 1}: Must specify position, rating category, section, or conditions`);
    }
  });

  return errors;
}

module.exports = {
  calculatePrizeDistribution,
  calculateLeftoverPrizes,
  validatePrizeConfiguration,
  processCashPrizes,
  processTrophyPrizes,
  processSpecialPrizes,
  processRatingPrizes,
  groupStandingsBySection,
  parseRatingThreshold
};
