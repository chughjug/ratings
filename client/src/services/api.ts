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
  
  // In development, use full URL to localhost:5000 (backend server port)
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
  getSections: (id: string) => api.get<{success: boolean, data: string[], error?: string}>(`/tournaments/${id}/sections`),
  getPrizes: (id: string) => api.get<{success: boolean, data: any[], error?: string}>(`/tournaments/${id}/prizes`),
  calculatePrizes: (id: string) => api.post<{success: boolean, data: any[], message?: string, error?: string}>(`/tournaments/${id}/prizes/calculate`),
  updatePrizeSettings: (id: string, prizeSettings: any) => 
    api.put<{success: boolean, message: string, error?: string}>(`/tournaments/${id}/prize-settings`, { prizeSettings }),
  generatePrizeStructure: (id: string, prizeFund?: number) => 
    api.post<{success: boolean, data: any, message?: string, error?: string}>(`/tournaments/${id}/generate-prize-structure`, { prizeFund }),
  // Section management
  mergeSections: (id: string, sourceSection: string, targetSection: string, removeSourceSection?: boolean) =>
    api.post<{success: boolean, message: string, data: {playersUpdated: number, pairingsUpdated: number, sourceSectionRemoved: boolean}, error?: string}>(
      `/tournaments/${id}/merge-sections`,
      { sourceSection, targetSection, removeSourceSection: removeSourceSection ?? false }
    ),
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
  getPlayerPerformance: (tournamentId: string, playerId: string) =>
    api.get<{success: boolean, tournament: any, player: any, roundPerformance: any[], positionHistory: any[], standings: any[], statistics: any, error?: string}>(`/tournaments/${tournamentId}/player/${playerId}/performance?t=${Date.now()}`),
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
  getByRound: (tournamentId: string, round: number, sectionName?: string) => 
    api.get<Pairing[]>(`/pairings/tournament/${tournamentId}/round/${round}?t=${Date.now()}${sectionName ? `&section=${sectionName}` : ''}`),
  
  getBySection: (tournamentId: string, sectionName: string) => 
    api.get<Pairing[]>(`/pairings/tournament/${tournamentId}/section/${sectionName}?t=${Date.now()}`),
  
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
  
  generateForSection: (tournamentId: string, round: number, sectionName: string, startingBoardNumber: number = 1) => 
    api.post('/pairings/generate/section', { tournamentId, round, sectionName, startingBoardNumber }),
  
  generateQuad: (tournamentId: string) =>
    api.post<{
      success: boolean;
      message?: string;
      error?: string;
      data?: {
        totalRounds: number;
        roundsData: Array<{
          round: number;
          quadCount: number;
          totalGames: number;
          totalByes: number;
          pairingsCount: number;
        }>;
        totalGamesAllRounds: number;
        totalByesAllRounds: number;
        message: string;
      };
    }>('/pairings/generate/quad', { tournamentId }),
  
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

  // Section management methods
  getSectionStatusSimple: (tournamentId: string, sectionName: string) =>
    api.get<{
      currentRound: number;
      totalRounds: number;
      isComplete: boolean;
      hasIncompleteResults: boolean;
      canGenerateNextRound: boolean;
      canCompleteRound: boolean;
      hasPairings: boolean;
    }>(`/pairings/tournament/${tournamentId}/section/${sectionName}/status`),

  resetSection: (tournamentId: string, sectionName: string) =>
    api.post(`/pairings/tournament/${tournamentId}/section/${sectionName}/reset`),

  generateNextRound: (tournamentId: string, sectionName: string) =>
    api.post(`/pairings/tournament/${tournamentId}/section/${sectionName}/generate-next`),

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
  
  // Edit functions
  updateBoardNumber: (pairingId: string, boardNumber: number) =>
    api.put<{success: boolean, message: string}>(`/pairings/${pairingId}/board-number`, { boardNumber }),
  
  delete: (pairingId: string) =>
    api.delete<{success: boolean, message: string}>(`/pairings/${pairingId}`),
  
  createManual: (tournamentId: string, sectionName: string, round: number, boardNumber: number) =>
    api.post<{success: boolean, message: string, pairing: Pairing}>(`/pairings/manual`, {
      tournamentId,
      sectionName,
      round,
      boardNumber
    }),
  
  createManualWithPlayers: (tournamentId: string, sectionName: string, round: number, boardNumber: number, whitePlayerId: string, blackPlayerId: string) =>
    api.post<{success: boolean, message: string, pairing: Pairing}>(`/pairings/manual`, {
      tournamentId,
      sectionName,
      round,
      boardNumber,
      whitePlayerId,
      blackPlayerId
    }),
  
  swapPairings: (pairingId1: string, pairingId2: string) =>
    api.post<{success: boolean, message: string}>(`/pairings/swap`, {
      pairingId1,
      pairingId2
    }),
  
  swapPlayers: (pairingId1: string, pairingId2: string, position1: 'white' | 'black', position2: 'white' | 'black') =>
    api.post<{success: boolean, message: string}>(`/pairings/swap-players`, {
      pairingId1,
      pairingId2,
      position1,
      position2
    }),
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
      entry_fee?: number;
      payment_enabled?: boolean;
      payment_settings?: any;
      sections: Array<{
        name: string;
        min_rating?: number;
        max_rating?: number;
        description?: string;
      }>;
      custom_fields?: Array<{
        id?: string;
        label?: string;
        name?: string;  // For backward compatibility
        type: string;
        required: boolean;
        options?: string[];
        placeholder?: string;
      }>;
      registration_form_settings?: any;
      allow_registration?: boolean;
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
    payment_amount?: number;
    payment_method?: string;
    payment_intent_id?: string;
    payment_status?: string;
    custom_fields?: any[];
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

