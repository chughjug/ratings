/**
 * Google Apps Script Template for Custom Styled Email Sender
 * 
 * Instructions:
 * 1. Copy this entire script into a new Google Apps Script project
 * 2. Update the CONFIG values below with your organization details
 * 3. Deploy as a web app with execute as "Me" and access "Anyone"
 * 4. Copy the web app URL and add it to your organization settings
 * 
 * Web App URL format: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
 */

// --- CONFIGURATION ---
const CONFIG = {
  // Organization logo URL - can be overridden via API
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
// --- WEB APP HANDLER (doPost) ---
// ------------------------------------------------------------------

/**
 * HTTP POST handler for web app calls from the backend server
 * Expected POST body: JSON with recipient, subject, plainTextBody, htmlBodyContent, headerText, organizationName, logoUrl
 */
function doPost(e) {
  try {
    // Parse the request
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.recipient || !data.subject || !data.htmlBodyContent) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Missing required fields: recipient, subject, htmlBodyContent'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Extract parameters
    const recipient = data.recipient;
    const subject = data.subject;
    const plainTextBody = data.plainTextBody || data.htmlBodyContent.replace(/<[^>]*>/g, '');
    const htmlBodyContent = data.htmlBodyContent;
    const headerText = data.headerText || 'General Announcement';
    const organizationName = data.organizationName || CONFIG.DEFAULT_ORGANIZATION_NAME;
    const logoUrl = data.logoUrl || CONFIG.ORGANIZATION_LOGO || CONFIG.DEFAULT_LOGO_URL;
    
    // Send the email
    const success = sendCustomEmailWithStyledHeader(
      recipient,
      subject,
      plainTextBody,
      htmlBodyContent,
      headerText,
      organizationName,
      logoUrl
    );
    
    if (success) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: `Email sent successfully to ${recipient}`
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Failed to send email'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET handler for testing the web app
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Google Apps Script Email Service is running',
    version: '1.0.0',
    endpoints: {
      POST: 'Send email via POST request with JSON body'
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------
// --- CORE FUNCTION: CUSTOM EMAIL SENDER ---
// ------------------------------------------------------------------

/**
 * Sends a custom email using the existing styled HTML header/footer structure.
 * 
 * @param {string} recipient The email address of the recipient.
 * @param {string} subject The subject line of the email.
 * @param {string} plainTextBody The plain text version of the email body.
 * @param {string} htmlBodyContent The custom HTML content (e.g., paragraphs, tables) to place in the main body section.
 * @param {string} [headerText] Optional text for the header (e.g., 'Important Announcement').
 * @param {string} [organizationName] Optional sender name.
 * @param {string} [logoUrl] Optional logo URL.
 * @returns {boolean} True if the email was sent successfully.
 */
function sendCustomEmailWithStyledHeader(
  recipient, 
  subject, 
  plainTextBody, 
  htmlBodyContent, 
  headerText = 'General Announcement', 
  organizationName = CONFIG.DEFAULT_ORGANIZATION_NAME,
  logoUrl = null
) {
  if (!recipient || !recipient.includes('@')) {
    console.error('Invalid recipient email address for custom email.');
    return false;
  }

  try {
    const finalLogoUrl = logoUrl || CONFIG.ORGANIZATION_LOGO || CONFIG.DEFAULT_LOGO_URL;
    const html = buildCustomEmailHtml(subject, htmlBodyContent, headerText, finalLogoUrl, organizationName);
    
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
 * 
 * @param {string} subject The email subject.
 * @param {string} customBodyHtml The HTML content to inject into the main card.
 * @param {string} headerText The main text to display in the header (e.g., event name).
 * @param {string} logoUrl The logo URL to use.
 * @param {string} organizationName The organization name.
 * @returns {string} The complete HTML email body.
 */
function buildCustomEmailHtml(subject, customBodyHtml, headerText, logoUrl, organizationName) {
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
                <td style="background: linear-gradient(135deg, #000000 0%, #1F2937 100%); padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
                  <img src="${logoUrl}" alt="Organization Logo" style="max-width: 180px; height: auto; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; line-height: 1.3;">${subject}</h1>
                  <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; font-weight: 400; line-height: 1.4;">${headerText}</p>
                </td>
              </tr>
              <tr><td style="height: 16px;"></td></tr>
              <tr>
                <td style="background-color: #F9FAFB; border: 1px solid #D1D5DB; border-radius: 0 0 16px 16px; padding: 32px;">
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
      <li><strong>Recipient:</strong> ${testRecipient}</li>
      <li><strong>Subject:</strong> Test Successful!</li>
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
  const ui = SpreadsheetApp.getUi();
  if (ui) {
    ui.createMenu('📧 Custom Email')
      .addItem('Send Test Email', 'sendTestEmail')
      .addToUi();
  }
}

