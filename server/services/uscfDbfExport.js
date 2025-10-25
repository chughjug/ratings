/**
 * USCF DBF Export Service - Full Compliance
 * Generates the three required DBF files for USCF tournament rating reports
 * Following the exact specification provided
 */

const { DBFFile } = require('dbffile');
const path = require('path');
const fs = require('fs').promises;

/**
 * Creates the Tournament Header DBF file (THEXPORT.DBF)
 * Exactly one record per specification
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
        { name: 'T_EVENT_ID', type: 'C', size: 9 },      // Unique USCF Tournament ID (Primary Key)
        { name: 'T_NAME', type: 'C', size: 60 },         // Full Title of the Tournament
        { name: 'T_START_DT', type: 'D', size: 8 },      // First Date of Play (YYYYMMDD)
        { name: 'T_END_DT', type: 'D', size: 8 },        // Last Date of Play (YYYYMMDD)
        { name: 'CTD_ID', type: 'C', size: 8 },          // USCF ID of the Chief Tournament Director
        { name: 'ATD_ID', type: 'C', size: 8 },          // USCF ID of the Affiliate submitting the report
        { name: 'T_LOCATION', type: 'C', size: 30 }      // City and State of event
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

      // Generate event ID (format: YYMMDD + sequence number)
      const generateEventId = (tournament) => {
        const startDate = new Date(tournament.start_date);
        const year = startDate.getFullYear().toString().slice(-2);
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');
        const sequence = '001'; // Could be made dynamic based on tournament count
        return `${year}${month}${day}${sequence}`;
      };

      // Format dates (convert to Date object for DBF)
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr);
      };

      // Add tournament record (exactly one record as per specification)
      const record = {
        T_EVENT_ID: generateEventId(tournament),
        T_NAME: (tournament.name || '').substring(0, 60),
        T_START_DT: formatDate(tournament.start_date),
        T_END_DT: formatDate(tournament.end_date),
        CTD_ID: (tournament.chief_td_uscf_id || '12484800').substring(0, 8),
        ATD_ID: (tournament.assistant_td_uscf_id || '').substring(0, 8),
        T_LOCATION: `${tournament.city || ''}, ${tournament.state || ''}`.substring(0, 30)
      };

      await dbfFile.appendRecords([record]);

      console.log(`✓ Created Tournament Header file: ${filePath}`);
      resolve({ success: true, filePath: filePath });

    } catch (error) {
      console.error('Error creating tournament header file:', error);
      reject(error);
    }
  });
}

/**
 * Creates the Section Header DBF file (TSEXPORT.DBF)
 * One record per section as per specification
 */
