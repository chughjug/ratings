const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const router = express.Router();

// Get all custom pages for a tournament
router.get('/tournament/:tournamentId', (req, res) => {
  const { tournamentId } = req.params;
  
  db.all(
    'SELECT * FROM custom_pages WHERE tournament_id = ? AND is_active = 1 ORDER BY order_index, created_at',
    [tournamentId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching custom pages:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to fetch custom pages' 
        });
      }
      res.json({ 
        success: true,
        data: rows || [] 
      });
    }
  );
});

// Get a single custom page
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM custom_pages WHERE id = ?', [id], (err, page) => {
    if (err) {
      console.error('Error fetching custom page:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch custom page' 
      });
    }
    if (!page) {
      return res.status(404).json({ 
        success: false,
        error: 'Custom page not found' 
      });
    }
    res.json({ 
      success: true,
      data: page 
    });
  });
});

// Create a new custom page
router.post('/', (req, res) => {
  try {
    const { tournament_id, title, slug, content, order_index, icon } = req.body;
    
    if (!tournament_id || !title || !slug || !content) {
      return res.status(400).json({ 
        success: false,
        error: 'Tournament ID, title, slug, and content are required' 
      });
    }

    const id = uuidv4();
    
    db.run(
      `INSERT INTO custom_pages 
       (id, tournament_id, title, slug, content, order_index, icon) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tournament_id, title, slug, content, order_index || 0, icon],
      function(err) {
        if (err) {
          console.error('Error creating custom page:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Failed to create custom page' 
          });
        }
        res.json({ 
          success: true,
          data: { id }
        });
      }
    );
  } catch (error) {
    console.error('Error creating custom page:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create custom page' 
    });
  }
});

// Update a custom page
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, slug, content, order_index, is_active, icon } = req.body;
  
  const updates = [];
  const values = [];
  
  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (slug !== undefined) {
    updates.push('slug = ?');
    values.push(slug);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    values.push(content);
  }
  if (order_index !== undefined) {
    updates.push('order_index = ?');
    values.push(order_index);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(is_active);
  }
  if (icon !== undefined) {
    updates.push('icon = ?');
    values.push(icon);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  db.run(
    `UPDATE custom_pages SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        console.error('Error updating custom page:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to update custom page' 
        });
      }
      res.json({ 
        success: true,
        data: { id }
      });
    }
  );
});

// Delete a custom page
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM custom_pages WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting custom page:', err);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete custom page' 
      });
    }
    res.json({ 
      success: true,
      message: 'Custom page deleted successfully'
    });
  });
});

module.exports = router;

