import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Link as LinkIcon, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Loader,
  Save,
  X,
  Code,
  FileText,
  Play,
  RefreshCw
} from 'lucide-react';

interface GoogleFormsConnectorProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
}

interface FormsConfig {
  formId: string;
  apiBaseUrl: string;
  apiKey: string;
  checkInterval: number;
  sendConfirmationEmails: boolean;
  autoAssignSections: boolean;
  lookupRatings: boolean;
}

interface ConnectionStatus {
  formConnected: boolean;
  lastSync: string | null;
  responseCount: number;
  importedCount: number;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  error?: string;
}

const GoogleFormsConnector: React.FC<GoogleFormsConnectorProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentName
}) => {
  const [config, setConfig] = useState<FormsConfig>({
    formId: '',
    apiBaseUrl: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com',
    apiKey: 'demo-key-123',
    checkInterval: 5,
    sendConfirmationEmails: true,
    autoAssignSections: true,
    lookupRatings: true
  });

  const [status, setStatus] = useState<ConnectionStatus>({
    formConnected: false,
    lastSync: null,
    responseCount: 0,
    importedCount: 0,
    status: 'disconnected'
  });

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setupStep, setSetupStep] = useState<'intro' | 'configure' | 'test' | 'complete'>('intro');
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [fullScriptCode, setFullScriptCode] = useState<string>('');
  const [showScriptGenerator, setShowScriptGenerator] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>('');

  // Load saved configuration
  useEffect(() => {
    const loadFullScript = async () => {
      try {
        const response = await fetch('/google-apps-script.js');
        if (response.ok) {
          const scriptContent = await response.text();
          console.log(`Loaded complete script: ${scriptContent.split('\n').length} lines`);
          setFullScriptCode(scriptContent);
        } else {
          console.error('Failed to fetch script:', response.statusText);
          setTestMessage({ type: 'error', text: 'Could not load complete script file' });
        }
      } catch (err) {
        console.error('Error loading script:', err);
        setTestMessage({ type: 'error', text: 'Failed to load Google Apps Script' });
      }
    };
    
    if (isOpen) {
      loadConfiguration();
      loadFullScript();
    }
  }, [isOpen]);

  const loadConfiguration = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/google-forms-config`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.data.config || config);
          setStatus(data.data.status || status);
        }
      }
    } catch (err) {
      console.error('Failed to load configuration:', err);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/google-forms-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setTestMessage({ type: 'success', text: 'Configuration saved successfully!' });
        setTimeout(() => setTestMessage(null), 3000);
      } else {
        setTestMessage({ type: 'error', text: data.error || 'Failed to save configuration' });
      }
    } catch (err: any) {
      setTestMessage({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setStatus(prev => ({ ...prev, status: 'testing' }));
    setTestMessage({ type: 'info', text: 'Testing connection...' });

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/google-forms-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setStatus({
          formConnected: true,
          lastSync: new Date().toISOString(),
          responseCount: data.data?.responseCount || 0,
          importedCount: data.data?.importedCount || 0,
          status: 'connected'
        });
        setTestMessage({ type: 'success', text: 'Connection successful! Form is ready.' });
      } else {
        setStatus(prev => ({ ...prev, status: 'error', error: data.error }));
        setTestMessage({ type: 'error', text: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setStatus(prev => ({ ...prev, status: 'error', error: err.message }));
      setTestMessage({ type: 'error', text: err.message || 'Connection test failed' });
    } finally {
      setLoading(false);
    }
  };

  const getAppsScriptCode = async () => {
    try {
      // Try to fetch the complete google-apps-script.js file from the server
      const response = await fetch('/google-apps-script.js');
      if (response.ok) {
        const scriptContent = await response.text();
        return scriptContent;
      }
    } catch (err) {
      console.warn('Could not fetch complete script file, returning configuration template:', err);
    }
    
    // Fallback: return configuration template
    return `// ============================================================================
// GOOGLE APPS SCRIPT - COMPLETE CONFIGURATION TEMPLATE
// ============================================================================
// 
// This is a template. For the COMPLETE 1200+ line script, please:
// 1. Use the "Copy Complete Script" button below to get the full version
// 2. Or visit: https://github.com/your-repo/google-apps-script.js
//
// ============================================================================

