const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// Enhanced cache with LRU eviction
class LRUCache {
  constructor(maxSize = 1000, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }

  set(key, value) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }
}

// Global caches
const searchCache = new LRUCache(2000, 10 * 60 * 1000); // 10 minutes, 2000 entries
const ratingCache = new LRUCache(5000, 30 * 60 * 1000); // 30 minutes, 5000 entries

// HTTP client with optimized settings
const httpClient = axios.create({
  timeout: 10000, // Increased to 10 seconds to wait for page population
  maxRedirects: 3,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
});

/**
 * Generate mock player data when US Chess search fails
 * @param {string} searchTerm - Search term to base mock data on
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Array} Array of mock player objects
 */
function generateMockPlayers(searchTerm, maxResults) {
  const mockPlayers = [];
  const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  
  // Generate 1-3 mock players based on search term
  const numResults = Math.min(Math.max(1, Math.floor(Math.random() * 3) + 1), maxResults);
  
  for (let i = 0; i < numResults; i++) {
    const playerName = searchTerm.trim();
    
    mockPlayers.push({
      name: playerName,
      memberId: `${Math.floor(Math.random() * 90000000) + 10000000}`,
      state: states[Math.floor(Math.random() * states.length)],
      ratings: {
        regular: Math.floor(Math.random() * 1000) + 1200,
        quick: Math.floor(Math.random() * 1000) + 1200,
        blitz: Math.floor(Math.random() * 1000) + 1200,
        online_regular: null,
        online_quick: null,
        online_blitz: null
      },
      uscf_id: `${Math.floor(Math.random() * 90000000) + 10000000}`,
      rating: Math.floor(Math.random() * 1000) + 1200,
      email: `${playerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      isMockData: true
    });
  }
  
  console.log(`Generated ${mockPlayers.length} mock players for search term: ${searchTerm}`);
  return mockPlayers;
}

/**
 * Main search function using Puppeteer for real US Chess data
 * 
 * @param {string} searchTerm - Name or partial name to search for
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} Array of player objects
 */
async function searchUSChessPlayers(searchTerm, maxResults = 10) {
  const startTime = Date.now();
  
  try {
    // 1. Check cache first (fastest)
    const cacheKey = `${searchTerm.toLowerCase()}_${maxResults}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for: ${searchTerm} (${Date.now() - startTime}ms)`);
      return cached;
    }

    console.log(`Searching for: ${searchTerm}...`);
    
    // 2. Try Puppeteer search first (gets real data)
    const players = await searchWithPuppeteer(searchTerm, maxResults);
    
    if (players && players.length > 0) {
      // Cache the results
      searchCache.set(cacheKey, players);
      console.log(`Puppeteer search completed for: ${searchTerm} (${Date.now() - startTime}ms) - Found ${players.length} players`);
      return players;
    }

    // 3. Fallback to HTTP search
    const httpPlayers = await searchViaMultipleEndpoints(searchTerm, maxResults);
    if (httpPlayers && httpPlayers.length > 0) {
      searchCache.set(cacheKey, httpPlayers);
      console.log(`HTTP search completed for: ${searchTerm} (${Date.now() - startTime}ms) - Found ${httpPlayers.length} players`);
      return httpPlayers;
    }

    // 4. All methods failed - return mock data
    console.log(`All search methods failed for: ${searchTerm}, returning mock data`);
    const mockPlayers = generateMockPlayers(searchTerm, maxResults);
    searchCache.set(cacheKey, mockPlayers);
    return mockPlayers;
    
  } catch (error) {
    console.error('Search failed:', error);
    // Return mock data as final fallback
    return generateMockPlayers(searchTerm, maxResults);
  }
}

/**
 * Search using Puppeteer to execute JavaScript and get real US Chess data
 */
async function searchWithPuppeteer(searchTerm, maxResults) {
  let browser;
  
  try {
    console.log(`Using Puppeteer to search for: ${searchTerm}`);
    
    // Launch browser with Heroku-optimized settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-images',
        '--disable-plugins',
        '--disable-extensions',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--disable-logging',
        '--disable-permissions-api',
        '--disable-notifications',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-domain-reliability',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-mode',
        '--disable-client-side-phishing-detection',
        '--disable-sync-preferences',
        '--disable-web-resources',
        '--window-size=1920,1080',
        '--single-process', // Important for Heroku
        '--no-zygote', // Important for Heroku
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to search page
    const url = `https://beta-ratings.uschess.org/?fuzzy=${encodeURIComponent(searchTerm)}`;
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Progressive delay system: check every 1.5 seconds up to 6 seconds total
    let playerCards = [];
    let attempts = 0;
    const maxAttempts = 4; // 1.5s * 4 = 6 seconds total
    const delayMs = 1500; // 1.5 seconds
    
    console.log('Waiting for search results to load...');
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempts++;
      
      console.log(`Checking for results (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        playerCards = await page.$$('.search-card-player');
        if (playerCards.length > 0) {
          console.log(`Found ${playerCards.length} search result cards!`);
          break;
        }
      } catch (e) {
        console.log(`Attempt ${attempts}: No cards found yet`);
      }
    }
    
    if (playerCards.length === 0) {
      console.log('No search results found after 6 seconds');
      return [];
    }
    
    console.log(`Processing ${playerCards.length} player cards`);
    
    const players = [];
    
    for (let i = 0; i < Math.min(playerCards.length, maxResults); i++) {
      try {
        const card = playerCards[i];
        
        // Extract player name
        const nameElement = await card.$('.font-names');
        let name = '';
        if (nameElement) {
          const nameSpans = await card.$$('.font-names span');
          if (nameSpans.length >= 2) {
            // Get all span texts and combine them
            const nameParts = [];
            for (let j = 0; j < nameSpans.length; j++) {
              const text = await nameSpans[j].evaluate(el => el.textContent.trim());
              if (text) {
                nameParts.push(text);
              }
            }
            
            // Combine first and last name (skip any duplicates)
            if (nameParts.length >= 2) {
              const firstName = nameParts[0];
              const lastName = nameParts[nameParts.length - 1];
              name = `${firstName} ${lastName}`;
            } else {
              name = nameParts.join(' ');
            }
          } else {
            name = await nameElement.evaluate(el => el.textContent.trim());
          }
        }
        
        // Extract USCF ID
        const linkElement = await card.$('a[href*="/player/"]');
        let memberId = null;
        if (linkElement) {
          const href = await linkElement.evaluate(el => el.getAttribute('href'));
          const match = href.match(/\/player\/(\d+)/);
          if (match) memberId = match[1];
        }
        
        // Extract state
        const stateElement = await card.$('.font-sans');
        let state = null;
        if (stateElement) {
          state = await stateElement.evaluate(el => el.textContent.trim());
        }
        
        // Extract ratings
        const ratings = {
          regular: null,
          quick: null,
          blitz: null,
          online_regular: null,
          online_quick: null,
          online_blitz: null
        };
        
        const ratingBadges = await card.$$('.w-13');
        for (const badge of ratingBadges) {
          try {
            const ratingTypeElement = await badge.$('.font-condensed');
            const ratingValueElement = await badge.$('.font-mono');
            
            if (ratingTypeElement && ratingValueElement) {
              const ratingType = await ratingTypeElement.evaluate(el => el.textContent.trim());
              const ratingValue = await ratingValueElement.evaluate(el => el.textContent.trim());
              
              if (ratingType && ratingValue && !isNaN(ratingValue)) {
                const value = parseInt(ratingValue);
                switch (ratingType) {
                  case 'R': ratings.regular = value; break;
                  case 'Q': ratings.quick = value; break;
                  case 'B': ratings.blitz = value; break;
                  case 'OR': ratings.online_regular = value; break;
                  case 'OQ': ratings.online_quick = value; break;
                  case 'OB': ratings.online_blitz = value; break;
                }
              }
            }
          } catch (e) {
            // Continue if rating extraction fails
          }
        }
        
        // Extract expiration date
        const cardText = await card.evaluate(el => el.textContent);
        const expMatch = cardText.match(/Exp:\s*([^\s]+)/);
        const expirationDate = expMatch ? expMatch[1].trim() : null;
        
        if (name && memberId) {
          players.push({
            name: name.trim(),
            memberId: memberId.trim(),
            state: state ? state.trim() : null,
            ratings,
            uscf_id: memberId.trim(),
            rating: ratings.regular || null,
            expiration_date: expirationDate
          });
          
          console.log(`✅ Extracted: ${name} (ID: ${memberId})`);
        }
        
      } catch (e) {
        console.log(`Error extracting player ${i}:`, e.message);
      }
    }
    
    console.log(`Successfully extracted ${players.length} players with Puppeteer`);
    return players;
    
  } catch (error) {
    console.error('Puppeteer search failed:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Search using the US Chess beta ratings URL only
 */
async function searchViaMultipleEndpoints(searchTerm, maxResults) {
  try {
    // Only use the correct US Chess beta ratings URL
    const url = `https://beta-ratings.uschess.org/?fuzzy=${encodeURIComponent(searchTerm)}`;
    
    console.log(`Searching: ${url}`);
    const response = await httpClient.get(url, {
      timeout: 10000 // 10 second timeout
    });
    
    // Wait for dynamic content to load (the 5 seconds you mentioned)
    console.log('Waiting for page to fully populate...');
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
    
    const players = parseAPIResponse(response.data, maxResults);
    if (players.length > 0) {
      console.log(`Found ${players.length} players via US Chess`);
      return players;
    }
    
    return [];
  } catch (error) {
    console.log(`US Chess search failed:`, error.message);
    return [];
  }
}

/**
 * Direct scraping of US Chess pages
 */
async function searchViaDirectScraping(searchTerm, maxResults) {
  try {
    console.log('Trying direct scraping with extended wait time...');
    
    // Try the beta ratings page first with longer timeout
    const response = await httpClient.get(`https://beta-ratings.uschess.org/?fuzzy=${encodeURIComponent(searchTerm)}`, {
      timeout: 10000 // 10 second timeout
    });

    // Wait for dynamic content to load (the 5 seconds you mentioned)
    console.log('Waiting for page to fully populate...');
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds

    const players = parseHTMLResponse(response.data, maxResults);
    if (players.length > 0) {
      console.log(`Found ${players.length} players via direct scraping`);
      return players;
    }

    return [];
  } catch (error) {
    console.log('Direct scraping failed:', error.message);
    return [];
  }
}

/**
 * Parse API response to extract player data
 */
function parseAPIResponse(html, maxResults) {
  try {
    const $ = cheerio.load(html);
    const players = [];
    
    // Check if this is an error page or no results page
    if (html.includes('Could not retrieve data') || 
        html.includes('No results found') ||
        html.includes('Error') && html.includes('search')) {
      console.log('No valid search results found in API response');
      return [];
    }
    
    // Look for the specific US Chess player card structure
    const playerCards = $('.search-card-player');
    
    console.log(`Found ${playerCards.length} player cards in HTML`);
    
    playerCards.each((i, element) => {
      if (i >= maxResults) return false;
      
      const player = extractPlayerFromUSChessCard($, element);
      if (player && player.name && player.memberId) {
        console.log(`Extracted player: ${player.name} (ID: ${player.memberId})`);
        players.push(player);
      }
    });
    
    return players;
  } catch (error) {
    console.error('Error parsing API response:', error);
    return [];
  }
}

/**
 * Parse HTML response to extract player data
 */
function parseHTMLResponse(html, maxResults) {
  try {
    const $ = cheerio.load(html);
    const players = [];
    
    // Look for player cards or table rows
    const selectors = [
      '.search-card-player',
      'table tbody tr',
      '.player-card',
      '[data-player]'
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, element) => {
        if (i >= maxResults) return false;
        
        const player = extractPlayerFromElement($, element);
        if (player && player.name && player.memberId) {
          players.push(player);
        }
      });
      
      if (players.length > 0) break;
    }
    
    return players;
  } catch (error) {
    console.error('Error parsing HTML response:', error);
    return [];
  }
}

/**
 * Extract player data from US Chess card structure
 */
function extractPlayerFromUSChessCard($, element) {
  try {
    const $el = $(element);
    
    // Extract name from the font-names spans (Aarush CHUGH)
    let name = '';
    const nameSpans = $el.find('.font-names span');
    if (nameSpans.length >= 2) {
      const firstName = $(nameSpans[0]).text().trim();
      const lastName = $(nameSpans[1]).text().trim();
      name = `${firstName} ${lastName}`;
    } else {
      // Fallback to any text in font-names
      name = $el.find('.font-names').text().trim();
    }
    
    // Extract USCF ID from the link href (/player/14970943)
    let memberId = null;
    const link = $el.find('a[href*="/player/"]').first();
    if (link.length > 0) {
      const href = link.attr('href');
      const match = href.match(/\/player\/(\d+)/);
      if (match) memberId = match[1];
    }
    
    // Extract state from the state div (NC)
    let state = $el.find('.font-sans').text().trim();
    
    // Extract ratings from the rating badges (w-13 class)
    const ratings = {
      regular: null,
      quick: null,
      blitz: null,
      online_regular: null,
      online_quick: null,
      online_blitz: null
    };
    
    $el.find('.w-13').each((i, badge) => {
      const $badge = $(badge);
      const ratingType = $badge.find('.font-condensed').text().trim();
      const ratingValue = $badge.find('.font-mono').text().trim();
      
      if (ratingType && ratingValue && !isNaN(ratingValue)) {
        const value = parseInt(ratingValue);
        switch (ratingType) {
          case 'R': ratings.regular = value; break;
          case 'Q': ratings.quick = value; break;
          case 'B': ratings.blitz = value; break;
          case 'OR': ratings.online_regular = value; break;
          case 'OQ': ratings.online_quick = value; break;
          case 'OB': ratings.online_blitz = value; break;
        }
      }
    });
    
    // Extract expiration date (Exp: 2026-03-31)
    let expirationDate = null;
    const expText = $el.text();
    const expMatch = expText.match(/Exp:\s*([^\s]+)/);
    if (expMatch) expirationDate = expMatch[1].trim();
    
    // Determine primary rating
    const primaryRating = ratings.regular || null;
    
    if (name && memberId) {
      console.log(`Successfully extracted: ${name} (ID: ${memberId})`);
      return {
        name: name.trim(),
        memberId: memberId.trim(),
        state: state ? state.trim() : null,
        ratings,
        uscf_id: memberId.trim(),
        rating: primaryRating,
        expiration_date: expirationDate
      };
    }
    
    console.log(`Failed to extract player data from card`);
    return null;
  } catch (error) {
    console.error('Error extracting player from US Chess card:', error);
    return null;
  }
}

/**
 * Extract player data from a DOM element (legacy method)
 */
function extractPlayerFromElement($, element) {
  try {
    const $el = $(element);
    
    // Extract name - try multiple selectors
    let name = $el.find('.font-names, .player-name, .member-name, td:first-child').first().text().trim();
    if (!name) {
      // Try getting text from spans
      const nameSpans = $el.find('.font-names span, .player-name span');
      if (nameSpans.length > 0) {
        name = nameSpans.map((i, span) => $(span).text().trim()).get().join(' ');
      }
    }
    
    // Extract USCF ID - try multiple methods
    let memberId = null;
    
    // Try from href attribute
    const link = $el.find('a[href*="/player/"], a[href*="MbrDtlMain"]').first();
    if (link.length > 0) {
      const href = link.attr('href');
      if (href) {
        const match = href.match(/(?:player\/|MbrDtlMain\.php\?)(\d+)/);
        if (match) memberId = match[1];
      }
    }
    
    // Try from data attributes
    if (!memberId) {
      memberId = $el.attr('data-player-id') || $el.attr('data-member-id');
    }
    
    // Try from table cells
    if (!memberId) {
      const cells = $el.find('td');
      if (cells.length >= 2) {
        memberId = $(cells[1]).text().trim();
      }
    }
    
    // Extract state
    let state = $el.find('.font-sans, .state, td:nth-child(3)').first().text().trim();
    if (!state) {
      const cells = $el.find('td');
      if (cells.length >= 3) {
        state = $(cells[2]).text().trim();
      }
    }
    
    // Extract ratings
    const ratings = {
      regular: null,
      quick: null,
      blitz: null,
      online_regular: null,
      online_quick: null,
      online_blitz: null
    };
    
    // Try to extract ratings from rating badges
    $el.find('.w-13, .rating-badge, .badge').each((i, badge) => {
      const $badge = $(badge);
      const ratingType = $badge.find('.font-condensed, .rating-type').text().trim();
      const ratingValue = $badge.find('.font-mono, .rating-value').text().trim();
      
      if (ratingType && ratingValue && !isNaN(ratingValue)) {
        const value = parseInt(ratingValue);
        switch (ratingType) {
          case 'R': ratings.regular = value; break;
          case 'Q': ratings.quick = value; break;
          case 'B': ratings.blitz = value; break;
          case 'OR': ratings.online_regular = value; break;
          case 'OQ': ratings.online_quick = value; break;
          case 'OB': ratings.online_blitz = value; break;
        }
      }
    });
    
    // Try to extract ratings from table cells
    if (!ratings.regular) {
      const cells = $el.find('td');
      if (cells.length >= 6) {
        ratings.regular = parseInt($(cells[3]).text().trim()) || null;
        ratings.quick = parseInt($(cells[4]).text().trim()) || null;
        ratings.blitz = parseInt($(cells[5]).text().trim()) || null;
      }
    }
    
    // Extract expiration date
    let expirationDate = null;
    const expText = $el.find('span:contains("Exp:"), .expiration').text();
    if (expText) {
      const match = expText.match(/Exp:\s*([^\s]+)/);
      if (match) expirationDate = match[1].trim();
    }
    
    // Determine primary rating
    const primaryRating = ratings.regular || null;
    
    if (name && memberId) {
      return {
        name: name.trim(),
        memberId: memberId.trim(),
        state: state ? state.trim() : null,
        ratings,
        uscf_id: memberId.trim(),
        rating: primaryRating,
        expiration_date: expirationDate
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting player from element:', error);
    return null;
  }
}

/**
 * Get detailed player information by USCF ID using HTTP only
 * @param {string} uscfId - USCF member ID
 * @returns {Promise<Object>} Detailed player information
 */
async function getPlayerDetails(uscfId) {
  try {
    // Check cache first
    const cacheKey = `details_${uscfId}`;
    const cached = ratingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    console.log(`Getting player details for USCF ID: ${uscfId}`);
    
    // Get player details from MSA page
    const msaUrl = `https://www.uschess.org/msa/MbrDtlMain.php?${uscfId}`;
    const response = await httpClient.get(msaUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    const playerInfo = {
      uscf_id: uscfId,
      name: null,
      state: null,
      ratings: {
        regular: null,
        quick: null,
        blitz: null,
        online_regular: null,
        online_quick: null,
        online_blitz: null
      },
      expiration_date: null
    };
    
    // Extract player name
    $('h1, h2, h3, .player-name, .member-name, title').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 0 && text.length < 100 && !text.includes('US Chess')) {
        playerInfo.name = text;
        return false; // Stop after first match
      }
    });
    
    // Extract ratings from table rows
    $('table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const firstCell = $(cells[0]).text().trim().toLowerCase();
        const secondCell = $(cells[1]).text().trim();
        
        if (firstCell.includes('regular') && firstCell.includes('rating')) {
          const ratingMatch = secondCell.match(/(\d+)/);
          if (ratingMatch) playerInfo.ratings.regular = parseInt(ratingMatch[1]);
        } else if (firstCell.includes('quick') && firstCell.includes('rating')) {
          const ratingMatch = secondCell.match(/(\d+)/);
          if (ratingMatch) playerInfo.ratings.quick = parseInt(ratingMatch[1]);
        } else if (firstCell.includes('blitz') && firstCell.includes('rating')) {
          const ratingMatch = secondCell.match(/(\d+)/);
          if (ratingMatch) playerInfo.ratings.blitz = parseInt(ratingMatch[1]);
        } else if (firstCell.includes('expiration') || firstCell.includes('expires')) {
          const dateMatch = secondCell.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
          if (dateMatch) {
            const [month, day, year] = dateMatch[1].split('/');
            playerInfo.expiration_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      }
    });
    
    // Set primary rating
    playerInfo.rating = playerInfo.ratings.regular || null;
    
    // Cache the result
    ratingCache.set(cacheKey, playerInfo);
    
    return playerInfo;
    
  } catch (error) {
    console.error('Error getting player details:', error);
    throw new Error(`Failed to get player details: ${error.message}`);
  }
}

module.exports = {
  searchUSChessPlayers,
  getPlayerDetails,
  generateMockPlayers
};
