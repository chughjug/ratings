// ============================================================================
// COPY THIS INTO YOUR GOOGLE APPS SCRIPT
// ============================================================================
// 
// Steps:
// 1. Go to your Google Sheet
// 2. Extensions → Apps Script
// 3. Replace all code with the content below
// 4. Save (Ctrl+S or Cmd+S)
// 5. Run: setup() function
//

// ============================================================================
// FORMS CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

const FORMS_CONFIG = {
  // Set to true to enable automatic form response import
  ENABLE_FORM_IMPORT: true,
  
  // Your Google Form ID (get from form URL: https://forms.google.com/u/1/d/FORM_ID/edit)
  FORM_ID: '15fTL-FenfGKK3s_6IMcu6FeeYFONIyJUD9s0eWSqCS4',
  
  // API Configuration
  API_BASE_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/',
  API_KEY: 'demo-key-123',
  TOURNAMENT_ID: '399a6188-406c-45ea-b078-ae37a0fdd509',
  
  // How often to check for new responses (in minutes)
  CHECK_INTERVAL: 5,
  
  // Optional: Response limit per import
  RESPONSE_LIMIT: 100,
  
  // Additional options
  SEND_CONFIRMATION_EMAILS: true,        // Send confirmation email after import
  AUTO_ASSIGN_SECTIONS: true,            // Automatically assign sections based on rating
  LOOKUP_RATINGS: true                   // Automatically look up USCF ratings
};

// ============================================================================
// ADVANCED FIELD MAPPING CONFIGURATION
// ============================================================================

