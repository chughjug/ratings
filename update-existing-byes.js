/**
 * Update existing bye pairings to have proper result field
 */

const db = require('./server/database');

async function updateExistingByes() {
  console.log('Updating existing bye pairings...');

  // Get all bye pairings with NULL result
  const pairings = await new Promise((resolve, reject) => {
    db.all(
      `SELECT id, tournament_id, round, section, white_player_id, bye_type 
       FROM pairings 
       WHERE is_bye = 1 AND (result IS NULL OR result = '')`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  console.log(`Found ${pairings.length} bye pairings to update`);

  for (const pairing of pairings) {
    const byeType = pairing.bye_type || 'bye';
    const result = `bye_${byeType}`;
    
    console.log(`Updating pairing ${pairing.id}: bye_type=${byeType}, setting result=${result}`);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE pairings SET result = ? WHERE id = ?`,
        [result, pairing.id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  console.log('Update complete!');
  process.exit(0);
}

updateExistingByes().catch(err => {
  console.error('Error updating byes:', err);
  process.exit(1);
});

