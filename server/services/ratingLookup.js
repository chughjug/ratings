const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Look up a player's USCF rating and expiration date using the test.py approach
 * @param {string} playerId - The USCF player ID
 * @returns {Promise<{rating: number|null, expirationDate: string|null, isActive: boolean, error: string|null}>}
 */
async function getUSCFInfo(playerId) {
  try {
    if (!playerId || playerId.trim() === '') {
      return { rating: null, expirationDate: null, isActive: false, error: 'No USCF ID provided' };
    }

    // Get rating and expiration date from the MSA page (same as test.py)
    let rating = null;
    let expirationDate = null;
    
    try {
      const msaUrl = `https://www.uschess.org/msa/MbrDtlMain.php?${playerId}`;
      const msaResponse = await axios.get(msaUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(msaResponse.data);
      
      // Look for rating in various table formats
      $('table tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 2) {
          const firstCell = $(cells[0]).text().trim().toLowerCase();
          const secondCell = $(cells[1]).text().trim();
          
          // Look for rating patterns
          if (firstCell.includes('regular') && firstCell.includes('rating')) {
            const ratingMatch = secondCell.match(/(\d+)/);
            if (ratingMatch) {
              rating = parseInt(ratingMatch[1]);
            }
          } else if (firstCell.includes('quick') && firstCell.includes('rating')) {
            const ratingMatch = secondCell.match(/(\d+)/);
            if (ratingMatch && !rating) { // Only use if we don't have regular rating
              rating = parseInt(ratingMatch[1]);
            }
          } else if (firstCell.includes('blitz') && firstCell.includes('rating')) {
            const ratingMatch = secondCell.match(/(\d+)/);
            if (ratingMatch && !rating) { // Only use if we don't have regular rating
              rating = parseInt(ratingMatch[1]);
            }
          }
          
          // Look for expiration date
          if (firstCell.includes('expiration') || firstCell.includes('expires')) {
            const dateMatch = secondCell.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
            if (dateMatch) {
              expirationDate = dateMatch[1];
            }
          }
        }
      });
      
      // If no rating found in tables, try looking in bold text elements
      if (!rating) {
        $('b').each((i, elem) => {
          const text = $(elem).text().trim();
          const ratingMatch = text.match(/(\d+)/);
          if (ratingMatch && parseInt(ratingMatch[1]) > 0 && parseInt(ratingMatch[1]) < 3000) {
            rating = parseInt(ratingMatch[1]);
          }
        });
      }
      
    } catch (msaError) {
      console.warn(`Could not fetch data from MSA page for player ${playerId}:`, msaError.message);
    }

    // Check if player is active based on expiration date (same logic as test.py)
    let isActive = false;
    if (expirationDate) {
      const today = new Date();
      const expDate = new Date(expirationDate);
      isActive = expDate > today;
    }

    return {
      rating,
      expirationDate,
      isActive,
      error: null
    };

  } catch (error) {
    console.error(`Error looking up player ${playerId}:`, error.message);
    return {
      rating: null,
      expirationDate: null,
      isActive: false,
      error: error.message
    };
  }
}

/**
 * Look up rating and expiration for a single player and update database
 * @param {Object} db - Database connection
 * @param {string} playerId - Database player ID
 * @param {string} uscfId - USCF player ID
 * @returns {Promise<{success: boolean, rating: number|null, expirationDate: string|null, isActive: boolean, error: string|null}>}
 */
async function lookupAndUpdatePlayer(db, playerId, uscfId) {
  try {
    const result = await getUSCFInfo(uscfId);
    
    if (result.error) {
      return {
        success: false,
        rating: null,
        expirationDate: null,
        isActive: false,
        error: result.error
      };
    }

    // Update the player in the database with rating, expiration date, and active status
    return new Promise((resolve) => {
      db.run(
        `UPDATE players SET rating = ?, expiration_date = ?, status = ? WHERE id = ?`,
        [result.rating, result.expirationDate, result.isActive ? 'active' : 'inactive', playerId],
        function(err) {
          if (err) {
            resolve({
              success: false,
              rating: result.rating,
              expirationDate: result.expirationDate,
              isActive: result.isActive,
              error: err.message
            });
          } else {
            resolve({
              success: true,
              rating: result.rating,
              expirationDate: result.expirationDate,
              isActive: result.isActive,
              error: null
            });
          }
        }
      );
    });

  } catch (error) {
    return {
      success: false,
      rating: null,
      expirationDate: null,
      isActive: false,
      error: error.message
    };
  }
}

module.exports = {
  getUSCFInfo,
  lookupAndUpdatePlayer
};
