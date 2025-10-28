const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkWebhooks() {
  try {
    const result = await pool.query('SELECT id, name, webhook_url FROM tournaments WHERE webhook_url IS NOT NULL');
    console.log('Tournaments with webhook_url:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, Name: ${row.name}, Webhook: ${row.webhook_url}`);
    });
    
    if (result.rows.length === 0) {
      console.log('No tournaments have webhook_url set');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWebhooks();
