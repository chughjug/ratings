const express = require('express');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const db = require('../database');
const { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  authenticate, 
  authorize,
  logAudit 
} = require('../middleware/auth');

const router = express.Router();

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

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

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters long'
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
         VALUES (?, ?, ?, ?, ?, ?, 'user')`,
        [userId, username, email, passwordHash, firstName || null, lastName || null],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Generate token
    const token = generateToken(userId, 'user');

    // Log audit
    logAudit('CREATE', 'users', userId, null, { username, email }, req);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          username,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          role: 'user'
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user by username or email
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, password_hash, first_name, last_name, role, is_active FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
        [username, username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    // Log audit
    logAudit('LOGIN', 'users', user.id, null, null, req);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * Get current user profile
 * GET /api/auth/profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, first_name, last_name, role, is_active, last_login, created_at FROM users WHERE id = ?',
        [req.user.id],
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
          createdAt: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const userId = req.user.id;

    // Validation
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already taken'
        });
      }
    }

    // Get current user data for audit
    const currentUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT first_name, last_name, email FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Update user
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET 
         first_name = COALESCE(?, first_name),
         last_name = COALESCE(?, last_name),
         email = COALESCE(?, email),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [firstName || null, lastName || null, email || null, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    const oldValues = JSON.stringify({
      firstName: currentUser.first_name,
      lastName: currentUser.last_name,
      email: currentUser.email
    });
    const newValues = JSON.stringify({
      firstName: firstName || currentUser.first_name,
      lastName: lastName || currentUser.last_name,
      email: email || currentUser.email
    });
    logAudit('UPDATE', 'users', userId, oldValues, newValues, req);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile update failed'
    });
  }
});

/**
 * Change password
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // Get current password hash
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId],
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

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('UPDATE', 'users', userId, null, { action: 'password_changed' }, req);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed'
    });
  }
});

/**
 * Logout user (invalidate token)
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, (req, res) => {
  // In a production system, you would add the token to a blacklist
  // For now, we'll just log the logout
  logAudit('LOGOUT', 'users', req.user.id, null, null, req);
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
