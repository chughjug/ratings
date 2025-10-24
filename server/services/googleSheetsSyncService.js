const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { googleSheetsImportService } = require('./googleSheetsImport');
const { importPlayersFromCSV } = require('./csvImport');
const { assignSectionToPlayer } = require('../routes/players');

/**
 * Google Sheets Sync Service
 * Manages automatic syncing of Google Sheets data every 30 minutes
 */
class GoogleSheetsSyncService {
  constructor() {
    this.activeSyncs = new Map(); // Map of tournament_id -> sync interval
    this.syncInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
  }

  /**
   * Initialize the sync service and load active syncs from database
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Google Sheets Sync Service...');
      
      // Load active sync configurations from database
      const activeConfigs = await this.getActiveSyncConfigs();
      
      for (const config of activeConfigs) {
        await this.startSync(config.tournament_id);
      }
      
      console.log(`✅ Google Sheets Sync Service initialized with ${activeConfigs.length} active syncs`);
    } catch (error) {
      console.error('❌ Error initializing Google Sheets Sync Service:', error);
    }
  }

  /**
   * Get all active sync configurations from database
   */
  async getActiveSyncConfigs() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM google_sheets_sync WHERE is_active = 1',
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Create a new sync configuration
   */
  async createSyncConfig(config) {
    const syncId = uuidv4();
    const {
      tournament_id,
      spreadsheet_id,
      range = 'Sheet1!A1:Z1000',
      sheet_name = 'Players',
      api_key,
      lookup_ratings = true,
      auto_assign_sections = true,
      use_smart_import = true
    } = config;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO google_sheets_sync (
          id, tournament_id, spreadsheet_id, range, sheet_name, api_key,
          lookup_ratings, auto_assign_sections, use_smart_import, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          syncId, tournament_id, spreadsheet_id, range, sheet_name, api_key,
          lookup_ratings, auto_assign_sections, use_smart_import, false
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: syncId, ...config });
          }
        }
      );
    });
  }

  /**
   * Start automatic syncing for a tournament
   */
  async startSync(tournamentId) {
    try {
      // Check if sync is already active
      if (this.activeSyncs.has(tournamentId)) {
        console.log(`⚠️ Sync already active for tournament ${tournamentId}`);
        return { success: false, error: 'Sync already active' };
      }

      // Get sync configuration
      const config = await this.getSyncConfig(tournamentId);
      if (!config) {
        return { success: false, error: 'No sync configuration found' };
      }

      // Start the sync interval
      const intervalId = setInterval(async () => {
        await this.performSync(tournamentId);
      }, this.syncInterval);

      this.activeSyncs.set(tournamentId, intervalId);

      // Update database to mark sync as active
      await this.updateSyncStatus(tournamentId, { is_active: true });

      console.log(`✅ Started automatic sync for tournament ${tournamentId} (every 30 minutes)`);
      return { success: true, message: 'Sync started successfully' };
    } catch (error) {
      console.error(`❌ Error starting sync for tournament ${tournamentId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop automatic syncing for a tournament
   */
  async stopSync(tournamentId) {
    try {
      const intervalId = this.activeSyncs.get(tournamentId);
      if (intervalId) {
        clearInterval(intervalId);
        this.activeSyncs.delete(tournamentId);
      }

      // Update database to mark sync as inactive
      await this.updateSyncStatus(tournamentId, { is_active: false });

      console.log(`⏹️ Stopped automatic sync for tournament ${tournamentId}`);
      return { success: true, message: 'Sync stopped successfully' };
    } catch (error) {
      console.error(`❌ Error stopping sync for tournament ${tournamentId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform a single sync operation
   */
  async performSync(tournamentId) {
    const syncLogId = uuidv4();
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting sync for tournament ${tournamentId}...`);

      // Get sync configuration
      const config = await this.getSyncConfig(tournamentId);
      if (!config) {
        throw new Error('No sync configuration found');
      }

      // Create sync log entry
      await this.createSyncLog(syncLogId, config.id, tournamentId, 'running');

      // Import from Google Sheets
      const importResult = await googleSheetsImportService.importFromSheets(
        config.spreadsheet_id,
        config.range,
        {
          lookup_ratings: config.lookup_ratings,
          auto_assign_sections: config.auto_assign_sections
        }
      );

      if (!importResult.success) {
        throw new Error(importResult.error);
      }

      const { players, errors } = importResult;

      if (players.length === 0) {
        console.log(`ℹ️ No players found in spreadsheet for tournament ${tournamentId}`);
        await this.updateSyncLog(syncLogId, {
          status: 'success',
          sync_completed_at: new Date().toISOString(),
          players_imported: 0,
          errors_count: errors.length,
          sync_duration_ms: Date.now() - startTime
        });
        return;
      }

      // Import players into database
      const dbResult = await importPlayersFromCSV(db, tournamentId, players, config.lookup_ratings);

      // Auto-assign sections if requested
      if (config.auto_assign_sections && dbResult.ratingLookupResults) {
        for (const lookupResult of dbResult.ratingLookupResults) {
          if (lookupResult.success && lookupResult.rating) {
            try {
              const assignedSection = await assignSectionToPlayer(db, tournamentId, lookupResult.rating);
              if (assignedSection) {
                const playerId = dbResult.playerIds.find((id, index) => 
                  dbResult.ratingLookupResults[index] === lookupResult
                );
                if (playerId) {
                  await new Promise((resolve, reject) => {
                    db.run('UPDATE players SET section = ? WHERE id = ?', [assignedSection, playerId], (err) => {
                      if (err) reject(err);
                      else resolve();
                    });
                  });
                }
              }
            } catch (error) {
              console.error(`Error auto-assigning section for player:`, error);
            }
          }
        }
      }

      // Update sync configuration with last sync info
      await this.updateSyncStatus(tournamentId, {
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
        sync_count: config.sync_count + 1
      });

      // Update sync log
      await this.updateSyncLog(syncLogId, {
        status: 'success',
        sync_completed_at: new Date().toISOString(),
        players_imported: dbResult.importedCount,
        players_updated: dbResult.importedCount, // For now, treat all as updates
        errors_count: (dbResult.importErrors?.length || 0) + errors.length,
        sync_duration_ms: Date.now() - startTime
      });

      console.log(`✅ Sync completed for tournament ${tournamentId}: ${dbResult.importedCount} players imported`);

    } catch (error) {
      console.error(`❌ Sync failed for tournament ${tournamentId}:`, error);

      // Update sync configuration with error info
      await this.updateSyncStatus(tournamentId, {
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'error',
        last_sync_error: error.message
      });

      // Update sync log
      await this.updateSyncLog(syncLogId, {
        status: 'error',
        sync_completed_at: new Date().toISOString(),
        error_message: error.message,
        sync_duration_ms: Date.now() - startTime
      });
    }
  }

  /**
   * Get sync configuration for a tournament
   */
  async getSyncConfig(tournamentId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM google_sheets_sync WHERE tournament_id = ?',
        [tournamentId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  /**
   * Update sync status in database
   */
  async updateSyncStatus(tournamentId, updates) {
    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), tournamentId];

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE google_sheets_sync SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE tournament_id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Create a sync log entry
   */
  async createSyncLog(syncLogId, syncConfigId, tournamentId, status) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO google_sheets_sync_logs (id, sync_config_id, tournament_id, status) VALUES (?, ?, ?, ?)`,
        [syncLogId, syncConfigId, tournamentId, status],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Update a sync log entry
   */
  async updateSyncLog(syncLogId, updates) {
    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), syncLogId];

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE google_sheets_sync_logs SET ${updateFields} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Get sync status for a tournament
   */
  async getSyncStatus(tournamentId) {
    try {
      const config = await this.getSyncConfig(tournamentId);
      if (!config) {
        return { success: false, error: 'No sync configuration found' };
      }

      // Get recent sync logs
      const recentLogs = await new Promise((resolve, reject) => {
        db.all(
          `SELECT * FROM google_sheets_sync_logs 
           WHERE tournament_id = ? 
           ORDER BY sync_started_at DESC 
           LIMIT 10`,
          [tournamentId],
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows || []);
            }
          }
        );
      });

      return {
        success: true,
        data: {
          config,
          isActive: this.activeSyncs.has(tournamentId),
          recentLogs
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all sync configurations
   */
  async getAllSyncConfigs() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM google_sheets_sync ORDER BY created_at DESC',
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Delete a sync configuration
   */
  async deleteSyncConfig(tournamentId) {
    try {
      // Stop sync if active
      await this.stopSync(tournamentId);

      // Delete configuration
      return new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM google_sheets_sync WHERE tournament_id = ?',
          [tournamentId],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ success: true, message: 'Sync configuration deleted' });
            }
          }
        );
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown() {
    console.log('🔄 Shutting down Google Sheets Sync Service...');
    for (const [tournamentId, intervalId] of this.activeSyncs) {
      clearInterval(intervalId);
      console.log(`⏹️ Stopped sync for tournament ${tournamentId}`);
    }
    this.activeSyncs.clear();
    console.log('✅ Google Sheets Sync Service shutdown complete');
  }
}

// Create singleton instance
const syncService = new GoogleSheetsSyncService();

// Initialize on startup
syncService.initialize();

// Handle graceful shutdown
process.on('SIGINT', () => {
  syncService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  syncService.shutdown();
  process.exit(0);
});

module.exports = syncService;
