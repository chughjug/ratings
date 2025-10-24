const express = require('express');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const db = require('../database');
const { lookupAndUpdatePlayer } = require('../services/ratingLookup');
const { searchUSChessPlayers, getPlayerDetails } = require('../services/playerSearch');
const { searchUSChessPlayersSubSecond } = require('../services/playerSearch');
const { getUSCFInfo } = require('../services/ratingLookup');
const { parseCSVFile, validateCSVData, importPlayersFromCSV, generateCSVTemplate } = require('../services/csvImport');
const { parseExcelFile, validateExcelData, importPlayersFromExcel, generateExcelTemplate } = require('../services/excelImport');
const router = express.Router();

// Helper function to attempt USCF lookup by name
async function findUSCFInfoByName(playerName, playerId) {
  try {
    console.log(`Searching for USCF info for: ${playerName}`);
    
    // Search for the player by name
    const searchResults = await searchUSChessPlayersSubSecond(playerName, 5);
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`No USCF search results found for: ${playerName}`);
      return {
        success: false,
        rating: null,
        expirationDate: null,
        isActive: false,
        error: 'No USCF player found with this name',
        searchAttempted: true
      };
    }
    
    // Try to find the best match (exact name match preferred)
    let bestMatch = null;
    const nameLower = playerName.toLowerCase().trim();
    
    // First try exact match
    for (const result of searchResults) {
      if (result.name && result.name.toLowerCase().trim() === nameLower) {
        bestMatch = result;
        break;
      }
    }
    
    // If no exact match, take the first result
    if (!bestMatch) {
      bestMatch = searchResults[0];
    }
    
    if (!bestMatch.uscf_id) {
      console.log(`No USCF ID found in search results for: ${playerName}`);
      return {
        success: false,
        rating: null,
        expirationDate: null,
        isActive: false,
        error: 'No USCF ID found in search results',
        searchAttempted: true
      };
    }
    
    console.log(`Found potential USCF match for ${playerName}: ${bestMatch.name} (${bestMatch.uscf_id})`);
    
    // Now look up the rating for the found USCF ID
    const ratingResult = await getUSCFInfo(bestMatch.uscf_id);
    
    return {
      success: !ratingResult.error,
      rating: ratingResult.rating,
      expirationDate: ratingResult.expirationDate,
      isActive: ratingResult.isActive,
      error: ratingResult.error,
      searchAttempted: true,
      matchedName: bestMatch.name,
      uscf_id: bestMatch.uscf_id
    };
    
  } catch (error) {
    console.error(`Error finding USCF info for ${playerName}:`, error.message);
    return {
      success: false,
      rating: null,
      expirationDate: null,
      isActive: false,
      error: error.message,
      searchAttempted: true
    };
  }
}

// Helper function to assign section based on tournament settings and player rating
async function assignSectionToPlayer(db, tournamentId, playerRating) {
  return new Promise((resolve, reject) => {
    // Get tournament settings
    db.get('SELECT settings FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!tournament || !tournament.settings) {
        resolve('Open'); // Default to Open section when no sections defined
        return;
      }
      
      try {
        const settings = JSON.parse(tournament.settings);
        const sections = settings.sections || [];
        
        if (sections.length === 0) {
          resolve('Open'); // Default to Open section when no sections defined
          return;
        }
        
        // Find the appropriate section based on rating
        for (const section of sections) {
          const sectionName = section.name.toLowerCase();
          
          // Check if section has explicit rating ranges
          if (section.min_rating !== undefined || section.max_rating !== undefined) {
            const minRating = section.min_rating || 0;
            const maxRating = section.max_rating || Infinity;
            
            if (playerRating >= minRating && playerRating <= maxRating) {
              resolve(section.name);
              return;
            }
          }
          // Check for common section name patterns
          else if (sectionName.includes('u1600') && playerRating < 1600) {
            resolve(section.name);
            return;
          }
          else if (sectionName.includes('u1400') && playerRating < 1400) {
            resolve(section.name);
            return;
          }
          else if (sectionName.includes('u1200') && playerRating < 1200) {
            resolve(section.name);
            return;
          }
          else if (sectionName.includes('u1000') && playerRating < 1000) {
            resolve(section.name);
            return;
          }
          else if (sectionName.includes('open') && playerRating >= 1600) {
            resolve(section.name);
            return;
          }
        }
        
        // If no section matches, assign to the first section or Open
        resolve(sections.length > 0 ? sections[0].name : 'Open');
      } catch (parseError) {
        console.error('Error parsing tournament settings:', parseError);
        resolve('Open'); // Default to Open section on error
      }
    });
  });
}

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Players router is working' });
});

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    
    const isAllowedType = allowedTypes.includes(file.mimetype);
    const isAllowedExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (isAllowedType || isAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files (.csv, .xls, .xlsx) are allowed'), false);
    }
  }
});

