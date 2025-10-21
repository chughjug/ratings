const { DBFFile } = require('dbffile');
const path = require('path');
const fs = require('fs').promises;


/**
 * USCF DBF Export Service
 * Generates the three required DBF files for USCF tournament rating reports:
 * 1. THEXPORT.DBF - Tournament Header
 * 2. TSEXPORT.DBF - Section Header  
 * 3. TDEXPORT.DBF - Player Detail
 */

/**
 * Creates the Tournament Header DBF file (THEXPORT.DBF)
 * Contains general tournament information
 */
async function createTournamentHeaderFile(db, tournamentId, exportPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get tournament data
      const tournament = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Define DBF structure for Tournament Header
      const dbfStructure = [
        { name: 'TOURNAME', type: 'C', size: 50 },      // Tournament name
        { name: 'STARTDATE', type: 'D', size: 8 },                     // Start date (YYYYMMDD)
        { name: 'ENDDATE', type: 'D', size: 8 },                       // End date (YYYYMMDD)
        { name: 'ROUNDS', type: 'N', size: 2, decimal: 0 },    // Number of rounds
        { name: 'TIMECTRL', type: 'C', size: 20 },         // Time control
        { name: 'FORMAT', type: 'C', size: 20 },               // Tournament format
        { name: 'TDNAME', type: 'C', size: 50 },        // TD name
        { name: 'TDID', type: 'C', size: 10 },          // TD USCF ID
        { name: 'CHIEFARBITER', type: 'C', size: 50 },  // Chief Arbiter name
        { name: 'CHIEFARBITERID', type: 'C', size: 10 }, // Chief Arbiter FIDE ID
        { name: 'CHIEFORGANIZER', type: 'C', size: 50 }, // Chief Organizer name
        { name: 'CHIEFORGANIZERID', type: 'C', size: 10 }, // Chief Organizer FIDE ID
        { name: 'SITENAME', type: 'C', size: 50 },            // Site/Venue name
        { name: 'CITY', type: 'C', size: 30 },                 // City
        { name: 'STATE', type: 'C', size: 2 },                 // State
        { name: 'ZIPCODE', type: 'C', size: 10 },             // ZIP code
        { name: 'COUNTRY', type: 'C', size: 3 },               // Country code
        { name: 'TOTPLAYER', type: 'N', size: 4, decimal: 0 }, // Total players
        { name: 'EXPECTEDPLAYERS', type: 'N', size: 4, decimal: 0 }, // Expected players
        { name: 'SECTIONS', type: 'N', size: 2, decimal: 0 },  // Number of sections
        { name: 'USCFRATED', type: 'L', size: 1 },             // USCF Rated tournament
        { name: 'FIDERATED', type: 'L', size: 1 },             // FIDE Rated tournament
        { name: 'WEBSITE', type: 'C', size: 100 },             // Tournament website
        { name: 'TOURNID', type: 'C', size: 20 }         // Tournament ID
      ];

      // Create DBF file
      const filePath = path.join(exportPath, 'THEXPORT.DBF');
      
      // Remove existing file if it exists
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File doesn't exist, which is fine
      }
      
      const dbfFile = await DBFFile.create(filePath, dbfStructure);

      // Get player count and sections
      const playerCount = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM players WHERE tournament_id = ? AND status = "active"',
          [tournamentId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          }
        );
      });

      const sectionCount = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(DISTINCT section) as count FROM players WHERE tournament_id = ? AND status = "active"',
          [tournamentId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.count || 1); // Default to 1 if no sections
          }
        );
      });

      // Format dates (convert to Date object for DBF)
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr);
      };

      // Add tournament record
      const record = {
        TOURNAME: tournament.name || '',
        STARTDATE: formatDate(tournament.start_date),
        ENDDATE: formatDate(tournament.end_date),
        ROUNDS: tournament.rounds || 0,
        TIMECTRL: tournament.time_control || '',
        FORMAT: tournament.format || '',
        TDNAME: tournament.chief_td_name || '',
        TDID: tournament.chief_td_uscf_id || '',
        CHIEFARBITER: tournament.chief_arbiter_name || '',
        CHIEFARBITERID: tournament.chief_arbiter_fide_id || '',
        CHIEFORGANIZER: tournament.chief_organizer_name || '',
        CHIEFORGANIZERID: tournament.chief_organizer_fide_id || '',
        SITENAME: tournament.location || '',
        CITY: tournament.city || '',
        STATE: tournament.state || '',
        ZIPCODE: '',
        COUNTRY: 'USA',
        TOTPLAYER: playerCount,
        EXPECTEDPLAYERS: tournament.expected_players || 0,
        SECTIONS: sectionCount,
        USCFRATED: tournament.uscf_rated ? 'T' : 'F',
        FIDERATED: tournament.fide_rated ? 'T' : 'F',
        WEBSITE: tournament.website || '',
        TOURNID: tournament.id
      };

      await dbfFile.appendRecords([record]);

      console.log(`✓ Created Tournament Header file: ${filePath}`);
      resolve(filePath);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Creates the Section Header DBF file (TSEXPORT.DBF)
 * Contains information about each section in the tournament
 */
