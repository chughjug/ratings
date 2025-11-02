const db = require('../database');

/**
 * Data Cleanup Service
 * Removes sensitive personal information (emails and phone numbers) 
 * from tournaments that have been completed.
 */

/**
 * Clean up emails and phone numbers for a completed tournament
 * @param {string} tournamentId - The ID of the tournament
 * @returns {Promise<{success: boolean, playersCleaned: number, registrationsCleaned: number, error?: string}>}
 */
async function cleanupTournamentData(tournamentId) {
  return new Promise((resolve, reject) => {
    // First, verify the tournament exists and is completed
    db.get('SELECT id, status FROM tournaments WHERE id = ?', [tournamentId], (err, tournament) => {
      if (err) {
        console.error('Error checking tournament status:', err);
        return reject(err);
      }

      if (!tournament) {
        return resolve({
          success: false,
          playersCleaned: 0,
          registrationsCleaned: 0,
          error: 'Tournament not found'
        });
      }

      if (tournament.status !== 'completed') {
        console.log(`Tournament ${tournamentId} is not completed (status: ${tournament.status}). Skipping cleanup.`);
        return resolve({
          success: false,
          playersCleaned: 0,
          registrationsCleaned: 0,
          error: `Tournament is not completed (current status: ${tournament.status})`
        });
      }

      // Start a transaction for atomic cleanup
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Clean up player emails and phone numbers
        db.run(
          'UPDATE players SET email = NULL, phone = NULL WHERE tournament_id = ? AND (email IS NOT NULL OR phone IS NOT NULL)',
          [tournamentId],
          function(err) {
            if (err) {
              console.error('Error cleaning up player data:', err);
              db.run('ROLLBACK');
              return reject(err);
            }

            const playersCleaned = this.changes;
            console.log(`Cleaned up ${playersCleaned} player records for tournament ${tournamentId}`);

            // Clean up registration emails and phone numbers
            db.run(
              'UPDATE registrations SET email = NULL, phone = NULL WHERE tournament_id = ? AND (email IS NOT NULL OR phone IS NOT NULL)',
              [tournamentId],
              function(err) {
                if (err) {
                  console.error('Error cleaning up registration data:', err);
                  db.run('ROLLBACK');
                  return reject(err);
                }

                const registrationsCleaned = this.changes;
                console.log(`Cleaned up ${registrationsCleaned} registration records for tournament ${tournamentId}`);

                // Commit the transaction
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Error committing cleanup transaction:', err);
                    return reject(err);
                  }

                  console.log(`Successfully cleaned up data for tournament ${tournamentId}: ${playersCleaned} players, ${registrationsCleaned} registrations`);
                  resolve({
                    success: true,
                    playersCleaned,
                    registrationsCleaned
                  });
                });
              }
            );
          }
        );
      });
    });
  });
}

/**
 * Clean up data for all completed tournaments that still have email/phone data
 * Useful for one-time cleanup of existing completed tournaments
 * @returns {Promise<{success: boolean, tournamentsCleaned: number, totalPlayersCleaned: number, totalRegistrationsCleaned: number}>}
 */
async function cleanupAllCompletedTournaments() {
  return new Promise((resolve, reject) => {
    // Find all completed tournaments that still have email/phone data
    db.all(
      `SELECT DISTINCT t.id, t.name
       FROM tournaments t
       WHERE t.status = 'completed'
       AND (
         EXISTS (SELECT 1 FROM players p WHERE p.tournament_id = t.id AND (p.email IS NOT NULL OR p.phone IS NOT NULL))
         OR EXISTS (SELECT 1 FROM registrations r WHERE r.tournament_id = t.id AND (r.email IS NOT NULL OR r.phone IS NOT NULL))
       )`,
      [],
      async (err, tournaments) => {
        if (err) {
          console.error('Error finding completed tournaments:', err);
          return reject(err);
        }

        if (!tournaments || tournaments.length === 0) {
          console.log('No completed tournaments found with email/phone data to clean up');
          return resolve({
            success: true,
            tournamentsCleaned: 0,
            totalPlayersCleaned: 0,
            totalRegistrationsCleaned: 0
          });
        }

        console.log(`Found ${tournaments.length} completed tournaments to clean up`);

        let tournamentsCleaned = 0;
        let totalPlayersCleaned = 0;
        let totalRegistrationsCleaned = 0;
        const errors = [];

        // Clean up each tournament
        for (const tournament of tournaments) {
          try {
            const result = await cleanupTournamentData(tournament.id);
            if (result.success) {
              tournamentsCleaned++;
              totalPlayersCleaned += result.playersCleaned;
              totalRegistrationsCleaned += result.registrationsCleaned;
            } else {
              errors.push(`${tournament.name} (${tournament.id}): ${result.error}`);
            }
          } catch (error) {
            errors.push(`${tournament.name} (${tournament.id}): ${error.message}`);
          }
        }

        console.log(`Cleanup complete: ${tournamentsCleaned}/${tournaments.length} tournaments cleaned`);
        if (errors.length > 0) {
          console.warn('Errors during cleanup:', errors);
        }

        resolve({
          success: true,
          tournamentsCleaned,
          totalPlayersCleaned,
          totalRegistrationsCleaned,
          errors: errors.length > 0 ? errors : undefined
        });
      }
    );
  });
}

module.exports = {
  cleanupTournamentData,
  cleanupAllCompletedTournaments
};





