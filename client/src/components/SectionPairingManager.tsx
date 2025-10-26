import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Clock, Play, RotateCcw, Users, Trophy, Settings, Plus, ArrowUpDown, Trash2, Edit3, X, GripVertical } from 'lucide-react';
import { pairingApi, playerApi } from '../services/api';
import LichessGameCreator from './LichessGameCreator';

interface SectionPairingManagerProps {
  tournamentId: string;
  sectionName: string;
  currentRound: number;
  pairings: any[]; // Receive pairings from parent
  onRoundComplete?: (nextRound: number) => void;
  onPairingsUpdate?: (pairings: any[]) => void;
  onRoundChange?: (round: number) => void;
}

const SectionPairingManager: React.FC<SectionPairingManagerProps> = ({
  tournamentId,
  sectionName,
  currentRound,
  pairings, // Use pairings from parent
  onRoundComplete,
  onPairingsUpdate,
  onRoundChange
}) => {
  const [standings, setStandings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<any>(null);
  const [isCompletingRound, setIsCompletingRound] = useState(false);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPairing, setEditingPairing] = useState<any>(null);
  const [newBoardNumber, setNewBoardNumber] = useState('');
  const [availableRounds, setAvailableRounds] = useState<number[]>([1]);
  const selectedPairingRef = useRef<string | null>(null);
  
  // Drag and drop state
  const [draggedPairing, setDraggedPairing] = useState<string | null>(null);
  const [dragOverPairing, setDragOverPairing] = useState<string | null>(null);
  
  // Manual pairing creation state
  const [showManualPairingModal, setShowManualPairingModal] = useState(false);
  const [manualBoardNumber, setManualBoardNumber] = useState('');
  const [manualFirstBoardNumber, setManualFirstBoardNumber] = useState('1');
  const [selectedWhitePlayer, setSelectedWhitePlayer] = useState<string>('');
  const [selectedBlackPlayer, setSelectedBlackPlayer] = useState<string>('');
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  
  // Board number offset
  const [boardNumberOffset, setBoardNumberOffset] = useState(0);

  // Filter pairings by section to ensure only current section's pairings are shown
  const sectionPairings = pairings.filter(p => p.section === sectionName);
  // BYE pairings don't need a result field - they're automatically complete
  const incompletePairings = sectionPairings.filter(p => !p.result && !p.is_bye);
  const completedPairings = sectionPairings.filter(p => p.result || p.is_bye);

  // Fetch available rounds for the section
  const fetchAvailableRounds = useCallback(async () => {
    if (!tournamentId || !sectionName) return;
    
    try {
      // Fetch all pairings for this section to determine available rounds
      const response = await pairingApi.getBySection(tournamentId, sectionName);
      const allPairings = response.data || [];
      
      // Extract unique round numbers
      const rounds = Array.from(new Set(allPairings.map((p: any) => p.round))).sort((a, b) => a - b);
      setAvailableRounds(rounds.length > 0 ? rounds : [currentRound]);
    } catch (error) {
      console.error('Error fetching available rounds:', error);
      setAvailableRounds([currentRound]);
    }
  }, [tournamentId, sectionName, currentRound]);

  // Fetch section data (standings and status only, pairings come from parent)
  const fetchSectionData = useCallback(async () => {
    if (!tournamentId || !sectionName) return;
    
    try {
      setIsLoading(true);
      
      // Fetch standings
      const standingsResponse = await pairingApi.getStandings(tournamentId, true, true);
      const sectionStandings = standingsResponse.data.data ? standingsResponse.data.data.filter((s: any) => s.section === sectionName) : [];
      setStandings(sectionStandings);
      
      // Fetch section status
      const statusResponse = await pairingApi.getSectionStatusSimple(tournamentId, sectionName);
      setSectionStatus(statusResponse.data);
      
    } catch (error) {
      console.error('Error fetching section data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, sectionName]);

  // Update pairing result - defined before handleKeyDown to avoid dependency issues
  const updatePairingResult = useCallback(async (pairingId: string, result: string) => {
    try {
      console.log('🎯 SectionPairingManager: Updating result for pairing:', pairingId, 'result:', result);
      const response = await pairingApi.updateResult(pairingId, result);
      console.log('✅ SectionPairingManager: Result update response:', response);
      
      // Update parent's pairings state
      const updatedPairings = pairings.map(p => 
        p.id === pairingId ? { ...p, result } : p
      );
      onPairingsUpdate?.(updatedPairings);
      
      // Only refresh standings to show updated scores
      const standingsResponse = await pairingApi.getStandings(tournamentId, true, true);
      const sectionStandings = standingsResponse.data.data ? standingsResponse.data.data.filter((s: any) => s.section === sectionName) : [];
      setStandings(sectionStandings);
      
      console.log('✅ SectionPairingManager: Result updated successfully');
      
    } catch (error) {
      console.error('❌ SectionPairingManager: Failed to update result:', error);
      alert(`Failed to update result: ${error}`);
    }
  }, [tournamentId, sectionName, pairings, onPairingsUpdate]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle if we're not typing in an input/textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    // Find the first incomplete pairing (BYEs are automatically complete)
    const incompletePairings = sectionPairings.filter(p => !p.result && !p.is_bye);
    if (incompletePairings.length === 0) return;

    const targetPairing = selectedPairingRef.current 
      ? incompletePairings.find(p => p.id === selectedPairingRef.current)
      : incompletePairings[0];

    if (!targetPairing) return;

    let result: string | null = null;
    
    if (e.key === 'w' || e.key === 'W') {
      result = '1-0';
    } else if (e.key === 'l' || e.key === 'L') {
      result = '0-1';
    } else if (e.key === 'd' || e.key === 'D') {
      result = '1/2-1/2';
    }

    if (result) {
      e.preventDefault();
      updatePairingResult(targetPairing.id, result);
      
      // Move to next incomplete pairing
      const currentIndex = incompletePairings.findIndex(p => p.id === targetPairing.id);
      const nextIndex = currentIndex + 1;
      if (nextIndex < incompletePairings.length) {
        selectedPairingRef.current = incompletePairings[nextIndex].id;
      } else {
        selectedPairingRef.current = null;
      }
    }
  }, [sectionPairings, updatePairingResult]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Edit functions
  const swapPlayers = async (pairingId: string) => {
    try {
      const response = await pairingApi.swapPlayers(pairingId);
      if (response.data.success) {
        // Refresh pairings from parent
        const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
        onPairingsUpdate?.(pairingsResponse.data || []);
        alert('Players swapped successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to swap players');
      }
    } catch (error: any) {
      console.error('Failed to swap players:', error);
      alert(`Failed to swap players: ${error.message}`);
    }
  };

  const updateBoardNumber = async (pairingId: string, newBoardNumber: string) => {
    try {
      const response = await pairingApi.updateBoardNumber(pairingId, parseInt(newBoardNumber));
      if (response.data.success) {
        // Refresh pairings from parent
        const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
        onPairingsUpdate?.(pairingsResponse.data || []);
        alert('Board number updated successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to update board number');
      }
    } catch (error: any) {
      console.error('Failed to update board number:', error);
      alert(`Failed to update board number: ${error.message}`);
    }
  };

  const deletePairing = async (pairingId: string) => {
    if (!window.confirm('Are you sure you want to delete this pairing?')) {
      return;
    }

    try {
      const response = await pairingApi.delete(pairingId);
      if (response.data.success) {
        // Refresh pairings from parent
        const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
        onPairingsUpdate?.(pairingsResponse.data || []);
        alert('Pairing deleted successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to delete pairing');
      }
    } catch (error: any) {
      console.error('Failed to delete pairing:', error);
      alert(`Failed to delete pairing: ${error.message}`);
    }
  };

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await playerApi.getByTournament(tournamentId);
      setAvailablePlayers(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  }, [tournamentId]);

  // Open manual pairing modal
  const handleOpenManualPairing = () => {
    const nextBoardNumber = sectionPairings.length > 0 
      ? Math.max(...sectionPairings.map(p => p.board || 0)) + 1 
      : parseInt(manualFirstBoardNumber);
    setManualBoardNumber(nextBoardNumber.toString());
    fetchPlayers();
    setShowManualPairingModal(true);
  };

  // Add manual pairing with selected players
  const addManualPairingWithPlayers = async () => {
    if (!manualBoardNumber.trim()) {
      alert('Please enter a board number');
      return;
    }

    if (!selectedWhitePlayer || !selectedBlackPlayer) {
      alert('Please select both white and black players');
      return;
    }

    try {
      const response = await pairingApi.createManualWithPlayers(
        tournamentId, 
        sectionName, 
        currentRound, 
        parseInt(manualBoardNumber),
        selectedWhitePlayer,
        selectedBlackPlayer
      );
      if (response.data.success) {
        // Refresh pairings from parent
        const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
        onPairingsUpdate?.(pairingsResponse.data || []);
        setManualBoardNumber('');
        setSelectedWhitePlayer('');
        setSelectedBlackPlayer('');
        setShowManualPairingModal(false);
        alert('Manual pairing added successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to add manual pairing');
      }
    } catch (error: any) {
      console.error('Failed to add manual pairing:', error);
      alert(`Failed to add manual pairing: ${error.message}`);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (pairingId: string) => {
    setDraggedPairing(pairingId);
  };

  const handleDragOver = (e: React.DragEvent, pairingId: string) => {
    e.preventDefault();
    setDragOverPairing(pairingId);
  };

  const handleDragLeave = () => {
    setDragOverPairing(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPairingId: string) => {
    e.preventDefault();
    setDragOverPairing(null);
    setDraggedPairing(null);

    if (!draggedPairing || draggedPairing === targetPairingId) return;

    const draggedPairingData = sectionPairings.find(p => p.id === draggedPairing);
    const targetPairingData = sectionPairings.find(p => p.id === targetPairingId);

    if (!draggedPairingData || !targetPairingData) return;

    try {
      // Swap players between pairings
      const response = await pairingApi.swapPairings(
        draggedPairing,
        targetPairingId
      );
      
      if (response.data.success) {
        // Refresh pairings from parent
        const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
        onPairingsUpdate?.(pairingsResponse.data || []);
        alert('Players swapped successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to swap pairings');
      }
    } catch (error: any) {
      console.error('Failed to swap pairings:', error);
      alert(`Failed to swap pairings: ${error.message}`);
    }
  };

  const addManualPairing = async () => {
    if (!newBoardNumber.trim()) {
      alert('Please enter a board number');
      return;
    }

    try {
      const response = await pairingApi.createManual(tournamentId, sectionName, currentRound, parseInt(newBoardNumber));
      if (response.data.success) {
        // Refresh pairings from parent
        const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
        onPairingsUpdate?.(pairingsResponse.data || []);
        setNewBoardNumber('');
        alert('Manual pairing added successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to add manual pairing');
      }
    } catch (error: any) {
      console.error('Failed to add manual pairing:', error);
      alert(`Failed to add manual pairing: ${error.message}`);
    }
  };



  // Complete current round
  const completeRound = async () => {
    // Check if there are any incomplete pairings (BYEs are automatically complete)
    const incompletePairings = sectionPairings.filter(p => !p.result && !p.is_bye);
    if (incompletePairings.length > 0) {
      alert(`Cannot complete round: ${incompletePairings.length} game${incompletePairings.length !== 1 ? 's' : ''} still need${incompletePairings.length === 1 ? 's' : ''} results.`);
      return;
    }
    
    try {
      setIsCompletingRound(true);
      const response = await pairingApi.completeRound(tournamentId, currentRound, sectionName);
      
      alert(response.data.message);
      
      // Notify parent of round completion
      if (response.data.nextRound) {
        onRoundComplete?.(response.data.nextRound);
      }
      
      // Refresh data
      await fetchSectionData();
      // Refresh pairings from parent
      const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
      onPairingsUpdate?.(pairingsResponse.data || []);
      
    } catch (error: any) {
      console.error('Failed to complete round:', error);
      alert(error.response?.data?.error || 'Failed to complete round');
    } finally {
      setIsCompletingRound(false);
    }
  };

  // Generate next round
  const generateNextRound = async () => {
    // Check if there are any incomplete pairings (BYEs are automatically complete)
    const incompletePairings = sectionPairings.filter(p => !p.result && !p.is_bye);
    if (incompletePairings.length > 0) {
      alert(`Cannot generate next round: ${incompletePairings.length} game${incompletePairings.length !== 1 ? 's' : ''} still need${incompletePairings.length === 1 ? 's' : ''} results.`);
      return;
    }
    
    try {
      setIsGeneratingNext(true);
      const response = await pairingApi.generateNextRound(tournamentId, sectionName);
      
      alert(response.data.message);
      
      // Refresh data
      await fetchSectionData();
      // Refresh pairings from parent
      const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
      onPairingsUpdate?.(pairingsResponse.data || []);
      
    } catch (error: any) {
      console.error('Failed to generate next round:', error);
      alert(error.response?.data?.error || 'Failed to generate next round');
    } finally {
      setIsGeneratingNext(false);
    }
  };

  // Reset section
  const resetSection = async () => {
    if (!window.confirm(`Are you sure you want to reset section "${sectionName}"? This will delete all pairings and results.`)) {
      return;
    }
    
    try {
      const response = await pairingApi.resetSection(tournamentId, sectionName);
      
      alert(response.data.message);
      
      // Refresh data
      await fetchSectionData();
      // Refresh pairings from parent
      const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
      onPairingsUpdate?.(pairingsResponse.data || []);
      
    } catch (error: any) {
      console.error('Failed to reset section:', error);
      alert(error.response?.data?.error || 'Failed to reset section');
    }
  };

  useEffect(() => {
    fetchAvailableRounds();
    fetchSectionData();
  }, [fetchAvailableRounds, fetchSectionData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading section data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Status Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{sectionName} Section</h2>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center space-x-2">
                <label htmlFor="round-select" className="text-sm font-medium text-gray-700">
                  Round:
                </label>
                <select
                  id="round-select"
                  value={currentRound}
                  onChange={(e) => {
                    const newRound = parseInt(e.target.value);
                    onRoundChange?.(newRound);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableRounds.map(round => (
                    <option key={round} value={round}>
                      Round {round}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-semibold">Keyboard shortcuts:</span> Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">W</kbd> for white win, <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">L</kbd> for black win, <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">D</kbd> for draw
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{standings.length} players</span>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">{sectionPairings.length} pairings</span>
            </div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-900">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{completedPairings.length}</div>
            <div className="text-sm text-gray-600">Games finished</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-gray-900">In Progress</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{incompletePairings.length}</div>
            <div className="text-sm text-gray-600">Games pending</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Progress</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {sectionPairings.length > 0 ? Math.round((completedPairings.length / sectionPairings.length) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          {sectionPairings.length === 0 && (
            <button
              onClick={async () => {
                if (!window.confirm(`Generate pairings for ${sectionName} section Round ${currentRound}?`)) return;
                
                try {
                  setIsLoading(true);
                  const response = await pairingApi.generateForSection(tournamentId, currentRound, sectionName);
                  
                  if (response.data.success) {
                    alert(`Successfully generated pairings for ${sectionName} section in Round ${currentRound}`);
                    await fetchSectionData();
                    await fetchAvailableRounds();
                    // Refresh pairings from parent
                    const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
                    onPairingsUpdate?.(pairingsResponse.data || []);
                  } else {
                    throw new Error(response.data.message || 'Failed to generate pairings');
                  }
                } catch (error: any) {
                  alert(`Failed to generate pairings: ${error.message}`);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Users className="h-4 w-4" />
              )}
              <span>Generate Pairings</span>
            </button>
          )}

          {sectionPairings.length > 0 && incompletePairings.length === 0 && !sectionStatus?.isComplete && (
            <button
              onClick={completeRound}
              disabled={isCompletingRound}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCompletingRound ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>Complete Round</span>
            </button>
          )}
            
          {sectionPairings.length > 0 && incompletePairings.length === 0 && !sectionStatus?.isComplete && (
            <button
              onClick={generateNextRound}
              disabled={isGeneratingNext}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingNext ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>Generate Next Round</span>
            </button>
          )}

          <button
            onClick={resetSection}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Section</span>
          </button>
        </div>

        {/* Status Messages */}
        {incompletePairings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800">
                {incompletePairings.length} game{incompletePairings.length !== 1 ? 's' : ''} still need{incompletePairings.length === 1 ? 's' : ''} results before completing the round.
              </span>
      </div>
        </div>
      )}

        {sectionStatus?.isComplete && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800">
                Section completed! All rounds finished.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pairings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {sectionName} Section - Round {currentRound} Pairings
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {sectionPairings.length} pairings for this section only
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Board</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">White</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Black</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lichess</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sectionPairings.map((pairing, index) => (
                <tr 
                  key={pairing.id} 
                  className={`hover:bg-gray-50 ${draggedPairing === pairing.id ? 'opacity-50' : ''} ${dragOverPairing === pairing.id ? 'bg-blue-100' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(pairing.id)}
                  onDragOver={(e) => handleDragOver(e, pairing.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, pairing.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center space-x-2">
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                      <span>{pairing.board || (index + 1 + boardNumberOffset)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pairing.white_name || 'TBD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pairing.is_bye ? 'BYE' : (pairing.black_name || 'TBD')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pairing.is_bye ? (
                      <span className="text-sm text-blue-600 font-medium">BYE</span>
                    ) : (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            updatePairingResult(pairing.id, e.target.value);
                          }
                        }}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                        value={pairing.result || ""}
                      >
                        <option value="">Select result</option>
                        <option value="1-0">1-0 (White wins)</option>
                        <option value="0-1">0-1 (Black wins)</option>
                        <option value="1/2-1/2">1/2-1/2 (Draw)</option>
                        <option value="1-0F">1-0F (White wins by forfeit)</option>
                        <option value="0-1F">0-1F (Black wins by forfeit)</option>
                        <option value="1/2-1/2F">1/2-1/2F (Draw by forfeit)</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pairing.is_bye ? (
                      <span className="inline-flex items-center space-x-1 text-blue-600">
                        <Clock className="h-4 w-4" />
                        <span>Full Point BYE 1.0</span>
                      </span>
                    ) : pairing.result ? (
                      <span className="inline-flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <LichessGameCreator
                      pairingId={pairing.id}
                      whitePlayer={{
                        id: pairing.white_id,
                        name: pairing.white_name,
                        lichess_username: pairing.white_lichess_username
                      }}
                      blackPlayer={{
                        id: pairing.black_id,
                        name: pairing.black_name,
                        lichess_username: pairing.black_lichess_username
                      }}
                      timeControl="G/45+15"
                      onGameCreated={(gameData) => {
                        console.log('Lichess game created:', gameData);
                        // You could update the pairing with game data here
                      }}
                      onError={(error) => {
                        console.error('Lichess game creation error:', error);
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => swapPlayers(pairing.id)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Swap players"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingPairing(pairing);
                          setNewBoardNumber(pairing.board || (index + 1).toString());
                          setShowEditModal(true);
                        }}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Edit board number"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    <button
                        onClick={() => deletePairing(pairing.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete pairing"
                      >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standings Preview */}
      {standings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Current Standings</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {standings.slice(0, 10).map((player, index) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.score || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.rating || 'Unrated'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Manual Pairing Button */}
      <div className="mt-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleOpenManualPairing}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Pairing (Select Players)</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">First Board Number:</label>
            <input
              type="number"
              value={manualFirstBoardNumber}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setManualFirstBoardNumber(value.toString());
                setBoardNumberOffset(value - 1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Manual Pairing Modal */}
      {showManualPairingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Manual Pairing</h3>
              <button
                onClick={() => setShowManualPairingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Number
                </label>
                <input
                  type="number"
                  value={manualBoardNumber}
                  onChange={(e) => setManualBoardNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  White Player
                </label>
                <select
                  value={selectedWhitePlayer}
                  onChange={(e) => setSelectedWhitePlayer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select white player...</option>
                  {availablePlayers.filter(p => p.section === sectionName || !p.section).map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.rating ? `(${player.rating})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Black Player
                </label>
                <select
                  value={selectedBlackPlayer}
                  onChange={(e) => setSelectedBlackPlayer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select black player...</option>
                  {availablePlayers.filter(p => p.section === sectionName || !p.section).map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.rating ? `(${player.rating})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowManualPairingModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={addManualPairingWithPlayers}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Add Pairing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPairing && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Board Number</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Number
                </label>
                <input
                  type="number"
                  value={newBoardNumber}
                  onChange={(e) => setNewBoardNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateBoardNumber(editingPairing.id, newBoardNumber);
                  setShowEditModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionPairingManager;