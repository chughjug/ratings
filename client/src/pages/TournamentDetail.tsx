import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Trophy, Calendar, Clock, CheckCircle, Upload, Settings, ExternalLink, Download, RefreshCw, FileText, Printer, X, DollarSign, RotateCcw, Code, Trash2, ChevronUp, ChevronDown, ChevronRight, LinkIcon, MessageSquare, QrCode, BarChart3, User, Activity, CreditCard, Smartphone, Gamepad2, Save } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { tournamentApi, playerApi, pairingApi } from '../services/api';
import { getSectionOptions } from '../utils/sectionUtils';
import AddPlayerModal from '../components/AddPlayerModal';
import BulkPlayerAddModal from '../components/BulkPlayerAddModal';
import BatchOperationsModal from '../components/BatchOperationsModal';
import FileImportModal from '../components/FileImportModal';
import GoogleImportModal from '../components/GoogleImportModal';
import GoogleFormsConnector from '../components/GoogleFormsConnector';
import UnifiedImportModal from '../components/UnifiedImportModal';
import DBFExportModal from '../components/DBFExportModal';
import PlayerInactiveRoundsModal from '../components/PlayerInactiveRoundsModal';
import EditPlayerModal from '../components/EditPlayerModal';
import PrintableView from '../components/PrintableView';
import ChessStandingsTable from '../components/ChessStandingsTable';
import TeamStandingsTable from '../components/TeamStandingsTable';
import TeamPairingsTable from '../components/TeamPairingsTable';
import RegistrationManagement from '../components/RegistrationManagement';
import SectionPairingManager from '../components/SectionPairingManager';
import TeamStandings from '../components/TeamStandings';
import APIDocumentationModal from '../components/APIDocumentationModal';
import APIStatusIndicator from '../components/APIStatusIndicator';
import NotificationButton from '../components/NotificationButton';
import SendPairingEmailsButton from '../components/SendPairingEmailsButton';
import PrizeDisplay from '../components/PrizeDisplay';
import PrizeConfigurationModal from '../components/PrizeConfigurationModal';
import SMSManager from '../components/SMSManager';
import QRCodeGenerator from '../components/QRCodeGenerator';
import PlayerProfile from '../components/PlayerProfile';
import LiveStandings from '../components/LiveStandings';
import PaymentManager from '../components/PaymentManager';
import PWAStatus from '../components/PWAStatus';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ChessPlatformIntegration from '../components/ChessPlatformIntegration';
import LichessIntegration from '../components/LichessIntegration';
import OnlineGameIntegration from '../components/OnlineGameIntegration';
import { getAllTournamentNotifications } from '../utils/notificationUtils';
// PDF export functions are used in ExportModal component

const TournamentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useTournament();
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'pairings' | 'standings' | 'team-standings' | 'team-pairings' | 'registrations' | 'prizes' | 'settings'>('settings');
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
  const [showDBFExport, setShowDBFExport] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [showInactiveRounds, setShowInactiveRounds] = useState(false);
  const [showEditPlayer, setShowEditPlayer] = useState(false);
  const [showAPIDocs, setShowAPIDocs] = useState(false);
  const [showDeleteDuplicates, setShowDeleteDuplicates] = useState(false);
  const [deleteDuplicatesCriteria, setDeleteDuplicatesCriteria] = useState<'name' | 'uscf_id' | 'both'>('name');
  const [selectedPlayer, setSelectedPlayer] = useState<{id: string, name: string} | null>(null);
  const [playerToEdit, setPlayerToEdit] = useState<any>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [printView, setPrintView] = useState<'pairings' | 'standings' | 'report' | 'team-standings' | null>(null);
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
  const [teamScoringMethod, setTeamScoringMethod] = useState<'all_players' | 'top_players'>('all_players');
  const [teamTopN, setTeamTopN] = useState<number>(4);
  const [showPrizeConfiguration, setShowPrizeConfiguration] = useState(false);
  const [prizeSettings, setPrizeSettings] = useState<any>(null);
  
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
  
  // Settings tab state
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  
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
        const aDate = aValue ? new Date(aValue).getTime() : 0;
        const bDate = bValue ? new Date(bValue).getTime() : 0;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
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

  // Handle column header click for sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  // Check for expired or expiring IDs
  const getExpirationWarnings = () => {
    if (!state.players || state.players.length === 0) return [];
    
    const warnings: Array<{type: 'expired' | 'expiring', player: string, message: string}> = [];
    const now = new Date();
    
    state.players.forEach(player => {
      if (player.expiration_date) {
        const expirationDate = new Date(player.expiration_date);
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiration < 0) {
          warnings.push({
            type: 'expired',
            player: player.name,
            message: `${player.name}'s USCF ID has expired`
          });
        } else if (daysUntilExpiration <= 30) {
          warnings.push({
            type: 'expiring',
            player: player.name,
            message: `${player.name}'s USCF ID expires in ${daysUntilExpiration} days`
          });
        }
      }
    });
    
    return warnings;
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
      setTeamStandings(response.data.standings || []);
    } catch (error: any) {
      console.error('Failed to fetch team standings:', error);
    }
  }, [id, teamScoringMethod, teamTopN]);

  const fetchTeamPairings = useCallback(async () => {
    if (!id || !tournament) return;
    
    // Only fetch team pairings for team tournaments
    if (!['team-swiss', 'team-round-robin'].includes(tournament.format)) {
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

  useEffect(() => {
    if (id) {
      console.log('TournamentDetail: Fetching data for tournament ID:', id);
      // Clear cache when switching tournaments
      dispatch({ type: 'CLEAR_CACHE' });
      // Always fetch fresh data on mount or when ID changes
      fetchTournament();
      fetchPlayers();
      fetchStandings();
    }
  }, [id, dispatch, fetchTournament, fetchPlayers, fetchStandings]);

  // Initialize prize settings from tournament data
  useEffect(() => {
    if (tournament && tournament.settings) {
      try {
        const settings = typeof tournament.settings === 'string' 
          ? JSON.parse(tournament.settings) 
          : tournament.settings;
        
        const prizeSettings = settings.prize_settings || { enabled: false, autoAssign: false, sections: [] };
        setPrizeSettings(prizeSettings);
      } catch (e) {
        console.error('Error parsing tournament settings:', e);
      }
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
    try {
      await playerApi.update(playerId, { team_name: editingTeamName || undefined });
      // Refresh players after updating
      await fetchPlayers();
      setEditingPlayerId(null);
      setEditingTeamName('');
    } catch (error) {
      console.error('Failed to update team name:', error);
      alert('Failed to update team name. Please try again.');
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
      const response = await tournamentApi.update(id, { [field]: value });
      if (response.data.success) {
        dispatch({ type: 'SET_CURRENT_TOURNAMENT', payload: response.data.data });
      } else {
        throw new Error(response.data.error || 'Failed to update tournament');
      }
    } catch (error: any) {
      console.error('Failed to update tournament:', error);
      alert(`Failed to update tournament: ${error.message || error}`);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Enhanced Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 py-3">
            {/* Left side - Navigation and Title */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                <span className="text-sm font-semibold">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 truncate">{tournament.name}</h1>
                <div className="flex items-center space-x-3 mt-1 flex-wrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${
                      tournament.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : tournament.status === 'completed'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {tournament.status ? tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1) : 'Unknown'}
                  </span>
                  <span className="text-sm font-medium text-gray-600 capitalize">
                    {tournament.format ? tournament.format.replace('-', ' ') : 'Unknown'}
                  </span>
                  <span className="text-sm font-medium text-gray-600">{tournament.rounds} rounds</span>
                </div>
              </div>
            </div>
            
            {/* Right side - Essential Actions Only */}
            <div className="flex items-center space-x-2 ml-4">
              {/* Tournament Director Dashboard - Hidden */}
              {false && (
              <button
                onClick={() => navigate(`/tournaments/${id}/director`)}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
              >
                <Settings className="h-4 w-4" />
                <span>Director</span>
              </button>
              )}
              
              {/* PWA Status - Hidden */}
              {false && (
              <button
                onClick={() => setShowPWAStatus(true)}
                className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              >
                <Smartphone className="h-4 w-4" />
                <span>PWA</span>
              </button>
              )}
              
              {/* New Feature Buttons in Header - Hidden */}
              {false && (
              <>
              <button
                onClick={() => setShowSMSManager(true)}
                className="flex items-center space-x-1 px-2 py-1 text-sm text-white bg-green-600 hover:bg-green-700 rounded"
              >
                <MessageSquare className="h-4 w-4" />
                <span>SMS</span>
              </button>
              
              <button
                onClick={() => setShowQRCodeGenerator(true)}
                className="flex items-center space-x-1 px-2 py-1 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded"
              >
                <QrCode className="h-4 w-4" />
                <span>QR</span>
              </button>
              
              <button
                onClick={() => setShowAnalyticsDashboard(true)}
                className="flex items-center space-x-1 px-2 py-1 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </button>
              
              <button
                onClick={() => setShowChessIntegration(true)}
                className="flex items-center space-x-1 px-2 py-1 text-sm text-white bg-cyan-600 hover:bg-cyan-700 rounded"
              >
                <Gamepad2 className="h-4 w-4" />
                <span>Chess</span>
              </button>
              </>
              )}
              
              {/* API Status - Compact */}
              <APIStatusIndicator 
                tournamentId={id || ''} 
                apiKey="ctk_f5de4f4cf423a194d00c078baa10e7a153fcca3e229ee7aadfdd72fec76cdd94" 
              />
              
              {/* Notifications - Only show if there are any */}
              {(() => {
                const warnings = getExpirationWarnings();
                const notifications = getAllTournamentNotifications(tournament, state.players, warnings);
                return notifications.length > 0 ? (
                  <NotificationButton
                    notifications={notifications}
                    webhookEnabled={emailsEnabled}
                    onWebhookToggle={(enabled) => {
                      setEmailsEnabled(enabled);
                    }}
                    webhookUrl="https://script.google.com/macros/s/AKfycbyLjx_xfOs6XNlDmAZHJKobn1MMSgOeRBHJOAS0qNK7HyQEuMm9EdRIxt5f5P6sej-a/exec"
                    onDismiss={(notificationId) => {
                      console.log('Dismissed notification:', notificationId);
                    }}
                    onMarkAsRead={(notificationId) => {
                      console.log('Marked as read:', notificationId);
                    }}
                    onViewPlayer={(playerName) => {
                      const player = state.players.find(p => p.name === playerName);
                      if (player) {
                        setActiveTab('players');
                        console.log('Viewing player:', playerName);
                      }
                    }}
                  />
                ) : null;
              })()}
              
              {/* Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDisplaySettings(!showDisplaySettings)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Actions</span>
                </button>
                
                {/* Dropdown Menu */}
                {showDisplaySettings && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          dispatch({ type: 'SET_ERROR', payload: null });
                          fetchTournament();
                          fetchPlayers();
                          fetchStandings();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <RefreshCw className="h-4 w-4 mr-3" />
                        Refresh Data
                      </button>
                      
                      <button
                        onClick={() => setShowSectionManager(true)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Manage Sections
                      </button>
                      
                      <button
                        onClick={clearStandings}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        Clear Standings
                      </button>
                      
                      <button
                        onClick={() => {
                          const apiUrl = `${window.location.origin}/api/players/api-import/${id}`;
                          const registerUrl = `${window.location.origin}/api/players/register/${id}`;
                          const registrationFormUrl = `${window.location.origin}/register/${id}`;
                          const apiKey = 'demo-key-123';
                          
                          const modal = document.createElement('div');
                          modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                          modal.innerHTML = `
                            <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                              <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold">API Integration & Registration</h3>
                                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                  </svg>
                                </button>
                              </div>
                              <div class="space-y-6">
                                <div class="bg-gray-50 rounded-lg p-4">
                                  <h4 class="font-semibold text-gray-900 mb-2">Tournament Information</h4>
                                  <p class="text-sm text-gray-600">Tournament ID: <code class="bg-gray-200 px-2 py-1 rounded">${id}</code></p>
                                  <p class="text-sm text-gray-600">Tournament Name: ${tournament?.name || 'Loading...'}</p>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Bulk Import API:</label>
                                    <div class="flex">
                                      <input type="text" value="${apiUrl}" readonly 
                                             class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono">
                                      <button onclick="navigator.clipboard.writeText('${apiUrl}')" 
                                              class="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm">
                                        Copy
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Single Registration API:</label>
                                    <div class="flex">
                                      <input type="text" value="${registerUrl}" readonly 
                                             class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono">
                                      <button onclick="navigator.clipboard.writeText('${registerUrl}')" 
                                              class="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 text-sm">
                                        Copy
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label class="block text-sm font-medium text-gray-700 mb-2">Registration Form URL:</label>
                                  <div class="flex">
                                    <input type="text" value="${registrationFormUrl}" readonly 
                                           class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono">
                                    <button onclick="navigator.clipboard.writeText('${registrationFormUrl}')" 
                                            class="px-3 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 text-sm">
                                      Copy
                                    </button>
                                    <button onclick="window.open('${registrationFormUrl}', '_blank')" 
                                            class="px-3 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 text-sm ml-1">
                                      Open
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          `;
                          document.body.appendChild(modal);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        API & Registration
                      </button>
                      
                      <a
                        href={`/public/tournaments/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <ExternalLink className="h-4 w-4 mr-3" />
                        Public View
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Consolidated Tournament Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Tournament Overview</h2>
          </div>
          <div className="p-6">
            {/* Primary Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Date</p>
                  <p className="text-sm text-gray-900">
                    {tournament.start_date 
                      ? new Date(tournament.start_date).toLocaleDateString()
                      : 'TBD'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">End Date</p>
                  <p className="text-sm text-gray-900">
                    {tournament.end_date 
                      ? new Date(tournament.end_date).toLocaleDateString()
                      : 'TBD'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Time Control</p>
                  <p className="text-sm text-gray-900">{tournament.time_control || 'TBD'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Players</p>
                  <p className="text-sm text-gray-900">{state.players.length}</p>
                </div>
              </div>
            </div>

            {/* Registration Status - Prominent */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`h-3 w-3 rounded-full ${tournament.allow_registration ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Registration</h3>
                    <p className="text-sm text-gray-600">
                      {tournament.allow_registration ? 'Open for new players' : 'Currently closed'}
                    </p>
                  </div>
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-chess-board focus:ring-offset-2 ${
                    tournament.allow_registration ? 'bg-chess-board' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tournament.allow_registration ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Additional Details - Only show if there's meaningful data */}
            {(tournament.city || tournament.state || tournament.location || tournament.chief_td_name || tournament.website || tournament.uscf_rated || tournament.fide_rated) && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tournament.city && tournament.state && (
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 text-gray-400 mt-0.5 flex items-center justify-center">
                        📍
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tournament.city}, {tournament.state}</p>
                        {tournament.location && (
                          <p className="text-sm text-gray-500">{tournament.location}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {tournament.chief_td_name && (
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 text-gray-400 mt-0.5 flex items-center justify-center">
                        👨‍💼
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tournament.chief_td_name}</p>
                        {tournament.chief_td_uscf_id && (
                          <p className="text-sm text-gray-500">USCF ID: {tournament.chief_td_uscf_id}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {tournament.chief_arbiter_name && (
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 text-gray-400 mt-0.5 flex items-center justify-center">
                        ⚖️
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tournament.chief_arbiter_name}</p>
                        {tournament.chief_arbiter_fide_id && (
                          <p className="text-sm text-gray-500">FIDE ID: {tournament.chief_arbiter_fide_id}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {tournament.website && (
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 text-gray-400 mt-0.5 flex items-center justify-center">
                        🌐
                      </div>
                      <div>
                        <a 
                          href={tournament.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Visit Website
                        </a>
                      </div>
                    </div>
                  )}

                  {(tournament.uscf_rated || tournament.fide_rated) && (
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 text-gray-400 mt-0.5 flex items-center justify-center">
                        🏆
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Rating System</p>
                        <div className="flex space-x-2 mt-1">
                          {tournament.uscf_rated && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              USCF
                            </span>
                          )}
                          {tournament.fide_rated && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              FIDE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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

        {/* Modern Tab Navigation */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-6 overflow-hidden">
          <nav className="flex flex-wrap px-2 sm:px-4 overflow-x-auto scrollbar-hide">
            {/* Core Tabs */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>INFO</span>
            </button>
            
            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === 'players'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Players</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'players'
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {state.players.length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('pairings')}
              className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === 'pairings'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Pairings</span>
            </button>
              
            <button
              onClick={() => setActiveTab('standings')}
              className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === 'standings'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Standings</span>
            </button>

            <button
              onClick={() => setActiveTab('prizes')}
              className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === 'prizes'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Prizes</span>
            </button>

            {/* Team-specific tabs - only show if relevant */}
            {tournament && (
              <>
                <button
                  onClick={() => {
                    setActiveTab('team-standings');
                    fetchTeamStandings();
                  }}
                  className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm rounded-lg transition-all ${
                    activeTab === 'team-standings'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Team Standings</span>
                </button>
                  
                {/* Team Pairings - Hidden */}
                  {/* <button
                    onClick={() => setActiveTab('team-pairings')}
                    className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors rounded-t-md ${
                      activeTab === 'team-pairings'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4" />
                      <span>Team Pairings</span>
                    </div>
                  </button> */}
                </>
              )}

            {/* Registration Management */}
            <button
              onClick={() => setActiveTab('registrations')}
              className={`flex items-center space-x-2 py-3 px-5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === 'registrations'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Registrations</span>
            </button>
          </nav>
        </div>

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
                      
                      <button
                        onClick={() => setShowAPIDocs(true)}
                        className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Code className="h-4 w-4" />
                        <span>API Docs</span>
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
              
              {state.players.length === 0 ? (
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
                  {/* Sectioned Players Display */}
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
                            {player.points !== undefined ? player.points.toFixed(1) : '0.0'}
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
                              {player.expiration_date && (
                                (() => {
                                  const expirationDate = new Date(player.expiration_date);
                                  const now = new Date();
                                  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                  
                                  if (daysUntilExpiration < 0) {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                        ID Expired
                                      </span>
                                    );
                                  } else if (daysUntilExpiration <= 30) {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                        Expires in {daysUntilExpiration} days
                                      </span>
                                    );
                                  }
                                  return null;
                                })()
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {player.expiration_date ? (
                              (() => {
                                const expirationDate = new Date(player.expiration_date);
                                const now = new Date();
                                const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                
                                if (daysUntilExpiration < 0) {
                                  return (
                                    <span className="text-red-600 font-medium">
                                      Expired
                                    </span>
                                  );
                                } else if (daysUntilExpiration <= 30) {
                                  return (
                                    <span className="text-yellow-600 font-medium">
                                      {daysUntilExpiration} days
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-gray-600">
                                      {expirationDate.toLocaleDateString()}
                                    </span>
                                  );
                                }
                              })()
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(() => {
                              // Validate that bye_rounds contains valid round numbers, not dates
                              if (!player.bye_rounds || player.bye_rounds.trim() === '') {
                                return <span className="text-gray-400">-</span>;
                              }
                              
                              // Check if it looks like a date (contains slashes or dashes in date format)
                              const isDatePattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(player.bye_rounds.trim());
                              if (isDatePattern) {
                                // This is a date, not a bye round - don't display it
                                return <span className="text-gray-400">-</span>;
                              }
                              
                              // Check if it's "Expired" text
                              if (player.bye_rounds.trim().toLowerCase() === 'expired') {
                                return <span className="text-gray-400">-</span>;
                              }
                              
                              // It's a valid bye rounds value
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  {player.bye_rounds}
                                </span>
                              );
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
            </div>
          )}

          {activeTab === 'standings' && (
            <div>
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
                    onClick={() => setPrintView('standings')}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
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
                        <div key={sectionName} className="border border-gray-200 rounded-lg">
                          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">{sectionName} Section</h3>
                            <p className="text-sm text-gray-600">{sectionStandings.length} players</p>
                          </div>
                          
                          <div className="p-4">
                            <ChessStandingsTable
                              standings={sectionStandings}
                              tournament={tournament}
                              selectedSection={sectionName}
                              showTiebreakers={showTiebreakers}
                              showPrizes={true}
                              tournamentId={id}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Tournament Settings</h3>
                
                {/* Logo Upload Section */}
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Tournament Logo</h4>
                  <div className="flex items-start space-x-6">
                    {/* Current Logo Display */}
                    <div className="flex-shrink-0">
                      <div className="w-32 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
                        {tournament?.logo_url ? (
                          <img 
                            src={tournament.logo_url} 
                            alt="Tournament Logo"
                            className="absolute inset-0 w-full h-full object-contain p-2"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        {!tournament?.logo_url && (
                          <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
                            <Upload className="h-6 w-6 mb-1" />
                            <span>No Logo</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="flex-1">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Logo
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            PNG, JPG, or SVG. Recommended size: 200x60px or similar aspect ratio.
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Or enter logo URL
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="url"
                              value={logoUrl}
                              onChange={(e) => setLogoUrl(e.target.value)}
                              placeholder="https://example.com/logo.png"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              onClick={handleLogoUrlSave}
                              disabled={!logoUrl.trim()}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                              Save URL
                            </button>
                          </div>
                        </div>
                        
                        {tournament?.logo_url && (
                          <button
                            onClick={handleLogoRemove}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tournament Information */}
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Tournament Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tournament Name
                      </label>
                      <input
                        type="text"
                        value={tournament?.name || ''}
                        onChange={(e) => handleTournamentUpdate('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Control
                      </label>
                      <input
                        type="text"
                        value={tournament?.time_control || ''}
                        onChange={(e) => handleTournamentUpdate('time_control', e.target.value)}
                        placeholder="G/45+15"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={tournament?.location || ''}
                        onChange={(e) => handleTournamentUpdate('location', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={tournament?.website || ''}
                        onChange={(e) => handleTournamentUpdate('website', e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Tournament Information for Public View */}
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Tournament Information (Public View)</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tournament Information (displayed on public view)
                    </label>
                    <textarea
                      value={tournament?.tournament_information || ''}
                      onChange={(e) => handleTournamentUpdate('tournament_information', e.target.value)}
                      rows={6}
                      placeholder="Enter tournament information that will be displayed on the public view..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This information will be displayed on the public tournament view page
                    </p>
                  </div>
                </div>

                {/* Public Settings */}
                <div className="mb-8">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Public Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_public"
                        checked={tournament?.is_public || false}
                        onChange={(e) => handleTournamentUpdate('is_public', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
                        Make tournament publicly viewable
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allow_registration"
                        checked={tournament?.allow_registration || false}
                        onChange={(e) => handleTournamentUpdate('allow_registration', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allow_registration" className="ml-2 block text-sm text-gray-900">
                        Allow online registration
                      </label>
                    </div>
                  </div>
                </div>

                {/* Prizes Section */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-gray-900">Prize Management</h4>
                    <button
                      onClick={() => setShowPrizeConfiguration(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Configure Prizes</span>
                    </button>
                  </div>
                  
                  <PrizeDisplay
                    tournamentId={id || ''}
                    showPrizeSettings={true}
                    onPrizeSettingsClick={() => setShowPrizeConfiguration(true)}
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSettingsSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
            </div>
          )}

          {activeTab === 'prizes' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Prize Management</h2>
                  <p className="text-sm text-gray-600">
                    Configure and view prize distributions for this tournament
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowPrizeConfiguration(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Configure Prizes</span>
                  </button>
                </div>
              </div>
              
              <PrizeDisplay
                tournamentId={id!}
                showPrizeSettings={true}
                onPrizeSettingsClick={() => setShowPrizeConfiguration(true)}
              />
            </div>
          )}

          {activeTab === 'team-standings' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold">Team Standings</h2>
                  {/* Team format functionality removed - only swiss and online formats supported now */}
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
                    onClick={() => setPrintView('team-standings')}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Team Standings</span>
                  </button>
                </div>
              </div>
              
              {/* Team standings not available for swiss/online formats */}
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Team standings are not available for Swiss or Online tournaments</p>
              </div>
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
                    onClick={() => setPrintView('pairings')}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
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
            <div>
              <RegistrationManagement tournamentId={id || ''} />
            </div>
          )}
          </div>
        </div>
      </div>

      {/* All modals and dialogs go here, outside the max-w-7xl container */}
      {/* Add Player Modal */}
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



      {/* Print View */}
      {printView && tournament && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {printView === 'pairings' && `Round ${currentRound} Pairings`}
                {printView === 'standings' && 'Tournament Standings'}
                {printView === 'team-standings' && 'Team Standings'}
                {printView === 'report' && 'Tournament Report'}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setPrintView(null)}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>
            {tournament && (
              <PrintableView
                tournament={tournament as any}
                pairings={state.pairings.map(p => ({
                  id: p.id,
                  board: p.board,
                  white_name: p.white_name,
                  white_rating: p.white_rating,
                  white_uscf_id: p.white_uscf_id,
                  black_name: p.black_name,
                  black_rating: p.black_rating,
                  black_uscf_id: p.black_uscf_id,
                  result: p.result,
                  section: p.section,
                  is_bye: p.is_bye,
                  white_id: p.white_id || p.white_player_id,
                  black_id: p.black_id || p.black_player_id,
                  round: p.round
                }))}
                standings={Array.isArray(state.standings) ? state.standings.map(s => ({
                  id: s.id,
                  name: s.name,
                  rating: s.rating,
                  uscf_id: undefined,
                  total_points: s.total_points,
                  games_played: s.games_played,
                  wins: s.wins,
                  losses: s.losses,
                  draws: s.draws,
                  buchholz: s.tiebreakers?.buchholz || 0,
                  sonneborn_berger: s.tiebreakers?.sonnebornBerger || 0,
                  section: s.section,
                  rank: s.rank
                })) : []}
                currentRound={currentRound}
                viewType={printView as 'pairings' | 'standings' | 'report' | 'team-standings'}
              />
            )}
          </div>
        </div>
      )}

      {/* Team Standings Modal */}
      <TeamStandings
        tournamentId={id || ''}
        isVisible={showTeamStandings}
        onClose={() => setShowTeamStandings(false)}
      />

      {/* Edit Player Modal */}
      <EditPlayerModal
        isOpen={showEditPlayer}
        onClose={() => {
          setShowEditPlayer(false);
          setPlayerToEdit(null);
        }}
        player={playerToEdit}
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

      {/* Prize Configuration Modal */}
      <PrizeConfigurationModal
        isOpen={showPrizeConfiguration}
        onClose={() => setShowPrizeConfiguration(false)}
        tournamentId={id!}
        currentSettings={prizeSettings}
        onUpdate={(settings) => {
          setPrizeSettings(settings);
          // Refresh prize display if on prizes tab
          if (activeTab === 'prizes') {
            // The PrizeDisplay component will automatically refresh
          }
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

      {/* Section Manager Modal */}
      {showSectionManager && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Manage Sections</h3>
              <button
                onClick={() => setShowSectionManager(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Sections</h4>
                <div className="space-y-2">
                  {tournament?.settings?.sections && tournament.settings.sections.length > 0 ? (
                    (tournament.settings?.sections || []).map((section: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">{section.name}</span>
                        <span className="text-xs text-gray-500">
                          {state.players.filter(p => p.section === section.name).length} players
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No sections defined</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Section</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Enter section name (e.g., Open, U1800, U1200)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && addSection()}
                  />
                  <button
                    onClick={addSection}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSectionManager(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TournamentDetail;
