const express = require('express');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');
const crypto = require('crypto');
const db = require('../database');
const { 
  authenticate, 
  authorize, 
  logAudit 
} = require('../middleware/auth');

const router = express.Router();

/**
 * Get all organizations for a user
 * GET /api/organizations
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const organizations = await new Promise((resolve, reject) => {
      db.all(
        `SELECT o.*, om.role, om.joined_at
         FROM organizations o
         JOIN organization_members om ON o.id = om.organization_id
         WHERE om.user_id = ? AND om.is_active = 1 AND o.is_active = 1
         ORDER BY om.joined_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      success: true,
      data: {
        organizations: organizations.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          website: org.website,
          logoUrl: org.logo_url,
          contactEmail: org.contact_email,
          contactPhone: org.contact_phone,
          address: org.address,
          city: org.city,
          state: org.state,
          zipCode: org.zip_code,
          country: org.country,
          settings: org.settings ? JSON.parse(org.settings) : {},
          role: org.role,
          joinedAt: org.joined_at,
          createdAt: org.created_at,
          updatedAt: org.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organizations'
    });
  }
});

/**
 * Search public organizations
 * GET /api/organizations/search
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 50 } = req.query;

    let searchQuery = `
      SELECT o.id, o.name, o.slug, o.description, o.website, o.logo_url, 
             o.contact_email, o.city, o.state, o.country,
             COUNT(t.id) as tournament_count
      FROM organizations o
      LEFT JOIN tournaments t ON o.id = t.organization_id AND t.is_public = 1
      WHERE o.is_active = 1
    `;
    
    const params = [];
    
    if (query) {
      searchQuery += ` AND (
        o.name LIKE ? OR 
        o.description LIKE ? OR 
        o.city LIKE ? OR 
        o.state LIKE ?
      )`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    searchQuery += ` GROUP BY o.id ORDER BY o.name ASC LIMIT ?`;
    params.push(parseInt(limit));

    const organizations = await new Promise((resolve, reject) => {
      db.all(searchQuery, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      data: {
        organizations: organizations.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          website: org.website,
          logoUrl: org.logo_url,
          contactEmail: org.contact_email,
          city: org.city,
          state: org.state,
          country: org.country,
          tournamentCount: org.tournament_count
        }))
      }
    });

  } catch (error) {
    console.error('Search organizations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search organizations'
    });
  }
});

/**
 * Get organization by ID
 * GET /api/organizations/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is member of organization
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT om.role, om.joined_at
         FROM organization_members om
         WHERE om.organization_id = ? AND om.user_id = ? AND om.is_active = 1`,
        [id, userId],
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

    const organization = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM organizations WHERE id = ? AND is_active = 1',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          website: organization.website,
          logoUrl: organization.logo_url,
          contactEmail: organization.contact_email,
          contactPhone: organization.contact_phone,
          address: organization.address,
          city: organization.city,
          state: organization.state,
          zipCode: organization.zip_code,
          country: organization.country,
          settings: organization.settings ? JSON.parse(organization.settings) : {},
          role: membership.role,
          joinedAt: membership.joined_at,
          createdAt: organization.created_at,
          updatedAt: organization.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organization'
    });
  }
});

/**
 * Create new organization
 * POST /api/organizations
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      website,
      logoUrl,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      country = 'US',
      settings = {}
    } = req.body;

    // Validation
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Name and slug are required'
      });
    }

    if (website && !validator.isURL(website)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid website URL'
      });
    }

    if (contactEmail && !validator.isEmail(contactEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contact email'
      });
    }

    // Check if slug is already taken
    const existingOrg = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM organizations WHERE slug = ?',
        [slug],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        error: 'Organization slug already exists'
      });
    }

    // Create organization
    const orgId = uuidv4();
    const userId = req.user.id;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO organizations (id, name, slug, description, website, logo_url, 
         contact_email, contact_phone, address, city, state, zip_code, country, 
         settings, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orgId, name, slug, description || null, website || null, logoUrl || null,
          contactEmail || null, contactPhone || null, address || null, city || null,
          state || null, zipCode || null, country, JSON.stringify(settings), userId
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Add creator as owner
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO organization_members (id, organization_id, user_id, role, invited_by)
         VALUES (?, ?, ?, 'owner', ?)`,
        [uuidv4(), orgId, userId, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('CREATE', 'organizations', orgId, null, { name, slug }, req);

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: {
        organization: {
          id: orgId,
          name,
          slug,
          description,
          website,
          logoUrl,
          contactEmail,
          contactPhone,
          address,
          city,
          state,
          zipCode,
          country,
          settings,
          role: 'owner'
        }
      }
    });

  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organization'
    });
  }
});

/**
 * Update organization
 * PUT /api/organizations/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      slug,
      description,
      website,
      logoUrl,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      country,
      settings
    } = req.body;

    // Check if user has admin/owner role
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [id, userId],
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

    // Get current organization data for audit
    const currentOrg = await new Promise((resolve, reject) => {
      db.get(
        'SELECT name, slug, description, website, logo_url, contact_email, contact_phone, address, city, state, zip_code, country, settings FROM organizations WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!currentOrg) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Check if slug is already taken by another organization
    if (slug && slug !== currentOrg.slug) {
      const existingOrg = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM organizations WHERE slug = ? AND id != ?',
          [slug, id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingOrg) {
        return res.status(409).json({
          success: false,
          error: 'Organization slug already exists'
        });
      }
    }

    // Update organization
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE organizations SET 
         name = COALESCE(?, name),
         slug = COALESCE(?, slug),
         description = COALESCE(?, description),
         website = COALESCE(?, website),
         logo_url = COALESCE(?, logo_url),
         contact_email = COALESCE(?, contact_email),
         contact_phone = COALESCE(?, contact_phone),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         zip_code = COALESCE(?, zip_code),
         country = COALESCE(?, country),
         settings = COALESCE(?, settings),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          name || null, slug || null, description || null, website || null,
          logoUrl || null, contactEmail || null, contactPhone || null,
          address || null, city || null, state || null, zipCode || null,
          country || null, settings ? JSON.stringify(settings) : null, id
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    const oldValues = JSON.stringify({
      name: currentOrg.name,
      slug: currentOrg.slug,
      description: currentOrg.description,
      website: currentOrg.website,
      logoUrl: currentOrg.logo_url,
      contactEmail: currentOrg.contact_email,
      contactPhone: currentOrg.contact_phone,
      address: currentOrg.address,
      city: currentOrg.city,
      state: currentOrg.state,
      zipCode: currentOrg.zip_code,
      country: currentOrg.country,
      settings: currentOrg.settings
    });
    const newValues = JSON.stringify({
      name: name || currentOrg.name,
      slug: slug || currentOrg.slug,
      description: description || currentOrg.description,
      website: website || currentOrg.website,
      logoUrl: logoUrl || currentOrg.logo_url,
      contactEmail: contactEmail || currentOrg.contact_email,
      contactPhone: contactPhone || currentOrg.contact_phone,
      address: address || currentOrg.address,
      city: city || currentOrg.city,
      state: state || currentOrg.state,
      zipCode: zipCode || currentOrg.zip_code,
      country: country || currentOrg.country,
      settings: settings || (currentOrg.settings ? JSON.parse(currentOrg.settings) : {})
    });
    logAudit('UPDATE', 'organizations', id, oldValues, newValues, req);

    res.json({
      success: true,
      message: 'Organization updated successfully'
    });

  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organization'
    });
  }
});

/**
 * Get organization members
 * GET /api/organizations/:id/members
 */
