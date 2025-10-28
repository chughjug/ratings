const db = require('./server/database');

function updateWebhook() {
  try {
    console.log('Checking current tournaments with webhook_url...');
    
    // First, let's see what tournaments have webhook_url set
    db.all('SELECT id, name, webhook_url FROM tournaments WHERE webhook_url IS NOT NULL', [], (err, rows) => {
      if (err) {
        console.error('Error checking tournaments:', err.message);
        return;
      }
      
      console.log('Current tournaments with webhook_url:');
      rows.forEach(row => {
        console.log(`ID: ${row.id}, Name: ${row.name}, Webhook: ${row.webhook_url}`);
      });
      
      // Update all tournaments to use the new webhook URL
      const newWebhookUrl = 'https://script.google.com/macros/s/AKfycbxHMYoAVrLUpxzwaNMbTlDKusQVvhTvGAmrnDeaftLqhVhGt4rGUddxWxQiDPzqKW0z/exec';
      
      db.run('UPDATE tournaments SET webhook_url = ? WHERE webhook_url IS NOT NULL', [newWebhookUrl], function(err) {
        if (err) {
          console.error('Error updating webhook URLs:', err.message);
          return;
        }
        
        console.log(`Updated ${this.changes} tournaments with new webhook URL`);
        
        // Verify the update
        db.all('SELECT id, name, webhook_url FROM tournaments WHERE webhook_url IS NOT NULL', [], (err, rows) => {
          if (err) {
            console.error('Error verifying update:', err.message);
            return;
          }
          
          console.log('Updated tournaments:');
          rows.forEach(row => {
            console.log(`ID: ${row.id}, Name: ${row.name}, Webhook: ${row.webhook_url}`);
          });
          
          console.log('Webhook update completed successfully!');
          process.exit(0);
        });
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateWebhook();
