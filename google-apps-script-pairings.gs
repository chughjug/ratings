/**
 * Simplified Chess Tournament Pairings Email Notification System
 * Core functionality: Receive webhook -> Send personalized email to each player.
 */

// --- CONFIGURATION ---
const CONFIG = {
  // Email template subject
  SUBJECT_TEMPLATE: 'Round {round} Pairings - {tournamentName}',
};

/**
 * Global function to get the actual sender email (the script owner).
 * This resolves the common "Invalid argument" error.
 */
function getSenderEmail() {
  // Session.getEffectiveUser() works reliably when the script is deployed to run as "me" (the owner).
  return Session.getEffectiveUser().getEmail(); 
}

// --- WEBHOOK HANDLER ---

/**
 * Main webhook receiver - handles POST requests from Chess Tournament backend
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.event !== 'pairings_generated') {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid webhook event type' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    processPairingsNotification(payload);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Notification processed successfully' })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Webhook error:', error.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper: Handle GET requests (status/test)
 */
function doGet(e) {
  const testEmail = 'aarushchugh1@gmail.com'; // Hardcode test recipient
  if (e.parameter.action === 'test') {
    return handleTestRequest(testEmail);
  }
  
  // Simplified Status Page
  const html = `<h1>Chess Pairing Notifier Active</h1>
    <p>Webhook is ready. Sender email set to: <strong>${getSenderEmail()}</strong></p>
    <p>To run a test, click here: <a href="?action=test">Send Test Email to ${testEmail}</a></p>`;
    
  return HtmlService.createHtmlOutput(html);
}

/**
 * Helper: Run a test scenario
 */
function handleTestRequest(testEmail) {
  // All emails are directed to your test address for reliable testing
  const testPayload = {
    event: 'pairings_generated',
    tournament: { id: 'test', name: 'Simplified Test Tournament', format: 'swiss', rounds: 3 },
    round: 1,
    pairings: [
      {
        board: 1,
        white: { id: 'p1', name: 'Test Alice (You)', rating: 1800, email:'aarushchugh1@gmail.com' },
        black: { id: 'p2', name: 'Test Bob (Opponent)', rating: 1750, email: 'aarushchugh1@gmail.com' }, // Sending Bob's email to you too
        section: 'Open'
      }
    ]
  };
  
  try {
    processPairingsNotification(testPayload);
    return HtmlService.createHtmlOutput(`<h1>✅ Test Email Sent</h1><p>Check <strong>${testEmail}</strong> for personalized pairing details (you should receive two test emails: one as Alice, one as Bob).</p>`);
  } catch (error) {
    return HtmlService.createHtmlOutput(`<h1>❌ Test Failed</h1><p>Error: ${error.toString()}</p><p>Check the Apps Script logs for details.</p>`);
  }
}

// --- CORE LOGIC ---

/**
 * Process pairings notification and send personalized emails to each player
 */
function processPairingsNotification(payload) {
  const { tournament, round, pairings } = payload;
  
  if (!pairings || pairings.length === 0) {
    console.warn('No pairings found in payload');
    return;
  }
  
  const playersToEmail = getPlayerPairingDetails(pairings);
  
  playersToEmail.forEach(playerInfo => {
    if (!playerInfo.email || !playerInfo.email.includes('@') || playerInfo.pairings.length === 0) {
      console.warn(`Skipping email: Invalid address or no pairing for ${playerInfo.playerName}`);
      return;
    }

    try {
      const emailContent = buildPersonalizedEmailContent(tournament, round, playerInfo);
      
      GmailApp.sendEmail(
        playerInfo.email,
        emailContent.subject,
        emailContent.plainText,
        {
          htmlBody: emailContent.html,
          from: getSenderEmail(), // Dynamically set sender
          name: 'Tournament Director'
        }
      );
      
      console.log(`Email sent to ${playerInfo.playerName} (${playerInfo.email})`);
      
    } catch (error) {
      console.error(`Failed to send email to ${playerInfo.playerName}:`, error.toString());
    }
  });
}

/**
 * Helper function to structure player-centric pairing data from raw pairings.
 */