router.get('/:id/members', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is member of organization
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [id, userId],
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

    const members = await new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
                om.role, om.joined_at, om.invited_by
         FROM organization_members om
         JOIN users u ON om.user_id = u.id
         WHERE om.organization_id = ? AND om.is_active = 1
         ORDER BY om.joined_at DESC`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      success: true,
      data: {
        members: members.map(member => ({
          id: member.id,
          username: member.username,
          email: member.email,
          firstName: member.first_name,
          lastName: member.last_name,
          role: member.role,
          joinedAt: member.joined_at,
          invitedBy: member.invited_by
        }))
      }
    });

  } catch (error) {
    console.error('Get organization members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organization members'
    });
  }
});

/**
 * Invite user to organization
 * POST /api/organizations/:id/invite
 */
router.post('/:id/invite', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { email, role = 'member' } = req.body;

    // Check if user has admin/owner role
    const membership = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND is_active = 1`,
        [id, userId],
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

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    // Check if user is already a member
    const existingMember = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM organization_members 
         WHERE organization_id = ? AND user_id = (
           SELECT id FROM users WHERE email = ?
         )`,
        [id, email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        error: 'User is already a member of this organization'
      });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM organization_invitations 
         WHERE organization_id = ? AND email = ? AND status = 'pending'`,
        [id, email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingInvitation) {
      return res.status(409).json({
        success: false,
        error: 'Invitation already sent to this email'
      });
    }

    // Create invitation
    const invitationId = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO organization_invitations (id, organization_id, email, role, token, invited_by, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [invitationId, id, email, role, token, userId, expiresAt.toISOString()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('CREATE', 'organization_invitations', invitationId, null, { email, role }, req);

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitation: {
          id: invitationId,
          email,
          role,
          expiresAt: expiresAt.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invitation'
    });
  }
});