// SMS API
export const smsApi = {
  // Send single SMS
  sendSMS: (phoneNumber: string, message: string, options?: any) =>
    api.post('/sms/send', { phoneNumber, message, options }),
  
  // Send bulk SMS
  sendBulkSMS: (recipients: Array<{phoneNumber: string, message: string, playerName: string}>, options?: any) =>
    api.post('/sms/bulk', { recipients, options }),
  
  // Send tournament notification
  sendTournamentNotification: (tournamentId: string, notificationType: string, data?: any) =>
    api.post(`/sms/tournament/${tournamentId}/notify`, { notificationType, data }),
  
  // Get SMS delivery status
  getDeliveryStatus: (messageId: string) =>
    api.get(`/sms/status/${messageId}`),
  
  // Get SMS usage statistics
  getStats: (startDate: string, endDate: string) =>
    api.get(`/sms/stats?startDate=${startDate}&endDate=${endDate}`),
  
  // Test SMS configuration
  testSMS: (phoneNumber: string) =>
    api.post('/sms/test', { phoneNumber }),
  
  // Get SMS configuration status
  getConfig: () =>
    api.get('/sms/config')
};

// QR Code API
export const qrCodeApi = {
  // Generate pairings QR code
  generatePairings: (tournamentId: string, round: number, options?: any) =>
    api.post('/qr-codes/pairings', { tournamentId, round, options }),
  
  // Generate standings QR code
  generateStandings: (tournamentId: string, options?: any) =>
    api.post('/qr-codes/standings', { tournamentId, options }),
  
  // Generate tournament QR code
  generateTournament: (tournamentId: string, options?: any) =>
    api.post('/qr-codes/tournament', { tournamentId, options }),
  
  // Generate player check-in QR code
  generatePlayerCheckIn: (tournamentId: string, playerId: string, options?: any) =>
    api.post('/qr-codes/player-checkin', { tournamentId, playerId, options }),
  
  // Generate custom QR code
  generateCustom: (content: string, options?: any) =>
    api.post('/qr-codes/custom', { content, options }),
  
  // Generate batch QR codes
  generateTournamentBatch: (tournamentId: string, options?: any) =>
    api.post('/qr-codes/tournament-batch', { tournamentId, options }),
  
  // Generate player QR codes
  generatePlayersBatch: (tournamentId: string, players: any[], options?: any) =>
    api.post('/qr-codes/players-batch', { tournamentId, players, options }),
  
  // Generate print-ready QR code
  generatePrint: (content: string, options?: any) =>
    api.post('/qr-codes/print', { content, options }),
  
  // Validate QR code content
  validateContent: (content: string) =>
    api.post('/qr-codes/validate', { content }),
  
  // Get available options
  getOptions: () =>
    api.get('/qr-codes/options')
};