// Get all players for a tournament
router.get('/tournament/:tournamentId', (req, res) => {
  const { tournamentId } = req.params;
  
  db.all(
    'SELECT * FROM players WHERE tournament_id = ? ORDER BY name',
    [tournamentId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching players:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to fetch players' 
        });
      }
      res.json({ 
        success: true,
        data: rows 
      });
    }
  );
});

// Search players by name - MUST be before /:id route
router.get('/search', async (req, res) => {
  console.log('Search route hit!');
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    
    console.log(`Search request received: term="${searchTerm}", limit=${limit}`);
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      console.log('Search term too short');
      return res.status(400).json({
        success: false,
        error: 'Search term must be at least 2 characters'
      });
    }

    console.log(`Starting search for: ${searchTerm}`);
    
    // Use real US Chess search
    const players = await searchUSChessPlayers(searchTerm.trim(), parseInt(limit));
    console.log(`Search completed. Found ${players.length} players`);
    
    console.log('Sending response...');
    res.json({
      success: true,
      data: {
        players,
        count: players.length
      }
    });
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search players'
    });
  }
});

// Download CSV template - MUST be before /:id route
router.get('/csv-template', (req, res) => {
  try {
    const csvContent = generateCSVTemplate();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="players_template.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSV template'
    });
  }
});

// Download Excel template - MUST be before /:id route
router.get('/excel-template', (req, res) => {
  try {
    const excelBuffer = generateExcelTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="players_template.xlsx"');
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating Excel template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel template'
    });
  }
});

// Get player by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM players WHERE id = ?', [id], (err, player) => {
    if (err) {
      console.error('Error fetching player:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch player' 
      });
    }
    if (!player) {
      return res.status(404).json({ 
        success: false,
        error: 'Player not found' 
      });
    }
    res.json({ 
      success: true,
      data: player 
    });
  });
});

// Add player to tournament
router.post('/', async (req, res) => {
  try {
    const {
      tournament_id,
      name,
      uscf_id,
      fide_id,
      rating,
      section,
      intentional_bye_rounds,
      notes
    } = req.body;

    // Validate required fields
    if (!tournament_id || !name) {
      return res.status(400).json({ 
        success: false,
        error: 'Tournament ID and name are required' 
      });
    }

    const id = uuidv4();
    let finalRating = rating;
    let finalSection = section;

    // If player has a USCF ID, look up their rating and expiration date first
    let ratingLookupResult = null;
    if (uscf_id && uscf_id.trim() !== '') {
      try {
        ratingLookupResult = await lookupAndUpdatePlayer(db, id, uscf_id);
        if (ratingLookupResult.success) {
          finalRating = ratingLookupResult.rating;
          console.log(`✅ Successfully looked up rating for ${name} (${uscf_id}): ${ratingLookupResult.rating}, expires: ${ratingLookupResult.expirationDate}, active: ${ratingLookupResult.isActive}`);
        } else {
          console.warn(`⚠️ Failed to look up rating for ${name} (${uscf_id}): ${ratingLookupResult.error}`);
        }
      } catch (error) {
        console.error(`Error looking up rating for ${name} (${uscf_id}):`, error.message);
        ratingLookupResult = {
          success: false,
          error: error.message
        };
      }
    }

    // Auto-assign section if not provided and rating is available
    if (!finalSection && finalRating) {
      try {
        finalSection = await assignSectionToPlayer(db, tournament_id, finalRating);
        if (finalSection) {
          console.log(`📋 Auto-assigned ${name} to section: ${finalSection}`);
        }
      } catch (error) {
        console.error(`Error assigning section for ${name}:`, error);
      }
    }

    // Insert player using Promise wrapper - always default to 'active' status
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO players (id, tournament_id, name, uscf_id, fide_id, rating, section, status, expiration_date, intentional_bye_rounds, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, tournament_id, name, uscf_id, fide_id, finalRating, finalSection, 'active',
         ratingLookupResult?.expirationDate || null,
         intentional_bye_rounds ? JSON.stringify(intentional_bye_rounds) : null, notes],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ 
      success: true,
      data: { id },
      message: 'Player added successfully',
      ratingLookup: ratingLookupResult,
      autoAssignedSection: finalSection
    });

  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add player' 
    });
  }
});