async function createSectionHeaderFile(db, tournamentId, exportPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Define DBF structure for Section Header (USCF TSEXPORT.DBF specification)
      const dbfStructure = [
        { name: 'S_EVENT_ID', type: 'C', size: 9 },       // Tournament ID (Foreign Key to THEXPORT)
        { name: 'S_SEC_NUM', type: 'C', size: 2 },        // Section number within the tournament (01, 02, etc.)
        { name: 'S_SEC_NAME', type: 'C', size: 10 },      // Abbreviated name of the section (e.g., OPEN, U1400)
        { name: 'S_K_FACTOR', type: 'C', size: 1 },       // USCF K-Factor applied to this section (Compliance Code)
        { name: 'S_R_SYSTEM', type: 'C', size: 1 },       // Rating System used (R=Regular, Q=Quick, etc.)
        { name: 'S_CTD_ID', type: 'C', size: 8 },         // Section Chief TD ID
        { name: 'S_ATD_ID', type: 'C', size: 8 },         // Section Affiliate ID
        { name: 'S_TRN_TYPE', type: 'C', size: 1 },       // Tournament Pairing Type (S=Swiss, R=Round Robin)
        { name: 'S_TOT_RNDS', type: 'N', size: 2, decimal: 0 }, // Total number of rounds played in the section
        { name: 'S_LST_PAIR', type: 'N', size: 4, decimal: 0 }, // Internal pairing number used
        { name: 'S_DTLREC01', type: 'N', size: 7, decimal: 0 }, // Count of TDEXPORT records for this section
        { name: 'S_OPERATOR', type: 'C', size: 2 },       // Operator/TMS Code (e.g., SS=Swiss Sys, WT=WinTD)
        { name: 'S_STATUS', type: 'C', size: 1 }          // Section processing status or flags
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
          existing.min_rating = section.min_rating;
          existing.max_rating = section.max_rating;
          existing.avg_rating = section.avg_rating;
        } else {
          // Add new section from actual players
          allSections.set(section.section_name, {
            section_name: section.section_name,
            player_count: section.player_count,
            min_rating: section.min_rating,
            max_rating: section.max_rating,
            avg_rating: section.avg_rating,
            description: '',
            defined: false
          });
        }
      });

      const finalSections = Array.from(allSections.values());

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
        
        // Determine K-Factor and Rating System based on section characteristics
        let kFactor = 'R'; // Regular
        let ratingSystem = 'R'; // Regular
        
        if (section.section_name.toLowerCase().includes('scholastic') || 
            section.section_name.toLowerCase().includes('junior')) {
          kFactor = 'S'; // Scholastic/Increased
        }
        
        if (section.section_name.toLowerCase().includes('quick')) {
          ratingSystem = 'Q'; // Quick
        } else if (section.section_name.toLowerCase().includes('blitz')) {
          ratingSystem = 'B'; // Blitz
        }

        const record = {
          S_EVENT_ID: generateEventId(tournament),
          S_SEC_NUM: ` ${index + 1}`.slice(-2), // Space-padded section number
          S_SEC_NAME: section.section_name.substring(0, 10),
          S_K_FACTOR: kFactor,
          S_R_SYSTEM: ratingSystem,
          S_CTD_ID: (tournament.chief_td_uscf_id || '12484800').substring(0, 8),
          S_ATD_ID: (tournament.assistant_td_uscf_id || '').substring(0, 8),
          S_TRN_TYPE: 'S', // Swiss system
          S_TOT_RNDS: tournamentRounds ? tournamentRounds.rounds : 0,
          S_LST_PAIR: section.player_count,
          S_DTLREC01: section.player_count,
          S_OPERATOR: 'XX', // Software-specific operator code
          S_STATUS: '#'
        };

        await dbfFile.appendRecords([record]);
      }

      console.log(`✓ Created Section Header file: ${filePath}`);
      resolve({ success: true, filePath: filePath });

    } catch (error) {
      console.error('Error creating section header file:', error);
      reject(error);
    }
  });
}

/**
 * Creates the Player Detail DBF file (TDEXPORT.DBF)
 * Handles 1-10 rounds in single record, 11-20 rounds in two records per player
 */