async function createSectionHeaderFile(db, tournamentId, exportPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Define DBF structure for Section Header
      const dbfStructure = [
        { name: 'SECNAME', type: 'C', size: 30 },         // Section name
        { name: 'SECTYPE', type: 'C', size: 20 },         // Section type
        { name: 'PLAYERS', type: 'N', size: 3, decimal: 0 },   // Number of players
        { name: 'ROUNDS', type: 'N', size: 2, decimal: 0 },    // Rounds in section
        { name: 'MINRATING', type: 'N', size: 4, decimal: 0 }, // Minimum rating
        { name: 'MAXRATING', type: 'N', size: 4, decimal: 0 }, // Maximum rating
        { name: 'AVGRATING', type: 'N', size: 4, decimal: 0 }, // Average rating
        { name: 'PRIZEFUND', type: 'N', size: 8, decimal: 2 }, // Prize fund
        { name: 'ENTRYFEE', type: 'N', size: 6, decimal: 2 },  // Entry fee
        { name: 'SECID', type: 'C', size: 10 }            // Section identifier
      ];

      // Get tournament settings to check for defined sections
      const tournamentSettings = await new Promise((resolve, reject) => {
        db.get('SELECT settings FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.settings : null);
        });
      });

      let definedSections = [];
      if (tournamentSettings) {
        try {
          const settings = JSON.parse(tournamentSettings);
          definedSections = settings.sections || [];
        } catch (error) {
          console.error('Error parsing tournament settings:', error);
        }
      }

      // Get sections data from actual players
      const sections = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            COALESCE(section, 'Open') as section_name,
            COUNT(*) as player_count,
            MIN(rating) as min_rating,
            MAX(rating) as max_rating,
            ROUND(AVG(rating)) as avg_rating
          FROM players 
          WHERE tournament_id = ? AND status = 'active'
          GROUP BY COALESCE(section, 'Open')
          ORDER BY section_name
        `, [tournamentId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Merge defined sections with actual player sections
      const allSections = new Map();
      
      // Add defined sections first
      definedSections.forEach((section, index) => {
        allSections.set(section.name, {
          section_name: section.name,
          player_count: 0,
          min_rating: section.min_rating || 0,
          max_rating: section.max_rating || 0,
          avg_rating: 0,
          description: section.description || '',
          defined: true
        });
      });

      // Add actual player sections and update counts
      sections.forEach(section => {
        if (allSections.has(section.section_name)) {
          // Update existing defined section with actual data
          const existing = allSections.get(section.section_name);
          existing.player_count = section.player_count;
          existing.min_rating = section.min_rating || existing.min_rating;
          existing.max_rating = section.max_rating || existing.max_rating;
          existing.avg_rating = section.avg_rating || 0;
        } else {
          // Add new section from actual players
          allSections.set(section.section_name, {
            ...section,
            defined: false
          });
        }
      });

      const finalSections = Array.from(allSections.values());

      if (finalSections.length === 0) {
        // Create default "Open" section if no sections exist
        finalSections.push({
          section_name: 'Open',
          player_count: 0,
          min_rating: 0,
          max_rating: 0,
          avg_rating: 0,
          defined: false
        });
      }

      // Get tournament rounds
      const tournament = await new Promise((resolve, reject) => {
        db.get('SELECT rounds FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Create DBF file
      const filePath = path.join(exportPath, 'TSEXPORT.DBF');
      
      // Remove existing file if it exists
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File doesn't exist, which is fine
      }
      
      const dbfFile = await DBFFile.create(filePath, dbfStructure);

      // Add section records
      for (let index = 0; index < finalSections.length; index++) {
        const section = finalSections[index];
        const record = {
          SECNAME: section.section_name,
          SECTYPE: 'Swiss', // Default to Swiss system
          PLAYERS: section.player_count,
          ROUNDS: tournament ? tournament.rounds : 0,
          MINRATING: section.min_rating || 0,
          MAXRATING: section.max_rating || 0,
          AVGRATING: section.avg_rating || 0,
          PRIZEFUND: 0, // TODO: Add prize fund info
          ENTRYFEE: 0,  // TODO: Add entry fee info
          SECID: `SEC${index + 1}`
        };
        await dbfFile.appendRecords([record]);
      }

      console.log(`✓ Created Section Header file: ${filePath}`);
      resolve(filePath);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Creates the Player Detail DBF file (TDEXPORT.DBF)
 * Contains detailed information about each player
 */
async function createPlayerDetailFile(db, tournamentId, exportPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Define DBF structure for Player Detail
      const dbfStructure = [
        { name: 'USCFID', type: 'C', size: 10 },              // USCF ID
        { name: 'NAME', type: 'C', size: 50 },                 // Player name
        { name: 'SECTION', type: 'C', size: 30 },              // Section name
        { name: 'RATING', type: 'N', size: 4, decimal: 0 },    // Rating
        { name: 'R1', type: 'C', size: 8 },               // Round 1 result
        { name: 'R2', type: 'C', size: 8 },               // Round 2 result
        { name: 'R3', type: 'C', size: 8 },               // Round 3 result
        { name: 'R4', type: 'C', size: 8 },               // Round 4 result
        { name: 'R5', type: 'C', size: 8 },               // Round 5 result
        { name: 'R6', type: 'C', size: 8 },               // Round 6 result
        { name: 'R7', type: 'C', size: 8 },               // Round 7 result
        { name: 'R8', type: 'C', size: 8 },               // Round 8 result
        { name: 'R9', type: 'C', size: 8 },               // Round 9 result
        { name: 'R10', type: 'C', size: 8 },              // Round 10 result
        { name: 'TOTALSCORE', type: 'N', size: 4, decimal: 1 }, // Total score
        { name: 'STATUS', type: 'C', size: 10 },        // Player status
        { name: 'MEMBEXP', type: 'D', size: 8 },                 // Membership expiration
        { name: 'FIDEID', type: 'C', size: 15 },              // FIDE ID (optional)
        { name: 'NOTES', type: 'C', size: 100 }               // Player notes
      ];

      // Get players and their results
      const players = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            p.id,
            p.name,
            p.uscf_id,
            p.fide_id,
            p.rating,
            COALESCE(p.section, 'Open') as section,
            p.status,
            p.expiration_date,
            p.notes,
            COALESCE(SUM(r.points), 0) as total_score
          FROM players p
          LEFT JOIN results r ON p.id = r.player_id
          WHERE p.tournament_id = ? AND p.status = 'active'
          GROUP BY p.id
          ORDER BY p.section, p.name
        `, [tournamentId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get tournament rounds to determine max rounds
      const tournament = await new Promise((resolve, reject) => {
        db.get('SELECT rounds FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      const maxRounds = tournament ? tournament.rounds : 10;

      // Get results for each player by round
      const playerResults = {};
      for (const player of players) {
        const results = await new Promise((resolve, reject) => {
          db.all(`
            SELECT round, result
            FROM results 
            WHERE player_id = ?
            ORDER BY round
          `, [player.id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        playerResults[player.id] = {};
        results.forEach(result => {
          playerResults[player.id][result.round] = result.result;
        });
      }

      // Create DBF file
      const filePath = path.join(exportPath, 'TDEXPORT.DBF');
      
      // Remove existing file if it exists
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File doesn't exist, which is fine
      }
      
      const dbfFile = await DBFFile.create(filePath, dbfStructure);

      // Add player records
      for (const player of players) {
        const record = {
          USCFID: player.uscf_id || '',
          NAME: player.name,
          SECTION: player.section,
          RATING: player.rating || 0,
          TOTALSCORE: player.total_score,
          STATUS: player.status,
          MEMBEXP: player.expiration_date ? formatDate(player.expiration_date) : new Date('1900-01-01'),
          FIDEID: player.fide_id || '',
          NOTES: player.notes || ''
        };

        // Add round results (up to 10 rounds)
        for (let round = 1; round <= Math.min(maxRounds, 10); round++) {
          const roundKey = `R${round}`;
          record[roundKey] = playerResults[player.id][round] || '';
        }

        await dbfFile.appendRecords([record]);
      }

      console.log(`✓ Created Player Detail file: ${filePath}`);
      resolve(filePath);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Main function to export all three DBF files for a tournament
 * @param {Object} db - Database connection
 * @param {string} tournamentId - Tournament ID
 * @param {string} exportPath - Directory path to save the files
 * @returns {Promise<Object>} Object with file paths and status
 */
async function exportTournamentDBF(db, tournamentId, exportPath = './exports') {
  try {
    // Ensure export directory exists
    await fs.mkdir(exportPath, { recursive: true });

    console.log(`Starting DBF export for tournament: ${tournamentId}`);

    // Create all three DBF files
    const tournamentHeaderPath = await createTournamentHeaderFile(db, tournamentId, exportPath);
    const sectionHeaderPath = await createSectionHeaderFile(db, tournamentId, exportPath);
    const playerDetailPath = await createPlayerDetailFile(db, tournamentId, exportPath);

    const result = {
      success: true,
      tournamentId,
      exportPath,
      files: {
        tournamentHeader: tournamentHeaderPath,
        sectionHeader: sectionHeaderPath,
        playerDetail: playerDetailPath
      },
      message: 'DBF export completed successfully'
    };

    console.log('✓ DBF export completed successfully');
    console.log(`  - Tournament Header: ${tournamentHeaderPath}`);
    console.log(`  - Section Header: ${sectionHeaderPath}`);
    console.log(`  - Player Detail: ${playerDetailPath}`);

    return result;
  } catch (error) {
    console.error('✗ DBF export failed:', error.message);
    return {
      success: false,
      tournamentId,
      error: error.message,
      message: 'DBF export failed'
    };
  }
}

module.exports = {
  exportTournamentDBF,
  createTournamentHeaderFile,
  createSectionHeaderFile,
  createPlayerDetailFile
};
