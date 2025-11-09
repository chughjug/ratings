/**
 * Tournament Settings-Based Prize Service
 * 
 * This service handles prize distribution based on tournament settings
 * Prizes are configured in tournament settings and automatically distributed
 * when rounds are completed.
 * 
 * US Chess Rules Compliance:
 * - Rule 32B1: Special prizes must be announced and designated
 * - Rule 32B3: When pooling prizes, no player can receive a prize larger than 
 *   the largest amount they would be eligible for without the split
 * - One cash prize per player: A player can only receive one cash prize per tournament
 * - Tied prizes: The sum of prizes for tied positions is divided equally among tied players
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

    // Get standings using the same logic as the standings endpoint
    const standings = await getStandingsForPrizes(tournamentId, db);

    // Get unique sections from standings (this is the actual source of truth)
    const actualSections = new Set();
    standings.forEach(player => {
      if (player.section) {
        actualSections.add(player.section);
      }
    });
    
    console.log(`Sections found in standings: ${Array.from(actualSections).join(', ')}`);

    // Clear existing distributions
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM prize_distributions WHERE tournament_id = ?', [tournamentId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM prizes WHERE tournament_id = ?', [tournamentId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const distributions = [];
    
    // Process each section's prizes
    for (const sectionConfig of prizeSettings.sections) {
      // Check if this section exists in actual sections from standings
      if (!actualSections.has(sectionConfig.name)) {
        console.log(`Section ${sectionConfig.name} not found in standings, skipping...`);
        continue;
      }
      
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
      const { v4: uuidv4 } = require('uuid');
      
      // First, create prize definitions in the prizes table
      // Note: special_prize field would need to be added to database schema if not present
      const prizeStmt = db.prepare(`
        INSERT INTO prizes (id, tournament_id, name, type, position, rating_category, section, amount, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Then create distributions in the prize_distributions table
      // Note: original_prize_amounts and is_pooled are stored in description or could be added as columns
      const distStmt = db.prepare(`
        INSERT INTO prize_distributions (id, tournament_id, player_id, prize_id, prize_name, prize_type, amount, position, rating_category, section, tie_group)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Group distributions by prize to avoid duplicates
      const prizeMap = new Map();
      
      distributions.forEach(dist => {
        // Ensure required fields are set
        if (!dist.prize_name || !dist.prize_type) {
          console.error('Invalid distribution object missing required fields:', dist);
          return; // Skip invalid distributions
        }
        
        const prizeKey = `${dist.prize_name}-${dist.prize_type}-${dist.section || ''}-${dist.position || ''}-${dist.rating_category || ''}`;
        if (!prizeMap.has(prizeKey)) {
          const prizeId = uuidv4();
          prizeMap.set(prizeKey, {
            prizeId,
            prize: {
              id: prizeId,
              tournament_id: tournamentId,
              name: dist.prize_name,
              type: dist.prize_type,
              position: dist.position || null,
              rating_category: dist.rating_category || null,
              section: dist.section || null,
              amount: dist.amount || null,
              description: dist.prize_name
            },
            distributions: []
          });
        }
        
        prizeMap.get(prizeKey).distributions.push({
          id: uuidv4(),
          tournament_id: tournamentId,
          player_id: dist.player_id,
          prize_id: prizeMap.get(prizeKey).prizeId,
          prize_name: dist.prize_name,
          prize_type: dist.prize_type,
          amount: dist.amount || null,
          position: dist.position || null,
          rating_category: dist.rating_category || null,
          section: dist.section || null,
          tie_group: dist.tie_group || null
        });
      });
      
      // Insert prizes and distributions with proper promise handling
      return new Promise((resolve, reject) => {
        let completed = 0;
        let total = 0;
        let hasError = false;
        
        const checkComplete = () => {
          completed++;
          if (completed === total && !hasError) {
            prizeStmt.finalize();
            distStmt.finalize();
            console.log(`Successfully distributed ${distributions.length} prizes for tournament ${tournamentId}`);
            resolve(distributions);
          } else if (completed === total && hasError) {
            prizeStmt.finalize();
            distStmt.finalize();
            reject(new Error('Some prize distributions failed to save'));
          }
        };
        
        // Count total operations
        prizeMap.forEach(({ prize, distributions: dists }) => {
          if (prize.name && prize.type) {
            total++; // Prize insert
            total += dists.length; // Distribution inserts
          }
        });
        
        if (total === 0) {
          prizeStmt.finalize();
          distStmt.finalize();
          console.log('No valid prizes to save');
          resolve(distributions);
          return;
        }
        
        // Insert prizes and distributions
        prizeMap.forEach(({ prize, distributions: dists }) => {
          try {
            // Validate prize before inserting
            if (!prize.name || !prize.type) {
              console.error('Invalid prize object missing required fields:', prize);
              return;
            }
            
            prizeStmt.run([
              prize.id,
              prize.tournament_id,
              prize.name,
              prize.type,
              prize.position,
              prize.rating_category,
              prize.section,
              prize.amount,
              prize.description
            ], (err) => {
              if (err) {
                console.error('Error inserting prize:', err);
                console.error('Prize data:', prize);
                hasError = true;
                checkComplete();
              } else {
                checkComplete();
              }
            });
            
            dists.forEach(dist => {
              // Validate distribution before inserting
              if (!dist.prize_name || !dist.prize_type || !dist.player_id) {
                console.error('Invalid distribution object missing required fields:', dist);
                checkComplete(); // Count as completed even if skipped
                return;
              }
              
              distStmt.run([
                dist.id,
                dist.tournament_id,
                dist.player_id,
                dist.prize_id,
                dist.prize_name,
                dist.prize_type,
                dist.amount,
                dist.position,
                dist.rating_category,
                dist.section,
                dist.tie_group
              ], (err) => {
                if (err) {
                  console.error('Error inserting prize distribution:', err);
                  console.error('Distribution data:', dist);
                  hasError = true;
                }
                checkComplete();
              });
            });
          } catch (err) {
            console.error('Error saving prize:', err);
            console.error('Prize object:', prize);
            hasError = true;
            checkComplete();
          }
        });
      });
    } else {
      // Return empty array wrapped in resolved promise for consistency
      return Promise.resolve([]);
    }

  } catch (error) {
    console.error('Error calculating and distributing prizes:', error);
    return Promise.resolve([]);
  }
}

/**
 * Distribute prizes for a specific section
 */