/**
 * Accept organization invitation
 * POST /api/organizations/invitations/:token/accept
 */
router.post('/invitations/:token/accept', authenticate, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    // Get invitation
    const invitation = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM organization_invitations 
         WHERE token = ? AND status = 'pending'`,
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found or expired'
      });
    }

    // Check if invitation is expired
    if (new Date() > new Date(invitation.expires_at)) {
      // Mark as expired
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE organization_invitations SET status = ? WHERE id = ?',
          ['expired', invitation.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return res.status(400).json({
        success: false,
        error: 'Invitation has expired'
      });
    }

    // Check if user email matches invitation email
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT email FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (user.email !== invitation.email) {
      return res.status(400).json({
        success: false,
        error: 'This invitation is not for your email address'
      });
    }

    // Add user to organization
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO organization_members (id, organization_id, user_id, role, invited_by)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), invitation.organization_id, userId, invitation.role, invitation.invited_by],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Mark invitation as accepted
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE organization_invitations SET status = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['accepted', invitation.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log audit
    logAudit('ACCEPT', 'organization_invitations', invitation.id, null, { userId }, req);

    res.json({
      success: true,
      message: 'Invitation accepted successfully'
    });

  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept invitation'
    });
  }
});

/**
 * Get public organization data with full details
 * GET /api/organizations/:slug/public
 */
router.get('/:slug/public', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get organization with all public data
    const organization = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, name, slug, description, website, logo_url, contact_email, 
                contact_phone, address, city, state, zip_code, country, settings
         FROM organizations WHERE slug = ? AND is_active = 1`,
        [slug],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Parse settings
    const settings = organization.settings ? JSON.parse(organization.settings) : {};

    res.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          website: organization.website,
          logoUrl: organization.logo_url,
          contactEmail: organization.contact_email,
          contactPhone: organization.contact_phone,
          address: organization.address,
          city: organization.city,
          state: organization.state,
          zipCode: organization.zip_code,
          country: organization.country,
          settings: settings
        }
      }
    });

  } catch (error) {
    console.error('Get public organization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organization data'
    });
  }
});

/**
 * Get public organization tournaments
 * GET /api/organizations/:slug/tournaments/public
 */
