import { PairingData, StandingData } from './pdfExport';
import { Pairing, Standing } from '../types';

export interface GameResult {
  round: number;
  opponent_id: string;
  opponent_name: string;
  color: 'white' | 'black';
  result: '1-0' | '0-1' | '1/2-1/2' | '1-0F' | '0-1F' | '1/2-1/2F' | '';
  points: number;
}

export interface CrosstableData {
  player: {
    id: string;
    name: string;
    rating?: number;
    uscf_id?: string;
    section?: string;
  };
  games: GameResult[];
  total_points: number;
  buchholz: number;
  sonneborn_berger: number;
  rank: number;
}

export class CrosstableService {
  static convertPairingToPairingData(pairing: Pairing): PairingData {
    return {
      id: pairing.id,
      board: pairing.board,
      white_name: pairing.white_name,
      white_rating: pairing.white_rating,
      white_uscf_id: pairing.white_uscf_id,
      black_name: pairing.black_name,
      black_rating: pairing.black_rating,
      black_uscf_id: pairing.black_uscf_id,
      result: pairing.result,
      section: pairing.section,
      is_bye: pairing.is_bye,
      white_id: pairing.white_id || pairing.white_player_id,
      black_id: pairing.black_id || pairing.black_player_id,
      round: pairing.round
    };
  }

  static convertStandingToStandingData(standing: Standing): StandingData {
    return {
      id: standing.id,
      name: standing.name,
      rating: standing.rating,
      uscf_id: undefined, // Not available in Standing type
      total_points: standing.total_points,
      games_played: standing.games_played,
      wins: standing.wins,
      losses: standing.losses,
      draws: standing.draws,
      buchholz: standing.tiebreakers?.buchholz || 0,
      sonneborn_berger: standing.tiebreakers?.sonnebornBerger || 0,
      section: standing.section,
      rank: standing.rank
    };
  }

  static generateCrosstable(
    players: any[],
    pairings: Pairing[],
    standings: Standing[],
    rounds: number
  ): CrosstableData[] {
    const crosstableData: CrosstableData[] = [];

    // Create a map of player data for quick lookup
    const playerMap = new Map();
    players.forEach(player => {
      playerMap.set(player.id, {
        id: player.id,
        name: player.name,
        rating: player.rating,
        uscf_id: player.uscf_id,
        section: player.section
      });
    });

    // Create a map of standings for tiebreak data
    const standingsMap = new Map();
    standings.forEach(standing => {
      standingsMap.set(standing.id, standing);
    });

    // Process each player
    players.forEach(player => {
      const games: GameResult[] = [];
      
      // Find all games for this player
      for (let round = 1; round <= rounds; round++) {
        const game = this.findGameForPlayer(player.id, round, pairings);
        if (game) {
          const whitePlayerId = game.white_id || game.white_player_id;
          const blackPlayerId = game.black_id || game.black_player_id;
          const opponent = whitePlayerId === player.id ? 
            playerMap.get(blackPlayerId) : 
            playerMap.get(whitePlayerId);
          
          if (opponent) {
            games.push({
              round,
              opponent_id: opponent.id,
              opponent_name: opponent.name,
              color: whitePlayerId === player.id ? 'white' : 'black',
              result: (game.result || '') as '' | '1-0' | '0-1' | '1/2-1/2' | '1-0F' | '0-1F' | '1/2-1/2F',
              points: this.getPointsFromResult(game.result || '')
            });
          }
        }
      }

      // Get standings data for this player
      const standing = standingsMap.get(player.id);
      
      crosstableData.push({
        player: {
          id: player.id,
          name: player.name,
          rating: player.rating,
          uscf_id: player.uscf_id,
          section: player.section
        },
        games,
        total_points: standing?.total_points || 0,
        buchholz: standing?.tiebreakers?.buchholz || 0,
        sonneborn_berger: standing?.tiebreakers?.sonnebornBerger || 0,
        rank: standing?.rank || 0
      });
    });

    // Sort by rank
    crosstableData.sort((a, b) => a.rank - b.rank);

    return crosstableData;
  }

  private static findGameForPlayer(playerId: string, round: number, pairings: Pairing[]): Pairing | null {
    return pairings.find(pairing => 
      ((pairing.white_id || pairing.white_player_id) === playerId || (pairing.black_id || pairing.black_player_id) === playerId) &&
      pairing.round === round
    ) || null;
  }

  private static getPointsFromResult(result: string): number {
    switch (result) {
      case '1-0':
      case '1-0F':
        return 1;
      case '0-1':
      case '0-1F':
        return 0;
      case '1/2-1/2':
      case '1/2-1/2F':
        return 0.5;
      default:
        return 0;
    }
  }

  static exportCrosstableCSV(crosstableData: CrosstableData[], tournamentName: string, rounds: number): string {
    const headers = [
      'Rank',
      'Player',
      'USCF ID',
      'Rating',
      'Points',
      'Buchholz',
      'Sonneborn-Berger',
      ...Array.from({ length: rounds }, (_, i) => `Round ${i + 1}`)
    ];

    const rows = crosstableData.map(data => {
      const roundResults = Array.from({ length: rounds }, (_, i) => {
        const game = data.games.find(g => g.round === i + 1);
        if (!game) return '-';
        
        const result = this.getResultSymbol(game.result);
        const color = game.color === 'white' ? 'W' : 'B';
        return `${result}${color}`;
      });

      return [
        data.rank,
        `"${data.player.name}"`,
        data.player.uscf_id || '',
        data.player.rating || '',
        data.total_points,
        data.buchholz.toFixed(1),
        data.sonneborn_berger.toFixed(1),
        ...roundResults
      ];
    });

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private static getResultSymbol(result: string): string {
    switch (result) {
      case '1-0': return '1';
      case '0-1': return '0';
      case '1/2-1/2': return '½';
      case '1-0F': return '+';
      case '0-1F': return '-';
      case '1/2-1/2F': return '=';
      default: return '';
    }
  }
}
