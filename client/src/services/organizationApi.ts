import axios from 'axios';

// Determine API base URL based on environment (same as main api.ts)
const getApiBaseUrl = () => {
  // If explicitly set in environment variables, use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production (Heroku), use relative URLs
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // In development, use relative URL (proxy will handle routing to localhost:5000)
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with authentication
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Organization API service
export const organizationApi = {
  // Get all organizations for the current user
  getOrganizations: async () => {
    try {
      const response = await api.get('/organizations');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      return { success: false, data: { organizations: [] } };
    }
  },

  // Get organization by ID
  getOrganization: async (id: string) => {
    try {
      const response = await api.get(`/organizations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      throw error;
    }
  },

  // Create new organization
  createOrganization: async (organizationData: {
    name: string;
    slug: string;
    description?: string;
    website?: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    settings?: any;
  }) => {
    try {
      const response = await api.post('/organizations', organizationData);
      return response.data;
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  },

  // Update organization
  updateOrganization: async (id: string, organizationData: {
    name?: string;
    slug?: string;
    description?: string;
    website?: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    settings?: any;
  }) => {
    try {
      const response = await api.put(`/organizations/${id}`, organizationData);
      return response.data;
    } catch (error) {
      console.error('Failed to update organization:', error);
      throw error;
    }
  },

  // Get organization members
  getOrganizationMembers: async (id: string) => {
    try {
      const response = await api.get(`/organizations/${id}/members`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organization members:', error);
      throw error;
    }
  },

  // Invite user to organization
  inviteUser: async (id: string, invitationData: {
    email: string;
    role: 'admin' | 'member';
  }) => {
    try {
      const response = await api.post(`/organizations/${id}/invite`, invitationData);
      return response.data;
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error;
    }
  },

  // Accept organization invitation
  acceptInvitation: async (token: string) => {
    try {
      const response = await api.post(`/organizations/invitations/${token}/accept`);
      return response.data;
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  },

  // Get public organization data
  getPublicOrganization: async (slug: string) => {
    try {
      const response = await api.get(`/organizations/${slug}/public`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch public organization:', error);
      throw error;
    }
  },

  // Get public organization tournaments with filters
  getPublicTournaments: async (slug: string, filters?: {
    status?: string;
    format?: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.format) params.append('format', filters.format);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const response = await api.get(`/organizations/${slug}/tournaments/public?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch public tournaments:', error);
      throw error;
    }
  },

  // Get organization statistics
  getOrganizationStats: async (slug: string) => {
    try {
      const response = await api.get(`/organizations/${slug}/stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organization stats:', error);
      throw error;
    }
  },

  // Search public organizations
  searchOrganizations: async (query?: string, limit?: number) => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (limit) params.append('limit', limit.toString());
      
      const response = await api.get(`/organizations/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to search organizations:', error);
      throw error;
    }
  },

  // Get public tournament for specific organization
  getPublicTournament: async (orgSlug: string, tournamentId: string) => {
    try {
      const response = await api.get(`/organizations/${orgSlug}/tournaments/${tournamentId}/public`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organization public tournament:', error);
      throw error;
    }
  }
};

// Tournament API service (updated to support organization filtering)
export const tournamentApi = {
  // Get all tournaments with optional organization filtering
  getTournaments: async (organizationId?: string, isPublic?: boolean) => {
    const params = new URLSearchParams();
    if (organizationId) params.append('organization_id', organizationId);
    if (isPublic !== undefined) params.append('is_public', isPublic.toString());
    
    const response = await axios.get(`${API_BASE_URL}/tournaments?${params.toString()}`);
    return response.data;
  },

  // Get tournament by ID
  getTournament: async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/tournaments/${id}`);
    return response.data;
  },

  // Create new tournament
  createTournament: async (tournamentData: {
    organization_id?: string;
    name: string;
    format: string;
    rounds: number;
    time_control?: string;
    start_date?: string;
    end_date?: string;
    settings?: any;
    city?: string;
    state?: string;
    location?: string;
    chief_td_name?: string;
    chief_td_uscf_id?: string;
    chief_arbiter_name?: string;
    chief_arbiter_fide_id?: string;
    chief_organizer_name?: string;
    chief_organizer_fide_id?: string;
    expected_players?: number;
    website?: string;
    fide_rated?: boolean;
    uscf_rated?: boolean;
    allow_registration?: boolean;
    is_public?: boolean;
    public_url?: string;
  }) => {
    const response = await axios.post(`${API_BASE_URL}/tournaments`, tournamentData);
    return response.data;
  },

  // Update tournament
  updateTournament: async (id: string, tournamentData: {
    organization_id?: string;
    name?: string;
    format?: string;
    rounds?: number;
    time_control?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    settings?: any;
    city?: string;
    state?: string;
    location?: string;
    chief_td_name?: string;
    chief_td_uscf_id?: string;
    chief_arbiter_name?: string;
    chief_arbiter_fide_id?: string;
    chief_organizer_name?: string;
    chief_organizer_fide_id?: string;
    expected_players?: number;
    website?: string;
    fide_rated?: boolean;
    uscf_rated?: boolean;
    allow_registration?: boolean;
    is_public?: boolean;
    public_url?: string;
  }) => {
    const response = await axios.put(`${API_BASE_URL}/tournaments/${id}`, tournamentData);
    return response.data;
  },

  // Delete tournament
  deleteTournament: async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/tournaments/${id}`);
    return response.data;
  }
};

// Auth API service (updated to include organization context)
export const authApi = {
  // Login user
  login: async (credentials: { username: string; password: string }) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    return response.data;
  },

  // Register user
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }) => {
    const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await axios.put(`${API_BASE_URL}/auth/change-password`, passwordData);
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/logout`);
    return response.data;
  }
};

const apiServices = {
  organizationApi,
  tournamentApi,
  authApi
};

export default apiServices;