router.get('/:slug/tournaments/public', async (req, res) => {
  try {
    const { slug } = req.params;
    const { status, format, limit = 50, offset = 0 } = req.query;

    // Get organization
    const organization = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, slug, description, website, logo_url, settings FROM organizations WHERE slug = ? AND is_active = 1',
        [slug],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Build tournaments query with filters
    let tournamentsQuery = `
      SELECT id, name, format, rounds, time_control, start_date, end_date, 
             status, city, state, location, website, is_public, public_url,
             chief_td_name, chief_arbiter_name, expected_players, 
             allow_registration, fide_rated, uscf_rated
      FROM tournaments 
      WHERE organization_id = ? AND is_public = 1
    `;
    
    const params = [organization.id];
    
    if (status) {
      tournamentsQuery += ' AND status = ?';
      params.push(status);
    }
    
    if (format) {
      tournamentsQuery += ' AND format = ?';
      params.push(format);
    }
    
    tournamentsQuery += ' ORDER BY start_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    // Get public tournaments
    const tournaments = await new Promise((resolve, reject) => {
      db.all(tournamentsQuery, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM tournaments WHERE organization_id = ? AND is_public = 1';
    const countParams = [organization.id];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    if (format) {
      countQuery += ' AND format = ?';
      countParams.push(format);
    }

    const countResult = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Parse organization settings
    const settings = organization.settings ? JSON.parse(organization.settings) : {};

    res.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          website: organization.website,
          logoUrl: organization.logo_url,
          settings: settings
        },
        tournaments: tournaments.map(tournament => ({
          id: tournament.id,
          name: tournament.name,
          format: tournament.format,
          rounds: tournament.rounds,
          timeControl: tournament.time_control,
          startDate: tournament.start_date,
          endDate: tournament.end_date,
          status: tournament.status,
          city: tournament.city,
          state: tournament.state,
          location: tournament.location,
          website: tournament.website,
          publicUrl: tournament.public_url,
          chiefTdName: tournament.chief_td_name,
          chiefArbiterName: tournament.chief_arbiter_name,
          expectedPlayers: tournament.expected_players,
          allowRegistration: tournament.allow_registration,
          fideRated: tournament.fide_rated,
          uscfRated: tournament.uscf_rated
        })),
        pagination: {
          total: countResult.total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < countResult.total
        }
      }
    });

  } catch (error) {
    console.error('Get public tournaments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get public tournaments'
    });
  }
});

/**
 * Get organization statistics
 * GET /api/organizations/:slug/stats
 */
router.get('/:slug/stats', async (req, res) => {
  try {
    const { slug } = req.params;

    // Get organization
    const organization = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM organizations WHERE slug = ? AND is_active = 1',
        [slug],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Get tournament statistics
    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as total_tournaments,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tournaments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tournaments,
          COUNT(CASE WHEN status = 'created' THEN 1 END) as upcoming_tournaments,
          COUNT(CASE WHEN is_public = 1 THEN 1 END) as public_tournaments
         FROM tournaments WHERE organization_id = ?`,
        [organization.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Get player statistics
    const playerStats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT p.id) as total_players
         FROM players p
         JOIN tournaments t ON p.tournament_id = t.id
         WHERE t.organization_id = ?`,
        [organization.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      success: true,
      data: {
        tournaments: stats,
        players: playerStats
      }
    });

  } catch (error) {
    console.error('Get organization stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get organization statistics'
    });
  }
});

/**
 * Get public tournament data for organization
 * GET /api/organizations/:slug/tournaments/:tournamentId/public
 */
