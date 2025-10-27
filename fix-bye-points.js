/**
 * Script to fix bye points in the database
 * This updates all bye results to use the correct point values based on bye_type
 */

const db = require('./server/database');

async function fixByePoints() {
  console.log('Starting bye points fix...');

  // Get all bye pairings
  const pairings = await new Promise((resolve, reject) => {
    db.all(`
      SELECT id, tournament_id, round, white_player_id, black_player_id, bye_type, is_bye 
      FROM pairings 
      WHERE is_bye = 1 OR result LIKE 'bye_%' OR result = 'bye'
    `, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log(`Found ${pairings.length} bye pairings`);

  for (const pairing of pairings) {
    // Determine the correct bye points
    let byePoints = 0.5; // Default for intentional byes
    
    if (pairing.bye_type === 'unpaired') {
      byePoints = 1.0;
    } else if (pairing.bye_type === 'bye' || pairing.bye_type === 'half_point_bye' || pairing.bye_type === 'inactive' || !pairing.bye_type) {
      byePoints = 0.5;
    }

    console.log(`Processing pairing ${pairing.id}: bye_type=${pairing.bye_type}, points=${byePoints}`);

    // Update the result in the results table
    const playerId = pairing.white_player_id || pairing.black_player_id;
    
    if (playerId) {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE results 
           SET points = ? 
           WHERE tournament_id = ? AND round = ? AND player_id = ? 
           AND (result = 'bye' OR result LIKE 'bye_%')`,
          [byePoints, pairing.tournament_id, pairing.round, playerId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Also update the result in the pairings table if needed
      if (pairing.bye_type) {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE pairings 
             SET result = ?, bye_type = ? 
             WHERE id = ?`,
            [pairing.result || 'bye', pairing.bye_type, pairing.id],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }
  }

  console.log('Bye points fix complete!');
  process.exit(0);
}

fixByePoints().catch(err => {
  console.error('Error fixing bye points:', err);
  process.exit(1);
});

