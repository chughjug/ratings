import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Clock, Play, RotateCcw, Users, Trophy, Settings } from 'lucide-react';
import { pairingApi } from '../services/api';

interface SectionPairingManagerProps {
  tournamentId: string;
  sectionName: string;
  currentRound: number;
  onRoundComplete?: (nextRound: number) => void;
  onPairingsUpdate?: (pairings: any[]) => void;
}

const SectionPairingManager: React.FC<SectionPairingManagerProps> = ({
  tournamentId,
  sectionName,
  currentRound,
  onRoundComplete,
  onPairingsUpdate
}) => {
  const [pairings, setPairings] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sectionStatus, setSectionStatus] = useState<any>(null);
  const [isCompletingRound, setIsCompletingRound] = useState(false);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const selectedPairingRef = useRef<string | null>(null);
  const resultSelectRefs = useRef<{ [key: string]: HTMLSelectElement | null }>({});

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

    // Find the first incomplete pairing
    const incompletePairings = pairings.filter(p => !p.result);
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
  }, [pairings]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Fetch section data
  const fetchSectionData = useCallback(async () => {
    if (!tournamentId || !sectionName) return;
    
    try {
      setIsLoading(true);
      
      // Fetch pairings for current round
      const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, sectionName);
      setPairings(pairingsResponse.data || []);
      
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
  }, [tournamentId, sectionName, currentRound]);

  // Update pairing result
  const updatePairingResult = async (pairingId: string, result: string) => {
    try {
      console.log('🎯 SectionPairingManager: Updating result for pairing:', pairingId, 'result:', result);
      const response = await pairingApi.updateResult(pairingId, result);
      console.log('✅ SectionPairingManager: Result update response:', response);
      
      // Update local state immediately without full refresh
      const updatedPairings = pairings.map(p => 
        p.id === pairingId ? { ...p, result } : p
      );
      setPairings(updatedPairings);
      
      // Notify parent of pairings update
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
  };

  // Complete current round
  const completeRound = async () => {
    // Check if there are any incomplete pairings
    const incompletePairings = pairings.filter(p => !p.result);
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
      
    } catch (error: any) {
      console.error('Failed to complete round:', error);
      alert(error.response?.data?.error || 'Failed to complete round');
    } finally {
      setIsCompletingRound(false);
    }
  };

  // Generate next round
  const generateNextRound = async () => {
    // Check if there are any incomplete pairings
    const incompletePairings = pairings.filter(p => !p.result);
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
      
    } catch (error: any) {
      console.error('Failed to reset section:', error);
      alert(error.response?.data?.error || 'Failed to reset section');
    }
  };

  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading section data...</span>
      </div>
    );
  }

  const incompletePairings = pairings.filter(p => !p.result);
  const completedPairings = pairings.filter(p => p.result);

  return (
    <div className="space-y-6">
      {/* Section Status Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{sectionName} Section</h2>
            <p className="text-gray-600">Round {currentRound}</p>
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
              <span className="text-sm text-gray-600">{pairings.length} pairings</span>
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
              {pairings.length > 0 ? Math.round((completedPairings.length / pairings.length) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          {pairings.length > 0 && incompletePairings.length === 0 && !sectionStatus?.isComplete && (
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

          {pairings.length > 0 && incompletePairings.length === 0 && !sectionStatus?.isComplete && (
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
          <h3 className="text-lg font-semibold text-gray-900">Round {currentRound} Pairings</h3>
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pairings.map((pairing, index) => (
                <tr key={pairing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pairing.board || index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pairing.white_name || 'TBD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {pairing.black_name || 'TBD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pairing.result ? (
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
    </div>
  );
};

export default SectionPairingManager;