// Update player
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    uscf_id,
    fide_id,
    rating,
    section,
    status,
    intentional_bye_rounds,
    notes
  } = req.body;

  // Build dynamic update query based on provided fields
  const updateFields = [];
  const updateValues = [];
  
  if (name !== undefined) {
    updateFields.push('name = ?');
    updateValues.push(name);
  }
  if (uscf_id !== undefined) {
    updateFields.push('uscf_id = ?');
    updateValues.push(uscf_id);
  }
  if (fide_id !== undefined) {
    updateFields.push('fide_id = ?');
    updateValues.push(fide_id);
  }
  if (rating !== undefined) {
    updateFields.push('rating = ?');
    updateValues.push(rating);
  }
  if (section !== undefined) {
    updateFields.push('section = ?');
    updateValues.push(section);
  }
  if (status !== undefined) {
    updateFields.push('status = ?');
    updateValues.push(status);
  }
  if (intentional_bye_rounds !== undefined) {
    updateFields.push('intentional_bye_rounds = ?');
    updateValues.push(intentional_bye_rounds ? JSON.stringify(intentional_bye_rounds) : null);
  }
  if (notes !== undefined) {
    updateFields.push('notes = ?');
    updateValues.push(notes);
  }
  if (req.body.team_name !== undefined) {
    updateFields.push('team_name = ?');
    updateValues.push(req.body.team_name);
  }

  // Check if at least one field is being updated
  if (updateFields.length === 0) {
    return res.status(400).json({ 
      success: false,
      error: 'At least one field must be provided for update' 
    });
  }

  // Add the player ID to the values array
  updateValues.push(id);

  const updateQuery = `UPDATE players SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(updateQuery, updateValues, function(err) {
    if (err) {
      console.error('Error updating player:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update player' 
      });
    }
    if (this.changes === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Player not found' 
      });
    }
    res.json({ 
      success: true,
      message: 'Player updated successfully' 
    });
  });
});

// Assign player to team (for individual tournaments with team scoring)
router.post('/:id/assign-team', (req, res) => {
  const { id } = req.params;
  const { team_name } = req.body;

  // Update player's team assignment
  db.run(
    'UPDATE players SET team_name = ? WHERE id = ?',
    [team_name || null, id],
    function(err) {
      if (err) {
        console.error('Error assigning player to team:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to assign player to team' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Player team assignment updated successfully' 
      });
    }
  );
});

// Remove player from team
router.delete('/:id/team', (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE players SET team_name = NULL WHERE id = ?',
    [id],
    function(err) {
      if (err) {
        console.error('Error removing player from team:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to remove player from team' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Player removed from team successfully' 
      });
    }
  );
});

// Remove player from tournament
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM players WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting player:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete player' 
      });
    }
    if (this.changes === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Player not found' 
      });
    }
    res.json({ 
      success: true,
      message: 'Player removed successfully' 
    });
  });
});

// Bulk add players
router.post('/bulk', async (req, res) => {
  try {
    const { tournament_id, players } = req.body;

    // Validate input
    if (!tournament_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Tournament ID is required' 
      });
    }
    if (!Array.isArray(players)) {
      return res.status(400).json({ 
        success: false,
        error: 'Players must be an array' 
      });
    }
    if (players.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'At least one player is required' 
      });
    }

    const playerIds = [];
    const playersWithUSCF = [];
    const sectionAssignmentResults = [];

    // First pass: look up ratings and assign sections
    for (const player of players) {
      const id = uuidv4();
      playerIds.push(id);
      
      let finalRating = player.rating || null;
      let finalSection = player.section || null;

      // Look up rating if USCF ID is provided
      if (player.uscf_id && player.uscf_id.trim() !== '') {
        playersWithUSCF.push({ id, name: player.name, uscf_id: player.uscf_id });
      }

      // Auto-assign section if not provided and rating is available
      if (!finalSection && finalRating) {
        try {
          finalSection = await assignSectionToPlayer(db, tournament_id, finalRating);
          if (finalSection) {
            sectionAssignmentResults.push({
              name: player.name,
              assignedSection: finalSection,
              rating: finalRating
            });
          }
        } catch (error) {
          console.error(`Error assigning section for ${player.name}:`, error);
        }
      }

      // Store the final values for database insertion
      player.finalRating = finalRating;
      player.finalSection = finalSection;
    }

    // Insert players into database - always default to 'active' status
    const stmt = db.prepare(`
      INSERT INTO players (id, tournament_id, name, uscf_id, fide_id, rating, section, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    players.forEach(player => {
      stmt.run([
        playerIds[players.indexOf(player)],
        tournament_id,
        player.name,
        player.uscf_id || null,
        player.fide_id || null,
        player.finalRating,
        player.finalSection,
        'active' // Always default to active
      ]);
    });

    await new Promise((resolve, reject) => {
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Look up ratings for players with USCF IDs
    const ratingLookupResults = [];
    for (const player of playersWithUSCF) {
      try {
        const lookupResult = await lookupAndUpdatePlayer(db, player.id, player.uscf_id);
        ratingLookupResults.push({
          name: player.name,
          uscf_id: player.uscf_id,
          success: lookupResult.success,
          rating: lookupResult.rating,
          expirationDate: lookupResult.expirationDate,
          isActive: lookupResult.isActive,
          error: lookupResult.error
        });
        
        if (lookupResult.success) {
          console.log(`✅ Successfully looked up rating for ${player.name} (${player.uscf_id}): ${lookupResult.rating}, expires: ${lookupResult.expirationDate}, active: ${lookupResult.isActive}`);
          
          // Auto-assign section after rating lookup
          if (lookupResult.rating) {
            try {
              const autoAssignedSection = await assignSectionToPlayer(db, tournament_id, lookupResult.rating);
              if (autoAssignedSection) {
                // Update the player's section in the database
                db.run('UPDATE players SET section = ? WHERE id = ?', [autoAssignedSection, player.id]);
                sectionAssignmentResults.push({
                  name: player.name,
                  assignedSection: autoAssignedSection,
                  rating: lookupResult.rating,
                  afterRatingLookup: true
                });
              }
            } catch (error) {
              console.error(`Error assigning section after rating lookup for ${player.name}:`, error);
            }
          }
        } else {
          console.warn(`⚠️ Failed to look up rating for ${player.name} (${player.uscf_id}): ${lookupResult.error}`);
        }
      } catch (error) {
        console.error(`Error looking up rating for ${player.name} (${player.uscf_id}):`, error.message);
        ratingLookupResults.push({
          name: player.name,
          uscf_id: player.uscf_id,
          success: false,
          rating: null,
          expirationDate: null,
          isActive: false,
          error: error.message
        });
      }
    }

    res.json({ 
      success: true,
      data: {
        player_ids: playerIds,
        ratingLookupResults: ratingLookupResults,
        sectionAssignmentResults: sectionAssignmentResults
      },
      message: `${players.length} players added successfully`
    });

  } catch (error) {
    console.error('Error in bulk add players:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add players' 
    });
  }
});