router.get('/:slug/tournaments/:tournamentId/public', async (req, res) => {
  try {
    const { slug, tournamentId } = req.params;

    // Get organization
    const organization = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, slug FROM organizations WHERE slug = ? AND is_active = 1',
        [slug],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    // Get tournament
    const tournament = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM tournaments 
         WHERE id = ? AND organization_id = ? AND is_public = 1`,
        [tournamentId, organization.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    // Get sections
    const sections = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM sections WHERE tournament_id = ? ORDER BY name',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get players
    const players = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM players WHERE tournament_id = ? ORDER BY last_name, first_name',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get current round pairings
    const currentRound = tournament.current_round || 1;
    const pairings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                white_player.first_name as white_first_name, 
                white_player.last_name as white_last_name,
                black_player.first_name as black_first_name, 
                black_player.last_name as black_last_name
         FROM pairings p
         LEFT JOIN players white_player ON p.white_player_id = white_player.id
         LEFT JOIN players black_player ON p.black_player_id = black_player.id
         WHERE p.tournament_id = ? AND p.round = ?
         ORDER BY p.board_number`,
        [tournamentId, currentRound],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get standings
    const standings = await new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
                COUNT(pair.id) as games_played,
                SUM(CASE WHEN pair.result = 'win' THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN pair.result = 'draw' THEN 1 ELSE 0 END) as draws,
                SUM(CASE WHEN pair.result = 'loss' THEN 1 ELSE 0 END) as losses,
                SUM(CASE 
                  WHEN pair.result = 'win' THEN 1 
                  WHEN pair.result = 'draw' THEN 0.5 
                  ELSE 0 
                END) as points
         FROM players p
         LEFT JOIN pairings pair ON p.id = pair.white_player_id OR p.id = pair.black_player_id
         WHERE p.tournament_id = ?
         GROUP BY p.id
         ORDER BY points DESC, wins DESC, p.rating DESC`,
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // Get team standings if team tournament
    let teamStandings = null;
    if (tournament.format.includes('team')) {
      teamStandings = await new Promise((resolve, reject) => {
        db.all(
          `SELECT t.*, 
                  COUNT(DISTINCT p.id) as players_count,
                  SUM(CASE 
                    WHEN pair.result = 'win' THEN 1 
                    WHEN pair.result = 'draw' THEN 0.5 
                    ELSE 0 
                  END) as team_points
           FROM teams t
           LEFT JOIN players p ON t.id = p.team_id
           LEFT JOIN pairings pair ON p.id = pair.white_player_id OR p.id = pair.black_player_id
           WHERE t.tournament_id = ?
           GROUP BY t.id
           ORDER BY team_points DESC`,
          [tournamentId],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
    }

    res.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        },
        tournament: {
          id: tournament.id,
          name: tournament.name,
          format: tournament.format,
          rounds: tournament.rounds,
          currentRound: currentRound,
          timeControl: tournament.time_control,
          startDate: tournament.start_date,
          endDate: tournament.end_date,
          status: tournament.status,
          city: tournament.city,
          state: tournament.state,
          location: tournament.location,
          website: tournament.website,
          chiefTdName: tournament.chief_td_name,
          chiefArbiterName: tournament.chief_arbiter_name,
          allowRegistration: tournament.allow_registration,
          fideRated: tournament.fide_rated,
          uscfRated: tournament.uscf_rated
        },
        sections: sections.map(section => ({
          id: section.id,
          name: section.name,
          ratingMin: section.rating_min,
          ratingMax: section.rating_max,
          timeControl: section.time_control
        })),
        players: players.map(player => ({
          id: player.id,
          firstName: player.first_name,
          lastName: player.last_name,
          rating: player.rating,
          uscfId: player.uscf_id,
          fideId: player.fide_id,
          sectionId: player.section_id,
          teamId: player.team_id
        })),
        pairings: pairings.map(pairing => ({
          id: pairing.id,
          round: pairing.round,
          boardNumber: pairing.board_number,
          whitePlayerId: pairing.white_player_id,
          blackPlayerId: pairing.black_player_id,
          whitePlayerName: pairing.white_first_name ? `${pairing.white_first_name} ${pairing.white_last_name}` : null,
          blackPlayerName: pairing.black_first_name ? `${pairing.black_first_name} ${pairing.black_last_name}` : null,
          result: pairing.result,
          whiteScore: pairing.white_score,
          blackScore: pairing.black_score
        })),
        standings: standings.map(standing => ({
          id: standing.id,
          firstName: standing.first_name,
          lastName: standing.last_name,
          rating: standing.rating,
          uscfId: standing.uscf_id,
          fideId: standing.fide_id,
          sectionId: standing.section_id,
          teamId: standing.team_id,
          gamesPlayed: standing.games_played,
          wins: standing.wins,
          draws: standing.draws,
          losses: standing.losses,
          points: standing.points
        })),
        teamStandings: teamStandings
      }
    });

  } catch (error) {
    console.error('Get organization tournament error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tournament data'
    });
  }
});

module.exports = router;
