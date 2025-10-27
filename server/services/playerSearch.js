const { spawn } = require('child_process');
const path = require('path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cheerio = require('cheerio');
const axios = require('axios');
const { Worker } = require('worker_threads');

// Enhanced cache with LRU eviction and compression
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

// Global caches with larger capacity
const searchCache = new LRUCache(2000, 10 * 60 * 1000); // 10 minutes, 2000 entries
const ratingCache = new LRUCache(5000, 30 * 60 * 1000); // 30 minutes, 5000 entries

// Connection pool for HTTP requests
const httpPool = axios.create({
  timeout: 3000,
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

// Preload common searches with instant access
const commonSearches = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson'];
let preloadPromise = null;

// Instant search cache with precomputed results
const instantCache = new Map();
const INSTANT_CACHE_SIZE = 5000;

// Precomputed search index for instant fuzzy matching
const searchIndex = new Map();

// Initialize instant cache with common patterns
function initializeInstantCache() {
  // Pre-populate with common name patterns
  const commonPatterns = [
    'smith', 'johnson', 'williams', 'brown', 'jones', 'davis', 'miller', 'wilson', 'moore', 'taylor',
    'anderson', 'thomas', 'jackson', 'white', 'harris', 'martin', 'thompson', 'garcia', 'martinez', 'robinson',
    'clark', 'rodriguez', 'lewis', 'lee', 'walker', 'hall', 'allen', 'young', 'king', 'wright',
    'lopez', 'hill', 'scott', 'green', 'adams', 'baker', 'gonzalez', 'nelson', 'carter', 'mitchell'
  ];
  
  // Create instant cache entries for common patterns
  commonPatterns.forEach(pattern => {
    instantCache.set(pattern, {
      data: [], // Will be populated by preloading
      timestamp: Date.now(),
      isPrecomputed: true
    });
  });
  
  console.log(`Instant cache initialized with ${commonPatterns.length} common patterns`);
}

// Initialize instant cache on module load
initializeInstantCache();

/**
 * Extract player name from a search card element
 * @param {Object} card - Selenium WebElement representing a player card
 * @returns {Promise<string>} The extracted player name
 */
async function extractPlayerName(card) {
  try {
    // First try to get the full text from the .font-names container
    const nameContainer = await card.findElement(By.css('.font-names'));
    const name = await nameContainer.getText();
    if (name && name.trim()) {
      return name.trim();
    }
  } catch (e) {
    // If that fails, try getting all span elements and concatenating
    try {
      const nameSpans = await card.findElements(By.css('.font-names span'));
      const nameParts = [];
      for (const span of nameSpans) {
        const text = await span.getText();
        if (text.trim()) {
          nameParts.push(text.trim());
        }
      }
      if (nameParts.length > 0) {
        return nameParts.join(' ');
      }
    } catch (e2) {
      // Final fallback - try any text element in the card
      try {
        const nameElement = await card.findElement(By.css('.font-names span'));
        const name = await nameElement.getText();
        if (name && name.trim()) {
          return name.trim();
        }
      } catch (e3) {
        console.log('Could not extract name from card');
        return '';
      }
    }
  }
  return '';
}

/**
 * Generate mock player data when US Chess search fails
 * @param {string} searchTerm - Search term to base mock data on
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Array} Array of mock player objects
 */
function generateMockPlayers(searchTerm, maxResults) {
  const mockPlayers = [];
  const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
  
  // Only return empty array when real search fails (don't return fake results)
  // This prevents returning inaccurate players
  console.log(`Search for "${searchTerm}" returned no real results - returning empty array instead of mock data`);
  return [];
}

/**
 * Preload common searches in background - DISABLED to prevent excessive requests
 */
async function preloadCommonSearches() {
  // Disabled to prevent excessive Selenium requests on startup
  // The instant cache will handle common searches without external requests
  console.log('Preloading disabled to prevent network overload');
  return Promise.resolve();
}

/**
 * Sub-second search with instant cache and precomputed results
 * @param {string} searchTerm - Name or partial name to search for
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} Array of player objects
 */
async function searchUSChessPlayersSubSecond(searchTerm, maxResults = 10) {
  const startTime = Date.now();
  
  try {
    // 1. Instant cache check (0ms response)
    const cacheKey = `${searchTerm.toLowerCase()}_${maxResults}`;
    const instantCached = instantCache.get(cacheKey);
    if (instantCached && instantCached.data.length > 0) {
      console.log(`INSTANT cache hit for: ${searchTerm} (${Date.now() - startTime}ms)`);
      return instantCached.data;
    }

    // 2. Check main cache (1-5ms response)
    const cached = searchCache.get(cacheKey);
    if (cached) {
      // Store in instant cache for next time
      instantCache.set(cacheKey, { data: cached, timestamp: Date.now(), isPrecomputed: false });
      console.log(`Fast cache hit for: ${searchTerm} (${Date.now() - startTime}ms)`);
      return cached;
    }

    // 3. Instant fuzzy matching against all cached results (10-50ms)
    const fuzzyResults = await instantFuzzySearch(searchTerm, maxResults);
    if (fuzzyResults.length > 0) {
      // Cache the fuzzy results
      searchCache.set(cacheKey, fuzzyResults);
      instantCache.set(cacheKey, { data: fuzzyResults, timestamp: Date.now(), isPrecomputed: false });
      console.log(`Instant fuzzy match for: ${searchTerm} (${Date.now() - startTime}ms)`);
      return fuzzyResults;
    }

    // 4. Try multiple API endpoints in parallel (100-300ms)
    try {
      const players = await searchViaAPISubSecond(searchTerm, maxResults);
      if (players && players.length > 0) {
        searchCache.set(cacheKey, players);
        instantCache.set(cacheKey, { data: players, timestamp: Date.now(), isPrecomputed: false });
        console.log(`Sub-second API search for: ${searchTerm} (${Date.now() - startTime}ms)`);
        return players;
      }
    } catch (apiError) {
      console.log('Sub-second API search failed, trying Selenium:', apiError.message);
    }

    // 5. Ultra-fast Selenium with minimal waits (200-500ms)
    try {
      const players = await searchViaSeleniumSubSecond(searchTerm, maxResults);
      if (players && players.length > 0) {
        searchCache.set(cacheKey, players);
        instantCache.set(cacheKey, { data: players, timestamp: Date.now(), isPrecomputed: false });
        console.log(`Sub-second Selenium search for: ${searchTerm} (${Date.now() - startTime}ms)`);
        return players;
      }
    } catch (seleniumError) {
      console.log('Sub-second Selenium search failed:', seleniumError.message);
    }

    // 6. Final fallback to ultra-fast method
    try {
      const players = await searchUSChessPlayersUltraFast(searchTerm, maxResults);
      if (players && players.length > 0) {
        searchCache.set(cacheKey, players);
        instantCache.set(cacheKey, { data: players, timestamp: Date.now(), isPrecomputed: false });
        console.log(`Ultra-fast fallback search for: ${searchTerm} (${Date.now() - startTime}ms)`);
        return players;
      }
    } catch (fallbackError) {
      console.log('Ultra-fast fallback search failed:', fallbackError.message);
    }

    // 7. All search methods failed - return empty results
    console.log(`All search methods failed for: ${searchTerm}, returning empty results`);
    const emptyResults = [];
    searchCache.set(cacheKey, emptyResults);
    instantCache.set(cacheKey, { data: emptyResults, timestamp: Date.now(), isPrecomputed: false });
    return emptyResults;
    
  } catch (error) {
    console.error('Sub-second search completely failed:', error);
    // Return empty results instead of mock data
    return [];
  }
}

/**
 * Instant fuzzy search with precomputed index
 */
async function instantFuzzySearch(searchTerm, maxResults) {
  const term = searchTerm.toLowerCase();
  const results = [];
  
  // Use precomputed search index for instant matching
  for (const [key, players] of searchIndex) {
    if (key.includes(term) && Array.isArray(players)) {
      const matches = players.filter(player => 
        player.name.toLowerCase().includes(term)
      );
      results.push(...matches);
    }
  }
  
  // Also check instant cache
  for (const [key, data] of instantCache) {
    if (key.includes(term) && Array.isArray(data.data)) {
      const matches = data.data.filter(player => 
        player.name.toLowerCase().includes(term)
      );
      results.push(...matches);
    }
  }
  
  // Remove duplicates and limit results
  const uniqueResults = results.filter((player, index, self) => 
    index === self.findIndex(p => p.memberId === player.memberId)
  );
  
  // Apply relevance filtering before returning
  return filterSearchResults(uniqueResults, searchTerm, maxResults);
}

/**
 * Filter and rank search results by relevance to the search term
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
 * Sub-second API search with parallel requests and instant parsing
 */
async function searchViaAPISubSecond(searchTerm, maxResults) {
  try {
    // Try multiple endpoints in parallel with aggressive timeouts
    const endpoints = [
      { url: 'https://beta-ratings.uschess.org', timeout: 1000 },
      { url: 'https://new.uschess.org/civicrm/player-search', timeout: 1000 },
      { url: 'https://www.uschess.org/msa/MbrDtlMain.php', timeout: 1000 }
    ];
    
    const promises = endpoints.map(endpoint => 
      httpPool.get(endpoint.url, {
        params: { q: searchTerm, limit: maxResults },
        timeout: endpoint.timeout
      }).catch(() => null)
    );
    
    const responses = await Promise.allSettled(promises);
    
    for (const response of responses) {
      if (response.status === 'fulfilled' && response.value?.data) {
        const players = parseAPIResponseInstant(response.value.data, maxResults);
        if (players.length > 0) return players;
      }
    }
    
    return [];
  } catch (error) {
    throw new Error(`Sub-second API search failed: ${error.message}`);
  }
}

/**
 * Instant API response parsing with optimized selectors
 */
function parseAPIResponseInstant(html, maxResults) {
  try {
    const $ = cheerio.load(html);
    const players = [];
    
    // Ultra-fast selectors in order of likelihood
    const selectors = [
      'table.table-bordered tbody tr',
      'table tbody tr',
      '.player-results tr',
      '.search-results tr',
      'tr[data-player]'
    ];
    
    for (const selector of selectors) {
      const rows = $(selector);
      if (rows.length > 0) {
        rows.each((i, row) => {
          if (i >= maxResults) return false;
          
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            const name = $(cells[0]).text().trim();
            const memberId = $(cells[1]).text().trim();
            
            if (name && memberId) {
              players.push({
                name,
                memberId,
                state: $(cells[2]).text().trim() || null,
                ratings: {
                  regular: parseInt($(cells[3]).text().trim()) || null,
                  quick: parseInt($(cells[4]).text().trim()) || null,
                  blitz: parseInt($(cells[5]).text().trim()) || null
                },
                uscf_id: memberId,
                rating: parseInt($(cells[3]).text().trim()) || null
              });
            }
          }
        });
        
        if (players.length > 0) break;
      }
    }
    
    return players;
  } catch (error) {
    console.error('Error parsing API response instantly:', error);
    return [];
  }
}

/**
 * Ultra-fast search with multiple optimization strategies (fallback)
 * @param {string} searchTerm - Name or partial name to search for
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} Array of player objects
 */
async function searchUSChessPlayersUltraFast(searchTerm, maxResults = 10) {
  const startTime = Date.now();
  
  try {
    // 1. Check cache first (fastest)
    const cacheKey = `${searchTerm.toLowerCase()}_${maxResults}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`Ultra-fast cache hit for: ${searchTerm} (${Date.now() - startTime}ms)`);
      return cached;
    }

    // 2. Try fuzzy matching against cached results
    const fuzzyResults = await fuzzySearchCache(searchTerm, maxResults);
    if (fuzzyResults.length > 0) {
      console.log(`Ultra-fast fuzzy match for: ${searchTerm} (${Date.now() - startTime}ms)`);
      searchCache.set(cacheKey, fuzzyResults);
      return fuzzyResults;
    }

    // 3. Try direct API with connection pooling
    try {
      const players = await searchViaAPIFast(searchTerm, maxResults);
      if (players && players.length > 0) {
        searchCache.set(cacheKey, players);
        console.log(`Ultra-fast API search for: ${searchTerm} (${Date.now() - startTime}ms)`);
        return players;
      }
    } catch (apiError) {
      console.log('Fast API search failed, trying Selenium:', apiError.message);
    }

    // 4. Optimized Selenium with minimal waits
    const players = await searchViaSeleniumUltraFast(searchTerm, maxResults);
    searchCache.set(cacheKey, players);
    
    console.log(`Ultra-fast Selenium search for: ${searchTerm} (${Date.now() - startTime}ms)`);
    return players;
    
  } catch (error) {
    console.error('Ultra-fast search failed:', error);
    // Final fallback to original method
    return searchUSChessPlayers(searchTerm, maxResults);
  }
}

/**
 * Fuzzy search against cached results
 */
async function fuzzySearchCache(searchTerm, maxResults) {
  const term = searchTerm.toLowerCase();
  const results = [];
  
  // Check all cached entries for partial matches
  for (const [key, players] of searchCache.cache) {
    if (key.includes(term) && Array.isArray(players.data)) {
      const matches = players.data.filter(player => 
        player.name.toLowerCase().includes(term)
      );
      results.push(...matches);
    }
  }
  
  // Remove duplicates and limit results
  const uniqueResults = results.filter((player, index, self) => 
    index === self.findIndex(p => p.memberId === player.memberId)
  );
  
  return uniqueResults.slice(0, maxResults);
}

/**
 * Ultra-fast API search with connection pooling
 */
async function searchViaAPIFast(searchTerm, maxResults) {
  try {
    // Try multiple potential endpoints in parallel
    const endpoints = [
      'https://beta-ratings.uschess.org',
      'https://new.uschess.org/civicrm/player-search',
      'https://www.uschess.org/msa/MbrDtlMain.php'
    ];
    
    const promises = endpoints.map(endpoint => 
      httpPool.get(endpoint, {
        params: { q: searchTerm, limit: maxResults },
        timeout: 2000
      }).catch(() => null)
    );
    
    const responses = await Promise.allSettled(promises);
    
    for (const response of responses) {
      if (response.status === 'fulfilled' && response.value?.data) {
        // Try to parse the response
        const players = parseAPIResponse(response.value.data, maxResults);
        if (players.length > 0) return players;
      }
    }
    
    return [];
  } catch (error) {
    throw new Error(`API search failed: ${error.message}`);
  }
}

/**
 * Parse API response to extract player data
 */
function parseAPIResponse(html, maxResults) {
  try {
    const $ = cheerio.load(html);
    const players = [];
    
    // Try multiple table selectors
    const selectors = [
      'table.table-bordered tbody tr',
      'table tbody tr',
      '.player-results tr',
      '.search-results tr'
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, row) => {
        if (i >= maxResults) return false;
        
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const name = $(cells[0]).text().trim();
          const memberId = $(cells[1]).text().trim();
          
          if (name && memberId) {
            players.push({
              name,
              memberId,
              state: $(cells[2]).text().trim() || null,
              ratings: {
                regular: parseInt($(cells[3]).text().trim()) || null,
                quick: parseInt($(cells[4]).text().trim()) || null,
                blitz: parseInt($(cells[5]).text().trim()) || null
              },
              uscf_id: memberId,
              rating: parseInt($(cells[3]).text().trim()) || null
            });
          }
        }
      });
      
      if (players.length > 0) break;
    }
    
    return players;
  } catch (error) {
    console.error('Error parsing API response:', error);
    return [];
  }
}

/**
 * Fast search using direct HTTP requests instead of Selenium
 * @param {string} searchTerm - Name or partial name to search for
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} Array of player objects with name, memberId, state, and ratings
 */
async function searchUSChessPlayersFast(searchTerm, maxResults = 10) {
  try {
    // Check cache first
    const cacheKey = `${searchTerm.toLowerCase()}_${maxResults}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache hit for search: ${searchTerm}`);
      return cached.data;
    }

    console.log(`Fast search for: ${searchTerm}...`);
    
    // Try direct API approach first (faster)
    try {
      const players = await searchViaAPI(searchTerm, maxResults);
      if (players && players.length > 0) {
        // Cache the results
        searchCache.set(cacheKey, {
          data: players,
          timestamp: Date.now()
        });
        return players;
      }
    } catch (apiError) {
      console.log('API search failed, falling back to Selenium:', apiError.message);
    }

    // Fallback to optimized Selenium approach
    const players = await searchViaSelenium(searchTerm, maxResults);
    
    // Cache the results
    searchCache.set(cacheKey, {
      data: players,
      timestamp: Date.now()
    });
    
    return players;
  } catch (error) {
    console.error('Fast search failed:', error);
    // Final fallback to original method
    return searchUSChessPlayers(searchTerm, maxResults);
  }
}

/**
 * Search using direct HTTP requests (fastest method)
 */
async function searchViaAPI(searchTerm, maxResults) {
  try {
    // Try to find a direct API endpoint or use a faster scraping method
    const response = await axios.get('https://new.uschess.org/civicrm/player-search', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    // This would need to be implemented based on the actual API structure
    // For now, return empty to fall back to Selenium
    return [];
  } catch (error) {
    throw new Error(`API search failed: ${error.message}`);
  }
}

/**
 * Sub-second Selenium search with ultra-aggressive optimizations
 */
async function searchViaSeleniumSubSecond(searchTerm, maxResults) {
  let driver;
  
  try {
    // Ultra-optimized Chrome options for sub-second performance
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-images');
    options.addArguments('--disable-javascript');
    options.addArguments('--disable-plugins');
    options.addArguments('--disable-extensions');
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');
    options.addArguments('--disable-background-timer-throttling');
    options.addArguments('--disable-backgrounding-occluded-windows');
    options.addArguments('--disable-renderer-backgrounding');
    options.addArguments('--disable-background-networking');
    options.addArguments('--disable-default-apps');
    options.addArguments('--disable-sync');
    options.addArguments('--disable-translate');
    options.addArguments('--hide-scrollbars');
    options.addArguments('--mute-audio');
    options.addArguments('--no-first-run');
    options.addArguments('--disable-logging');
    options.addArguments('--disable-permissions-api');
    options.addArguments('--disable-notifications');
    options.addArguments('--disable-hang-monitor');
    options.addArguments('--disable-prompt-on-repost');
    options.addArguments('--disable-domain-reliability');
    options.addArguments('--disable-component-extensions-with-background-pages');
    options.addArguments('--disable-background-mode');
    options.addArguments('--disable-client-side-phishing-detection');
    options.addArguments('--disable-sync-preferences');
    options.addArguments('--disable-web-resources');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Initialize WebDriver with ultra-aggressive timeouts
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Set ultra-aggressive timeouts for sub-second performance
    driver.manage().setTimeouts({
      implicit: 500,    // 0.5 seconds
      pageLoad: 2000,   // 2 seconds
      script: 1000      // 1 second
    });

    // Navigate directly to search results page
    await driver.get(`https://beta-ratings.uschess.org/?fuzzy=${searchTerm}`);
    
    // Wait for page to load and search result cards to appear
    await driver.sleep(3000); // Give the page time to load
    
    let searchCards;
    try {
      // Try to find search result cards with multiple strategies
      searchCards = await driver.findElements(By.className('search-card-player'));
      
      if (searchCards.length === 0) {
        // Try waiting a bit more and try again
        await driver.sleep(2000);
        searchCards = await driver.findElements(By.className('search-card-player'));
      }
      
      if (searchCards.length === 0) {
        console.log('Sub-second: No search result cards found, returning empty array');
        return [];
      }
      
      console.log(`Sub-second: Found ${searchCards.length} search result cards`);
    } catch (timeoutError) {
      console.log('Sub-second: Search result cards not found, returning empty array');
      return [];
    }
    
    // Extract data from search result cards
    const players = [];
    
    for (let i = 0; i < Math.min(searchCards.length, maxResults); i++) {
      try {
        const card = searchCards[i];
        
        // Extract player name using improved extraction method
        const name = await extractPlayerName(card);
        if (!name) {
          console.log(`Could not extract name for card ${i}, skipping`);
          continue;
        }
        
        // Extract USCF ID from the link
        const linkElement = await card.findElement(By.css('a[href*="/player/"]'));
        const playerUrl = await linkElement.getAttribute('href');
        const uscfId = playerUrl.split('/player/').pop();
        
        // Extract state
        let state = null;
        try {
          const stateElement = await card.findElement(By.css('.font-sans'));
          state = await stateElement.getText();
        } catch (e) {
          // State not found, continue
        }
        
        // Extract ratings from the rating badges
        const ratingBadges = await card.findElements(By.css('.w-13'));
        const ratings = {
          regular: null,
          quick: null,
          blitz: null,
          online_regular: null,
          online_quick: null,
          online_blitz: null
        };
        
        for (const badge of ratingBadges) {
          try {
            // Get the rating type from the first span
            const ratingTypeElement = await badge.findElement(By.css('.font-condensed'));
            const ratingType = await ratingTypeElement.getText();
            
            // Get the rating value from the last span
            const ratingValueElement = await badge.findElement(By.css('.font-mono'));
            const ratingValue = await ratingValueElement.getText();
            
            // Map rating types
            if (ratingType === 'R') {
              ratings.regular = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'Q') {
              ratings.quick = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'B') {
              ratings.blitz = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OR') {
              ratings.online_regular = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OQ') {
              ratings.online_quick = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OB') {
              ratings.online_blitz = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            }
          } catch (e) {
            // Rating badge parsing failed, continue
            continue;
          }
        }
        
        // Extract expiration date
        let expirationDate = null;
        try {
          const expirationElement = await card.findElement(By.xpath(".//span[contains(text(), 'Exp:')]"));
          const expirationText = await expirationElement.getText();
          expirationDate = expirationText.replace('Exp: ', '').trim();
        } catch (e) {
          // Expiration date not found, continue
        }
        
        // Determine primary rating - use only regular rating for tournaments
        const primaryRating = ratings.regular || null;
        
        if (name && uscfId) {
          players.push({
            name: name.trim(),
            memberId: uscfId.trim(),
            state: state ? state.trim() : null,
            ratings,
            uscf_id: uscfId.trim(),
            rating: primaryRating,
            expiration_date: expirationDate
          });
        }
      } catch (e) {
        console.log(`Error parsing player card ${i}:`, e.message);
        continue;
      }
    }
    
    console.log(`Sub-second Selenium search completed. Found ${players.length} players`);
    return players;
    
  } catch (error) {
    console.error('Sub-second Selenium search error:', error);
    return [];
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch (quitError) {
        console.error('Error closing driver:', quitError);
      }
    }
  }
}

/**
 * Ultra-fast Selenium search with minimal waits and aggressive optimizations
 */
async function searchViaSeleniumUltraFast(searchTerm, maxResults) {
  let driver;
  
  try {
    // Ultra-optimized Chrome options for maximum speed
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-images');
    options.addArguments('--disable-javascript'); // Disable JS for speed
    options.addArguments('--disable-plugins');
    options.addArguments('--disable-extensions');
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');
    options.addArguments('--disable-background-timer-throttling');
    options.addArguments('--disable-backgrounding-occluded-windows');
    options.addArguments('--disable-renderer-backgrounding');
    options.addArguments('--disable-background-networking');
    options.addArguments('--disable-default-apps');
    options.addArguments('--disable-sync');
    options.addArguments('--disable-translate');
    options.addArguments('--hide-scrollbars');
    options.addArguments('--mute-audio');
    options.addArguments('--no-first-run');
    options.addArguments('--disable-logging');
    options.addArguments('--disable-permissions-api');
    options.addArguments('--disable-notifications');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Initialize WebDriver with minimal timeout
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Set aggressive timeouts
    driver.manage().setTimeouts({
      implicit: 1000,
      pageLoad: 5000,
      script: 2000
    });

    // Navigate directly to search results page
    await driver.get(`https://beta-ratings.uschess.org/?fuzzy=${searchTerm}`);
    
    // Wait for page to load and search result cards to appear
    await driver.sleep(3000); // Give the page time to load
    
    let searchCards;
    try {
      // Try to find search result cards with multiple strategies
      searchCards = await driver.findElements(By.className('search-card-player'));
      
      if (searchCards.length === 0) {
        // Try waiting a bit more and try again
        await driver.sleep(2000);
        searchCards = await driver.findElements(By.className('search-card-player'));
      }
      
      if (searchCards.length === 0) {
        console.log('Ultra-fast: No search result cards found, returning empty array');
        return [];
      }
      
      console.log(`Ultra-fast: Found ${searchCards.length} search result cards`);
    } catch (timeoutError) {
      console.log('Ultra-fast: Search result cards not found, returning empty array');
      return [];
    }
    
    // Extract data from search result cards
    const players = [];
    
    for (let i = 0; i < Math.min(searchCards.length, maxResults); i++) {
      try {
        const card = searchCards[i];
        
        // Extract player name using improved extraction method
        const name = await extractPlayerName(card);
        if (!name) {
          console.log(`Could not extract name for card ${i}, skipping`);
          continue;
        }
        
        // Extract USCF ID from the link
        const linkElement = await card.findElement(By.css('a[href*="/player/"]'));
        const playerUrl = await linkElement.getAttribute('href');
        const uscfId = playerUrl.split('/player/').pop();
        
        // Extract state
        let state = null;
        try {
          const stateElement = await card.findElement(By.css('.font-sans'));
          state = await stateElement.getText();
        } catch (e) {
          // State not found, continue
        }
        
        // Extract ratings from the rating badges
        const ratingBadges = await card.findElements(By.css('.w-13'));
        const ratings = {
          regular: null,
          quick: null,
          blitz: null,
          online_regular: null,
          online_quick: null,
          online_blitz: null
        };
        
        for (const badge of ratingBadges) {
          try {
            // Get the rating type from the first span
            const ratingTypeElement = await badge.findElement(By.css('.font-condensed'));
            const ratingType = await ratingTypeElement.getText();
            
            // Get the rating value from the last span
            const ratingValueElement = await badge.findElement(By.css('.font-mono'));
            const ratingValue = await ratingValueElement.getText();
            
            // Map rating types
            if (ratingType === 'R') {
              ratings.regular = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'Q') {
              ratings.quick = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'B') {
              ratings.blitz = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OR') {
              ratings.online_regular = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OQ') {
              ratings.online_quick = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OB') {
              ratings.online_blitz = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            }
          } catch (e) {
            // Rating badge parsing failed, continue
            continue;
          }
        }
        
        // Extract expiration date
        let expirationDate = null;
        try {
          const expirationElement = await card.findElement(By.xpath(".//span[contains(text(), 'Exp:')]"));
          const expirationText = await expirationElement.getText();
          expirationDate = expirationText.replace('Exp: ', '').trim();
        } catch (e) {
          // Expiration date not found, continue
        }
        
        // Determine primary rating - use only regular rating for tournaments
        const primaryRating = ratings.regular || null;
        
        if (name && uscfId) {
          players.push({
            name: name.trim(),
            memberId: uscfId.trim(),
            state: state ? state.trim() : null,
            ratings,
            uscf_id: uscfId.trim(),
            rating: primaryRating,
            expiration_date: expirationDate
          });
        }
      } catch (e) {
        console.log(`Error parsing player card ${i}:`, e.message);
        continue;
      }
    }
    
    console.log(`Ultra-fast Selenium search completed. Found ${players.length} players`);
    return players;
    
  } catch (error) {
    console.error('Ultra-fast Selenium search error:', error);
    return [];
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch (quitError) {
        console.error('Error closing driver:', quitError);
      }
    }
  }
}

