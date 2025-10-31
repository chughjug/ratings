import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Clock, Play, RotateCcw, Users, Trophy, Settings, Plus, ArrowUpDown, Trash2, Edit3, X, GripVertical } from 'lucide-react';
import { pairingApi, tournamentApi } from '../services/api';
import SendPairingEmailsButton from './SendPairingEmailsButton';

interface TeamTournamentPairingManagerProps {
  tournamentId: string;
  currentRound: number;
  pairings: any[];
  onRoundComplete?: (nextRound: number) => void;
  onPairingsUpdate?: (pairings: any[]) => void;
  onRoundChange?: (round: number) => void;
  tournament?: any;
}

interface TeamMatch {
  matchName: string;
  team1Name: string;
  team2Name: string | null;
  pairings: any[];
  isBye: boolean;
}

const TeamTournamentPairingManager: React.FC<TeamTournamentPairingManagerProps> = ({
  tournamentId,
  currentRound,
  pairings,
  onRoundComplete,
  onPairingsUpdate,
  onRoundChange,
  tournament
}) => {
  const [standings, setStandings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompletingRound, setIsCompletingRound] = useState(false);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [availableRounds, setAvailableRounds] = useState<number[]>([1]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const selectedPairingRef = useRef<string | null>(null);
  
  // Filter pairings for current round
  const roundPairings = pairings.filter(p => p.round === currentRound);
  
  // Group pairings by team match (section field contains match name like "Team1 vs Team2")
  const teamMatches: TeamMatch[] = React.useMemo(() => {
    const matchMap = new Map<string, TeamMatch>();
    
    roundPairings.forEach(pairing => {
      const matchName = pairing.section || 'Unnamed Match';
      
      // Parse team names from section (format: "Team1 vs Team2" or "Team1 vs BYE")
      let team1Name = matchName;
      let team2Name: string | null = null;
      const isBye = matchName.includes('BYE') || !pairing.black_player_id;
      
      if (matchName.includes(' vs ')) {
        const parts = matchName.split(' vs ');
        team1Name = parts[0].trim();
        team2Name = parts[1]?.trim() || null;
      }
      
      if (!matchMap.has(matchName)) {
        matchMap.set(matchName, {
          matchName,
          team1Name,
          team2Name,
          pairings: [],
          isBye
        });
      }
      
      matchMap.get(matchName)!.pairings.push(pairing);
    });
    
    // Sort pairings within each match by board number
    matchMap.forEach(match => {
      match.pairings.sort((a, b) => (a.board || 1) - (b.board || 1));
    });
    
    return Array.from(matchMap.values());
  }, [roundPairings]);

  // Calculate match statistics
  // For team tournaments: White player = Team 1, Black player = Team 2
  const getMatchStats = (match: TeamMatch) => {
    const completedBoards = match.pairings.filter(p => p.result || p.is_bye).length;
    const totalBoards = match.pairings.length;
    
    // Team 1 score (white players)
    const team1Score = match.pairings.reduce((score, p) => {
      if (!p.result && !p.is_bye) return score;
      // Bye: white player (Team 1) gets full point
      if (p.is_bye && p.white_player_id) return score + 1;
      // White win: Team 1 gets 1 point
      if (p.result === '1-0') return score + 1;
      // White loss: Team 1 gets 0 points
      if (p.result === '0-1') return score + 0;
      // Draw: Team 1 gets 0.5 points
      if (p.result === '1/2-1/2') return score + 0.5;
      return score;
    }, 0);
    
    // Team 2 score (black players)
    const team2Score = match.pairings.reduce((score, p) => {
      if (!p.result && !p.is_bye) return score;
      // Bye: Team 2 doesn't exist, score stays 0
      if (p.is_bye) return score + 0;
      // White win: Team 2 gets 0 points
      if (p.result === '1-0') return score + 0;
      // Black win: Team 2 gets 1 point
      if (p.result === '0-1') return score + 1;
      // Draw: Team 2 gets 0.5 points
      if (p.result === '1/2-1/2') return score + 0.5;
      return score;
    }, 0);
    
    return {
      completedBoards,
      totalBoards,
      team1Score,
      team2Score: match.isBye ? 0 : team2Score,
      isComplete: completedBoards === totalBoards
    };
  };

  // Calculate overall round statistics
  const roundStats = React.useMemo(() => {
    const completedMatches = teamMatches.filter(m => getMatchStats(m).isComplete).length;
    const totalMatches = teamMatches.length;
    const totalBoards = roundPairings.length;
    const completedBoards = roundPairings.filter(p => p.result || p.is_bye).length;
    
    return {
      completedMatches,
      totalMatches,
      completedBoards,
      totalBoards,
      progress: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0
    };
  }, [teamMatches, roundPairings]);

  // Fetch available rounds
  const fetchAvailableRounds = useCallback(async () => {
    if (!tournamentId) return;
    
    try {
      // Use getAllByTournament which returns pairings grouped by round
      const response = await pairingApi.getAllByTournament(tournamentId);
      const pairingsByRound = response.data?.pairingsByRound || {};
      const rounds = Object.keys(pairingsByRound)
        .map(r => parseInt(r))
        .filter(r => !isNaN(r))
        .sort((a, b) => a - b);
      setAvailableRounds(rounds.length > 0 ? rounds : [currentRound]);
    } catch (error) {
      console.error('Error fetching available rounds:', error);
      setAvailableRounds([currentRound]);
    }
  }, [tournamentId, currentRound]);

  useEffect(() => {
    fetchAvailableRounds();
  }, [fetchAvailableRounds]);

  // Update pairing result
  const updatePairingResult = useCallback(async (pairingId: string, result: string) => {
    try {
      console.log('Updating result for pairing:', pairingId, 'result:', result);
      const response = await pairingApi.updateResult(pairingId, result);
      
      // Update parent's pairings state
      const updatedPairings = pairings.map(p => 
        p.id === pairingId ? { ...p, result } : p
      );
      onPairingsUpdate?.(updatedPairings);
      
      // Refresh standings
      const standingsResponse = await pairingApi.getStandings(tournamentId, true, true);
      setStandings(standingsResponse.data.data || []);
      
    } catch (error) {
      console.error('Failed to update result:', error);
      alert(`Failed to update result: ${error}`);
    }
  }, [tournamentId, pairings, onPairingsUpdate]);

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    const incompletePairings = roundPairings.filter(p => !p.result && !p.is_bye);
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
      
      const currentIndex = incompletePairings.findIndex(p => p.id === targetPairing.id);
      const nextIndex = currentIndex + 1;
      if (nextIndex < incompletePairings.length) {
        selectedPairingRef.current = incompletePairings[nextIndex].id;
      } else {
        selectedPairingRef.current = null;
      }
    }
  }, [roundPairings, updatePairingResult]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Generate pairings for current round
  const handleGeneratePairings = async () => {
    if (!tournamentId) return;
    
    if (!window.confirm(`Generate pairings for Round ${currentRound}?`)) return;
    
    try {
      setIsGeneratingNext(true);
      const response = await pairingApi.generateTeamSwiss(tournamentId, currentRound);
      
      if (response.data.success) {
        alert(`Successfully generated pairings for Round ${currentRound}`);
        // Refresh pairings
        if (onPairingsUpdate) {
          // Fetch updated pairings - we'll need to refetch from parent
          window.location.reload(); // Simple refresh for now
        }
      } else {
        throw new Error(response.data.error || response.data.message || 'Failed to generate pairings');
      }
    } catch (error: any) {
      alert(`Failed to generate pairings: ${error.response?.data?.error || error.message || error}`);
    } finally {
      setIsGeneratingNext(false);
    }
  };

  // Generate next round pairings
  const handleGenerateNextRound = async () => {
    if (!tournamentId) return;
    
    const nextRound = currentRound + 1;
    if (nextRound > (tournament?.rounds || 1)) {
      alert('This is the final round');
      return;
    }
    
    if (!window.confirm(`Generate pairings for Round ${nextRound}?`)) return;
    
    try {
      setIsGeneratingNext(true);
      const response = await pairingApi.generateTeamSwiss(tournamentId, nextRound);
      
      if (response.data.success) {
        alert(`Successfully generated pairings for Round ${nextRound}`);
        onRoundChange?.(nextRound);
        onRoundComplete?.(nextRound);
      } else {
        throw new Error(response.data.error || response.data.message || 'Failed to generate pairings');
      }
    } catch (error: any) {
      alert(`Failed to generate pairings: ${error.response?.data?.error || error.message || error}`);
    } finally {
      setIsGeneratingNext(false);
    }
  };

  // Reset round
  const handleResetRound = async () => {
    if (!window.confirm('Are you sure you want to reset this round? All results will be deleted.')) return;
    
    try {
      setIsLoading(true);
      await pairingApi.resetPairings(tournamentId, currentRound);
      onPairingsUpdate?.(pairings.filter(p => p.round !== currentRound));
      alert('Round reset successfully');
    } catch (error: any) {
      alert(`Failed to reset round: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getResultDisplay = (result: string | null, isBye: boolean) => {
    if (isBye) return <span className="text-gray-500 italic">BYE</span>;
    if (!result) return <span className="text-gray-400">-</span>;
    return <span className="font-medium">{result}</span>;
  };

  const getResultColor = (result: string | null) => {
    if (!result) return 'bg-gray-50 hover:bg-gray-100';
    if (result === '1-0') return 'bg-white hover:bg-gray-50';
    if (result === '0-1') return 'bg-gray-50 hover:bg-gray-100';
    if (result === '1/2-1/2') return 'bg-yellow-50 hover:bg-yellow-100';
    return 'bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* Round Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Team Tournament Pairings</h2>
            <select
              value={currentRound}
              onChange={(e) => onRoundChange?.(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableRounds.map(round => (
                <option key={round} value={round}>Round {round}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetRound}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Round</span>
            </button>
            {teamMatches.length === 0 ? (
              <button
                onClick={handleGeneratePairings}
                disabled={isGeneratingNext}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>Generate Pairings</span>
              </button>
            ) : currentRound < (tournament?.rounds || 1) && (
              <button
                onClick={handleGenerateNextRound}
                disabled={isGeneratingNext || roundStats.progress < 100}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>Generate Next Round</span>
              </button>
            )}
            {tournament && (
              <SendPairingEmailsButton
                tournamentId={tournamentId}
                round={currentRound}
              />
            )}
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Completed Matches</span>
              </div>
              <span className="text-2xl font-bold text-green-900">{roundStats.completedMatches}/{roundStats.totalMatches}</span>
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">In Progress</span>
              </div>
              <span className="text-2xl font-bold text-orange-900">{roundStats.totalMatches - roundStats.completedMatches}</span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Progress</span>
              </div>
              <span className="text-2xl font-bold text-blue-900">{Math.round(roundStats.progress)}%</span>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Total Teams</span>
              </div>
              <span className="text-2xl font-bold text-purple-900">{roundStats.totalMatches}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p className="font-medium mb-1">Keyboard Shortcuts:</p>
          <p>Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">W</kbd> for white win, <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">L</kbd> for black win, <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">D</kbd> for draw</p>
        </div>
      </div>

      {/* Team Matches */}
      {teamMatches.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Matches</h3>
          <p className="text-gray-600">
            Generate pairings to create team matches for this round.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {teamMatches.map((match) => {
            const stats = getMatchStats(match);
            return (
              <div
                key={match.matchName}
                className={`bg-white rounded-lg shadow-sm border-2 ${
                  stats.isComplete ? 'border-green-200 bg-green-50' : 'border-gray-200'
                } overflow-hidden`}
              >
                {/* Match Header */}
                <div
                  className={`px-6 py-4 border-b ${
                    stats.isComplete ? 'bg-green-100 border-green-200' : 'bg-gray-50 border-gray-200'
                  } cursor-pointer hover:bg-opacity-80 transition-colors`}
                  onClick={() => setSelectedMatch(selectedMatch === match.matchName ? null : match.matchName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {match.team1Name} {match.isBye ? 'vs BYE' : `vs ${match.team2Name || 'TBD'}`}
                      </h3>
                      {stats.isComplete && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.team1Score}</div>
                        <div className="text-xs text-gray-500">Team 1</div>
                      </div>
                      <div className="text-gray-400">-</div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stats.team2Score || (match.isBye ? 0 : '-')}</div>
                        <div className="text-xs text-gray-500">Team 2</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {stats.completedBoards}/{stats.totalBoards} boards
                      </div>
                    </div>
                  </div>
                </div>

                {/* Board-by-Board Pairings */}
                {selectedMatch === match.matchName && (
                  <div className="p-6">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Board
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team 1 Player (White)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team 2 Player (Black)
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Result
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {match.pairings.map((pairing) => (
                          <tr
                            key={pairing.id}
                            className={`${getResultColor(pairing.result)} transition-colors cursor-pointer`}
                            onClick={() => {
                              if (!pairing.result && !pairing.is_bye) {
                                selectedPairingRef.current = pairing.id;
                              }
                            }}
                          >
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              Board {pairing.board || 1}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {pairing.white_name || pairing.white_player_name || 'TBD'}
                              {pairing.white_rating && (
                                <span className="ml-2 text-gray-500">({pairing.white_rating})</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {pairing.is_bye ? (
                                <span className="text-gray-500 italic">BYE</span>
                              ) : (
                                <>
                                  {pairing.black_name || pairing.black_player_name || 'TBD'}
                                  {pairing.black_rating && (
                                    <span className="ml-2 text-gray-500">({pairing.black_rating})</span>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              {pairing.is_bye ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  1-0F
                                </span>
                              ) : pairing.result ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {getResultDisplay(pairing.result, false)}
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectedPairingRef.current = pairing.id;
                                    // Quick result entry
                                    const result = prompt('Enter result (1-0, 0-1, or 1/2-1/2):');
                                    if (result && ['1-0', '0-1', '1/2-1/2'].includes(result)) {
                                      updatePairingResult(pairing.id, result);
                                    }
                                  }}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  Enter Result
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamTournamentPairingManager;

