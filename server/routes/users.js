const express = require('express');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const crypto = require('crypto');
const db = require('../database');
const { 
  hashPassword, 
  authenticate, 
  authorize, 
  logAudit 
} = require('../middleware/auth');

const router = express.Router();

// Helper function to generate API key
function generateApiKey() {
  const prefix = 'ctk_';
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('hex');
  return prefix + key;
}

// Helper function to validate API key format
function isValidApiKey(apiKey) {
  return apiKey && apiKey.startsWith('ctk_') && apiKey.length === 67;
}

/**
 * Get all users (admin only)
 * GET /api/users
 */
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, username, email, first_name, last_name, role, is_active, 
             last_login, created_at, updated_at
      FROM users 
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const users = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      countQuery += ` AND role = ?`;
      countParams.push(role);
    }

    const totalResult = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalResult.total,
          pages: Math.ceil(totalResult.total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

/**
 * Generate API key for user
 * POST /api/users/:id/api-key
 */
router.post('/:id/api-key', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name = 'Default API Key', description = '', permissions = 'read,write', rate_limit = 1000 } = req.body;
    const userId = req.user.id;

    // Check if user can manage this API key (own account or admin)
    if (id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to manage this API key'
      });
    }

    // Generate new API key
    const apiKey = generateApiKey();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Expires in 1 year

    // Store in user_api_keys table
    const keyId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_api_keys (id, user_id, api_key, name, description, permissions, rate_limit, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [keyId, id, apiKey, name, description, permissions, rate_limit, expiresAt.toISOString()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Update user's main API key
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET api_key = ?, api_key_created_at = CURRENT_TIMESTAMP, api_key_expires_at = ? WHERE id = ?',
        [apiKey, expiresAt.toISOString(), id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('CREATE', 'user_api_keys', keyId, null, { action: 'api_key_generated', user_id: id }, req);

    res.json({
      success: true,
      data: {
        api_key: apiKey,
        key_id: keyId,
        name,
        description,
        permissions,
        rate_limit,
        expires_at: expiresAt.toISOString()
      },
      message: 'API key generated successfully'
    });

  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate API key'
    });
  }
});

/**
 * Get user's API keys
 * GET /api/users/:id/api-keys
 */
router.get('/:id/api-keys', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user can view this API key (own account or admin)
    if (id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this API key'
      });
    }

    const apiKeys = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, description, permissions, rate_limit, usage_count, last_used, 
                created_at, expires_at, is_active
         FROM user_api_keys 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      success: true,
      data: apiKeys
    });

  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API keys'
    });
  }
});

/**
 * Revoke API key
 * DELETE /api/users/:id/api-keys/:keyId
 */
router.delete('/:id/api-keys/:keyId', authenticate, async (req, res) => {
  try {
    const { id, keyId } = req.params;
    const userId = req.user.id;

    // Check if user can manage this API key (own account or admin)
    if (id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to manage this API key'
      });
    }

    // Deactivate API key
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE user_api_keys SET is_active = 0 WHERE id = ? AND user_id = ?',
        [keyId, id],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('API key not found'));
          } else {
            resolve();
          }
        }
      );
    });

    // Log audit
    logAudit('DELETE', 'user_api_keys', keyId, null, { action: 'api_key_revoked', user_id: id }, req);

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });

  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key'
    });
  }
});

/**
 * Update API key
 * PUT /api/users/:id/api-keys/:keyId
 */
router.put('/:id/api-keys/:keyId', authenticate, async (req, res) => {
  try {
    const { id, keyId } = req.params;
    const { name, description, permissions, rate_limit } = req.body;
    const userId = req.user.id;

    // Check if user can manage this API key (own account or admin)
    if (id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to manage this API key'
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(permissions);
    }
    if (rate_limit !== undefined) {
      updates.push('rate_limit = ?');
      values.push(rate_limit);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(keyId, id);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_api_keys SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('API key not found'));
          } else {
            resolve();
          }
        }
      );
    });

    // Log audit
    logAudit('UPDATE', 'user_api_keys', keyId, null, { action: 'api_key_updated', user_id: id }, req);

    res.json({
      success: true,
      message: 'API key updated successfully'
    });

  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API key'
    });
  }
});

/**
 * Get API key usage statistics
 * GET /api/users/:id/api-keys/:keyId/stats
 */
router.get('/:id/api-keys/:keyId/stats', authenticate, async (req, res) => {
  try {
    const { id, keyId } = req.params;
    const userId = req.user.id;

    // Check if user can view this API key (own account or admin)
    if (id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this API key'
      });
    }

    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT usage_count, last_used, created_at, expires_at, is_active
         FROM user_api_keys 
         WHERE id = ? AND user_id = ?`,
        [keyId, id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get API key stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API key statistics'
    });
  }
});

/**
 * Get user by ID (admin only)
 * GET /api/users/:id
 */
router.get('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

/**
 * Create user (admin only)
 * POST /api/users
 */
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role = 'user' } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }

    if (!['admin', 'td', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    // Create user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (id, username, email, password_hash, first_name, last_name, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, email, passwordHash, firstName || null, lastName || null, role],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('CREATE', 'users', userId, null, { username, email, role }, req);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: userId,
          username,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          role
        }
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

/**
 * Update user (admin only)
 * PUT /api/users/:id
 */
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, firstName, lastName, role, isActive } = req.body;

    // Validation
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (role && !['admin', 'td', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    // Get current user data for audit
    const currentUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT username, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if username/email is already taken by another user
    if (username || email) {
      const existingUser = await new Promise((resolve, reject) => {
        let query = 'SELECT id FROM users WHERE (';
        const params = [];
        const conditions = [];

        if (username) {
          conditions.push('username = ?');
          params.push(username);
        }
        if (email) {
          conditions.push('email = ?');
          params.push(email);
        }

        query += conditions.join(' OR ') + ') AND id != ?';
        params.push(id);

        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Username or email already taken'
        });
      }
    }

    // Update user
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET 
         username = COALESCE(?, username),
         email = COALESCE(?, email),
         first_name = COALESCE(?, first_name),
         last_name = COALESCE(?, last_name),
         role = COALESCE(?, role),
         is_active = COALESCE(?, is_active),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [username || null, email || null, firstName || null, lastName || null, role || null, isActive !== undefined ? isActive : null, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    const oldValues = JSON.stringify({
      username: currentUser.username,
      email: currentUser.email,
      firstName: currentUser.first_name,
      lastName: currentUser.last_name,
      role: currentUser.role,
      isActive: currentUser.is_active
    });
    const newValues = JSON.stringify({
      username: username || currentUser.username,
      email: email || currentUser.email,
      firstName: firstName || currentUser.first_name,
      lastName: lastName || currentUser.last_name,
      role: role || currentUser.role,
      isActive: isActive !== undefined ? isActive : currentUser.is_active
    });
    logAudit('UPDATE', 'users', id, oldValues, newValues, req);

    res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * Delete user (admin only)
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT username, email FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deleting self
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Delete user (cascade will handle related records)
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Log audit
    logAudit('DELETE', 'users', id, JSON.stringify({ username: user.username, email: user.email }), null, req);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

/**
 * Reset user password (admin only)
 * POST /api/users/:id/reset-password
 */
router.post('/:id/reset-password', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT username FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('UPDATE', 'users', id, null, { action: 'password_reset' }, req);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});


module.exports = router;
