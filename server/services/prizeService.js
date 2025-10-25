/**
 * Tournament Settings-Based Prize Service
 * 
 * This service handles prize distribution based on tournament settings
 * Prizes are configured in tournament settings and automatically distributed
 * when rounds are completed.
 */

const { calculateTournamentTiebreakers } = require('../utils/tiebreakers');

/**
 * Calculate and distribute prizes based on tournament settings
 * @param {string} tournamentId - Tournament ID
 * @param {Object} db - Database connection
 * @returns {Promise<Array>} Array of prize distributions
 */
async function calculateAndDistributePrizes(tournamentId, db) {
  try {
    console.log(`Calculating prizes for tournament ${tournamentId}`);
    
    // Get tournament settings
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      console.error(`Tournament ${tournamentId} not found`);
      return [];
    }

    const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
    const prizeSettings = settings.prizes || {};

    if (!prizeSettings.enabled || !prizeSettings.sections || prizeSettings.sections.length === 0) {
      console.log(`No prize configuration found for tournament ${tournamentId}`);
      return [];
    }

    // Get standings with tiebreakers
    const standings = await getTournamentStandings(tournamentId, tournament, db);

    // Clear existing distributions
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM prize_distributions WHERE tournament_id = ?', [tournamentId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const distributions = [];

    // Process each section's prizes
    for (const sectionConfig of prizeSettings.sections) {
      const sectionStandings = standings.filter(player => 
        (player.section || 'Open') === sectionConfig.name
      );

      if (sectionStandings.length === 0) continue;

      // Sort by points and tiebreakers
      const sortedStandings = sortStandingsByTiebreakers(sectionStandings, settings.tie_break_criteria || ['buchholz', 'sonnebornBerger']);

      // Distribute prizes for this section
      const sectionDistributions = distributeSectionPrizes(
        sortedStandings, 
        sectionConfig, 
        tournamentId
      );

      distributions.push(...sectionDistributions);
    }

    // Save distributions to database
    if (distributions.length > 0) {
      const stmt = db.prepare(`
        INSERT INTO prize_distributions (id, tournament_id, player_id, prize_name, prize_type, amount, position, section, tie_group)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const { v4: uuidv4 } = require('uuid');
      
      distributions.forEach(dist => {
        const id = uuidv4();
        stmt.run([
          id,
          tournamentId,
          dist.player_id,
          dist.prize_name,
          dist.prize_type,
          dist.amount,
          dist.position,
          dist.section,
          dist.tie_group
        ]);
      });

      stmt.finalize((err) => {
        if (err) {
          console.error('Error saving prize distributions:', err);
        } else {
          console.log(`Successfully distributed ${distributions.length} prizes for tournament ${tournamentId}`);
        }
      });
    }

    return distributions;

  } catch (error) {
    console.error('Error calculating and distributing prizes:', error);
    return [];
  }
}

/**
 * Distribute prizes for a specific section
 */
function distributeSectionPrizes(standings, sectionConfig, tournamentId) {
  const distributions = [];
  const prizes = sectionConfig.prizes || [];

  if (prizes.length === 0) return distributions;

  // Separate position-based and rating-based prizes
  const positionPrizes = prizes.filter(prize => prize.position && !prize.ratingCategory);
  const ratingPrizes = prizes.filter(prize => prize.ratingCategory && !prize.position);

  // Process position-based prizes
  if (positionPrizes.length > 0) {
    const positionDistributions = distributePositionPrizes(standings, positionPrizes, sectionConfig.name, tournamentId);
    distributions.push(...positionDistributions);
  }

  // Process rating-based prizes
  if (ratingPrizes.length > 0) {
    const ratingDistributions = distributeRatingPrizes(standings, ratingPrizes, sectionConfig.name, tournamentId);
    distributions.push(...ratingDistributions);
  }

  return distributions;
}

/**
 * Distribute position-based prizes
 */
function distributePositionPrizes(standings, positionPrizes, sectionName, tournamentId) {
  const distributions = [];
  
  // Group standings by score to identify ties
  const scoreGroups = groupStandingsByScore(standings);
  const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);

  let currentPosition = 1;

  for (const score of sortedScores) {
    const tiedPlayers = scoreGroups.get(score);
    if (tiedPlayers.length === 0) continue;

    // Find applicable prizes for this position range
    const endPosition = currentPosition + tiedPlayers.length - 1;
    const applicablePrizes = positionPrizes.filter(prize => 
      prize.position >= currentPosition && prize.position <= endPosition
    );

    if (applicablePrizes.length > 0) {
      // Distribute prizes to tied players
      const prizeDistributions = distributePrizesToTiedPlayers(
        tiedPlayers,
        applicablePrizes,
        currentPosition,
        sectionName,
        tournamentId
      );

      distributions.push(...prizeDistributions);
    }

    currentPosition += tiedPlayers.length;
  }

  return distributions;
}

/**
 * Distribute rating-based prizes
 */
function distributeRatingPrizes(standings, ratingPrizes, sectionName, tournamentId) {
  const distributions = [];

  for (const prize of ratingPrizes) {
    // Filter players eligible for this rating category
    const eligiblePlayers = standings.filter(player => isEligibleForRatingPrize(player, prize.ratingCategory));
    
    if (eligiblePlayers.length === 0) continue;

    // Sort eligible players by score and tiebreakers
    const sortedEligiblePlayers = sortStandingsByTiebreakers(eligiblePlayers, ['buchholz', 'sonnebornBerger']);

    // Award prize to the top eligible player(s) - support multiple positions for rating prizes
    const prizeCount = prize.position || 1;
    const topPlayers = sortedEligiblePlayers.slice(0, prizeCount);
    
    const prizeDistributions = distributePrizesToTiedPlayers(
      topPlayers,
      [prize],
      topPlayers[0] ? getPlayerPosition(topPlayers[0], standings) : 1,
      sectionName,
      tournamentId
    );

    distributions.push(...prizeDistributions);
  }

  return distributions;
}

/**
 * Check if a player is eligible for a rating-based prize
 */
function isEligibleForRatingPrize(player, ratingCategory) {
  if (!ratingCategory) return false;
  
  const rating = player.rating || 0;
  
  // Handle unrated players
  if (ratingCategory.toLowerCase() === 'unrated') {
    return !player.rating || player.rating === 0;
  }
  
  // Handle "Under X" categories (more flexible matching)
  const underMatch = ratingCategory.match(/under\s*(\d+)/i);
  if (underMatch) {
    const threshold = parseInt(underMatch[1]);
    return rating < threshold;
  }
  
  // Handle range categories (e.g., "1200-1399", "1400-1599")
  const rangeMatch = ratingCategory.match(/(\d+)\s*-\s*(\d+)/i);
  if (rangeMatch) {
    const minRating = parseInt(rangeMatch[1]);
    const maxRating = parseInt(rangeMatch[2]);
    return rating >= minRating && rating <= maxRating;
  }
  
  // Handle "X+" categories (e.g., "2200+")
  const plusMatch = ratingCategory.match(/(\d+)\s*\+/i);
  if (plusMatch) {
    const minRating = parseInt(plusMatch[1]);
    return rating >= minRating;
  }
  
  // Handle USCF class categories
  if (ratingCategory.includes('Class E') || ratingCategory.includes('Under 1200')) {
    return rating < 1200;
  }
  if (ratingCategory.includes('Class D') || ratingCategory.includes('1200-1399')) {
    return rating >= 1200 && rating <= 1399;
  }
  if (ratingCategory.includes('Class C') || ratingCategory.includes('1400-1599')) {
    return rating >= 1400 && rating <= 1599;
  }
  if (ratingCategory.includes('Class B') || ratingCategory.includes('1600-1799')) {
    return rating >= 1600 && rating <= 1799;
  }
  if (ratingCategory.includes('Class A') || ratingCategory.includes('1800-1999')) {
    return rating >= 1800 && rating <= 1999;
  }
  if (ratingCategory.includes('Expert') || ratingCategory.includes('2000-2199')) {
    return rating >= 2000 && rating <= 2199;
  }
  if (ratingCategory.includes('Master') || ratingCategory.includes('2200+')) {
    return rating >= 2200;
  }
  
  // Handle common under categories
  if (ratingCategory.includes('U800') || ratingCategory.includes('Under 800')) {
    return rating < 800;
  }
  if (ratingCategory.includes('U1000') || ratingCategory.includes('Under 1000')) {
    return rating < 1000;
  }
  if (ratingCategory.includes('U1400') || ratingCategory.includes('Under 1400')) {
    return rating < 1400;
  }
  if (ratingCategory.includes('U1800') || ratingCategory.includes('Under 1800')) {
    return rating < 1800;
  }
  if (ratingCategory.includes('U2000') || ratingCategory.includes('Under 2000')) {
    return rating < 2000;
  }
  
  return false;
}

/**
 * Get the position of a player in the overall standings
 */
function getPlayerPosition(player, allStandings) {
  const sortedStandings = sortStandingsByTiebreakers(allStandings, ['buchholz', 'sonnebornBerger']);
  const position = sortedStandings.findIndex(p => p.id === player.id);
  return position >= 0 ? position + 1 : 1;
}

/**
 * Distribute prizes to tied players
 */
function distributePrizesToTiedPlayers(tiedPlayers, applicablePrizes, position, sectionName, tournamentId) {
  const distributions = [];

  // Separate cash and non-cash prizes
  const cashPrizes = applicablePrizes.filter(p => p.type === 'cash');
  const nonCashPrizes = applicablePrizes.filter(p => p.type !== 'cash');

  // Process cash prizes (combine and split equally)
  if (cashPrizes.length > 0) {
    const totalCash = cashPrizes.reduce((sum, prize) => sum + (prize.amount || 0), 0);
    const cashPerPlayer = totalCash / tiedPlayers.length;

    tiedPlayers.forEach((player, index) => {
      distributions.push({
        player_id: player.id,
        prize_name: cashPrizes.map(p => p.name).join(' + '),
        prize_type: 'cash',
        amount: Math.round(cashPerPlayer * 100) / 100, // Round to 2 decimal places
        position: position,
        section: sectionName,
        tie_group: tiedPlayers.length > 1 ? 1 : undefined
      });
    });
  }

  // Process non-cash prizes (use tiebreakers for distribution)
  if (nonCashPrizes.length > 0) {
    // Group non-cash prizes by type for better distribution
    const prizesByType = {};
    nonCashPrizes.forEach(prize => {
      if (!prizesByType[prize.type]) {
        prizesByType[prize.type] = [];
      }
      prizesByType[prize.type].push(prize);
    });

    // Distribute each type of prize
    Object.entries(prizesByType).forEach(([prizeType, prizes]) => {
      prizes.forEach((prize, prizeIndex) => {
        if (prizeIndex < tiedPlayers.length) {
          const player = tiedPlayers[prizeIndex];
          distributions.push({
            player_id: player.id,
            prize_name: prize.name,
            prize_type: prize.type,
            amount: prize.amount || undefined,
            position: position,
            section: sectionName,
            tie_group: tiedPlayers.length > 1 ? 1 : undefined
          });
        }
      });
    });
  }

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
 * Sort standings by tiebreaker criteria
 */
function sortStandingsByTiebreakers(standings, tiebreakCriteria) {
  return standings.sort((a, b) => {
    // First sort by points
    if (a.total_points !== b.total_points) {
      return b.total_points - a.total_points;
    }

    // Then by tiebreakers
    for (const criterion of tiebreakCriteria) {
      const aValue = a.tiebreakers && a.tiebreakers[criterion] ? a.tiebreakers[criterion] : 0;
      const bValue = b.tiebreakers && b.tiebreakers[criterion] ? b.tiebreakers[criterion] : 0;
      
      if (aValue !== bValue) {
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
 * Get tournament standings with tiebreakers
 */
async function getTournamentStandings(tournamentId, tournament, db) {
  // Get players
  const players = await new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM players WHERE tournament_id = ? AND status = "active" ORDER BY name',
      [tournamentId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  // Get results for each player
  const standings = await Promise.all(players.map(async (player) => {
    const results = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM results WHERE tournament_id = ? AND player_id = ? ORDER BY round',
        [tournamentId, player.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const totalPoints = results.reduce((sum, result) => sum + result.points, 0);
    const wins = results.filter(r => r.points === 1).length;
    const losses = results.filter(r => r.points === 0).length;
    const draws = results.filter(r => r.points === 0.5).length;

    return {
      id: player.id,
      name: player.name,
      rating: player.rating,
      section: player.section,
      total_points: totalPoints,
      games_played: results.length,
      wins,
      losses,
      draws,
      results
    };
  }));

  // Sort by points
  standings.sort((a, b) => b.total_points - a.total_points);

  // Calculate tiebreakers
  const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
  const tiebreakCriteria = settings.tie_break_criteria || ['buchholz', 'sonnebornBerger'];
  
  const standingsWithTiebreakers = await calculateTournamentTiebreakers(standings, tournamentId, tiebreakCriteria);

  return standingsWithTiebreakers;
}

/**
 * Get prize distributions for a tournament
 */
async function getPrizeDistributions(tournamentId, db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT pd.*, p.name as player_name
       FROM prize_distributions pd
       JOIN players p ON pd.player_id = p.id
       WHERE pd.tournament_id = ?
       ORDER BY pd.position ASC, pd.prize_type ASC`,
      [tournamentId],
      (err, distributions) => {
        if (err) reject(err);
        else resolve(distributions.map(dist => ({
          ...dist,
          amount: dist.amount ? parseFloat(dist.amount) : undefined
        })));
      }
    );
  });
}

