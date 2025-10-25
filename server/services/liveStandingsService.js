const WebSocket = require('ws');
const EventEmitter = require('events');

class LiveStandingsService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map(); // tournamentId -> Set of WebSocket connections
    this.tournamentData = new Map(); // tournamentId -> cached standings data
    this.updateIntervals = new Map(); // tournamentId -> interval ID
    this.isInitialized = false;
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    if (this.isInitialized) return;

    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/standings',
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection for live standings');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });

    this.isInitialized = true;
    console.log('Live Standings WebSocket server initialized');
  }

  /**
   * Handle incoming WebSocket messages
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} data - Message data
   */
  handleMessage(ws, data) {
    const { type, tournamentId, ...payload } = data;

    switch (type) {
      case 'subscribe':
        this.subscribeToTournament(ws, tournamentId);
        break;
      case 'unsubscribe':
        this.unsubscribeFromTournament(ws, tournamentId);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  /**
   * Subscribe client to tournament standings updates
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} tournamentId - Tournament ID
   */
  subscribeToTournament(ws, tournamentId) {
    if (!tournamentId) {
      ws.send(JSON.stringify({ error: 'Tournament ID required' }));
      return;
    }

    // Add client to tournament
    if (!this.clients.has(tournamentId)) {
      this.clients.set(tournamentId, new Set());
    }
    this.clients.get(tournamentId).add(ws);

    // Store tournament ID on WebSocket
    ws.tournamentId = tournamentId;

    // Send current standings if available
    if (this.tournamentData.has(tournamentId)) {
      this.sendStandingsUpdate(ws, tournamentId, this.tournamentData.get(tournamentId));
    }

    // Start live updates if not already running
    this.startLiveUpdates(tournamentId);

    console.log(`Client subscribed to tournament ${tournamentId}`);
  }

  /**
   * Unsubscribe client from tournament standings updates
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} tournamentId - Tournament ID
   */
  unsubscribeFromTournament(ws, tournamentId) {
    if (this.clients.has(tournamentId)) {
      this.clients.get(tournamentId).delete(ws);
      
      // Stop live updates if no clients
      if (this.clients.get(tournamentId).size === 0) {
        this.stopLiveUpdates(tournamentId);
      }
    }

    console.log(`Client unsubscribed from tournament ${tournamentId}`);
  }

  /**
   * Remove client from all tournaments
   * @param {WebSocket} ws - WebSocket connection
   */
  removeClient(ws) {
    if (ws.tournamentId) {
      this.unsubscribeFromTournament(ws, ws.tournamentId);
    }
  }

  /**
   * Start live updates for tournament
   * @param {string} tournamentId - Tournament ID
   */
  startLiveUpdates(tournamentId) {
    if (this.updateIntervals.has(tournamentId)) return;

    const interval = setInterval(async () => {
      try {
        await this.updateTournamentStandings(tournamentId);
      } catch (error) {
        console.error(`Error updating standings for tournament ${tournamentId}:`, error);
      }
    }, 5000); // Update every 5 seconds

    this.updateIntervals.set(tournamentId, interval);
    console.log(`Started live updates for tournament ${tournamentId}`);
  }

  /**
   * Stop live updates for tournament
   * @param {string} tournamentId - Tournament ID
   */
  stopLiveUpdates(tournamentId) {
    const interval = this.updateIntervals.get(tournamentId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(tournamentId);
      console.log(`Stopped live updates for tournament ${tournamentId}`);
    }
  }

  /**
   * Update tournament standings and broadcast to clients
   * @param {string} tournamentId - Tournament ID
   */
  async updateTournamentStandings(tournamentId) {
    try {
      // This would integrate with your existing pairing system
      const standings = await this.fetchTournamentStandings(tournamentId);
      
      if (standings) {
        // Cache the data
        this.tournamentData.set(tournamentId, {
          tournamentId,
          standings,
          lastUpdated: new Date().toISOString(),
          round: standings.currentRound || 1
        });

        // Broadcast to all subscribed clients
        this.broadcastStandingsUpdate(tournamentId, this.tournamentData.get(tournamentId));
      }
    } catch (error) {
      console.error(`Error updating standings for tournament ${tournamentId}:`, error);
    }
  }

  /**
   * Fetch tournament standings from database
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} - Standings data
   */
  async fetchTournamentStandings(tournamentId) {
    // This would integrate with your existing database
    // For now, return mock data
    return {
      tournamentId,
      currentRound: 3,
      totalRounds: 5,
      standings: [
        {
          rank: 1,
          player: { id: '1', name: 'John Doe', rating: 1800 },
          score: 3.0,
          tiebreaks: { buchholz: 8.5, sonneborn: 6.0 },
          roundResults: ['W', 'W', 'D']
        },
        {
          rank: 2,
          player: { id: '2', name: 'Jane Smith', rating: 1750 },
          score: 2.5,
          tiebreaks: { buchholz: 7.0, sonneborn: 4.5 },
          roundResults: ['W', 'D', 'D']
        }
      ],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Broadcast standings update to all clients subscribed to tournament
   * @param {string} tournamentId - Tournament ID
   * @param {Object} data - Standings data
   */
  broadcastStandingsUpdate(tournamentId, data) {
    const clients = this.clients.get(tournamentId);
    if (!clients) return;

    const message = JSON.stringify({
      type: 'standings_update',
      tournamentId,
      data
    });

    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        // Remove dead connections
        clients.delete(ws);
      }
    });
  }

  /**
   * Send standings update to specific client
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} tournamentId - Tournament ID
   * @param {Object} data - Standings data
   */
  sendStandingsUpdate(ws, tournamentId, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'standings_update',
        tournamentId,
        data
      }));
    }
  }

  /**
   * Manually trigger standings update for tournament
   * @param {string} tournamentId - Tournament ID
   */
  async triggerUpdate(tournamentId) {
    await this.updateTournamentStandings(tournamentId);
  }

  /**
   * Get current standings for tournament
   * @param {string} tournamentId - Tournament ID
   * @returns {Object|null} - Cached standings data
   */
  getCurrentStandings(tournamentId) {
    return this.tournamentData.get(tournamentId) || null;
  }

  /**
   * Get connected clients count for tournament
   * @param {string} tournamentId - Tournament ID
   * @returns {number} - Number of connected clients
   */
  getConnectedClientsCount(tournamentId) {
    const clients = this.clients.get(tournamentId);
    return clients ? clients.size : 0;
  }

  /**
   * Get all active tournaments
   * @returns {Array} - List of active tournament IDs
   */
  getActiveTournaments() {
    return Array.from(this.clients.keys());
  }

  /**
   * Force update standings for all active tournaments
   */
  async updateAllActiveTournaments() {
    const activeTournaments = this.getActiveTournaments();
    const updatePromises = activeTournaments.map(tournamentId => 
      this.updateTournamentStandings(tournamentId)
    );
    
    await Promise.all(updatePromises);
  }

  /**
   * Clean up inactive connections and data
   */
  cleanup() {
    // Remove empty tournament entries
    for (const [tournamentId, clients] of this.clients.entries()) {
      if (clients.size === 0) {
        this.clients.delete(tournamentId);
        this.stopLiveUpdates(tournamentId);
        this.tournamentData.delete(tournamentId);
      }
    }
  }

  /**
   * Get service statistics
   * @returns {Object} - Service statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      activeTournaments: this.getActiveTournaments().length,
      totalClients: Array.from(this.clients.values()).reduce((sum, clients) => sum + clients.size, 0),
      cachedTournaments: this.tournamentData.size,
      activeIntervals: this.updateIntervals.size
    };
  }

  /**
   * Shutdown the service
   */
  shutdown() {
    // Stop all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    // Close all WebSocket connections
    if (this.wss) {
      this.wss.close();
    }

    // Clear all data
    this.clients.clear();
    this.tournamentData.clear();

    console.log('Live Standings service shutdown complete');
  }
}

module.exports = new LiveStandingsService();
