import axios from 'axios';
import { Tournament, Player, Pairing, Standing, PlayerInactiveRound } from '../types';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // If explicitly set in environment variables, use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production (Heroku), use relative URLs
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // In development, use full URL to localhost:5000
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('API_BASE_URL:', API_BASE_URL);
console.log('Environment:', process.env.NODE_ENV);
console.log('Window location:', window.location.href);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  timeout: 15000, // 15 second timeout for better error handling
  withCredentials: false // Disable credentials for CORS
});

// Add request interceptor for authentication and debugging
api.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache-busting parameter to prevent cached requests
    if (config.method === 'get') {
      const separator = config.url?.includes('?') ? '&' : '?';
      config.url = `${config.url}${separator}t=${Date.now()}`;
    }
    
    // Enhanced debugging
    console.log('🌐 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      timeout: config.timeout,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href
    });
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging and authentication error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      dataLength: response.data ? JSON.stringify(response.data).length : 0,
      headers: response.headers,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  async (error) => {
    console.error('❌ API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      code: error.code,
      timeout: error.code === 'ECONNABORTED',
      networkError: !error.response,
      fullError: error,
      timestamp: new Date().toISOString()
    });
    
    // Handle network errors with retry logic
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
      console.log('Network error detected, attempting retry...');
      
      // Retry logic for network errors
      const config = error.config;
      if (!config || config.__retryCount >= 3) {
        return Promise.reject(error);
      }
      
      // Initialize retry count if not exists
      if (!config.__retryCount) {
        config.__retryCount = 0;
      }
      
      config.__retryCount++;
      console.log(`Retrying request (${config.__retryCount}/3)...`);
      
      // Wait before retry with exponential backoff
      const delay = 1000 * Math.pow(2, config.__retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return api(config);
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login or refresh the page
      window.location.reload();
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Tournament API
export const tournamentApi = {
  getAll: () => api.get<{success: boolean, data: Tournament[], error?: string}>(`/tournaments?t=${Date.now()}`),
  getById: (id: string) => api.get<{success: boolean, data: Tournament, error?: string}>(`/tournaments/${id}?t=${Date.now()}`),
  getPublic: (id: string) => api.get<{success: boolean, data: any, error?: string}>(`/tournaments/${id}/public?t=${Date.now()}`),
  create: (tournament: Omit<Tournament, 'id' | 'created_at'>) => 
    api.post<{success: boolean, data: {id: string}, error?: string}>('/tournaments', tournament),
  update: (id: string, tournament: Partial<Tournament>) => 
    api.put(`/tournaments/${id}`, tournament),
  delete: (id: string) => api.delete(`/tournaments/${id}`),
  completeTournament: (id: string) => 
    api.post<{success: boolean, message: string, prizeResult?: any, error?: string}>(`/tournaments/${id}/complete`),
  // Prize management
  getPrizes: (id: string) => api.get<{success: boolean, data: any[], error?: string}>(`/tournaments/${id}/prizes`),
  calculatePrizes: (id: string) => api.post<{success: boolean, data: any[], message?: string, error?: string}>(`/tournaments/${id}/prizes/calculate`),
  updatePrizeSettings: (id: string, prizeSettings: any) => 
    api.put<{success: boolean, message: string, error?: string}>(`/tournaments/${id}/prize-settings`, { prizeSettings }),
  // Team-related endpoints
  getTeamStandings: (id: string, params?: {type?: string, scoring_method?: string, top_n?: number}) => {
    const queryParams = new URLSearchParams();
    if (params?.scoring_method) queryParams.append('scoring_method', params.scoring_method);
    if (params?.top_n) queryParams.append('top_n', params.top_n.toString());
    queryParams.append('t', Date.now().toString());
    
    return api.get<{success: boolean, standings: any[], type: string, scoring_method: string, top_n?: number, error?: string}>(`/teams/tournament/${id}/standings?${queryParams.toString()}`);
  },
  getTeamPairings: (id: string, round: number) => 
    api.get<{success: boolean, data: any[], error?: string}>(`/teams/tournament/${id}/round/${round}/results?t=${Date.now()}`),
  getTeamMatchResults: (id: string, round: number) => 
    api.get<{success: boolean, results: any[], error?: string}>(`/teams/tournament/${id}/round/${round}/match-results?t=${Date.now()}`),
};

// Player API
export const playerApi = {
  getByTournament: (tournamentId: string) => 
    api.get<{success: boolean, data: Player[], error?: string}>(`/players/tournament/${tournamentId}?t=${Date.now()}`),
  getById: (id: string) => api.get<{success: boolean, data: Player, error?: string}>(`/players/${id}?t=${Date.now()}`),
  create: (player: Omit<Player, 'id' | 'created_at'>) => 
    api.post<{success: boolean, data: Player, error?: string}>('/players', player),
  update: (id: string, player: Partial<Player>) => 
    api.put(`/players/${id}`, player),
  delete: (id: string) => api.delete(`/players/${id}`),
  bulkCreate: (tournamentId: string, players: Omit<Player, 'id' | 'tournament_id' | 'created_at'>[]) =>
    api.post('/players/bulk', { tournament_id: tournamentId, players }),
  search: (searchTerm: string, limit?: number) =>
    api.get<{success: boolean, data: {players: any[], count: number}, error?: string}>(`/players/search?q=${encodeURIComponent(searchTerm)}${limit ? `&limit=${limit}` : ''}&t=${Date.now()}`),
  getDetails: (uscfId: string) =>
    api.get<any>(`/players/details/${uscfId}?t=${Date.now()}`),
  downloadTemplate: () =>
    api.get('/players/csv-template', { responseType: 'blob' }),
  downloadExcelTemplate: () =>
    api.get('/players/excel-template', { responseType: 'blob' }),
  uploadCSV: (file: File, tournamentId: string, lookupRatings: boolean = true) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    formData.append('tournament_id', tournamentId);
    formData.append('lookup_ratings', lookupRatings.toString());
    return api.post('/players/csv-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadExcel: (file: File, tournamentId: string, lookupRatings: boolean = true) => {
    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('tournament_id', tournamentId);
    formData.append('lookup_ratings', lookupRatings.toString());
    return api.post('/players/excel-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  importCSV: (tournamentId: string, players: any[], lookupRatings: boolean = true) =>
    api.post('/players/csv-import', { tournament_id: tournamentId, players, lookup_ratings: lookupRatings }),
  importExcel: (tournamentId: string, players: any[], lookupRatings: boolean = true) =>
    api.post('/players/excel-import', { tournament_id: tournamentId, players, lookup_ratings: lookupRatings }),
  setInactiveRound: (playerId: string, round: number, reason?: string) =>
    api.post(`/players/${playerId}/inactive-round`, { round, reason }),
  removeInactiveRound: (playerId: string, round: number) =>
    api.delete(`/players/${playerId}/inactive-round/${round}`),
  getInactiveRounds: (playerId: string) =>
    api.get<{success: boolean, data: PlayerInactiveRound[], error?: string}>(`/players/${playerId}/inactive-rounds?t=${Date.now()}`),
  getTournamentInactiveRounds: (tournamentId: string) =>
    api.get<{success: boolean, data: PlayerInactiveRound[], error?: string}>(`/players/tournament/${tournamentId}/inactive-rounds?t=${Date.now()}`),
  deleteDuplicates: (tournamentId: string, criteria: 'name' | 'uscf_id' | 'both' = 'name') =>
    api.post<{
      success: boolean;
      message: string;
      deletedCount: number;
      duplicates: Array<{
        key: string;
        kept: { id: string; name: string; uscf_id?: string };
        deleted: Array<{ id: string; name: string; uscf_id?: string }>;
      }>;
      deletedPlayers: Array<{
        id: string;
        name: string;
        uscf_id?: string;
        reason: string;
      }>;
    }>(`/players/delete-duplicates/${tournamentId}`, { criteria }),
};

// Pairing API with enhanced round independence
export const pairingApi = {
  getByRound: (tournamentId: string, round: number) => 
    api.get<Pairing[]>(`/pairings/tournament/${tournamentId}/round/${round}?t=${Date.now()}`),
  
  // NEW: Get all pairings grouped by round for independent round management
  getAllByTournament: (tournamentId: string) => 
    api.get<{
      success: boolean;
      tournamentId: string;
      pairingsByRound: Record<string, Pairing[]>;
      totalRounds: number;
      rounds: Array<{
        round: number;
        pairingsCount: number;
        sections: string[];
      }>;
    }>(`/pairings/tournament/${tournamentId}/all?t=${Date.now()}`),
  
  // NEW: Get status for all rounds
  getAllRoundsStatus: (tournamentId: string) => 
    api.get<{
      success: boolean;
      tournamentId: string;
      totalRounds: number;
      roundsStatus: Record<string, any>;
    }>(`/pairings/tournament/${tournamentId}/rounds/status?t=${Date.now()}`),
  
  getDisplay: (tournamentId: string, options?: {
    round?: number;
    display_format?: 'default' | 'compact' | 'detailed';
    show_ratings?: boolean;
    show_uscf_ids?: boolean;
    board_numbers?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (options?.round) params.append('round', options.round.toString());
    if (options?.display_format) params.append('display_format', options.display_format);
    if (options?.show_ratings !== undefined) params.append('show_ratings', options.show_ratings.toString());
    if (options?.show_uscf_ids !== undefined) params.append('show_uscf_ids', options.show_uscf_ids.toString());
    if (options?.board_numbers !== undefined) params.append('board_numbers', options.board_numbers.toString());
    params.append('t', Date.now().toString());
    
    return api.get<any>(`/pairings/tournament/${tournamentId}/display?${params.toString()}`);
  },
  
  // Enhanced generate with round independence
  generate: (tournamentId: string, round: number, clearExisting: boolean = false) => 
    api.post<{
      success: boolean;
      message: string;
      pairings: Pairing[];
      sectionResults: any;
      metadata: any;
      roundStatus: any;
    }>('/pairings/generate', { tournamentId, round, clearExisting }),
  
  generateForSection: (tournamentId: string, round: number, sectionName: string) => 
    api.post('/pairings/generate/section', { tournamentId, round, sectionName }),
  
  // Section-specific pairing methods
  generateSectionPairings: (tournamentId: string, round: number, sectionName: string) => 
    api.post<{
      success: boolean;
      message: string;
      pairings: any[];
      sectionResults: any;
      sectionStatus: any;
    }>('/pairings/generate/section', { tournamentId, round, sectionName }),
  
  getSectionPairings: (tournamentId: string, round: number, sectionName: string) => 
    api.get<{
      success: boolean;
      tournamentId: string;
      round: number;
      section: string;
      pairings: any[];
      sectionStatus: any;
      pairingsCount: number;
    }>(`/pairings/tournament/${tournamentId}/round/${round}/section/${sectionName}`),
  
  getSectionStatus: (tournamentId: string, round: number, sectionName: string) => 
    api.get<{
      success: boolean;
      tournamentId: string;
      round: number;
      section: string;
      totalPairings: number;
      completedPairings: number;
      pendingPairings: number;
      percentage: number;
      isComplete: boolean;
      hasPairings: boolean;
      canGenerateNextRound: boolean;
    }>(`/pairings/tournament/${tournamentId}/round/${round}/section/${sectionName}/status`),
  
  updateResult: (id: string, result: string) => 
    api.put(`/pairings/${id}/result`, { result }),

  // Drag and drop pairing methods
  updatePairingPlayers: (pairingId: string, whitePlayerId: string, blackPlayerId: string, whitePlayer: any, blackPlayer: any) => 
    api.put(`/pairings/pairing/${pairingId}/players`, { whitePlayerId, blackPlayerId, whitePlayer, blackPlayer }),

  createCustomPairing: (tournamentId: string, round: number, section: string, whitePlayer: any, blackPlayer: any) => 
    api.post('/pairings/pairing/custom', { tournamentId, round, section, whitePlayer, blackPlayer }),

  deletePairing: (pairingId: string) => 
    api.delete(`/pairings/pairing/${pairingId}`),

  resetPairings: (tournamentId: string, round: number, sectionName?: string) => 
    api.post(`/pairings/tournament/${tournamentId}/round/${round}/reset`, { sectionName }),

  updateTournamentStatus: (tournamentId: string, status: string) => 
    api.put(`/tournaments/${tournamentId}/status`, { status }),
  
  completeRound: (tournamentId: string, round: number, sectionName: string) => 
    api.post(`/pairings/tournament/${tournamentId}/round/${round}/complete`, { sectionName }),
  
  // Enhanced round status with section breakdown
  getRoundStatus: (tournamentId: string, round: number, section?: string) => 
    api.get<{
      success: boolean;
      tournamentId: string;
      round: number;
      totalPairings: number;
      completedPairings: number;
      incompletePairings: number;
      completionPercentage: number;
      isComplete: boolean;
      hasPairings: boolean;
      canGenerateNextRound: boolean;
      sections: Record<string, {
        total: number;
        completed: number;
        pending: number;
        percentage: number;
        isComplete: boolean;
      }>;
    }>(`/pairings/tournament/${tournamentId}/round/${round}/status?t=${Date.now()}${section ? `&section=${section}` : ''}`),
  
  getStandings: (tournamentId: string, includeRoundResults: boolean = false, showPrizes: boolean = false) => 
    api.get<{success: boolean, data: Standing[], error?: string}>(`/pairings/tournament/${tournamentId}/standings?t=${Date.now()}&includeRoundResults=${includeRoundResults}&showPrizes=${showPrizes}`),
};

// Export API
export const exportApi = {
  exportDBF: (tournamentId: string, exportPath?: string) =>
    api.get(`/export/dbf/${tournamentId}${exportPath ? `?exportPath=${encodeURIComponent(exportPath)}` : ''}`),
  downloadDBF: (tournamentId: string) =>
    api.get(`/export/dbf/${tournamentId}/download`, { responseType: 'blob' }),
  getExportStatus: (tournamentId: string) =>
    api.get(`/export/status/${tournamentId}`),
};


// Team API
export const teamApi = {
  getTournamentTeams: (tournamentId: string) =>
    api.get<{success: boolean, teams: any[], error?: string}>(`/teams/tournament/${tournamentId}`),
  getTeamMembers: (tournamentId: string) =>
    api.get<{success: boolean, members: any[], error?: string}>(`/teams/tournament/${tournamentId}/members`),
  getTeamStandings: (tournamentId: string, scoringMethod?: string, topN?: number) => {
    const params = new URLSearchParams();
    if (scoringMethod) params.append('scoring_method', scoringMethod);
    if (topN) params.append('top_n', topN.toString());
    return api.get<{success: boolean, standings: any[], type: string, scoring_method: string, top_n?: number, error?: string}>(`/teams/tournament/${tournamentId}/standings?${params.toString()}`);
  }
};

// Registration API
export const registrationApi = {
  getTournamentInfo: (tournamentId: string) =>
    api.get<{success: boolean, data: {
      id: string;
      name: string;
      format: string;
      rounds: number;
      start_date?: string;
      end_date?: string;
      sections: Array<{
        name: string;
        min_rating?: number;
        max_rating?: number;
        description?: string;
      }>;
    }, error?: string}>(`/registrations/tournament/${tournamentId}/info`),
  searchPlayers: (searchTerm: string, limit: number = 10) =>
    api.get<{success: boolean, data: {
      players: Array<{
        name: string;
        memberId: string;
        state: string;
        ratings: {
          regular: number | null;
          quick: number | null;
          blitz: number | null;
          online_regular: number | null;
          online_quick: number | null;
          online_blitz: number | null;
        };
        uscf_id: string;
        rating: number | null;
        email?: string;
        phone?: string;
      }>;
      count: number;
    }, error?: string}>(`/registrations/search-players?q=${encodeURIComponent(searchTerm)}&limit=${limit}`),
  submitRegistration: (registrationData: {
    tournament_id: string;
    player_name: string;
    uscf_id?: string;
    rating?: number;
    email: string;
    phone?: string;
    section?: string;
    bye_requests?: number[];
    notes?: string;
  }) =>
    api.post<{success: boolean, data: {
      registration_id: string;
      player_id: string;
    }, message?: string, error?: string}>(`/registrations/submit`, registrationData),
  getRegistrationStatus: (registrationId: string) =>
    api.get<{success: boolean, data: {
      id: string;
      tournament_id: string;
      player_name: string;
      uscf_id?: string;
      email: string;
      phone?: string;
      section?: string;
      status: string;
      created_at: string;
      tournament_name?: string;
      player_status?: string;
    }, error?: string}>(`/registrations/status/${registrationId}`),
};

// User API for profile and API key management
export const userApi = {
  // Get user's API keys
  getApiKeys: (userId: string) =>
    api.get<{success: boolean, data: any[], error?: string}>(`/users/${userId}/api-keys`),
  
  // Generate new API key
  generateApiKey: (userId: string, keyData: {
    name: string;
    description: string;
    permissions: string;
    rate_limit: number;
  }) =>
    api.post<{success: boolean, data: {api_key: string, key_id: string}, error?: string}>(`/users/${userId}/api-key`, keyData),
  
  // Update API key
  updateApiKey: (userId: string, keyId: string, updates: {
    name?: string;
    description?: string;
    permissions?: string;
    rate_limit?: number;
  }) =>
    api.put<{success: boolean, error?: string}>(`/users/${userId}/api-keys/${keyId}`, updates),
  
  // Revoke API key
  revokeApiKey: (userId: string, keyId: string) =>
    api.delete<{success: boolean, error?: string}>(`/users/${userId}/api-keys/${keyId}`),
  
  // Get API key statistics
  getApiKeyStats: (userId: string, keyId: string) =>
    api.get<{success: boolean, data: any, error?: string}>(`/users/${userId}/api-keys/${keyId}/stats`)
};

// Pairing Editor API for advanced editing features
export const pairingEditorApi = {
  // Update a single pairing
  updatePairing: (pairingId: string, updates: Partial<Pairing>) =>
    api.put(`/pairing-editor/pairing/${pairingId}`, updates),
  
  // Swap players in a pairing
  swapPlayers: (pairingId: string) =>
    api.post(`/pairing-editor/pairing/${pairingId}/swap`),
  
  // Swap two pairings (exchange board numbers)
  swapPairings: (pairingId1: string, pairingId2: string) =>
    api.post('/pairing-editor/pairings/swap', { pairingId1, pairingId2 }),
  
  // Move a player from one pairing to another
  movePlayer: (fromPairingId: string, toPairingId: string, position: 'white' | 'black') =>
    api.post('/pairing-editor/pairings/move-player', { fromPairingId, toPairingId, position }),
  
  // Delete a pairing
  deletePairing: (pairingId: string) =>
    api.delete(`/pairing-editor/pairing/${pairingId}`),
  
  // Duplicate a pairing
  duplicatePairing: (pairingId: string, newBoard?: number) =>
    api.post(`/pairing-editor/pairing/${pairingId}/duplicate`, { newBoard }),
  
  // Bulk update pairings
  bulkUpdate: (pairings: Pairing[]) =>
    api.put('/pairing-editor/pairings/bulk', { pairings }),
  
  // Validate pairings for conflicts
  validatePairings: (pairings: Pairing[], tournamentId: string, round: number) =>
    api.post('/pairing-editor/pairings/validate', { pairings, tournamentId, round }),
  
  // Get pairing history
  getHistory: (tournamentId: string, round?: number, section?: string) => {
    const params = new URLSearchParams();
    if (round) params.append('round', round.toString());
    if (section) params.append('section', section);
    return api.get(`/pairing-editor/tournament/${tournamentId}/history?${params.toString()}`);
  }
};

export default api;
