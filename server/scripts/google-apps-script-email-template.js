/**
 * Simplified Custom Styled Email Sender
 * Core functionality: Send a single email with custom content
 * using a predefined HTML template (black/orange header).
 */

// --- CONFIGURATION ---
const CONFIG = {
  // Organization logo URL 
  ORGANIZATION_LOGO: '', // Leave empty for default, or add your logo URL here
  
  // Default values for the custom email function
  DEFAULT_LOGO_URL: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/new-logo.png',
  DEFAULT_ORGANIZATION_NAME: 'Event Organizer',
};

/**
 * Global function to get the actual sender email (the script owner).
 */
function getSenderEmail() {
  return Session.getEffectiveUser().getEmail(); 
}

// ------------------------------------------------------------------
// --- WEB APP HANDLER (REQUIRED FOR WEBHOOK) ---
// ------------------------------------------------------------------
/**
 * Web App entry point for POST requests from the backend server
 * This function must be deployed as a web app to receive webhook calls
 */
function doPost(e) {
  try {
    // Parse the POST request body
    const params = JSON.parse(e.postData.contents);
    const { recipient, subject, plainTextBody, htmlBodyContent, headerText, organizationName, logoUrl } = params;

    // Validate required fields
    if (!recipient || !subject || !htmlBodyContent) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Missing required fields: recipient, subject, htmlBodyContent'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Temporarily override CONFIG for this request if logoUrl is provided
    const originalLogo = CONFIG.ORGANIZATION_LOGO;
    if (logoUrl && logoUrl.trim()) {
      CONFIG.ORGANIZATION_LOGO = logoUrl;
    }

    try {
      // Call the main email sending function
      const success = sendCustomEmailWithStyledHeader(
        recipient,
        subject,
        plainTextBody || htmlBodyContent.replace(/<[^>]*>/g, ''),
        htmlBodyContent,
        headerText || 'General Announcement',
        organizationName || CONFIG.DEFAULT_ORGANIZATION_NAME
      );
      
      // Restore original logo config
      CONFIG.ORGANIZATION_LOGO = originalLogo;
      
      // Return JSON response
      return ContentService.createTextOutput(JSON.stringify({
        success: success,
        message: success ? 'Email sent successfully' : 'Failed to send email'
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      // Restore original logo config
      CONFIG.ORGANIZATION_LOGO = originalLogo;
      throw error;
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.message || error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ------------------------------------------------------------------
// --- CORE FUNCTION: CUSTOM EMAIL SENDER ---
// ------------------------------------------------------------------
/**
 * Sends a custom email using the existing styled HTML header/footer structure.
 * @param {string} recipient The email address of the recipient.
 * @param {string} subject The subject line of the email.
 * @param {string} plainTextBody The plain text version of the email body.
 * @param {string} htmlBodyContent The custom HTML content (e.g., paragraphs, tables) to place in the main body section.
 * @param {string} [headerText] Optional text for the header (e.g., 'Important Announcement').
 * @param {string} [organizationName] Optional sender name.
 * @returns {boolean} True if the email was sent successfully.
 */
function sendCustomEmailWithStyledHeader(recipient, subject, plainTextBody, htmlBodyContent, headerText = 'General Announcement', organizationName = CONFIG.DEFAULT_ORGANIZATION_NAME) {
  if (!recipient || !recipient.includes('@')) {
    console.error('Invalid recipient email address for custom email.');
    return false;
  }
  try {
    const html = buildCustomEmailHtml(subject, htmlBodyContent, headerText, organizationName);
    
    GmailApp.sendEmail(
      recipient,
      subject,
      plainTextBody,
      {
        htmlBody: html,
        from: getSenderEmail(),
        name: organizationName + ' Team'
      }
    );
    
    console.log(`Custom email sent to ${recipient} with subject: ${subject}`);
    return true;
    
  } catch (error) {
    console.error(`Failed to send custom email to ${recipient}:`, error.toString());
    return false;
  }
}

/**
 * Helper to build the HTML for the custom email, reusing the existing styling.
 * @param {string} subject The email subject.
 * @param {string} customBodyHtml The HTML content to inject into the main card.
 * @param {string} headerText The main text to display in the header (e.g., event name).
 * @param {string} organizationName The organization name to use in the footer.
 * @returns {string} The complete HTML email body.
 */
function buildCustomEmailHtml(subject, customBodyHtml, headerText, organizationName = CONFIG.DEFAULT_ORGANIZATION_NAME) {
  const logoUrl = CONFIG.ORGANIZATION_LOGO || CONFIG.DEFAULT_LOGO_URL;
  
  return `
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
            
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
              
              <tr>
                <td style="background: linear-gradient(135deg, #000000 0%, #1F2937 100%); padding: 24px; text-align: center; border-radius: 12px; margin-bottom: 16px;">
                  <img src="${logoUrl}" alt="Organization Logo" style="max-width: 180px; height: auto; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; line-height: 1.3;">${subject}</h1>
                  <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 400; line-height: 1.4;">${headerText}</p>
                </td>
              </tr>
              
              <tr><td style="height: 16px;"></td></tr>
              
              <tr>
                <td style="background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 16px; padding: 32px;">
                  ${customBodyHtml}
                </td>
              </tr>
              
              <tr><td style="height: 24px;"></td></tr>
              
              <tr>
                <td style="text-align: center; font-size: 12px; color: #9CA3AF;">
                  <p style="margin: 0;">Sent by the ${organizationName} Team.</p>
                </td>
              </tr>
              
            </table>
            
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ------------------------------------------------------------------
// --- TEST FUNCTION (Optional) ---
// ------------------------------------------------------------------
/**
 * Executes a sample call to the main function for testing purposes.
 * Use the Apps Script IDE's "Run" feature and select this function.
 */
function sendTestEmail() {
  const testRecipient = 'aarushchugh1@gmail.com'; 
  const htmlBody = `
    <h2>🎉 Welcome to the New Email System!</h2>
    <p>This is a custom message sent using the styled HTML template.</p>
    <ul>
      <li>**Recipient:** ${testRecipient}</li>
      <li>**Subject:** Test Successful!</li>
    </ul>
    <p style="color: #F97316; font-weight: 700;">Your custom HTML content goes here, inside the main card.</p>
  `;
  
  sendCustomEmailWithStyledHeader(
    testRecipient,
    'Custom Notification: System Test',
    'This is the plain text version of the message. Your system is working!',
    htmlBody,
    'System Check Status: Operational',
    'Automation Team'
  );
}

/**
 * Creates a custom menu in Google Sheets to trigger the test function easily.
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('📧 Custom Email')
      .addItem('Send Test Email', 'sendTestEmail')
      .addToUi();
}
