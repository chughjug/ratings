/**
 * Google Apps Script for Real-time Chess Tournament Registration (Google Forms)
 *
 * Generated on: 11/9/2025, 12:14:33 PM
 * Tournament ID: 0d40d92c-ed28-44df-aa91-f2e992e89d86
 * Form ID: (set via CONFIG.FORM_ID)
 *
 * Setup:
 * 1. Open your Google Form
 * 2. Click the three dots (⋮) → Script editor
 * 3. Replace any existing code with this file
 * 4. Save, then run setup()
 * 5. Add an onFormSubmit trigger (Triggers → Add Trigger → onFormSubmit → On form submit)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: '', // Google Form ID or leave blank to run inside the form
  API_BASE_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com',
  API_KEY: 'demo-key-123',
  TOURNAMENT_ID: '0d40d92c-ed28-44df-aa91-f2e992e89d86',
  CHECK_INTERVAL: 5,
  SEND_CONFIRMATION_EMAILS: true,
  AUTO_ASSIGN_SECTIONS: true,
  LOOKUP_RATINGS: true
};

// ============================================================================
// SAFE ALERT HELPER
// ============================================================================

function safeAlert(message) {
  try {
    FormApp.getUi().alert(message);
  } catch (e) {
    try {
      SpreadsheetApp.getUi().alert(message);
    } catch (err) {
      console.log('Alert: ' + message);
    }
  }
}

// ============================================================================
// FIELD MAPPING (ENHANCED)
// ============================================================================

const FIELD_MAPPING = {
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
  uscf_id: {
    keywords: ['uscf', 'uscf id', 'uscf number', 'member id'],
    excludeKeywords: []
  },
  fide_id: {
    keywords: ['fide', 'fide id', 'fide number', 'international rating'],
    excludeKeywords: []
  },
  rating: {
    keywords: ['rating', 'elo', 'chess rating', 'current rating', 'rating number'],
    excludeKeywords: []
  },
  section: {
    keywords: ['section', 'division', 'category', 'level', 'class'],
    excludeKeywords: []
  },
  email: {
    keywords: ['email', 'email address', 'e-mail'],
    excludeKeywords: ['parent', 'guardian']
  },
  phone: {
    keywords: ['phone', 'telephone', 'phone number', 'mobile', 'contact number'],
    excludeKeywords: ['parent', 'guardian', 'emergency'],
    strict: true
  },
  school: {
    keywords: ['school', 'institution', 'college', 'university', 'organization'],
    excludeKeywords: ['parent']
  },
  grade: {
    keywords: ['grade', 'year', 'level', 'class', 'grade level'],
    excludeKeywords: ['parent']
  },
  city: {
    keywords: ['city', 'town', 'locality', 'location'],
    excludeKeywords: []
  },
  state: {
    keywords: ['state', 'province', 'region', 'country'],
    excludeKeywords: []
  },
  team_name: {
    keywords: ['team', 'club', 'organization', 'group', 'squad'],
    excludeKeywords: []
  },
  parent_name: {
    keywords: ['parent name', 'parent', 'guardian name', 'guardian', 'mother', 'father', 'caregiver'],
    excludeKeywords: ['email', 'phone', 'contact']
  },
  parent_email: {
    keywords: ['parent email', 'parent e-mail', 'guardian email', 'parents email'],
    excludeKeywords: []
  },
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
  notes: {
    keywords: ['notes', 'comments', 'additional', 'special needs', 'dietary', 'restrictions'],
    excludeKeywords: []
  }
};

function onFormSubmit(e) {
  if (!CONFIG.ENABLE_FORM_IMPORT) {
    console.log('Form import disabled; ignoring submission.');
    return;
  }

  try {
    console.log('Form submission detected...');

    const formResponse = e && e.response ? e.response : null;
    if (!formResponse) {
      console.log('Submission has no response object; attempting fallback.');
      const form = getActiveForm();
      const responses = form.getResponses();
      if (!responses.length) {
        console.log('No responses available for fallback.');
        return;
      }

      const latestResponse = responses[responses.length - 1];
      processFormResponse(latestResponse.getItemResponses());
      return;
    }

    processFormResponse(formResponse.getItemResponses());
  } catch (error) {
    console.error('Form submit error:', error);
    safeAlert('❌ Form submit error: ' + error.toString());
  }
}

function processFormResponse(itemResponses) {
  try {
    if (!itemResponses || typeof itemResponses.forEach !== 'function') {
      console.log('No item responses found to process.');
      return;
    }

    const player = convertFormResponseToPlayer(itemResponses);
    if (!player || !player.name) {
      console.log('Invalid response: missing player name.');
      return;
    }

    console.log('Processing player:', player.name);
    const result = syncPlayersToAPI([player]);

    if (result.success) {
      console.log(`✅ Successfully imported: ${player.name}`);
      if (player.email && CONFIG.SEND_CONFIRMATION_EMAILS) {
        sendConfirmationEmail(player.email, player.name);
      }
    } else {
      console.error(`❌ Failed to import: ${player.name} - ${result.error}`);
    }
  } catch (error) {
    console.error('Error processing form response:', error);
    safeAlert('❌ Error processing form response: ' + error.toString());
  }
}

function convertFormResponseToPlayer(itemResponses) {
  const player = {};
  const fieldMatches = [];
  const tempNameParts = {};
  let nameDerivedFromParts = false;

  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const isLikelyName = (str) => {
    if (!str) return false;
    const trimmed = str.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    const disallowed = ['yes', 'no', 'y', 'n', 'true', 'false', 'n/a', 'na'];
    if (disallowed.includes(lower)) return false;
    if (trimmed.length < 2) return false;
    const alphaChars = trimmed.replace(/[^a-zA-Z]/g, '');
    return alphaChars.length >= 2;
  };

  itemResponses.forEach((itemResponse, index) => {
    const question = itemResponse.getItem().getTitle();
    const answer = itemResponse.getResponse();

    if (!answer || !answer.toString().trim()) return;

    const match = findBestFieldMatch(question);
    if (!match) {
      fieldMatches.push({ index, question, field: 'UNMATCHED', score: 0, value: answer.toString().substring(0, 50) });
      return;
    }

    const { field, score } = match;
    const answerValue = answer.toString().trim();
    fieldMatches.push({ index, question, field, score, value: answerValue.substring(0, 50) });

    switch (field) {
      case 'first_name':
      case 'last_name':
        tempNameParts[field] = toTitleCase(answerValue);
        player[field] = tempNameParts[field];
        break;

      case 'rating': {
        const rating = parseFloat(answerValue);
        if (!isNaN(rating) && rating > 0) {
          player.rating = rating;
        }
        break;
      }

      case 'name': {
        if (nameDerivedFromParts && player.name && isLikelyName(player.name)) {
          console.log(`Skipping direct name override (already combined): "${answerValue}"`);
          break;
        }

        if (!isLikelyName(answerValue)) {
          console.log(`Ignoring unlikely name value: "${answerValue}"`);
          break;
        }

        const candidateName = toTitleCase(answerValue);
        if (player.name && isLikelyName(player.name) && player.name !== candidateName) {
          console.log(`Name already set to "${player.name}"; ignoring alternate value "${candidateName}"`);
          break;
        }

        player[field] = candidateName;
        break;
      }

      case 'parent_name':
      case 'emergency_contact':
        player[field] = toTitleCase(answerValue);
        break;

      case 'email':
      case 'parent_email':
        if (answerValue.includes('@')) {
          player[field] = answerValue.toLowerCase();
        }
        break;

      case 'phone':
      case 'parent_phone':
      case 'emergency_phone': {
        const cleaned = answerValue.replace(/\D/g, '');
        if (cleaned.length >= 7) {
          player[field] = cleaned;
        }
        break;
      }

      default:
        player[field] = answerValue;
    }
  });

  if (!player.name && (tempNameParts.first_name || tempNameParts.last_name)) {
    player.name = `${tempNameParts.first_name || ''} ${tempNameParts.last_name || ''}`.trim();
    if (player.name) {
      console.log(`✅ Combined name from parts: ${player.name}`);
      nameDerivedFromParts = true;
    }
  }

  // Ensure first/last name fields are preserved even if a combined name was provided later.
  if (tempNameParts.first_name && !player.first_name) {
    player.first_name = tempNameParts.first_name;
  }
  if (tempNameParts.last_name && !player.last_name) {
    player.last_name = tempNameParts.last_name;
  }

  if (fieldMatches.length) {
    const matched = fieldMatches.filter((m) => m.field !== 'UNMATCHED').length;
    const unmatched = fieldMatches.length - matched;
    console.log(`Field extraction summary: ${matched} matched, ${unmatched} unmatched`);

    fieldMatches
      .filter((m) => m.field === 'UNMATCHED')
      .forEach((m) => console.log(`  ⚠️ Unmatched field: "${m.question}" = "${m.value}"`));
  }

  return player;
}

// ============================================================================
// MATCHING HELPERS
// ============================================================================

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

  if (!bestField) return null;

  let requiredThreshold = 20;
  if (FIELD_MAPPING[bestField].strict) {
    requiredThreshold = 60;
  }

  return bestScore >= requiredThreshold ? { field: bestField, score: bestScore } : null;
}

function calculateFieldScore(question, field) {
  const config = FIELD_MAPPING[field];
  if (!config) return 0;

  const questionLower = question.toLowerCase().trim();

  for (const exclude of config.excludeKeywords) {
    if (questionLower.includes(exclude.toLowerCase())) {
      return 0;
    }
  }

  const questionWords = questionLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  let score = 0;

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

// ============================================================================
// API INTEGRATION
// ============================================================================

function syncPlayersToAPI(players) {
  const baseUrl = CONFIG.API_BASE_URL.replace(/\/$/, '');
  const endpoint = `${baseUrl}/api/players/api-import/${CONFIG.TOURNAMENT_ID}`;

  const payload = {
    api_key: CONFIG.API_KEY,
    players,
    lookup_ratings: CONFIG.LOOKUP_RATINGS,
    auto_assign_sections: CONFIG.AUTO_ASSIGN_SECTIONS,
    source: 'google_forms'
  };

  console.log(`Calling API: ${endpoint}`);
  console.log(`Payload: ${JSON.stringify(payload).substring(0, 500)}...`);

  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: 30000
    });

    const status = response.getResponseCode();
    const content = response.getContentText();

    console.log(`API response status: ${status}`);
    console.log(`API response (first 300 chars): ${content.substring(0, 300)}`);

    if (status !== 200 && status !== 201) {
      return { success: false, error: `API returned status ${status}: ${content}` };
    }

    const result = JSON.parse(content);
    if (!result.success) {
      return { success: false, error: result.error || 'API returned success=false' };
    }

    return result;
  } catch (error) {
    console.error('API call error:', error);
    return { success: false, error: error.toString() };
  }
}

function sendConfirmationEmail(email, playerName) {
  try {
    GmailApp.sendEmail(
      email,
      `Registration Confirmation - ${CONFIG.TOURNAMENT_ID}`,
      `Dear ${playerName},\n\nYour registration has been received and imported into the tournament system.\n\nTournament: ${CONFIG.TOURNAMENT_ID}\n\nThank you!`
    );
    console.log(`Confirmation email sent to ${email}`);
  } catch (error) {
    console.log(`Failed to send confirmation email to ${email}: ${error}`);
  }
}

// ============================================================================
// DIAGNOSTICS & SETUP
// ============================================================================

function testFormProcessing() {
  try {
    const form = getActiveForm();
    const responses = form.getResponses();
    console.log('Total responses:', responses.length);

    if (!responses.length) {
      console.log('No responses found. Submit a test form first.');
      safeAlert('Submit a test response before running testFormProcessing.');
      return;
    }

    const latestResponse = responses[responses.length - 1];
    processFormResponse(latestResponse.getItemResponses());
    safeAlert('Form processing test executed. Check execution logs for details.');
  } catch (error) {
    console.error('Test processing error:', error);
    safeAlert('❌ Test processing error: ' + error.toString());
  }
}

function testSetup() {
  console.log('Testing API connectivity...');
  console.log('Form ID:', CONFIG.FORM_ID);
  console.log('API Base URL:', CONFIG.API_BASE_URL);
  console.log('Tournament ID:', CONFIG.TOURNAMENT_ID);

  const baseUrl = CONFIG.API_BASE_URL.replace(/\/$/, '');
  const endpoint = `${baseUrl}/api/players/api-import/${CONFIG.TOURNAMENT_ID}`;

  const testPayload = {
    api_key: CONFIG.API_KEY,
    players: [
      {
        name: 'API Connectivity Test Player',
        email: 'test-connection@example.com',
        source: 'connectivity_check'
      }
    ],
    source: 'form_api_test',
    lookup_ratings: false,
    auto_assign_sections: false
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true,
      timeout: 30000
    });

    const status = response.getResponseCode();
    const content = response.getContentText();
    console.log(`API Test Status: ${status}`);
    console.log(`API Test Response: ${content.substring(0, 300)}`);

    if (status === 200 || status === 201) {
      safeAlert('✅ API connection successful!\n\nA placeholder player named "API Connectivity Test Player" may have been created. You can safely delete it if it appears in your roster.');
    } else {
      safeAlert(`❌ API connection failed.\nStatus: ${status}\nResponse: ${content.substring(0, 300)}`);
    }
  } catch (error) {
    console.log('❌ API test error:', error.toString());
    safeAlert('❌ API test error: ' + error.toString());
  }
}

function checkTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    console.log(`Found ${triggers.length} project triggers:`);
    triggers.forEach((trigger, index) => {
      console.log(
        `${index + 1}. Function: ${trigger.getHandlerFunction()} | Event: ${trigger.getEventType()} | Source: ${trigger.getEventSource()}`
      );
    });

    if (triggers.length === 0) {
      safeAlert('No triggers configured. Add an onFormSubmit trigger for real-time imports.');
    }
  } catch (error) {
    console.error('Error checking triggers:', error);
    safeAlert('❌ Error checking triggers: ' + error.toString());
  }
}

function setup() {
  console.log('Setting up Google Forms integration...');
  console.log(`Tournament ID: ${CONFIG.TOURNAMENT_ID}`);
  console.log(`API Base URL: ${CONFIG.API_BASE_URL}`);

  if (!CONFIG.TOURNAMENT_ID) {
    safeAlert('Please set CONFIG.TOURNAMENT_ID before running setup().');
    return;
  }

  if (!CONFIG.API_KEY || CONFIG.API_KEY === 'demo-key-123') {
    safeAlert('Reminder: Replace CONFIG.API_KEY with your production API key before going live.');
  }

  safeAlert(
    'Setup complete!\n\nNext steps:\n1. Add an onFormSubmit trigger for real-time imports.\n2. Run testSetup() to verify the API connection.\n3. Submit a test form response.'
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function getActiveForm() {
  if (CONFIG.FORM_ID) {
    return FormApp.openById(CONFIG.FORM_ID);
  }
  return FormApp.getActiveForm();
}

// ============================================================================
// TEST HARNESS (OPTIONAL)
// ============================================================================
// The helpers below let you exercise the major code paths from the Script Editor.
// They are safe to leave in production, but feel free to remove them once testing is complete.

/**
 * Runs the primary smoke tests in sequence.
 * 1. setup()
 * 2. testSetup()
 * 3. testProcessFormResponseWithMockData()
 * 4. testSyncPlayersDirect()
 */