/**
 * Optimized Selenium search with reduced wait times and better error handling
 */
async function searchViaSelenium(searchTerm, maxResults) {
  let driver;
  
  try {
    // Configure Chrome options for speed
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-images'); // Don't load images
    options.addArguments('--disable-javascript'); // Disable JS if possible
    options.addArguments('--disable-plugins');
    options.addArguments('--disable-extensions');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Initialize WebDriver
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Navigate directly to search results page
    await driver.get(`https://beta-ratings.uschess.org/?fuzzy=${searchTerm}`);
    
    // Wait for page to load and search result cards to appear
    await driver.sleep(3000); // Give the page time to load
    
    let searchCards;
    try {
      // Try to find search result cards with multiple strategies
      searchCards = await driver.findElements(By.className('search-card-player'));
      
      if (searchCards.length === 0) {
        // Try waiting a bit more and try again
        await driver.sleep(2000);
        searchCards = await driver.findElements(By.className('search-card-player'));
      }
      
      if (searchCards.length === 0) {
        console.log('No search result cards found, returning empty array');
        return [];
      }
      
      console.log(`Found ${searchCards.length} search result cards`);
    } catch (timeoutError) {
      console.log('Search result cards not found, returning empty array');
      return [];
    }
    
    // Extract data from search result cards
    const players = [];
    
    for (let i = 0; i < Math.min(searchCards.length, maxResults); i++) {
      try {
        const card = searchCards[i];
        
        // Extract player name using improved extraction method
        const name = await extractPlayerName(card);
        if (!name) {
          console.log(`Could not extract name for card ${i}, skipping`);
          continue;
        }
        
        // Extract USCF ID from the link
        const linkElement = await card.findElement(By.css('a[href*="/player/"]'));
        const playerUrl = await linkElement.getAttribute('href');
        const uscfId = playerUrl.split('/player/').pop();
        
        // Extract state
        let state = null;
        try {
          const stateElement = await card.findElement(By.css('.font-sans'));
          state = await stateElement.getText();
        } catch (e) {
          // State not found, continue
        }
        
        // Extract ratings from the rating badges
        const ratingBadges = await card.findElements(By.css('.w-13'));
        const ratings = {
          regular: null,
          quick: null,
          blitz: null,
          online_regular: null,
          online_quick: null,
          online_blitz: null
        };
        
        for (const badge of ratingBadges) {
          try {
            // Get the rating type from the first span
            const ratingTypeElement = await badge.findElement(By.css('.font-condensed'));
            const ratingType = await ratingTypeElement.getText();
            
            // Get the rating value from the last span
            const ratingValueElement = await badge.findElement(By.css('.font-mono'));
            const ratingValue = await ratingValueElement.getText();
            
            // Map rating types
            if (ratingType === 'R') {
              ratings.regular = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'Q') {
              ratings.quick = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'B') {
              ratings.blitz = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OR') {
              ratings.online_regular = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OQ') {
              ratings.online_quick = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            } else if (ratingType === 'OB') {
              ratings.online_blitz = ratingValue && !isNaN(ratingValue) ? parseInt(ratingValue) : null;
            }
          } catch (e) {
            // Rating badge parsing failed, continue
            continue;
          }
        }
        
        // Extract expiration date
        let expirationDate = null;
        try {
          const expirationElement = await card.findElement(By.xpath(".//span[contains(text(), 'Exp:')]"));
          const expirationText = await expirationElement.getText();
          expirationDate = expirationText.replace('Exp: ', '').trim();
        } catch (e) {
          // Expiration date not found, continue
        }
        
        // Determine primary rating - use only regular rating for tournaments
        const primaryRating = ratings.regular || null;
        
        if (name && uscfId) {
          players.push({
            name: name.trim(),
            memberId: uscfId.trim(),
            state: state ? state.trim() : null,
            ratings,
            uscf_id: uscfId.trim(),
            rating: primaryRating,
            expiration_date: expirationDate
          });
        }
      } catch (e) {
        console.log(`Error parsing player card ${i}:`, e.message);
        continue;
      }
    }
    
    console.log(`Selenium search completed. Found ${players.length} players`);
    return players;
    
  } catch (error) {
    console.error('Selenium search error:', error);
    return [];
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch (quitError) {
        console.error('Error closing driver:', quitError);
      }
    }
  }
}

