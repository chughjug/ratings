import { NotificationItem } from '../components/NotificationDashboard';

interface ContactMessage {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  created_at?: string;
  createdAt?: string;
  timestamp?: string;
  submittedAt?: string;
  [key: string]: any;
}

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
const normalizeContactMessages = (raw: any): ContactMessage[] => {
  if (!raw) return [];

  const parsed: ContactMessage[] = [];

  const processValue = (value: any) => {
    if (!value) return;

    if (typeof value === 'string') {
      try {
        const parsedJson = JSON.parse(value);
        parsed.push(...normalizeContactMessages(parsedJson));
      } catch {
        // Treat raw string as message content
        parsed.push({
          message: value
        });
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item && typeof item === 'object') {
          parsed.push(...normalizeContactMessages(item));
        } else if (typeof item === 'string') {
          parsed.push({ message: item });
        }
      });
      return;
    }

    if (typeof value === 'object') {
      // If object looks like a message, push directly
      if (
        'message' in value ||
        'email' in value ||
        'name' in value ||
        'created_at' in value ||
        'createdAt' in value ||
        'timestamp' in value
      ) {
        parsed.push(value as ContactMessage);
        return;
      }

      Object.values(value).forEach((nested) => processValue(nested));
    }
  };

  processValue(raw);
  return parsed;
};

const extractContactMessagesFromTournament = (tournament: any): ContactMessage[] => {
  if (!tournament) return [];

  const potentialSources = [
    tournament.contact_messages,
    tournament.contactMessages,
    tournament.contact_inquiries,
    tournament.contactInquiries,
    tournament.contact_requests,
    tournament.contactRequests
  ];

  const messages: ContactMessage[] = [];

  const addMessages = (source: any) => {
    const normalized = normalizeContactMessages(source);
    if (normalized.length > 0) {
      messages.push(
        ...normalized.map((msg) => ({
          ...msg,
          // Ensure we keep track of original source for dedupe
          __source: source
        }))
      );
    }
  };

  potentialSources.forEach(addMessages);

  const tryParseJsonField = (field: any) => {
    if (!field) return;
    let value = field;
    if (typeof field === 'string') {
      try {
        value = JSON.parse(field);
      } catch {
        return;
      }
    }
    addMessages(value?.contactMessages || value?.contact_messages);
    addMessages(value?.contactFormMessages || value?.contact_form_messages);
    addMessages(value?.contact || value?.contactForm);
  };

  tryParseJsonField(tournament.settings);
  tryParseJsonField(tournament.registration_settings);
  tryParseJsonField(tournament.custom_settings);

  // Deduplicate by combining message+timestamp+email
  const seen = new Set<string>();
  const uniqueMessages: ContactMessage[] = [];

  messages.forEach((msg) => {
    const key = [
      msg.id || '',
      msg.message || '',
      msg.email || '',
      msg.created_at || msg.createdAt || msg.timestamp || msg.submittedAt || ''
    ].join('|');

    if (!seen.has(key)) {
      seen.add(key);
      uniqueMessages.push(msg);
    }
  });

  return uniqueMessages;
};

const convertContactMessagesToNotifications = (contactMessages: ContactMessage[]): NotificationItem[] => {
  return contactMessages.map((message, index) => {
    const timestampString =
      message.created_at || message.createdAt || message.timestamp || message.submittedAt;
    const timestamp = timestampString ? new Date(timestampString) : new Date();

    const senderName = message.name || message.email || 'Contact Form Submission';
    const emailText = message.email ? ` (Email: ${message.email})` : '';
    const phoneText = message.phone ? ` • Phone: ${message.phone}` : '';

    const body =
      message.message ||
      message.content ||
      message.body ||
      'Contact form submission received. Please check the contact inbox for details.';

    return {
      id: `contact-${message.id || timestamp.getTime() || index}`,
      type: 'info',
      title: 'Contact Form Message',
      message: `${body}${emailText}${phoneText}`,
      playerName: senderName,
      priority: 'medium',
      timestamp,
      section: undefined,
      uscfId: undefined
    };
  });
};

export const getAllTournamentNotifications = (
  tournament: any,
  players: Player[],
  expirationWarnings: ExpirationWarning[]
): NotificationItem[] => {
  const expirationNotifications = convertExpirationWarningsToNotifications(expirationWarnings, players);
  const tournamentNotifications = generateTournamentNotifications(tournament, players);
  const contactNotifications = convertContactMessagesToNotifications(
    extractContactMessagesFromTournament(tournament)
  );
  
  return [...expirationNotifications, ...tournamentNotifications, ...contactNotifications];
};
