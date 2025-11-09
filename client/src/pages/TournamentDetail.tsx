import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Trophy, Calendar, Clock, CheckCircle, Upload, Settings, ExternalLink, Download, RefreshCw, FileText, Printer, X, DollarSign, RotateCcw, Code, Trash2, ChevronUp, ChevronDown, ChevronRight, LinkIcon, MessageSquare, QrCode, BarChart3, Activity, CreditCard, Smartphone, Gamepad2, Save, AlertCircle, Eye, Image as ImageIcon, Layers, Award, Trash } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { tournamentApi, playerApi, pairingApi } from '../services/api';
import { getSectionOptions } from '../utils/sectionUtils';
import { calculateDaysUntil, formatDateSafe, parseDateSafe } from '../utils/dateUtils';
import AddPlayerModal from '../components/AddPlayerModal';
import BulkPlayerAddModal from '../components/BulkPlayerAddModal';
import BatchOperationsModal from '../components/BatchOperationsModal';
import FileImportModal from '../components/FileImportModal';
import GoogleImportModal from '../components/GoogleImportModal';
import GoogleFormsConnector from '../components/GoogleFormsConnector';
import UnifiedImportModal from '../components/UnifiedImportModal';
import DBFExportModal from '../components/DBFExportModal';
import ImportClubMembersModal from '../components/ImportClubMembersModal';
import PlayerInactiveRoundsModal from '../components/PlayerInactiveRoundsModal';
import EditPlayerModal from '../components/EditPlayerModal';
import PrintableView from '../components/PrintableView';
import ChessStandingsTable from '../components/ChessStandingsTable';
import TeamStandingsTable from '../components/TeamStandingsTable';
import TeamPairingsTable from '../components/TeamPairingsTable';
import RegistrationManagement from '../components/RegistrationManagement';
import SectionPairingManager from '../components/SectionPairingManager';
import TeamTournamentPairingManager from '../components/TeamTournamentPairingManager';
import TeamStandings from '../components/TeamStandings';
import TeamTournamentManagement from '../components/TeamTournamentManagement';
import APIDocumentationModal from '../components/APIDocumentationModal';
import APIStatusIndicator from '../components/APIStatusIndicator';
import NotificationButton from '../components/NotificationButton';
import SendPairingEmailsButton from '../components/SendPairingEmailsButton';
import PrizeDisplay from '../components/PrizeDisplay';
import PrizeManagerDrawer from '../components/PrizeManagerDrawer';
import ClubRatingsManager from '../components/ClubRatingsManager';
import SMSManager from '../components/SMSManager';
import QRCodeGenerator from '../components/QRCodeGenerator';
import PlayerProfile from '../components/PlayerProfile';
import LiveStandings from '../components/LiveStandings';
import PaymentManager from '../components/PaymentManager';
import PWAStatus from '../components/PWAStatus';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ChessPlatformIntegration from '../components/ChessPlatformIntegration';
import LichessIntegration from '../components/LichessIntegration';
import CustomPagesManager from '../components/CustomPagesManager';
import OnlineGameIntegration from '../components/OnlineGameIntegration';
import ByeManagementModal from '../components/ByeManagementModal';
import PublicViewCustomization from '../components/PublicViewCustomization';
import RegistrationSettings from '../components/RegistrationSettings';
import PaymentSettings from '../components/PaymentSettings';
import SMSSettings from '../components/SMSSettings';
import SectionsModal from '../components/SectionsModal';
import { getAllTournamentNotifications } from '../utils/notificationUtils';
// PDF export functions are used in ExportModal component

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useTournament();
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'pairings' | 'standings' | 'team-standings' | 'team-pairings' | 'registrations' | 'prizes' | 'club-ratings' | 'settings' | 'print'>('settings');
  const [printViewTab, setPrintViewTab] = useState<'pairings' | 'standings'>('pairings');
  const [pairingsViewMode, setPairingsViewMode] = useState<'player' | 'board'>('player');
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [sectionRounds, setSectionRounds] = useState<{ [section: string]: number }>({});
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState<string>('');
  const [emailsEnabled, setEmailsEnabled] = useState(false);

  // Get current round for a specific section
  const getCurrentRoundForSection = (sectionName: string) => {
    return sectionRounds[sectionName] || 1;
  };

  // Set current round for a specific section
  const setCurrentRoundForSection = (sectionName: string, round: number) => {
    setSectionRounds(prev => ({
      ...prev,
      [sectionName]: round
    }));
  };

  // Get the current round for the selected section
  const getCurrentRound = () => {
    return getCurrentRoundForSection(selectedSection);
  };

  // Handle round change for the selected section
  const handleRoundChange = (round: number) => {
    setCurrentRoundForSection(selectedSection, round);
    fetchPairings(round, selectedSection);
  };

  // Handle section change
  const handleSectionChange = (sectionName: string) => {
    setSelectedSection(sectionName);
    // Fetch pairings for the current round of the new section
    const roundForSection = getCurrentRoundForSection(sectionName);
    fetchPairings(roundForSection, sectionName);
  };
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showBulkAddPlayer, setShowBulkAddPlayer] = useState(false);
  const [showBatchOperations, setShowBatchOperations] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showGoogleImport, setShowGoogleImport] = useState(false);
  const [showGoogleFormsConnector, setShowGoogleFormsConnector] = useState(false);
  const [showUnifiedImport, setShowUnifiedImport] = useState(false);
  const [showImportClubMembers, setShowImportClubMembers] = useState(false);
  const [showDBFExport, setShowDBFExport] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [showInactiveRounds, setShowInactiveRounds] = useState(false);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [showAPIDocs, setShowAPIDocs] = useState(false);
  const [showAPIRegistrationModal, setShowAPIRegistrationModal] = useState(false);
  const [showDeleteDuplicates, setShowDeleteDuplicates] = useState(false);
  const [showByeManagement, setShowByeManagement] = useState(false);
  const [deleteDuplicatesCriteria, setDeleteDuplicatesCriteria] = useState<'name' | 'uscf_id' | 'both'>('name');
  const [selectedPlayer, setSelectedPlayer] = useState<{id: string, name: string} | null>(null);
  const [playerToEdit, setPlayerToEdit] = useState<any>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  // printView is already declared above as printViewTab
  const [displayOptions, setDisplayOptions] = useState({
    showRatings: true,
    showUscfIds: false,
    boardNumbers: true,
    displayFormat: 'default' as 'default' | 'compact' | 'detailed'
  });
  const [showTiebreakers, setShowTiebreakers] = useState(true);
  const [pairingValidation, setPairingValidation] = useState<{warnings: string[], errors: string[]} | null>(null);
  const [pairingType, setPairingType] = useState<'standard' | 'accelerated'>('standard');
  const [isLoading, setIsLoading] = useState(false);
  const isGeneratingRef = useRef(false);
  const [showTeamStandings, setShowTeamStandings] = useState(false);
  const [teamStandings, setTeamStandings] = useState<any[]>([]);
  const [teamPairings, setTeamPairings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teamScoringMethod, setTeamScoringMethod] = useState<'all_players' | 'top_players'>('all_players');
  const [teamTopN, setTeamTopN] = useState<number>(4);
  const [showPrizeManager, setShowPrizeManager] = useState(false);
  const [prizeSettings, setPrizeSettings] = useState<any>(null);
  const [showPublicViewCustomization, setShowPublicViewCustomization] = useState(false);
  
  // New feature modals
  const [showSMSManager, setShowSMSManager] = useState(false);
  const [showQRCodeGenerator, setShowQRCodeGenerator] = useState(false);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [showLiveStandings, setShowLiveStandings] = useState(false);
  const [showPaymentManager, setShowPaymentManager] = useState(false);
  const [showPWAStatus, setShowPWAStatus] = useState(false);
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  const [showChessIntegration, setShowChessIntegration] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [showTeamTournamentManagement, setShowTeamTournamentManagement] = useState(false);
  const [isGeneratingSectionPrizes, setIsGeneratingSectionPrizes] = useState(false);
  const [showPrizeCustomization, setShowPrizeCustomization] = useState(false);
  const [prizeDraft, setPrizeDraft] = useState<Array<{
    name: string;
    position: number;
    type: string;
    amount?: string | number;
  }>>([]);
  const [prizeCustomizationError, setPrizeCustomizationError] = useState<string | null>(null);
  
  const handleCopyToClipboard = useCallback((value: string) => {
    if (!value) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch((error) => {
        console.error('Failed to copy to clipboard:', error);
      });
    }
  }, []);

  const handleOpenInNewTab = useCallback((url: string) => {
    if (!url) return;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const apiIntegrationUrls = id
    ? {
        apiUrl: `${appOrigin}/api/players/api-import/${id}`,
        registerUrl: `${appOrigin}/api/players/register/${id}`,
        registrationFormUrl: `${appOrigin}/register/${id}`
      }
    : {
        apiUrl: '',
        registerUrl: '',
        registrationFormUrl: ''
      };

  // Settings tab state
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [tournamentInfo, setTournamentInfo] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sorting state - default to section sorting as requested
  const [sortField, setSortField] = useState<string>('section');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Section grouping state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const tournament = state.currentTournament;

  // Sorting function
  const sortPlayers = (players: any[]) => {
    return [...players].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle null/undefined values - put them at the end
      if (aValue == null) aValue = sortDirection === 'asc' ? 'zzz' : '';
      if (bValue == null) bValue = sortDirection === 'asc' ? 'zzz' : '';
      
      // Handle numeric fields
      if (sortField === 'rating') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle date fields
      if (sortField === 'expiration_date') {
        const aDate = parseDateSafe(aValue);
        const bDate = parseDateSafe(bValue);
        const aTime = aDate ? aDate.getTime() : 0;
        const bTime = bDate ? bDate.getTime() : 0;
        if (aTime === bTime) return 0;
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }
      
      // Handle boolean fields (status)
      if (sortField === 'is_active') {
        const aBool = aValue ? 1 : 0;
        const bBool = bValue ? 1 : 0;
        return sortDirection === 'asc' ? aBool - bBool : bBool - aBool;
      }
      
      // Convert to strings for comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSectionPrizeTemplate = useCallback((section: string): Array<{ name: string; position: number; type: string; amount?: number | string; }> => {
    const defaultTemplate = [
      { name: 'Champion', position: 1, type: 'trophy' },
      { name: 'Runner-Up', position: 2, type: 'medal' },
      { name: 'Third Place', position: 3, type: 'medal' }
    ];

    if (!tournament?.settings?.newPrizeTemplates) {
      return defaultTemplate;
    }

    const templates = tournament.settings.newPrizeTemplates as Array<any>;
    const match = templates.find(template => {
      const templateSection = template.section || template.name;
      return templateSection && templateSection.toString().toLowerCase() === section.toLowerCase();
    });

    if (!match || !Array.isArray(match.prizes) || match.prizes.length === 0) {
      return defaultTemplate;
    }

    return match.prizes.map((prize: any, index: number) => ({
      name: prize.name || `Prize ${index + 1}`,
      position: prize.position || index + 1,
      type: prize.type || prize.awardType || 'recognition',
      amount: prize.amount ?? ''
    }));
  }, [tournament?.settings?.newPrizeTemplates]);

  const handleOpenPrizeCustomization = () => {
    if (!id) return;
    if (!selectedSection) {
      alert('Please select a section first.');
      return;
    }
    setPrizeDraft(getSectionPrizeTemplate(selectedSection));
    setPrizeCustomizationError(null);
    setShowPrizeCustomization(true);
  };

  const handlePrizeDraftChange = (index: number, field: 'name' | 'position' | 'type' | 'amount', value: string) => {
    setPrizeDraft(prev => {
      const next = [...prev];
      const updated = { ...next[index] };
      if (field === 'position') {
        updated.position = Number(value) || 1;
      } else if (field === 'amount') {
        updated.amount = value;
      } else {
        updated[field] = value;
      }
      next[index] = updated;
      return next;
    });
  };

  const handleAddPrizeRow = () => {
    setPrizeDraft(prev => ([
      ...prev,
      {
        name: `Prize ${prev.length + 1}`,
        position: prev.length + 1,
        type: 'recognition',
        amount: ''
      }
    ]));
  };

  const handleRemovePrizeRow = (index: number) => {
    setPrizeDraft(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmSectionPrizes = async () => {
    if (!id || !selectedSection) return;
    try {
      setPrizeCustomizationError(null);
      setIsGeneratingSectionPrizes(true);
      const sanitizedPrizes = prizeDraft
        .filter(prize => prize.name && prize.position)
        .map(prize => {
          const trimmedName = prize.name.trim();
          const base = {
            name: trimmedName || `Prize ${prize.position}`,
            position: Number(prize.position),
            type: prize.type || 'recognition'
          } as { name: string; position: number; type: string; amount?: number };

          if (prize.type === 'cash' && prize.amount !== '' && prize.amount !== undefined) {
            const parsedAmount = Number(prize.amount);
            if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
              throw new Error(`Invalid amount for prize "${trimmedName || `Prize ${prize.position}`}".`);
            }
            base.amount = parsedAmount;
          }

          return base;
        });

      if (sanitizedPrizes.length === 0) {
        setPrizeCustomizationError('Please configure at least one prize.');
        return;
      }

      const response = await pairingApi.generateSectionPrizes(id, selectedSection, sanitizedPrizes);
      if (!response.data?.success) {
        throw new Error(response.data?.error || response.data?.message || 'Prize generation failed');
      }
      const prizes = response.data.prizeDistribution || response.data.prizesAwarded || [];
      if (prizes.length === 0) {
        alert(`No prizes were assigned for ${selectedSection}.`);
      } else {
        const summary = prizes
          .map((prize: any) => `${prize.prizeName} (${prize.prizeType || prize.metadata?.awardType || 'award'}) → ${prize.playerName || 'Unassigned'}`)
          .join('\n');
        alert(`Prizes assigned for ${selectedSection}:\n\n${summary}`);
      }
      setShowPrizeCustomization(false);
    } catch (error: any) {
      alert(`Failed to generate prizes: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingSectionPrizes(false);
    }
  };

  // Handle column header click for sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Group teams by section for team tournaments
  const groupTeamsBySection = (teams: any[]) => {
    const grouped = teams.reduce((acc, team) => {
      const section = team.section || 'Open';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(team);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort sections: "Open" first, then alphabetically
    const sortedSections = Object.keys(grouped).sort((a, b) => {
      if (a === 'Open') return -1;
      if (b === 'Open') return 1;
      return a.localeCompare(b);
    });
    
    return sortedSections.map(section => ({
      section,
      teams: grouped[section],
      count: grouped[section].length
    }));
  };

  // Group players by section first, then by team within each section
  const groupPlayersBySectionAndTeam = (players: any[]) => {
    // First group by section
    const bySection = players.reduce((acc, player) => {
      const section = player.section || 'Open';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(player);
      return acc;
    }, {} as Record<string, any[]>);

    // For each section, group by team
    const result = Object.keys(bySection).sort((a, b) => {
      if (a === 'Open') return 1;
      if (b === 'Open') return -1;
      return a.localeCompare(b);
    }).map(section => {
      const sectionPlayers = bySection[section];
      
      // Group players in this section by team
      const byTeam = sectionPlayers.reduce((acc: Record<string, any[]>, player: any) => {
        const teamName = player.team_name || player.team || 'Unassigned';
        if (!acc[teamName]) {
          acc[teamName] = [];
        }
        acc[teamName].push(player);
        return acc;
      }, {} as Record<string, any[]>);

      // Sort teams alphabetically, but put "Unassigned" last
      const sortedTeams = Object.keys(byTeam).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      });

      return {
        section,
        teams: sortedTeams.map(teamName => ({
          teamName,
          players: byTeam[teamName],
          count: byTeam[teamName].length
        }))
      };
    });

    return result;
  };

  // Group players by team for team tournaments (legacy, kept for backwards compatibility)
  const groupPlayersByTeam = (players: any[]) => {
    const grouped = players.reduce((acc, player) => {
      const teamName = player.team_name || player.team || 'Unassigned';
      if (!acc[teamName]) {
        acc[teamName] = [];
      }
      acc[teamName].push(player);
      return acc;
    }, {} as Record<string, any[]>);

    // Sort teams alphabetically, but put "Unassigned" last
    const sortedTeams = Object.keys(grouped).sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
    
    return sortedTeams.map(teamName => ({
      teamName,
      players: grouped[teamName],
      count: grouped[teamName].length
    }));
  };

  // Group players by section - include ALL sections from tournament settings AND all sections with players
  const groupPlayersBySection = (players: any[]) => {
    // Get all sections from tournament settings
    const tournamentSections = new Set<string>();
    if (tournament?.settings?.sections) {
      tournament.settings.sections.forEach((s: any) => {
        if (s.name && s.name.trim() !== '') {
          tournamentSections.add(s.name);
        }
      });
    }
    
    // Group players by their assigned section
    const grouped = players.reduce((acc, player) => {
      const section = player.section || 'Unassigned';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(player);
      return acc;
    }, {} as Record<string, any[]>);

    // Also create empty sections from tournament settings if they don't have players yet
    tournamentSections.forEach(sectionName => {
      if (!grouped[sectionName]) {
        grouped[sectionName] = [];
      }
    });

    // Sort sections: "Unassigned" first, then alphabetically
    const sortedSections = Object.keys(grouped).sort((a, b) => {
      if (a === 'Unassigned') return -1;
      if (b === 'Unassigned') return 1;
      return a.localeCompare(b);
    });
    
    return sortedSections.map(section => ({
      section,
      players: grouped[section],
      count: grouped[section].length
    }));
  };

  // Toggle section collapse
  const toggleSectionCollapse = (section: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDisplaySettings) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowDisplaySettings(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDisplaySettings]);

  const getExpirationDetails = (expiration?: string | null, reference?: Date) => {
    if (!expiration) return null;
    const parsed = parseDateSafe(expiration);
    if (!parsed) return null;
    const days = calculateDaysUntil(parsed, reference ?? new Date());
    if (days === null) return null;
    return { date: parsed, days };
  };

  // Check for expired or expiring IDs
  const getExpirationWarnings = () => {
    if (!state.players || state.players.length === 0) return [];
    
    const warnings: Array<{type: 'expired' | 'expiring', player: string, message: string}> = [];
    const now = new Date();
    
    state.players.forEach(player => {
      const details = getExpirationDetails(player.expiration_date, now);
      if (!details) return;

      if (details.days < 0) {
        warnings.push({
          type: 'expired',
          player: player.name,
          message: `${player.name}'s USCF ID has expired`
        });
      } else if (details.days <= 30) {
        warnings.push({
          type: 'expiring',
          player: player.name,
          message: `${player.name}'s USCF ID expires in ${details.days} days`
        });
      }
    });
    
    return warnings;
  };

  // Helper function to get round result for print display
  const getRoundResultForPrint = (player: any, round: number, sectionPlayers: any[]) => {
    if (!state.pairings || state.pairings.length === 0) return '-';
    
    // Filter pairings for the selected section and round
    const filteredPairings = state.pairings.filter((p: any) => 
      p.section === selectedSection && p.round === round
    );
    
    const pairing = filteredPairings.find((p: any) => 
      (p.white_player_id === player.id || p.black_player_id === player.id)
    );
    
    if (!pairing) return '-';
    
    const isWhite = pairing.white_player_id === player.id;
    const opponentId = isWhite ? pairing.black_player_id : pairing.white_player_id;
    
    // Find opponent's rank in current standings (sort by points descending)
    const sortedPlayers = [...sectionPlayers].sort((a: any, b: any) => 
      (b.total_points || 0) - (a.total_points || 0)
    );
    const opponentIdx = sortedPlayers.findIndex((p: any) => p.id === opponentId);
    const opponentNum = opponentIdx !== undefined && opponentIdx !== -1 ? opponentIdx + 1 : '-';
    
    if (pairing.is_bye) {
      return 'BYE';
    }
    
    if (!pairing.result || pairing.result === 'TBD') {
      return `A${opponentNum}`;
    }
    
    // Determine if player won, lost, or drew
    if (pairing.result === '1-0' || pairing.result === '1-0F') {
      return isWhite ? `W${opponentNum}` : `L${opponentNum}`;
    } else if (pairing.result === '0-1' || pairing.result === '0-1F') {
      return isWhite ? `L${opponentNum}` : `W${opponentNum}`;
    } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
      return `D${opponentNum}`;
    }
    
    return 'TBD';
  };

  const fetchTournament = useCallback(async () => {
    if (!id) return;
    try {
      console.log('TournamentDetail: Starting fetchTournament for ID:', id);
      setIsLoading(true);
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await tournamentApi.getById(id);
      
      console.log('TournamentDetail: API response:', response);
      
      if (response.data.success) {
        console.log('TournamentDetail: Tournament data loaded:', response.data.data);
        dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: response.data.data });
      } else {
        console.error('TournamentDetail: API returned error:', response.data.error);
        throw new Error(response.data.error || 'Failed to load tournament');
      }
    } catch (error: any) {
      console.error('Failed to fetch tournament:', error);
      // Set error state for better UX
      dispatch({ type: 'SET_ERROR', payload: error.message || error.response?.data?.error || 'Failed to load tournament' });
    } finally {
      setIsLoading(false);
    }
  }, [id, dispatch]);

  const fetchPlayers = useCallback(async () => {
    if (!id) return;
    try {
      const response = await playerApi.getByTournament(id);
      if (response.data.success) {
        dispatch({ type: 'SET_PLAYERS', payload: response.data.data });
      } else {
        throw new Error(response.data.error || 'Failed to load players');
      }
    } catch (error: any) {
      console.error('Failed to fetch players:', error);
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to load players' });
    }
  }, [id, dispatch]);

  const fetchPairings = useCallback(async (round: number, sectionName?: string) => {
    if (!id) return;
    try {
      console.log('🔍 Fetching pairings for tournament:', id, 'round:', round, 'section:', sectionName);
      const response = await pairingApi.getByRound(id, round, sectionName);
      console.log('✅ Pairings fetched:', response.data.length, 'pairings');
      console.log('📊 Pairings data:', response.data);
      dispatch({ type: 'SET_PAIRINGS', payload: response.data });
    } catch (error) {
      console.error('❌ Failed to fetch pairings:', error);
    }
  }, [id, dispatch]);

  const fetchStandings = useCallback(async () => {
    if (!id) return;
    try {
      const response = await pairingApi.getStandings(id, true, true); // Include round results
      if (response.data.success) {
        dispatch({ type: 'SET_STANDINGS', payload: response.data.data });
      } else {
        throw new Error(response.data.error || 'Failed to load standings');
      }
    } catch (error: any) {
      console.error('Failed to fetch standings:', error);
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.error || 'Failed to load standings' });
    }
  }, [id, dispatch]);

  const fetchTeamStandings = useCallback(async () => {
    if (!id) return;
    
    try {
      const tournamentApi = require('../services/api').tournamentApi;
      const response = await tournamentApi.getTeamStandings(id, {
        scoring_method: teamScoringMethod === 'top_players' ? 'top_4' : 'all_players',
        top_n: teamScoringMethod === 'top_players' ? teamTopN : undefined
      });
      console.log('Team standings response:', response.data);
      console.log('Team standings data:', response.data.standings);
      console.log('Team standings by section:', response.data.standingsBySection);
      
      // For team tournaments, prefer standingsBySection if available to ensure proper section separation
      // Otherwise fall back to flattened standings array
      if (response.data.standingsBySection && tournament?.format === 'team-tournament') {
        // Flatten the grouped standings but preserve section information
        const flattened = Object.values(response.data.standingsBySection).flat();
        setTeamStandings(flattened);
      } else {
        setTeamStandings(response.data.standings || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch team standings:', error);
    }
  }, [id, teamScoringMethod, teamTopN, tournament?.format]);

  const fetchTeamPairings = useCallback(async () => {
    if (!id || !tournament) return;
    
    // Only fetch team pairings for team tournaments
    if (!['team-swiss', 'team-round-robin', 'team-tournament'].includes(tournament.format)) {
      return;
    }
    
    try {
      const tournamentApi = require('../services/api').tournamentApi;
      const response = await tournamentApi.getTeamPairings(id, currentRound);
      setTeamPairings(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch team pairings:', error);
    }
  }, [id, tournament, currentRound]);

  const fetchTeams = useCallback(async () => {
    if (!id) return;
    
    // Check tournament format - if tournament not loaded yet, try to fetch anyway for team tournaments
    // We'll refetch once tournament is loaded
    if (tournament && !['team-swiss', 'team-round-robin', 'team-tournament'].includes(tournament.format)) {
      setTeams([]); // Clear teams for non-team tournaments
      return;
    }
    
    try {
      const axios = require('axios');
      const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');
      const response = await axios.get(`${API_BASE_URL}/teams/team-tournament/${id}`);
      if (response.data.success) {
        // Teams should include members from the API
        const fetchedTeams = response.data.teams || [];
        console.log('Fetched teams:', fetchedTeams);
        setTeams(fetchedTeams);
      }
    } catch (error: any) {
      // Only log error if it's not a 404 (tournament might not support teams yet)
      if (error.response?.status !== 404) {
        console.error('Failed to fetch teams:', error);
      }
      setTeams([]);
    }
  }, [id, tournament]);

  useEffect(() => {
    if (id) {
      console.log('TournamentDetail: Fetching data for tournament ID:', id);
      // Clear cache when switching tournaments
      dispatch({ type: 'CLEAR_CACHE' });
      // Always fetch fresh data on mount or when ID changes
      fetchTournament();
      fetchPlayers();
      fetchStandings();
      fetchTeams();
    }
  }, [id, dispatch, fetchTournament, fetchPlayers, fetchStandings]);

  // Sync tournament info with local state
  useEffect(() => {
    if (tournament?.tournament_information !== undefined) {
      setTournamentInfo(tournament.tournament_information || '');
    }
  }, [tournament]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Initialize prize settings from tournament data
  useEffect(() => {
    if (tournament && tournament.settings) {
      try {
        const settings = typeof tournament.settings === 'string' 
          ? JSON.parse(tournament.settings) 
          : tournament.settings;
        
        const prizeSettings = settings.prize_settings || settings.prizes || { enabled: false, autoAssign: false, sections: [] };
        
        // Ensure sections is always an array - handle string "[]" case
        if (!Array.isArray(prizeSettings.sections)) {
          if (typeof prizeSettings.sections === 'string') {
            try {
              prizeSettings.sections = JSON.parse(prizeSettings.sections);
            } catch (e) {
              prizeSettings.sections = [];
            }
          } else {
            prizeSettings.sections = [];
          }
        }
        
        setPrizeSettings(prizeSettings);
      } catch (e) {
        console.error('Error parsing tournament settings:', e);
        setPrizeSettings({ enabled: false, autoAssign: false, sections: [] });
      }
    } else {
      setPrizeSettings({ enabled: false, autoAssign: false, sections: [] });
    }
  }, [tournament]);

  // Set initial selected section when sections are available
  useEffect(() => {
    if (tournament && selectedSection === '') {
      const availableSections = getAvailableSections();
      if (availableSections.length > 0) {
        setSelectedSection(availableSections[0]);
      }
    }
  }, [tournament, selectedSection]);

  useEffect(() => {
    if (tournament) {
      fetchTeamStandings();
      fetchTeamPairings();
    }
  }, [tournament, fetchTeamStandings, fetchTeamPairings]);

  // Fetch team standings when standings tab is active for team tournaments
  useEffect(() => {
    if (activeTab === 'standings' && tournament?.format === 'team-tournament') {
      fetchTeamStandings();
      fetchTeams();
    }
  }, [activeTab, tournament?.format, fetchTeamStandings, fetchTeams]);

  // Fetch pairings when component loads or when currentRound changes
  useEffect(() => {
    if (id && currentRound) {
      // Only fetch all pairings if we're not in the pairings tab with a selected section
      if (activeTab !== 'pairings' || !selectedSection) {
        fetchPairings(currentRound);
      }
    }
  }, [id, currentRound, fetchPairings, activeTab, selectedSection]);

  // Fetch section-specific pairings when in pairings tab and section changes
  useEffect(() => {
    if (activeTab === 'pairings' && selectedSection && id) {
      const roundForSection = getCurrentRoundForSection(selectedSection);
      fetchPairings(roundForSection, selectedSection);
    }
  }, [activeTab, selectedSection, id, fetchPairings]);

  // Determine current round based on existing pairings when tournament loads
  useEffect(() => {
    if (tournament && state.pairings.length > 0) {
      const maxRound = Math.max(...state.pairings.map(p => p.round));
      if (maxRound > currentRound) {
        setCurrentRound(maxRound);
      }
    }
  }, [tournament, state.pairings, currentRound]);


  const generatePairingsForSection = async (sectionName: string) => {
    if (!id || isLoading || isGeneratingRef.current) return; // Prevent multiple calls
    console.log(`🟢 generatePairingsForSection called for section: ${sectionName}`);
    try {
      isGeneratingRef.current = true;
      setIsLoading(true);
      
      // Use the section-specific pairing system
      const response = await pairingApi.generateForSection(id, currentRound, sectionName);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate pairings');
      }

      console.log(`✅ Enhanced pairings generated successfully for ${sectionName} section:`, response.data);
      
      // Refresh pairings to show the new ones
      await fetchPairings(currentRound);
      
    } catch (error: any) {
      console.error(`❌ Failed to generate pairings for ${sectionName}:`, error);
      
      // Handle prerequisite error with detailed messaging
      if (error.message && error.message.includes('Round') && error.message.includes('not complete')) {
        alert(`Cannot generate Round ${currentRound} pairings for section "${sectionName}".\n\n${error.message}`);
      } else {
        alert(`Failed to generate pairings for ${sectionName}: ${error.message || 'Unknown error'}`);
      }
      
      // DO NOT refresh pairings on error - this would clear existing pairings
      return; // Exit early to prevent any further processing
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const resetPairings = async () => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to reset all pairings for Round ${currentRound}? This action cannot be undone.`)) {
      return;
    }
    try {
      const response = await pairingApi.resetPairings(id, currentRound);
      alert(response.data.message);
      await fetchPairings(currentRound);
      setPairingValidation(null);
    } catch (error) {
      console.error('Failed to reset pairings:', error);
      alert('Failed to reset pairings. Please try again.');
    }
  };

  const resetPairingsForSection = async (sectionName: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to reset pairings for ${sectionName} section in Round ${currentRound}? This action cannot be undone.`)) {
      return;
    }
    try {
      // For now, we'll reset all pairings but this could be enhanced to reset only specific section
      const response = await pairingApi.resetPairings(id, currentRound);
      alert(`Pairings reset successfully for ${sectionName} section`);
      await fetchPairings(currentRound);
      setPairingValidation(null);
    } catch (error) {
      console.error(`Failed to reset pairings for ${sectionName}:`, error);
      alert(`Failed to reset pairings for ${sectionName}. Please try again.`);
    }
  };

  const generateQuadPairings = async () => {
    if (!id || isLoading) return;
    
    try {
      setIsLoading(true);
      const response = await pairingApi.generateQuad(id);
      
      console.log('API Response:', response.data);
      
      // Check if request was successful
      if (!response.data?.success) {
        const errorMsg = (response.data as any)?.error || (response.data as any)?.message || 'Failed to generate quad pairings';
        throw new Error(errorMsg);
      }

      console.log('✅ Quad pairings generated successfully for all rounds:', response.data);
      
      // Defensive check for roundsData
      const roundsData = response.data.data?.roundsData;
      if (!roundsData || !Array.isArray(roundsData)) {
        throw new Error('Invalid response: roundsData is missing or not an array');
      }
      
      const roundsInfo = roundsData
        .map((r: any) => `Round ${r.round}: ${r.quadCount} quads, ${r.totalGames} games, ${r.totalByes} byes`)
        .join('\n');
      
      alert(`✅ Quad Tournament Sections Reassigned!\n\n${roundsInfo}\n\nTotal: ${response.data.data?.totalGamesAllRounds} games across all ${response.data.data?.totalRounds} rounds`);
      
      // Refresh pairings to show the new ones
      await fetchPairings(currentRound);
      await fetchTournament();
      
    } catch (error: any) {
      console.error('❌ Failed to generate quad pairings:', error);
      alert(`Failed to generate quad pairings: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const completeRound = async (sectionName: string) => {
    if (!id) return;
    try {
      const response = await pairingApi.completeRound(id, currentRound, sectionName);
      alert(response.data.message);
      
      // Refresh standings and tournament data
      await fetchStandings();
      await fetchTournament();
      
      // If section is completed, show message
      if (response.data.sectionCompleted) {
        alert(`Section ${sectionName} completed!`);
      } else if (response.data.nextRound) {
        setCurrentRoundForSection(sectionName, response.data.nextRound);
        await fetchPairings(response.data.nextRound);
      }
    } catch (error: any) {
      console.error('Failed to complete round:', error);
      alert(error.response?.data?.error || 'Failed to complete round');
    }
  };

  const updatePairingResult = async (pairingId: string, result: string) => {
    try {
      console.log('🎯 TournamentDetail: Updating result for pairing:', pairingId, 'result:', result);
      const response = await pairingApi.updateResult(pairingId, result);
      console.log('✅ TournamentDetail: Result update response:', response);
      
      // Update local state without full page refresh
      const updatedPairings = state.pairings.map((p: any) => 
        p.id === pairingId ? { ...p, result } : p
      );
      dispatch({ type: 'SET_PAIRINGS', payload: updatedPairings });
      
      // Only refresh standings to show updated scores
      await fetchStandings();
    } catch (error) {
      console.error('❌ TournamentDetail: Failed to update result:', error);
      alert(`Failed to update result: ${error}`);
    }
  };

  const updatePlayer = async (playerId: string, updates: any) => {
    try {
      await playerApi.update(playerId, updates);
      // Refresh players after updating
      await fetchPlayers();
      // Refresh standings if section changed
      if (updates.section !== undefined) {
        await fetchStandings();
      }
    } catch (error) {
      console.error('Failed to update player:', error);
      throw error;
    }
  };

  // Get available sections for filtering
  const getAvailableSections = () => {
    if (!tournament) return [];
    return getSectionOptions(tournament, state.players, false, state.pairings);
  };

  const updateTournamentSettings = async (settings: any) => {
    try {
      if (!state.currentTournament) {
        throw new Error('No tournament data available');
      }

      // Ensure all required fields are present for the update
      const updateData = {
        name: state.currentTournament.name || '',
        format: state.currentTournament.format || 'swiss',
        rounds: typeof state.currentTournament.rounds === 'number' ? state.currentTournament.rounds : parseInt(state.currentTournament.rounds) || 5,
        settings: settings,
        // Include other fields that might be needed
        organization_id: state.currentTournament.organization_id,
        time_control: state.currentTournament.time_control,
        start_date: state.currentTournament.start_date,
        end_date: state.currentTournament.end_date,
        status: state.currentTournament.status,
        city: state.currentTournament.city,
        state: state.currentTournament.state,
        location: state.currentTournament.location,
        chief_td_name: state.currentTournament.chief_td_name,
        chief_td_uscf_id: state.currentTournament.chief_td_uscf_id,
        chief_arbiter_name: state.currentTournament.chief_arbiter_name,
        chief_arbiter_fide_id: state.currentTournament.chief_arbiter_fide_id,
        chief_organizer_name: state.currentTournament.chief_organizer_name,
        chief_organizer_fide_id: state.currentTournament.chief_organizer_fide_id,
        expected_players: state.currentTournament.expected_players,
        website: state.currentTournament.website,
        fide_rated: state.currentTournament.fide_rated,
        uscf_rated: state.currentTournament.uscf_rated,
        allow_registration: state.currentTournament.allow_registration,
        is_public: state.currentTournament.is_public,
        public_url: state.currentTournament.public_url,
        logo_url: state.currentTournament.logo_url
      };
      
      // Debug logging
      console.log('Updating tournament with data:', {
        rounds: updateData.rounds,
        roundsType: typeof updateData.rounds,
        hasName: !!updateData.name,
        hasFormat: !!updateData.format
      });
      
      await tournamentApi.update(id!, updateData);
      // Refresh tournament data
      await fetchTournament();
    } catch (error) {
      console.error('Failed to update tournament settings:', error);
      throw error;
    }
  };

  const addSection = async () => {
    if (!newSectionName.trim()) {
      alert('Please enter a section name');
      return;
    }

    try {
      const currentSettings = tournament?.settings || {};
      const currentSections = currentSettings.sections || [];
      
      // Check if section already exists
      if (currentSections.some((s: any) => s.name === newSectionName.trim())) {
        alert('A section with this name already exists');
        return;
      }

      const newSection = {
        name: newSectionName.trim(),
        description: '',
        min_rating: 0,
        max_rating: 3000
      };

      const updatedSettings = {
        ...currentSettings,
        sections: [...currentSections, newSection]
      };

      await updateTournamentSettings(updatedSettings);
      setNewSectionName('');
      setShowSectionManager(false);
      alert(`Section "${newSectionName}" added successfully!`);
    } catch (error) {
      console.error('Failed to add section:', error);
      alert('Failed to add section. Please try again.');
    }
  };

  const clearStandings = async () => {
    if (!window.confirm('This will clear all standings data from your device. This action cannot be undone. Continue?')) {
      return;
    }

    try {
      // Clear standings from context
      dispatch({ type: 'SET_STANDINGS', payload: [] });
      
      // Clear pairings from context
      dispatch({ type: 'SET_PAIRINGS', payload: [] });
      
      // Clear local storage if any
      localStorage.removeItem(`standings_${id}`);
      localStorage.removeItem(`pairings_${id}`);
      
      alert('Standings data cleared from device successfully!');
    } catch (error) {
      console.error('Failed to clear standings:', error);
      alert('Failed to clear standings. Please try again.');
    }
  };

  const handleWithdrawPlayer = async (playerId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to withdraw this player from the tournament?')) {
      return;
    }
    
    try {
      await playerApi.update(playerId, { status: 'withdrawn' });
      // Refresh players after updating
      await fetchPlayers();
      // Refresh standings after withdrawal
      await fetchStandings();
    } catch (error) {
      console.error('Failed to withdraw player:', error);
      alert('Failed to withdraw player. Please try again.');
    }
  };

  const handleReactivatePlayer = async (playerId: string) => {
    try {
      await playerApi.update(playerId, { status: 'active' });
      // Refresh players after updating
      await fetchPlayers();
      // Refresh standings after reactivation
      await fetchStandings();
    } catch (error) {
      console.error('Failed to reactivate player:', error);
      alert('Failed to reactivate player. Please try again.');
    }
  };

  const handleActivatePlayer = async (playerId: string) => {
    try {
      await playerApi.update(playerId, { status: 'active' });
      // Refresh players after updating
      await fetchPlayers();
      // Refresh standings after activation
      await fetchStandings();
    } catch (error) {
      console.error('Failed to activate player:', error);
      alert('Failed to activate player. Please try again.');
    }
  };

  const handleStartTeamEdit = (playerId: string, currentTeamName: string = '') => {
    setEditingPlayerId(playerId);
    setEditingTeamName(currentTeamName);
  };

  const handleSaveTeamEdit = async (playerId: string) => {
    if (!playerId) {
      console.error('No player ID provided');
      return;
    }
    
    try {
      const updateData: any = {};
      if (editingTeamName && editingTeamName.trim() !== '') {
        updateData.team_name = editingTeamName.trim();
      } else {
        updateData.team_name = undefined;
      }
      
      await playerApi.update(playerId, updateData);
      // Refresh players after updating
      await fetchPlayers();
      setEditingPlayerId(null);
      setEditingTeamName('');
    } catch (error: any) {
      console.error('Failed to update team name:', error);
      alert(`Failed to update team name: ${error.message || 'Please try again.'}`);
    }
  };

  const handleCancelTeamEdit = () => {
    setEditingPlayerId(null);
    setEditingTeamName('');
  };

  const handleBulkTeamAssignment = async () => {
    const teamName = prompt('Enter team name for selected players:');
    if (!teamName) return;

    try {
      const updatePromises = Array.from(selectedPlayers).map(playerId =>
        playerApi.update(playerId, { team_name: teamName })
      );
      
      await Promise.all(updatePromises);
      
      // Refresh players after updating
      await fetchPlayers();
      
      // Clear selection
      setSelectedPlayers(new Set());
      
      alert(`Successfully assigned ${selectedPlayers.size} players to team "${teamName}"`);
    } catch (error) {
      console.error('Failed to assign team to players:', error);
      alert('Failed to assign team to players. Please try again.');
    }
  };

  const handleCreateTeamFromSelected = async () => {
    const teamName = prompt('Enter team name for new team:');
    if (!teamName) return;

    try {
      const updatePromises = Array.from(selectedPlayers).map(playerId =>
        playerApi.update(playerId, { team_name: teamName })
      );
      
      await Promise.all(updatePromises);
      
      // Refresh players after updating
      await fetchPlayers();
      
      // Clear selection
      setSelectedPlayers(new Set());
      
      alert(`Successfully created team "${teamName}" with ${selectedPlayers.size} players`);
    } catch (error) {
      console.error('Failed to create team:', error);
      alert('Failed to create team. Please try again.');
    }
  };

  // Batch selection functions
  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allPlayers = state.players;
    if (selectedPlayers.size === allPlayers.length) {
      // If all players are selected, deselect all
      setSelectedPlayers(new Set());
    } else {
      // Select all players
      setSelectedPlayers(new Set(allPlayers.map(p => p.id)));
    }
  };

  const handleCompleteTournament = async () => {
    if (!id) {
      alert('Tournament ID not found');
      return;
    }
    
    if (!window.confirm('Are you sure you want to complete this tournament? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await tournamentApi.update(id, { status: 'completed' });
      
      if (response.data.success) {
        // Refresh tournament data
        await fetchTournament();
        await fetchStandings();
        
        // Show success message
        alert(`Tournament completed successfully! ${response.data.prizeResult?.message || ''}`);
      } else {
        throw new Error(response.data.error || 'Failed to complete tournament');
      }
    } catch (error: any) {
      console.error('Error completing tournament:', error);
      alert(`Failed to complete tournament: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchActivate = async () => {
    if (selectedPlayers.size === 0) return;
    
    try {
      const promises = Array.from(selectedPlayers).map(playerId => 
        playerApi.update(playerId, { status: 'active' })
      );
      
      await Promise.all(promises);
      
      // Clear selection
      setSelectedPlayers(new Set());
      
      // Refresh players and standings
      await fetchPlayers();
      await fetchStandings();
      
      alert(`Successfully activated ${selectedPlayers.size} player(s)`);
    } catch (error) {
      console.error('Failed to batch activate players:', error);
      alert('Failed to activate some players. Please try again.');
    }
  };

  const handleBatchDeactivate = async () => {
    if (selectedPlayers.size === 0) return;
    
    try {
      const promises = Array.from(selectedPlayers).map(playerId => 
        playerApi.update(playerId, { status: 'inactive' })
      );
      
      await Promise.all(promises);
      
      // Clear selection
      setSelectedPlayers(new Set());
      
      // Refresh players and standings
      await fetchPlayers();
      await fetchStandings();
      
      alert(`Successfully deactivated ${selectedPlayers.size} player(s)`);
    } catch (error) {
      console.error('Failed to batch deactivate players:', error);
      alert('Failed to deactivate some players. Please try again.');
    }
  };

  const handleDeleteDuplicates = async () => {
    if (!id) return;
    
    try {
      const response = await playerApi.deleteDuplicates(id, deleteDuplicatesCriteria);
      
      if (response.data.success) {
        const { deletedCount, duplicates } = response.data;
        
        if (deletedCount > 0) {
          // Refresh players and standings after deletion
          await fetchPlayers();
          await fetchStandings();
          
          // Show success message with details
          const duplicateDetails = duplicates.map(d => 
            `• ${d.kept.name} (kept) - deleted ${d.deleted.length} duplicate(s)`
          ).join('\n');
          
          alert(`Successfully deleted ${deletedCount} duplicate player(s)!\n\nDetails:\n${duplicateDetails}`);
        } else {
          alert('No duplicates found based on the selected criteria.');
        }
      } else {
        throw new Error('Failed to delete duplicates');
      }
    } catch (error: any) {
      console.error('Failed to delete duplicates:', error);
      alert(`Failed to delete duplicates: ${error.message || error}`);
    } finally {
      setShowDeleteDuplicates(false);
    }
  };

  // Settings tab handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      
      // For now, we'll use a simple approach - convert to data URL
      // In production, you'd want to upload to a file storage service
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        await handleTournamentUpdate('logo_url', dataUrl);
        setLogoUrl('');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUrlSave = async () => {
    if (!logoUrl.trim()) return;
    
    try {
      setSaving(true);
      await handleTournamentUpdate('logo_url', logoUrl.trim());
      setLogoUrl('');
    } catch (error) {
      console.error('Failed to save logo URL:', error);
      alert('Failed to save logo URL. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!window.confirm('Are you sure you want to remove the tournament logo?')) return;
    
    try {
      setSaving(true);
      await handleTournamentUpdate('logo_url', '');
    } catch (error) {
      console.error('Failed to remove logo:', error);
      alert('Failed to remove logo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTournamentUpdate = async (field: string, value: any) => {
    if (!id) return;
    
    try {
      // Always include required fields - use tournament from state or fallback to currentTournament
      let currentTournament = tournament || state.currentTournament;
      
      // If tournament data not loaded, fetch it first
      if (!currentTournament) {
        const tournamentResponse = await tournamentApi.getById(id);
        if (!tournamentResponse.data.success || !tournamentResponse.data.data) {
          throw new Error('Failed to load tournament data');
        }
        currentTournament = tournamentResponse.data.data;
      }
      
      // Build update data with required fields
      const updateData: any = { [field]: value };
      
      // Always include required fields (server validation requires them)
      if (field !== 'name') {
        updateData.name = currentTournament.name || '';
      }
      if (field !== 'format') {
        updateData.format = currentTournament.format || 'swiss';
      }
      if (field !== 'rounds') {
        updateData.rounds = typeof currentTournament.rounds === 'number' 
          ? currentTournament.rounds 
          : (parseInt(currentTournament.rounds) || 5);
      }
      
      console.log('Updating tournament with data:', {
        field,
        value,
        includedFields: {
          name: updateData.name,
          format: updateData.format,
          rounds: updateData.rounds
        }
      });
      
      const response = await tournamentApi.update(id, updateData);
      if (response.data.success) {
        dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: response.data.data });
      } else {
        throw new Error(response.data.error || 'Failed to update tournament');
      }
    } catch (error: any) {
      console.error('Failed to update tournament:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Failed to update tournament: ${error.message || error}`);
    }
  };

  // Debounced handler for tournament info to prevent API calls on every keystroke
  const handleTournamentInfoChange = (value: string) => {
    setTournamentInfo(value);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after user stops typing (1 second)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await handleTournamentUpdate('tournament_information', value);
      } catch (error: any) {
        console.error('Failed to save tournament info:', error);
      }
    }, 1000);
  };

  const handleSettingsSave = async () => {
    // This function is called when the save button is clicked
    // Individual field updates are handled by handleTournamentUpdate
    alert('Settings saved successfully!');
  };

  console.log('TournamentDetail: Render state:', { 
    tournament, 
    isLoading, 
    error: state.error,
    hasTournament: !!tournament,
    shouldShowLoading: !tournament && (isLoading || !state.error)
  });

  if (!tournament && (isLoading || !state.error)) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chess-board mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading tournament...</p>
        {/* <p className="mt-2 text-sm text-gray-500">Debug: isLoading={isLoading.toString()}, error={state.error || 'none'}</p> */}
        <div className="mt-4 space-x-2">
          <button
            onClick={() => {
              console.log('Manual test - fetching tournament...');
              fetchTournament();
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test API Call
          </button>
          <button
            onClick={() => {
              console.log('Manual test - clearing cache and refetching...');
              dispatch({ type: 'CLEAR_CACHE' });
              fetchTournament();
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Clear Cache & Retry
          </button>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="text-center py-12">
        <div className="space-y-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{state.error}</p>
          </div>
          <button
            onClick={() => {
              dispatch({ type: 'SET_ERROR', payload: null });
              fetchTournament();
              fetchPlayers();
              fetchStandings();
            }}
            className="bg-chess-board text-white px-4 py-2 rounded-lg hover:bg-chess-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">Tournament Not Found</p>
          <p>The tournament you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const expirationWarnings = getExpirationWarnings();
  const tournamentNotifications = getAllTournamentNotifications(
    tournament,
    state.players,
    expirationWarnings
  );
  const hasNotifications = tournamentNotifications.length > 0;

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const overviewStats: Array<{
    key: string;
    label: string;
    value: string;
    icon: React.ElementType;
  }> = [
    {
      key: 'start',
      label: 'Start Date',
      value: tournament.start_date
        ? new Date(tournament.start_date).toLocaleDateString()
        : 'TBD',
      icon: Calendar
    },
    {
      key: 'end',
      label: 'End Date',
      value: tournament.end_date
        ? new Date(tournament.end_date).toLocaleDateString()
        : 'TBD',
      icon: Calendar
    },
    {
      key: 'time-control',
      label: 'Time Control',
      value: tournament.time_control || 'TBD',
      icon: Clock
    },
    {
      key: 'players',
      label: 'Registered Players',
      value: `${state.players.length}`,
      icon: Users
    }
  ];

  const sectionCount = tournament.settings?.sections?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Integrated Overview Surface */}
        <div className="mb-8 rounded-3xl border border-neutral-200 bg-white shadow-lg">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-orange-50 to-orange-100">
            <div className="relative px-6 py-8 text-neutral-900 sm:px-8 lg:px-10">
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex flex-col gap-5 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back</span>
                      </button>
                      <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700 shadow-sm">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            tournament.status === 'active'
                          ? 'bg-emerald-500'
                          : tournament.status === 'completed'
                            ? 'bg-blue-500'
                            : tournament.status === 'cancelled'
                              ? 'bg-rose-500'
                              : 'bg-orange-400'
                          }`}
                        />
                        <span>
                          {tournament.status
                            ? tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)
                            : 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-500">
                        Snapshot
                      </p>
                      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl text-neutral-900">
                        {tournament.name || 'Tournament overview'}
                      </h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-700">
                        {tournament.format && (
                          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-orange-700 shadow-sm">
                            <Trophy className="h-4 w-4 text-orange-500" />
                            <span className="capitalize">{tournament.format.replace('-', ' ')} format</span>
                          </span>
                        )}
                        {tournament.rounds && (
                          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-orange-700 shadow-sm">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            <span>
                              {tournament.rounds} {tournament.rounds === 1 ? 'round' : 'rounds'}
                            </span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-orange-700 shadow-sm">
                          <Users className="h-4 w-4 text-orange-500" />
                          <span>{state.players.length} registered</span>
                        </span>
                        {sectionCount > 0 && (
                          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-orange-700 shadow-sm">
                            <Layers className="h-4 w-4 text-orange-500" />
                            <span>
                              {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-4 xl:flex-none">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <APIStatusIndicator
                        tournamentId={id || ''}
                        apiKey="ctk_f5de4f4cf423a194d00c078baa10e7a153fcca3e229ee7aadfdd72fec76cdd94"
                      />
                      <NotificationButton
                        notifications={tournamentNotifications}
                        className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
                          hasNotifications
                            ? 'bg-orange-100 text-orange-900 border border-orange-200'
                            : 'bg-white text-neutral-700 border border-neutral-200'
                        }`}
                        webhookEnabled={emailsEnabled}
                        onWebhookToggle={(enabled) => {
                          setEmailsEnabled(enabled);
                        }}
                        webhookUrl={tournament.webhook_url || process.env.REACT_APP_PAIRING_NOTIFICATION_WEBHOOK}
                        onDismiss={(notificationId) => {
                          console.log('Dismissed notification:', notificationId);
                        }}
                        onMarkAsRead={(notificationId) => {
                          console.log('Marked as read:', notificationId);
                        }}
                        onViewPlayer={(playerName) => {
                          const player = state.players.find((p) => p.name === playerName);
                          if (player) {
                            setActiveTab('players');
                            console.log('Viewing player:', playerName);
                          }
                        }}
                      />
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold border ${
                          tournament.allow_registration
                            ? 'border-orange-200 bg-orange-50 text-orange-800'
                            : 'border-neutral-200 bg-white text-neutral-600'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            tournament.allow_registration ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span>{tournament.allow_registration ? 'Registration open' : 'Registration closed'}</span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const updatedTournament = {
                              ...tournament,
                              allow_registration: !tournament.allow_registration
                            };
                            await tournamentApi.update(id!, updatedTournament);
                            await fetchTournament();
                          } catch (error) {
                            console.error('Failed to update registration setting:', error);
                            alert('Failed to update registration setting. Please try again.');
                          }
                        }}
                        className={`relative inline-flex h-9 w-16 items-center rounded-full border border-orange-200 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-200 focus:ring-offset-2 focus:ring-offset-white ${
                          tournament.allow_registration ? 'bg-orange-100' : 'bg-white'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                            tournament.allow_registration ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <a
                        href={`/public/tournaments/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50"
                      >
                        <ExternalLink className="h-4 w-4 text-orange-500" />
                        <span>Public View</span>
                      </a>
                      <button
                        onClick={() => setShowDBFExport(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export USCF</span>
                      </button>
                      <button
                        onClick={() => setShowGoogleFormsConnector(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500"
                      >
                        <LinkIcon className="h-4 w-4" />
                        <span>Connect Google Form</span>
                      </button>
                      <button
                        onClick={() => setShowAPIDocs(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-orange-300 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-400"
                      >
                        <Code className="h-4 w-4" />
                        <span>API Docs</span>
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowDisplaySettings(!showDisplaySettings)}
                          className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Actions</span>
                        </button>
                        {showDisplaySettings && (
                          <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-neutral-200 bg-white shadow-xl z-50">
                            <div className="py-2">
                              <button
                                onClick={() => {
                                  dispatch({ type: 'SET_ERROR', payload: null });
                                  fetchTournament();
                                  fetchPlayers();
                                  fetchStandings();
                                }}
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                              >
                                <RefreshCw className="h-4 w-4 mr-3" />
                                Refresh Data
                              </button>
                              <button
                                onClick={() => setShowSectionManager(true)}
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                              >
                                <Settings className="h-4 w-4 mr-3" />
                                Manage Sections
                              </button>
                              <button
                                onClick={clearStandings}
                                className="flex w-full items-center px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4 mr-3" />
                                Clear Standings
                              </button>
                              <button
                                onClick={() => setShowAPIRegistrationModal(true)}
                                className="flex w-full items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                              >
                                <FileText className="h-4 w-4 mr-3" />
                                API & Registration
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                  {overviewStats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.key}
                        className={`flex items-start gap-4 ${index > 0 ? 'sm:border-l sm:border-orange-200 sm:pl-6' : ''}`}
                      >
                        <span className="mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-orange-200">
                          <Icon className="h-5 w-5 text-orange-500" />
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                            {stat.label}
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-neutral-900">{stat.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="relative border-t border-orange-200 bg-white px-3 py-3 text-neutral-700 sm:px-6">
              <nav className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide sm:gap-3">
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'settings'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>INFO</span>
              </button>
              
              <button
                onClick={() => setActiveTab('players')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'players'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Players</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'players'
                    ? 'bg-white/30 text-white'
                    : 'bg-neutral-200 text-neutral-700'
                }`}>
                  {state.players.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('pairings')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'pairings'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <Trophy className="h-4 w-4" />
                <span>Pairings</span>
              </button>
                
              <button
                onClick={() => setActiveTab('standings')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'standings'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <Trophy className="h-4 w-4" />
                <span>Standings</span>
              </button>

              <button
                onClick={() => setActiveTab('prizes')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'prizes'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>Prizes</span>
              </button>

              <button
                onClick={() => setActiveTab('print')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'print'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>

              <button
                onClick={() => setActiveTab('club-ratings')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'club-ratings'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Club Ratings</span>
              </button>

              <button
                onClick={() => setActiveTab('team-standings')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'team-standings'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Team Standings</span>
              </button>

              <button
                onClick={() => setActiveTab('registrations')}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'registrations'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-orange-100 hover:text-orange-800'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Registrations</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Display Settings Panel */}
      {showDisplaySettings && activeTab === 'pairings' && (
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-lg font-medium mb-4">Pairings Display Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={displayOptions.showRatings}
                  onChange={(e) => setDisplayOptions(prev => ({ ...prev, showRatings: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Show Ratings</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={displayOptions.showUscfIds}
                  onChange={(e) => setDisplayOptions(prev => ({ ...prev, showUscfIds: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Show USCF IDs</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={displayOptions.boardNumbers}
                  onChange={(e) => setDisplayOptions(prev => ({ ...prev, boardNumbers: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Board Numbers</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm">Format:</label>
              <select
                value={displayOptions.displayFormat}
                onChange={(e) => setDisplayOptions(prev => ({ ...prev, displayFormat: e.target.value as any }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="default">Default</option>
                <option value="compact">Compact</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
        </div>
      )}


        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Overview</h3>
                    <p className="text-gray-600">Welcome to the tournament management system. Use the tabs above to navigate between different sections.</p>
                  </div>
                  
                  {/* Lichess Integration - Always visible in overview tab */}
                  {state.currentTournament && (
                    <div className="mt-6">
                      <LichessIntegration
                        tournamentId={id || ''}
                        tournamentName={state.currentTournament.name}
                        timeControl={state.currentTournament.time_control || 'G/45+15'}
                        rounds={state.currentTournament.rounds}
                        players={state.players || []}
                        onGamesCreated={(games) => {
                          console.log('Lichess games created:', games);
                          // Refresh pairings or show success message
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'players' && (
              <div>
                {/* Debug Info for Team Tournaments */}
                {tournament?.format && ['team-swiss', 'team-round-robin', 'team-tournament'].includes(tournament.format) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Team Tournament Mode:</strong> Format: {tournament.format} | Teams loaded: {teams.length} | 
                      Sections: {groupTeamsBySection(teams).map(s => s.section).join(', ') || 'None'}
                    </p>
                  </div>
                )}
                {/* Combined Player Management Toolbar */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">Player Management</h2>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowAddPlayer(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Player</span>
                      </button>
                      <button
                        onClick={() => setShowBulkAddPlayer(true)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        <span>Bulk Add</span>
                      </button>
                      <button
                        onClick={() => setShowUnifiedImport(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Import Players</span>
                      </button>
                      {tournament?.organization_id && (
                        <button
                          onClick={() => setShowImportClubMembers(true)}
                          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          <span>Import from Club Members</span>
                        </button>
                      )}
                      <button
                        onClick={() => setShowGoogleFormsConnector(true)}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <LinkIcon className="h-4 w-4" />
                        <span>Connect Google Form</span>
                      </button>
                      <button
                        onClick={() => setShowDBFExport(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export USCF</span>
                      </button>
                      {tournament?.format === 'team-tournament' && (
                        <button
                          onClick={() => setShowTeamTournamentManagement(true)}
                          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          <span>Manage Teams</span>
                        </button>
                      )}
                      <button
                        onClick={() => setShowAPIDocs(true)}
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Code className="h-4 w-4" />
                        <span>API Docs</span>
                      </button>
                      <button
                        onClick={() => setShowByeManagement(true)}
                        className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>Manage Byes</span>
                      </button>
                      <button
                        onClick={() => setShowDeleteDuplicates(true)}
                        className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Duplicates</span>
                      </button>
                      {tournament && tournament.format === 'quad' && (
                        <button
                          onClick={generateQuadPairings}
                          disabled={isLoading}
                          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                        >
                          <span>🎯</span>
                          <span>{isLoading ? 'Generating...' : 'Generate Quads'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    <p>• Click ✏️ next to team names to edit them inline</p>
                    <p>• Select multiple players to assign them to teams or perform bulk operations</p>
                  </div>
                </div>
              
              {/* Batch Actions Bar */}
              {selectedPlayers.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-blue-800">
                        {selectedPlayers.size} player(s) selected
                      </span>
                      <button
                        onClick={() => setSelectedPlayers(new Set())}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear selection
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowBatchOperations(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        <span>Batch Operations</span>
                      </button>
                      <button
                        onClick={handleBatchActivate}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <span>Activate Selected</span>
                      </button>
                      <button
                        onClick={handleBatchDeactivate}
                        className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <span>Deactivate Selected</span>
                      </button>
                      <button
                        onClick={handleBulkTeamAssignment}
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        <span>Assign to Team</span>
                      </button>
                      <button
                        onClick={handleCreateTeamFromSelected}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create New Team</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* New Feature Tools Section - Hidden */}
              {false && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6 border border-purple-200">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Tournament Tools</h2>
                    <p className="text-sm text-gray-600">Advanced features for tournament management</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowSMSManager(true)}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>SMS</span>
                    </button>
                    <button
                      onClick={() => setShowQRCodeGenerator(true)}
                      className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>QR Codes</span>
                    </button>
                    <button
                      onClick={() => setShowAnalyticsDashboard(true)}
                      className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Analytics</span>
                    </button>
                    <button
                      onClick={() => setShowChessIntegration(true)}
                      className="flex items-center space-x-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors shadow-sm"
                    >
                      <Gamepad2 className="h-4 w-4" />
                      <span>Chess Platforms</span>
                    </button>
                  </div>
                </div>
              </div>
              )}
              
              {/* For team tournaments, always show teams section first, then players */}
              {tournament?.format && ['team-swiss', 'team-round-robin', 'team-tournament'].includes(tournament.format) ? (
                <div className="space-y-4">
                  {/* Sectioned Teams Display for Team Tournaments */}
                  {teams.length === 0 ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Created Yet</h3>
                          <p className="text-gray-600 mb-4">
                            Teams will be displayed here once you create them. Teams can be organized into different sections.
                          </p>
                          <button
                            onClick={() => setShowTeamTournamentManagement(true)}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Team
                          </button>
                        </div>
                      ) : (
                        <div>
                          {groupTeamsBySection(teams).length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                              <p className="text-yellow-800 text-sm">
                                <strong>Debug:</strong> Teams exist ({teams.length}) but couldn't be grouped. Team data: {JSON.stringify(teams.slice(0, 2), null, 2)}
                              </p>
                            </div>
                          ) : null}
                          {groupTeamsBySection(teams).map((sectionGroup) => (
                        <div key={sectionGroup.section} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          {/* Section Header */}
                          <div 
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                            onClick={() => toggleSectionCollapse(sectionGroup.section)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <button className="text-gray-600 hover:text-gray-800 transition-colors">
                                  {collapsedSections.has(sectionGroup.section) ? (
                                    <ChevronRight className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </button>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {sectionGroup.section} Section
                                </h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {sectionGroup.count} team{sectionGroup.count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                Click to {collapsedSections.has(sectionGroup.section) ? 'expand' : 'collapse'}
                              </div>
                            </div>
                          </div>

                        {/* Section Content - Teams */}
                        {!collapsedSections.has(sectionGroup.section) && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Team Name
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Members
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Section
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {sectionGroup.teams.map((team: any) => (
                                  <tr key={team.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedTeams);
                                          if (newExpanded.has(team.id)) {
                                            newExpanded.delete(team.id);
                                          } else {
                                            newExpanded.add(team.id);
                                          }
                                          setExpandedTeams(newExpanded);
                                        }}
                                        className="flex items-center space-x-2 text-sm font-medium text-gray-900 hover:text-blue-600"
                                      >
                                        {expandedTeams.has(team.id) ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                        <span>{team.name}</span>
                                      </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {team.member_count || team.members?.length || 0} player{team.member_count !== 1 && team.members?.length !== 1 ? 's' : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {team.section || 'Open'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <button
                                        onClick={() => setShowTeamTournamentManagement(true)}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        Manage
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {sectionGroup.teams.map((team: any) => (
                                  expandedTeams.has(team.id) && team.members && team.members.length > 0 && (
                                    <tr key={`${team.id}-members`} className="bg-gray-50">
                                      <td colSpan={4} className="px-6 py-4">
                                        <div className="ml-8">
                                          <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members:</h4>
                                          <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                              <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">USCF ID</th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                              {team.members.map((member: any, idx: number) => (
                                                <tr key={member.id || idx}>
                                                  <td className="px-4 py-2 text-sm text-gray-900">{member.player_name || member.name}</td>
                                                  <td className="px-4 py-2 text-sm text-gray-500">{member.rating || 'Unrated'}</td>
                                                  <td className="px-4 py-2 text-sm text-gray-500">{member.uscf_id || '-'}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                          ))}
                        </div>
                      )}
                  
                  {/* Players List Below Teams (if any) - Grouped by Section then Team */}
                  {state.players.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">All Players by Section and Team</h3>
                      {groupPlayersBySectionAndTeam(sortPlayers(state.players)).map((sectionGroup) => (
                        <div key={sectionGroup.section} className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
                          {/* Section Header */}
                          <div 
                            className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 px-6 py-4 cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-colors"
                            onClick={() => toggleSectionCollapse(`players-${sectionGroup.section}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <button className="text-gray-600 hover:text-gray-800 transition-colors">
                                  {collapsedSections.has(`players-${sectionGroup.section}`) ? (
                                    <ChevronRight className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </button>
                                <h4 className="text-md font-semibold text-gray-900">
                                  {sectionGroup.section} Section
                                </h4>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {sectionGroup.teams.reduce((sum, t) => sum + t.count, 0)} player{sectionGroup.teams.reduce((sum, t) => sum + t.count, 0) !== 1 ? 's' : ''} in {sectionGroup.teams.length} team{sectionGroup.teams.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          {!collapsedSections.has(`players-${sectionGroup.section}`) && (
                            <div className="p-4 space-y-4">
                              {sectionGroup.teams.map((teamGroup) => (
                                <div key={teamGroup.teamName} className="border border-gray-200 rounded-lg overflow-hidden">
                                  {/* Team Header */}
                                  <div 
                                    className="bg-gray-50 border-b border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => toggleSectionCollapse(`team-${teamGroup.teamName}`)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <button className="text-gray-600 hover:text-gray-800 transition-colors">
                                          {collapsedSections.has(`team-${teamGroup.teamName}`) ? (
                                            <ChevronRight className="h-4 w-4" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4" />
                                          )}
                                        </button>
                                        <h5 className="text-sm font-semibold text-gray-900">
                                          {teamGroup.teamName}
                                        </h5>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                                          {teamGroup.count} player{teamGroup.count !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {!collapsedSections.has(`team-${teamGroup.teamName}`) && (
                                    <div className="p-4 bg-white">
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                          <thead className="bg-gray-50">
                                            <tr>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">USCF ID</th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {teamGroup.players.map((player: any, idx: number) => (
                                              <tr key={player.id || idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-sm text-gray-900">{player.name}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">{player.rating || 'Unrated'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-500">{player.uscf_id || '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : state.players.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No players added yet</p>
                  <button
                    onClick={() => setShowAddPlayer(true)}
                    className="text-chess-board hover:text-chess-dark font-medium"
                  >
                    Add your first player
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Regular Players Display for Non-Team Tournaments */}
                  {groupPlayersBySection(sortPlayers(state.players)).map((sectionGroup) => (
                    <div key={sectionGroup.section} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {/* Section Header */}
                      <div 
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                        onClick={() => toggleSectionCollapse(sectionGroup.section)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button className="text-gray-600 hover:text-gray-800 transition-colors">
                              {collapsedSections.has(sectionGroup.section) ? (
                                <ChevronRight className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </button>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {sectionGroup.section}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {sectionGroup.count} player{sectionGroup.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Click to {collapsedSections.has(sectionGroup.section) ? 'expand' : 'collapse'}
                          </div>
                        </div>
                      </div>

                      {/* Section Content */}
                      {!collapsedSections.has(sectionGroup.section) && (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <input
                                    type="checkbox"
                                    checked={sectionGroup.players.length > 0 && sectionGroup.players.every((p: any) => selectedPlayers.has(p.id))}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        sectionGroup.players.forEach((player: any) => selectedPlayers.add(player.id));
                                        setSelectedPlayers(new Set(selectedPlayers));
                                      } else {
                                        sectionGroup.players.forEach((player: any) => selectedPlayers.delete(player.id));
                                        setSelectedPlayers(new Set(selectedPlayers));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('name')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>Name</span>
                                    {sortField === 'name' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('rating')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>Rating</span>
                                    {sortField === 'rating' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('points')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>Score</span>
                                    {sortField === 'points' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('uscf_id')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>USCF ID</span>
                                    {sortField === 'uscf_id' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('section')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>Section</span>
                                    {sortField === 'section' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('team_name')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>Team</span>
                                    {sortField === 'team_name' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('is_active')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>Status</span>
                                    {sortField === 'is_active' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('expiration_date')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>ID Expires</span>
                                    {sortField === 'expiration_date' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('bye_rounds')}
                                    className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                                  >
                                    <span>Bye Rounds</span>
                                    {sortField === 'bye_rounds' && (
                                      sortDirection === 'asc' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {sectionGroup.players.map((player: any) => (
                        <tr key={player.id} className={selectedPlayers.has(player.id) ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedPlayers.has(player.id)}
                              onChange={() => handleSelectPlayer(player.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.rating || 'Unrated'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.points !== undefined && player.points !== null ? parseFloat(player.points.toString()).toFixed(1) : '0.0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.uscf_id || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.section || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editingPlayerId === player.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editingTeamName}
                                  onChange={(e) => setEditingTeamName(e.target.value)}
                                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter team name"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveTeamEdit(player.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelTeamEdit();
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveTeamEdit(player.id)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancelTeamEdit}
                                  className="text-red-600 hover:text-red-800"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span>{player.team_name || '-'}</span>
                                <button
                                  onClick={() => handleStartTeamEdit(player.id, player.team_name || '')}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                  title="Edit team"
                                >
                                  ✏️
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  player.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : player.status === 'withdrawn'
                                    ? 'bg-red-100 text-red-800'
                                    : player.status === 'inactive'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {player.status}
                              </span>
                              {player.expiration_date && (() => {
                                const details = getExpirationDetails(player.expiration_date);
                                if (!details) return null;
                                
                                if (details.days < 0) {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                      ID Expired
                                    </span>
                                  );
                                }
                                
                                if (details.days <= 30) {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                      Expires in {details.days} days
                                    </span>
                                  );
                                }
                                
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.expiration_date ? (
                              (() => {
                                const details = getExpirationDetails(player.expiration_date);
                                if (!details) {
                                  return <span className="text-gray-400">Invalid Date</span>;
                                }

                                if (details.days < 0) {
                                  return (
                                    <span className="text-red-600 font-medium">
                                      Expired
                                    </span>
                                  );
                                }

                                if (details.days <= 30) {
                                  return (
                                    <span className="text-yellow-600 font-medium">
                                      {details.days} days
                                    </span>
                                  );
                                }

                                return (
                                  <span className="text-gray-600">
                                    {formatDateSafe(details.date)}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(() => {
                              try {
                                // Check intentional_bye_rounds first (preferred), then bye_rounds
                                let byeRounds: number[] = [];
                                
                                if (player.intentional_bye_rounds) {
                                  // Handle array, JSON string, or comma-separated string
                                  if (Array.isArray(player.intentional_bye_rounds)) {
                                    byeRounds = player.intentional_bye_rounds;
                                  } else if (typeof player.intentional_bye_rounds === 'string') {
                                    try {
                                      byeRounds = JSON.parse(player.intentional_bye_rounds);
                                    } catch {
                                      byeRounds = player.intentional_bye_rounds.split(',').map((r: string) => parseInt(r.trim())).filter((r: number) => !isNaN(r));
                                    }
                                  }
                                } else if (player.bye_rounds && typeof player.bye_rounds === 'string') {
                                  const byeRoundsStr = player.bye_rounds.trim();
                                  
                                  // Check if it looks like a date
                                  const isDatePattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(byeRoundsStr);
                                  if (isDatePattern || byeRoundsStr.toLowerCase() === 'expired') {
                                    return <span className="text-gray-400">-</span>;
                                  }
                                  
                                  if (byeRoundsStr !== '') {
                                    byeRounds = byeRoundsStr.split(',').map((r: string) => parseInt(r.trim())).filter((r: number) => !isNaN(r));
                                  }
                                }
                                
                                if (byeRounds.length === 0) {
                                  return <span className="text-gray-400">-</span>;
                                }
                                
                                const byeRoundsStr = byeRounds.join(', ');
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {byeRoundsStr}
                                  </span>
                                );
                              } catch (error) {
                                return <span className="text-gray-400">-</span>;
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setPlayerToEdit(player);
                                  setShowEditPlayer(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPlayer({ id: player.id, name: player.name });
                                  setShowInactiveRounds(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                Manage Inactive Rounds
                              </button>
                              {player.status === 'active' && (
                                <button
                                  onClick={() => handleWithdrawPlayer(player.id)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                >
                                  Withdraw
                                </button>
                              )}
                              {player.status === 'withdrawn' && (
                                <button
                                  onClick={() => handleReactivatePlayer(player.id)}
                                  className="text-green-600 hover:text-green-800 transition-colors"
                                >
                                  Reactivate
                                </button>
                              )}
                              {player.status === 'inactive' && (
                                <button
                                  onClick={() => handleActivatePlayer(player.id)}
                                  className="text-green-600 hover:text-green-800 transition-colors"
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'pairings' && (
            <div className="space-y-4">
              {/* Team Tournament Format - Show Team-Specific UI */}
              {tournament && tournament.format === 'team-tournament' ? (
                <TeamTournamentPairingManager
                  tournamentId={id || ''}
                  currentRound={currentRound}
                  pairings={state.pairings || []}
                  onRoundComplete={(nextRound) => {
                    setCurrentRound(nextRound);
                    fetchPairings(nextRound);
                  }}
                  onPairingsUpdate={(newPairings) => {
                    dispatch({ type: 'SET_PAIRINGS', payload: newPairings });
                  }}
                  onRoundChange={(round) => {
                    setCurrentRound(round);
                    fetchPairings(round);
                  }}
                  tournament={tournament}
                />
              ) : (
                <>
                  {/* Regular Tournament Format - Section-Based UI */}
                  {/* Section Selector */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <label htmlFor="pairing-section-select" className="text-sm font-medium text-gray-700">
                          Select Section:
                        </label>
                        <select
                          id="pairing-section-select"
                          value={selectedSection || ''}
                          onChange={(e) => handleSectionChange(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- Select a Section --</option>
                          {getAvailableSections().map(section => (
                            <option key={section} value={section}>
                              {section}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center space-x-2 mt-4">
                        <button
                          onClick={async () => {
                            if (!id) return;
                            const round = getCurrentRound();
                            try {
                              await tournamentApi.downloadScoreSheets(id, round);
                            } catch (error: any) {
                              alert(`Failed to download score sheets: ${error.message || 'Unknown error'}`);
                            }
                          }}
                          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Download Branded Score Sheets</span>
                        </button>
                        <button
                          onClick={handleOpenPrizeCustomization}
                          disabled={!selectedSection || isGeneratingSectionPrizes}
                          className="flex items-center space-x-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingSectionPrizes ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Award className="h-4 w-4" />
                              <span>Generate Section Prizes</span>
                            </>
                          )}
                        </button>
                        {tournament && tournament.format === 'quad' && (
                          <button
                            onClick={async () => {
                              if (!id) return;
                              const round = getCurrentRound();
                              try {
                                await tournamentApi.downloadQuadForms(id, round);
                              } catch (error: any) {
                                alert(`Failed to download quad forms: ${error.message || 'Unknown error'}`);
                              }
                            }}
                            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            <span>Download Branded Quad Forms</span>
                          </button>
                        )}
                      </div>
                      {/* Generate Round buttons - Hidden */}
                      {false && (
                      <div className="flex items-center space-x-2">
                        {selectedSection && (
                          <button
                            onClick={() => {
                              setSelectedSection('');
                            }}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                          >
                            Clear Selection
                          </button>
                        )}
                         <button
                           onClick={async () => {
                             if (!id) return;
                             if (!selectedSection) {
                               alert('Please select a section first');
                               return;
                             }
                             if (!window.confirm(`Generate pairings for ${selectedSection} section?`)) return;
                             
                             try {
                               setIsLoading(true);
                               const currentRoundNum = 1; // Always start with round 1
                               const response = await pairingApi.generateForSection(id, currentRoundNum, selectedSection);
                               
                               if (response.data.success) {
                                 alert(`Successfully generated pairings for ${selectedSection} section in Round ${currentRoundNum}`);
                                 await fetchPairings(currentRoundNum, selectedSection);
                                 await fetchStandings();
                               } else {
                                 throw new Error(response.data.message || 'Failed to generate pairings');
                               }
                             } catch (error: any) {
                               alert(`Failed to generate pairings: ${error.message}`);
                             } finally {
                               setIsLoading(false);
                             }
                           }}
                           disabled={isLoading || !selectedSection}
                           className="px-4 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors flex items-center"
                         >
                           {isLoading ? (
                             <>
                               <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                               Generating...
                             </>
                           ) : (
                             <>
                               <Users className="w-3 h-3 mr-1" />
                               Generate Round 1
                             </>
                           )}
                         </button>
                         {selectedSection && (
                           <button
                             onClick={async () => {
                               if (!id) return;
                               if (!selectedSection) {
                                 alert('Please select a section first');
                                 return;
                               }
                               const currentRoundNum = getCurrentRoundForSection(selectedSection);
                               if (!window.confirm(`Generate pairings for ${selectedSection} section Round ${currentRoundNum}?`)) return;
                               
                               try {
                                 setIsLoading(true);
                                 const response = await pairingApi.generateForSection(id, currentRoundNum, selectedSection);
                                 
                                 if (response.data.success) {
                                   alert(`Successfully generated pairings for ${selectedSection} section in Round ${currentRoundNum}`);
                                   await fetchPairings(currentRoundNum, selectedSection);
                                   await fetchStandings();
                                 } else {
                                   throw new Error(response.data.message || 'Failed to generate pairings');
                                 }
                               } catch (error: any) {
                                 alert(`Failed to generate pairings: ${error.message}`);
                               } finally {
                                 setIsLoading(false);
                               }
                             }}
                             disabled={isLoading || !selectedSection}
                             className="px-4 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors flex items-center"
                           >
                             {isLoading ? (
                               <>
                                 <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                 Generating...
                               </>
                             ) : (
                               <>
                                 <Users className="w-3 h-3 mr-1" />
                                 Generate Current Round
                               </>
                             )}
                           </button>
                         )}
                      </div>
                      )}
                    </div>
                  </div>

                  {selectedSection ? (
                    <>
                      {/* Online Game Generation - Only for online tournaments */}
                      {state.currentTournament && state.currentTournament.format === 'online' && (
                        <div className="mb-6">
                          <OnlineGameIntegration
                            tournamentId={id || ''}
                            tournamentName={state.currentTournament.name}
                            timeControl={state.currentTournament.time_control || 'G/45+15'}
                            round={getCurrentRoundForSection(selectedSection)}
                            pairings={state.pairings
                              .filter(p => p.section === selectedSection && p.round === getCurrentRoundForSection(selectedSection))
                              .map(p => ({
                                id: p.id,
                                white_player_id: p.white_player_id,
                                black_player_id: p.black_player_id,
                                white_player_name: p.white_name || '',
                                black_player_name: p.black_name || '',
                                white_player_uscf_id: p.white_uscf_id,
                                black_player_uscf_id: p.black_uscf_id
                              }))}
                            onGameCreated={(pairingId, gameUrl, links) => {
                              console.log('Game created:', pairingId, gameUrl, links);
                            }}
                          />
                        </div>
                      )}
                      
                      <SectionPairingManager
                        tournamentId={id || ''}
                        sectionName={selectedSection}
                        currentRound={getCurrentRoundForSection(selectedSection)}
                        pairings={state.pairings || []}
                        onRoundComplete={(nextRound) => {
                          setCurrentRoundForSection(selectedSection, nextRound);
                          fetchPairings(nextRound, selectedSection);
                        }}
                        onPairingsUpdate={(newPairings) => {
                          dispatch({ type: 'SET_PAIRINGS', payload: newPairings });
                        }}
                        onRoundChange={(round) => {
                          setCurrentRoundForSection(selectedSection, round);
                          fetchPairings(round, selectedSection);
                        }}
                      />
                    </>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                      <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Section Selected</h3>
                      <p className="text-gray-600 mb-4">
                        Select a section from the dropdown above to manage pairings and results.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'standings' && (
            <div>
              {/* For team tournaments, show team standings instead of individual standings */}
              {tournament?.format === 'team-tournament' ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-lg font-semibold">Team Standings</h2>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={fetchTeamStandings}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={() => setShowTiebreakers(!showTiebreakers)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          showTiebreakers 
                            ? 'bg-chess-board text-white hover:bg-chess-dark' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Trophy className="h-4 w-4" />
                        <span>Tiebreakers</span>
                      </button>
                      <button
                        onClick={() => setPrintViewTab('standings')}
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Print</span>
                      </button>
                    </div>
                  </div>
                  
                  {teamStandings && teamStandings.length > 0 ? (
                    <TeamStandingsTable
                      standings={teamStandings.map((team: any, index: number) => {
                        // Handle both team-tournament format (match_points, game_points) and team-swiss format (team_total_points)
                        const isTeamTournament = tournament?.format === 'team-tournament';
                        
                        return {
                          team_name: team?.team_name || 'Unnamed Team',
                          team_id: team?.team_id || team?.team_name || 'unnamed',
                          rank: team?.rank, // Use backend-provided rank which is already ranked within section
                          score: isTeamTournament ? (team?.match_points || 0) : (team?.team_total_points || 0),
                          team_total_points: isTeamTournament ? (team?.match_points || 0) : (team?.team_total_points || 0),
                          match_points: team?.match_points,
                          game_points: team?.game_points,
                          match_wins: team?.match_wins,
                          match_draws: team?.match_draws,
                          match_losses: team?.match_losses,
                          matches_played: team?.matches_played,
                          total_members: team?.total_members || 0,
                          counted_players: team?.counted_players || 0,
                          progressive_scores: team?.progressive_scores || [],
                          top_player_score: team?.top_player_score || 0,
                          top_2_sum: team?.top_2_sum || 0,
                          top_3_sum: team?.top_3_sum || 0,
                          players: team?.players || [],
                          section: team?.section || 'Open',
                          buchholz: team?.buchholz || 0,
                          sonneborn_berger: team?.sonneborn_berger || 0,
                          team_performance_rating: team?.team_performance_rating || 0
                        };
                      })}
                      tournamentFormat={tournament?.format || 'swiss'}
                      scoringMethod={teamScoringMethod}
                      topN={teamTopN}
                      showTiebreakers={showTiebreakers}
                      totalRounds={tournament?.rounds}
                    />
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">No team standings available</p>
                      <p className="text-sm text-gray-500">Assign players to teams to see team standings</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-lg font-semibold">Standings</h2>
                      <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      >
                        {getAvailableSections().map(section => (
                          <option key={section} value={section}>
                            {section} Section
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowTiebreakers(!showTiebreakers)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          showTiebreakers 
                            ? 'bg-chess-board text-white hover:bg-chess-dark' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Trophy className="h-4 w-4" />
                        <span>Tiebreakers</span>
                      </button>
                      <button
                        onClick={() => setPrintViewTab('standings')}
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Print</span>
                      </button>
                      <button
                        onClick={() => setShowPrizeManager(true)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Trophy className="h-4 w-4" />
                        <span>Manage Prizes</span>
                      </button>
                      <button
                        onClick={() => setShowLiveStandings(true)}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Activity className="h-4 w-4" />
                        <span>Live Standings</span>
                      </button>
                      <button
                        onClick={() => setShowPaymentManager(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Payments</span>
                      </button>
                    </div>
                  </div>

                  {!state.standings || !Array.isArray(state.standings) || state.standings.length === 0 ? (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No standings available yet</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(() => {
                        // Group standings by section
                        const standingsBySection: { [key: string]: any[] } = {};
                        state.standings.forEach((standing, index) => {
                          const section = standing.section || 'Open';
                          if (!standingsBySection[section]) {
                            standingsBySection[section] = [];
                          }
                          standingsBySection[section].push({ ...standing, originalIndex: index });
                        });

                        // Filter sections based on selected section
                        let sectionsToShow = Object.keys(standingsBySection).sort();
                        if (selectedSection && selectedSection !== '') {
                          sectionsToShow = sectionsToShow.filter(section => section === selectedSection);
                        }

                        return sectionsToShow.map(sectionName => {
                          const sectionStandings = standingsBySection[sectionName];
                          // Re-sort within section by points (descending)
                          sectionStandings.sort((a, b) => b.total_points - a.total_points);

                          return (
                            <ChessStandingsTable
                              key={sectionName}
                              standings={sectionStandings}
                              tournament={{
                                rounds: tournament?.rounds ?? 0,
                                name: tournament?.name ?? ''
                              }}
                              selectedSection={sectionName}
                              showTiebreakers={showTiebreakers}
                              showPrizes={true}
                              tournamentId={id}
                            />
                          );
                        });
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (() => {
            const sections = getAvailableSections();
            const totalPlayers = state.players?.length || 0;
            const startDateDisplay = tournament?.start_date
              ? new Date(tournament.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
              : 'Not set';
            const quickStats = [
              { key: 'players', label: 'Players', value: totalPlayers },
              { key: 'sections', label: 'Sections', value: sections.length || 0 },
              { key: 'rounds', label: 'Rounds', value: tournament?.rounds ?? '—' },
              { key: 'start', label: 'Start Date', value: startDateDisplay }
            ];

            return (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickStats.map(stat => (
                    <div key={stat.key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{stat.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Tournament Details</h3>
                      <p className="text-sm text-gray-500">Core setup for tournament staff and public viewers.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="space-y-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">Tournament Logo</h4>
                          <p className="mt-1 text-xs text-gray-500">Upload or link a logo to brand the TD and public pages.</p>
                        </div>
                        {tournament?.logo_url && (
                          <button
                            onClick={handleLogoRemove}
                            className="text-sm font-medium text-red-600 transition-colors hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white">
                          {tournament?.logo_url ? (
                            <img
                              src={tournament.logo_url}
                              alt="Tournament Logo"
                              className="h-full w-full object-contain p-2"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center text-xs text-gray-400">
                              <Upload className="mb-1 h-6 w-6" />
                              <span>No Logo</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Upload Logo</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <p className="mt-1 text-xs text-gray-500">PNG, JPG, or SVG. Recommended size: 200×60 or similar.</p>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">Or enter logo URL</label>
                          <div className="flex space-x-2">
                            <input
                              type="url"
                              value={logoUrl}
                              onChange={(e) => setLogoUrl(e.target.value)}
                              placeholder="https://example.com/logo.png"
                              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={handleLogoUrlSave}
                              disabled={!logoUrl.trim()}
                              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="xl:col-span-2 space-y-6">
                      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h4 className="text-base font-semibold text-gray-900">Basic Information</h4>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Tournament Name</label>
                            <input
                              type="text"
                              value={tournament?.name || ''}
                              onChange={(e) => handleTournamentUpdate('name', e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Time Control</label>
                            <input
                              type="text"
                              value={tournament?.time_control || ''}
                              onChange={(e) => handleTournamentUpdate('time_control', e.target.value)}
                              placeholder="G/45+15"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h4 className="text-base font-semibold text-gray-900">Location & Links</h4>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Location</label>
                            <input
                              type="text"
                              value={tournament?.location || ''}
                              onChange={(e) => handleTournamentUpdate('location', e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Website</label>
                            <input
                              type="url"
                              value={tournament?.website || ''}
                              onChange={(e) => handleTournamentUpdate('website', e.target.value)}
                              placeholder="https://example.com"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h4 className="text-base font-semibold text-gray-900">Visibility & Registration</h4>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                            <div className="pr-4">
                              <p className="text-sm font-semibold text-gray-900">Public page</p>
                              <p className="mt-1 text-xs text-gray-500">Allow players to view this tournament on the public site.</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="is_public"
                                checked={tournament?.is_public || false}
                                onChange={(e) => handleTournamentUpdate('is_public', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="is_public" className="text-sm font-medium text-gray-600">
                                {tournament?.is_public ? 'Enabled' : 'Disabled'}
                              </label>
                            </div>
                          </div>
                          <div className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                            <div className="pr-4">
                              <p className="text-sm font-semibold text-gray-900">Online registration</p>
                              <p className="mt-1 text-xs text-gray-500">Accept player registrations directly from the public page.</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="allow_registration"
                                checked={tournament?.allow_registration || false}
                                onChange={(e) => handleTournamentUpdate('allow_registration', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor="allow_registration" className="text-sm font-medium text-gray-600">
                                {tournament?.allow_registration ? 'Enabled' : 'Disabled'}
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">Public Tournament Description</h4>
                        <p className="text-sm text-gray-500">Displayed on the public tournament page.</p>
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={tournamentInfo}
                    onChange={(e) => handleTournamentInfoChange(e.target.value)}
                    rows={6}
                    placeholder="Enter tournament information that will be displayed on the public view..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-xs text-gray-500">Changes save automatically and update the public site immediately.</p>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Public View Customization</h4>
                      <p className="text-sm text-gray-500">Personalize overlays, branding, and embedded pages for spectators.</p>
                    </div>
                    <button
                      onClick={() => setShowPublicViewCustomization(true)}
                      className="inline-flex items-center space-x-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Customize Public View</span>
                    </button>
                  </div>
                  <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
                    Configure how players and spectators experience the public tournament page.
                  </div>
                </section>

                {id && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4">
                      <h4 className="text-base font-semibold text-gray-900">Custom Pages</h4>
                      <p className="text-sm text-gray-500">Add extra content such as parking info, policies, or event FAQs.</p>
                    </div>
                    <CustomPagesManager tournamentId={id} />
                  </section>
                )}

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Prize Management</h4>
                      <p className="text-sm text-gray-500">Define prize structures and keep them aligned with standings.</p>
                    </div>
                    <button
                      onClick={() => setShowPrizeManager(true)}
                      className="inline-flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Configure Prizes</span>
                    </button>
                  </div>
                  <div className="mt-4">
                    <PrizeDisplay
                      tournamentId={id || ''}
                      showPrizeSettings={true}
                      onPrizeSettingsClick={() => setShowPrizeManager(true)}
                    />
                  </div>
                </section>

                {id && tournament && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Payment Settings</h4>
                      <p className="text-sm text-gray-500">Connect payment providers and manage entry fee requirements.</p>
                    </div>
                    <PaymentSettings
                      tournamentId={id}
                      tournament={tournament}
                      onSave={async (credentials: any) => {
                        console.log('💳 Saving payment credentials directly:', credentials);
                        try {
                          const response = await tournamentApi.update(id, credentials);
                          console.log('Update response:', response.data);
                          if (response.data.success) {
                            dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: response.data.data });
                            console.log('✅ Payment credentials saved successfully');
                          }
                        } catch (error: any) {
                          console.error('Failed to save payment credentials:', error);
                          alert(`Failed to save payment credentials: ${error.message || error}`);
                        }
                      }}
                    />
                  </section>
                )}

                {id && tournament && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Registration Settings</h4>
                      <p className="text-sm text-gray-500">Customize required fields, payments, and workflows for sign-ups.</p>
                    </div>
                    <RegistrationSettings
                      tournamentId={id}
                      tournament={tournament}
                      onSave={async (settingsData: any) => {
                        console.log('💾 Saving registration form settings data:', settingsData);
                        console.log('💾 Registration settings (stringified):', JSON.stringify(settingsData.registration_settings));

                        try {
                          const response = await tournamentApi.update(id, {
                            registration_settings: settingsData.registration_settings,
                            require_payment: settingsData.require_payment,
                            payment_method: settingsData.payment_method,
                            entry_fee: settingsData.entry_fee
                          } as any);
                          console.log('✅ Registration settings saved successfully:', response.data);
                          if (response.data.success) {
                            dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: response.data.data });
                            console.log('✅ Registration settings saved and state updated');
                          }
                        } catch (error: any) {
                          console.error('Failed to save registration settings:', error);
                          alert(`Failed to save registration settings: ${error.message || error}`);
                        }
                      }}
                    />
                  </section>
                )}

                {id && tournament && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">SMS Settings</h4>
                      <p className="text-sm text-gray-500">Configure SMS notifications so players get timely updates.</p>
                    </div>
                    <SMSSettings
                      tournamentId={id}
                      tournament={tournament}
                      onSave={async (settingsData: any) => {
                        console.log('💾 Saving SMS settings:', settingsData);

                        try {
                          const response = await tournamentApi.update(id, {
                            ...settingsData,
                            name: tournament.name || '',
                            format: tournament.format || 'swiss',
                            rounds: tournament.rounds || 5
                          } as any);
                          console.log('Update response:', response.data);
                          if (response.data.success) {
                            dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: response.data.data });
                            console.log('✅ SMS settings saved successfully');
                          }
                        } catch (error: any) {
                          console.error('Failed to save SMS settings:', error);
                          alert(`Failed to save SMS settings: ${error.message || error}`);
                        }
                      }}
                    />
                  </section>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleSettingsSave}
                    disabled={saving}
                    className="flex items-center space-x-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {saving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}

          {activeTab === 'club-ratings' && tournament?.organization_id && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Club Ratings</h2>
              <p className="text-gray-600 mb-6">
                Generate and view club ratings based on tournament results. Ratings are automatically calculated from completed games.
              </p>
              <ClubRatingsManager organizationId={tournament.organization_id} />
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Prize Management</h2>
                    <p className="text-sm text-gray-600">
                      Configure and view prize distributions for this tournament.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowPrizeManager(true)}
                      className="inline-flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Configure Prizes</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <PrizeDisplay
                  tournamentId={id!}
                  showPrizeSettings={true}
                  onPrizeSettingsClick={() => setShowPrizeManager(true)}
                />
              </div>
            </div>
          )}

          {activeTab === 'team-standings' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-900">Team Standings</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={fetchTeamStandings}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={() => setShowTiebreakers(!showTiebreakers)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        showTiebreakers 
                          ? 'bg-chess-board text-white hover:bg-chess-dark' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Trophy className="h-4 w-4" />
                      <span>Tiebreakers</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {teamStandings && teamStandings.length > 0 ? (
                <TeamStandingsTable
                  standings={teamStandings.map((team: any, index: number) => {
                    // Handle both team-tournament format (match_points, game_points) and team-swiss format (team_total_points)
                    const isTeamTournament = tournament?.format === 'team-tournament';
                    
                    return {
                      team_name: team?.team_name || 'Unnamed Team',
                      team_id: team?.team_id || team?.team_name || 'unnamed',
                      rank: team?.rank, // Use backend-provided rank which is already ranked within section
                      score: isTeamTournament ? (team?.match_points || 0) : (team?.team_total_points || 0),
                      team_total_points: isTeamTournament ? (team?.match_points || 0) : (team?.team_total_points || 0),
                      match_points: team?.match_points,
                      game_points: team?.game_points,
                      match_wins: team?.match_wins,
                      match_draws: team?.match_draws,
                      match_losses: team?.match_losses,
                      matches_played: team?.matches_played,
                      total_members: team?.total_members || 0,
                      counted_players: team?.counted_players || 0,
                      progressive_scores: team?.progressive_scores || [],
                      top_player_score: team?.top_player_score || 0,
                      top_2_sum: team?.top_2_sum || 0,
                      top_3_sum: team?.top_3_sum || 0,
                      players: team?.players || [],
                      section: team?.section || 'Open',
                      buchholz: team?.buchholz || 0,
                      sonneborn_berger: team?.sonneborn_berger || 0,
                      team_performance_rating: team?.team_performance_rating || 0
                    };
                  })}
                  tournamentFormat={(() => {
                    const format = tournament?.format;
                    if (format === 'online-rated') return 'online';
                    return format || 'swiss';
                  })()}
                  scoringMethod={teamScoringMethod}
                  topN={teamTopN}
                  showTiebreakers={showTiebreakers}
                  totalRounds={tournament?.rounds}
                />
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Team pairings are not available for Swiss or Online tournaments</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'team-pairings' && tournament && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold">Team Pairings</h2>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Round:</label>
                    <select
                      value={currentRound}
                      onChange={(e) => setCurrentRound(parseInt(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                        <option key={round} value={round}>Round {round}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {/* Print functionality moved to Print tab */}}
                    className="flex items-center space-x-2 bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed opacity-60"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
              
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Team pairings are not available for Swiss or Online tournaments</p>
              </div>
            </div>
          )}




          {activeTab === 'registrations' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <RegistrationManagement tournamentId={id || ''} />
            </div>
          )}

          {activeTab === 'print' && (
            <div className="space-y-6">
              <div className="no-print rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setPrintViewTab('pairings')}
                      className={`px-4 py-2 border rounded ${
                        printViewTab === 'pairings' 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Pairings
                    </button>
                    <button
                      onClick={() => setPrintViewTab('standings')}
                      className={`px-4 py-2 border rounded ${
                        printViewTab === 'standings' 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Standings
                    </button>
                    {printViewTab === 'pairings' && (
                      <div className="ml-4 flex items-center space-x-2 border-l pl-4">
                        <span className="text-sm font-medium text-gray-700">View:</span>
                        <button
                          onClick={() => setPairingsViewMode('player')}
                          className={`px-3 py-1 text-sm border rounded ${
                            pairingsViewMode === 'player' 
                              ? 'bg-green-600 text-white border-green-600' 
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          By Player
                        </button>
                        <button
                          onClick={() => setPairingsViewMode('board')}
                          className={`px-3 py-1 text-sm border rounded ${
                            pairingsViewMode === 'board' 
                              ? 'bg-green-600 text-white border-green-600' 
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          By Board
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-4 mb-4">
                  <label className="text-sm font-medium text-gray-700">Select Section:</label>
                  <select
                    value={selectedSection || ''}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                  >
                    <option value="">-- All Sections --</option>
                    {getAvailableSections().map(section => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                    {printViewTab === 'pairings' && (
                    <>
                      <label className="text-sm font-medium text-gray-700">Round:</label>
                      <select
                        value={currentRound}
                        onChange={(e) => handleRoundChange(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: tournament?.rounds || 1 }, (_, i) => i + 1).map(round => (
                          <option key={round} value={round}>Round {round}</option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          if (!id) return;
                          try {
                            await tournamentApi.downloadScoreSheets(id, currentRound);
                          } catch (error: any) {
                            alert(`Failed to download score sheets: ${error.message || 'Unknown error'}`);
                          }
                        }}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Download Branded Score Sheets</span>
                      </button>
                      {tournament && tournament.format === 'quad' && (
                        <button
                          onClick={async () => {
                            if (!id) return;
                            try {
                              await tournamentApi.downloadQuadForms(id, currentRound);
                            } catch (error: any) {
                              alert(`Failed to download quad forms: ${error.message || 'Unknown error'}`);
                            }
                          }}
                          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Download Branded Quad Forms</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Print-friendly Pairings View */}
              {printViewTab === 'pairings' && tournament && (
                <div className="print-view bg-white p-8">
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-center mb-2">{tournament.name}</h1>
                    <h2 className="text-lg font-semibold text-center text-gray-700 mb-4">
                      Round {currentRound} Pairings
                    </h2>
                  </div>

                  {selectedSection ? (
                    // Single section view
                    state.pairings.filter(p => p.section === selectedSection && p.round === currentRound).length > 0 && (
                      <div className="mb-8">
                        <h3 className="font-semibold text-lg mb-4 uppercase border-b-2 border-gray-300 pb-2">
                          {selectedSection} Section
                        </h3>
                        {pairingsViewMode === 'player' ? (
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b-2 border-gray-800">
                                <th className="text-left py-2 px-4 font-semibold">Player</th>
                                <th className="text-center py-2 px-4 font-semibold">Color/Board</th>
                                <th className="text-left py-2 px-4 font-semibold">Opponent</th>
                              </tr>
                            </thead>
                            <tbody>
                              {state.pairings
                                .filter(p => p.section === selectedSection && p.round === currentRound)
                                .sort((a, b) => {
                                  const aWhite = state.players.find(p => p.id === a.white_player_id);
                                  const aBlack = state.players.find(p => p.id === a.black_player_id);
                                  const bWhite = state.players.find(p => p.id === b.white_player_id);
                                  const bBlack = state.players.find(p => p.id === b.black_player_id);
                                  const aNames = [
                                    (aWhite as any)?.name || '',
                                    (aBlack as any)?.name || ''
                                  ].filter(n => n).sort();
                                  const bNames = [
                                    (bWhite as any)?.name || '',
                                    (bBlack as any)?.name || ''
                                  ].filter(n => n).sort();
                                  return (aNames[0] || '').localeCompare(bNames[0] || '');
                                })
                                .map((pairing: any, idx: number) => {
                                const whitePlayer = state.players.find(p => p.id === pairing.white_player_id);
                                const blackPlayer = state.players.find(p => p.id === pairing.black_player_id);
                                const whiteTeam = (whitePlayer as any)?.team || '';
                                const blackTeam = (blackPlayer as any)?.team || '';
                                return (
                                  <React.Fragment key={pairing.id || idx}>
                                    <tr className="border-b border-gray-300">
                                      <td className="py-2 px-4">
                                        <div className="font-semibold">
                                          {whitePlayer?.name || 'TBD'}
                                          {whiteTeam && ` (${whiteTeam})`}
                                        </div>
                                      </td>
                                      <td className="py-2 px-4 text-center font-semibold">
                                        {pairing.is_bye ? '-' : `W ${pairing.board || idx + 1}`}
                                      </td>
                                      <td className="py-2 px-4">
                                        {blackPlayer && blackPlayer.name && blackPlayer.name !== 'TBD' ? (
                                          <div className="text-xs">
                                            {blackPlayer.name}
                                            {blackTeam && ` (${blackTeam})`}, ({(blackPlayer as any).total_points || 0}.0, {blackTeam || 'N/A'}, {blackPlayer.rating || 'nnnn'})
                                          </div>
                                        ) : (
                                          <span className="text-gray-500 italic">Please Wait</span>
                                        )}
                                      </td>
                                    </tr>
                                    {blackPlayer && blackPlayer.name && blackPlayer.name !== 'TBD' && !pairing.is_bye && (
                                      <tr className="border-b border-gray-300">
                                        <td className="py-2 px-4">
                                          <div className="font-semibold">
                                            {blackPlayer.name}
                                            {blackTeam && ` (${blackTeam})`}
                                          </div>
                                        </td>
                                        <td className="py-2 px-4 text-center font-semibold">
                                          B {pairing.board || idx + 1}
                                        </td>
                                        <td className="py-2 px-4">
                                          <div className="text-xs">
                                            {whitePlayer?.name}
                                            {whiteTeam && ` (${whiteTeam})`}, ({(whitePlayer as any)?.total_points || 0}.0, {whiteTeam || 'N/A'}, {whitePlayer?.rating || 'nnnn'})
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="border-b-2 border-gray-800">
                                <th className="text-center py-2 px-4 font-semibold">Board</th>
                                <th className="text-left py-2 px-4 font-semibold">White</th>
                                <th className="text-left py-2 px-4 font-semibold">Black</th>
                              </tr>
                            </thead>
                            <tbody>
                              {state.pairings
                                .filter(p => p.section === selectedSection && p.round === currentRound)
                                .sort((a, b) => (a.board || 0) - (b.board || 0))
                                .map((pairing: any) => {
                                const whitePlayer = state.players.find(p => p.id === pairing.white_player_id);
                                const blackPlayer = state.players.find(p => p.id === pairing.black_player_id);
                                const whiteTeam = (whitePlayer as any)?.team || '';
                                const blackTeam = (blackPlayer as any)?.team || '';
                                return (
                                  <tr key={pairing.id} className="border-b border-gray-300">
                                    <td className="py-2 px-4 text-center font-semibold">
                                      {pairing.board || '-'}
                                    </td>
                                    <td className="py-2 px-4">
                                      <div className="font-semibold">
                                        {whitePlayer?.name || 'TBD'}
                                        {whiteTeam && ` (${whiteTeam})`}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {(whitePlayer as any)?.total_points || 0}.0 pts, Rating: {whitePlayer?.rating || 'N/A'}
                                      </div>
                                    </td>
                                    <td className="py-2 px-4">
                                      {blackPlayer && blackPlayer.name && blackPlayer.name !== 'TBD' ? (
                                        <>
                                          <div className="font-semibold">
                                            {blackPlayer.name}
                                            {blackTeam && ` (${blackTeam})`}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {(blackPlayer as any).total_points || 0}.0 pts, Rating: {blackPlayer.rating || 'N/A'}
                                          </div>
                                        </>
                                      ) : (
                                        <span className="text-gray-500 italic">Please Wait</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )
                  ) : (
                    // All sections view
                    (() => {
                      const allSections = state.pairings
                        .filter(p => p.round === currentRound)
                        .map(p => p.section)
                        .filter(s => s !== null && s !== undefined) as string[];
                      const sections = Array.from(new Set(allSections));
                      return sections.map(section => {
                        const sectionPairings = state.pairings.filter(p => p.section === section && p.round === currentRound);
                        if (sectionPairings.length === 0) return null;
                        
                        return (
                          <div key={section} className="mb-8 page-break-inside-avoid">
                            <h3 className="font-semibold text-lg mb-4 uppercase border-b-2 border-gray-300 pb-2">
                              {section} Section
                            </h3>
                            {pairingsViewMode === 'player' ? (
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="border-b-2 border-gray-800">
                                    <th className="text-left py-2 px-4 font-semibold">Player</th>
                                    <th className="text-center py-2 px-4 font-semibold">Color/Board</th>
                                    <th className="text-left py-2 px-4 font-semibold">Opponent</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sectionPairings
                                    .sort((a, b) => {
                                      const aWhite = state.players.find(p => p.id === a.white_player_id);
                                      const aBlack = state.players.find(p => p.id === a.black_player_id);
                                      const bWhite = state.players.find(p => p.id === b.white_player_id);
                                      const bBlack = state.players.find(p => p.id === b.black_player_id);
                                      const aNames = [
                                        (aWhite as any)?.name || '',
                                        (aBlack as any)?.name || ''
                                      ].filter(n => n).sort();
                                      const bNames = [
                                        (bWhite as any)?.name || '',
                                        (bBlack as any)?.name || ''
                                      ].filter(n => n).sort();
                                      return (aNames[0] || '').localeCompare(bNames[0] || '');
                                    })
                                    .map((pairing: any, idx: number) => {
                                    const whitePlayer = state.players.find(p => p.id === pairing.white_player_id);
                                    const blackPlayer = state.players.find(p => p.id === pairing.black_player_id);
                                    const whiteTeam = (whitePlayer as any)?.team || '';
                                    const blackTeam = (blackPlayer as any)?.team || '';
                                    return (
                                      <React.Fragment key={pairing.id || idx}>
                                        <tr className="border-b border-gray-300">
                                          <td className="py-2 px-4">
                                            <div className="font-semibold">
                                              {whitePlayer?.name || 'TBD'}
                                              {whiteTeam && ` (${whiteTeam})`}
                                            </div>
                                          </td>
                                          <td className="py-2 px-4 text-center font-semibold">
                                            W {pairing.board || idx + 1}
                                          </td>
                                          <td className="py-2 px-4">
                                            {blackPlayer && blackPlayer.name && blackPlayer.name !== 'TBD' ? (
                                              <div className="text-xs">
                                                {blackPlayer.name}
                                                {blackTeam && ` (${blackTeam})`}, ({(blackPlayer as any).total_points || 0}.0, {blackTeam || 'N/A'}, {blackPlayer.rating || 'nnnn'})
                                              </div>
                                            ) : (
                                              <span className="text-gray-500 italic">Please Wait</span>
                                            )}
                                          </td>
                                        </tr>
                                        {blackPlayer && blackPlayer.name && blackPlayer.name !== 'TBD' && !pairing.is_bye && (
                                          <tr className="border-b border-gray-300">
                                            <td className="py-2 px-4">
                                              <div className="font-semibold">
                                                {blackPlayer.name}
                                                {blackTeam && ` (${blackTeam})`}
                                              </div>
                                            </td>
                                            <td className="py-2 px-4 text-center font-semibold">
                                              B {pairing.board || idx + 1}
                                            </td>
                                            <td className="py-2 px-4">
                                              <div className="text-xs">
                                                {whitePlayer?.name}
                                                {whiteTeam && ` (${whiteTeam})`}, ({(whitePlayer as any)?.total_points || 0}.0, {whiteTeam || 'N/A'}, {whitePlayer?.rating || 'nnnn'})
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : (
                              <table className="w-full border-collapse text-sm">
                                <thead>
                                  <tr className="border-b-2 border-gray-800">
                                    <th className="text-center py-2 px-4 font-semibold">Board</th>
                                    <th className="text-left py-2 px-4 font-semibold">White</th>
                                    <th className="text-left py-2 px-4 font-semibold">Black</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sectionPairings
                                    .sort((a, b) => (a.board || 0) - (b.board || 0))
                                    .map((pairing: any) => {
                                    const whitePlayer = state.players.find(p => p.id === pairing.white_player_id);
                                    const blackPlayer = state.players.find(p => p.id === pairing.black_player_id);
                                    const whiteTeam = (whitePlayer as any)?.team || '';
                                    const blackTeam = (blackPlayer as any)?.team || '';
                                    return (
                                      <tr key={pairing.id} className="border-b border-gray-300">
                                        <td className="py-2 px-4 text-center font-semibold">
                                          {pairing.board || '-'}
                                        </td>
                                        <td className="py-2 px-4">
                                          <div className="font-semibold">
                                            {whitePlayer?.name || 'TBD'}
                                            {whiteTeam && ` (${whiteTeam})`}
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {(whitePlayer as any)?.total_points || 0}.0 pts, Rating: {whitePlayer?.rating || 'N/A'}
                                          </div>
                                        </td>
                                        <td className="py-2 px-4">
                                          {blackPlayer && blackPlayer.name && blackPlayer.name !== 'TBD' ? (
                                            <>
                                              <div className="font-semibold">
                                                {blackPlayer.name}
                                                {blackTeam && ` (${blackTeam})`}
                                              </div>
                                              <div className="text-xs text-gray-600">
                                                {(blackPlayer as any).total_points || 0}.0 pts, Rating: {blackPlayer.rating || 'N/A'}
                                              </div>
                                            </>
                                          ) : (
                                            <span className="text-gray-500 italic">Please Wait</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              )}

              {/* Print-friendly Standings View */}
              {printViewTab === 'standings' && tournament && (
                <div className="print-view bg-white p-8">
                  <div className="mb-6">
                    <h1 className="text-xl font-bold text-center mb-2">{tournament.name}</h1>
                    <h2 className="text-lg font-semibold text-center text-gray-700 mb-4">
                      Tournament Standings
                    </h2>
                  </div>

                  {selectedSection ? (
                    // Single section view
                    state.standings.filter((s: any) => s.section === selectedSection).length > 0 && (
                      <div className="mb-8">
                        <h3 className="font-semibold text-lg mb-4 uppercase border-b-2 border-gray-300 pb-2">
                          {selectedSection} Section ({state.standings.filter((s: any) => s.section === selectedSection).length} players)
                        </h3>
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-gray-800 font-bold">
                              <th className="text-left py-2 px-2">No.</th>
                              <th className="text-left py-2 px-2">Name</th>
                              <th className="text-left py-2 px-2">Team</th>
                              <th className="text-left py-2 px-2">Rate</th>
                              <th className="text-left py-2 px-2">Pts</th>
                              <th className="text-left py-2 px-2">Ty</th>
                              {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                                <th key={round} className="text-center py-2 px-2">Rnd{round}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {state.standings
                              .filter((s: any) => s.section === selectedSection)
                              .sort((a: any, b: any) => (b.total_points || 0) - (a.total_points || 0))
                              .map((player: any, idx: number) => (
                                <tr key={player.id} className="border-b border-gray-300">
                                  <td className="py-2 px-2">{idx + 1}.</td>
                                  <td className="py-2 px-2 font-semibold">{player.name}</td>
                                  <td className="py-2 px-2">{player.team || '-'}</td>
                                  <td className="py-2 px-2">{player.rating || '-'}</td>
                                  <td className="py-2 px-2 font-bold">{player.total_points || 0}</td>
                                  <td className="py-2 px-2">-</td>
                                  {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                                    <td key={round} className="text-center py-2 px-2">
                                      {getRoundResultForPrint(player, round, state.standings.filter((s: any) => s.section === selectedSection))}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    // All sections view
                    (() => {
                      const allSections = state.standings
                        .map((s: any) => s.section)
                        .filter(s => s !== null && s !== undefined) as string[];
                      const sections = Array.from(new Set(allSections));
                      return sections.map(section => {
                        const sectionPlayers = state.standings.filter((s: any) => s.section === section);
                        if (sectionPlayers.length === 0) return null;
                        
                        return (
                          <div key={section} className="mb-8 page-break-inside-avoid">
                            <h3 className="font-semibold text-lg mb-4 uppercase border-b-2 border-gray-300 pb-2">
                              {section} Section ({sectionPlayers.length} players)
                            </h3>
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-gray-800 font-bold">
                                  <th className="text-left py-2 px-2">No.</th>
                                  <th className="text-left py-2 px-2">Name</th>
                                  <th className="text-left py-2 px-2">Team</th>
                                  <th className="text-left py-2 px-2">Rate</th>
                                  <th className="text-left py-2 px-2">Pts</th>
                                  <th className="text-left py-2 px-2">Ty</th>
                                  {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                                    <th key={round} className="text-center py-2 px-2">Rnd{round}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sectionPlayers
                                  .sort((a: any, b: any) => (b.total_points || 0) - (a.total_points || 0))
                                  .map((player: any, idx: number) => (
                                    <tr key={player.id} className="border-b border-gray-300">
                                      <td className="py-2 px-2">{idx + 1}.</td>
                                      <td className="py-2 px-2 font-semibold">{player.name}</td>
                                      <td className="py-2 px-2">{player.team || '-'}</td>
                                      <td className="py-2 px-2">{player.rating || '-'}</td>
                                      <td className="py-2 px-2 font-bold">{player.total_points || 0}</td>
                                      <td className="py-2 px-2">-</td>
                                      {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
                                        <td key={round} className="text-center py-2 px-2">
                                          {getRoundResultForPrint(player, round, sectionPlayers)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* All modals and dialogs go here, outside the max-w-7xl container */}
      {/* Add Player Modal */}
      {showTeamTournamentManagement && id && tournament && ['team-swiss', 'team-round-robin', 'team-tournament'].includes(tournament.format) && (
        <TeamTournamentManagement
          tournamentId={id}
          isVisible={showTeamTournamentManagement}
          onClose={() => setShowTeamTournamentManagement(false)}
          players={state.players}
          onTeamsUpdated={() => {
            console.log('Teams updated, refreshing...');
            fetchPlayers();
            fetchTeams();
            fetchTeamStandings();
            fetchTeamPairings();
          }}
        />
      )}

      <AddPlayerModal
        isOpen={showAddPlayer}
        onClose={() => setShowAddPlayer(false)}
        tournamentId={id || ''}
      />

      {/* Bulk Add Players Modal */}
      <BulkPlayerAddModal
        isOpen={showBulkAddPlayer}
        onClose={() => setShowBulkAddPlayer(false)}
        tournamentId={id || ''}
      />

      {/* Batch Operations Modal */}
      <BatchOperationsModal
        isOpen={showBatchOperations}
        onClose={() => setShowBatchOperations(false)}
        selectedPlayers={selectedPlayers}
        onPlayersUpdated={() => {
          // Refresh players data
          fetchTournament();
        }}
      />

      {/* CSV Import Modal */}
      <FileImportModal
        isOpen={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        tournamentId={id || ''}
      />

      {/* Google Import Modal */}
      <GoogleImportModal
        isOpen={showGoogleImport}
        onClose={() => setShowGoogleImport(false)}
        tournamentId={id || ''}
      />

      {/* Google Forms Connector Modal */}
      <GoogleFormsConnector
        isOpen={showGoogleFormsConnector}
        onClose={() => setShowGoogleFormsConnector(false)}
        tournamentId={id || ''}
        tournamentName={tournament?.name || 'Tournament'}
      />

      {/* Unified Import Modal */}
      <UnifiedImportModal
        isOpen={showUnifiedImport}
        onClose={() => setShowUnifiedImport(false)}
        tournamentId={id || ''}
      />

      {/* DBF Export Modal */}
      <DBFExportModal
        isOpen={showDBFExport}
        onClose={() => setShowDBFExport(false)}
        tournamentId={id || ''}
        tournamentName={tournament?.name || ''}
      />

      {/* Import Club Members Modal */}
      {tournament?.organization_id && (
        <ImportClubMembersModal
          isOpen={showImportClubMembers}
          onClose={() => setShowImportClubMembers(false)}
          tournamentId={id || ''}
          organizationId={tournament.organization_id}
          onImportComplete={() => {
            fetchPlayers();
            fetchStandings();
          }}
        />
      )}

      {/* Player Inactive Rounds Modal */}
      {selectedPlayer && (
        <PlayerInactiveRoundsModal
          isOpen={showInactiveRounds}
          onClose={() => {
            setShowInactiveRounds(false);
            setSelectedPlayer(null);
          }}
          playerId={selectedPlayer?.id || ''}
          playerName={selectedPlayer?.name || ''}
          tournamentId={id || ''}
          maxRounds={tournament?.rounds || 1}
        />
      )}



      {/* Print View Modal - Replaced by Print Tab */}
      {/* Old print modal removed - use Print tab instead */}

      {/* Team Standings Modal */}
      <TeamStandings
        tournamentId={id || ''}
        isVisible={showTeamStandings}
        onClose={() => setShowTeamStandings(false)}
      />

      {/* Edit Player Modal */}
      <EditPlayerModal
        isOpen={showEditPlayer}
        onClose={async () => {
          setShowEditPlayer(false);
          setPlayerToEdit(null);
          // Refresh players after closing the modal
          if (id) {
            await fetchPlayers();
          }
        }}
        player={playerToEdit}
        tournamentId={id || ''}
      />

      {/* Bye Management Modal */}
      <ByeManagementModal
        isOpen={showByeManagement}
        onClose={() => setShowByeManagement(false)}
        tournamentId={id || ''}
      />

      {/* API Documentation Modal */}
      <APIDocumentationModal
        isOpen={showAPIDocs}
        onClose={() => setShowAPIDocs(false)}
        tournamentId={id || ''}
        tournamentName={state.currentTournament?.name || 'Tournament'}
        apiKey="ctk_f5de4f4cf423a194d00c078baa10e7a153fcca3e229ee7aadfdd72fec76cdd94"
      />

      {/* Delete Duplicates Confirmation Modal */}
      {showDeleteDuplicates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Duplicate Players</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                This will permanently delete duplicate players from the tournament. Choose the criteria for identifying duplicates:
              </p>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duplicateCriteria"
                    value="name"
                    checked={deleteDuplicatesCriteria === 'name'}
                    onChange={(e) => setDeleteDuplicatesCriteria(e.target.value as 'name' | 'uscf_id' | 'both')}
                    className="mr-2"
                  />
                  <span className="text-sm">By name (case-insensitive)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duplicateCriteria"
                    value="uscf_id"
                    checked={deleteDuplicatesCriteria === 'uscf_id'}
                    onChange={(e) => setDeleteDuplicatesCriteria(e.target.value as 'name' | 'uscf_id' | 'both')}
                    className="mr-2"
                  />
                  <span className="text-sm">By USCF ID</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duplicateCriteria"
                    value="both"
                    checked={deleteDuplicatesCriteria === 'both'}
                    onChange={(e) => setDeleteDuplicatesCriteria(e.target.value as 'name' | 'uscf_id' | 'both')}
                    className="mr-2"
                  />
                  <span className="text-sm">By both name and USCF ID</span>
                </label>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This action cannot be undone. The oldest player (by creation date) will be kept, and all duplicates will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDuplicates(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDuplicates}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Duplicates
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrizeCustomization && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4"
          onClick={() => {
            if (!isGeneratingSectionPrizes) {
              setShowPrizeCustomization(false);
            }
          }}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Customize Section Prizes</h3>
                {selectedSection && (
                  <p className="text-sm text-gray-500">
                    Section: <span className="font-medium text-gray-700">{selectedSection}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => !isGeneratingSectionPrizes && setShowPrizeCustomization(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                disabled={isGeneratingSectionPrizes}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Configure which prizes should be awarded for this section. Adjust titles, positions, award types, and optional cash amounts before assigning them to players.
              </p>

              {prizeCustomizationError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {prizeCustomizationError}
                </div>
              )}

              <div className="space-y-4">
                {prizeDraft.map((prize, index) => (
                  <div
                    key={`${index}-${prize.position}`}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid w-full gap-3 md:grid-cols-12">
                        <div className="md:col-span-5">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Prize Name
                          </label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={prize.name}
                            onChange={(e) => handlePrizeDraftChange(index, 'name', e.target.value)}
                            placeholder="e.g., Champion"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Position
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={prize.position}
                            onChange={(e) => handlePrizeDraftChange(index, 'position', e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Award Type
                          </label>
                          <select
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={prize.type}
                            onChange={(e) => handlePrizeDraftChange(index, 'type', e.target.value)}
                          >
                            <option value="trophy">Trophy</option>
                            <option value="medal">Medal</option>
                            <option value="cash">Cash</option>
                            <option value="recognition">Recognition</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Amount
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            disabled={prize.type !== 'cash'}
                            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              prize.type === 'cash'
                                ? 'border-gray-300 text-gray-900'
                                : 'border-gray-200 bg-gray-100 text-gray-400'
                            }`}
                            value={prize.amount ?? ''}
                            onChange={(e) => handlePrizeDraftChange(index, 'amount', e.target.value)}
                            placeholder={prize.type === 'cash' ? 'Amount' : 'N/A'}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemovePrizeRow(index)}
                        className="mt-2 rounded-lg border border-transparent p-2 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        title="Remove prize"
                        type="button"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddPrizeRow}
                className="inline-flex items-center space-x-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-blue-500 hover:text-blue-600"
                type="button"
              >
                <Plus className="h-4 w-4" />
                <span>Add Prize</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <div className="text-xs text-gray-500">
                Awards will be assigned automatically to the highest-ranked players in this section based on current standings.
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => !isGeneratingSectionPrizes && setShowPrizeCustomization(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  disabled={isGeneratingSectionPrizes}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSectionPrizes}
                  disabled={isGeneratingSectionPrizes}
                  className="inline-flex items-center space-x-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                >
                  {isGeneratingSectionPrizes ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4" />
                      <span>Assign Prizes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prize Manager Drawer */}
      <PrizeManagerDrawer
        open={showPrizeManager}
        onClose={() => setShowPrizeManager(false)}
        tournamentId={id || ''}
        currentSettings={prizeSettings}
        onUpdate={(settings) => {
          setPrizeSettings(settings);
        }}
      />

      {/* New Feature Modals */}
      <SMSManager
        isOpen={showSMSManager}
        onClose={() => setShowSMSManager(false)}
        tournamentId={id || ''}
      />

      <QRCodeGenerator
        isOpen={showQRCodeGenerator}
        onClose={() => setShowQRCodeGenerator(false)}
        tournamentId={id || ''}
      />

      <PlayerProfile
        isOpen={showPlayerProfile}
        onClose={() => setShowPlayerProfile(false)}
        playerId={state.players?.[0]?.id || ''}
      />

      <LiveStandings
        isOpen={showLiveStandings}
        onClose={() => setShowLiveStandings(false)}
        tournamentId={id || ''}
      />

      <PaymentManager
        isOpen={showPaymentManager}
        onClose={() => setShowPaymentManager(false)}
        tournamentId={id || ''}
      />

      {showAPIRegistrationModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowAPIRegistrationModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">API Integration & Registration</h3>
              <button
                onClick={() => setShowAPIRegistrationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Tournament Information</h4>
                <p className="text-sm text-gray-600">
                  Tournament ID:{' '}
                  <code className="bg-gray-200 px-2 py-1 rounded">{id ?? 'Unknown'}</code>
                </p>
                <p className="text-sm text-gray-600">
                  Tournament Name: {tournament?.name || 'Loading...'}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bulk Import API:
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={apiIntegrationUrls.apiUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => handleCopyToClipboard(apiIntegrationUrls.apiUrl)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm transition"
                      type="button"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Single Registration API:
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={apiIntegrationUrls.registerUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => handleCopyToClipboard(apiIntegrationUrls.registerUrl)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm transition"
                      type="button"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Form URL:
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={apiIntegrationUrls.registrationFormUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => handleCopyToClipboard(apiIntegrationUrls.registrationFormUrl)}
                    className="px-3 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 text-sm transition"
                    type="button"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleOpenInNewTab(apiIntegrationUrls.registrationFormUrl)}
                    className="px-3 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 text-sm transition ml-1"
                    type="button"
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPWAStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">PWA Status</h2>
              <button
                onClick={() => setShowPWAStatus(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <PWAStatus showDetails={true} />
          </div>
        </div>
      )}

      <AnalyticsDashboard
        isOpen={showAnalyticsDashboard}
        onClose={() => setShowAnalyticsDashboard(false)}
        tournamentId={id || ''}
      />

      <ChessPlatformIntegration
        isOpen={showChessIntegration}
        onClose={() => setShowChessIntegration(false)}
        tournamentId={id || ''}
      />

      {/* Lichess Integration - Only for online tournaments */}
      {activeTab === 'overview' && state.currentTournament && state.currentTournament.format === 'online' && (
        <div className="mt-6">
          <LichessIntegration
            tournamentId={id || ''}
            tournamentName={state.currentTournament.name}
            timeControl={state.currentTournament.time_control || 'G/45+15'}
            rounds={state.currentTournament.rounds}
            players={state.players || []}
            onGamesCreated={(games) => {
              console.log('Lichess games created:', games);
              // Refresh pairings or show success message
            }}
          />
        </div>
      )}

      {/* Public View Customization Modal */}
      {showPublicViewCustomization && tournament && (
        <PublicViewCustomization
          tournament={tournament}
          onSave={async (config) => {
            try {
              await handleTournamentUpdate('public_display_config', config.public_display_config);
              setShowPublicViewCustomization(false);
            } catch (error) {
              console.error('Failed to save configuration:', error);
            }
          }}
          onClose={() => setShowPublicViewCustomization(false)}
        />
      )}

      {/* Section Manager Modal */}
      {showSectionManager && tournament && id && (
        <SectionsModal
          isOpen={showSectionManager}
          onClose={() => setShowSectionManager(false)}
          tournamentId={id}
          players={state.players}
          onUpdatePlayer={async (playerId: string, updates: Partial<any>) => {
            try {
              await playerApi.update(playerId, updates);
              await fetchPlayers();
            } catch (error) {
              console.error('Failed to update player:', error);
              throw error;
            }
          }}
          tournamentSettings={tournament.settings}
          onUpdateTournamentSettings={async (settings: any) => {
            try {
              // Include required fields (name, format, rounds) along with settings
              await tournamentApi.update(id, {
                settings,
                name: tournament.name || '',
                format: tournament.format || 'swiss',
                rounds: tournament.rounds || 5
              });
              await fetchTournament();
            } catch (error) {
              console.error('Failed to update tournament settings:', error);
              throw error;
            }
          }}
        />
      )}

    </div>
  );
};

export default TournamentDetail;