function distributeSectionPrizes(standings, sectionConfig, tournamentId) {
  const distributions = [];
  const prizes = sectionConfig.prizes || [];

  if (prizes.length === 0) return distributions;

  // Separate prizes by type:
  // - Position-based: cash prizes with position numbers
  // - Rating-based: prizes with rating categories
  // - General: trophies/medals/plaques without position (awarded to top performers)
  const positionPrizes = prizes.filter(prize => prize.position && !prize.ratingCategory && prize.type === 'cash');
  const ratingPrizes = prizes.filter(prize => prize.ratingCategory && !prize.position);
  const generalPrizes = prizes.filter(prize => !prize.position && !prize.ratingCategory && prize.type !== 'cash');

  // Track players who have already received a cash prize across all prize categories
  const cashPrizeRecipients = new Set();
  const prizeRecipients = new Set();

  const registerDistributions = (newDistributions = []) => {
    newDistributions.forEach(dist => {
      distributions.push(dist);
      if (dist.player_id) {
        prizeRecipients.add(dist.player_id);
        if (dist.prize_type === 'cash') {
          cashPrizeRecipients.add(dist.player_id);
        }
      }
    });
  };

  // Process position-based prizes
  if (positionPrizes.length > 0) {
    const positionDistributions = distributePositionPrizes(
      standings,
      positionPrizes,
      sectionConfig.name,
      tournamentId,
      cashPrizeRecipients
    );
    registerDistributions(positionDistributions);
  }

  // Process rating-based prizes
  if (ratingPrizes.length > 0) {
    const ratingDistributions = distributeRatingPrizes(
      standings,
      ratingPrizes,
      sectionConfig.name,
      tournamentId,
      cashPrizeRecipients
    );
    registerDistributions(ratingDistributions);
  }

  // Process general prizes (trophies, medals, plaques without positions)
  // These are awarded to top performers based on standings
  if (generalPrizes.length > 0) {
    const generalDistributions = distributeGeneralPrizes(
      standings,
      generalPrizes,
      sectionConfig.name,
      tournamentId,
      prizeRecipients
    );
    registerDistributions(generalDistributions);
  }

  return distributions;
}

