import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  RotateCcw, 
  RefreshCw,
  BarChart3,
  TrendingUp,
  Palette,
  Brain,
  Target,
  Shield,
  Zap,
  Crown,
  Star,
  Award,
  Activity,
  Eye,
  Edit3,
  QrCode,
  History,
  Download,
  Printer,
  ExternalLink,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Medal,
  Flame,
  Sparkles,
  Filter,
  Search,
  Calendar,
  User,
  Gamepad2,
  Layers
} from 'lucide-react';
import { tournamentApi, pairingApi, playerApi } from '../services/api';
import RedesignedPairingSystem from './RedesignedPairingSystem';
import PairingDetailsModal from './PairingDetailsModal';
import ColorBalanceVisualization from './ColorBalanceVisualization';
import PairingAnalyticsDashboard from './PairingAnalyticsDashboard';

interface RedesignedPairingIntegrationProps {
  tournament: any;
  onTournamentUpdate: (tournament: any) => void;
}

const RedesignedPairingIntegration: React.FC<RedesignedPairingIntegrationProps> = ({
  tournament,
  onTournamentUpdate
}) => {
  const { id } = useParams<{ id: string }>();
  const [sections, setSections] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPairingDetails, setShowPairingDetails] = useState<string | null>(null);
  const [showColorBalance, setShowColorBalance] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [pairingDetails, setPairingDetails] = useState<any>(null);

  // Load tournament data and sections
  const loadTournamentData = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      // Load tournament details
      const tournamentResponse = await tournamentApi.getById(id);
      const tournamentData = tournamentResponse.data.data;
      
      // Load players
      const playersResponse = await playerApi.getByTournament(id);
      const allPlayers = playersResponse.data.data;
      
      // Group players by section
      const sectionsMap = new Map<string, any>();
      
      // Initialize sections from tournament data
      const sectionsData = tournamentData.settings?.sections || [];
      if (sectionsData.length > 0) {
        sectionsData.forEach((section: any) => {
          sectionsMap.set(section.name, {
            name: section.name,
            players: [],
            pairings: [],
            currentRound: 1,
            totalRounds: tournamentData.rounds || 5,
            isComplete: false,
            hasIncompleteResults: false,
            canGenerateNext: false,
            pairingSystem: 'fide_dutch',
            colorBalanceStatus: 'balanced',
            pairingQuality: 'good'
          });
        });
      }

      // Process each section
      for (const [sectionName, section] of Array.from(sectionsMap.entries())) {
        // Get players for this section
        const sectionPlayers = allPlayers.filter((p: any) => p.section === sectionName);
        
        // Get all pairings for this section
        const allPairings: any[] = [];
        for (let round = 1; round <= (tournamentData.rounds || 5); round++) {
          try {
            const pairingsResponse = await pairingApi.getByRound(id, round, sectionName);
            allPairings.push(...(pairingsResponse.data || []));
          } catch (error) {
            // No pairings for this round yet
          }
        }

        // Calculate player points and standings
        const playersWithPoints = sectionPlayers.map((player: any) => {
          let totalPoints = 0;
          const roundResults: { [round: number]: any } = {};
          
          // Calculate points from pairings
          allPairings.forEach((pairing: any) => {
            if (pairing.white_player_id === player.id || pairing.black_player_id === player.id) {
              const isWhite = pairing.white_player_id === player.id;
              const result = pairing.result;
              
              if (result) {
                let points = 0;
                if (result === '1-0' && isWhite) points = 1;
                else if (result === '0-1' && !isWhite) points = 1;
                else if (result === '1/2-1/2') points = 0.5;
                
                totalPoints += points;
                
                if (!roundResults[pairing.round]) {
                  roundResults[pairing.round] = {};
                }
                roundResults[pairing.round] = {
                  result,
                  opponent: isWhite ? pairing.black_name : pairing.white_name,
                  opponentRating: isWhite ? pairing.black_rating : pairing.white_rating,
                  color: isWhite ? 'white' : 'black',
                  board: pairing.board,
                  points
                };
              }
            }
          });

          // Calculate color balance
          const colorHistory = allPairings
            .filter(p => p.white_player_id === player.id || p.black_player_id === player.id)
            .map(p => p.white_player_id === player.id ? 'W' : 'B')
            .slice(-10); // Last 10 games
          
          const colorBalance = colorHistory.reduce((sum, color) => sum + (color === 'W' ? 1 : -1), 0);

          return {
            ...player,
            points: totalPoints,
            roundResults,
            color_balance: colorBalance,
            color_history: colorHistory,
            previous_opponents: allPairings
              .filter(p => p.white_player_id === player.id || p.black_player_id === player.id)
              .map(p => p.white_player_id === player.id ? p.black_player_id : p.white_player_id)
              .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates
          };
        });

        // Sort players by points and rating
        const sortedPlayers = playersWithPoints.sort((a: any, b: any) => {
          if (b.points !== a.points) return b.points - a.points;
          return (b.rating || 0) - (a.rating || 0);
        });

        // Add rank
        sortedPlayers.forEach((player: any, index: number) => {
          player.rank = index + 1;
        });

        const currentRound = allPairings.length > 0 
          ? Math.max(...allPairings.map((p: any) => p.round), 0) + 1
          : 1;
        const isComplete = currentRound > (tournamentData.rounds || 5);
        const hasIncompleteResults = allPairings.some((p: any) => !p.result);
        const canGenerateNext = !isComplete && allPairings.length > 0;

        // Calculate color balance status
        const balancedPlayers = sortedPlayers.filter(p => p.color_balance === 0).length;
        const totalPlayers = sortedPlayers.length;
        const colorBalanceStatus = balancedPlayers / totalPlayers >= 0.8 ? 'balanced' : 
                                 balancedPlayers / totalPlayers >= 0.6 ? 'imbalanced' : 'critical';

        // Calculate pairing quality
        const qualityScore = Math.min(100, Math.max(0, 
          (balancedPlayers / totalPlayers) * 100 - 
          (allPairings.filter(p => !p.result).length / Math.max(allPairings.length, 1)) * 20
        ));
        const pairingQuality = qualityScore >= 90 ? 'excellent' :
                              qualityScore >= 80 ? 'good' :
                              qualityScore >= 70 ? 'fair' : 'poor';

        section.players = sortedPlayers;
        section.pairings = allPairings;
        section.currentRound = currentRound;
        section.isComplete = isComplete;
        section.hasIncompleteResults = hasIncompleteResults;
        section.canGenerateNext = canGenerateNext;
        section.colorBalanceStatus = colorBalanceStatus;
        section.pairingQuality = pairingQuality;
      }

      setSections(Array.from(sectionsMap.values()));
      if (sectionsMap.size > 0 && !selectedSection) {
        setSelectedSection(Array.from(sectionsMap.keys())[0]);
      }
      
      // Set current round
      const maxRound = Math.max(...Array.from(sectionsMap.values()).map(s => s.currentRound));
      setCurrentRound(maxRound);

    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedSection]);

  useEffect(() => {
    loadTournamentData();
  }, [loadTournamentData]);

  // Handle pairing result update
  const handleUpdateResult = useCallback(async (pairingId: string, result: string) => {
    try {
      await pairingApi.updateResult(pairingId, result);
      await loadTournamentData();
    } catch (error) {
      console.error('Failed to update result:', error);
      throw error;
    }
  }, [loadTournamentData]);

  // Handle pairing generation
  const handleGeneratePairings = useCallback(async (sectionName: string) => {
    try {
      setIsLoading(true);
      const response = await pairingApi.generateForSection(id!, currentRound, sectionName);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate pairings');
      }
      
      await loadTournamentData();
    } catch (error) {
      console.error('Failed to generate pairings:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [id, currentRound, loadTournamentData]);

  // Handle round completion
  const handleCompleteRound = useCallback(async (sectionName: string) => {
    try {
      setIsLoading(true);
      await pairingApi.completeRound(id!, currentRound, sectionName);
      await loadTournamentData();
    } catch (error) {
      console.error('Failed to complete round:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [id, currentRound, loadTournamentData]);

  // Handle pairing reset
  const handleResetPairings = useCallback(async (sectionName: string) => {
    try {
      setIsLoading(true);
      await pairingApi.resetSection(id!, sectionName);
      await loadTournamentData();
    } catch (error) {
      console.error('Failed to reset pairings:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [id, loadTournamentData]);

  // Handle manual override
  const handleManualOverride = useCallback(async (pairingId: string, newWhiteId: string, newBlackId: string, reason: string) => {
    try {
      // This would typically call an API endpoint for manual override
      console.log('Manual override:', { pairingId, newWhiteId, newBlackId, reason });
      await loadTournamentData();
    } catch (error) {
      console.error('Failed to override pairing:', error);
      throw error;
    }
  }, [loadTournamentData]);

  // Handle pairing details view
  const handleShowPairingDetails = useCallback(async (pairingId: string) => {
    try {
      // This would typically fetch detailed pairing information
      const pairing = sections
        .flatMap(s => s.pairings)
        .find(p => p.id === pairingId);
      
      if (pairing) {
        setPairingDetails(pairing);
        setShowPairingDetails(pairingId);
      }
    } catch (error) {
      console.error('Failed to load pairing details:', error);
    }
  }, [sections]);

  // Handle color balance visualization
  const handleShowColorBalance = useCallback(() => {
    setShowColorBalance(true);
  }, []);

  // Handle analytics dashboard
  const handleShowAnalytics = useCallback(() => {
    setShowAnalytics(true);
  }, []);

  if (isLoading && sections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading tournament data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Redesigned Pairing System</h2>
            <p className="text-gray-600 mt-1">
              Advanced pairing management with sophisticated algorithms and real-time analytics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleShowColorBalance}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Palette className="h-4 w-4" />
              <span>Color Balance</span>
            </button>
            <button
              onClick={handleShowAnalytics}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={loadTournamentData}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Pairing System */}
      <RedesignedPairingSystem
        tournament={tournament}
        sections={sections}
        currentRound={currentRound}
        onRoundChange={setCurrentRound}
        onPairingsUpdate={(sectionName, pairings) => {
          setSections(prev => prev.map(s => 
            s.name === sectionName ? { ...s, pairings } : s
          ));
        }}
        onCompleteRound={handleCompleteRound}
        onResetPairings={handleResetPairings}
        onGeneratePairings={handleGeneratePairings}
        onUpdateResult={handleUpdateResult}
        onManualOverride={handleManualOverride}
        isLoading={isLoading}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
      />

      {/* Modals */}
      {showPairingDetails && pairingDetails && (
        <PairingDetailsModal
          pairing={pairingDetails}
          isOpen={showPairingDetails !== null}
          onClose={() => {
            setShowPairingDetails(null);
            setPairingDetails(null);
          }}
          onManualOverride={handleManualOverride}
        />
      )}

      {showColorBalance && (
        <ColorBalanceVisualization
          players={sections.find(s => s.name === selectedSection)?.players || []}
          sectionName={selectedSection}
          isOpen={showColorBalance}
          onClose={() => setShowColorBalance(false)}
        />
      )}

      {showAnalytics && (
        <PairingAnalyticsDashboard
          tournament={tournament}
          sections={sections}
          currentRound={currentRound}
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
        />
      )}
    </div>
  );
};

export default RedesignedPairingIntegration;
