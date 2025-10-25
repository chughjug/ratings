// Offline-capable API service wrapper
import pwaService from './pwaService';

class OfflineApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || '/api';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Generic request method with offline support
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${url}`;
    
    // Check cache first for GET requests
    if ((options.method || 'GET') === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached && pwaService.isOnline) {
        return cached;
      }
    }

    try {
      // Try network request
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (response.ok) {
        const data = await response.json();
        
        // Cache successful GET requests
        if ((options.method || 'GET') === 'GET') {
          this.setCache(cacheKey, data);
        }
        
        return data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Network request failed:', error);
      
      // If offline, try to get from cache
      if (!pwaService.isOnline) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          console.log('Serving from cache:', endpoint);
          return { ...cached, _cached: true };
        }
      }
      
      // For non-GET requests, queue for later sync
      if ((options.method || 'GET') !== 'GET') {
        this.queueForSync(url, options);
      }
      
      throw error;
    }
  }

  // GET request with offline support
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  // POST request with offline support
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request with offline support
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request with offline support
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Queue request for offline sync
  queueForSync(url, options) {
    if (pwaService.isOnline) {
      return; // Don't queue if online
    }

    console.log('Queueing request for offline sync:', url);
    pwaService.addToOfflineQueue(url, options.method || 'GET', options.headers || {}, options.body);
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // Tournament-specific methods
  async getTournaments() {
    return this.get('/tournaments');
  }

  async getTournament(id) {
    return this.get(`/tournaments/${id}`);
  }

  async createTournament(tournamentData) {
    try {
      return await this.post('/tournaments', tournamentData);
    } catch (error) {
      if (!pwaService.isOnline) {
        // Store in localStorage for offline creation
        this.storeOfflineTournament(tournamentData);
        return { success: true, message: 'Tournament saved offline', offline: true };
      }
      throw error;
    }
  }

  async updateTournament(id, tournamentData) {
    try {
      return await this.put(`/tournaments/${id}`, tournamentData);
    } catch (error) {
      if (!pwaService.isOnline) {
        this.storeOfflineTournamentUpdate(id, tournamentData);
        return { success: true, message: 'Update saved offline', offline: true };
      }
      throw error;
    }
  }

  // Player-specific methods
  async getPlayers(tournamentId) {
    return this.get(`/tournaments/${tournamentId}/players`);
  }

  async addPlayer(tournamentId, playerData) {
    try {
      return await this.post(`/tournaments/${tournamentId}/players`, playerData);
    } catch (error) {
      if (!pwaService.isOnline) {
        this.storeOfflinePlayer(tournamentId, playerData);
        return { success: true, message: 'Player saved offline', offline: true };
      }
      throw error;
    }
  }

  async updatePlayer(tournamentId, playerId, playerData) {
    try {
      return await this.put(`/tournaments/${tournamentId}/players/${playerId}`, playerData);
    } catch (error) {
      if (!pwaService.isOnline) {
        this.storeOfflinePlayerUpdate(tournamentId, playerId, playerData);
        return { success: true, message: 'Player update saved offline', offline: true };
      }
      throw error;
    }
  }

  // Standings methods
  async getStandings(tournamentId) {
    return this.get(`/tournaments/${tournamentId}/standings`);
  }

  // Pairings methods
  async getPairings(tournamentId, round) {
    return this.get(`/tournaments/${tournamentId}/pairings/${round}`);
  }

  async generatePairings(tournamentId, round) {
    try {
      return await this.post(`/tournaments/${tournamentId}/pairings/${round}`);
    } catch (error) {
      if (!pwaService.isOnline) {
        return { success: false, error: 'Pairing generation requires online connection' };
      }
      throw error;
    }
  }

  // Offline storage methods
  storeOfflineTournament(tournamentData) {
    try {
      const offlineTournaments = this.getOfflineTournaments();
      const tournament = {
        ...tournamentData,
        id: `offline_${Date.now()}`,
        offline: true,
        createdAt: new Date().toISOString()
      };
      
      offlineTournaments.push(tournament);
      localStorage.setItem('offline_tournaments', JSON.stringify(offlineTournaments));
      
      console.log('Tournament stored offline:', tournament.id);
    } catch (error) {
      console.error('Failed to store offline tournament:', error);
    }
  }

  getOfflineTournaments() {
    try {
      const stored = localStorage.getItem('offline_tournaments');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get offline tournaments:', error);
      return [];
    }
  }

  storeOfflineTournamentUpdate(tournamentId, updateData) {
    try {
      const updates = this.getOfflineUpdates();
      const update = {
        id: `update_${Date.now()}`,
        tournamentId,
        type: 'tournament_update',
        data: updateData,
        timestamp: new Date().toISOString()
      };
      
      updates.push(update);
      localStorage.setItem('offline_updates', JSON.stringify(updates));
      
      console.log('Tournament update stored offline:', update.id);
    } catch (error) {
      console.error('Failed to store offline tournament update:', error);
    }
  }

  storeOfflinePlayer(tournamentId, playerData) {
    try {
      const players = this.getOfflinePlayers(tournamentId);
      const player = {
        ...playerData,
        id: `offline_player_${Date.now()}`,
        tournamentId,
        offline: true,
        createdAt: new Date().toISOString()
      };
      
      players.push(player);
      localStorage.setItem(`offline_players_${tournamentId}`, JSON.stringify(players));
      
      console.log('Player stored offline:', player.id);
    } catch (error) {
      console.error('Failed to store offline player:', error);
    }
  }

  getOfflinePlayers(tournamentId) {
    try {
      const stored = localStorage.getItem(`offline_players_${tournamentId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get offline players:', error);
      return [];
    }
  }

  storeOfflinePlayerUpdate(tournamentId, playerId, updateData) {
    try {
      const updates = this.getOfflineUpdates();
      const update = {
        id: `player_update_${Date.now()}`,
        tournamentId,
        playerId,
        type: 'player_update',
        data: updateData,
        timestamp: new Date().toISOString()
      };
      
      updates.push(update);
      localStorage.setItem('offline_updates', JSON.stringify(updates));
      
      console.log('Player update stored offline:', update.id);
    } catch (error) {
      console.error('Failed to store offline player update:', error);
    }
  }

  getOfflineUpdates() {
    try {
      const stored = localStorage.getItem('offline_updates');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get offline updates:', error);
      return [];
    }
  }

  // Sync offline data when back online
  async syncOfflineData() {
    if (!pwaService.isOnline) {
      return;
    }

    console.log('Syncing offline data...');

    try {
      // Sync offline tournaments
      const offlineTournaments = this.getOfflineTournaments();
      for (const tournament of offlineTournaments) {
        try {
          await this.post('/tournaments', tournament);
          this.removeOfflineTournament(tournament.id);
          console.log('Synced offline tournament:', tournament.id);
        } catch (error) {
          console.error('Failed to sync offline tournament:', error);
        }
      }

      // Sync offline updates
      const updates = this.getOfflineUpdates();
      for (const update of updates) {
        try {
          if (update.type === 'tournament_update') {
            await this.put(`/tournaments/${update.tournamentId}`, update.data);
          } else if (update.type === 'player_update') {
            await this.put(`/tournaments/${update.tournamentId}/players/${update.playerId}`, update.data);
          }
          
          this.removeOfflineUpdate(update.id);
          console.log('Synced offline update:', update.id);
        } catch (error) {
          console.error('Failed to sync offline update:', error);
        }
      }

      console.log('Offline data sync completed');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  }

  removeOfflineTournament(id) {
    try {
      const tournaments = this.getOfflineTournaments();
      const filtered = tournaments.filter(t => t.id !== id);
      localStorage.setItem('offline_tournaments', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove offline tournament:', error);
    }
  }

  removeOfflineUpdate(id) {
    try {
      const updates = this.getOfflineUpdates();
      const filtered = updates.filter(u => u.id !== id);
      localStorage.setItem('offline_updates', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove offline update:', error);
    }
  }

  // Get combined data (online + offline)
  async getCombinedTournaments() {
    try {
      const onlineTournaments = await this.getTournaments();
      const offlineTournaments = this.getOfflineTournaments();
      
      return {
        success: true,
        data: [...onlineTournaments.data, ...offlineTournaments]
      };
    } catch (error) {
      // If online fails, return offline data
      const offlineTournaments = this.getOfflineTournaments();
      return {
        success: true,
        data: offlineTournaments,
        offline: true
      };
    }
  }

  async getCombinedPlayers(tournamentId) {
    try {
      const onlinePlayers = await this.getPlayers(tournamentId);
      const offlinePlayers = this.getOfflinePlayers(tournamentId);
      
      return {
        success: true,
        data: [...onlinePlayers.data, ...offlinePlayers]
      };
    } catch (error) {
      // If online fails, return offline data
      const offlinePlayers = this.getOfflinePlayers(tournamentId);
      return {
        success: true,
        data: offlinePlayers,
        offline: true
      };
    }
  }
}

// Create singleton instance
const offlineApiService = new OfflineApiService();

// Set up automatic sync when back online
window.addEventListener('online', () => {
  offlineApiService.syncOfflineData();
});

export default offlineApiService;
