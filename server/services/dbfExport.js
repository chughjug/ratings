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

      // Define DBF structure for Tournament Header (USCF THEXPORT.DBF specification)
      const dbfStructure = [
        { name: 'H_EVENT_ID', type: 'C', size: 9 },      // Unique event ID
        { name: 'H_NAME', type: 'C', size: 35 },         // Tournament name
        { name: 'H_TOT_SECT', type: 'N', size: 2, decimal: 0 }, // Total number of sections
        { name: 'H_BEG_DATE', type: 'D', size: 8 },      // Start date
        { name: 'H_END_DATE', type: 'D', size: 8 },      // End date
        { name: 'H_RCV_DATE', type: 'D', size: 8 },      // Date received by USCF
        { name: 'H_ENT_DATE', type: 'D', size: 8 },      // Date entered into USCF system
        { name: 'H_AFF_ID', type: 'C', size: 8 },        // Affiliate ID
        { name: 'H_CITY', type: 'C', size: 21 },         // City
        { name: 'H_STATE', type: 'C', size: 2 },         // State abbreviation
        { name: 'H_ZIPCODE', type: 'C', size: 10 },      // ZIP code
        { name: 'H_COUNTRY', type: 'C', size: 21 },      // Country
        { name: 'H_SENDCROS', type: 'C', size: 1 },      // Send crosstable flag (Y/N)
        { name: 'H_SCHOLAST', type: 'C', size: 1 },      // Scholastic tournament flag (Y/N)
        { name: 'H_SECREC01', type: 'N', size: 7, decimal: 0 } // Internal record number
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

      // Generate event ID (format: YYMMDD + sequence number)
      const generateEventId = (tournament) => {
        const startDate = new Date(tournament.start_date);
        const year = startDate.getFullYear().toString().slice(-2);
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');
        const sequence = '001'; // Could be made dynamic based on tournament count
        return `${year}${month}${day}${sequence}`;
      };

      // Add tournament record
      const record = {
        H_EVENT_ID: generateEventId(tournament),
        H_NAME: (tournament.name || '').substring(0, 35),
        H_TOT_SECT: sectionCount,
        H_BEG_DATE: formatDate(tournament.start_date),
        H_END_DATE: formatDate(tournament.end_date),
        H_RCV_DATE: null, // Blank - filled by USCF
        H_ENT_DATE: null, // Blank - filled by USCF
        H_AFF_ID: (tournament.affiliate_id || 'A6000220').substring(0, 8),
        H_CITY: (tournament.city || '').substring(0, 21),
        H_STATE: (tournament.state || '').substring(0, 2),
        H_ZIPCODE: (tournament.zipcode || '').substring(0, 10),
        H_COUNTRY: 'USA',
        H_SENDCROS: tournament.send_crosstable ? 'Y' : 'N',
        H_SCHOLAST: tournament.scholastic ? 'Y' : 'N',
        H_SECREC01: 1
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
      // Define DBF structure for Section Header (USCF TSEXPORT.DBF specification)
      const dbfStructure = [
        { name: 'S_EVENT_ID', type: 'C', size: 9 },       // Links to tournament ID
        { name: 'S_SEC_NUM', type: 'C', size: 2 },        // Section number (space-padded)
        { name: 'S_SEC_NAME', type: 'C', size: 10 },      // Section name
        { name: 'S_K_FACTOR', type: 'C', size: 1 },       // K-factor for rating calculations
        { name: 'S_R_SYSTEM', type: 'C', size: 1 },       // Rating system (R=regular, Q=quick)
        { name: 'S_CTD_ID', type: 'C', size: 8 },         // Chief TD's USCF ID
        { name: 'S_ATD_ID', type: 'C', size: 8 },         // Assistant TD's USCF ID
        { name: 'S_TRN_TYPE', type: 'C', size: 1 },       // Tournament type (S=Swiss, R=round-robin)
        { name: 'S_TOT_RNDS', type: 'N', size: 2, decimal: 0 }, // Total rounds
        { name: 'S_LST_PAIR', type: 'N', size: 4, decimal: 0 }, // Last paired player number
        { name: 'S_DTLREC01', type: 'N', size: 7, decimal: 0 }, // Detail record count
        { name: 'S_OPERATOR', type: 'C', size: 2 },       // Operator code
        { name: 'S_STATUS', type: 'C', size: 1 }          // Section status
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
      const tournamentRounds = await new Promise((resolve, reject) => {
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

      // Get tournament data for event ID and TD info
      const tournament = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // Generate event ID (same as tournament header)
      const generateEventId = (tournament) => {
        const startDate = new Date(tournament.start_date);
        const year = startDate.getFullYear().toString().slice(-2);
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');
        const sequence = '001';
        return `${year}${month}${day}${sequence}`;
      };

      // Add section records
      for (let index = 0; index < finalSections.length; index++) {
        const section = finalSections[index];
        const record = {
          S_EVENT_ID: generateEventId(tournament),
          S_SEC_NUM: ` ${index + 1}`.slice(-2), // Space-padded section number
          S_SEC_NAME: section.section_name.substring(0, 10),
          S_K_FACTOR: 'F', // Full K-factor
          S_R_SYSTEM: 'R', // Regular rating system
          S_CTD_ID: (tournament.chief_td_uscf_id || '12484800').substring(0, 8),
          S_ATD_ID: (tournament.assistant_td_uscf_id || '').substring(0, 8),
          S_TRN_TYPE: 'S', // Swiss system
          S_TOT_RNDS: tournamentRounds ? tournamentRounds.rounds : 0,
          S_LST_PAIR: section.player_count,
          S_DTLREC01: section.player_count,
          S_OPERATOR: 'XX', // Software-specific operator code
          S_STATUS: '#' // Section status
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
      // Define DBF structure for Player Detail (USCF TDEXPORT.DBF specification)
      const dbfStructure = [
        { name: 'D_EVENT_ID', type: 'C', size: 9 },       // Links to tournament ID
        { name: 'D_SEC_NUM', type: 'C', size: 2 },        // Links to section number
        { name: 'D_PAIR_NUM', type: 'C', size: 4 },       // Player's pairing number (space-padded)
        { name: 'D_REC_SEQ', type: 'C', size: 1 },        // Record sequence (usually "1")
        { name: 'D_MEM_ID', type: 'C', size: 8 },         // Player's USCF ID
        { name: 'D_RND01', type: 'C', size: 5 },          // Round 1 result
        { name: 'D_RND02', type: 'C', size: 5 },          // Round 2 result
        { name: 'D_RND03', type: 'C', size: 5 },          // Round 3 result
        { name: 'D_RND04', type: 'C', size: 5 },          // Round 4 result
        { name: 'D_RND05', type: 'C', size: 5 },          // Round 5 result
        { name: 'D_RND06', type: 'C', size: 5 },          // Round 6 result
        { name: 'D_RND07', type: 'C', size: 5 },          // Round 7 result
        { name: 'D_RND08', type: 'C', size: 5 },          // Round 8 result
        { name: 'D_RND09', type: 'C', size: 5 },          // Round 9 result
        { name: 'D_RND10', type: 'C', size: 5 }           // Round 10 result
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

      // Generate event ID (same as tournament header)
      const generateEventId = (tournament) => {
        const startDate = new Date(tournament.start_date);
        const year = startDate.getFullYear().toString().slice(-2);
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');
        const sequence = '001';
        return `${year}${month}${day}${sequence}`;
      };

      // Encode result in USCF format: W  12, L   5, D  3, B   , H   , 0   
      const encodeResult = (result, opponentPairNum) => {
        if (!result) return '    0';
        
        const opponent = opponentPairNum ? opponentPairNum.toString().padStart(3, ' ') : '   ';
        
        switch (result.toUpperCase()) {
          case 'W':
          case 'WIN':
          case '1':
          case '1.0':
            return `W  ${opponent}`;
          case 'L':
          case 'LOSS':
          case '0':
          case '0.0':
            return `L  ${opponent}`;
          case 'D':
          case 'DRAW':
          case '0.5':
          case '1/2':
            return `D  ${opponent}`;
          case 'B':
          case 'BYE':
            return 'B   ';
          case 'H':
          case 'HALF_BYE':
            return 'H   ';
          case 'F':
          case 'FORFEIT':
            return '0   ';
          default:
            return '    0';
        }
      };

      // Create pairing number mapping for players
      const pairingMap = new Map();
      players.forEach((player, index) => {
        pairingMap.set(player.id, index + 1);
      });

      // Get results for each player by round with opponent information
      const playerResults = {};
      for (const player of players) {
        const results = await new Promise((resolve, reject) => {
          db.all(`
            SELECT r.round, r.result, r.opponent_id
            FROM results r
            WHERE r.player_id = ?
            ORDER BY r.round
          `, [player.id], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        playerResults[player.id] = {};
        results.forEach(result => {
          const opponentPairNum = result.opponent_id ? pairingMap.get(result.opponent_id) : null;
          playerResults[player.id][result.round] = {
            result: result.result,
            opponentPairNum: opponentPairNum
          };
        });
      }

      // Group players by section to get section numbers
      const sectionMap = new Map();
      let sectionIndex = 1;
      players.forEach(player => {
        const sectionName = player.section || 'Open';
        if (!sectionMap.has(sectionName)) {
          sectionMap.set(sectionName, sectionIndex++);
        }
      });

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
        const sectionName = player.section || 'Open';
        const sectionNum = sectionMap.get(sectionName);
        const pairingNum = pairingMap.get(player.id);
        
        const record = {
          D_EVENT_ID: generateEventId(tournament),
          D_SEC_NUM: ` ${sectionNum}`.slice(-2), // Space-padded section number
          D_PAIR_NUM: `   ${pairingNum}`.slice(-4), // Space-padded pairing number
          D_REC_SEQ: '1', // Record sequence (usually 1)
          D_MEM_ID: (player.uscf_id || '').substring(0, 8)
        };

        // Add round results (up to 10 rounds) in USCF format
        for (let round = 1; round <= Math.min(maxRounds, 10); round++) {
          const roundKey = `D_RND${round.toString().padStart(2, '0')}`;
          const roundData = playerResults[player.id][round];
          
          if (roundData) {
            record[roundKey] = encodeResult(roundData.result, roundData.opponentPairNum);
          } else {
            record[roundKey] = '    0'; // No result
          }
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
