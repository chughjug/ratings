const axios = require('axios');
const TOURNAMENT_ID = '44';

const iframeHTML = `<iframe 
  src="https://www.cmsca.org/junior/" 
  width="100%" 
  height="800" 
  frameborder="0" 
  style="border:0; min-width:320px; max-width:100%;">
</iframe>`;

async function addIframeToCustomPage() {
  try {
    const response = await axios.post('https://chess-tournament-director-6ce5e76147d7.herokuapp.com/api/custom-pages', {
      tournament_id: TOURNAMENT_ID,
      title: 'Junior Chess Information',
      slug: 'junior-info',
      content: iframeHTML,
      order_index: 1,
      is_active: 1,
      icon: 'info'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Custom page created:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

addIframeToCustomPage();