// Player Profile API
export const playerProfileApi = {
  // Get player profile
  getProfile: (playerId: string) =>
    api.get(`/player-profiles/${playerId}`),
  
  // Update player profile
  updateProfile: (playerId: string, updates: any) =>
    api.put(`/player-profiles/${playerId}`, updates),
  
  // Upload player photo
  uploadPhoto: (playerId: string, formData: FormData) =>
    api.post(`/player-profiles/${playerId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Delete player photo
  deletePhoto: (playerId: string, photoType: string) =>
    api.delete(`/player-profiles/${playerId}/photo/${photoType}`),
  
  // Get player statistics
  getStatistics: (playerId: string) =>
    api.get(`/player-profiles/${playerId}/statistics`),
  
  // Get player tournament history
  getTournamentHistory: (playerId: string, options?: any) =>
    api.get(`/player-profiles/${playerId}/tournaments`, { params: options }),
  
  // Get player achievements
  getAchievements: (playerId: string, type?: string) =>
    api.get(`/player-profiles/${playerId}/achievements`, { params: { type } }),
  
  // Add achievement
  addAchievement: (playerId: string, achievement: any) =>
    api.post(`/player-profiles/${playerId}/achievements`, achievement),
  
  // Search players
  searchPlayers: (query: string, options?: any) =>
    api.get('/player-profiles/search', { params: { q: query, ...options } }),
  
  // Get leaderboard
  getLeaderboard: (options?: any) =>
    api.get('/player-profiles/leaderboard', { params: options }),
  
  // Get achievement types
  getAchievementTypes: () =>
    api.get('/player-profiles/achievements/types')
};

// Live Standings API
export const liveStandingsApi = {
  // Get current live standings
  getStandings: (tournamentId: string) =>
    api.get(`/live-standings/${tournamentId}`),
  
  // Trigger manual update
  triggerUpdate: (tournamentId: string) =>
    api.post(`/live-standings/${tournamentId}/trigger`),
  
  // Get connected clients count
  getClientCount: (tournamentId: string) =>
    api.get(`/live-standings/${tournamentId}/clients`),
  
  // Get all active tournaments
  getActiveTournaments: () =>
    api.get('/live-standings/active'),
  
  // Update all active tournaments
  updateAllTournaments: () =>
    api.post('/live-standings/update-all'),
  
  // Get service statistics
  getStats: () =>
    api.get('/live-standings/stats'),
  
  // Cleanup inactive connections
  cleanup: () =>
    api.post('/live-standings/cleanup'),
  
  // Get WebSocket connection info
  getWSInfo: () =>
    api.get('/live-standings/ws-info')
};

// Payment API
export const paymentApi = {
  // Process entry fee payment
  processEntryFee: (paymentData: any) =>
    api.post('/payments/entry-fee', paymentData),
  
  // Confirm payment
  confirmPayment: (confirmationData: any) =>
    api.post('/payments/confirm', confirmationData),
  
  // Process prize payments
  processPrizes: (prizeData: any) =>
    api.post('/payments/prizes', prizeData),
  
  // Get payment history
  getHistory: (tournamentId: string) =>
    api.get(`/payments/history/${tournamentId}`),
  
  // Get payment statistics
  getStats: (tournamentId: string) =>
    api.get(`/payments/stats/${tournamentId}`),
  
  // Refund payment
  refundPayment: (paymentId: string, amount?: number) =>
    api.post('/payments/refund', { paymentId, amount }),
  
  // Get payment configuration
  getConfig: () =>
    api.get('/payments/config'),
  
  // Get available payment methods
  getMethods: () =>
    api.get('/payments/methods'),
  
  // Stripe specific endpoints
  createStripeIntent: (intentData: any) =>
    api.post('/payments/stripe/create-intent', intentData),
  
  // PayPal specific endpoints
  createPayPalOrder: (orderData: any) =>
    api.post('/payments/paypal/create-order', orderData),
  
  capturePayPalOrder: (orderId: string) =>
    api.post('/payments/paypal/capture-order', { orderId })
};

// Analytics API
export const analyticsApi = {
  // Get comprehensive tournament analytics
  getTournamentAnalytics: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}`),
  
  // Get specific analytics sections
  getTournamentOverview: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}/overview`),
  
  getPlayerAnalytics: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}/players`),
  
  getPairingAnalytics: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}/pairings`),
  
  getRatingAnalytics: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}/ratings`),
  
  getPerformanceAnalytics: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}/performance`),
  
  getTimeAnalytics: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}/time`),
  
  getSectionAnalytics: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}/sections`),
  
  getFinancialAnalytics: (tournamentId: string) =>
    api.get(`/analytics/tournament/${tournamentId}/financial`),
  
  // System-wide analytics
  getSystemAnalytics: () =>
    api.get('/analytics/system'),
  
  getTournamentTrends: () =>
    api.get('/analytics/trends/tournaments'),
  
  getPlayerTrends: () =>
    api.get('/analytics/trends/players'),
  
  getSystemMetrics: () =>
    api.get('/analytics/metrics'),
  
  getFeatureAnalytics: () =>
    api.get('/analytics/features'),
  
  // Dashboard and export
  getDashboardData: (tournamentId: string, widgets: string[] = []) =>
    api.get(`/analytics/dashboard/${tournamentId}`, { params: { widgets: widgets.join(',') } }),
  
  exportAnalytics: (tournamentId: string, format: 'json' | 'csv' = 'json') =>
    api.get(`/analytics/export/${tournamentId}`, { params: { format } }),
  
  // Cache management
  clearAnalyticsCache: () =>
    api.post('/analytics/clear-cache')
};

// Chess Platform Integration API
export const chessIntegrationApi = {
  // Chess.com endpoints
  getChessComPlayer: (username: string) =>
    api.get(`/chess/chesscom/player/${username}`),
  
  getChessComPlayerStats: (username: string) =>
    api.get(`/chess/chesscom/player/${username}/stats`),
  
  getChessComPlayerGames: (username: string, limit: number = 10) =>
    api.get(`/chess/chesscom/player/${username}/games`, { params: { limit } }),
  
  searchChessComPlayers: (query: string) =>
    api.get('/chess/chesscom/search', { params: { q: query } }),
  
  getChessComTournament: (tournamentId: string) =>
    api.get(`/chess/chesscom/tournament/${tournamentId}`),
  
  getChessComLiveGames: () =>
    api.get('/chess/chesscom/live-games'),
  
  getChessComPuzzle: () =>
    api.get('/chess/chesscom/puzzle'),
  
  getChessComClub: (clubId: string) =>
    api.get(`/chess/chesscom/club/${clubId}`),
  
  // Lichess endpoints
  getLichessPlayer: (username: string) =>
    api.get(`/chess/lichess/player/${username}`),
  
  getLichessPlayerStats: (username: string) =>
    api.get(`/chess/lichess/player/${username}/stats`),
  
  getLichessPlayerGames: (username: string, limit: number = 10) =>
    api.get(`/chess/lichess/player/${username}/games`, { params: { limit } }),
  
  searchLichessPlayers: (query: string) =>
    api.get('/chess/lichess/search', { params: { q: query } }),
  
  getLichessTournament: (tournamentId: string) =>
    api.get(`/chess/lichess/tournament/${tournamentId}`),
  
  getLichessLiveGames: () =>
    api.get('/chess/lichess/live-games'),
  
  getLichessPuzzle: () =>
    api.get('/chess/lichess/puzzle'),
  
  getLichessTeam: (teamId: string) =>
    api.get(`/chess/lichess/team/${teamId}`),
  
  getLichessTV: () =>
    api.get('/chess/lichess/tv'),
  
  // Multi-platform endpoints
  searchPlayers: (query: string, platform?: 'chesscom' | 'lichess') =>
    api.get('/chess/search', { params: { q: query, platform } }),
  
  getPlayerProfile: (username: string, platform?: 'chesscom' | 'lichess') =>
    api.get(`/chess/player/${username}`, { params: { platform } }),
  
  getStatus: () =>
    api.get('/chess/status'),
  
  importPlayer: (username: string, platform: 'chesscom' | 'lichess', tournamentId: string) =>
    api.post('/chess/import-player', { username, platform, tournamentId }),
  
  getLeaderboards: (platform?: 'chesscom' | 'lichess', timeControl?: string) =>
    api.get('/chess/leaderboards', { params: { platform, timeControl } })
};

// Custom Pages API
export const customPagesApi = {
  getAll: (tournamentId: string) =>
    api.get(`/custom-pages/tournament/${tournamentId}`),
  
  getOne: (id: string) =>
    api.get(`/custom-pages/${id}`),
  
  create: (data: any) =>
    api.post('/custom-pages', data),
  
  update: (id: string, data: any) =>
    api.put(`/custom-pages/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/custom-pages/${id}`)
};

export default api;