/**
 * Distribute general (non-cash, non-rating, non-position) prizes.
 * These awards go to the next eligible players in the standings
 * who have not already received a prize.
 *
 * @param {Array} standings - Sorted standings for the section
 * @param {Array} generalPrizes - Array of general prize configurations
 * @param {string} sectionName - Section name
 * @param {string} tournamentId - Tournament ID
 * @param {Set<string>} existingRecipients - Players who already received a prize in this section
 * @returns {Array} Array of prize distributions
 */
function distributeGeneralPrizes(
  standings,
  generalPrizes,
  sectionName,
  tournamentId,
  existingRecipients = new Set()
) {
  const distributions = [];
  if (!generalPrizes || generalPrizes.length === 0) {
    return distributions;
  }

  let prizeIndex = 0;
  for (const player of standings) {
    if (prizeIndex >= generalPrizes.length) break;
    if (!player || !player.id) continue;
    if (existingRecipients.has(player.id)) continue;

    const prize = generalPrizes[prizeIndex];
    if (!prize) continue;

    distributions.push({
      player_id: player.id,
      prize_name: prize.name,
      prize_type: prize.type,
      amount: prize.amount || undefined,
      position: getPlayerPosition(player, standings),
      section: sectionName,
      tournament_id: tournamentId
    });

    existingRecipients.add(player.id);
    prizeIndex += 1;
  }

  return distributions;
}

/**
 * Distribute position-based prizes according to US Chess Rules
 * 
 * US Chess Rules:
 * - One cash prize per player
 * - When players tie, they split the sum of prizes for the tied positions
 * - Rule 32B3: No player can receive more than largest prize they'd be eligible for
 * 
 * @param {Array} standings - Tournament standings sorted by tiebreakers
 * @param {Array} positionPrizes - Position-based prizes configured for this section
 * @param {string} sectionName - Section name
 * @param {string} tournamentId - Tournament ID
 * @returns {Array} Array of prize distributions
 */
function distributePositionPrizes(standings, positionPrizes, sectionName, tournamentId, existingCashWinners = new Set()) {
  const distributions = [];
  const playersWithPrizes = new Set(); // Track players who have received a prize (one prize per person rule)
  
  // Group standings by score to identify ties
  const scoreGroups = groupStandingsByScore(standings);
  const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);

  let currentPosition = 1;

  for (const score of sortedScores) {
    const tiedPlayers = scoreGroups.get(score);
    if (tiedPlayers.length === 0) continue;

    // Filter out players who already have a prize (US Chess: one cash prize per player)
    const eligiblePlayers = tiedPlayers.filter(p => !playersWithPrizes.has(p.id) && !existingCashWinners.has(p.id));
    if (eligiblePlayers.length === 0) {
      currentPosition += tiedPlayers.length;
      continue;
    }

    // Find applicable prizes for this position range
    // US Chess Rule: When players tie, they split the sum of prizes for the tied positions
    const endPosition = currentPosition + tiedPlayers.length - 1;
    let applicablePrizes = positionPrizes.filter(prize => 
      prize.position >= currentPosition && prize.position <= endPosition
    );

    // For cash prizes: ALL tied players split ALL available cash prizes in the range
    // For non-cash: only award to players who don't already have a prize
    const cashPrizes = applicablePrizes.filter(p => p.type === 'cash');
    const nonCashPrizes = applicablePrizes.filter(p => p.type !== 'cash');

    // Handle cash prizes - US Chess Rule: tied players split all applicable prizes
    if (cashPrizes.length > 0) {
      const playersToAward = eligiblePlayers;
      const prizeDistributions = distributePrizesToTiedPlayers(
        playersToAward,
        cashPrizes, // Use all cash prizes in the tied position range
        currentPosition,
        sectionName,
        tournamentId
      );
      
      prizeDistributions.forEach(dist => {
        playersWithPrizes.add(dist.player_id);
        if (dist.prize_type === 'cash') {
          existingCashWinners.add(dist.player_id);
        }
        distributions.push(dist);
      });
    }

    // Handle non-cash prizes - only award to eligible players (one per person)
    // For indivisible prizes, ties are broken using tiebreaker procedures
    if (nonCashPrizes.length > 0) {
      const playersToAward = eligiblePlayers.slice(0, nonCashPrizes.length);
      const prizeDistributions = distributePrizesToTiedPlayers(
        playersToAward,
        nonCashPrizes.slice(0, playersToAward.length),
        currentPosition,
        sectionName,
        tournamentId
      );
      
      prizeDistributions.forEach(dist => {
        playersWithPrizes.add(dist.player_id);
        distributions.push(dist);
      });
    }

    currentPosition += tiedPlayers.length;
  }

  return distributions;
}

