import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Tournament, Player, Pairing, Standing } from '../types';

interface TournamentState {
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  players: Player[];
  pairings: Pairing[];
  standings: Standing[];
  loading: boolean;
  error: string | null;
}

type TournamentAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TOURNAMENTS'; payload: Tournament[] }
  | { type: 'SET_CURRENT_TOURNAMENT'; payload: Tournament | null }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'SET_PAIRINGS'; payload: Pairing[] }
  | { type: 'SET_STANDINGS'; payload: Standing[] }
  | { type: 'ADD_TOURNAMENT'; payload: Tournament }
  | { type: 'UPDATE_TOURNAMENT'; payload: Tournament }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'UPDATE_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'CLEAR_CACHE' };

const initialState: TournamentState = {
  tournaments: [],
  currentTournament: null,
  players: [],
  pairings: [],
  standings: [],
  loading: false,
  error: null,
};

function tournamentReducer(state: TournamentState, action: TournamentAction): TournamentState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TOURNAMENTS':
      return { ...state, tournaments: action.payload };
    case 'SET_CURRENT_TOURNAMENT':
      return { ...state, currentTournament: action.payload };
    case 'SET_PLAYERS':
      return { ...state, players: action.payload };
    case 'SET_PAIRINGS':
      return { ...state, pairings: action.payload };
    case 'SET_STANDINGS':
      return { ...state, standings: action.payload };
    case 'ADD_TOURNAMENT':
      return { ...state, tournaments: [...state.tournaments, action.payload] };
    case 'UPDATE_TOURNAMENT':
      return {
        ...state,
        tournaments: state.tournaments.map(t => 
          t.id === action.payload.id ? action.payload : t
        ),
        currentTournament: state.currentTournament?.id === action.payload.id 
          ? action.payload 
          : state.currentTournament
      };
    case 'ADD_PLAYER':
      return { ...state, players: [...state.players, action.payload] };
    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p => 
          p.id === action.payload.id ? action.payload : p
        )
      };
    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.payload)
      };
    case 'CLEAR_CACHE':
      return {
        ...state,
        currentTournament: null,
        players: [],
        pairings: [],
        standings: [],
        error: null
      };
    default:
      return state;
  }
}

const TournamentContext = createContext<{
  state: TournamentState;
  dispatch: React.Dispatch<TournamentAction>;
} | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, initialState);

  return (
    <TournamentContext.Provider value={{ state, dispatch }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
