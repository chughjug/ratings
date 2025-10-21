const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

/**
 * Create a complete backup of the database
 */
async function createBackup() {
  try {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    const backupFileName = `backup-${timestamp}-${backupId}.json`;
    const backupPath = path.join(backupDir, backupFileName);

    // Create backup directory if it doesn't exist
    await fs.mkdir(backupDir, { recursive: true });

    // Get all data from database
    const backupData = await new Promise((resolve, reject) => {
      const data = {
        metadata: {
          backupId,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        },
        tables: {}
      };

      // Get all table names
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
          reject(err);
          return;
        }

        let completed = 0;
        const totalTables = tables.length;

        if (totalTables === 0) {
          resolve(data);
          return;
        }

        tables.forEach(table => {
          const tableName = table.name;
          
          db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
            if (err) {
              reject(err);
              return;
            }

            data.tables[tableName] = rows;
            completed++;

            if (completed === totalTables) {
              resolve(data);
            }
          });
        });
      });
    });

    // Write backup to file
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    // Clean up old backups (keep last 10)
    await cleanupOldBackups(backupDir);

    return {
      success: true,
      backupId,
      backupPath,
      fileName: backupFileName,
      size: (await fs.stat(backupPath)).size,
      timestamp: backupData.metadata.timestamp
    };

  } catch (error) {
    console.error('Backup creation error:', error);
    throw error;
  }
}

/**
 * Restore database from backup
 */
async function restoreBackup(backupPath) {
  try {
    // Read backup file
    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));

    if (!backupData.metadata || !backupData.tables) {
      throw new Error('Invalid backup file format');
    }

    // Create a transaction for the restore
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Clear existing data
        const clearPromises = Object.keys(backupData.tables).map(tableName => {
          return new Promise((resolve, reject) => {
            db.run(`DELETE FROM ${tableName}`, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });

        Promise.all(clearPromises)
          .then(() => {
            // Restore data
            const restorePromises = Object.entries(backupData.tables).map(([tableName, rows]) => {
              return new Promise((resolve, reject) => {
                if (rows.length === 0) {
                  resolve();
                  return;
                }

                // Get column names from first row
                const columns = Object.keys(rows[0]);
                const placeholders = columns.map(() => '?').join(', ');
                const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

                let completed = 0;
                rows.forEach(row => {
                  const values = columns.map(col => row[col]);
                  
                  db.run(query, values, (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    completed++;
                    if (completed === rows.length) {
                      resolve();
                    }
                  });
                });
              });
            });

            Promise.all(restorePromises)
              .then(() => {
                db.run('COMMIT', (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve({
                      success: true,
                      message: 'Database restored successfully',
                      restoredTables: Object.keys(backupData.tables),
                      recordCount: Object.values(backupData.tables).reduce((sum, rows) => sum + rows.length, 0)
                    });
                  }
                });
              })
              .catch(err => {
                db.run('ROLLBACK');
                reject(err);
              });
          })
          .catch(err => {
            db.run('ROLLBACK');
            reject(err);
          });
      });
    });

  } catch (error) {
    console.error('Backup restore error:', error);
    throw error;
  }
}

/**
 * Get list of available backups
 */
async function getBackups() {
  try {
    const backupDir = path.join(__dirname, '../backups');
    
    try {
      await fs.access(backupDir);
    } catch {
      return { success: true, backups: [] };
    }

    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(file => file.endsWith('.json'));

    const backups = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          
          return {
            fileName: file,
            filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            backupId: data.metadata?.backupId,
            timestamp: data.metadata?.timestamp,
            version: data.metadata?.version
          };
        } catch {
          return {
            fileName: file,
            filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            backupId: null,
            timestamp: null,
            version: null,
            corrupted: true
          };
        }
      })
    );

    // Sort by creation date (newest first)
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));

    return {
      success: true,
      backups
    };

  } catch (error) {
    console.error('Get backups error:', error);
    throw error;
  }
}

/**
 * Delete a backup file
 */
async function deleteBackup(fileName) {
  try {
    const backupDir = path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, fileName);

    await fs.unlink(backupPath);

    return {
      success: true,
      message: 'Backup deleted successfully'
    };

  } catch (error) {
    console.error('Delete backup error:', error);
    throw error;
  }
}

/**
 * Clean up old backups (keep last 10)
 */
async function cleanupOldBackups(backupDir) {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file)
      }));

    if (backupFiles.length <= 10) {
      return;
    }

    // Sort by modification time (oldest first)
    const sortedFiles = await Promise.all(
      backupFiles.map(async (file) => {
        const stats = await fs.stat(file.path);
        return {
          ...file,
          mtime: stats.mtime
        };
      })
    );

    sortedFiles.sort((a, b) => a.mtime - b.mtime);

    // Delete oldest files, keeping only the last 10
    const filesToDelete = sortedFiles.slice(0, sortedFiles.length - 10);
    
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file.path);
        console.log(`Deleted old backup: ${file.name}`);
      } catch (error) {
        console.error(`Failed to delete backup ${file.name}:`, error);
      }
    }

  } catch (error) {
    console.error('Cleanup old backups error:', error);
  }
}

/**
 * Export specific tournament data
 */
async function exportTournament(tournamentId) {
  try {
    const exportId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.join(__dirname, '../exports');
    const exportFileName = `tournament-${tournamentId}-${timestamp}.json`;
    const exportPath = path.join(exportDir, exportFileName);

    // Create export directory if it doesn't exist
    await fs.mkdir(exportDir, { recursive: true });

    // Get tournament data
    const tournamentData = await new Promise((resolve, reject) => {
      const data = {
        metadata: {
          exportId,
          tournamentId,
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        },
        tournament: null,
        players: [],
        pairings: [],
        results: [],
        inactiveRounds: []
      };

      // Get tournament
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
        if (err) {
          reject(err);
          return;
        }

        if (!tournament) {
          reject(new Error('Tournament not found'));
          return;
        }

        data.tournament = tournament;

        // Get players
        db.all('SELECT * FROM players WHERE tournament_id = ?', [tournamentId], (err, players) => {
          if (err) {
            reject(err);
            return;
          }

          data.players = players;

          // Get pairings
          db.all('SELECT * FROM pairings WHERE tournament_id = ?', [tournamentId], (err, pairings) => {
            if (err) {
              reject(err);
              return;
            }

            data.pairings = pairings;

            // Get results
            db.all('SELECT * FROM results WHERE tournament_id = ?', [tournamentId], (err, results) => {
              if (err) {
                reject(err);
                return;
              }

              data.results = results;

              // Get inactive rounds
              db.all('SELECT * FROM player_inactive_rounds WHERE tournament_id = ?', [tournamentId], (err, inactiveRounds) => {
                if (err) {
                  reject(err);
                  return;
                }

                data.inactiveRounds = inactiveRounds;
                resolve(data);
              });
            });
          });
        });
      });
    });

    // Write export to file
    await fs.writeFile(exportPath, JSON.stringify(tournamentData, null, 2));

    return {
      success: true,
      exportId,
      exportPath,
      fileName: exportFileName,
      size: (await fs.stat(exportPath)).size,
      timestamp: tournamentData.metadata.timestamp
    };

  } catch (error) {
    console.error('Tournament export error:', error);
    throw error;
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  getBackups,
  deleteBackup,
  exportTournament
};
