const path = require('path');
const fs = require('fs').promises;
const BBPTrfGenerator = require('../utils/bbpPairings/bbpTrfGenerator');

/**
 * TRF Export Service using bbpPairings-master logic
 * Generates TRF files using the exact format from bbpPairings C++ implementation
 */

/**
 * Export tournament data as TRF file using bbpPairings-master logic
 */
async function exportTournamentTRF(db, tournamentId, exportPath, options = {}) {
  try {
    console.log(`[TRFExport] Exporting tournament ${tournamentId} to TRF format`);
    
    // Validate tournament exists
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Set default export path if not provided
    const finalExportPath = exportPath || path.join(__dirname, '../exports', tournamentId);

    // Ensure export directory exists
    try {
      await fs.mkdir(finalExportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create export directory:', error);
    }

    // Determine which round to export
    const round = options.round || tournament.rounds || 1;
    
    // Generate TRF file using bbpPairings logic
    const trfGenerator = new BBPTrfGenerator();
    const result = await trfGenerator.generateTrfForRound(tournamentId, round, db);

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate TRF file');
    }

    // Write TRF file
    const fileName = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_Round${round}.trf`;
    const filePath = path.join(finalExportPath, fileName);
    
    await fs.writeFile(filePath, result.content, 'utf8');

    console.log(`✓ Created TRF file: ${filePath}`);

    return {
      success: true,
      filePath: filePath,
      fileName: fileName,
      content: result.content,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        rounds: tournament.rounds,
        format: tournament.format
      },
      metadata: result.metadata
    };

  } catch (error) {
    console.error('TRF export error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to export TRF file'
    };
  }
}

/**
 * Export multiple rounds as separate TRF files
 */
async function exportAllRoundsTRF(db, tournamentId, exportPath, options = {}) {
  try {
    console.log(`[TRFExport] Exporting all rounds for tournament ${tournamentId}`);
    
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

    const results = [];
    const trfGenerator = new BBPTrfGenerator();

    // Export each round
    for (let round = 1; round <= tournament.rounds; round++) {
      try {
        const result = await trfGenerator.generateTrfForRound(tournamentId, round, db);
        
        if (result.success) {
          const fileName = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_Round${round}.trf`;
          const filePath = path.join(exportPath, fileName);
          
          await fs.writeFile(filePath, result.content, 'utf8');
          
          results.push({
            round: round,
            fileName: fileName,
            filePath: filePath,
            success: true
          });
          
          console.log(`✓ Created TRF file for round ${round}: ${fileName}`);
        } else {
          results.push({
            round: round,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        results.push({
          round: round,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalRounds = tournament.rounds;

    return {
      success: successCount > 0,
      results: results,
      summary: {
        totalRounds: totalRounds,
        successCount: successCount,
        failureCount: totalRounds - successCount
      },
      tournament: {
        id: tournament.id,
        name: tournament.name,
        rounds: tournament.rounds
      }
    };

  } catch (error) {
    console.error('TRF export error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to export TRF files'
    };
  }
}

/**
 * Generate TRF content for a specific round (without writing to file)
 */
async function generateTrfContent(db, tournamentId, round, options = {}) {
  try {
    const trfGenerator = new BBPTrfGenerator();
    const result = await trfGenerator.generateTrfForRound(tournamentId, round, db);
    
    return result;
  } catch (error) {
    console.error('TRF content generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate TRF file format
 */
function validateTrfContent(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      totalLines: lines.length,
      playerLines: 0,
      extensionLines: 0
    }
  };

  // Check for required elements
  let hasPlayerLines = false;
  let hasXxrLine = false;

  for (const line of lines) {
    if (line.startsWith('001 ')) {
      hasPlayerLines = true;
      validation.stats.playerLines++;
      
      // Validate player line format
      if (line.length < 100) {
        validation.warnings.push(`Player line too short: ${line.substring(0, 50)}...`);
      }
    } else if (line.startsWith('XXR ')) {
      hasXxrLine = true;
      validation.stats.extensionLines++;
    } else if (line.startsWith('XX') || line.startsWith('BB')) {
      validation.stats.extensionLines++;
    }
  }

  if (!hasPlayerLines) {
    validation.valid = false;
    validation.errors.push('No player lines (001) found in TRF file');
  }

  if (!hasXxrLine) {
    validation.warnings.push('No XXR (rounds) line found - this may be intentional for completed tournaments');
  }

  return validation;
}

module.exports = {
  exportTournamentTRF,
  exportAllRoundsTRF,
  generateTrfContent,
  validateTrfContent
};