const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: '${config.formId}',
  API_BASE_URL: '${config.apiBaseUrl}',
  API_KEY: '${config.apiKey}',
  TOURNAMENT_ID: '${tournamentId}',
  CHECK_INTERVAL: ${config.checkInterval},
  SEND_CONFIRMATION_EMAILS: ${config.sendConfirmationEmails},
  AUTO_ASSIGN_SECTIONS: ${config.autoAssignSections},
  LOOKUP_RATINGS: ${config.lookupRatings}
};`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCompleteScript = () => {
    const script: string = `/**
 * Google Apps Script for Real-time Chess Tournament Registration
 * 
 * This script runs DIRECTLY in Google Forms and automatically syncs player data
 * to your chess tournament system when new players submit the form.
 * 
 * Generated on: ${new Date().toLocaleString()}
 * Tournament ID: ${tournamentId}
 * Form ID: ${config.formId}
 * 
 * Setup:
 * 1. Open your Google Form
 * 2. Go to the three dots (⋮) → Script editor
 * 3. Replace the default code with this script
 * 4. Save and set up the trigger (onFormSubmit)
 */

// ============================================================================
// CONFIGURATION - AUTO-GENERATED
// ============================================================================

const CONFIG = {
  // Tournament API settings
  API_BASE_URL: '${config.apiBaseUrl}',
  API_KEY: '${config.apiKey}',
  TOURNAMENT_ID: '${tournamentId}',
  
  // Form settings
  FORM_ID: '${config.formId}',
  
  // Import options
  LOOKUP_RATINGS: ${config.lookupRatings},
  AUTO_ASSIGN_SECTIONS: ${config.autoAssignSections},
  SEND_CONFIRMATION_EMAILS: ${config.sendConfirmationEmails},
  CHECK_INTERVAL: ${config.checkInterval}
};

// ============================================================================
// FIELD MAPPING CONFIGURATION (Enhanced for First/Last Name)
// ============================================================================

const FIELD_MAPPING = {
  // --- Enhanced Name Fields for Splitting ---
  name: {
    keywords: ['name', 'player', 'full name', 'player name', 'first name and last name', 'full player name'],
    // Exclude if specific name parts are asked, so first_name/last_name get matched instead
    excludeKeywords: ['parent', 'guardian', 'emergency', 'first', 'last'], 
    required: true
  },
  first_name: { // New field for matching
    keywords: ['first name', 'given name', 'player first name'],
    excludeKeywords: ['parent', 'guardian', 'emergency'],
  },
  last_name: { // New field for matching
    keywords: ['last name', 'surname', 'family name', 'player last name'],
    excludeKeywords: ['parent', 'guardian', 'emergency'],
  },
  // ------------------------------------------
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
    excludeKeywords: ['parent', 'guardian', 'emergency'],
    strict: true // Requires higher match score
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
    strict: true // Requires higher match score
  },
  emergency_contact: {
    keywords: ['emergency', 'emergency contact', 'emergency name'],
    excludeKeywords: ['phone', 'number']
  },
  emergency_phone: {
    keywords: ['emergency phone', 'emergency number', 'emergency contact number'],
    excludeKeywords: [],
    strict: true // Requires higher match score
  },
  notes: {
    keywords: ['notes', 'comments', 'additional', 'special needs', 'dietary', 'restrictions'],
    excludeKeywords: []
  }
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * This function runs automatically when someone submits the form
 * Set this up as a trigger in Google Forms
 */
function onFormSubmit(e) {
  try {
    console.log('Form submission detected...');
    
    // Check if event object exists
    if (!e || !e.response) {
      console.log('No event object or response found. This might be a manual trigger.');
      
      // If no event, try to get the latest response manually
      const form = FormApp.getActiveForm();
      const responses = form.getResponses();
      
      if (responses.length === 0) {
        console.log('No form responses found');
        return;
      }
      
      // Get the most recent response
      const latestResponse = responses[responses.length - 1];
      const itemResponses = latestResponse.getItemResponses();
      
      console.log('Processing latest response manually...');
      processFormResponse(itemResponses);
      return;
    }
    
    // Normal processing with event object
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();
    
    processFormResponse(itemResponses);
    
  } catch (error) {
    console.error('Form submit error:', error);
  }
}

/**
 * Process form response data
 */