async function createPlayerDetailFile(db, tournamentId, exportPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Get tournament rounds to determine structure
      const tournament = await new Promise((resolve, reject) => {
        db.get('SELECT rounds FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      const totalRounds = tournament ? tournament.rounds : 10;
      const needsSecondRecord = totalRounds > 10;

      // Define base DBF structure for Player Detail (USCF TDEXPORT.DBF specification)
      const baseStructure = [
        { name: 'D_EVENT_ID', type: 'C', size: 9 },       // Links to tournament ID
        { name: 'D_SEC_NUM', type: 'C', size: 2 },        // Links to section number
        { name: 'D_USCF_ID', type: 'C', size: 8 },        // USCF Member ID (Part of Compound Key)
        { name: 'D_LASTNAME', type: 'C', size: 25 },      // Player Last Name
        { name: 'D_FIRSTNAME', type: 'C', size: 15 },     // Player First Name
        { name: 'D_STATE', type: 'C', size: 2 },          // Player State of Residence
        { name: 'D_RATING', type: 'N', size: 4, decimal: 0 }, // Player Pre-Tournament USCF Regular Rating
        { name: 'D_QRTG', type: 'N', size: 4, decimal: 0 },   // Player Pre-Tournament USCF Quick Rating
        { name: 'D_PROV', type: 'C', size: 1 },           // Provisional Status Flag (Y/N)
        { name: 'D_STATUS', type: 'C', size: 1 },         // Final Player Status Flag
        { name: 'D_SCORE', type: 'N', size: 4, decimal: 1 } // Final Score in the Section
      ];

      // Add round data fields (RND01 through RND10)
      const roundFields = [];
      for (let round = 1; round <= 10; round++) {
        const roundNum = round.toString().padStart(2, '0');
        roundFields.push(
          { name: `RND${roundNum}_COL`, type: 'C', size: 1 },  // Color played (W=White, B=Black)
          { name: `RND${roundNum}_RES`, type: 'C', size: 1 },  // Result code (W=Win, L=Loss, D=Draw, etc.)
          { name: `RND${roundNum}_OPP`, type: 'C', size: 8 }   // Opponent's USCF ID
        );
      }

      const dbfStructure = [...baseStructure, ...roundFields];

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

      // Create DBF file
      const filePath = path.join(exportPath, 'TDEXPORT.DBF');
      
      // Remove existing file if it exists
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File doesn't exist, which is fine
      }
      
      const dbfFile = await DBFFile.create(filePath, dbfStructure);

      // Generate event ID (same as tournament header)
      const generateEventId = (tournament) => {
        const startDate = new Date(tournament.start_date);
        const year = startDate.getFullYear().toString().slice(-2);
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');
        const sequence = '001';
        return `${year}${month}${day}${sequence}`;
      };

      // Get all pairings for this tournament
      const allPairings = await new Promise((resolve, reject) => {
        db.all(`
          SELECT 
            white_player_id,
            black_player_id,
            result,
            round,
            section,
            board
          FROM pairings 
          WHERE tournament_id = ?
          ORDER BY round, board
        `, [tournamentId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Group players by section
      const playersBySection = {};
      players.forEach(player => {
        const section = player.section || 'Open';
        if (!playersBySection[section]) {
          playersBySection[section] = [];
        }
        playersBySection[section].push(player);
      });

      let sectionNumber = 1;
      const records = [];

      // Process each section
      for (const [sectionName, sectionPlayers] of Object.entries(playersBySection)) {
        for (const player of sectionPlayers) {
          // Get player's pairings
          const playerPairings = allPairings.filter(pairing => 
            pairing.white_player_id === player.id || pairing.black_player_id === player.id
          );

          // Create base record
          const baseRecord = {
            D_EVENT_ID: generateEventId(tournament),
            D_SEC_NUM: ` ${sectionNumber}`.slice(-2),
            D_USCF_ID: (player.uscf_id || '').substring(0, 8),
            D_LASTNAME: (player.name.split(' ').slice(-1)[0] || '').substring(0, 25),
            D_FIRSTNAME: (player.name.split(' ').slice(0, -1).join(' ') || '').substring(0, 15),
            D_STATE: 'XX', // Default state
            D_RATING: player.rating || 0,
            D_QRTG: player.rating || 0, // Use same as regular rating for now
            D_PROV: 'N', // Not provisional
            D_STATUS: 'P', // Playing
            D_SCORE: player.total_score || 0
          };

          // Add round data for rounds 1-10
          for (let round = 1; round <= 10; round++) {
            const roundNum = round.toString().padStart(2, '0');
            const pairing = playerPairings.find(p => p.round === round);
            
            if (pairing) {
              const isWhite = pairing.white_player_id === player.id;
              const opponentId = isWhite ? pairing.black_player_id : pairing.white_player_id;
              const opponent = players.find(p => p.id === opponentId);
              
              baseRecord[`RND${roundNum}_COL`] = isWhite ? 'W' : 'B';
              
              // Map result codes
              let resultCode = 'L'; // Default to loss
              if (pairing.result === '1-0') {
                resultCode = isWhite ? 'W' : 'L';
              } else if (pairing.result === '0-1') {
                resultCode = isWhite ? 'L' : 'W';
              } else if (pairing.result === '1/2-1/2') {
                resultCode = 'D';
              } else if (pairing.result === '1-0F') {
                resultCode = isWhite ? 'W' : 'L';
              } else if (pairing.result === '0-1F') {
                resultCode = isWhite ? 'L' : 'W';
              }
              
              baseRecord[`RND${roundNum}_RES`] = resultCode;
              baseRecord[`RND${roundNum}_OPP`] = (opponent?.uscf_id || '').substring(0, 8);
            } else {
              baseRecord[`RND${roundNum}_COL`] = '';
              baseRecord[`RND${roundNum}_RES`] = '';
              baseRecord[`RND${roundNum}_OPP`] = '';
            }
          }

          records.push(baseRecord);

          // If tournament has more than 10 rounds, create second record for rounds 11-20
          if (needsSecondRecord) {
            const secondRecord = { ...baseRecord };
            
            // Add round data for rounds 11-20
            for (let round = 11; round <= Math.min(20, totalRounds); round++) {
              const roundNum = (round - 10).toString().padStart(2, '0');
              const pairing = playerPairings.find(p => p.round === round);
              
              if (pairing) {
                const isWhite = pairing.white_player_id === player.id;
                const opponentId = isWhite ? pairing.black_player_id : pairing.white_player_id;
                const opponent = players.find(p => p.id === opponentId);
                
                secondRecord[`RND${roundNum}_COL`] = isWhite ? 'W' : 'B';
                
                // Map result codes
                let resultCode = 'L';
                if (pairing.result === '1-0') {
                  resultCode = isWhite ? 'W' : 'L';
                } else if (pairing.result === '0-1') {
                  resultCode = isWhite ? 'L' : 'W';
                } else if (pairing.result === '1/2-1/2') {
                  resultCode = 'D';
                } else if (pairing.result === '1-0F') {
                  resultCode = isWhite ? 'W' : 'L';
                } else if (pairing.result === '0-1F') {
                  resultCode = isWhite ? 'L' : 'W';
                }
                
                secondRecord[`RND${roundNum}_RES`] = resultCode;
                secondRecord[`RND${roundNum}_OPP`] = (opponent?.uscf_id || '').substring(0, 8);
              } else {
                secondRecord[`RND${roundNum}_COL`] = '';
                secondRecord[`RND${roundNum}_RES`] = '';
                secondRecord[`RND${roundNum}_OPP`] = '';
              }
            }
            
            records.push(secondRecord);
          }
        }
        sectionNumber++;
      }

      // Add all records to DBF file
      if (records.length > 0) {
        await dbfFile.appendRecords(records);
      }

      console.log(`✓ Created Player Detail file: ${filePath}`);
      resolve({ success: true, filePath: filePath });

    } catch (error) {
      console.error('Error creating player detail file:', error);
      reject(error);
    }
  });
}

/**
 * Export all three USCF DBF files
 */
async function exportTournamentUSCF(db, tournamentId, exportPath) {
  try {
    console.log(`[USCFExport] Exporting tournament ${tournamentId} to USCF DBF format`);

    // Ensure export directory exists
    try {
      await fs.mkdir(exportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }

    // Create all three files
    const results = await Promise.all([
      createTournamentHeaderFile(db, tournamentId, exportPath),
      createSectionHeaderFile(db, tournamentId, exportPath),
      createPlayerDetailFile(db, tournamentId, exportPath)
    ]);

    const files = [
      { name: 'THEXPORT.DBF', path: results[0].filePath },
      { name: 'TSEXPORT.DBF', path: results[1].filePath },
      { name: 'TDEXPORT.DBF', path: results[2].filePath }
    ];

    console.log(`✓ Successfully exported all USCF DBF files for tournament ${tournamentId}`);

    return {
      success: true,
      files: files,
      exportPath: exportPath
    };

  } catch (error) {
    console.error('USCF DBF export error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to export USCF DBF files'
    };
  }
}

module.exports = {
  exportTournamentUSCF,
  createTournamentHeaderFile,
  createSectionHeaderFile,
  createPlayerDetailFile
};
