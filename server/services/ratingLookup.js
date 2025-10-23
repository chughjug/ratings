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
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(msaResponse.data);
      
      // Look for rating and expiration date using improved parsing logic
      $('tr').each((i, tr) => {
        const $tr = $(tr);
        const firstTd = $tr.find('td').first().text().trim();
        
        // Look for Regular Rating
        if (firstTd.includes('Regular Rating')) {
          const secondTd = $tr.find('td').eq(1);
          const fullText = secondTd.text().trim();
          
          // Extract rating from the bold/nobr content
          const boldText = secondTd.find('b nobr').text().trim();
          if (boldText) {
            // Look for the first number in the content (the rating, not the year)
            const ratingMatch = boldText.match(/(\d+)/);
            if (ratingMatch) {
              const potentialRating = parseInt(ratingMatch[1]);
              // Valid ratings are typically between 100-3000
              if (potentialRating >= 100 && potentialRating <= 3000) {
                rating = potentialRating;
              }
            }
          }
          
          // Fallback: extract from the full text
          if (!rating) {
            const ratingMatch = fullText.match(/(\d+)/);
            if (ratingMatch) {
              const potentialRating = parseInt(ratingMatch[1]);
              // Valid ratings are typically between 100-3000
              if (potentialRating >= 100 && potentialRating <= 3000) {
                rating = potentialRating;
              }
            }
          }
        }
        
        // Look for Expiration Date
        if (firstTd.includes('Expiration Dt.')) {
          const secondTd = $tr.find('td').eq(1);
          const boldText = secondTd.find('b').text().trim();
          
          if (boldText) {
            // Try YYYY-MM-DD format first
            let dateMatch = boldText.match(/(\d{4}-\d{1,2}-\d{1,2})/);
            if (dateMatch) {
              // Convert YYYY-MM-DD to MM/DD/YYYY for consistency
              const [year, month, day] = dateMatch[1].split('-');
              expirationDate = `${month}/${day}/${year}`;
            } else {
              // Try MM/DD/YYYY format
              dateMatch = boldText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
              if (dateMatch) {
                expirationDate = dateMatch[1];
              }
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