function processFormResponse(itemResponses) {
  try {
    if (!itemResponses || typeof itemResponses.forEach !== 'function') {
      console.log('No item responses found to process.');
      return;
    }

    // Convert form response to player object
    const player = convertFormResponseToPlayer(itemResponses);
    
    // Check for required field: name (either full name or first+last name combined)
    if (!player || !player.name) {
      console.log('Invalid form response: missing combined player name');
      return;
    }
    
    console.log(\`Processing player: \${player.name}\`);
    
    // Import the player immediately to your website
    const result = syncPlayerToAPI(player);
    
    if (result.success) {
      console.log(\`✅ Successfully imported: \${player.name}\`);
      
      // Optional: Send confirmation email
      if (player.email && CONFIG.SEND_CONFIRMATION_EMAILS) {
        sendConfirmationEmail(player.email, player.name);
      }
    } else {
      console.error(\`❌ Failed to import: \${player.name} - \${result.error}\`);
    }
    
  } catch (error) {
    console.error('Error processing form response:', error);
  }
}

/**
 * Convert a form response to a player object
 * Uses intelligent field matching with scoring
 */
function convertFormResponseToPlayer(itemResponses) {
  const player = {};
  const tempNameParts = {}; // Temporarily store first_name and last_name
  const fieldMatches = []; // For debugging
  
  // Helper to Title Case a string
  const toTitleCase = (str) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .replace(/\\b\\w/g, l => l.toUpperCase())
        .trim();
  };
  
  // Map form questions to player fields
  itemResponses.forEach((itemResponse, index) => {
    const question = itemResponse.getItem().getTitle();
    const answer = itemResponse.getResponse();
    
    if (!answer || !answer.toString().trim()) return;
    
    // Find best field match
    const match = findBestFieldMatch(question);
    
    if (match) {
      const field = match.field;
      const answerValue = answer.toString().trim();
      
      // Log match for debugging
      fieldMatches.push({
        index: index,
        question: question,
        field: field,
        score: match.score,
        value: answerValue.substring(0, 50) // First 50 chars
      });
      
      // Type-specific processing
      switch (field) {
        case 'first_name':
        case 'last_name':
          // Store name parts temporarily for later combination
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
          // Clean up name: title case
          player[field] = toTitleCase(answerValue);
          break;
          
        case 'email':
        case 'parent_email':
          // Validate email format
          if (answerValue.includes('@')) {
            player[field] = answerValue.toLowerCase().trim();
          }
          break;
          
        case 'phone':
        case 'parent_phone':
        case 'emergency_phone':
          // Clean up phone number
          const cleanedPhone = answerValue.replace(/\\D/g, '');
          if (cleanedPhone.length >= 7) {
              player[field] = cleanedPhone;
          }
          break;
          
        default:
          player[field] = answerValue;
      }
    } else {
      // Log unmatched fields for debugging
      fieldMatches.push({
        index: index,
        question: question,
        field: 'UNMATCHED',
        score: 0,
        value: answer.toString().substring(0, 50)
      });
    }
  });
  
  // --- LOGIC TO COMBINE FIRST NAME + LAST NAME ---
  if (!player.name && (tempNameParts.first_name || tempNameParts.last_name)) {
      player.name = \`\${tempNameParts.first_name || ''} \${tempNameParts.last_name || ''}\`.trim();
      if (player.name) {
          console.log(\`✅ Combined name from parts: \${player.name}\`);
      }
  }
  // --- END NAME COMBINATION LOGIC ---
  
  // Log field extraction for debugging
  if (fieldMatches.length > 0) {
    const matches = fieldMatches.filter(m => m.field !== 'UNMATCHED').length;
    const unmatched = fieldMatches.filter(m => m.field === 'UNMATCHED').length;
    console.log(\`Field extraction: \${matches} matched, \${unmatched} unmatched\`);
    
    // Log unmatched fields (might need mapping)
    fieldMatches.forEach(m => {
      if (m.field === 'UNMATCHED') {
        console.log(\`  ⚠️ Unmatched field: "\${m.question}" = "\${m.value}"\`);
      }
    });
  }
  
  return player;
}

/**
 * Find the best field match for a form question
 * Returns field name with highest score
 */
function findBestFieldMatch(question) {
  let bestField = null;
  let bestScore = 0;
  const scores = {};

  for (const field in FIELD_MAPPING) {
    const score = calculateFieldScore(question, field);
    scores[field] = score;
    
    if (score > bestScore) {
      bestScore = score;
      bestField = field;
    }
  }
  
  // Only return match if score is above threshold
  let requiredThreshold = 20; // Default threshold
  
  if (bestField && FIELD_MAPPING[bestField].strict) {
      requiredThreshold = 60;
  }
  
  if (bestScore >= requiredThreshold) {
    return { field: bestField, score: bestScore };
  }
  
  return null;
}

/**
 * Calculate match score for a question to a field (Enhanced Word Overlap)
 * Higher score = better match
 */
function calculateFieldScore(question, field) {
  const config = FIELD_MAPPING[field];
  if (!config) return 0;
  
  const questionLower = question.toLowerCase().trim();
  let score = 0;
  
  // 1. Check for Exclude Keywords 
  for (const exclude of config.excludeKeywords) {
    if (questionLower.includes(exclude.toLowerCase())) {
      return 0; // Exclude this match entirely
    }
  }
  
  // 2. Tokenize the question into words (ignore short words like 'is', 'a', 'the')
  const questionWords = questionLower.replace(/[^a-z0-9\\s]/g, ' ').split(/\\s+/).filter(w => w.length > 2);
  // 3. Check for Keyword Matches 
  for (const keyword of config.keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Tokenize keyword
    const keywordWords = keywordLower.replace(/[^a-z0-9\\s]/g, ' ').split(/\\s+/).filter(w => w.length > 2);
    let overlapCount = 0;
    
    keywordWords.forEach(kw => {
      if (questionWords.includes(kw)) {
        overlapCount += 1;
      }
    });
    // Score based on overlap
    if (overlapCount > 0) {
      score += overlapCount * 25; 
      if (overlapCount === keywordWords.length && keywordWords.length > 0) {
          score += 20;
      }
    }
    
    // Existing high-value matches for certainty
    if (questionLower === keywordLower) {
      score += 100;
    }
    else if (questionLower.includes(keywordLower)) {
      score += 30;
    }
  }
  
  return score;
}

/**
 * Sync player to your tournament API
 */
function syncPlayerToAPI(player) {
  const payload = {
    api_key: CONFIG.API_KEY,
    players: [player],
    lookup_ratings: CONFIG.LOOKUP_RATINGS,
    auto_assign_sections: CONFIG.AUTO_ASSIGN_SECTIONS,
    source: 'google_forms'
  };
  
  const endpoint = \`\${CONFIG.API_BASE_URL}/api/players/api-import/\${CONFIG.TOURNAMENT_ID}\`;
  
  console.log(\`Calling API: \${endpoint}\`);
  
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
    
    console.log(\`API Response Status: \${status}\`);
    
    if (status !== 200 && status !== 201) {
      throw new Error(\`API returned status \${status}: \${content}\`);
    }
    
    const result = JSON.parse(content);
    
    if (!result.success) {
      throw new Error(result.error || 'API returned success: false');
    }
    
    return { success: true, data: result.data };
    
  } catch (error) {
    console.error(\`API call error: \${error.toString()}\`);
    return { success: false, error: error.toString() };
  }
}

/**
 * Send confirmation email
 */
function sendConfirmationEmail(email, playerName) {
  try {
    GmailApp.sendEmail(
      email,
      \`Registration Confirmation - \${CONFIG.TOURNAMENT_ID}\`,
      \`Dear \${playerName},\\n\\nYour registration has been received and imported into the tournament system.\\n\\nTournament: \${CONFIG.TOURNAMENT_ID}\\n\\nThank you!\\n\\nIf you have any questions, please contact the tournament organizer.\`
    );
    console.log(\`Confirmation email sent to \${email}\`);
  } catch (error) {
    console.log(\`Failed to send confirmation email to \${email}: \${error.toString()}\`);
  }
}

/**
 * Manual test function - run this to test form processing
 */
function testFormProcessing() {
  try {
    console.log('Testing form processing...');
    
    // Get the form
    const form = FormApp.getActiveForm();
    console.log('Form title:', form.getTitle());
    
    // Get all responses
    const responses = form.getResponses();
    console.log('Total responses:', responses.length);
    
    if (responses.length === 0) {
      console.log('No responses found. Submit a test form first.');
      return;
    }
    
    // Process the latest response
    const latestResponse = responses[responses.length - 1];
    const itemResponses = latestResponse.getItemResponses();
    
    console.log('Processing latest response...');
    processFormResponse(itemResponses);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

/**
 * Test function - run this to test the setup
 */
function testSetup() {
  console.log('Testing Google Forms setup...');
  console.log('Form ID:', CONFIG.FORM_ID);
  console.log('API Base URL:', CONFIG.API_BASE_URL);
  console.log('Tournament ID:', CONFIG.TOURNAMENT_ID);
  
  // Build endpoint safely
  const baseUrl = CONFIG.API_BASE_URL.replace(/\/$/, '');
  const endpoint = \`\${baseUrl}/api/players/api-import/\${CONFIG.TOURNAMENT_ID}\`;
  const testPayload = {
    api_key: CONFIG.API_KEY,
    players: [{
      name: 'API Connectivity Test Player',
      email: 'test-connection@example.com',
      source: 'connectivity_check'
    }],
    source: 'form_api_test',
    lookup_ratings: false,
    auto_assign_sections: false
  };
  
  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    });
    
    const status = response.getResponseCode();
    const content = response.getContentText();
    console.log(\`API Test Status: \${status}\`);
    console.log(\`API Test Response: \${content.substring(0, 300)}\`);
    
    if (status === 200 || status === 201) {
      console.log('✅ API connection successful!');
      safeAlert('✅ API connection successful!\\n\\nA test player named \"API Connectivity Test Player\" may have been added. You can safely remove this placeholder record.');
    } else {
      console.log('❌ API connection failed');
      safeAlert(\`❌ API connection failed.\\nStatus: \${status}\\nResponse: \${content.substring(0, 300)}\`);
    }
  } catch (error) {
    console.log('❌ API test error:', error.toString());
    safeAlert('❌ API test error: ' + error.toString());
  }
}

/**
 * Check triggers function
 */
function checkTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    
    console.log('Current triggers:');
    triggers.forEach((trigger, index) => {
      console.log(\`\${index + 1}. Function: \${trigger.getHandlerFunction()}\`);
      console.log(\`   Event: \${trigger.getEventType()}\`);
      console.log(\`   Source: \${trigger.getEventSource()}\`);
      console.log('---');
    });
    
    if (triggers.length === 0) {
      console.log('No triggers found. You need to set up the onFormSubmit trigger.');
    }
  } catch (error) {
    console.error('Error checking triggers:', error);
  }
}

/**
 * Setup function - run this once to configure everything
 */
function setup() {
  console.log('Setting up Google Forms integration...');
  console.log('Configuration:');
  console.log('- Tournament ID:', CONFIG.TOURNAMENT_ID);
  console.log('- Form ID:', CONFIG.FORM_ID);
  console.log('- API Base URL:', CONFIG.API_BASE_URL);
  console.log('- Lookup Ratings:', CONFIG.LOOKUP_RATINGS);
  console.log('- Auto Assign Sections:', CONFIG.AUTO_ASSIGN_SECTIONS);
  console.log('- Send Emails:', CONFIG.SEND_CONFIRMATION_EMAILS);
  
  console.log('\\nNext steps:');
  console.log('1. Set up the onFormSubmit trigger in the Triggers section');
  console.log('2. Run testSetup() to verify the connection');
  console.log('3. Submit a test form response');
  console.log('4. Check the Executions tab for logs');
}

// ============================================================================
// END OF GOOGLE FORMS SCRIPT
// ============================================================================
// 
// This is the COMPLETE Google Apps Script
// Ready to copy directly to Google Forms
//
// Generated on: ${new Date().toLocaleString()}
// Tournament: ${tournamentId}
// Form: ${config.formId}
//
// ============================================================================`;
    
    setGeneratedScript(script);
    setShowScriptGenerator(true);
    return script;
  };

  // Build the complete code to copy (FORMS_CONFIG + full script)
  const getCompleteCopyCode = () => {
    // Create the tournament-specific FORMS_CONFIG
    const formsConfig = `const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: '${config.formId}',
  API_BASE_URL: '${config.apiBaseUrl}',
  API_KEY: '${config.apiKey}',
  TOURNAMENT_ID: '${tournamentId}',
  CHECK_INTERVAL: ${config.checkInterval},
  SEND_CONFIRMATION_EMAILS: ${config.sendConfirmationEmails},
  AUTO_ASSIGN_SECTIONS: ${config.autoAssignSections},
  LOOKUP_RATINGS: ${config.lookupRatings}
};`;
    
    // Find where the hardcoded FORMS_CONFIG ends in the full script
    // Look for "let FORMS_CONFIG = {" or "const FORMS_CONFIG = {" and replace it
    const configStartPattern = /let FORMS_CONFIG = \{[\s\S]*?\};/;
    const configEndPattern = /const FORMS_CONFIG = \{[\s\S]*?\};/;
    
    let updatedScript = fullScriptCode;
    
    // Try to replace the existing FORMS_CONFIG
    if (configStartPattern.test(updatedScript)) {
      updatedScript = updatedScript.replace(configStartPattern, formsConfig);
    } else if (configEndPattern.test(updatedScript)) {
      updatedScript = updatedScript.replace(configEndPattern, formsConfig);
    }
    
    return updatedScript;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LinkIcon size={24} />
            <div>
              <h2 className="text-xl font-bold">Google Forms Connector</h2>
              <p className="text-blue-100 text-sm">{tournamentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-blue-700 p-2 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Info Section */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900 font-semibold mb-2">Google Apps Script Setup</p>
            <p className="text-sm text-blue-800">
              Copy the complete code below (including your tournament-specific configuration) and paste it into your Google Apps Script editor.
            </p>
          </div>

          <div className="mb-8 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-indigo-900 font-semibold mb-2">Need Microsoft Forms or Other Providers?</p>
            <p className="text-sm text-indigo-800 mb-3">
              Use our Power Automate + universal webhook guide to connect Microsoft Forms, Typeform, Jotform, Wufoo, Formstack, and Cognito Forms directly to this tournament.
            </p>
            <a
              href="/docs/MICROSOFT_FORMS_POWER_AUTOMATE_SETUP.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
            >
              <ExternalLink size={16} /> Open Microsoft Forms & Webhook Guide
            </a>
          </div>

          {/* Tournament-Specific Configuration Preview */}
          <div className="border-2 border-amber-500 rounded-lg p-4 bg-amber-50 mb-6">
            <p className="font-semibold text-amber-900 mb-3">⚙️ Your Tournament Configuration:</p>
            <div className="bg-gray-900 text-amber-400 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-gray-700">
              <pre>{`const FORMS_CONFIG = {
  ENABLE_FORM_IMPORT: true,
  FORM_ID: '${config.formId}',
  API_BASE_URL: '${config.apiBaseUrl}',
  API_KEY: '${config.apiKey}',
  TOURNAMENT_ID: '${tournamentId}',
  CHECK_INTERVAL: ${config.checkInterval},
  SEND_CONFIRMATION_EMAILS: ${config.sendConfirmationEmails},
  AUTO_ASSIGN_SECTIONS: ${config.autoAssignSections},
  LOOKUP_RATINGS: ${config.lookupRatings}
};`}</pre>
            </div>
          </div>

          {/* Complete Script Code */}
          <div className="border-2 border-blue-600 rounded-lg p-6 bg-gradient-to-br from-gray-50 to-gray-100 mb-6">
            <div className="mb-4">
              <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Code size={20} /> Complete Google Apps Script (1200+ Lines)
              </p>
              <p className="text-sm text-gray-600 mb-4">
                The complete script is ready to copy. Choose one option below:
              </p>
            </div>

            {/* Option 1: Direct Link */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="font-semibold text-green-900 mb-2">✅ Recommended: Copy from File</p>
              <a
                href="/GOOGLE_APPS_SCRIPT_COMPLETE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
              >
                <ExternalLink size={18} />
                Open Complete Script in New Tab
              </a>
              <p className="text-xs text-green-700 mt-2">
                Opens the complete 1200+ line script - easy to copy all at once
              </p>
            </div>

            {/* Option 2: Download Link */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="font-semibold text-blue-900 mb-2">📥 Or Download Raw File</p>
              <a
                href="/google-apps-script.js"
                download="google-apps-script.js"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                <FileText size={18} />
                Download google-apps-script.js
              </a>
              <p className="text-xs text-blue-700 mt-2">
                Downloads the raw JavaScript file for direct copy
              </p>
            </div>

            {/* Option 3: Generate Custom Script */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="font-semibold text-purple-900 mb-2">🚀 Generate Custom Script</p>
              <button
                onClick={generateCompleteScript}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
              >
                <Code size={18} />
                Generate Complete Script (1300+ lines)
              </button>
              <p className="text-xs text-purple-700 mt-2">
                Generates a complete script with your specific tournament configuration
              </p>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
            <p className="font-semibold text-amber-900 mb-3">📋 Setup Instructions:</p>
            <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
              <li>Open your Google Sheet</li>
              <li>Click <code className="bg-amber-100 px-1 rounded">Extensions → Apps Script</code></li>
              <li>Delete all existing code</li>
              <li>Paste the COMPLETE code you just copied (includes your tournament config)</li>
              <li>Save <code className="bg-amber-100 px-1 rounded">Ctrl+S</code> or <code className="bg-amber-100 px-1 rounded">Cmd+S</code></li>
              <li>Run the <code className="bg-amber-100 px-1 rounded">setup()</code> function in the console</li>
              <li>Done! Forms will auto-import every 5 minutes</li>
            </ol>
          </div>

          {/* Documentation Links */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
            <p className="font-semibold text-blue-900 mb-3">📚 Documentation & Help</p>
            <div className="space-y-2">
              <a
                href="/docs/GOOGLE_FORMS_SETUP_QUICK_START.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink size={16} /> Quick Start Guide (5 minutes)
              </a>
              <a
                href="/docs/GOOGLE_FORMS_DYNAMIC_CONFIG.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink size={16} /> Complete Configuration Guide
              </a>
              <a
                href="/docs/DEPLOYMENT_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink size={16} /> Deployment Instructions
              </a>
              <a
                href="/docs/MICROSOFT_FORMS_POWER_AUTOMATE_SETUP.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink size={16} /> Microsoft Forms & Other Form Services
              </a>
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-8">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Script Generator Modal */}
        {showScriptGenerator && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Code size={24} />
                  <div>
                    <h2 className="text-xl font-bold">Generated Google Apps Script</h2>
                    <p className="text-purple-100 text-sm">Complete 1300+ line script with your configuration</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScriptGenerator(false)}
                  className="hover:bg-purple-700 p-2 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-900 font-semibold mb-2">⚠️ Important Instructions:</p>
                  <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                    <li>Copy the ENTIRE script below (all 1300+ lines)</li>
                    <li>Open your Google Form → three dots (⋮) → Script editor</li>
                    <li>Delete any existing code and paste this complete script</li>
                    <li>Save the script (Ctrl+S or Cmd+S)</li>
                    <li>Set up the trigger: Triggers → Add Trigger → onFormSubmit → On form submit</li>
                  </ol>
                </div>

                {/* Generated Script */}
                <div className="bg-gray-900 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-semibold">Complete Google Apps Script</h3>
                    <button
                      onClick={() => copyToClipboard(generatedScript)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                    >
                      <Copy size={16} />
                      {copied ? 'Copied!' : 'Copy Script'}
                    </button>
                  </div>
                  <textarea
                    value={generatedScript}
                    readOnly
                    className="w-full h-96 bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-xs resize-none border border-gray-700"
                    style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
                  />
                </div>

                {/* Quick Setup Steps */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">🚀 Quick Setup Steps:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                        <div>
                          <p className="font-semibold text-blue-900">Open Google Form</p>
                          <p className="text-sm text-blue-700">Go to your Google Form and click the three dots (⋮) → Script editor</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                        <div>
                          <p className="font-semibold text-blue-900">Paste Script</p>
                          <p className="text-sm text-blue-700">Delete existing code and paste the complete script above</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                        <div>
                          <p className="font-semibold text-blue-900">Save & Test</p>
                          <p className="text-sm text-blue-700">Save (Ctrl+S) and run setup() in the console</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                        <div>
                          <p className="font-semibold text-blue-900">Set Trigger</p>
                          <p className="text-sm text-blue-700">Triggers → Add Trigger → onFormSubmit → On form submit</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => setShowScriptGenerator(false)}
                    className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
                  >
                    Close Generator
                  </button>
                  <button
                    onClick={() => {
                      copyToClipboard(generatedScript);
                      setShowScriptGenerator(false);
                    }}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                  >
                    Copy & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleFormsConnector;
