const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');

/**
 * @route GET /api/branded-documents/:organizationId
 * @desc Get all branded documents for an organization
 * @access Private
 */
router.get('/:organizationId', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const { document_type } = req.query;

    const db = require('../database');
    
    let query = `
      SELECT bd.*, u.username as created_by_username
      FROM branded_documents bd
      LEFT JOIN users u ON bd.created_by = u.id
      WHERE bd.organization_id = ? AND bd.is_active = 1
    `;
    const params = [organizationId];

    if (document_type) {
      query += ' AND bd.document_type = ?';
      params.push(document_type);
    }

    query += ' ORDER BY bd.created_at DESC';

    db.all(query, params, (err, documents) => {
      if (err) {
        console.error('Error fetching branded documents:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch branded documents'
        });
      }

      res.json({
        success: true,
        data: documents
      });
    });
  } catch (error) {
    console.error('Branded documents error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/branded-documents
 * @desc Create a new branded document template
 * @access Private
 */
router.post('/', authenticate, (req, res) => {
  try {
    const {
      organization_id,
      document_type,
      template_content
    } = req.body;

    if (!organization_id || !document_type || !template_content) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, document type, and template content are required'
      });
    }

    const db = require('../database');
    const id = uuidv4();

    db.run(
      `INSERT INTO branded_documents 
       (id, organization_id, document_type, template_content, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [id, organization_id, document_type, template_content, req.user.id],
      function(err) {
        if (err) {
          console.error('Error creating branded document:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to create branded document'
          });
        }

        res.json({
          success: true,
          data: {
            id,
            organization_id,
            document_type,
            template_content,
            created_by: req.user.id
          }
        });
      }
    );
  } catch (error) {
    console.error('Create branded document error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/branded-documents/generate/:organizationId/:documentType
 * @desc Generate a branded document
 * @access Private
 */
router.get('/generate/:organizationId/:documentType', authenticate, async (req, res) => {
  try {
    const { organizationId, documentType } = req.params;
    const { tournamentId, round, section } = req.query;

    const db = require('../database');
    
    // Get document template
    const template = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM branded_documents WHERE organization_id = ? AND document_type = ? AND is_active = 1',
        [organizationId, documentType],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Document template not found'
      });
    }

    // Get organization details
    const organization = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM organizations WHERE id = ?',
        [organizationId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Generate document based on type
    let documentData;
    switch (documentType) {
      case 'score_sheet':
        documentData = await generateScoreSheet(tournamentId, round, section, organization, template);
        break;
      case 'quad_form':
        documentData = await generateQuadForm(tournamentId, section, organization, template);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported document type'
        });
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(documentData, organization);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${documentType}_${tournamentId || 'template'}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate document error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate score sheet data
 */
async function generateScoreSheet(tournamentId, round, section, organization, template) {
  const db = require('../database');
  
  // Get tournament and pairing data
  const tournament = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  const pairings = await new Promise((resolve, reject) => {
    db.all(
      `SELECT p.*, pw.name as white_name, pb.name as black_name, pw.rating as white_rating, pb.rating as black_rating
       FROM pairings p
       LEFT JOIN players pw ON p.white_id = pw.id
       LEFT JOIN players pb ON p.black_id = pb.id
       WHERE p.tournament_id = ? AND p.round = ? AND (pw.section = ? OR pb.section = ?)
       ORDER BY p.board_number`,
      [tournamentId, round, section, section],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  return {
    type: 'score_sheet',
    tournament: tournament,
    organization: organization,
    round: round,
    section: section,
    pairings: pairings,
    template: template
  };
}

/**
 * Generate quad form data
 */
async function generateQuadForm(tournamentId, section, organization, template) {
  const db = require('../database');
  
  // Get tournament and players data
  const tournament = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  const players = await new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM players WHERE tournament_id = ? AND section = ? AND status = "active" ORDER BY rating DESC',
      [tournamentId, section],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  // Group players into quads (4 players each)
  const quads = [];
  for (let i = 0; i < players.length; i += 4) {
    quads.push(players.slice(i, i + 4));
  }

  return {
    type: 'quad_form',
    tournament: tournament,
    organization: organization,
    section: section,
    quads: quads,
    template: template
  };
}

/**
 * Generate PDF from document data
 */
async function generatePDF(documentData, organization) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Add organization branding
      if (organization.logo_url) {
        // In a real implementation, you'd fetch and embed the logo image
        doc.text(organization.name, 50, 50, { fontSize: 24, align: 'center' });
      } else {
        doc.text(organization.name, 50, 50, { fontSize: 24, align: 'center' });
      }

      // Add document content based on type
      if (documentData.type === 'score_sheet') {
        generateScoreSheetPDF(doc, documentData);
      } else if (documentData.type === 'quad_form') {
        generateQuadFormPDF(doc, documentData);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate score sheet PDF content
 */
function generateScoreSheetPDF(doc, data) {
  const { tournament, round, section, pairings } = data;
  
  doc.text(`${tournament.name} - Round ${round}`, 50, 100, { fontSize: 18 });
  doc.text(`Section: ${section}`, 50, 130, { fontSize: 14 });
  
  let y = 160;
  pairings.forEach((pairing, index) => {
    doc.text(`Board ${pairing.board_number}:`, 50, y);
    doc.text(`White: ${pairing.white_name} (${pairing.white_rating})`, 70, y + 20);
    doc.text(`Black: ${pairing.black_name} (${pairing.black_rating})`, 70, y + 40);
    
    // Add score boxes
    doc.rect(300, y + 15, 20, 20);
    doc.rect(330, y + 15, 20, 20);
    doc.text('1-0', 305, y + 25);
    doc.text('0-1', 335, y + 25);
    doc.text('1/2-1/2', 360, y + 25);
    
    y += 80;
  });
}

/**
 * Generate quad form PDF content
 */
function generateQuadFormPDF(doc, data) {
  const { tournament, section, quads } = data;
  
  doc.text(`${tournament.name} - Quad Tournament`, 50, 100, { fontSize: 18 });
  doc.text(`Section: ${section}`, 50, 130, { fontSize: 14 });
  
  let y = 160;
  quads.forEach((quad, quadIndex) => {
    doc.text(`Quad ${quadIndex + 1}:`, 50, y);
    
    quad.forEach((player, playerIndex) => {
      doc.text(`${playerIndex + 1}. ${player.name} (${player.rating})`, 70, y + 20 + (playerIndex * 20));
    });
    
    // Add game result boxes
    doc.text('Game Results:', 300, y);
    doc.text('Round 1:', 300, y + 20);
    doc.text('Round 2:', 300, y + 40);
    doc.text('Round 3:', 300, y + 60);
    
    y += 100;
  });
}

/**
 * @route PUT /api/branded-documents/:id
 * @desc Update a branded document template
 * @access Private
 */
router.put('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const {
      document_type,
      template_content,
      is_active
    } = req.body;

    const db = require('../database');

    db.run(
      `UPDATE branded_documents 
       SET document_type = COALESCE(?, document_type),
           template_content = COALESCE(?, template_content),
           is_active = COALESCE(?, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [document_type, template_content, is_active, id],
      function(err) {
        if (err) {
          console.error('Error updating branded document:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to update branded document'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Branded document not found'
          });
        }

        res.json({
          success: true,
          message: 'Branded document updated successfully'
        });
      }
    );
  } catch (error) {
    console.error('Update branded document error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/branded-documents/:id
 * @desc Delete a branded document template
 * @access Private
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../database');

    db.run(
      'DELETE FROM branded_documents WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          console.error('Error deleting branded document:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete branded document'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Branded document not found'
          });
        }

        res.json({
          success: true,
          message: 'Branded document deleted successfully'
        });
      }
    );
  } catch (error) {
    console.error('Delete branded document error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
