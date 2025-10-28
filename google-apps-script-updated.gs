/**
 * Simplified Chess Tournament Pairings Email Notification System
 * Core functionality: Receive webhook -> Send personalized email to each player.
 */

// --- CONFIGURATION ---
const CONFIG = {
  // Email template subject
  SUBJECT_TEMPLATE: 'Round {round} Pairings - {tournamentName}',
  
  // Organization logo URL (change this to your organization's logo)
  ORGANIZATION_LOGO: '', // Leave empty for default Chess Tournament Director logo, or add your logo URL here
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
    return handleTestRequest(testEmail, e.parameter.logo || null);
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
function handleTestRequest(testEmail, logoUrl) {
  // All emails are directed to your test address for reliable testing
  const testPayload = {
    event: 'pairings_generated',
    tournament: { 
      id: 'test', 
      name: 'Simplified Test Tournament', 
      format: 'swiss', 
      rounds: 3,
      logo_url: logoUrl || null,
      organization_logo: logoUrl || null,
      organization_name: 'Chess Club'
    },
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
  
  // Get organization name from tournament or use default
  const organizationName = tournament.organization_name || 'Chess Tournament';
  
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
          name: organizationName + ' Team'
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
  
  // Determine which logo to use (priority: organization_logo > logo_url > config > default)
  const logoUrl = tournament.organization_logo || tournament.logo_url || CONFIG.ORGANIZATION_LOGO || 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/new-logo.png';
  
  // Build HTML content with orange/black color scheme
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 20px;">
            
            <!-- Main Container -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #000000 0%, #1F2937 100%); padding: 24px; text-align: center; border-radius: 12px; margin-bottom: 16px;">
                  <img src="${logoUrl}" alt="Tournament Logo" style="max-width: 180px; height: auto; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; line-height: 1.3;">Round ${round} Pairing</h1>
                  <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 400; line-height: 1.4;">${tournament.name}</p>
                </td>
              </tr>
              
              <!-- Spacing -->
              <tr><td style="height: 16px;"></td></tr>
              
              <!-- Info Bar -->
              <tr>
                <td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 8px 16px; background-color: #F3F4F6; border-radius: 8px; display: inline-block;">
                        <span style="color: #000000; font-size: 14px; font-weight: 500;">Round ${round} of ${tournament.rounds} • ${pairing.section} Section</span>
                      </td>
                      <td align="right">
                        <span style="background-color: #F97316; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">Board #${pairing.board}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Spacing -->
              <tr><td style="height: 16px;"></td></tr>
              
              <!-- Player Card -->
              <tr>
                <td style="background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 16px; padding: 32px;">
                  
                  <!-- You (Player) -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                    <tr>
                      <td style="vertical-align: middle;">
                        <div style="font-size: 16px; font-weight: 700; color: #000000; line-height: 1.5;">
                          ${playerInfo.playerName} <span style="color: #F97316; font-weight: 500;">(You)</span>
                        </div>
                        <div style="font-size: 14px; color: #4B5563; line-height: 1.4; margin-top: 2px;">Rating: ${playerInfo.playerRating}</div>
                      </td>
                      <td style="vertical-align: middle; text-align: right; padding-left: 16px;">
                        <div style="font-size: 32px; line-height: 1;">${pairing.color === 'white' ? '⚪' : '⚫'}</div>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- VS Divider -->
                  <div style="text-align: center; margin: 20px 0;">
                    <span style="color: #F97316; font-size: 18px; font-weight: 700; letter-spacing: 1px;">VS</span>
                  </div>
                  
                  <!-- Opponent -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                    <tr>
                      <td style="vertical-align: middle;">
                        <div style="font-size: 16px; font-weight: 700; color: #000000; line-height: 1.5;">${pairing.opponent.name}</div>
                        <div style="font-size: 14px; color: #4B5563; line-height: 1.4; margin-top: 2px;">Rating: ${pairing.opponent.rating}</div>
                      </td>
                      <td style="vertical-align: middle; text-align: right; padding-left: 16px;">
                        <div style="font-size: 32px; line-height: 1;">${pairing.color === 'white' ? '⚫' : '⚪'}</div>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
              <!-- Spacing -->
              <tr><td style="height: 24px;"></td></tr>
              
              <!-- Important Reminder -->
              <tr>
                <td style="background-color: #F3F4F6; border: 1px dashed #F97316; border-radius: 12px; padding: 16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width: 28px; vertical-align: top;">
                        <div style="width: 20px; height: 20px; border-radius: 50%; background-color: #F97316; color: #ffffff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 20px;">ℹ️</div>
                      </td>
                      <td style="vertical-align: top; padding-left: 8px;">
                        <div style="color: #4B5563; font-size: 14px; line-height: 1.4;">
                          <strong style="color: #000000; font-weight: 700;">Important Reminder</strong><br>
                          Please arrive 15 minutes before the round starts to ensure a smooth check-in process.
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
            </table>
            
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  // Build plain text content (unchanged)
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