const FIELD_MAPPING = {
  name: {
    keywords: ['name', 'player', 'full name', 'player name', 'first name and last name', 'full player name'],
    excludeKeywords: ['parent', 'guardian', 'emergency'],
    required: true
  },
  uscf_id: {
    keywords: ['uscf', 'uscf id', 'uscf number', 'member id', 'membership id', 'chess id', 'player id'],
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
    excludeKeywords: ['parent', 'guardian', 'emergency']
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
    excludeKeywords: []
  },
  emergency_contact: {
    keywords: ['emergency', 'emergency contact', 'emergency name'],
    excludeKeywords: ['phone', 'number']
  },
  emergency_phone: {
    keywords: ['emergency phone', 'emergency number', 'emergency contact number'],
    excludeKeywords: []
  },
  notes: {
    keywords: ['notes', 'comments', 'additional', 'special needs', 'dietary', 'restrictions'],
    excludeKeywords: []
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function safeAlert(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    console.log('Alert: ' + message);
  }
}

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
  
  for (const keyword of config.keywords) {
    const keywordLower = keyword.toLowerCase();
    if (questionLower === keywordLower) {
      score += 100;
    } else if (questionLower.startsWith(keywordLower)) {
      score += 50;
    } else if (questionLower.endsWith(keywordLower)) {
      score += 50;
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
  
  if (bestScore >= 20) {
    return { field: bestField, score: bestScore };
  }
  
  return null;
}

function convertFormResponseToPlayer(itemResponses) {
  const player = {};
  const fieldMatches = [];
  
  itemResponses.forEach((itemResponse, index) => {
    const question = itemResponse.getItem().getTitle();
    const answer = itemResponse.getResponse();
    
    if (!answer || !answer.trim()) return;
    
    const match = findBestFieldMatch(question);
    
    if (match) {
      const field = match.field;
      const answerValue = answer.toString().trim();
      
      fieldMatches.push({
        index: index,
        question: question,
        field: field,
        score: match.score,
        value: answerValue.substring(0, 50)
      });
      
      switch (field) {
        case 'rating':
          const rating = parseFloat(answerValue);
          if (!isNaN(rating) && rating > 0) {
            player.rating = rating;
          }
          break;
          
        case 'name':
        case 'parent_name':
        case 'emergency_contact':
          player[field] = answerValue
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
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
          player[field] = answerValue.replace(/\D/g, '');
          break;
          
        default:
          player[field] = answerValue;
      }
    } else {
      fieldMatches.push({
        index: index,
        question: question,
        field: 'UNMATCHED',
        score: 0,
        value: answer.toString().substring(0, 50)
      });
    }
  });
  
  if (fieldMatches.length > 0) {
    const matches = fieldMatches.filter(m => m.field !== 'UNMATCHED').length;
    const unmatched = fieldMatches.filter(m => m.field === 'UNMATCHED').length;
    console.log(`Field extraction: ${matches} matched, ${unmatched} unmatched`);
    
    fieldMatches.forEach(m => {
      if (m.field === 'UNMATCHED') {
        console.log(`  ⚠️ Unmatched field: "${m.question}" = "${m.value}"`);
      }
    });
  }
  
  return player;
}

function syncPlayersToAPI(players) {
  const payload = {
    api_key: FORMS_CONFIG.API_KEY,
    players: players,
    lookup_ratings: FORMS_CONFIG.LOOKUP_RATINGS,
    auto_assign_sections: FORMS_CONFIG.AUTO_ASSIGN_SECTIONS,
    source: 'google_sheets'
  };
  
  const baseURL = FORMS_CONFIG.API_BASE_URL.replace(/\/$/, '');
  const endpoint = `${baseURL}/api/players/api-import/${FORMS_CONFIG.TOURNAMENT_ID}`;
  
  console.log(`Calling API: ${endpoint}`);
  
  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: 30000
    });
    
    const status = response.getResponseCode();
    const content = response.getContentText();
    
    console.log(`API Response Status: ${status}`);
    
    if (content.trim().startsWith('<')) {
      throw new Error(`API returned HTML error page (status ${status}).`);
    }
    
    if (status !== 200 && status !== 201) {
      throw new Error(`API returned status ${status}: ${content}`);
    }
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Failed to parse API response as JSON`);
    }
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'API returned success: false');
    }
    
    console.log(`API call successful. Imported ${result.data.imported_count || 0} players.`);
    return result.data;
    
  } catch (error) {
    console.error(`API call error: ${error.toString()}`);
    throw error;
  }
}

function checkFormResponses() {
  if (!FORMS_CONFIG.ENABLE_FORM_IMPORT) {
    console.log('Form import is disabled');
    return;
  }
  
  try {
    console.log('Checking for new form responses...');
    
    const form = FormApp.openById(FORMS_CONFIG.FORM_ID);
    const responses = form.getResponses();
    
    if (responses.length === 0) {
      console.log('No form responses found');
      return;
    }
    
    const lastImportTime = getLastFormImportTime();
    
    const newResponses = responses.filter(response => {
      const timestamp = response.getTimestamp();
      return !lastImportTime || timestamp > lastImportTime;
    });
    
    if (newResponses.length === 0) {
      console.log('No new responses since last import');
      return;
    }
    
    console.log(`Found ${newResponses.length} new form responses`);
    
    const players = newResponses.map(response => {
      const itemResponses = response.getItemResponses();
      return convertFormResponseToPlayer(itemResponses);
    }).filter(player => player && player.name);
    
    if (players.length === 0) {
      console.log('No valid player data found in responses');
      return;
    }
    
    const result = syncPlayersToAPI(players);
    
    if (result && result.imported_count) {
      setLastFormImportTime(new Date());
      
      players.forEach(player => {
        if (player.email && FORMS_CONFIG.SEND_CONFIRMATION_EMAILS) {
          sendConfirmationEmail(player.email, player.name);
        }
      });
    }
  } catch (error) {
    console.error('Form response check error:', error);
  }
}

function getLastFormImportTime() {
  const properties = PropertiesService.getScriptProperties();
  const lastTime = properties.getProperty('lastFormImportTime');
  return lastTime ? new Date(lastTime) : null;
}

function setLastFormImportTime(time) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('lastFormImportTime', time.toISOString());
}

function sendConfirmationEmail(email, playerName) {
  try {
    GmailApp.sendEmail(
      email,
      `Registration Confirmation - ${FORMS_CONFIG.TOURNAMENT_ID}`,
      `Dear ${playerName},\n\nYour registration has been received and imported into the tournament system.\n\nTournament: ${FORMS_CONFIG.TOURNAMENT_ID}\n\nThank you!\n\nIf you have any questions, please contact the tournament organizer.`
    );
    console.log(`Confirmation email sent to ${email}`);
  } catch (error) {
    console.log(`Failed to send confirmation email to ${email}: ${error.toString()}`);
  }
}

function setupFormImport() {
  if (!FORMS_CONFIG.ENABLE_FORM_IMPORT) {
    console.log('Form import is disabled. Set ENABLE_FORM_IMPORT to true to enable.');
    return;
  }
  
  if (!FORMS_CONFIG.FORM_ID || FORMS_CONFIG.FORM_ID === 'your-form-id-here') {
    const errorMsg = 'Error: Please set your FORM_ID in FORMS_CONFIG before setting up form import.';
    console.error(errorMsg);
    safeAlert(errorMsg);
    return;
  }
  
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onFormSubmit' || 
        trigger.getHandlerFunction() === 'checkFormResponses') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('checkFormResponses')
    .timeBased()
    .everyMinutes(FORMS_CONFIG.CHECK_INTERVAL)
    .create();
  
  console.log('Form import triggers set up successfully!');
  const successMsg = '✅ Form import configured! New form responses will be checked every ' + FORMS_CONFIG.CHECK_INTERVAL + ' minutes and automatically imported.';
  console.log(successMsg);
  
  try {
    safeAlert(successMsg);
  } catch (e) {
    console.log('UI not available - setup completed successfully (check console)');
  }
}

function onOpen(e) {
  try {
    if (FORMS_CONFIG.ENABLE_FORM_IMPORT) {
      const ui = SpreadsheetApp.getUi();
      ui.createMenu('Google Forms Import')
        .addItem('Setup Form Import (Auto)', 'setupFormImport')
        .addItem('Check for New Responses Now', 'checkFormResponses')
        .addToUi();
    }
    
    console.log('✅ Google Apps Script initialized');
    console.log(`✓ Form Import: ${FORMS_CONFIG.ENABLE_FORM_IMPORT ? 'Enabled' : 'Disabled'}`);
    
  } catch (error) {
    console.error('Error in onOpen:', error);
  }
}

// ============================================================================
// RUN THIS TO START
// ============================================================================

function setup() {
  setupFormImport();
}

