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
  
  // First names that commonly pair with search terms
  const firstNames = ['John', 'James', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Maria', 'Mary', 'Patricia', 'Jennifer', 'Susan', 'Jessica', 'Lisa', 'Sarah', 'Karen', 'Nancy'];
  
  // Last names for varied results
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  
  // Only generate 0 mock players when real search fails (don't return fake results)
  // This prevents returning inaccurate players
  console.log(`Search for "${searchTerm}" returned no real results - returning empty array instead of mock data`);
  return [];
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
    
    // 2. Try Puppeteer first (requires browser but gets real results)
    let players = [];
    try {
      players = await searchWithPuppeteer(searchTerm, maxResults);
    } catch (puppeteerError) {
      console.log(`Puppeteer unavailable: ${puppeteerError.message}`);
    }

    if (players && players.length > 0) {
      const filteredPlayers = filterSearchResults(players, searchTerm, maxResults);
      searchCache.set(cacheKey, filteredPlayers);
      console.log(`Puppeteer search completed for: ${searchTerm} (${Date.now() - startTime}ms) - Found ${filteredPlayers.length} relevant players`);
      return filteredPlayers;
    }

    // 3. Fallback to HTTP-based search
    try {
      const httpPlayers = await searchViaMultipleEndpoints(searchTerm, maxResults);
      if (httpPlayers && httpPlayers.length > 0) {
        const filteredPlayers = filterSearchResults(httpPlayers, searchTerm, maxResults);
        searchCache.set(cacheKey, filteredPlayers);
        console.log(`HTTP search completed for: ${searchTerm} (${Date.now() - startTime}ms) - Found ${filteredPlayers.length} relevant players`);
        return filteredPlayers;
      }
    } catch (httpError) {
      console.log(`HTTP search failed: ${httpError.message}`);
    }

    // 4. All methods failed - return empty array (no mock data)
    console.log(`All search methods failed for: ${searchTerm}, returning empty results`);
    const emptyResults = [];
    searchCache.set(cacheKey, emptyResults);
    return emptyResults;
    
  } catch (error) {
    console.error('Search failed:', error);
    // Return empty array as final fallback
    return [];
  }
}

/**
 * Filter and rank search results by relevance to the search term
 * @param {Array} players - Raw player results from search
 * @param {string} searchTerm - Original search term
 * @param {number} maxResults - Maximum results to return
 * @returns {Array} Filtered and sorted players
 */
function filterSearchResults(players, searchTerm, maxResults) {
  if (!Array.isArray(players) || players.length === 0) {
    return [];
  }
  
  const searchLower = searchTerm.toLowerCase().trim();
  
  // Score each player based on name relevance
  const scoredPlayers = players.map(player => {
    let relevanceScore = 0;
    const nameLower = player.name ? player.name.toLowerCase() : '';
    
    // Exact match gets highest score
    if (nameLower === searchLower) {
      relevanceScore = 1000;
    }
    // Starts with search term
    else if (nameLower.startsWith(searchLower)) {
      relevanceScore = 100;
    }
    // Contains complete search term as a word
    else if (nameLower.includes(` ${searchLower}`) || nameLower.includes(`${searchLower} `)) {
      relevanceScore = 75;
    }
    // Starts with first word of search term
    else if (searchLower.includes(' ')) {
      const firstWord = searchLower.split(' ')[0];
      if (nameLower.startsWith(firstWord)) {
        relevanceScore = 50;
      } else if (nameLower.includes(` ${firstWord}`)) {
        relevanceScore = 30;
      }
    }
    // Contains search term (substring)
    else if (nameLower.includes(searchLower)) {
      relevanceScore = 20;
    }
    // Last word match
    else if (searchLower.includes(' ')) {
      const lastWord = searchLower.split(' ').pop();
      if (nameLower.endsWith(lastWord) || nameLower.includes(` ${lastWord}`)) {
        relevanceScore = 25;
      }
    }
    
    return { ...player, relevanceScore };
  });
  
  // Sort by relevance score (highest first), then by name alphabetically
  const sorted = scoredPlayers
    .filter(p => p.relevanceScore > 0) // Only keep relevant results
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  
  // Remove the relevanceScore before returning
  return sorted.slice(0, maxResults).map(({ relevanceScore, ...player }) => player);
}