function getPlayerPairingDetails(pairings) {
  const playerPairings = new Map();
  
  pairings.forEach(pairing => {
    const processPlayer = (player, opponent, color) => {
      const key = player.id || player.name; 
      if (!key) return;
      
      if (!playerPairings.has(key)) {
        playerPairings.set(key, {
          playerName: player.name || 'Unknown Player',
          playerRating: player.rating || 'N/A',
          email: player.email || null,
          pairings: []
        });
      }
      
      playerPairings.get(key).pairings.push({
        board: pairing.board,
        color: color,
        opponent: {
          name: opponent.name || 'TBD',
          rating: opponent.rating || 'N/A'
        },
        section: pairing.section
      });
    };
    
    if (pairing.white && pairing.black) {
      processPlayer(pairing.white, pairing.black, 'white');
      processPlayer(pairing.black, pairing.white, 'black');
    }
  });
  
  return Array.from(playerPairings.values());
}


/**
 * Build personalized email content for a player
 */
function buildPersonalizedEmailContent(tournament, round, playerInfo) {
  const subject = CONFIG.SUBJECT_TEMPLATE
    .replace('{round}', round)
    .replace('{tournamentName}', tournament.name);
  
  const pairing = playerInfo.pairings[0];
  const colorDisplay = pairing.color === 'white' ? '⚪ White' : '⚫ Black';
  const colorStyle = pairing.color === 'white' ? '#f0f0f0' : '#333333';
  const textColor = pairing.color === 'white' ? '#000000' : '#ffffff';
  
  // Build HTML content
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">
        Your Pairing for Round ${round}
      </h1>
      
      <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #2c3e50;">${tournament.name}</h2>
        <p style="margin: 5px 0;">
          <strong>Round:</strong> ${round} of ${tournament.rounds}<br>
          <strong>Section:</strong> ${pairing.section}<br>
        </p>
      </div>
      
      <h2 style="color: #2c3e50; text-align: center; margin: 30px 0;">Your Game Details</h2>
      
      <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="font-size: 14px; color: #7f8c8d; margin: 5px 0;">
          <strong>Board #${pairing.board}</strong>
        </p>
        
        <div style="margin: 20px 0;">
          <div style="background-color: ${colorStyle}; color: ${textColor}; padding: 15px; border-radius: 5px; margin-bottom: 10px;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">${colorDisplay}</p>
            <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">${playerInfo.playerName}</p>
            <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">Rating: ${playerInfo.playerRating}</p>
          </div>
          
          <div style="font-size: 24px; text-align: center; color: #3498db; margin: 10px 0;">vs</div>
          
          <div style="background-color: ${pairing.color === 'white' ? '#333333' : '#f0f0f0'}; color: ${pairing.color === 'white' ? '#ffffff' : '#000000'}; padding: 15px; border-radius: 5px; margin-top: 10px;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">${pairing.color === 'white' ? '⚫ Black' : '⚪ White'}</p>
            <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">${pairing.opponent.name}</p>
            <p style="margin: 5px 0; font-size: 14px; opacity: 0.9;">Rating: ${pairing.opponent.rating}</p>
          </div>
        </div>
      </div>
      
      <div style="background-color: #e8f4f8; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0;">
        <p style="margin: 0; color: #2c3e50;">
          ℹ️ <strong>Important:</strong> Please arrive 15 minutes before the round starts.<br>
          <strong>Opponent:</strong> ${pairing.opponent.name} (${pairing.opponent.rating})
        </p>
      </div>
    </div>
  `;
  
  // Build plain text content
  let plainText = `ROUND ${round} - YOUR PAIRING\n`;
  plainText += `${'='.repeat(50)}\n\n`;
  plainText += `Tournament: ${tournament.name}\n`;
  plainText += `Round: ${round}\n\n`;
  plainText += `Board: ${pairing.board}\n`;
  plainText += `You are playing ${colorDisplay}\n`;
  plainText += `Opponent: ${pairing.opponent.name} (${pairing.opponent.rating})\n\n`;
  plainText += `${'='.repeat(50)}\n`;
  plainText += `Please arrive 15 minutes before the round starts.\n`;
  
  return { subject, html, plainText };
}
