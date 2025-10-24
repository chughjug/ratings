const Handlebars = require('handlebars');
const nodemailer = require('nodemailer');

class EmailTemplateService {
  constructor(db) {
    this.db = db;
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Configure based on environment
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      // Fallback to test mode
      this.transporter = nodemailer.createTransport({
        host: 'smtp.mailtrap.io',
        port: 587,
        auth: {
          user: process.env.MAILTRAP_USER || 'test',
          pass: process.env.MAILTRAP_PASSWORD || 'test'
        }
      });
    }
  }

  // Initialize database tables
  async initializeTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Email templates table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS email_templates (
            id TEXT PRIMARY KEY,
            organization_id TEXT,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            html_template TEXT NOT NULL,
            text_template TEXT,
            variables TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations (id)
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Email queue table for audit trail
        this.db.run(`
          CREATE TABLE IF NOT EXISTS email_queue (
            id TEXT PRIMARY KEY,
            organization_id TEXT,
            tournament_id TEXT,
            template_id TEXT,
            recipient_email TEXT NOT NULL,
            recipient_name TEXT,
            subject TEXT NOT NULL,
            variables TEXT,
            status TEXT DEFAULT 'pending',
            sent_at DATETIME,
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organization_id) REFERENCES organizations (id),
            FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
            FOREIGN KEY (template_id) REFERENCES email_templates (id)
          )
        `, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    });
  }

  // Create a new email template
  async createTemplate(organizationId, templateData) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO email_templates 
          (id, organization_id, name, subject, html_template, text_template, variables)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          templateData.name,
          templateData.subject,
          templateData.htmlTemplate,
          templateData.textTemplate || '',
          JSON.stringify(templateData.variables || [])
        ],
        function(err) {
          if (err) reject(err);
          resolve({ id, ...templateData });
        }
      );
    });
  }

  // Get template by ID
  async getTemplate(templateId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM email_templates WHERE id = ?',
        [templateId],
        (err, row) => {
          if (err) reject(err);
          if (row) {
            row.variables = JSON.parse(row.variables || '[]');
          }
          resolve(row);
        }
      );
    });
  }

  // Get all templates for organization
  async getTemplatesByOrganization(organizationId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM email_templates WHERE organization_id = ? ORDER BY created_at DESC',
        [organizationId],
        (err, rows) => {
          if (err) reject(err);
          if (rows) {
            rows.forEach(row => {
              row.variables = JSON.parse(row.variables || '[]');
            });
          }
          resolve(rows || []);
        }
      );
    });
  }

  // Update template
  async updateTemplate(templateId, templateData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE email_templates 
          SET name = ?, subject = ?, html_template = ?, text_template = ?, variables = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [
          templateData.name,
          templateData.subject,
          templateData.htmlTemplate,
          templateData.textTemplate || '',
          JSON.stringify(templateData.variables || []),
          templateId
        ],
        function(err) {
          if (err) reject(err);
          resolve({ id: templateId, ...templateData });
        }
      );
    });
  }

  // Delete template
  async deleteTemplate(templateId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM email_templates WHERE id = ?',
        [templateId],
        function(err) {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  // Render template with variables
  renderTemplate(template, variables) {
    const htmlTemplate = Handlebars.compile(template.html_template || template.htmlTemplate || '');
    const textTemplate = (template.text_template || template.textTemplate)
      ? Handlebars.compile(template.text_template || template.textTemplate)
      : null;

    return {
      subject: template.subject,
      html: htmlTemplate(variables),
      text: textTemplate ? textTemplate(variables) : null
    };
  }

  // Queue email for sending
  async queueEmail(organizationId, emailData) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO email_queue 
          (id, organization_id, tournament_id, template_id, recipient_email, recipient_name, subject, variables)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          emailData.tournamentId,
          emailData.templateId,
          emailData.recipientEmail,
          emailData.recipientName,
          emailData.subject,
          JSON.stringify(emailData.variables || {})
        ],
        function(err) {
          if (err) reject(err);
          resolve(id);
        }
      );
    });
  }

  // Send queued emails
  async sendQueuedEmails(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM email_queue 
         WHERE status = 'pending' 
         ORDER BY created_at ASC 
         LIMIT ?`,
        [limit],
        async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const results = [];

          for (const emailItem of rows) {
            try {
              const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL || 'noreply@chesslord.dev',
                to: emailItem.recipient_email,
                subject: emailItem.subject,
                html: emailItem.subject // Placeholder - would render template
              };

              await this.transporter.sendMail(mailOptions);

              // Mark as sent
              await new Promise((res, rej) => {
                this.db.run(
                  `UPDATE email_queue SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
                  [emailItem.id],
                  (err) => {
                    if (err) rej(err);
                    res();
                  }
                );
              });

              results.push({ id: emailItem.id, status: 'sent' });
            } catch (error) {
              // Mark as failed
              await new Promise((res, rej) => {
                this.db.run(
                  `UPDATE email_queue SET status = 'failed', error_message = ? WHERE id = ?`,
                  [error.message, emailItem.id],
                  (err) => {
                    if (err) rej(err);
                    res();
                  }
                );
              });

              results.push({ id: emailItem.id, status: 'failed', error: error.message });
            }
          }

          resolve(results);
        }
      );
    });
  }

  // Send email directly
  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL || 'noreply@chesslord.dev',
        to,
        subject,
        html,
        text: text || null
      };

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  // Send templated email
  async sendTemplatedEmail(organizationId, recipientEmail, recipientName, templateData, variables) {
    try {
      const template = await this.getTemplate(templateData.templateId);
      if (!template) throw new Error('Template not found');

      const rendered = this.renderTemplate(template, variables);

      await this.sendEmail(recipientEmail, rendered.subject, rendered.html, rendered.text);

      // Queue for audit
      await this.queueEmail(organizationId, {
        templateId: template.id,
        recipientEmail,
        recipientName,
        subject: rendered.subject,
        variables
      });

      return { success: true };
    } catch (error) {
      console.error('Templated email error:', error);
      throw error;
    }
  }
}

module.exports = EmailTemplateService;
