const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { lookupAndUpdatePlayer } = require('./ratingLookup');
const { getUSCFInfo } = require('./ratingLookup');
const { Worker } = require('worker_threads');
const { Transform } = require('stream');

// Enhanced LRU cache for rating lookups
class LRUCache {
  constructor(maxSize = 10000, ttl = 30 * 60 * 1000) {
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
const ratingCache = new LRUCache(10000, 30 * 60 * 1000); // 30 minutes, 10000 entries

// Worker pool for parallel processing
const workerPool = [];
const MAX_WORKERS = 4;
const WORKER_TIMEOUT = 30000; // 30 seconds

// Initialize worker pool
function initializeWorkerPool() {
  for (let i = 0; i < MAX_WORKERS; i++) {
    const worker = new Worker(`
      const { parentPort } = require('worker_threads');
      const { getUSCFInfo } = require('${path.join(__dirname, 'ratingLookup')}');
      
      parentPort.on('message', async (data) => {
        try {
          const { uscfId, playerId, name } = data;
          const result = await getUSCFInfo(uscfId);
          
          parentPort.postMessage({
            success: true,
            playerId,
            name,
            uscfId,
            result
          });
        } catch (error) {
          parentPort.postMessage({
            success: false,
            playerId: data.playerId,
            name: data.name,
            uscfId: data.uscfId,
            error: error.message
          });
        }
      });
    `, { eval: true });
    
    workerPool.push(worker);
  }
}

// Initialize worker pool on module load
try {
  initializeWorkerPool();
} catch (error) {
  console.error('Error initializing worker pool:', error);
}

/**
 * Ultra-fast rating lookup using worker threads and advanced caching
 * @param {Array} playersWithUSCF - Array of players with USCF IDs
 * @returns {Promise<Array>} Array of rating lookup results
 */
async function lookupRatingsUltraFast(playersWithUSCF) {
  console.log(`Starting ultra-fast rating lookup for ${playersWithUSCF.length} players...`);
  const startTime = Date.now();
  
  // Separate cached and uncached players
  const cachedResults = [];
  const uncachedPlayers = [];
  
  // Check cache first (ultra-fast)
  for (const player of playersWithUSCF) {
    const cacheKey = player.uscf_id;
    const cached = ratingCache.get(cacheKey);
    if (cached) {
      cachedResults.push({
        id: player.id,
        name: player.name,
        uscf_id: player.uscf_id,
        success: true,
        rating: cached.rating,
        expirationDate: cached.expirationDate,
        isActive: cached.isActive,
        error: null,
        fromCache: true
      });
    } else {
      uncachedPlayers.push(player);
    }
  }
  
  console.log(`Cache hits: ${cachedResults.length}, Cache misses: ${uncachedPlayers.length}`);
  
  if (uncachedPlayers.length === 0) {
    console.log(`Ultra-fast lookup completed in ${Date.now() - startTime}ms (all cached)`);
    return cachedResults;
  }
  
  // Process uncached players using worker threads
  const workerResults = await processWithWorkers(uncachedPlayers);
  
  // Combine results
  const allResults = [...cachedResults, ...workerResults];
  
  console.log(`Ultra-fast rating lookup completed in ${Date.now() - startTime}ms. Processed ${allResults.length} players.`);
  return allResults;
}

/**
 * Process players using worker threads for maximum parallelism
 */
async function processWithWorkers(players) {
  const results = [];
  const promises = [];
  
  // Distribute players across workers
  const playersPerWorker = Math.ceil(players.length / MAX_WORKERS);
  
  for (let i = 0; i < MAX_WORKERS && i * playersPerWorker < players.length; i++) {
    const workerPlayers = players.slice(i * playersPerWorker, (i + 1) * playersPerWorker);
    if (workerPlayers.length > 0) {
      promises.push(processWorkerBatch(workerPool[i], workerPlayers));
    }
  }
  
  // Wait for all workers to complete
  const workerResults = await Promise.all(promises);
  
  // Flatten results
  for (const workerResult of workerResults) {
    results.push(...workerResult);
  }
  
  return results;
}

/**
 * Process a batch of players with a single worker
 */
async function processWorkerBatch(worker, players) {
  return new Promise((resolve) => {
    const results = [];
    let completed = 0;
    
    // Set up worker message handler
    const messageHandler = (data) => {
      if (data.success) {
        // Cache the result
        ratingCache.set(data.uscfId, data.result);
        
        results.push({
          id: data.playerId,
          name: data.name,
          uscf_id: data.uscfId,
          success: true,
          rating: data.result.rating,
          expirationDate: data.result.expirationDate,
          isActive: data.result.isActive,
          error: null,
          fromCache: false
        });
      } else {
        results.push({
          id: data.playerId,
          name: data.name,
          uscf_id: data.uscfId,
          success: false,
          rating: null,
          expirationDate: null,
          isActive: true, // Always mark as active when rating lookup fails
          error: data.error,
          fromCache: false
        });
      }
      
      completed++;
      if (completed === players.length) {
        worker.off('message', messageHandler);
        resolve(results);
      }
    };
    
    worker.on('message', messageHandler);
    
    // Send all players to worker
    for (const player of players) {
      worker.postMessage({
        uscfId: player.uscf_id,
        playerId: player.id,
        name: player.name
      });
    }
    
    // Timeout fallback
    setTimeout(() => {
      if (completed < players.length) {
        worker.off('message', messageHandler);
        console.warn(`Worker timeout for ${players.length - completed} players`);
        resolve(results);
      }
    }, WORKER_TIMEOUT);
  });
}

/**
 * Fast parallel rating lookup for multiple players (original method)
 * @param {Array} playersWithUSCF - Array of players with USCF IDs
 * @returns {Promise<Array>} Array of rating lookup results
 */
async function lookupRatingsInParallel(playersWithUSCF) {
  console.log(`Starting parallel rating lookup for ${playersWithUSCF.length} players...`);
  
  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 5; // Process 5 players at a time
  const results = [];
  
  for (let i = 0; i < playersWithUSCF.length; i += BATCH_SIZE) {
    const batch = playersWithUSCF.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (player) => {
      try {
        // Check cache first
        const cacheKey = player.uscf_id;
        const cached = ratingCache.get(cacheKey);
        if (cached) {
          console.log(`Cache hit for USCF ID: ${player.uscf_id}`);
          return {
            id: player.id,
            name: player.name,
            uscf_id: player.uscf_id,
            success: true,
            rating: cached.rating,
            expirationDate: cached.expirationDate,
            isActive: cached.isActive,
            error: null,
            fromCache: true
          };
        }
        
        // Look up rating
        const result = await getUSCFInfo(player.uscf_id);
        
        // Cache the result
        ratingCache.set(cacheKey, result);
        
        return {
          id: player.id,
          name: player.name,
          uscf_id: player.uscf_id,
          success: !result.error,
          rating: result.rating,
          expirationDate: result.expirationDate,
          isActive: result.isActive,
          error: result.error,
          fromCache: false
        };
      } catch (error) {
        console.error(`Error looking up rating for ${player.name} (${player.uscf_id}):`, error.message);
        return {
          id: player.id,
          name: player.name,
          uscf_id: player.uscf_id,
          success: false,
          rating: null,
          expirationDate: null,
          isActive: true, // Always mark as active when rating lookup fails
          error: error.message,
          fromCache: false
        };
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to the API
    if (i + BATCH_SIZE < playersWithUSCF.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`Parallel rating lookup completed. Processed ${results.length} players.`);
  return results;
}

/**
 * Fast batch database operations
 * @param {Object} db - Database connection
 * @param {string} tournamentId - Tournament ID
 * @param {Array} players - Array of player objects
 * @param {Array} ratingResults - Array of rating lookup results
 * @returns {Promise<Object>} Import results
 */
async function importPlayersBatch(db, tournamentId, players, ratingResults) {
  console.log(`Starting batch import of ${players.length} players...`);
  
  // Create rating lookup map for quick access
  const ratingMap = new Map();
  ratingResults.forEach(result => {
    ratingMap.set(result.id, result);
  });
  
  // Prepare batch insert statement
  const stmt = db.prepare(`
    INSERT INTO players (id, tournament_id, name, uscf_id, fide_id, rating, section, status, expiration_date, intentional_bye_rounds, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const playerIds = [];
  const importErrors = [];
  
  // Process all players in a single transaction
  try {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      players.forEach(player => {
        try {
          const id = require('uuid').v4();
          playerIds.push(id);
          
          // Get rating lookup result if available
          const ratingResult = ratingMap.get(id);
          const finalRating = ratingResult?.success ? ratingResult.rating : player.rating;
          const finalStatus = 'active'; // Always set imported players as active
          const expirationDate = ratingResult?.success ? ratingResult.expirationDate : null;
          
          // Process bye rounds
          let byeRounds = null;
          if (player.bye_rounds && player.bye_rounds.trim() !== '') {
            const rounds = player.bye_rounds.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
            byeRounds = rounds.length > 0 ? JSON.stringify(rounds) : null;
          }
          
          stmt.run([
            id,
            tournamentId,
            player.name,
            player.uscf_id || null,
            player.fide_id || null,
            finalRating,
            player.section || null,
            finalStatus,
            expirationDate,
            byeRounds,
            player.notes || null
          ]);
          
        } catch (error) {
          importErrors.push({
            player: player.name,
            error: error.message
          });
        }
      });
      
      db.run('COMMIT');
    });
    
    stmt.finalize();
    console.log(`Batch import completed. Imported ${playerIds.length} players.`);
  } catch (error) {
    console.error('Batch import transaction failed:', error);
    db.run('ROLLBACK');
    throw error;
  }
  
  return {
    success: true,
    importedCount: playerIds.length,
    playerIds,
    ratingLookupResults: ratingResults,
    errors: importErrors
  };
}

/**
 * Parse CSV file and extract player data
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Array>} Array of parsed player objects
 */
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const players = [];
    const errors = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          // Normalize column names (case-insensitive)
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = key.toLowerCase().trim();
            normalizedRow[normalizedKey] = row[key];
          });
          
          // Extract player data with flexible column mapping
          const player = {
            name: normalizedRow.name || normalizedRow['player name'] || normalizedRow['full name'] || '',
            uscf_id: normalizedRow.uscf_id || normalizedRow['uscf id'] || normalizedRow['uscf'] || normalizedRow['member id'] || '',
            fide_id: normalizedRow.fide_id || normalizedRow['fide id'] || normalizedRow['fide'] || '',
            rating: normalizedRow.rating || normalizedRow['uscf rating'] || normalizedRow['regular rating'] || '',
            section: normalizedRow.section || normalizedRow['division'] || normalizedRow['class'] || '',
            team_name: normalizedRow.team_name || normalizedRow['team name'] || normalizedRow['team'] || '',
            status: 'active', // Always default to active for imported players
            state: normalizedRow.state || normalizedRow['state/province'] || '',
            city: normalizedRow.city || normalizedRow['city/town'] || '',
            email: normalizedRow.email || normalizedRow['email address'] || '',
            phone: normalizedRow.phone || normalizedRow['phone number'] || '',
            bye_rounds: normalizedRow['bye rounds'] || normalizedRow['bye_rounds'] || normalizedRow['byes'] || '',
            expiration_date: normalizedRow['expiration date'] || normalizedRow['expiration_date'] || normalizedRow['expires'] || '',
            notes: normalizedRow.notes || normalizedRow['comments'] || normalizedRow['remarks'] || ''
          };
          
          // Clean up the data
          Object.keys(player).forEach(key => {
            if (typeof player[key] === 'string') {
              player[key] = player[key].trim();
              if (player[key] === '') player[key] = null;
            }
          });
          
          // Convert rating to number if it's a valid number
          if (player.rating && !isNaN(player.rating)) {
            player.rating = parseInt(player.rating);
          } else if (player.rating) {
            player.rating = null;
          }
          
          // Only add players with at least a name
          if (player.name) {
            players.push(player);
          }
        } catch (error) {
          errors.push({
            row: players.length + 1,
            error: error.message,
            data: row
          });
        }
      })
      .on('end', () => {
        resolve({ players, errors });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Validate CSV data and return validation results
 * @param {Array} players - Array of player objects
 * @returns {Object} Validation results with valid players and errors
 */
function validateCSVData(players) {
  const validPlayers = [];
  const errors = [];
  
  players.forEach((player, index) => {
    const playerErrors = [];
    
    // Required fields validation
    if (!player.name || player.name.trim() === '') {
      playerErrors.push('Name is required');
    }
    
    // USCF ID validation (if provided)
    if (player.uscf_id && !/^\d+$/.test(player.uscf_id)) {
      playerErrors.push('USCF ID must be numeric');
    }
    
    // FIDE ID validation (if provided)
    if (player.fide_id && !/^\d+$/.test(player.fide_id)) {
      playerErrors.push('FIDE ID must be numeric');
    }
    
    // Rating validation (if provided)
    if (player.rating && (isNaN(player.rating) || player.rating < 0 || player.rating > 3000)) {
      playerErrors.push('Rating must be a number between 0 and 3000');
    }
    
    // Status validation - for imports, we always force active status
    // Note: We override any status from CSV to ensure all imported players are active
    
    // Bye rounds validation (if provided)
    if (player.bye_rounds && player.bye_rounds.trim() !== '') {
      const byeRounds = player.bye_rounds.split(',').map(r => r.trim());
      const invalidRounds = byeRounds.filter(r => isNaN(parseInt(r)) || parseInt(r) < 1);
      if (invalidRounds.length > 0) {
        playerErrors.push('Bye rounds must be comma-separated positive numbers (e.g., "1,3,5")');
      }
    }
    
    // Expiration date validation (if provided)
    if (player.expiration_date && player.expiration_date.trim() !== '') {
      const date = new Date(player.expiration_date);
      if (isNaN(date.getTime())) {
        playerErrors.push('Expiration date must be a valid date (YYYY-MM-DD format)');
      }
    }
    
    if (playerErrors.length > 0) {
      errors.push({
        row: index + 1,
        player: player.name || 'Unknown',
        errors: playerErrors
      });
    } else {
      validPlayers.push(player);
    }
  });
  
  return { validPlayers, errors };
}

/**
 * Sub-second import players from CSV data with streaming and bulk operations
 * @param {Object} db - Database connection
 * @param {string} tournamentId - Tournament ID
 * @param {Array} players - Array of valid player objects
 * @param {boolean} lookupRatings - Whether to lookup ratings for players with USCF IDs
 * @returns {Promise<Object>} Import results
 */
async function importPlayersFromCSV(db, tournamentId, players, lookupRatings = true) {
  const startTime = Date.now();
  console.log(`Starting sub-second CSV import for ${players.length} players...`);
  console.log(`Tournament ID: ${tournamentId}`);
  console.log(`Players:`, JSON.stringify(players, null, 2));
  
  try {
    // Prepare players with IDs for rating lookup
    const playersWithUSCF = [];
    const playersWithIds = players.map(player => {
      const id = require('uuid').v4();
      
      // Track players with USCF IDs for rating lookup
      if (lookupRatings && player.uscf_id && player.uscf_id.trim() !== '') {
        playersWithUSCF.push({ id, name: player.name, uscf_id: player.uscf_id });
      }
      
      return { ...player, id };
    });
    
    let ratingLookupResults = [];
    
  // Ultra-fast rating lookup if requested
  if (lookupRatings && playersWithUSCF.length > 0) {
    console.log(`Looking up ratings for ${playersWithUSCF.length} players...`);
    try {
      ratingLookupResults = await lookupRatingsUltraFast(playersWithUSCF);
    } catch (error) {
      console.warn('Ultra-fast lookup failed, falling back to parallel lookup:', error.message);
      ratingLookupResults = await lookupRatingsInParallel(playersWithUSCF);
    }
  }
    
    // Import players in bulk with streaming
    const result = await importPlayersBulkStream(db, tournamentId, playersWithIds, ratingLookupResults);
    
    const duration = Date.now() - startTime;
    console.log(`Sub-second CSV import completed in ${duration}ms. Imported ${result.importedCount} players.`);
    return result;
  } catch (error) {
    console.error('Error in importPlayersFromCSV:', error);
    throw error;
  }
}

/**
 * Bulk import with streaming for sub-second performance
 */
async function importPlayersBulkStream(db, tournamentId, players, ratingResults) {
  console.log(`Starting bulk stream import of ${players.length} players...`);
  
  // Create rating lookup map for instant access
  const ratingMap = new Map();
  ratingResults.forEach(result => {
    ratingMap.set(result.id, result);
  });
  
  // Prepare all player data in memory for bulk insert
  const playerData = players.map(player => {
    const ratingResult = ratingMap.get(player.id);
    const finalRating = ratingResult?.success ? ratingResult.rating : player.rating;
    const finalStatus = 'active'; // Always set imported players as active
    const expirationDate = ratingResult?.success ? ratingResult.expirationDate : null;
    
    // Process bye rounds
    let byeRounds = null;
    if (player.bye_rounds && player.bye_rounds.trim() !== '') {
      const rounds = player.bye_rounds.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
      byeRounds = rounds.length > 0 ? JSON.stringify(rounds) : null;
    }
    
    return [
      player.id,
      tournamentId,
      player.name,
      player.uscf_id || null,
      player.fide_id || null,
      finalRating,
      player.section || null,
      finalStatus,
      expirationDate,
      byeRounds,
      player.notes || null
    ];
  });
  
  // Single bulk insert with prepared statement
  const stmt = db.prepare(`
    INSERT INTO players (id, tournament_id, name, uscf_id, fide_id, rating, section, status, expiration_date, intentional_bye_rounds, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Execute all inserts in a single transaction
  try {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      for (const data of playerData) {
        stmt.run(data);
      }
      
      db.run('COMMIT');
    });
    
    stmt.finalize();
    
    console.log(`Bulk stream import completed. Imported ${players.length} players.`);
    return {
      success: true,
      importedCount: players.length,
      playerIds: players.map(p => p.id),
      ratingLookupResults: ratingResults,
      errors: []
    };
  } catch (error) {
    console.error('Bulk stream import transaction failed:', error);
    db.run('ROLLBACK');
    throw error;
  }
}

/**
 * Fast import players from CSV data into tournament with parallel processing (fallback)
 * @param {Object} db - Database connection
 * @param {string} tournamentId - Tournament ID
 * @param {Array} players - Array of valid player objects
 * @param {boolean} lookupRatings - Whether to lookup ratings for players with USCF IDs
 * @returns {Promise<Object>} Import results
 */
async function importPlayersFromCSVFast(db, tournamentId, players, lookupRatings = true) {
  console.log(`Starting fast CSV import for ${players.length} players...`);
  
  // Prepare players with IDs for rating lookup
  const playersWithUSCF = [];
  const playersWithIds = players.map(player => {
    const id = require('uuid').v4();
    
    // Track players with USCF IDs for rating lookup
    if (lookupRatings && player.uscf_id && player.uscf_id.trim() !== '') {
      playersWithUSCF.push({ id, name: player.name, uscf_id: player.uscf_id });
    }
    
    return { ...player, id };
  });
  
  let ratingLookupResults = [];
  
  // Look up ratings in parallel if requested
  if (lookupRatings && playersWithUSCF.length > 0) {
    console.log(`Looking up ratings for ${playersWithUSCF.length} players...`);
    ratingLookupResults = await lookupRatingsInParallel(playersWithUSCF);
  }
  
  // Import players in batch
  const result = await importPlayersBatch(db, tournamentId, playersWithIds, ratingLookupResults);
  
  console.log(`Fast CSV import completed. Imported ${result.importedCount} players.`);
  return result;
}

/**
 * Original import function (kept as backup)
 * @param {Object} db - Database connection
 * @param {string} tournamentId - Tournament ID
 * @param {Array} players - Array of valid player objects
 * @param {boolean} lookupRatings - Whether to lookup ratings for players with USCF IDs
 * @returns {Promise<Object>} Import results
 */
async function importPlayersFromCSVOriginal(db, tournamentId, players, lookupRatings = true) {
  const stmt = db.prepare(`
    INSERT INTO players (id, tournament_id, name, uscf_id, fide_id, rating, section, status, expiration_date, intentional_bye_rounds, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const playerIds = [];
  const playersWithUSCF = [];
  const importErrors = [];
  
  // Insert players into database
  players.forEach(player => {
    try {
      const id = require('uuid').v4();
      playerIds.push(id);
      
      // Process bye rounds - convert comma-separated string to array format
      let byeRounds = null;
      if (player.bye_rounds && player.bye_rounds.trim() !== '') {
        const rounds = player.bye_rounds.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
        byeRounds = rounds.length > 0 ? JSON.stringify(rounds) : null;
      }
      
      stmt.run([
        id,
        tournamentId,
        player.name,
        player.uscf_id || null,
        player.fide_id || null,
        player.rating || null,
        player.section || null,
        'active', // Always set imported players as active
        player.expiration_date || null,
        byeRounds,
        player.notes || null
      ]);
      
      // Track players with USCF IDs for rating lookup
      if (lookupRatings && player.uscf_id && player.uscf_id.trim() !== '') {
        playersWithUSCF.push({ id, name: player.name, uscf_id: player.uscf_id });
      }
    } catch (error) {
      importErrors.push({
        player: player.name,
        error: error.message
      });
    }
  });
  
  stmt.finalize();
  
  // Look up ratings for players with USCF IDs
  const ratingLookupResults = [];
  if (lookupRatings && playersWithUSCF.length > 0) {
    for (const player of playersWithUSCF) {
      try {
        const lookupResult = await lookupAndUpdatePlayer(db, player.id, player.uscf_id);
        ratingLookupResults.push({
          name: player.name,
          uscf_id: player.uscf_id,
          success: lookupResult.success,
          rating: lookupResult.rating,
          expirationDate: lookupResult.expirationDate,
          error: lookupResult.error
        });
      } catch (error) {
        ratingLookupResults.push({
          name: player.name,
          uscf_id: player.uscf_id,
          success: false,
          rating: null,
          expirationDate: null,
          error: error.message
        });
      }
    }
  }
  
  return {
    success: true,
    importedCount: playerIds.length,
    playerIds,
    ratingLookupResults,
    errors: importErrors
  };
}

/**
 * Generate CSV template with sample data
 * @returns {string} CSV template content
 */
function generateCSVTemplate() {
  const headers = [
    'Name',
    'USCF ID',
    'FIDE ID',
    'Rating',
    'Section',
    'Team',
    'Status',
    'State',
    'City',
    'Email',
    'Phone',
    'Bye Rounds',
    'Expiration Date',
    'Notes'
  ];
  
  const sampleData = [
    [
      'John Doe',
      '12345678',
      '987654321',
      '1800',
      'Open',
      'Chess Club A',
      'active',
      'CA',
      'San Francisco',
      'john@example.com',
      '555-1234',
      '1,3',
      '2024-12-31',
      'Club champion'
    ],
    [
      'Jane Smith',
      '87654321',
      '',
      '1600',
      'Reserve',
      'Chess Club B',
      'active',
      'NY',
      'New York',
      'jane@example.com',
      '555-5678',
      '',
      '',
      ''
    ],
    [
      'Bob Johnson',
      '11223344',
      '123456789',
      '2000',
      'Open',
      'Chess Club A',
      'active',
      'TX',
      'Houston',
      'bob@example.com',
      '555-9999',
      '2',
      '2025-06-30',
      'FIDE Master'
    ],
    [
      'Alice Brown',
      '',
      '',
      '1400',
      'U1800',
      'Chess Club B',
      'active',
      'FL',
      'Miami',
      'alice@example.com',
      '555-7777',
      '',
      '',
      'Unrated player'
    ]
  ];
  
  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

module.exports = {
  parseCSVFile,
  validateCSVData,
  importPlayersFromCSV, // Sub-second version by default
  importPlayersFromCSVFast, // Fast version
  importPlayersFromCSVOriginal, // Original version as backup
  generateCSVTemplate,
  lookupRatingsUltraFast, // Ultra-fast rating lookup
  lookupRatingsInParallel, // Parallel rating lookup
  importPlayersBulkStream, // Bulk stream import
  importPlayersBatch // Batch import
};

