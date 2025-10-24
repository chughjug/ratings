const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Initialize email service
let emailService = null;

function setEmailService(service) {
  emailService = service;
}

// Get all templates for organization
router.get('/organization/:organizationId', auth, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const templates = await emailService.getTemplatesByOrganization(organizationId);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single template
router.get('/:templateId', auth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await emailService.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create template
router.post('/', auth, async (req, res) => {
  try {
    const { organizationId, name, subject, htmlTemplate, textTemplate, variables } = req.body;
    
    if (!organizationId || !name || !subject || !htmlTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const template = await emailService.createTemplate(organizationId, {
      name,
      subject,
      htmlTemplate,
      textTemplate,
      variables
    });
    
    res.json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update template
router.put('/:templateId', auth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, subject, htmlTemplate, textTemplate, variables } = req.body;
    
    if (!name || !subject || !htmlTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const template = await emailService.updateTemplate(templateId, {
      name,
      subject,
      htmlTemplate,
      textTemplate,
      variables
    });
    
    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete template
router.delete('/:templateId', auth, async (req, res) => {
  try {
    const { templateId } = req.params;
    await emailService.deleteTemplate(templateId);
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get preset templates
router.get('/presets/list', async (req, res) => {
  try {
    const presets = {
      pairingNotification: {
        name: 'Pairing Notification',
        subject: 'Round {{round}} Pairings for {{tournamentName}}',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>{{tournamentName}} - Round {{round}}</h2>
            <p>Hello {{playerName}},</p>
            <p>Your pairing for Round {{round}} is:</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Board Number:</strong> {{boardNumber}}</p>
              <p><strong>Opponent:</strong> {{opponentName}} (Rating: {{opponentRating}})</p>
              <p><strong>Color:</strong> {{color}}</p>
              <p><strong>Time Control:</strong> {{timeControl}}</p>
            </div>
            <p>Good luck!</p>
            <p>{{organizationName}}</p>
          </div>
        `
      },
      roundSummary: {
        name: 'Round Summary',
        subject: '{{tournamentName}} - Round {{round}} Results',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>{{tournamentName}} - Round {{round}} Results</h2>
            <p>Hello {{playerName}},</p>
            <p>The results for Round {{round}} are now available:</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Your Result:</strong> {{result}}</p>
              <p><strong>Score:</strong> {{score}}</p>
              <p><strong>Rating Change:</strong> {{ratingChange}}</p>
            </div>
            <p><a href="{{tournamentUrl}}" style="color: #0066cc;">View Full Standings</a></p>
            <p>{{organizationName}}</p>
          </div>
        `
      },
      tournamentInvitation: {
        name: 'Tournament Invitation',
        subject: 'You\'re Invited to {{tournamentName}}!',
        htmlTemplate: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You're Invited!</h2>
            <p>Hello {{playerName}},</p>
            <p>We would like to invite you to participate in {{tournamentName}}.</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Tournament:</strong> {{tournamentName}}</p>
              <p><strong>Date:</strong> {{startDate}} - {{endDate}}</p>
              <p><strong>Time Control:</strong> {{timeControl}}</p>
              <p><strong>Rounds:</strong> {{rounds}}</p>
              <p><strong>Location:</strong> {{location}}</p>
            </div>
            <p><a href="{{registrationUrl}}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Register Now</a></p>
            <p>{{organizationName}}</p>
          </div>
        `
      }
    };
    
    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send test email
router.post('/send-test/:templateId', auth, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { recipientEmail, testVariables } = req.body;
    
    const template = await emailService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    const rendered = emailService.renderTemplate(template, testVariables || {});
    await emailService.sendEmail(recipientEmail, rendered.subject, rendered.html, rendered.text);
    
    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = { router, setEmailService };