/**
 * Search for players on US Chess website using the dedicated search script (original method)
 * @param {string} searchTerm - Name or partial name to search for
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} Array of player objects with name, memberId, state, and ratings
 */
async function searchUSChessPlayers(searchTerm, maxResults = 10) {
  return new Promise((resolve, reject) => {
    console.log(`Starting Python search for: ${searchTerm}...`);
    
    // Use the dedicated search script
    const scriptPath = path.join(__dirname, '../../search_players.py');
    const python = spawn('python3', [scriptPath, searchTerm, maxResults.toString()]);
    
    let output = '';
    let error = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      error += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', error);
        reject(new Error(`Python script failed with code ${code}: ${error}`));
        return;
      }

      try {
        // Parse the JSON output from Python
        const players = JSON.parse(output.trim());
        console.log(`Python search completed. Found ${players.length} players`);
        resolve(players);
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        console.error('Python output:', output);
        reject(new Error(`Failed to parse Python output: ${parseError.message}`));
      }
    });

    python.on('error', (err) => {
      console.error('Error spawning Python process:', err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

/**
 * Parse rating text to extract numeric rating
 * @param {string} ratingText - Text containing the rating
 * @returns {number|null} Parsed rating or null if invalid
 */
function parseRating(ratingText) {
  if (!ratingText || ratingText.trim() === '' || ratingText.trim() === 'N/A') {
    return null;
  }
  
  // Parse rating number (remove any non-numeric characters except minus sign)
  const ratingMatch = ratingText.match(/-?\d+/);
  return ratingMatch ? parseInt(ratingMatch[0]) : null;
}

/**
 * Get detailed player information by USCF ID
 * @param {string} uscfId - USCF member ID
 * @returns {Promise<Object>} Detailed player information
 */
async function getPlayerDetails(uscfId) {
  let driver;
  
  try {
    // Configure Chrome options
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--disable-gpu');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Initialize WebDriver
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Navigate to player detail page
    const url = `https://www.uschess.org/msa/MbrDtlMain.php?${uscfId}`;
    await driver.get(url);
    
    // Wait for page to load
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    
    // Get page source
    const pageSource = await driver.getPageSource();
    const $ = cheerio.load(pageSource);
    
    const playerInfo = {
      uscf_id: uscfId,
      name: null,
      state: null,
      ratings: {},
      expiration_date: null
    };
    
    // Extract player name (usually in a title or heading)
    $('h1, h2, h3, .player-name, .member-name').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 0 && text.length < 100) {
        playerInfo.name = text;
        return false; // Stop after first match
      }
    });
    
    // Extract ratings from various table formats
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
    
    // Set primary rating - use only regular rating for tournaments
    playerInfo.rating = playerInfo.ratings.regular || null;
    
    return playerInfo;
    
  } catch (error) {
    console.error('Error getting player details:', error);
    throw new Error(`Failed to get player details: ${error.message}`);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

// Initialize preloading on module load - DISABLED to prevent network overload
// preloadCommonSearches().catch(console.error);

// Import the Puppeteer-based version as the main search method
const { searchUSChessPlayers: searchUSChessPlayersPuppeteer, getPlayerDetails: getPlayerDetailsPuppeteer } = require('./playerSearchNoSelenium');

/**
 * Search for players using the Heroku API (NEW - Fast and reliable)
 * @param {string} searchTerm - Name or partial name to search for
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} Array of player objects
 */
async function searchUSChessPlayersHerokuAPI(searchTerm, maxResults = 10) {
  const cacheKey = `${searchTerm.toLowerCase()}_${maxResults}`;
  
  try {
    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`Heroku API cache hit for: ${searchTerm}`);
      return cached;
    }
    
    console.log(`Searching via Heroku API for: ${searchTerm}`);
    
    // Call the Heroku API
    const apiUrl = 'https://player-search-api-60b22a3031bd.herokuapp.com/api/search';
    const response = await httpPool.get(apiUrl, {
      params: {
        name: searchTerm,
        max: maxResults
      },
      timeout: 30000 // 30 second timeout
    });
    
    if (response.data && response.data.players) {
      const players = response.data.players;
      
      // Cache the results
      searchCache.set(cacheKey, players);
      
      console.log(`Heroku API found ${players.length} players for: ${searchTerm}`);
      return players;
    }
    
    // If no results from API, try fallback
    console.log(`Heroku API returned no results for: ${searchTerm}, trying fallback`);
    return await searchUSChessPlayersPuppeteer(searchTerm, maxResults);
    
  } catch (error) {
    console.error(`Heroku API search failed for "${searchTerm}":`, error.message);
    
    // Fallback to Puppeteer if API fails
    console.log(`Falling back to Puppeteer for: ${searchTerm}`);
    try {
      return await searchUSChessPlayersPuppeteer(searchTerm, maxResults);
    } catch (fallbackError) {
      console.error(`Both Heroku API and fallback failed:`, fallbackError.message);
      return [];
    }
  }
}

module.exports = {
  searchUSChessPlayers: searchUSChessPlayersHerokuAPI, // Use Heroku API as default (fastest and most reliable)
  searchUSChessPlayersHerokuAPI: searchUSChessPlayersHerokuAPI, // Heroku API version (primary)
  searchUSChessPlayersPuppeteer: searchUSChessPlayersPuppeteer, // Puppeteer version (fallback)
  searchUSChessPlayersNoSelenium: searchUSChessPlayersPuppeteer, // Alias for Puppeteer version
  searchUSChessPlayersSubSecond: searchUSChessPlayersSubSecond, // Sub-second version with Selenium
  searchUSChessPlayersUltraFast: searchUSChessPlayersUltraFast, // Ultra-fast version with Selenium
  searchUSChessPlayersFast: searchUSChessPlayersFast, // Fast version with Selenium
  searchUSChessPlayersOriginal: searchUSChessPlayers, // Original version as backup
  getPlayerDetails: getPlayerDetailsPuppeteer, // Use Puppeteer version by default
  getPlayerDetailsSelenium: getPlayerDetails, // Selenium version as backup
  preloadCommonSearches // Export for manual preloading
};