// Get player details by USCF ID
router.get('/details/:uscfId', async (req, res) => {
  try {
    const { uscfId } = req.params;
    
    if (!uscfId) {
      return res.status(400).json({
        success: false,
        error: 'USCF ID is required'
      });
    }

    const playerDetails = await getPlayerDetails(uscfId);
    
    res.json({
      success: true,
      data: playerDetails
    });
  } catch (error) {
    console.error('Error getting player details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get player details'
    });
  }
});


// Upload and parse CSV file
router.post('/csv-upload', upload.single('csvFile'), async (req, res) => {
  try {
    const { tournament_id, lookup_ratings = 'true' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    // Parse CSV file
    const { players, errors: parseErrors } = await parseCSVFile(req.file.path);
    
    // Validate parsed data
    const { validPlayers, errors: validationErrors } = validateCSVData(players);
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      data: {
        players: validPlayers,
        parseErrors,
        validationErrors
      }
    });
  } catch (error) {
    console.error('Error uploading CSV:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV file'
    });
  }
});

// Upload and parse Excel file
router.post('/excel-upload', upload.single('excelFile'), async (req, res) => {
  try {
    const { tournament_id, lookup_ratings = 'true' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    // Parse Excel file
    const { players, errors: parseErrors } = await parseExcelFile(req.file.path);
    
    // Validate parsed data
    const { validPlayers, errors: validationErrors } = validateExcelData(players);
    
    // Clean up uploaded file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      data: {
        players: validPlayers,
        parseErrors,
        validationErrors
      }
    });
  } catch (error) {
    console.error('Error uploading Excel:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process Excel file'
    });
  }
});