/**
 * Search using Puppeteer to execute JavaScript and get real US Chess data
 */
async function searchWithPuppeteer(searchTerm, maxResults) {
  let browser;
  
  try {
    console.log(`Using Puppeteer to search for: ${searchTerm}`);
    
    // Launch browser with optimized settings
    // Note: puppeteer (not puppeteer-core) downloads its own Chromium
    const chromePath = '/Users/aarushchugh/.cache/puppeteer/chrome/mac_arm-141.0.7390.122/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
    
    browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-images',
        '--disable-plugins',
        '--disable-extensions'
      ].concat(process.env.DYNO ? [
        '--single-process',
        '--no-zygote'
      ] : [])
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    const url = `https://beta-ratings.uschess.org/?fuzzy=${encodeURIComponent(searchTerm)}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait 4-5 seconds for JavaScript to render the search results
    console.log('Waiting 4 seconds for JavaScript to render...');
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Look for search result cards
    const playerCards = await page.$$('.search-card-player');
    
    if (playerCards.length === 0) {
      console.log('No search result cards found');
      return [];
    }
    
    console.log(`Found ${playerCards.length} player cards`);
    
    const players = [];
    
    for (let i = 0; i < Math.min(playerCards.length, maxResults); i++) {
      try {
        const card = playerCards[i];
        
        // Extract player name
        const nameElement = await card.$('.font-names');
        let name = '';
        if (nameElement) {
          const nameSpans = await card.$$('.font-names span');
          const nameParts = [];
          for (let j = 0; j < nameSpans.length; j++) {
            const text = await nameSpans[j].evaluate(el => el.textContent.trim());
            if (text) nameParts.push(text);
          }
          
          if (nameParts.length >= 2) {
            const formatName = (n) => n.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
            name = `${formatName(nameParts[0])} ${formatName(nameParts[nameParts.length - 1])}`;
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
        
        if (name && memberId) {
          players.push({
            name: name.trim(),
            memberId: memberId.trim(),
            uscf_id: memberId.trim(),
            rating: null
          });
        }
      } catch (e) {
        console.log(`Error extracting player ${i}:`, e.message);
      }
    }
    
    return players;
    
  } catch (error) {
    console.log(`Puppeteer search failed: ${error.message}`);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Search using the US Chess beta ratings URL only
 * This is the primary fallback method that works everywhere
 */
async function searchViaMultipleEndpoints(searchTerm, maxResults) {
  try {
    // Try multiple US Chess endpoints
    const endpoints = [
      `https://beta-ratings.uschess.org/?fuzzy=${encodeURIComponent(searchTerm)}`,
      `https://www.uschess.org/msa/MbrDtlMain.php?` 
    ];
    
    for (const url of endpoints) {
      try {
        console.log(`Searching: ${url}`);
        
        // Make the HTTP request
        const response = await httpClient.get(url, {
          timeout: 20000 // 20 second timeout for Heroku
        });
        
        console.log('Waiting 4 seconds for JavaScript to render content...');
        // Wait for JavaScript to execute and render the search results
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Parse the response
        const players = parseAPIResponse(response.data, maxResults);
        if (players.length > 0) {
          console.log(`Found ${players.length} players via US Chess`);
          return players;
        }
      } catch (endpointError) {
        console.log(`Endpoint ${url} failed:`, endpointError.message);
        // Try next endpoint
        continue;
      }
    }
    
    return [];
  } catch (error) {
    console.log(`All US Chess endpoints failed:`, error.message);
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
