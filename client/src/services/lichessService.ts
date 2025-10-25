interface LichessUser {
  id: string;
  username: string;
  title?: string;
  rating?: number;
  online?: boolean;
}

interface LichessTournament {
  id: string;
  name: string;
  status: string;
  nbPlayers: number;
  nbRounds: number;
  clock: {
    limit: number;
    increment: number;
  };
  startsAt?: string;
  finishedAt?: string;
}

interface LichessChallenge {
  id: string;
  url: string;
  status: string;
  challenger: string;
  destUser: string;
  timeControl: {
    limit: number;
    increment: number;
  };
}

interface LichessGame {
  id: string;
  pgn: string;
  white: {
    name: string;
    rating: number;
  };
  black: {
    name: string;
    rating: number;
  };
  result: string;
  status: string;
}

class LichessService {
  private baseUrl = '/api/lichess';

  /**
   * Initiate OAuth2 authentication
   */
  async initiateAuth(): Promise<{ authUrl: string; state: string }> {
    const response = await fetch(`${this.baseUrl}/auth`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to initiate authentication');
    }
    
    return data;
  }

  /**
   * Handle OAuth2 callback
   */
  async handleCallback(code: string, state: string): Promise<{
    accessToken: string;
    user: LichessUser;
    expiresIn: number;
  }> {
    const response = await fetch(`${this.baseUrl}/callback?code=${code}&state=${state}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Authentication failed');
    }
    
    return data;
  }

  /**
   * Create a Swiss tournament on Lichess
   */
  async createSwissTournament(
    accessToken: string,
    tournamentData: {
      name: string;
      rounds: number;
      timeControl: {
        timeLimit: number;
        increment: number;
      };
      description?: string;
      startDate?: string;
    }
  ): Promise<LichessTournament> {
    const response = await fetch(`${this.baseUrl}/tournament/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
        tournamentData,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create tournament');
    }
    
    return data.lichessTournament;
  }

  /**
   * Join a Lichess tournament
   */
  async joinTournament(accessToken: string, lichessTournamentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/tournament/${lichessTournamentId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accessToken }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to join tournament');
    }
  }

  /**
   * Get Lichess tournament information
   */
  async getTournamentInfo(lichessTournamentId: string): Promise<LichessTournament> {
    const response = await fetch(`${this.baseUrl}/tournament/${lichessTournamentId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get tournament information');
    }
    
    return data.tournament;
  }

  /**
   * Get Lichess tournament results
   */
  async getTournamentResults(lichessTournamentId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/tournament/${lichessTournamentId}/results`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get tournament results');
    }
    
    return data.results;
  }

  /**
   * Get Lichess tournament games
   */
  async getTournamentGames(lichessTournamentId: string): Promise<LichessGame[]> {
    const response = await fetch(`${this.baseUrl}/tournament/${lichessTournamentId}/games`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get tournament games');
    }
    
    return data.games;
  }

  /**
   * Sync tournament results from Lichess to local database
   */
  async syncTournamentResults(
    lichessTournamentId: string,
    tournamentId: string,
    accessToken: string
  ): Promise<{ syncedGames: number }> {
    const response = await fetch(`${this.baseUrl}/tournament/${lichessTournamentId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tournamentId,
        accessToken,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to sync tournament results');
    }
    
    return { syncedGames: data.syncedGames };
  }

  /**
   * Create challenges for tournament pairings
   */
  async createChallenges(
    accessToken: string,
    pairings: Array<{
      id: string;
      whitePlayer: {
        id: string;
        name: string;
        lichess_username?: string;
      };
      blackPlayer: {
        id: string;
        name: string;
        lichess_username?: string;
      };
    }>,
    timeControl: {
      timeLimit: number;
      increment: number;
    }
  ): Promise<LichessChallenge[]> {
    const response = await fetch(`${this.baseUrl}/challenges/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
        pairings,
        timeControl,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create challenges');
    }
    
    return data.challenges;
  }

  /**
   * Search Lichess users
   */
  async searchUsers(query: string): Promise<LichessUser[]> {
    const response = await fetch(`${this.baseUrl}/users/search?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to search users');
    }
    
    return data.users;
  }

  /**
   * Get user data
   */
  async getUserData(username: string): Promise<LichessUser> {
    const response = await fetch(`${this.baseUrl}/users/${username}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get user data');
    }
    
    return data.user;
  }

  /**
   * Export game
   */
  async exportGame(gameId: string, format: string = 'pgn'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/games/${gameId}/export?format=${format}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to export game');
    }
    
    return data.game;
  }

  /**
   * Create bulk pairing
   */
  async createBulkPairing(
    accessToken: string,
    games: Array<{
      whitePlayer: {
        lichess_username: string;
      };
      blackPlayer: {
        lichess_username: string;
      };
      timeControl: {
        timeLimit: number;
        increment: number;
      };
    }>
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/bulk-pairing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
        games,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create bulk pairing');
    }
    
    return data.bulkPairing;
  }

  /**
   * Store authentication data
   */
  storeAuthData(accessToken: string, user: LichessUser, expiresIn: number): void {
    localStorage.setItem('lichess_access_token', accessToken);
    localStorage.setItem('lichess_user', JSON.stringify(user));
    localStorage.setItem('lichess_expires_at', (Date.now() + expiresIn * 1000).toString());
  }

  /**
   * Get stored authentication data
   */
  getStoredAuthData(): {
    accessToken: string | null;
    user: LichessUser | null;
    isExpired: boolean;
  } {
    const accessToken = localStorage.getItem('lichess_access_token');
    const userStr = localStorage.getItem('lichess_user');
    const expiresAtStr = localStorage.getItem('lichess_expires_at');
    
    const user = userStr ? JSON.parse(userStr) : null;
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr) : 0;
    const isExpired = Date.now() > expiresAt;
    
    return {
      accessToken: isExpired ? null : accessToken,
      user: isExpired ? null : user,
      isExpired,
    };
  }

  /**
   * Clear authentication data
   */
  clearAuthData(): void {
    localStorage.removeItem('lichess_access_token');
    localStorage.removeItem('lichess_user');
    localStorage.removeItem('lichess_expires_at');
    localStorage.removeItem('lichess_oauth_state');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const { accessToken, isExpired } = this.getStoredAuthData();
    return !!(accessToken && !isExpired);
  }
}

export const lichessService = new LichessService();
export default lichessService;
