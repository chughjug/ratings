import { NotificationItem } from '../components/NotificationDashboard';

interface Player {
  id: string;
  name: string;
  uscf_id?: string;
  expiration_date?: string;
  section?: string;
  status?: string;
}

interface ExpirationWarning {
  type: 'expired' | 'expiring';
  player: string;
  message: string;
}

/**
 * Convert expiration warnings to notification items
 */
export const convertExpirationWarningsToNotifications = (
  warnings: ExpirationWarning[],
  players: Player[]
): NotificationItem[] => {
  return warnings.map((warning, index) => {
    const player = players.find(p => p.name === warning.player);
    const now = new Date();
    
    // Calculate days until expiration
    let daysUntilExpiration: number | undefined;
    if (player?.expiration_date) {
      const expirationDate = new Date(player.expiration_date);
      daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Determine priority based on urgency
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (warning.type === 'expired') {
      priority = 'high';
    } else if (daysUntilExpiration !== undefined && daysUntilExpiration <= 7) {
      priority = 'high';
    } else if (daysUntilExpiration !== undefined && daysUntilExpiration <= 14) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    return {
      id: `expiration-${player?.id || index}-${warning.type}`,
      type: warning.type,
      title: warning.type === 'expired' ? 'Expired USCF ID' : 'Expiring USCF ID',
      message: warning.message,
      playerName: warning.player,
      daysUntilExpiration,
      expirationDate: player?.expiration_date,
      priority,
      timestamp: now,
      section: player?.section,
      uscfId: player?.uscf_id
    };
  });
};

/**
 * Generate additional notifications for tournament management
 */
export const generateTournamentNotifications = (
  tournament: any,
  players: Player[]
): NotificationItem[] => {
  const notifications: NotificationItem[] = [];
  const now = new Date();

  // Tournament status notifications
  if (tournament.status === 'active' && players.length === 0) {
    notifications.push({
      id: 'no-players',
      type: 'warning',
      title: 'No Players Added',
      message: 'This tournament is active but has no players. Add players to begin.',
      playerName: 'Tournament',
      priority: 'high',
      timestamp: now
    });
  }

  // Registration status
  if (tournament.allow_registration && tournament.status === 'active') {
    notifications.push({
      id: 'registration-open',
      type: 'info',
      title: 'Registration Open',
      message: 'Players can register for this tournament through the public registration form.',
      playerName: 'Tournament',
      priority: 'medium',
      timestamp: now
    });
  }

  // Round completion status
  if (tournament.status === 'active' && tournament.rounds > 0) {
    const completedRounds = Math.floor(players.length / 2); // Simplified calculation
    if (completedRounds < tournament.rounds) {
      notifications.push({
        id: 'rounds-remaining',
        type: 'info',
        title: 'Rounds Remaining',
        message: `${tournament.rounds - completedRounds} rounds remaining in this tournament.`,
        playerName: 'Tournament',
        priority: 'low',
        timestamp: now
      });
    }
  }

  // Player status warnings
  const withdrawnPlayers = players.filter(p => p.status === 'withdrawn');
  if (withdrawnPlayers.length > 0) {
    notifications.push({
      id: 'withdrawn-players',
      type: 'warning',
      title: 'Withdrawn Players',
      message: `${withdrawnPlayers.length} player${withdrawnPlayers.length !== 1 ? 's have' : ' has'} withdrawn from the tournament.`,
      playerName: 'Tournament',
      priority: 'medium',
      timestamp: now
    });
  }

  return notifications;
};

/**
 * Get all notifications for a tournament
 */
export const getAllTournamentNotifications = (
  tournament: any,
  players: Player[],
  expirationWarnings: ExpirationWarning[]
): NotificationItem[] => {
  const expirationNotifications = convertExpirationWarningsToNotifications(expirationWarnings, players);
  const tournamentNotifications = generateTournamentNotifications(tournament, players);
  
  return [...expirationNotifications, ...tournamentNotifications];
};
