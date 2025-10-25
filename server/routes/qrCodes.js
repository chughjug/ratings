const express = require('express');
const router = express.Router();
const qrCodeService = require('../services/qrCodeService');
const { authenticate } = require('../middleware/auth');

/**
 * @route POST /api/qr-codes/pairings
 * @desc Generate QR code for pairings
 * @access Private
 */
router.post('/pairings', authenticate, async (req, res) => {
  try {
    const { tournamentId, round, options = {} } = req.body;

    if (!tournamentId || !round) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID and round are required'
      });
    }

    const result = await qrCodeService.generatePairingsQR(tournamentId, round, options);

    res.json(result);
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/qr-codes/standings
 * @desc Generate QR code for standings
 * @access Private
 */
router.post('/standings', authenticate, async (req, res) => {
  try {
    const { tournamentId, options = {} } = req.body;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    const result = await qrCodeService.generateStandingsQR(tournamentId, options);

    res.json(result);
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/qr-codes/player-checkin
 * @desc Generate QR code for player check-in
 * @access Private
 */
router.post('/player-checkin', authenticate, async (req, res) => {
  try {
    const { tournamentId, playerId, options = {} } = req.body;

    if (!tournamentId || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID and player ID are required'
      });
    }

    const result = await qrCodeService.generatePlayerCheckInQR(tournamentId, playerId, options);

    res.json(result);
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/qr-codes/tournament
 * @desc Generate QR code for tournament info
 * @access Private
 */
router.post('/tournament', authenticate, async (req, res) => {
  try {
    const { tournamentId, options = {} } = req.body;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    const result = await qrCodeService.generateTournamentQR(tournamentId, options);

    res.json(result);
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/qr-codes/custom
 * @desc Generate custom QR code
 * @access Private
 */
router.post('/custom', authenticate, async (req, res) => {
  try {
    const { content, options = {} } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    // Validate content
    const validation = qrCodeService.validateQRContent(content);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid QR code content',
        validation
      });
    }

    const result = await qrCodeService.generateCustomQR(content, options);

    res.json({
      ...result,
      validation
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/qr-codes/tournament-batch
 * @desc Generate multiple QR codes for tournament
 * @access Private
 */
router.post('/tournament-batch', authenticate, async (req, res) => {
  try {
    const { tournamentId, options = {} } = req.body;

    if (!tournamentId) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID is required'
      });
    }

    const result = await qrCodeService.generateTournamentQRCodes(tournamentId, options);

    res.json(result);
  } catch (error) {
    console.error('QR code batch generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/qr-codes/players-batch
 * @desc Generate QR codes for all players
 * @access Private
 */
router.post('/players-batch', authenticate, async (req, res) => {
  try {
    const { tournamentId, players, options = {} } = req.body;

    if (!tournamentId || !players || !Array.isArray(players)) {
      return res.status(400).json({
        success: false,
        error: 'Tournament ID and players array are required'
      });
    }

    const result = await qrCodeService.generatePlayerQRCodes(tournamentId, players, options);

    res.json(result);
  } catch (error) {
    console.error('QR code players batch generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/qr-codes/print
 * @desc Generate print-ready QR code
 * @access Private
 */
router.post('/print', authenticate, async (req, res) => {
  try {
    const { content, options = {} } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const result = await qrCodeService.generatePrintQRCode(content, options);

    res.json(result);
  } catch (error) {
    console.error('QR code print generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/qr-codes/validate
 * @desc Validate QR code content
 * @access Private
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    const validation = qrCodeService.validateQRContent(content);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('QR code validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/qr-codes/options
 * @desc Get available QR code options
 * @access Private
 */
router.get('/options', authenticate, async (req, res) => {
  try {
    const options = {
      types: [
        { value: 'pairings', label: 'Pairings', description: 'QR code for round pairings' },
        { value: 'standings', label: 'Standings', description: 'QR code for tournament standings' },
        { value: 'tournament', label: 'Tournament Info', description: 'QR code for tournament details' },
        { value: 'player-checkin', label: 'Player Check-in', description: 'QR code for player check-in' },
        { value: 'custom', label: 'Custom', description: 'Custom QR code content' }
      ],
      sizes: [
        { value: 128, label: 'Small (128x128)' },
        { value: 256, label: 'Medium (256x256)' },
        { value: 512, label: 'Large (512x512)' },
        { value: 1024, label: 'Extra Large (1024x1024)' }
      ],
      colors: [
        { value: 'black', label: 'Black', hex: '#000000' },
        { value: 'blue', label: 'Blue', hex: '#0000FF' },
        { value: 'red', label: 'Red', hex: '#FF0000' },
        { value: 'green', label: 'Green', hex: '#00FF00' },
        { value: 'purple', label: 'Purple', hex: '#800080' }
      ],
      formats: [
        { value: 'png', label: 'PNG', description: 'Best for web and print' },
        { value: 'svg', label: 'SVG', description: 'Vector format, scalable' },
        { value: 'pdf', label: 'PDF', description: 'Print-ready format' }
      ]
    };

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('QR code options error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
