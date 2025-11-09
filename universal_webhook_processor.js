const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');

// ============================================================================
// 1. CONFIGURATION
// ============================================================================

// --- SERVER CONFIG ---
const PORT = 3000;
const WEBHOOK_PATH = '/submit'; // e.g., http://yourserver.com:3000/submit

// --- TOURNAMENT API CONFIG ---
const CONFIG = {
  API_BASE_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com',
  API_KEY: 'demo-key-123',
  TOURNAMENT_ID: '0d40d92c-ed28-44df-aa91-f2e992e89d86',
  LOOKUP_RATINGS: true,
  AUTO_ASSIGN_SECTIONS: true,
  SOURCE_NAME: 'universal_webhook'
};

// ============================================================================
// 2. FIELD MAPPING CONFIGURATION (Enhanced for Flexibility)
// ============================================================================

const FIELD_MAPPING = {
  // --- Name Fields (First/Last combined into `name`) ---
  name: {
    keywords: ['name', 'player', 'full name', 'player name', 'first name and last name', 'full player name'],
    excludeKeywords: ['parent', 'guardian', 'emergency', 'first', 'last'],
    required: true
  },
  first_name: {
    keywords: ['first name', 'given name', 'player first name'],
    excludeKeywords: ['parent', 'guardian', 'emergency']
  },
  last_name: {
    keywords: ['last name', 'surname', 'family name', 'player last name'],
    excludeKeywords: ['parent', 'guardian', 'emergency']
  },
  // --- Other Fields ---
  uscf_id: { keywords: ['uscf', 'uscf id', 'uscf number', 'member id'], excludeKeywords: [] },
  fide_id: { keywords: ['fide', 'fide id', 'fide number', 'international rating'], excludeKeywords: [] },
  rating: { keywords: ['rating', 'elo', 'chess rating', 'current rating', 'rating number'], excludeKeywords: [] },
  section: { keywords: ['section', 'division', 'category', 'level', 'class'], excludeKeywords: [] },
  email: { keywords: ['email', 'email address', 'e-mail'], excludeKeywords: ['parent', 'guardian'] },
  phone: {
    keywords: ['phone', 'telephone', 'phone number', 'mobile', 'contact number'],
    excludeKeywords: ['parent', 'guardian', 'emergency'],
    strict: true
  },
  school: { keywords: ['school', 'institution', 'college', 'university', 'organization'], excludeKeywords: ['parent'] },
  grade: { keywords: ['grade', 'year', 'level', 'class', 'grade level'], excludeKeywords: ['parent'] },
  city: { keywords: ['city', 'town', 'locality', 'location'], excludeKeywords: [] },
  state: { keywords: ['state', 'province', 'region', 'country'], excludeKeywords: [] },
  team_name: { keywords: ['team', 'club', 'organization', 'group', 'squad'], excludeKeywords: [] },
  parent_name: {
    keywords: ['parent name', 'parent', 'guardian name', 'guardian', 'mother', 'father', 'caregiver'],
    excludeKeywords: ['email', 'phone', 'contact']
  },
  parent_email: { keywords: ['parent email', 'parent e-mail', 'guardian email', 'parents email'], excludeKeywords: [] },
  parent_phone: {
    keywords: ['parent phone', 'parent number', 'guardian phone', 'parents phone'],
    excludeKeywords: [],
    strict: true
  },
  emergency_contact: {
    keywords: ['emergency', 'emergency contact', 'emergency name'],
    excludeKeywords: ['phone', 'number']
  },
  emergency_phone: {
    keywords: ['emergency phone', 'emergency number', 'emergency contact number'],
    excludeKeywords: [],
    strict: true
  },
  notes: { keywords: ['notes', 'comments', 'additional', 'special needs', 'dietary', 'restrictions'], excludeKeywords: [] }
};

// ============================================================================
// 3. HELPER FUNCTIONS (Fuzzy Matching Logic)
// ============================================================================

const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()).trim();
};

function calculateFieldScore(question, field) {
  const config = FIELD_MAPPING[field];
  if (!config) return 0;

  const questionLower = question.toLowerCase().trim();
  let score = 0;

  for (const exclude of config.excludeKeywords) {
    if (questionLower.includes(exclude.toLowerCase())) {
      return 0;
    }
  }

  const questionWords = questionLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const keyword of config.keywords) {
    const keywordLower = keyword.toLowerCase();
    const keywordWords = keywordLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    let overlapCount = 0;
    keywordWords.forEach((kw) => {
      if (questionWords.includes(kw)) {
        overlapCount += 1;
      }
    });

    if (overlapCount > 0) {
      score += overlapCount * 25;
      if (overlapCount === keywordWords.length && keywordWords.length > 0) {
        score += 20;
      }
    }

    if (questionLower === keywordLower) {
      score += 100;
    } else if (questionLower.includes(keywordLower)) {
      score += 30;
    }
  }

  return score;
}

