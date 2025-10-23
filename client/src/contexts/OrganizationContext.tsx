import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Organization, OrganizationMember, OrganizationInvitation } from '../types';
import { organizationApi } from '../services/organizationApi';

interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  loading: boolean;
  error: string | null;
}

type OrganizationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ORGANIZATIONS'; payload: Organization[] }
  | { type: 'SET_CURRENT_ORGANIZATION'; payload: Organization | null }
  | { type: 'SET_MEMBERS'; payload: OrganizationMember[] }
  | { type: 'SET_INVITATIONS'; payload: OrganizationInvitation[] }
  | { type: 'ADD_ORGANIZATION'; payload: Organization }
  | { type: 'UPDATE_ORGANIZATION'; payload: Organization }
  | { type: 'REMOVE_ORGANIZATION'; payload: string }
  | { type: 'ADD_MEMBER'; payload: OrganizationMember }
  | { type: 'UPDATE_MEMBER'; payload: OrganizationMember }
  | { type: 'REMOVE_MEMBER'; payload: string }
  | { type: 'ADD_INVITATION'; payload: OrganizationInvitation }
  | { type: 'UPDATE_INVITATION'; payload: OrganizationInvitation }
  | { type: 'REMOVE_INVITATION'; payload: string };

const initialState: OrganizationState = {
  organizations: [],
  currentOrganization: null,
  members: [],
  invitations: [],
  loading: false,
  error: null,
};

function organizationReducer(state: OrganizationState, action: OrganizationAction): OrganizationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_ORGANIZATIONS':
      return { ...state, organizations: action.payload };
    
    case 'SET_CURRENT_ORGANIZATION':
      return { ...state, currentOrganization: action.payload };
    
    case 'SET_MEMBERS':
      return { ...state, members: action.payload };
    
    case 'SET_INVITATIONS':
      return { ...state, invitations: action.payload };
    
    case 'ADD_ORGANIZATION':
      return { ...state, organizations: [...state.organizations, action.payload] };
    
    case 'UPDATE_ORGANIZATION':
      return {
        ...state,
        organizations: state.organizations.map(org =>
          org.id === action.payload.id ? action.payload : org
        ),
        currentOrganization: state.currentOrganization?.id === action.payload.id
          ? action.payload
          : state.currentOrganization,
      };
    
    case 'REMOVE_ORGANIZATION':
      return {
        ...state,
        organizations: state.organizations.filter(org => org.id !== action.payload),
        currentOrganization: state.currentOrganization?.id === action.payload
          ? null
          : state.currentOrganization,
      };
    
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };
    
    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map(member =>
          member.id === action.payload.id ? action.payload : member
        ),
      };
    
    case 'REMOVE_MEMBER':
      return {
        ...state,
        members: state.members.filter(member => member.id !== action.payload),
      };
    
    case 'ADD_INVITATION':
      return { ...state, invitations: [...state.invitations, action.payload] };
    
    case 'UPDATE_INVITATION':
      return {
        ...state,
        invitations: state.invitations.map(invitation =>
          invitation.id === action.payload.id ? action.payload : invitation
        ),
      };
    
    case 'REMOVE_INVITATION':
      return {
        ...state,
        invitations: state.invitations.filter(invitation => invitation.id !== action.payload),
      };
    
    default:
      return state;
  }
}

interface OrganizationContextType {
  state: OrganizationState;
  // Organization actions
  loadOrganizations: () => Promise<void>;
  loadOrganization: (id: string) => Promise<void>;
  createOrganization: (organizationData: any) => Promise<Organization>;
  updateOrganization: (id: string, organizationData: any) => Promise<void>;
  setCurrentOrganization: (organization: Organization | null) => void;
  
  // Member actions
  loadMembers: (organizationId: string) => Promise<void>;
  inviteUser: (organizationId: string, email: string, role: 'admin' | 'member') => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  
  // Utility actions
  clearError: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    // Return a default context to prevent crashes
    return {
      state: {
        organizations: [],
        currentOrganization: null,
        members: [],
        invitations: [],
        loading: false,
        error: null,
      },
      loadOrganizations: async () => {},
      loadOrganization: async () => {},
      createOrganization: async () => ({} as Organization),
      updateOrganization: async () => {},
      setCurrentOrganization: () => {},
      loadMembers: async () => {},
      inviteUser: async () => {},
      acceptInvitation: async () => {},
      clearError: () => {},
    };
  }
  return context;
};

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(organizationReducer, initialState);

  // Load all organizations for the current user
  const loadOrganizations = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await organizationApi.getOrganizations();
      dispatch({ type: 'SET_ORGANIZATIONS', payload: response.data.organizations });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to load organizations' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Load specific organization
  const loadOrganization = async (id: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await organizationApi.getOrganization(id);
      dispatch({ type: 'SET_CURRENT_ORGANIZATION', payload: response.data.organization });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to load organization' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Create new organization
  const createOrganization = async (organizationData: any): Promise<Organization> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await organizationApi.createOrganization(organizationData);
      const newOrganization = response.data.organization;
      
      dispatch({ type: 'ADD_ORGANIZATION', payload: newOrganization });
      return newOrganization;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to create organization' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update organization
  const updateOrganization = async (id: string, organizationData: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await organizationApi.updateOrganization(id, organizationData);
      
      // Reload organization to get updated data
      const response = await organizationApi.getOrganization(id);
      dispatch({ type: 'UPDATE_ORGANIZATION', payload: response.data.organization });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to update organization' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Set current organization
  const setCurrentOrganization = (organization: Organization | null) => {
    dispatch({ type: 'SET_CURRENT_ORGANIZATION', payload: organization });
  };

  // Load organization members
  const loadMembers = async (organizationId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await organizationApi.getOrganizationMembers(organizationId);
      dispatch({ type: 'SET_MEMBERS', payload: response.data.members });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to load members' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Invite user to organization
  const inviteUser = async (organizationId: string, email: string, role: 'admin' | 'member') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await organizationApi.inviteUser(organizationId, { email, role });
      const newInvitation = response.data.invitation;
      
      dispatch({ type: 'ADD_INVITATION', payload: newInvitation });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to send invitation' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Accept organization invitation
  const acceptInvitation = async (token: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await organizationApi.acceptInvitation(token);
      
      // Reload organizations to include the new membership
      await loadOrganizations();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to accept invitation' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Load organizations on mount (with error handling)
  useEffect(() => {
    loadOrganizations().catch(error => {
      console.error('Failed to load organizations:', error);
      // Don't set error state for initial load failure
    });
  }, []);

  const value: OrganizationContextType = {
    state,
    loadOrganizations,
    loadOrganization,
    createOrganization,
    updateOrganization,
    setCurrentOrganization,
    loadMembers,
    inviteUser,
    acceptInvitation,
    clearError,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export default OrganizationContext;
