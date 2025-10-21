/**
 * Prize Auto-Population Service
 * 
 * This service automatically populates prizes when a tournament is completed.
 * It creates standard prize structures based on tournament settings and player counts.
 */

const { calculatePrizeDistribution } = require('./prizeCalculator');
const { calculateTiebreakers } = require('../utils/tiebreakers');

/**
 * Auto-populate prizes for a completed tournament
 * @param {Object} db - Database connection
 * @param {string} tournamentId - Tournament ID
 * @param {Object} tournament - Tournament data
 * @param {Array} standings - Current standings
 * @returns {Promise<Object>} Result of prize population
 */
async function autoPopulatePrizes(db, tournamentId, tournament, standings) {
  try {
    console.log(`Auto-populating prizes for tournament ${tournamentId}`);
    
    // Get tournament settings
    const settings = tournament.settings ? JSON.parse(tournament.settings) : {};
    const prizeSettings = settings.prize_settings || {};
    
    // Check if auto-population is enabled
    if (!prizeSettings.auto_populate) {
      console.log('Auto-population disabled for this tournament');
      return { success: false, message: 'Auto-population disabled' };
    }
    
    // Clear existing prizes if configured to do so
    if (prizeSettings.clear_existing) {
      await clearExistingPrizes(db, tournamentId);
    }
    
    // Generate standard prize structure
    const prizes = generateStandardPrizes(tournament, standings, prizeSettings);
    
    // Save prizes to database
    const savedPrizes = await savePrizes(db, tournamentId, prizes);
    
    // Calculate and save prize distributions
    const distributions = calculatePrizeDistribution(standings, savedPrizes, settings);
    await savePrizeDistributions(db, tournamentId, distributions);
    
    console.log(`Successfully auto-populated ${savedPrizes.length} prizes for tournament ${tournamentId}`);
    
    return {
      success: true,
      message: `Auto-populated ${savedPrizes.length} prizes`,
      prizes: savedPrizes,
      distributions: distributions
    };
    
  } catch (error) {
    console.error('Error auto-populating prizes:', error);
    return {
      success: false,
      message: 'Failed to auto-populate prizes',
      error: error.message
    };
  }
}

/**
 * Generate standard prize structure based on tournament settings
 */