function findBestFieldMatch(question) {
  let bestField = null;
  let bestScore = 0;

  for (const field in FIELD_MAPPING) {
    const score = calculateFieldScore(question, field);
    if (score > bestScore) {
      bestScore = score;
      bestField = field;
    }
  }

  let requiredThreshold = 20;
  if (bestField && FIELD_MAPPING[bestField].strict) {
    requiredThreshold = 60;
  }

  if (bestScore >= requiredThreshold) {
    return bestField;
  }

  return null;
}

// ============================================================================
// 4. CORE LOGIC (Data Processing and API Forwarding)
// ============================================================================

function processWebhookPayload(rawData) {
  const player = {};
  const tempNameParts = {};

  console.log(`\nStarting mapping for ${Object.keys(rawData).length} fields...`);

  for (const rawKey in rawData) {
    const rawValue = rawData[rawKey];
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      continue;
    }

    const field = findBestFieldMatch(rawKey);
    if (!field) {
      console.log(`  ⚠️ Unmatched field: "${rawKey}" = "${rawValue}"`);
      continue;
    }

    const answerValue = rawValue.toString().trim();

    switch (field) {
      case 'first_name':
      case 'last_name':
        tempNameParts[field] = toTitleCase(answerValue);
        break;
      case 'rating':
        const rating = parseFloat(answerValue);
        if (!isNaN(rating) && rating > 0) {
          player.rating = rating;
        }
        break;
      case 'name':
      case 'parent_name':
      case 'emergency_contact':
        player[field] = toTitleCase(answerValue);
        break;
      case 'email':
      case 'parent_email':
        if (answerValue.includes('@')) {
          player[field] = answerValue.toLowerCase().trim();
        }
        break;
      case 'phone':
      case 'parent_phone':
      case 'emergency_phone':
        const cleanedPhone = answerValue.replace(/\D/g, '');
        if (cleanedPhone.length >= 7) {
          player[field] = cleanedPhone;
        }
        break;
      default:
        player[field] = answerValue;
    }

    console.log(`  -> Mapped "${rawKey}" to "${field}": "${answerValue}"`);
  }

  if (!player.name && (tempNameParts.first_name || tempNameParts.last_name)) {
    player.name = `${tempNameParts.first_name || ''} ${tempNameParts.last_name || ''}`.trim();
    if (player.name) {
      console.log(`✅ Combined name from parts: ${player.name}`);
    }
  }

  return player;
}

function syncPlayerToAPI(player) {
  const payload = {
    api_key: CONFIG.API_KEY,
    players: [player],
    lookup_ratings: CONFIG.LOOKUP_RATINGS,
    auto_assign_sections: CONFIG.AUTO_ASSIGN_SECTIONS,
    source: CONFIG.SOURCE_NAME
  };

  const endpoint = `${CONFIG.API_BASE_URL}/api/players/api-import/${CONFIG.TOURNAMENT_ID}`;
  const urlParts = url.parse(endpoint);

  const options = {
    hostname: urlParts.hostname,
    path: urlParts.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(payload))
    }
  };

  return new Promise((resolve, reject) => {
    console.log(`\nCalling Tournament API: ${endpoint}`);
    const protocol = urlParts.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`API Response Status: ${res.statusCode}`);
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300 && result.success) {
            resolve({ success: true, data: result.data });
          } else {
            reject(new Error(result.error || `API returned status ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`API returned invalid JSON or unexpected status: ${res.statusCode} | ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`API request failed: ${e.message}`));
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

// ============================================================================
// 5. HTTP SERVER
// ============================================================================

const server = http.createServer(async (req, res) => {
  console.log(`\n[${new Date().toISOString()}] Incoming Request: ${req.method} ${req.url}`);

  if (req.method !== 'POST' || req.url !== WEBHOOK_PATH) {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed or Invalid Path');
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    let rawData = {};
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json') || body.startsWith('{')) {
      try {
        rawData = JSON.parse(body);
        console.log('Content-Type: Parsed as JSON.');
      } catch (e) {
        console.error('Error parsing JSON body:', e.message);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid JSON Payload');
        return;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      rawData = querystring.parse(body);
        console.log('Content-Type: Parsed as URL-encoded.');
    } else {
      console.log(`Content-Type ${contentType} not supported. Attempting key=value parsing.`);
      rawData = querystring.parse(body);
    }

    const player = processWebhookPayload(rawData);
    if (!player || !player.name) {
      console.log('Processing aborted: Player name missing.');
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing required player name field.');
      return;
    }

    try {
      const result = await syncPlayerToAPI(player);
      console.log(`Success: Player ${player.name} synced.`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          message: `Successfully imported ${player.name}`,
          api_response: result.data
        })
      );
    } catch (error) {
      console.error('Final API Sync Error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log('\n*******************************************************');
  console.log('* UNIVERSAL WEBHOOK PROCESSOR IS RUNNING *');
  console.log(`* Listening for webhooks on: http://localhost:${PORT}${WEBHOOK_PATH} *`);
  console.log('*******************************************************\n');
  console.log('1. Point your form service webhook to this URL.');
  console.log("2. Ensure the server's firewall allows inbound traffic on port 3000.");
});


