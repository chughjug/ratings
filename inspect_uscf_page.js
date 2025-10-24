/**
 * Inspect the actual HTML structure of USCF pages
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function inspectUSCFPage() {
  console.log('Fetching USCF page structure...');
  
  try {
    const msaUrl = `https://www.uschess.org/msa/MbrDtlMain.php?14970943`;
    const response = await axios.get(msaUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    console.log('='.repeat(60));
    console.log('Page Title:', $('title').text());
    console.log('='.repeat(60));
    
    // Look for table rows with various patterns
    console.log('\nAll TR elements with their text:');
    console.log('-'.repeat(60));
    
    $('tr').each((i, tr) => {
      const $tr = $(tr);
      const cells = $tr.find('td');
      
      if (cells.length > 0) {
        const firstCellText = $(cells[0]).text().trim().substring(0, 50);
        const secondCellText = $(cells[1]).text().trim().substring(0, 80);
        
        if (firstCellText.length > 0) {
          console.log(`\nRow ${i}:`);
          console.log(`  Col 0: ${firstCellText}`);
          console.log(`  Col 1: ${secondCellText}`);
          
          // Show full HTML for interesting rows
          if (firstCellText.includes('Regular') || firstCellText.includes('USCF') || firstCellText.includes('Expiration')) {
            console.log(`  Full HTML: ${$(cells[1]).html().substring(0, 200)}`);
          }
        }
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('Looking for name in headings and divs...');
    console.log('-'.repeat(60));
    
    $('h1, h2, h3, h4, h5, h6, .player-name, .member-name, [class*="name"]').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 0 && text.length < 100) {
        console.log(`${elem.name}: ${text}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

inspectUSCFPage();