function generateStandardPrizes(tournament, standings, prizeSettings) {
  const prizes = [];
  const totalPlayers = standings.length;
  const sections = groupStandingsBySection(standings);
  
  // Default prize structure
  const defaultPrizeStructure = {
    open: {
      cash: [
        { position: 1, amount: 0.4 }, // 40% of prize fund
        { position: 2, amount: 0.25 }, // 25% of prize fund
        { position: 3, amount: 0.15 }, // 15% of prize fund
        { position: 4, amount: 0.1 },  // 10% of prize fund
        { position: 5, amount: 0.1 }   // 10% of prize fund
      ],
      trophies: [
        { position: 1, type: 'trophy' },
        { position: 2, type: 'trophy' },
        { position: 3, type: 'trophy' }
      ],
      under_sections: [
        { rating: 1600, cash: [{ position: 1, amount: 0.05 }], trophies: [{ position: 1, type: 'trophy' }] },
        { rating: 1200, cash: [{ position: 1, amount: 0.03 }], trophies: [{ position: 1, type: 'trophy' }] },
        { rating: 1000, cash: [{ position: 1, amount: 0.02 }], trophies: [{ position: 1, type: 'trophy' }] }
      ]
    }
  };
  
  // Use custom structure if provided
  const prizeStructure = prizeSettings.structure || defaultPrizeStructure;
  const prizeFund = prizeSettings.prize_fund || tournament.settings?.prize_fund || 0;
  
  // Generate prizes for each section
  Object.keys(sections).forEach(sectionName => {
    const sectionPlayers = sections[sectionName];
    const sectionPrizeFund = prizeFund * (sectionPlayers.length / totalPlayers);
    
    // Open section prizes
    if (sectionName === 'Open' || !prizeStructure[sectionName]) {
      const openStructure = prizeStructure.open;
      
      // Cash prizes
      openStructure.cash.forEach(prize => {
        if (prize.amount > 0) {
          prizes.push({
            name: `${prize.position}${getOrdinalSuffix(prize.position)} Place`,
            type: 'cash',
            position: prize.position,
            section: sectionName,
            amount: sectionPrizeFund * prize.amount,
            description: `Cash prize for ${prize.position}${getOrdinalSuffix(prize.position)} place in ${sectionName} section`
          });
        }
      });
      
      // Trophy prizes
      openStructure.trophies.forEach(prize => {
        prizes.push({
          name: `${prize.position}${getOrdinalSuffix(prize.position)} Place Trophy`,
          type: prize.type,
          position: prize.position,
          section: sectionName,
          description: `Trophy for ${prize.position}${getOrdinalSuffix(prize.position)} place in ${sectionName} section`
        });
      });
    }
    
    // Under section prizes
    if (prizeSettings.include_under_sections !== false) {
      const underSections = prizeStructure.open.under_sections || [];
      
      underSections.forEach(underSection => {
        const qualifyingPlayers = sectionPlayers.filter(p => 
          p.rating && p.rating < underSection.rating
        );
        
        if (qualifyingPlayers.length >= 3) { // Only create prizes if at least 3 players qualify
          // Cash prizes for under section
          underSection.cash.forEach(prize => {
            if (prize.amount > 0) {
              prizes.push({
                name: `Under ${underSection.rating} - ${prize.position}${getOrdinalSuffix(prize.position)} Place`,
                type: 'cash',
                position: prize.position,
                rating_category: `Under ${underSection.rating}`,
                section: sectionName,
                amount: sectionPrizeFund * prize.amount,
                description: `Cash prize for ${prize.position}${getOrdinalSuffix(prize.position)} place in Under ${underSection.rating} category`
              });
            }
          });
          
          // Trophy prizes for under section
          underSection.trophies.forEach(prize => {
            prizes.push({
              name: `Under ${underSection.rating} - ${prize.position}${getOrdinalSuffix(prize.position)} Place Trophy`,
              type: prize.type,
              position: prize.position,
              rating_category: `Under ${underSection.rating}`,
              section: sectionName,
              description: `Trophy for ${prize.position}${getOrdinalSuffix(prize.position)} place in Under ${underSection.rating} category`
            });
          });
        }
      });
    }
  });
  
  // Special prizes
  if (prizeSettings.include_special_prizes !== false) {
    prizes.push({
      name: 'Biggest Upset',
      type: 'trophy',
      conditions: ['biggest_upset'],
      description: 'Trophy for the biggest rating upset'
    });
    
    if (prizeSettings.include_best_game !== false) {
      prizes.push({
        name: 'Best Game',
        type: 'trophy',
        conditions: ['best_game'],
        description: 'Trophy for the best game of the tournament'
      });
    }
  }
  
  return prizes;
}

/**
 * Group standings by section
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
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

/**
 * Clear existing prizes for a tournament
 */
async function clearExistingPrizes(db, tournamentId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM prizes WHERE tournament_id = ?', [tournamentId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Save prizes to database
 */
async function savePrizes(db, tournamentId, prizes) {
  const savedPrizes = [];
  
  for (const prize of prizes) {
    const prizeId = require('uuid').v4();
    const conditionsJson = prize.conditions ? JSON.stringify(prize.conditions) : null;
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO prizes (id, tournament_id, name, type, position, rating_category, section, amount, description, conditions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [prizeId, tournamentId, prize.name, prize.type, prize.position, prize.rating_category, 
         prize.section, prize.amount, prize.description, conditionsJson],
        function(err) {
          if (err) reject(err);
          else {
            savedPrizes.push({
              id: prizeId,
              ...prize
            });
            resolve();
          }
        }
      );
    });
  }
  
  return savedPrizes;
}

/**
 * Save prize distributions to database
 */
async function savePrizeDistributions(db, tournamentId, distributions) {
  // Clear existing distributions
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM prize_distributions WHERE tournament_id = ?', [tournamentId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  // Insert new distributions
  const stmt = db.prepare(`
    INSERT INTO prize_distributions (id, tournament_id, player_id, prize_id, amount, position, rating_category, section, tie_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const dist of distributions) {
    const id = require('uuid').v4();
    await new Promise((resolve, reject) => {
      stmt.run([
        id, tournamentId, dist.player_id, dist.prize_id, dist.amount,
        dist.position, dist.rating_category, dist.section, dist.tie_group
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  stmt.finalize();
}

module.exports = {
  autoPopulatePrizes,
  generateStandardPrizes
};