// Import CSV players
router.post('/csv-import', async (req, res) => {
  try {
    const { tournament_id, players, lookup_ratings = true } = req.body;
    
    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid players to import'
      });
    }

    // Import players
    const result = await importPlayersFromCSV(db, tournament_id, players, lookup_ratings);
    
    res.json({
      success: true,
      data: result,
      message: `${result.importedCount} players imported successfully`
    });
  } catch (error) {
    console.error('Error importing CSV players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import players'
    });
  }
});

// Import Excel players
router.post('/excel-import', async (req, res) => {
  try {
    const { tournament_id, players, lookup_ratings = true } = req.body;
    
    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid players to import'
      });
    }

    // Import players
    const result = await importPlayersFromExcel(db, tournament_id, players, lookup_ratings);
    
    res.json({
      success: true,
      data: result,
      message: `${result.importedCount} players imported successfully`
    });
  } catch (error) {
    console.error('Error importing Excel players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import players'
    });
  }
});

// Set player inactive for a specific round
router.post('/:id/inactive-round', (req, res) => {
  const { id } = req.params;
  const { round, reason } = req.body;

  if (!round) {
    return res.status(400).json({
      success: false,
      error: 'Round number is required'
    });
  }

  const inactiveId = uuidv4();
  
  db.run(
    `INSERT OR REPLACE INTO player_inactive_rounds (id, tournament_id, player_id, round, reason)
     VALUES (?, (SELECT tournament_id FROM players WHERE id = ?), ?, ?, ?)`,
    [inactiveId, id, id, round, reason],
    function(err) {
      if (err) {
        console.error('Error setting player inactive for round:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to set player inactive for round'
        });
      }
      res.json({
        success: true,
        message: 'Player set inactive for round successfully'
      });
    }
  );
});

// Remove player inactive status for a specific round
router.delete('/:id/inactive-round/:round', (req, res) => {
  const { id, round } = req.params;

  db.run(
    'DELETE FROM player_inactive_rounds WHERE player_id = ? AND round = ?',
    [id, round],
    function(err) {
      if (err) {
        console.error('Error removing player inactive status:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove player inactive status'
        });
      }
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Inactive round record not found'
        });
      }
      res.json({
        success: true,
        message: 'Player inactive status removed successfully'
      });
    }
  );
});

// Get inactive rounds for a player
router.get('/:id/inactive-rounds', (req, res) => {
  const { id } = req.params;

  db.all(
    'SELECT * FROM player_inactive_rounds WHERE player_id = ? ORDER BY round',
    [id],
    (err, rows) => {
      if (err) {
        console.error('Error fetching inactive rounds:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch inactive rounds'
        });
      }
      res.json({
        success: true,
        data: rows
      });
    }
  );
});

// Get all inactive rounds for a tournament
router.get('/tournament/:tournamentId/inactive-rounds', (req, res) => {
  const { tournamentId } = req.params;

  db.all(
    `SELECT pir.*, p.name as player_name 
     FROM player_inactive_rounds pir
     JOIN players p ON pir.player_id = p.id
     WHERE pir.tournament_id = ?
     ORDER BY pir.round, p.name`,
    [tournamentId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching tournament inactive rounds:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch tournament inactive rounds'
        });
      }
      res.json({
        success: true,
        data: rows
      });
    }
  );
});