function runAllIntegrationTests() {
  Logger.log('🚀 Starting integration smoke tests...');

  try {
    setup();
    Logger.log('✓ setup() completed');
  } catch (error) {
    Logger.log('✗ setup() failed: ' + error);
  }

  try {
    testSetup();
    Logger.log('✓ testSetup() completed');
  } catch (error) {
    Logger.log('✗ testSetup() failed: ' + error);
  }

  try {
    testProcessFormResponseWithMockData();
    Logger.log('✓ testProcessFormResponseWithMockData() completed');
  } catch (error) {
    Logger.log('✗ testProcessFormResponseWithMockData() failed: ' + error);
  }

  try {
    testSyncPlayersDirect();
    Logger.log('✓ testSyncPlayersDirect() completed');
  } catch (error) {
    Logger.log('✗ testSyncPlayersDirect() failed: ' + error);
  }

  Logger.log('✅ Integration smoke tests finished (check Execution logs for details).');
}

/**
 * Mocks a minimal set of form responses and runs them through the
 * convert/process pipeline to verify field-matching logic.
 */
function testProcessFormResponseWithMockData() {
  const mockItemResponses = [
    {
      getItem: () => ({ getTitle: () => 'Player First Name' }),
      getResponse: () => 'Jane'
    },
    {
      getItem: () => ({ getTitle: () => 'Player Last Name' }),
      getResponse: () => 'Doe'
    },
    {
      getItem: () => ({ getTitle: () => 'Email Address' }),
      getResponse: () => 'jane.doe@example.com'
    },
    {
      getItem: () => ({ getTitle: () => 'Phone Number' }),
      getResponse: () => '(555) 010-0001'
    },
    {
      getItem: () => ({ getTitle: () => 'USCF ID' }),
      getResponse: () => '12345678'
    },
    {
      getItem: () => ({ getTitle: () => 'Section Preference' }),
      getResponse: () => 'Open'
    }
  ];

  Logger.log('Running mock form response through processFormResponse...');
  processFormResponse(mockItemResponses);
  Logger.log('Mock processing complete. Inspect logs for extracted fields.');
}

/**
 * Calls syncPlayersToAPI directly with a single placeholder player.
 * This will create (or attempt to create) a test player in your tournament.
 */
function testSyncPlayersDirect() {
  const result = syncPlayersToAPI([
    {
      name: 'Direct Sync Test Player',
      email: 'direct-sync-test@example.com',
      source: 'manual_test'
    }
  ]);

  Logger.log('syncPlayersToAPI result: ' + JSON.stringify(result));
  safeAlert('Direct sync test complete. Check Execution logs and tournament roster.');
}

/**
 * Optionally verifies Gmail permissions by sending yourself a confirmation email.
 */
function testSendConfirmationEmailDirect() {
  if (!CONFIG.SEND_CONFIRMATION_EMAILS) {
    safeAlert('Enable CONFIG.SEND_CONFIRMATION_EMAILS to test email sending.');
    return;
  }

  sendConfirmationEmail('your-email@example.com', 'Email Permission Test');
  safeAlert('Confirmation email dispatched (check your inbox).');
}



