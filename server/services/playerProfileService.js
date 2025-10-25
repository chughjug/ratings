const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

class PlayerProfileService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads/player-photos');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  /**
   * Configure multer for photo uploads
   */
  getPhotoUpload() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `player-${req.params.playerId || 'temp'}-${uniqueSuffix}${path.extname(file.originalname)}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      }
    });
  }

  /**
   * Process and resize uploaded photo
   * @param {string} filePath - Path to uploaded file
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} - Processed photo info
   */
  async processPhoto(filePath, playerId) {
    try {
      const filename = path.basename(filePath);
      const nameWithoutExt = path.parse(filename).name;
      const ext = path.parse(filename).ext;

      // Generate different sizes
      const sizes = [
        { suffix: 'thumb', width: 150, height: 150 },
        { suffix: 'medium', width: 300, height: 300 },
        { suffix: 'large', width: 600, height: 600 }
      ];

      const processedPhotos = {};

      for (const size of sizes) {
        const outputPath = path.join(this.uploadDir, `${nameWithoutExt}-${size.suffix}${ext}`);
        
        await sharp(filePath)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 90 })
          .toFile(outputPath);

        processedPhotos[size.suffix] = {
          path: outputPath,
          url: `/uploads/player-photos/${path.basename(outputPath)}`,
          width: size.width,
          height: size.height
        };
      }

      // Delete original file
      await fs.unlink(filePath);

      return {
        success: true,
        data: {
          playerId,
          photos: processedPhotos,
          originalFilename: filename
        }
      };
    } catch (error) {
      console.error('Error processing photo:', error);
      throw error;
    }
  }

  /**
   * Get player profile with photos and achievements
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} - Player profile data
   */
  async getPlayerProfile(playerId) {
    try {
      // This would integrate with your existing database
      // For now, return mock data structure
      const profile = {
        id: playerId,
        name: 'John Doe',
        uscf_id: '12345678',
        fide_id: '9876543',
        rating: 1800,
        peak_rating: 1850,
        photos: {
          thumb: '/uploads/player-photos/player-123-thumb.jpg',
          medium: '/uploads/player-photos/player-123-medium.jpg',
          large: '/uploads/player-photos/player-123-large.jpg'
        },
        achievements: [
          {
            id: '1',
            type: 'tournament_win',
            title: '1st Place - Open Section',
            tournament: 'Spring Championship 2024',
            date: '2024-03-15',
            description: 'Won the Open section with 4.5/5 points'
          },
          {
            id: '2',
            type: 'rating_milestone',
            title: 'Reached 1800 Rating',
            date: '2024-02-10',
            description: 'Achieved 1800 USCF rating for the first time'
          }
        ],
        statistics: {
          total_tournaments: 25,
          total_games: 150,
          wins: 89,
          losses: 45,
          draws: 16,
          win_percentage: 59.3,
          current_streak: 3,
          longest_streak: 8,
          rating_progression: [
            { date: '2024-01-01', rating: 1750 },
            { date: '2024-02-01', rating: 1775 },
            { date: '2024-03-01', rating: 1800 }
          ]
        },
        recent_tournaments: [
          {
            id: 'tournament-1',
            name: 'Spring Championship 2024',
            date: '2024-03-15',
            place: 1,
            score: '4.5/5',
            rating_change: '+25'
          }
        ]
      };

      return {
        success: true,
        data: profile
      };
    } catch (error) {
      console.error('Error getting player profile:', error);
      throw error;
    }
  }

  /**
   * Update player profile
   * @param {string} playerId - Player ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} - Updated profile
   */
  async updatePlayerProfile(playerId, updates) {
    try {
      // This would integrate with your existing database
      const updatedProfile = {
        id: playerId,
        ...updates,
        updated_at: new Date().toISOString()
      };

      return {
        success: true,
        data: updatedProfile
      };
    } catch (error) {
      console.error('Error updating player profile:', error);
      throw error;
    }
  }

  /**
   * Add achievement to player profile
   * @param {string} playerId - Player ID
   * @param {Object} achievement - Achievement data
   * @returns {Promise<Object>} - Added achievement
   */
  async addAchievement(playerId, achievement) {
    try {
      const newAchievement = {
        id: Date.now().toString(),
        player_id: playerId,
        type: achievement.type,
        title: achievement.title,
        description: achievement.description,
        tournament: achievement.tournament || null,
        date: achievement.date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };

      // This would save to database
      return {
        success: true,
        data: newAchievement
      };
    } catch (error) {
      console.error('Error adding achievement:', error);
      throw error;
    }
  }

  /**
   * Get player statistics
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} - Player statistics
   */
  async getPlayerStatistics(playerId) {
    try {
      const statistics = {
        total_tournaments: 25,
        total_games: 150,
        wins: 89,
        losses: 45,
        draws: 16,
        win_percentage: 59.3,
        current_streak: 3,
        longest_streak: 8,
        average_opponent_rating: 1750,
        upset_wins: 12,
        upset_losses: 8,
        rating_progression: [
          { date: '2024-01-01', rating: 1750 },
          { date: '2024-02-01', rating: 1775 },
          { date: '2024-03-01', rating: 1800 }
        ],
        performance_by_rating_range: {
          '1600-1700': { games: 20, wins: 15, percentage: 75 },
          '1700-1800': { games: 45, wins: 25, percentage: 55.6 },
          '1800-1900': { games: 35, wins: 18, percentage: 51.4 },
          '1900+': { games: 10, wins: 3, percentage: 30 }
        }
      };

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      console.error('Error getting player statistics:', error);
      throw error;
    }
  }

  /**
   * Get player tournament history
   * @param {string} playerId - Player ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Tournament history
   */
  async getPlayerTournamentHistory(playerId, options = {}) {
    try {
      const { limit = 20, offset = 0, year = null } = options;
      
      const tournaments = [
        {
          id: 'tournament-1',
          name: 'Spring Championship 2024',
          date: '2024-03-15',
          format: 'swiss',
          rounds: 5,
          place: 1,
          score: '4.5/5',
          rating_change: '+25',
          opponents: [
            { name: 'Jane Smith', rating: 1750, result: 'W' },
            { name: 'Bob Johnson', rating: 1820, result: 'D' },
            { name: 'Alice Brown', rating: 1780, result: 'W' },
            { name: 'Charlie Wilson', rating: 1850, result: 'W' },
            { name: 'Diana Davis', rating: 1800, result: 'W' }
          ]
        }
      ];

      return {
        success: true,
        data: {
          tournaments,
          total: tournaments.length,
          limit,
          offset
        }
      };
    } catch (error) {
      console.error('Error getting player tournament history:', error);
      throw error;
    }
  }

  /**
   * Search players by name or rating
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async searchPlayers(query, options = {}) {
    try {
      const { limit = 20, offset = 0, minRating = null, maxRating = null } = options;
      
      // This would integrate with your existing player search
      const players = [
        {
          id: '1',
          name: 'John Doe',
          uscf_id: '12345678',
          rating: 1800,
          state: 'CA',
          city: 'San Francisco',
          photo: '/uploads/player-photos/player-1-thumb.jpg'
        }
      ];

      return {
        success: true,
        data: {
          players,
          total: players.length,
          limit,
          offset,
          query
        }
      };
    } catch (error) {
      console.error('Error searching players:', error);
      throw error;
    }
  }

  /**
   * Delete player photo
   * @param {string} playerId - Player ID
   * @param {string} photoType - Photo type (thumb, medium, large)
   * @returns {Promise<Object>} - Deletion result
   */
  async deletePlayerPhoto(playerId, photoType) {
    try {
      // Find and delete photo files
      const photoPattern = `player-${playerId}-${photoType}`;
      const files = await fs.readdir(this.uploadDir);
      const matchingFiles = files.filter(file => file.includes(photoPattern));

      for (const file of matchingFiles) {
        await fs.unlink(path.join(this.uploadDir, file));
      }

      return {
        success: true,
        message: `Deleted ${photoType} photo for player ${playerId}`
      };
    } catch (error) {
      console.error('Error deleting player photo:', error);
      throw error;
    }
  }

  /**
   * Get player achievements by type
   * @param {string} playerId - Player ID
   * @param {string} type - Achievement type
   * @returns {Promise<Object>} - Achievements
   */
  async getPlayerAchievements(playerId, type = null) {
    try {
      const achievements = [
        {
          id: '1',
          type: 'tournament_win',
          title: '1st Place - Open Section',
          tournament: 'Spring Championship 2024',
          date: '2024-03-15',
          description: 'Won the Open section with 4.5/5 points'
        },
        {
          id: '2',
          type: 'rating_milestone',
          title: 'Reached 1800 Rating',
          date: '2024-02-10',
          description: 'Achieved 1800 USCF rating for the first time'
        }
      ];

      const filteredAchievements = type 
        ? achievements.filter(a => a.type === type)
        : achievements;

      return {
        success: true,
        data: filteredAchievements
      };
    } catch (error) {
      console.error('Error getting player achievements:', error);
      throw error;
    }
  }
}

module.exports = new PlayerProfileService();
