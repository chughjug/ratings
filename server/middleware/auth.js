const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    // Check if user exists and is active
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, role, is_active FROM users WHERE id = ? AND is_active = 1',
        [decoded.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found or inactive' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

/**
 * Authorization middleware - check if user has required role
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};

/**
 * Check tournament permissions
 */
const checkTournamentPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const { id: tournamentId } = req.params;
      const userId = req.user.id;

      // Admin users have all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user has permission for this tournament
      const userPermission = await new Promise((resolve, reject) => {
        db.get(
          `SELECT permission FROM tournament_permissions 
           WHERE tournament_id = ? AND user_id = ?`,
          [tournamentId, userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!userPermission) {
        return res.status(403).json({ 
          success: false, 
          error: 'No permission for this tournament' 
        });
      }

      // Check permission level
      const permissionLevels = { viewer: 1, editor: 2, owner: 3 };
      const requiredLevel = permissionLevels[permission] || 1;
      const userLevel = permissionLevels[userPermission.permission] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          success: false, 
          error: `Requires ${permission} permission or higher` 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Permission check failed' 
      });
    }
  };
};

/**
 * Log audit trail
 */
const logAudit = (action, tableName, recordId, oldValues, newValues, req) => {
  const auditId = uuidv4();
  const userId = req.user ? req.user.id : null;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  db.run(
    `INSERT INTO audit_log (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [auditId, userId, action, tableName, recordId, oldValues, newValues, ipAddress, userAgent],
    (err) => {
      if (err) {
        console.error('Audit log error:', err);
      }
    }
  );
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticate,
  authorize,
  checkTournamentPermission,
  logAudit
};
