const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateWebhook() {
  try {
    // First, let's see what tournaments have webhook_url set
    const checkResult = await pool.query('SELECT id, name, webhook_url FROM tournaments WHERE webhook_url IS NOT NULL');
    console.log('Current tournaments with webhook_url:');
    checkResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}, Webhook: ${row.webhook_url}`);
    });
    
    // Update all tournaments to use the new webhook URL
    const newWebhookUrl = 'https://script.google.com/macros/s/AKfycbxHMYoAVrLUpxzwaNMbTlDKusQVvhTvGAmrnDeaftLqhVhGt4rGUddxWxQiDPzqKW0z/exec';
    
    const updateResult = await pool.query(
      'UPDATE tournaments SET webhook_url = $1 WHERE webhook_url IS NOT NULL',
      [newWebhookUrl]
    );
    
    console.log(`Updated ${updateResult.rowCount} tournaments with new webhook URL`);
    
    // Verify the update
    const verifyResult = await pool.query('SELECT id, name, webhook_url FROM tournaments WHERE webhook_url IS NOT NULL');
    console.log('Updated tournaments:');
    verifyResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}, Webhook: ${row.webhook_url}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateWebhook();