// Programmatic player import API endpoint
router.post('/api-import/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { 
      api_key, 
      players, 
      lookup_ratings = true,
      auto_assign_sections = true,
      source = 'api',
      webhook_url = null
    } = req.body;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    // Simple API key validation
    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Validate players data
    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Players array is required and must not be empty'
      });
    }

    // Validate each player has required fields
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.name || typeof player.name !== 'string' || player.name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: `Player at index ${i} must have a valid name`
        });
      }
    }

    // Import players using existing CSV import logic
    const result = await importPlayersFromCSV(db, tournamentId, players, lookup_ratings);

    // If auto-assign sections is enabled, update sections for all players
    if (auto_assign_sections) {
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const playerId = result.playerIds[i];
        
        // Use rating from lookup result if available, otherwise use original rating
        let ratingToUse = player.rating;
        if (result.ratingLookupResults && result.ratingLookupResults[i] && result.ratingLookupResults[i].success && result.ratingLookupResults[i].rating) {
          ratingToUse = result.ratingLookupResults[i].rating;
        }
        
        // Only auto-assign if we have a rating and no section is already specified
        if (ratingToUse && (!player.section || player.section.trim() === '')) {
          try {
            const assignedSection = await assignSectionToPlayer(db, tournamentId, ratingToUse);
            if (assignedSection) {
              await new Promise((resolve, reject) => {
                db.run('UPDATE players SET section = ? WHERE id = ?', [assignedSection, playerId], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
              console.log(`📋 Auto-assigned ${player.name} to section: ${assignedSection} (rating: ${ratingToUse})`);
            }
          } catch (error) {
            console.error(`Error auto-assigning section for player ${player.name}:`, error);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${result.importedCount} players`,
      data: {
        tournament_id: tournamentId,
        tournament_name: tournament.name,
        imported_count: result.importedCount,
        player_ids: result.playerIds,
        rating_lookup_results: result.ratingLookupResults || [],
        import_errors: result.importErrors || [],
        validation_errors: result.validationErrors || []
      }
    });

  } catch (error) {
    console.error('Error in API import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import players via API'
    });
  }
});

// Real-time player registration endpoint
router.post('/register/:tournamentId', async (req, res) => {
  try {
    console.log('Registration endpoint called for tournament:', req.params.tournamentId);
    console.log('Request body:', req.body);
    
    const { tournamentId } = req.params;
    const { 
      api_key,
      name,
      uscf_id,
      fide_id,
      rating,
      section,
      school,
      grade,
      email,
      phone,
      state,
      city,
      notes,
      parent_name,
      parent_email,
      parent_phone,
      emergency_contact,
      emergency_phone,
      tshirt_size,
      dietary_restrictions,
      special_needs,
      lookup_ratings = true,
      auto_assign_sections = true,
      source = 'registration_form'
    } = req.body;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Validate required fields
    if (!name || !tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Name and tournament ID are required'
      });
    }

    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Create player object
    console.log('Creating player object for:', name);
    const player = {
      name: name.trim(),
      uscf_id: uscf_id || null,
      fide_id: fide_id || null,
      rating: rating || null,
      section: section || null,
      school: school || null,
      grade: grade || null,
      email: email || null,
      phone: phone || null,
      state: state || null,
      city: city || null,
      notes: notes || null,
      parent_name: parent_name || null,
      parent_email: parent_email || null,
      parent_phone: parent_phone || null,
      emergency_contact: emergency_contact || null,
      emergency_phone: emergency_phone || null,
      tshirt_size: tshirt_size || null,
      dietary_restrictions: dietary_restrictions || null,
      special_needs: special_needs || null
    };
    console.log('Player object created:', player);

    // Generate player ID
    const playerId = uuidv4();
    let finalRating = player.rating;
    let finalSection = player.section;

    // Enhanced USCF lookup - try both existing USCF ID and name search
    let ratingLookupResult = {
      success: false,
      rating: null,
      expirationDate: null,
      isActive: false,
      error: 'No lookup attempted',
      searchAttempted: false
    };
    
    // First try direct lookup if USCF ID is provided
    if (uscf_id && uscf_id.trim() !== '') {
      try {
        ratingLookupResult = await lookupAndUpdatePlayer(db, playerId, uscf_id);
        if (ratingLookupResult.success) {
          finalRating = ratingLookupResult.rating;
          console.log(`✅ Direct USCF lookup successful for ${name}: ${finalRating}`);
        }
      } catch (error) {
        console.error(`Error in direct USCF lookup for ${name}:`, error.message);
        ratingLookupResult = {
          success: false,
          error: error.message
        };
      }
    }
    
    // If direct lookup failed or no USCF ID provided, try name search
    if (!ratingLookupResult.success) {
      try {
        console.log(`Attempting name-based USCF search for: ${name}`);
        const nameSearchResult = await findUSCFInfoByName(name, playerId);
        if (nameSearchResult.success) {
          ratingLookupResult = nameSearchResult;
          finalRating = nameSearchResult.rating;
          // Update the player's USCF ID with the found one
          if (nameSearchResult.uscf_id) {
            player.uscf_id = nameSearchResult.uscf_id;
          }
          console.log(`✅ Name-based USCF lookup successful for ${name}: ${finalRating} (USCF ID: ${nameSearchResult.uscf_id})`);
        } else {
          console.log(`❌ Name-based USCF lookup failed for ${name}: ${nameSearchResult.error}`);
          ratingLookupResult = nameSearchResult;
        }
      } catch (error) {
        console.error(`Error in name-based USCF lookup for ${name}:`, error.message);
        ratingLookupResult = {
          success: false,
          error: error.message,
          searchAttempted: true
        };
      }
    }

    // Auto-assign section if not provided and rating is available
    if (!finalSection && finalRating) {
      try {
        finalSection = await assignSectionToPlayer(db, tournamentId, finalRating);
      } catch (error) {
        console.error(`Error assigning section for ${name}:`, error);
        // Continue without section assignment
        finalSection = null;
      }
    }

    // Insert player into database
    console.log('Attempting to insert player:', {
      playerId, tournamentId, name: player.name, finalRating, finalSection
    });
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO players (id, tournament_id, name, uscf_id, fide_id, rating, section, status, school, email, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [playerId, tournamentId, player.name, player.uscf_id, player.fide_id, finalRating, finalSection, 'active', player.school, player.email, source],
        function(err) {
          if (err) {
            console.error('Database insert error:', err);
            reject(err);
          } else {
            console.log('Player inserted successfully');
            resolve();
          }
        }
      );
    });

    // Send webhook notification if webhook URL is provided
    if (req.body.webhook_url) {
      try {
        const webhookData = {
          event: 'player_registered',
          tournament_id: tournamentId,
          tournament_name: tournament.name,
          player: {
            id: playerId,
            name: player.name,
            uscf_id: player.uscf_id,
            rating: finalRating,
            section: finalSection,
            school: player.school,
            email: player.email
          },
          timestamp: new Date().toISOString()
        };

        // Send webhook asynchronously (don't wait for response)
        fetch(req.body.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData)
        }).catch(err => console.error('Webhook failed:', err));
      } catch (error) {
        console.error('Error sending webhook:', error);
      }
    }

    res.json({
      success: true,
      message: 'Player registered successfully',
      data: {
        player_id: playerId,
        tournament_id: tournamentId,
        tournament_name: tournament.name,
        player: {
          name: player.name,
          uscf_id: player.uscf_id,
          rating: finalRating,
          section: finalSection,
          school: player.school,
          email: player.email
        },
        rating_lookup: ratingLookupResult,
        auto_assigned_section: finalSection && !player.section
      }
    });

  } catch (error) {
    console.error('Error in player registration:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to register player',
      details: error.message
    });
  }
});

// Get tournament registration info and links
router.get('/tournament/:tournamentId/registration-info', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { api_key } = req.query;

    // Validate API key
    if (!api_key) {
      return res.status(401).json({
        success: false,
        error: 'API key is required'
      });
    }

    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : ['demo-key-123'];
    if (!validApiKeys.includes(api_key)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Get tournament info
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    
    res.json({
      success: true,
      data: {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          format: tournament.format,
          rounds: tournament.rounds,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          city: tournament.city,
          state: tournament.state,
          location: tournament.location
        },
        api_endpoints: {
          register_player: `${baseUrl}/api/players/register/${tournamentId}`,
          import_players: `${baseUrl}/api/players/api-import/${tournamentId}`,
          get_players: `${baseUrl}/api/players/tournament/${tournamentId}`
        },
        registration_form_url: `${baseUrl}/register/${tournamentId}`,
        public_tournament_url: `${baseUrl}/public/tournaments/${tournamentId}`,
        api_key: api_key,
        webhook_support: true,
        supported_fields: [
          'name', 'uscf_id', 'fide_id', 'rating', 'section', 'school', 'grade',
          'email', 'phone', 'state', 'city', 'notes', 'parent_name', 'parent_email',
          'parent_phone', 'emergency_contact', 'emergency_phone', 'tshirt_size',
          'dietary_restrictions', 'special_needs', 'expiration_date', 'intentional_bye_rounds',
          'uscf_regular_rating_date', 'uscf_name', 'created_at', 'source'
        ]
      }
    });

  } catch (error) {
    console.error('Error getting registration info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get registration info'
    });
  }
});

// Delete duplicates endpoint
router.post('/delete-duplicates/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { criteria = 'name' } = req.body; // 'name', 'uscf_id', or 'both'
    
    console.log(`Deleting duplicates for tournament ${tournamentId} using criteria: ${criteria}`);
    
    // First, find all players in the tournament
    const players = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? ORDER BY created_at ASC',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    if (!players || players.length === 0) {
      return res.json({
        success: true,
        message: 'No players found in tournament',
        deletedCount: 0,
        duplicates: []
      });
    }
    
    // Group players by the specified criteria
    const groups = new Map();
    const duplicates = [];
    
    for (const player of players) {
      let key;
      
      if (criteria === 'name') {
        key = player.name.toLowerCase().trim();
      } else if (criteria === 'uscf_id') {
        key = player.uscf_id || 'no_uscf_id';
      } else if (criteria === 'both') {
        key = `${player.name.toLowerCase().trim()}_${player.uscf_id || 'no_uscf_id'}`;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid criteria. Must be "name", "uscf_id", or "both"'
        });
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(player);
    }
    
    // Find groups with duplicates (more than 1 player)
    for (const [key, group] of groups) {
      if (group.length > 1) {
        // Keep the first player (oldest by created_at), mark others as duplicates
        const [keep, ...dups] = group;
        duplicates.push({
          key,
          keep: keep,
          duplicates: dups
        });
      }
    }
    
    if (duplicates.length === 0) {
      return res.json({
        success: true,
        message: 'No duplicates found',
        deletedCount: 0,
        duplicates: []
      });
    }
    
    // Delete the duplicate players
    let deletedCount = 0;
    const deletedPlayers = [];
    
    for (const duplicateGroup of duplicates) {
      for (const duplicate of duplicateGroup.duplicates) {
        try {
          // Delete the player
          await new Promise((resolve, reject) => {
            db.run('DELETE FROM players WHERE id = ?', [duplicate.id], function(err) {
              if (err) reject(err);
              else resolve();
            });
          });
          
          // Also delete any related data
          await new Promise((resolve, reject) => {
            db.run('DELETE FROM player_inactive_rounds WHERE player_id = ?', [duplicate.id], function(err) {
              if (err) reject(err);
              else resolve();
            });
          });
          
          deletedCount++;
          deletedPlayers.push({
            id: duplicate.id,
            name: duplicate.name,
            uscf_id: duplicate.uscf_id,
            reason: `Duplicate of ${duplicateGroup.keep.name}`
          });
          
        } catch (deleteErr) {
          console.error(`Error deleting duplicate player ${duplicate.id}:`, deleteErr);
        }
      }
    }
    
    console.log(`Successfully deleted ${deletedCount} duplicate players`);
    
    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} duplicate players`,
      deletedCount,
      duplicates: duplicates.map(d => ({
        key: d.key,
        kept: {
          id: d.keep.id,
          name: d.keep.name,
          uscf_id: d.keep.uscf_id
        },
        deleted: d.duplicates.map(dup => ({
          id: dup.id,
          name: dup.name,
          uscf_id: dup.uscf_id
        }))
      })),
      deletedPlayers
    });
    
  } catch (error) {
    console.error('Error deleting duplicates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete duplicates'
    });
  }
});

module.exports = router;