/**
 * Auto-assign prizes when a round is completed
 */
async function autoAssignPrizesOnRoundCompletion(tournamentId, round, db) {
  try {
    // Check if this is the final round
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) return;

    const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
    const prizeSettings = settings.prizes || {};

    // Only auto-assign if enabled and this is the final round
    if (prizeSettings.autoAssign && round >= tournament.rounds) {
      console.log(`Auto-assigning prizes for tournament ${tournamentId} after round ${round}`);
      await calculateAndDistributePrizes(tournamentId, db);
    }
  } catch (error) {
    console.error('Error in auto-assigning prizes:', error);
  }
}

/**
 * Generate standard prize structure based on tournament size and settings
 */
function generateStandardPrizeStructure(tournament, playerCount, prizeFund = 0) {
  const sections = {};
  const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
  const definedSections = settings.sections || [];
  
  // If no sections defined, create a default Open section
  if (definedSections.length === 0) {
    definedSections.push({ name: 'Open', min_rating: 0, max_rating: 9999 });
  }

  definedSections.forEach(section => {
    const sectionName = section.name;
    const sectionPlayers = playerCount; // This would be filtered by actual section in real implementation
    const sectionPrizeFund = prizeFund * (sectionPlayers / playerCount);
    
    const prizes = [];
    
    // Position-based prizes
    if (sectionPrizeFund > 0) {
      // Cash prizes for top positions
      const cashPrizes = [
        { position: 1, percentage: 0.4, name: '1st Place' },
        { position: 2, percentage: 0.25, name: '2nd Place' },
        { position: 3, percentage: 0.15, name: '3rd Place' }
      ];
      
      if (sectionPlayers >= 8) {
        cashPrizes.push({ position: 4, percentage: 0.1, name: '4th Place' });
      }
      if (sectionPlayers >= 12) {
        cashPrizes.push({ position: 5, percentage: 0.1, name: '5th Place' });
      }
      
      cashPrizes.forEach(prize => {
        if (prize.percentage > 0) {
          prizes.push({
            name: prize.name,
            type: 'cash',
            position: prize.position,
            amount: Math.round(sectionPrizeFund * prize.percentage * 100) / 100,
            description: `${prize.name} in ${sectionName} section`
          });
        }
      });
    }
    
    // Trophy prizes for top 3
    const trophyPrizes = [
      { position: 1, name: '1st Place Trophy', type: 'trophy' },
      { position: 2, name: '2nd Place Trophy', type: 'trophy' },
      { position: 3, name: '3rd Place Trophy', type: 'trophy' }
    ];
    
    trophyPrizes.forEach(prize => {
      prizes.push({
        name: prize.name,
        type: prize.type,
        position: prize.position,
        description: `${prize.name} in ${sectionName} section`
      });
    });
    
    // Under prizes based on rating distribution
    const underPrizes = [
      { rating: 1600, name: 'Under 1600 1st Place', type: 'cash', amount: Math.round(sectionPrizeFund * 0.05 * 100) / 100 },
      { rating: 1200, name: 'Under 1200 1st Place', type: 'cash', amount: Math.round(sectionPrizeFund * 0.03 * 100) / 100 },
      { rating: 1000, name: 'Under 1000 1st Place', type: 'trophy' }
    ];
    
    underPrizes.forEach(prize => {
      if (prize.amount > 0 || prize.type !== 'cash') {
        prizes.push({
          name: prize.name,
          type: prize.type,
          ratingCategory: `Under ${prize.rating}`,
          position: 1,
          amount: prize.amount,
          description: `Top player under ${prize.rating} rating`
        });
      }
    });
    
    sections[sectionName] = {
      name: sectionName,
      prizes: prizes
    };
  });
  
  return {
    enabled: true,
    autoAssign: true,
    sections: Object.values(sections)
  };
}

module.exports = {
  calculateAndDistributePrizes,
  getPrizeDistributions,
  autoAssignPrizesOnRoundCompletion,
  distributeSectionPrizes,
  distributePositionPrizes,
  distributeRatingPrizes,
  distributePrizesToTiedPlayers,
  groupStandingsByScore,
  sortStandingsByTiebreakers,
  getTournamentStandings,
  isEligibleForRatingPrize,
  getPlayerPosition,
  generateStandardPrizeStructure
};


