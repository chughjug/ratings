const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @route GET /api/club-dues/:organizationId
 * @desc Get all club dues for an organization
 * @access Private
 */
router.get('/:organizationId', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const { limit = 100, offset = 0, status, year, month } = req.query;

    const db = require('../database');
    
    let query = `
      SELECT * FROM club_dues 
      WHERE organization_id = ?
    `;
    const params = [organizationId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (year) {
      query += ' AND strftime("%Y", due_date) = ?';
      params.push(year);
    }

    if (month) {
      query += ' AND strftime("%m", due_date) = ?';
      params.push(month.padStart(2, '0'));
    }

    query += ' ORDER BY due_date DESC, member_name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, dues) => {
      if (err) {
        console.error('Error fetching club dues:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch club dues'
        });
      }

      res.json({
        success: true,
        data: dues
      });
    });
  } catch (error) {
    console.error('Club dues error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/club-dues
 * @desc Create a new club dues record
 * @access Private
 */
router.post('/', authenticate, (req, res) => {
  try {
    const {
      organization_id,
      member_id,
      member_name,
      amount,
      due_date,
      notes
    } = req.body;

    if (!organization_id || !member_id || !member_name || !amount || !due_date) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID, member ID, member name, amount, and due date are required'
      });
    }

    const db = require('../database');
    const id = uuidv4();

    db.run(
      `INSERT INTO club_dues 
       (id, organization_id, member_id, member_name, amount, due_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, organization_id, member_id, member_name, amount, due_date, notes],
      function(err) {
        if (err) {
          console.error('Error creating club dues:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to create club dues'
          });
        }

        res.json({
          success: true,
          data: {
            id,
            organization_id,
            member_id,
            member_name,
            amount,
            due_date,
            notes,
            status: 'pending'
          }
        });
      }
    );
  } catch (error) {
    console.error('Create club dues error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route PUT /api/club-dues/:id
 * @desc Update a club dues record
 * @access Private
 */
router.put('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const {
      member_name,
      amount,
      due_date,
      status,
      payment_method,
      payment_reference,
      notes
    } = req.body;

    const db = require('../database');

    const paidAt = status === 'paid' ? new Date().toISOString() : null;

    db.run(
      `UPDATE club_dues 
       SET member_name = COALESCE(?, member_name),
           amount = COALESCE(?, amount),
           due_date = COALESCE(?, due_date),
           status = COALESCE(?, status),
           payment_method = COALESCE(?, payment_method),
           payment_reference = COALESCE(?, payment_reference),
           notes = COALESCE(?, notes),
           paid_at = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [member_name, amount, due_date, status, payment_method, payment_reference, notes, paidAt, id],
      function(err) {
        if (err) {
          console.error('Error updating club dues:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to update club dues'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Club dues record not found'
          });
        }

        res.json({
          success: true,
          message: 'Club dues updated successfully'
        });
      }
    );
  } catch (error) {
    console.error('Update club dues error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/club-dues/:id
 * @desc Delete a club dues record
 * @access Private
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../database');

    db.run(
      'DELETE FROM club_dues WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          console.error('Error deleting club dues:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to delete club dues'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Club dues record not found'
          });
        }

        res.json({
          success: true,
          message: 'Club dues deleted successfully'
        });
      }
    );
  } catch (error) {
    console.error('Delete club dues error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/club-dues/bulk-create
 * @desc Create multiple club dues records
 * @access Private
 */
router.post('/bulk-create', authenticate, (req, res) => {
  try {
    const { organization_id, dues_records } = req.body;

    if (!organization_id || !dues_records || !Array.isArray(dues_records)) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID and dues records array are required'
      });
    }

    const db = require('../database');
    let created = 0;
    let errors = [];

    dues_records.forEach((record, index) => {
      const {
        member_id,
        member_name,
        amount,
        due_date,
        notes
      } = record;

      if (!member_id || !member_name || !amount || !due_date) {
        errors.push({
          index,
          error: 'Member ID, name, amount, and due date are required'
        });
        return;
      }

      const id = uuidv4();
      
      db.run(
        `INSERT INTO club_dues 
         (id, organization_id, member_id, member_name, amount, due_date, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [id, organization_id, member_id, member_name, amount, due_date, notes],
        function(err) {
          if (err) {
            console.error(`Error creating dues for ${member_name}:`, err);
            errors.push({
              index,
              member: member_name,
              error: err.message
            });
          } else {
            created++;
          }

          // Check if this is the last record
          if (index === dues_records.length - 1) {
            res.json({
              success: true,
              data: {
                totalRecords: dues_records.length,
                created,
                errors
              }
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Bulk create dues error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/club-dues/:organizationId/summary
 * @desc Get club dues summary statistics
 * @access Private
 */
router.get('/:organizationId/summary', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const { year } = req.query;

    const db = require('../database');
    
    let query = `
      SELECT 
        COUNT(*) as total_dues,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as overdue_amount,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
      FROM club_dues 
      WHERE organization_id = ?
    `;
    const params = [organizationId];

    if (year) {
      query += ' AND strftime("%Y", due_date) = ?';
      params.push(year);
    }

    db.get(query, params, (err, summary) => {
      if (err) {
        console.error('Error fetching dues summary:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch dues summary'
        });
      }

      res.json({
        success: true,
        data: summary || {
          total_dues: 0,
          total_amount: 0,
          paid_amount: 0,
          pending_amount: 0,
          overdue_amount: 0,
          paid_count: 0,
          pending_count: 0,
          overdue_count: 0
        }
      });
    });
  } catch (error) {
    console.error('Dues summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/club-dues/:organizationId/mark-overdue
 * @desc Mark overdue dues
 * @access Private
 */
router.post('/:organizationId/mark-overdue', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const db = require('../database');

    db.run(
      `UPDATE club_dues 
       SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = ? 
         AND status = 'pending' 
         AND due_date < date('now')`,
      [organizationId],
      function(err) {
        if (err) {
          console.error('Error marking overdue dues:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to mark overdue dues'
          });
        }

        res.json({
          success: true,
          data: {
            overdue_count: this.changes
          }
        });
      }
    );
  } catch (error) {
    console.error('Mark overdue error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/club-dues/:organizationId/export
 * @desc Export club dues data
 * @access Private
 */
router.get('/:organizationId/export', authenticate, (req, res) => {
  try {
    const { organizationId } = req.params;
    const { format = 'csv', status, year } = req.query;

    const db = require('../database');
    
    let query = `
      SELECT member_name, amount, due_date, status, payment_method, 
             payment_reference, paid_at, notes, created_at
      FROM club_dues 
      WHERE organization_id = ?
    `;
    const params = [organizationId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (year) {
      query += ' AND strftime("%Y", due_date) = ?';
      params.push(year);
    }

    query += ' ORDER BY due_date DESC, member_name ASC';

    db.all(query, params, (err, dues) => {
      if (err) {
        console.error('Error fetching dues for export:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch dues data'
        });
      }

      if (format === 'csv') {
        // Convert to CSV
        const csv = convertToCSV(dues);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="club_dues.csv"');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: dues
        });
      }
    });
  } catch (error) {
    console.error('Export dues error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

module.exports = router;
