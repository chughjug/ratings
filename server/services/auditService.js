const { v4: uuidv4 } = require('uuid');

class AuditService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Initialize audit logging database table
   */
  async initializeTable() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          user_name TEXT,
          user_email TEXT,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          tournament_id TEXT,
          organization_id TEXT,
          changes TEXT,
          old_values TEXT,
          new_values TEXT,
          ip_address TEXT,
          user_agent TEXT,
          status TEXT DEFAULT 'success',
          error_message TEXT,
          metadata TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (organization_id) REFERENCES organizations (id),
          FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
        );
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_tournament ON audit_logs(tournament_id);
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Log an action to the audit trail
   */
  async logAction(auditData) {
    const id = uuidv4();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO audit_logs (
          id, user_id, user_name, user_email, action, entity_type, entity_id,
          tournament_id, organization_id, changes, old_values, new_values,
          ip_address, user_agent, status, error_message, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          auditData.userId,
          auditData.userName,
          auditData.userEmail,
          auditData.action,
          auditData.entityType,
          auditData.entityId,
          auditData.tournamentId,
          auditData.organizationId,
          JSON.stringify(auditData.changes || {}),
          JSON.stringify(auditData.oldValues || {}),
          JSON.stringify(auditData.newValues || {}),
          auditData.ipAddress,
          auditData.userAgent,
          auditData.status || 'success',
          auditData.errorMessage,
          JSON.stringify(auditData.metadata || {})
        ],
        function(err) {
          if (err) reject(err);
          resolve(id);
        }
      );
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters = {}, limit = 100, offset = 0) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (filters.tournamentId) {
      query += ' AND tournament_id = ?';
      params.push(filters.tournamentId);
    }

    if (filters.organizationId) {
      query += ' AND organization_id = ?';
      params.push(filters.organizationId);
    }

    if (filters.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }

    if (filters.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters.entityType) {
      query += ' AND entity_type = ?';
      params.push(filters.entityType);
    }

    if (filters.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        
        const logs = (rows || []).map(row => this.parseAuditLog(row));
        resolve(logs);
      });
    });
  }

  /**
   * Get audit log count
   */
  async getAuditLogCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
    const params = [];

    if (filters.tournamentId) {
      query += ' AND tournament_id = ?';
      params.push(filters.tournamentId);
    }

    if (filters.organizationId) {
      query += ' AND organization_id = ?';
      params.push(filters.organizationId);
    }

    if (filters.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }

    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        resolve(row?.count || 0);
      });
    });
  }

  /**
   * Get single audit log
   */
  async getAuditLog(logId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM audit_logs WHERE id = ?', [logId], (err, row) => {
        if (err) reject(err);
        resolve(row ? this.parseAuditLog(row) : null);
      });
    });
  }

  /**
   * Get audit history for an entity
   */
  async getEntityHistory(entityType, entityId, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM audit_logs 
         WHERE entity_type = ? AND entity_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [entityType, entityId, limit],
        (err, rows) => {
          if (err) reject(err);
          const logs = (rows || []).map(row => this.parseAuditLog(row));
          resolve(logs);
        }
      );
    });
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM audit_logs 
         WHERE user_id = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          const logs = (rows || []).map(row => this.parseAuditLog(row));
          resolve(logs);
        }
      );
    });
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(organizationId, startDate, endDate) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM audit_logs 
         WHERE organization_id = ? 
         AND timestamp >= ? 
         AND timestamp <= ?
         ORDER BY timestamp DESC`,
        [organizationId, startDate, endDate],
        (err, rows) => {
          if (err) reject(err);
          
          const logs = (rows || []).map(row => this.parseAuditLog(row));
          
          // Generate summary
          const summary = {
            totalActions: logs.length,
            actionsByType: {},
            actionsByUser: {},
            actionsByEntityType: {},
            criticalActions: [],
            changes: {}
          };

          logs.forEach(log => {
            // Count by type
            summary.actionsByType[log.action] = (summary.actionsByType[log.action] || 0) + 1;
            
            // Count by user
            const userName = log.user_name || 'Unknown';
            summary.actionsByUser[userName] = (summary.actionsByUser[userName] || 0) + 1;
            
            // Count by entity
            summary.actionsByEntityType[log.entity_type] = (summary.actionsByEntityType[log.entity_type] || 0) + 1;
            
            // Track critical actions
            if (['DELETE', 'BULK_UPDATE', 'EXPORT', 'IMPORT'].includes(log.action)) {
              summary.criticalActions.push({
                timestamp: log.timestamp,
                action: log.action,
                user: log.user_name,
                entity: `${log.entity_type}:${log.entity_id}`
              });
            }
          });

          resolve({
            startDate,
            endDate,
            summary,
            logs
          });
        }
      );
    });
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  async cleanupOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM audit_logs WHERE timestamp < ?',
        [cutoffDate.toISOString()],
        function(err) {
          if (err) reject(err);
          resolve(this.changes);
        }
      );
    });
  }

  /**
   * Parse audit log (convert JSON strings)
   */
  parseAuditLog(row) {
    return {
      ...row,
      changes: row.changes ? JSON.parse(row.changes) : {},
      oldValues: row.old_values ? JSON.parse(row.old_values) : {},
      newValues: row.new_values ? JSON.parse(row.new_values) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  /**
   * Detect changes between two objects
   */
  detectChanges(oldObj, newObj) {
    const changes = {};
    const oldValues = {};
    const newValues = {};

    // Check for changed and new properties
    Object.keys(newObj || {}).forEach(key => {
      if (oldObj[key] !== newObj[key]) {
        changes[key] = `${oldObj[key] || 'null'} → ${newObj[key] || 'null'}`;
        oldValues[key] = oldObj[key];
        newValues[key] = newObj[key];
      }
    });

    // Check for deleted properties
    Object.keys(oldObj || {}).forEach(key => {
      if (!(key in (newObj || {}))) {
        changes[key] = `${oldObj[key]} → deleted`;
        oldValues[key] = oldObj[key];
        newValues[key] = null;
      }
    });

    return { changes, oldValues, newValues };
  }
}

module.exports = AuditService;