/**
 * Distribute rating-based prizes according to US Chess Rules
 * 
 * US Chess Rules:
 * - One cash prize per player
 * - Special prizes (like biggest upset, best game) should be clearly designated (Rule 32B1)
 * - When players tie, they split the sum of prizes (Rule 32B3 applies)
 * 
 * @param {Array} standings - Tournament standings
 * @param {Array} ratingPrizes - Rating-based prizes configured for this section
 * @param {string} sectionName - Section name
 * @param {string} tournamentId - Tournament ID
 * @returns {Array} Array of prize distributions
 */
function distributeRatingPrizes(standings, ratingPrizes, sectionName, tournamentId, existingCashWinners = new Set()) {
  const distributions = [];
  const playersWithPrizes = new Set(); // Track players who have received a prize (one prize per person)

  for (const prize of ratingPrizes) {
    // Filter players eligible for this rating category and who don't already have a prize
    const eligiblePlayers = standings
      .filter(player => isEligibleForRatingPrize(player, prize.ratingCategory))
      .filter(player => !playersWithPrizes.has(player.id) && !existingCashWinners.has(player.id));
    
    if (eligiblePlayers.length === 0) continue;

    // Sort eligible players by score and tiebreakers
    const sortedEligiblePlayers = sortStandingsByTiebreakers(eligiblePlayers, ['buchholz', 'sonnebornBerger']);

    // Group by score to handle ties
    const scoreGroups = groupStandingsByScore(sortedEligiblePlayers);
    const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);
    
    let remainingPrizeCount = prize.position || 1;
    
    for (const score of sortedScores) {
      if (remainingPrizeCount <= 0) break;
      
      const tiedPlayers = scoreGroups.get(score).filter(p => !playersWithPrizes.has(p.id));
      if (tiedPlayers.length === 0) continue;

      // For cash prizes: if more players than remaining prizes, they split all remaining prizes
      // For non-cash: award to as many players as we have prizes (one per person)
      if (prize.type === 'cash') {
        // All tied players split all remaining cash prizes
        const playersToAward = tiedPlayers.slice(0, Math.min(tiedPlayers.length, remainingPrizeCount));
        const prizeDistributions = distributePrizesToTiedPlayers(
          playersToAward,
          [prize],
          getPlayerPosition(tiedPlayers[0], standings),
          sectionName,
          tournamentId
        );
        
        prizeDistributions.forEach(dist => {
          playersWithPrizes.add(dist.player_id);
          if (dist.prize_type === 'cash') {
            existingCashWinners.add(dist.player_id);
          }
          distributions.push(dist);
        });
        remainingPrizeCount -= playersToAward.length;
      } else {
        // Non-cash: award to players up to remaining prize count (one per person)
        const playersToAward = tiedPlayers.slice(0, Math.min(tiedPlayers.length, remainingPrizeCount));
        const prizeDistributions = distributePrizesToTiedPlayers(
          playersToAward,
          [prize],
          getPlayerPosition(tiedPlayers[0], standings),
          sectionName,
          tournamentId
        );
        
        prizeDistributions.forEach(dist => {
          playersWithPrizes.add(dist.player_id);
          if (dist.prize_type === 'cash') {
            existingCashWinners.add(dist.player_id);
          }
          distributions.push(dist);
        });
        remainingPrizeCount -= playersToAward.length;
      }
    }
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
 * Distribute prizes to tied players according to US Chess Rules
 * 
 * US Chess Rule 32B3: When pooling prizes, no player can receive a prize larger than
 * the largest amount they would be eligible for without the split.
 * 
 * For cash: splits all available cash prizes among all tied players, but ensures
 * no player receives more than the highest individual prize they're tied for.
 * For non-cash: awards one prize per player (already filtered upstream)
 * 
 * @param {Array} tiedPlayers - Players who are tied
 * @param {Array} applicablePrizes - Prizes applicable to this position range
 * @param {number} position - Starting position of the tie
 * @param {string} sectionName - Section name
 * @param {string} tournamentId - Tournament ID
 * @returns {Array} Array of prize distributions
 */
function distributePrizesToTiedPlayers(tiedPlayers, applicablePrizes, position, sectionName, tournamentId) {
  const distributions = [];

  // Separate cash and non-cash prizes
  const cashPrizes = applicablePrizes.filter(p => p.type === 'cash');
  const nonCashPrizes = applicablePrizes.filter(p => p.type !== 'cash');

  // Process cash prizes according to US Chess Rule 32B3
  if (cashPrizes.length > 0) {
    // Calculate the total cash amount of all applicable prizes
    const totalCash = cashPrizes.reduce((sum, prize) => sum + (prize.amount || 0), 0);
    
    // Find the maximum individual prize amount (US Chess Rule 32B3 cap)
    // This represents the highest prize a player could have gotten if they weren't tied
    const maxIndividualPrize = Math.max(...cashPrizes.map(p => p.amount || 0));
    
    // Calculate split amount per player
    const splitAmountPerPlayer = totalCash / tiedPlayers.length;
    
    // Apply US Chess Rule 32B3: No player can receive more than the largest 
    // amount they would be eligible for without the split
    // In practice, this usually won't be an issue since pooling typically increases
    // the amount, but we enforce the cap for compliance
    const finalAmountPerPlayer = Math.min(splitAmountPerPlayer, maxIndividualPrize);
    
    // If the cap is applied, we need to redistribute the excess
    // This is an edge case but ensures rule compliance
    let totalDistributed = finalAmountPerPlayer * tiedPlayers.length;
    let remaining = totalCash - totalDistributed;
    
    // Round to 2 decimal places for currency
    let baseAmount = Math.floor(finalAmountPerPlayer * 100) / 100;
    
    // Distribute any remaining cents (due to rounding) to first players
    const centsRemaining = Math.round((totalCash - (baseAmount * tiedPlayers.length)) * 100);
    
    tiedPlayers.forEach((player, index) => {
      // Add one cent for the first N players to account for rounding
      const amount = baseAmount + (index < centsRemaining ? 0.01 : 0);
      
      distributions.push({
        player_id: player.id,
        prize_name: cashPrizes.length === 1 
          ? cashPrizes[0].name 
          : `Tied ${cashPrizes.map(p => p.name).join(' + ')}`,
        prize_type: 'cash',
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
        position: position,
        section: sectionName,
        tie_group: tiedPlayers.length > 1 ? 1 : undefined,
        original_prize_amounts: cashPrizes.map(p => p.amount || 0),
        is_pooled: tiedPlayers.length > 1
      });
    });
  }

  // Process non-cash prizes (one per player, already filtered upstream)
  // For indivisible prizes like trophies, ties are broken using tiebreaker procedures (Rule 33D1)
  if (nonCashPrizes.length > 0) {
    nonCashPrizes.forEach((prize, prizeIndex) => {
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
 * Get sections from pairings (not from players)
 */
async function getSectionsFromPairings(tournamentId, db) {
  const sections = new Set();
  
  const pairings = await new Promise((resolve, reject) => {
    db.all(
      'SELECT DISTINCT section FROM pairings WHERE tournament_id = ? AND section IS NOT NULL',
      [tournamentId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  pairings.forEach(pairing => {
    if (pairing.section) {
      sections.add(pairing.section);
    }
  });
  
  // If no sections found in pairings, add 'Open' as default
  if (sections.size === 0) {
    sections.add('Open');
  }
  
  return sections;
}

/**
 * Get sections from players (fallback when no pairings exist)
 */
async function getSectionsFromPlayers(tournamentId, db) {
  const sections = new Set();
  
  const players = await new Promise((resolve, reject) => {
    db.all(
      'SELECT DISTINCT section FROM players WHERE tournament_id = ? AND section IS NOT NULL AND status = "active"',
      [tournamentId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  players.forEach(player => {
    if (player.section) {
      sections.add(player.section);
    }
  });
  
  // If no sections found, add 'Open' as default
  if (sections.size === 0) {
    sections.add('Open');
  }
  
  return sections;
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

  // Get pairings to determine actual sections played
  const pairings = await new Promise((resolve, reject) => {
    db.all(
      'SELECT white_player_id, black_player_id, section FROM pairings WHERE tournament_id = ? AND (white_player_id IS NOT NULL OR black_player_id IS NOT NULL)',
      [tournamentId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  // Create a map of player IDs to their pairing sections (most frequent section wins)
  const playerSectionCount = new Map();
  pairings.forEach(pairing => {
    if (pairing.white_player_id && pairing.section) {
      const playerId = pairing.white_player_id;
      if (!playerSectionCount.has(playerId)) {
        playerSectionCount.set(playerId, new Map());
      }
      const sectionCount = playerSectionCount.get(playerId);
      sectionCount.set(pairing.section, (sectionCount.get(pairing.section) || 0) + 1);
    }
    if (pairing.black_player_id && pairing.section) {
      const playerId = pairing.black_player_id;
      if (!playerSectionCount.has(playerId)) {
        playerSectionCount.set(playerId, new Map());
      }
      const sectionCount = playerSectionCount.get(playerId);
      sectionCount.set(pairing.section, (sectionCount.get(pairing.section) || 0) + 1);
    }
  });

  // Create final map with most frequent section for each player
  const playerSectionMap = new Map();
  playerSectionCount.forEach((sectionCounts, playerId) => {
    let mostFrequentSection = null;
    let maxCount = 0;
    sectionCounts.forEach((count, section) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentSection = section;
      }
    });
    if (mostFrequentSection) {
      playerSectionMap.set(playerId, mostFrequentSection);
    }
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

    // Determine section based on pairings, falling back to player section
    const section = playerSectionMap.get(player.id) || player.section || 'Open';

    return {
      id: player.id,
      name: player.name,
      rating: player.rating,
      section: section,
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
  
  const tiebreakersData = await calculateTournamentTiebreakers(tournamentId, db);
  
  // Add tiebreakers to standings
  const standingsWithTiebreakers = standings.map(player => ({
    ...player,
    tiebreakers: tiebreakersData[player.id] || {}
  }));

  return standingsWithTiebreakers;
}

/**
 * Get prize distributions for a tournament
 */
async function getPrizeDistributions(tournamentId, db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT pd.*, p.name as player_name, pr.name as prize_name, pr.type as prize_type
       FROM prize_distributions pd
       JOIN players p ON pd.player_id = p.id
       JOIN prizes pr ON pd.prize_id = pr.id
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

/**
 * Get standings using the same logic as the standings endpoint
 * This ensures sections are consistent between standings and prizes
 */
async function getStandingsForPrizes(tournamentId, db) {
  try {
    // Get tournament
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Get all players
    const players = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
         COALESCE(SUM(CASE WHEN r.result = '1-0' AND r.player_id = p.id THEN 1.0
                           WHEN r.result = '0-1' AND r.opponent_id = p.id THEN 1.0
                           WHEN r.result = '1/2-1/2' AND (r.player_id = p.id OR r.opponent_id = p.id) THEN 0.5
                           WHEN r.result = '1-0F' AND r.player_id = p.id THEN 1.0
                           WHEN r.result = '0-1F' AND r.opponent_id = p.id THEN 1.0
                           WHEN r.result = '1/2-1/2F' AND (r.player_id = p.id OR r.opponent_id = p.id) THEN 0.5
                           WHEN r.result = '0-1' AND r.player_id = p.id THEN 0.0
                           WHEN r.result = '1-0' AND r.opponent_id = p.id THEN 0.0
                           WHEN r.result = '0-1F' AND r.player_id = p.id THEN 0.0
                           WHEN r.result = '1-0F' AND r.opponent_id = p.id THEN 0.0
                           ELSE 0.0 END), 0) as total_points
         FROM players p
         LEFT JOIN results r ON p.id = r.player_id
         WHERE p.tournament_id = ? AND p.status = 'active'
         GROUP BY p.id
         ORDER BY COALESCE(p.section, 'Open'), total_points DESC, p.rating DESC`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Sections are determined by the player.section field
    return players.map(player => ({
      id: player.id,
      name: player.name,
      rating: player.rating,
      section: player.section || 'Open',
      total_points: player.total_points || 0,
      uscf_id: player.uscf_id,
      fide_id: player.fide_id
    }));
  } catch (error) {
    console.error('Error getting standings for prizes:', error);
    return [];
  }
}

module.exports = {
  calculateAndDistributePrizes,
  getPrizeDistributions,
  autoAssignPrizesOnRoundCompletion,
  distributeSectionPrizes,
  distributeGeneralPrizes,
  distributePositionPrizes,
  distributeRatingPrizes,
  distributePrizesToTiedPlayers,
  groupStandingsByScore,
  sortStandingsByTiebreakers,
  getTournamentStandings,
  getStandingsForPrizes,
  getSectionsFromPairings,
  getSectionsFromPlayers,
  isEligibleForRatingPrize,
  getPlayerPosition,
  generateStandardPrizeStructure
};


