const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CalendarService = require('../services/calendarService');

let db = null;

function setDatabase(database) {
  db = database;
}

// Download ICS file for tournament
router.get('/tournament/:tournamentId/ics', auth, async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // Get tournament
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    // Get organization
    const organization = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM organizations WHERE id = ?', [tournament.organization_id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    // Get rounds if available
    const rounds = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM pairings WHERE tournament_id = ? GROUP BY round ORDER BY round',
        [tournamentId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });

    const calendarService = new CalendarService();
    const icsContent = calendarService.generateTournamentICS(tournament, rounds, organization);

    // Set headers for ICS file download
    const filename = `${tournament.name.replace(/\s+/g, '_')}_schedule.ics`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(icsContent);
  } catch (error) {
    console.error('Error generating ICS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get calendar links for tournament
router.get('/tournament/:tournamentId/links', auth, async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // Get tournament
    const tournament = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Tournament not found' });
    }

    // Get organization
    const organization = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM organizations WHERE id = ?', [tournament.organization_id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    const calendarService = new CalendarService();

    res.json({
      success: true,
      data: {
        icsDownload: `/api/calendar/tournament/${tournamentId}/ics`,
        googleCalendarLink: calendarService.generateGoogleCalendarLink(tournament, organization),
        outlookLink: calendarService.generateOutlookLink(tournament, organization),
        tournament: {
          id: tournament.id,
          name: tournament.name,
          startDate: tournament.start_date,
          endDate: tournament.end_date,
          location: tournament.location,
          timeControl: tournament.time_control,
          rounds: tournament.rounds
        }
      }
    });
  } catch (error) {
    console.error('Error generating calendar links:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get organization events (all tournaments)
router.get('/organization/:organizationId/events', auth, async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Get all tournaments for organization
    const tournaments = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM tournaments WHERE organization_id = ? ORDER BY start_date DESC',
        [organizationId],
        (err, rows) => {
          if (err) reject(err);
          resolve(rows || []);
        }
      );
    });

    if (tournaments.length === 0) {
      return res.json({
        success: true,
        data: { events: [] }
      });
    }

    const events = tournaments.map(t => ({
      id: t.id,
      title: t.name,
      start: t.start_date,
      end: t.end_date || t.start_date,
      location: t.location,
      format: t.format,
      rounds: t.rounds,
      status: t.status,
      timeControl: t.time_control
    }));

    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = { router, setDatabase };
