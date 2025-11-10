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
      // Get tournament metadata (rounds + dates for event id generation)
      const tournament = await new Promise((resolve, reject) => {
        db.get(
          'SELECT rounds, start_date, end_date FROM tournaments WHERE id = ?',
          [tournamentId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      // Determine total rounds (fallback to derived value later if missing)
      let totalRounds = tournament?.rounds || 0;

      // Define DBF structure for Player Detail (USCF TDEXPORT.DBF specification)
      const dbfStructure = [
        { name: 'D_EVENT_ID', type: 'C', size: 9 },
        { name: 'D_SEC_NUM', type: 'C', size: 2 },
        { name: 'D_PAIR_NUM', type: 'C', size: 4 },
        { name: 'D_REC_SEQ', type: 'C', size: 1 },
        { name: 'D_USCF_ID', type: 'C', size: 8 },
        { name: 'D_LASTNAME', type: 'C', size: 25 },
        { name: 'D_FIRSTNAME', type: 'C', size: 15 },
        { name: 'D_STATE', type: 'C', size: 2 },
        { name: 'D_RATING', type: 'N', size: 4, decimal: 0 },
        { name: 'D_QRTG', type: 'N', size: 4, decimal: 0 },
        { name: 'D_PROV', type: 'C', size: 1 },
        { name: 'D_STATUS', type: 'C', size: 1 },
        { name: 'D_SCORE', type: 'N', size: 4, decimal: 1 }
      ];

      for (let round = 1; round <= 10; round++) {
        dbfStructure.push({
          name: `D_RND${round.toString().padStart(2, '0')}`,
          type: 'C',
          size: 5
        });
      }

      // Fetch players that should be exported (active, inactive, withdrawn)
      const players = await new Promise((resolve, reject) => {
        db.all(
          `
            SELECT 
              p.id,
              p.name,
              p.uscf_id,
              p.rating,
              COALESCE(p.section, 'Open') AS section,
              COALESCE(p.status, 'active') AS status
            FROM players p
            WHERE p.tournament_id = ?
              AND p.status IN ('active', 'inactive', 'withdrawn')
            ORDER BY section, name
          `,
          [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Create DBF file
      const filePath = path.join(exportPath, 'TDEXPORT.DBF');

      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File didn't exist – that's fine
      }

      const dbfFile = await DBFFile.create(filePath, dbfStructure);

      // Generate event id (YYMMDD###)
      const generateEventId = (event) => {
        const baseDateValue = event?.start_date || event?.end_date || new Date().toISOString();
        let startDate = new Date(baseDateValue);
        if (Number.isNaN(startDate.getTime())) {
          startDate = new Date();
        }
        const year = startDate.getFullYear().toString().slice(-2);
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');
        const sequence = '001';
        return `${year}${month}${day}${sequence}`;
      };

      const eventId = generateEventId(tournament);

      if (players.length === 0) {
        // No players – nothing else to do
        console.log(`✓ Created Player Detail file with 0 players: ${filePath}`);
        resolve({ success: true, filePath });
        return;
      }

      // Organize players by section
      const playersBySection = new Map();
      players.forEach((player) => {
        const sectionName = player.section || 'Open';
        if (!playersBySection.has(sectionName)) {
          playersBySection.set(sectionName, []);
        }
        playersBySection.get(sectionName).push(player);
      });

      const sections = Array.from(playersBySection.keys()).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      );

      const sectionNumberMap = new Map();
      sections.forEach((sectionName, index) => {
        sectionNumberMap.set(sectionName, index + 1);
      });

      // Assign pairing numbers (global sequence by section order, seeded by rating desc then name)
      const pairingNumberMap = new Map();
      let nextPairNumber = 1;
      const normalizeName = (value) =>
        typeof value === 'string' && value.trim().length ? value : '';

      sections.forEach((sectionName) => {
        const sectionPlayers = playersBySection
          .get(sectionName)
          .slice()
          .sort((a, b) => {
            const ratingDiff = (b.rating || 0) - (a.rating || 0);
            if (ratingDiff !== 0) return ratingDiff;
            const nameA = normalizeName(a.name);
            const nameB = normalizeName(b.name);
            return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
          });

        sectionPlayers.forEach((player) => {
          pairingNumberMap.set(player.id, nextPairNumber++);
        });
      });

      // Prepare structures to store per-round info
      const roundsByPlayer = new Map();
      const totalPointsByPlayer = new Map();
      players.forEach((player) => {
        roundsByPlayer.set(player.id, new Map());
        totalPointsByPlayer.set(player.id, 0);
      });

      const playerExists = new Set(players.map((player) => player.id));

      // Fetch results data (faster than scanning pairings repeatedly)
      const results = await new Promise((resolve, reject) => {
        db.all(
          `
            SELECT 
              player_id,
              result,
              round,
              opponent_id,
              color,
              points,
              created_at,
              updated_at
            FROM results
            WHERE tournament_id = ?
            ORDER BY round
          `,
          [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      if (!totalRounds && results.length) {
        totalRounds = Math.max(...results.map((r) => r.round || 0));
      }
      if (!totalRounds) {
        totalRounds = 10; // default to 10 rounds if none recorded (USCF format minimum)
      }

      const needsSecondRecord = totalRounds > 10;

      const mapResultToCode = (rawResult, isWhite, opponentExists) => {
        const normalized = (rawResult || '').toString().trim().toUpperCase();
        const colorChar = isWhite ? 'W' : 'B';

        const win = () => ({ code: 'W', points: 1, color: colorChar });
        const loss = () => ({ code: 'L', points: 0, color: colorChar });
        const draw = () => ({ code: 'D', points: 0.5, color: colorChar });

        if (!normalized) {
          return { code: '', points: 0, color: colorChar };
        }

        // Handle explicit bye records
        if (
          normalized.startsWith('BYE') ||
          normalized === 'H' ||
          normalized === 'B'
        ) {
          if (
            normalized === 'BYE_UNPAIRED' ||
            normalized === 'BYE_FULL' ||
            normalized === 'B'
          ) {
            return { code: 'B', points: 1, color: ' ' };
          }
          return { code: 'H', points: 0.5, color: ' ' };
        }

        switch (normalized) {
          case '1-0':
          case 'W':
          case 'WHITE':
          case 'WHITE_WIN':
            return isWhite ? win() : loss();
          case '0-1':
          case 'B':
          case 'BLACK':
          case 'BLACK_WIN':
            return isWhite ? loss() : win();
          case '1/2-1/2':
          case '1/2-1/2F':
          case 'DRAW':
          case '1/2':
          case '0.5':
            return draw();
          case '1-0F':
          case 'W-F':
          case 'WIN FORFEIT':
            return isWhite ? win() : loss();
          case '0-1F':
          case 'B-F':
          case 'LOSS FORFEIT':
            return isWhite ? loss() : win();
          case '0-0':
          case '0F-0F':
          case 'DOUBLE FORFEIT':
            return { code: '0', points: 0, color: colorChar };
          default:
            // If opponent missing and result empty, treat as unplayed
            if (!opponentExists) {
              return { code: '0', points: 0, color: colorChar };
            }
            return { code: '', points: 0, color: colorChar };
        }
      };

      const encodeRoundField = (entry) => {
        if (!entry || !entry.code) {
          return '    0';
        }

        if (entry.code === 'B' || entry.code === 'H') {
          return `${entry.code}    `.slice(0, 5);
        }

        if (entry.code === '0') {
          return `${entry.code}    `.slice(0, 5);
        }

        const colorChar = entry.color || ' ';
        const opponent = entry.opponentPairNum
          ? entry.opponentPairNum.toString().padStart(3, ' ')
          : '   ';
        return `${entry.code}${colorChar}${opponent}`;
      };

      const applyRoundEntry = (playerId, round, entry) => {
        if (!roundsByPlayer.has(playerId)) {
          return;
        }

        const roundMap = roundsByPlayer.get(playerId);
        const existing = roundMap.get(round);
        if (existing && existing.points) {
          const currentPoints = totalPointsByPlayer.get(playerId) || 0;
          totalPointsByPlayer.set(playerId, currentPoints - existing.points);
        }

        roundMap.set(round, entry);

        const updatedPoints = totalPointsByPlayer.get(playerId) || 0;
        totalPointsByPlayer.set(playerId, updatedPoints + (entry.points || 0));
      };

      results.forEach((row) => {
        const playerId = row.player_id;
        if (!playerExists.has(playerId)) {
          return;
        }

        const roundNumber = row.round;
        const colorValue = typeof row.color === 'string' ? row.color.toLowerCase() : 'white';
        const isWhite = colorValue !== 'black';
        const opponentId = row.opponent_id || null;
        const opponentExists = Boolean(opponentId);
        const opponentPairNum = opponentId ? pairingNumberMap.get(opponentId) || null : null;

        const entry = mapResultToCode(row.result, isWhite, opponentExists);
        entry.color = entry.color || (isWhite ? 'W' : 'B');
        entry.opponentPairNum = opponentPairNum;

        const numericPoints =
          typeof row.points === 'number'
            ? row.points
            : row.points
            ? Number(row.points)
            : entry.points || 0;
        entry.points = Number.isFinite(numericPoints) ? numericPoints : entry.points || 0;

        applyRoundEntry(playerId, roundNumber, entry);
      });

      const records = [];

      sections.forEach((sectionName) => {
        const sectionPlayers = playersBySection
          .get(sectionName)
          .slice()
          .sort((a, b) => {
            const nameA = normalizeName(a.name);
            const nameB = normalizeName(b.name);
            return nameA.localeCompare(nameB, 'en', { sensitivity: 'base' });
          });
        const sectionNumber = sectionNumberMap.get(sectionName);

        sectionPlayers.forEach((player) => {
          const pairNumber = pairingNumberMap.get(player.id) || 0;
          const playerRounds = roundsByPlayer.get(player.id) || new Map();
          const totalPoints = Number(
            (totalPointsByPlayer.get(player.id) || 0).toFixed(1)
          );

          const fullName = (player.name || '').trim();
          let firstName = '';
          let lastName = '';
          if (fullName) {
            const parts = fullName.split(/\s+/);
            if (parts.length === 1) {
              lastName = parts[0];
            } else {
              lastName = parts.pop() || '';
              firstName = parts.join(' ');
            }
          }

          const statusMap = {
            active: 'P',
            inactive: 'I',
            withdrawn: 'W'
          };
          const statusCode = statusMap[player.status] || 'P';

          const baseRecord = {
            D_EVENT_ID: eventId,
            D_SEC_NUM: ` ${sectionNumber}`.slice(-2),
            D_PAIR_NUM: `   ${pairNumber}`.slice(-4),
            D_USCF_ID: (player.uscf_id || '').substring(0, 8),
            D_LASTNAME: lastName.substring(0, 25),
            D_FIRSTNAME: firstName.substring(0, 15),
            D_STATE: 'XX',
            D_RATING: player.rating || 0,
            D_QRTG: player.rating || 0,
            D_PROV: 'N',
            D_STATUS: statusCode
          };

          const buildRecord = (recordSeq, startRound, endRoundInclusive) => {
            const record = {
              ...baseRecord,
              D_REC_SEQ: recordSeq.toString(),
              D_SCORE: recordSeq === 1 ? totalPoints : null
            };

            for (let offset = 0; offset < 10; offset++) {
              const roundNumber = startRound + offset;
              const fieldName = `D_RND${(offset + 1)
                .toString()
                .padStart(2, '0')}`;
              if (roundNumber > endRoundInclusive) {
                record[fieldName] = '    0';
              } else {
                const entry = playerRounds.get(roundNumber);
                record[fieldName] = encodeRoundField(entry);
              }
            }

            records.push(record);
          };

          const firstRecordEnd = Math.min(10, totalRounds);
          buildRecord(1, 1, firstRecordEnd);

          if (needsSecondRecord) {
            const secondRecordEnd = Math.min(20, totalRounds);
            buildRecord(2, 11, secondRecordEnd);
          }
        });
      });

      if (records.length > 0) {
        await dbfFile.appendRecords(records);
      }

      console.log(`✓ Created Player Detail file: ${filePath}`);
      resolve({ success: true, filePath });
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
