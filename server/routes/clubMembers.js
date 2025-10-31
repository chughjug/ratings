const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

/**
 * Get all club members for an organization
 * GET /api/club-members?organizationId=xxx
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { organizationId, status, search } = req.query;
    const userId = req.user.id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }

    // Check if user is a member of the organization
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this organization'
      });
    }

    // Build query
    let query = `
      SELECT * FROM club_members 
      WHERE organization_id = ?
    `;
    const params = [organizationId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR uscf_id LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY name ASC';

    const members = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({
      success: true,
      data: {
        members: members.map(member => ({
          id: member.id,
          organizationId: member.organization_id,
          name: member.name,
          firstName: member.first_name,
          lastName: member.last_name,
          uscfId: member.uscf_id,
          fideId: member.fide_id,
          rating: member.rating,
          quickRating: member.quick_rating,
          blitzRating: member.blitz_rating,
          expirationDate: member.expiration_date,
          email: member.email,
          phone: member.phone,
          address: member.address,
          city: member.city,
          state: member.state,
          zipCode: member.zip_code,
          country: member.country,
          notes: member.notes,
          status: member.status,
          membershipStartDate: member.membership_start_date,
          membershipEndDate: member.membership_end_date,
          createdAt: member.created_at,
          updatedAt: member.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('Get club members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get club members'
    });
  }
});

/**
 * Get a single club member by ID
 * GET /api/club-members/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const member = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM club_members WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Club member not found'
      });
    }

    // Check if user is a member of the organization
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [member.organization_id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this member'
      });
    }

    res.json({
      success: true,
      data: {
        member: {
          id: member.id,
          organizationId: member.organization_id,
          name: member.name,
          firstName: member.first_name,
          lastName: member.last_name,
          uscfId: member.uscf_id,
          fideId: member.fide_id,
          rating: member.rating,
          quickRating: member.quick_rating,
          blitzRating: member.blitz_rating,
          expirationDate: member.expiration_date,
          email: member.email,
          phone: member.phone,
          address: member.address,
          city: member.city,
          state: member.state,
          zipCode: member.zip_code,
          country: member.country,
          notes: member.notes,
          status: member.status,
          membershipStartDate: member.membership_start_date,
          membershipEndDate: member.membership_end_date,
          createdAt: member.created_at,
          updatedAt: member.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get club member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get club member'
    });
  }
});

/**
 * Create a new club member
 * POST /api/club-members
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      organizationId,
      name,
      firstName,
      lastName,
      uscfId,
      fideId,
      rating,
      quickRating,
      blitzRating,
      expirationDate,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      notes,
      status,
      membershipStartDate,
      membershipEndDate
    } = req.body;

    const userId = req.user.id;

    if (!organizationId || !name) {
      return res.status(400).json({
        success: false,
        error: 'organizationId and name are required'
      });
    }

    // Check if user has permission (admin or owner)
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const memberId = uuidv4();
    const fullName = name || `${firstName || ''} ${lastName || ''}`.trim();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO club_members (
          id, organization_id, name, first_name, last_name, uscf_id, fide_id,
          rating, quick_rating, blitz_rating, expiration_date, email, phone,
          address, city, state, zip_code, country, notes, status,
          membership_start_date, membership_end_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          memberId, organizationId, fullName, firstName || null, lastName || null,
          uscfId || null, fideId || null, rating || null, quickRating || null,
          blitzRating || null, expirationDate || null, email || null, phone || null,
          address || null, city || null, state || null, zipCode || null,
          country || 'US', notes || null, status || 'active',
          membershipStartDate || null, membershipEndDate || null, userId
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({
      success: true,
      message: 'Club member created successfully',
      data: {
        member: {
          id: memberId,
          organizationId,
          name: fullName
        }
      }
    });

  } catch (error) {
    console.error('Create club member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create club member'
    });
  }
});

/**
 * Update a club member
 * PUT /api/club-members/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Get existing member
    const member = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM club_members WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Club member not found'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [member.organization_id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    // Build update query dynamically
    const fields = [];
    const values = [];

    if (updateData.name !== undefined) fields.push('name = ?'), values.push(updateData.name);
    if (updateData.firstName !== undefined) fields.push('first_name = ?'), values.push(updateData.firstName);
    if (updateData.lastName !== undefined) fields.push('last_name = ?'), values.push(updateData.lastName);
    if (updateData.uscfId !== undefined) fields.push('uscf_id = ?'), values.push(updateData.uscfId);
    if (updateData.fideId !== undefined) fields.push('fide_id = ?'), values.push(updateData.fideId);
    if (updateData.rating !== undefined) fields.push('rating = ?'), values.push(updateData.rating);
    if (updateData.quickRating !== undefined) fields.push('quick_rating = ?'), values.push(updateData.quickRating);
    if (updateData.blitzRating !== undefined) fields.push('blitz_rating = ?'), values.push(updateData.blitzRating);
    if (updateData.expirationDate !== undefined) fields.push('expiration_date = ?'), values.push(updateData.expirationDate);
    if (updateData.email !== undefined) fields.push('email = ?'), values.push(updateData.email);
    if (updateData.phone !== undefined) fields.push('phone = ?'), values.push(updateData.phone);
    if (updateData.address !== undefined) fields.push('address = ?'), values.push(updateData.address);
    if (updateData.city !== undefined) fields.push('city = ?'), values.push(updateData.city);
    if (updateData.state !== undefined) fields.push('state = ?'), values.push(updateData.state);
    if (updateData.zipCode !== undefined) fields.push('zip_code = ?'), values.push(updateData.zipCode);
    if (updateData.country !== undefined) fields.push('country = ?'), values.push(updateData.country);
    if (updateData.notes !== undefined) fields.push('notes = ?'), values.push(updateData.notes);
    if (updateData.status !== undefined) fields.push('status = ?'), values.push(updateData.status);
    if (updateData.membershipStartDate !== undefined) fields.push('membership_start_date = ?'), values.push(updateData.membershipStartDate);
    if (updateData.membershipEndDate !== undefined) fields.push('membership_end_date = ?'), values.push(updateData.membershipEndDate);

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE club_members SET ${fields.join(', ')} WHERE id = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Club member updated successfully'
    });

  } catch (error) {
    console.error('Update club member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update club member'
    });
  }
});

/**
 * Delete a club member
 * DELETE /api/club-members/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const member = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM club_members WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Club member not found'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [member.organization_id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM club_members WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      success: true,
      message: 'Club member deleted successfully'
    });

  } catch (error) {
    console.error('Delete club member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete club member'
    });
  }
});

/**
 * Bulk create club members
 * POST /api/club-members/bulk
 */
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { organizationId, members } = req.body;
    const userId = req.user.id;

    if (!organizationId || !members || !Array.isArray(members)) {
      return res.status(400).json({
        success: false,
        error: 'organizationId and members array are required'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const createdMembers = [];
    const errors = [];

    for (const memberData of members) {
      try {
        if (!memberData.name && (!memberData.firstName || !memberData.lastName)) {
          errors.push({ member: memberData, error: 'Name is required' });
          continue;
        }

        const memberId = uuidv4();
        const fullName = memberData.name || `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim();

        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO club_members (
              id, organization_id, name, first_name, last_name, uscf_id, fide_id,
              rating, quick_rating, blitz_rating, expiration_date, email, phone,
              address, city, state, zip_code, country, notes, status,
              membership_start_date, membership_end_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              memberId, organizationId, fullName, memberData.firstName || null,
              memberData.lastName || null, memberData.uscfId || null,
              memberData.fideId || null, memberData.rating || null,
              memberData.quickRating || null, memberData.blitzRating || null,
              memberData.expirationDate || null, memberData.email || null,
              memberData.phone || null, memberData.address || null,
              memberData.city || null, memberData.state || null,
              memberData.zipCode || null, memberData.country || 'US',
              memberData.notes || null, memberData.status || 'active',
              memberData.membershipStartDate || null, memberData.membershipEndDate || null, userId
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        createdMembers.push({ id: memberId, name: fullName });
      } catch (error) {
        errors.push({ member: memberData, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Created ${createdMembers.length} club member(s)`,
      data: {
        created: createdMembers,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Bulk create club members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create club members'
    });
  }
});

/**
 * Import club members into a tournament
 * POST /api/club-members/import-to-tournament
 */
router.post('/import-to-tournament', authenticate, async (req, res) => {
  try {
    const { organizationId, tournamentId, memberIds, section } = req.body;
    const userId = req.user.id;

    if (!organizationId || !tournamentId || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        success: false,
        error: 'organizationId, tournamentId, and memberIds array are required'
      });
    }

    // Verify tournament exists and belongs to organization
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    if (tournament.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Tournament does not belong to this organization'
      });
    }

    // Check permissions
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [organizationId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Not a member of this organization'
      });
    }

    // Get club members
    const placeholders = memberIds.map(() => '?').join(',');
    const members = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM club_members 
         WHERE id IN (${placeholders}) AND organization_id = ? AND status = 'active'`,
        [...memberIds, organizationId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    if (members.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid active club members found'
      });
    }

    // Check for existing players in tournament
    const existingPlayers = await new Promise((resolve, reject) => {
      db.all(
        `SELECT uscf_id, name FROM players 
         WHERE tournament_id = ? AND (uscf_id IS NOT NULL OR name IS NOT NULL)`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    const existingMap = new Map();
    existingPlayers.forEach(p => {
      if (p.uscf_id) existingMap.set(p.uscf_id.toLowerCase(), true);
      if (p.name) existingMap.set(p.name.toLowerCase(), true);
    });

    // Import members as tournament players
    const imported = [];
    const skipped = [];

    for (const member of members) {
      // Check if player already exists
      const memberKey = member.uscf_id 
        ? member.uscf_id.toLowerCase() 
        : member.name.toLowerCase();
      
      if (existingMap.has(memberKey)) {
        skipped.push({ 
          member: member.name, 
          reason: 'Player already in tournament' 
        });
        continue;
      }

      const playerId = uuidv4();
      const fullName = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim();

      try {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO players (
              id, tournament_id, name, first_name, last_name, uscf_id, fide_id,
              rating, section, status, email, phone, city, state, expiration_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
            [
              playerId, tournamentId, fullName, member.first_name || null,
              member.last_name || null, member.uscf_id || null,
              member.fide_id || null, member.rating || null,
              section || null, member.email || null,
              member.phone || null, member.city || null,
              member.state || null, member.expiration_date || null
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        imported.push({ id: playerId, name: fullName });
      } catch (error) {
        skipped.push({ member: member.name, reason: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Imported ${imported.length} club member(s) into tournament`,
      data: {
        imported,
        skipped: skipped.length > 0 ? skipped : undefined
      }
    });

  } catch (error) {
    console.error('Import club members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import club members'
    });
  }
});

module.exports = router;

