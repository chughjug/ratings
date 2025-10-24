import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Edit3, 
  Download,
  Printer,
  ExternalLink,
  Settings,
  Cog,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Pairing } from '../types';
import { pairingApi } from '../services/api';

interface RoundIndependentPairingSystemProps {
  tournament: any;
  players: any[];
  onPairingsUpdate: (newPairings: Pairing[]) => void;
  onUpdateResult: (pairingId: string, result: string) => void;
  onPrint: () => void;
  availableSections: string[];
  isLoading: boolean;
}

interface RoundStatus {
  round: number;
  totalPairings: number;
  completedPairings: number;
  pendingPairings: number;
  percentage: number;
  isComplete: boolean;
  hasPairings: boolean;
  canGenerateNextRound: boolean;
  sections: Record<string, {
    total: number;
    completed: number;
    pending: number;
    percentage: number;
    isComplete: boolean;
  }>;
}

interface TournamentPairings {
  pairingsByRound: Record<string, Pairing[]>;
  totalRounds: number;
  rounds: Array<{
    round: number;
    pairingsCount: number;
    sections: string[];
  }>;
}

const RoundIndependentPairingSystem: React.FC<RoundIndependentPairingSystemProps> = ({
  tournament,
  players,
  onPairingsUpdate,
  onUpdateResult,
  onPrint,
  availableSections,
  isLoading
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedSection, setSelectedSection] = useState(availableSections[0] || 'Open');
  const [activeTab, setActiveTab] = useState<'overview' | 'round' | 'generator'>('overview');
  const [roundStatus, setRoundStatus] = useState<Record<number, RoundStatus>>({});
  const [tournamentPairings, setTournamentPairings] = useState<TournamentPairings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all tournament pairings and round statuses
  const loadTournamentData = useCallback(async () => {
    if (!tournament?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load all pairings grouped by round
      const pairingsResponse = await pairingApi.getAllByTournament(tournament.id);
      if (pairingsResponse.data.success) {
        setTournamentPairings(pairingsResponse.data);
      }

      // Load status for all rounds
      const statusResponse = await pairingApi.getAllRoundsStatus(tournament.id);
      if (statusResponse.data.success) {
        setRoundStatus(statusResponse.data.roundsStatus);
      }
    } catch (err) {
      console.error('Failed to load tournament data:', err);
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  }, [tournament?.id]);

  // Load data on mount and when tournament changes
  useEffect(() => {
    loadTournamentData();
  }, [loadTournamentData]);

  // Get current round pairings
  const currentRoundPairings = tournamentPairings?.pairingsByRound[currentRound.toString()] || [];
  const currentRoundStatus = roundStatus[currentRound];

  // Filter pairings by selected section
  const sectionPairings = currentRoundPairings.filter(pairing => 
    (pairing.section || 'Open') === selectedSection
  );

  // Handle round change
  const handleRoundChange = (round: number) => {
    if (round >= 1 && round <= (tournament?.rounds || 5)) {
      setCurrentRound(round);
    }
  };

  // Handle section change
  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
  };

  // Generate pairings for current round
  const handleGeneratePairings = async (clearExisting: boolean = false) => {
    if (!tournament?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await pairingApi.generate(tournament.id, currentRound, clearExisting);
      if (response.data.success) {
        // Reload tournament data to get updated pairings
        await loadTournamentData();
        onPairingsUpdate(response.data.pairings);
      } else {
        setError(response.data.message || 'Failed to generate pairings');
      }
    } catch (err) {
      console.error('Failed to generate pairings:', err);
      setError('Failed to generate pairings');
    } finally {
      setLoading(false);
    }
  };

  // Generate pairings for specific section
  const handleGenerateSectionPairings = async (sectionName: string) => {
    if (!tournament?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await pairingApi.generateForSection(tournament.id, currentRound, sectionName);
      if (response.data.success) {
        await loadTournamentData();
      } else {
        setError(response.data.error || 'Failed to generate section pairings');
      }
    } catch (err) {
      console.error('Failed to generate section pairings:', err);
      setError('Failed to generate section pairings');
    } finally {
      setLoading(false);
    }
  };

  // Reset pairings for current round
  const handleResetPairings = async () => {
    if (!tournament?.id) return;
    
    if (!window.confirm(`Are you sure you want to reset all pairings for Round ${currentRound}?`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await pairingApi.resetPairings(tournament.id, currentRound);
      await loadTournamentData();
    } catch (err) {
      console.error('Failed to reset pairings:', err);
      setError('Failed to reset pairings');
    } finally {
      setLoading(false);
    }
  };

  // Update result with refresh
  const handleUpdateResult = async (pairingId: string, result: string) => {
    try {
      await onUpdateResult(pairingId, result);
      // Refresh round status after updating result
      setTimeout(() => {
        loadTournamentData();
      }, 500);
    } catch (err) {
      console.error('Failed to update result:', err);
      setError('Failed to update result');
    }
  };

  const getResultButtonClass = (result: string, currentResult?: string) => {
    const baseClass = "px-2 py-1 text-xs font-medium rounded transition-colors";
    const isSelected = currentResult === result;
    
    switch (result) {
      case '1-0':
        return `${baseClass} ${isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`;
      case '0-1':
        return `${baseClass} ${isSelected ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`;
      case '1/2-1/2':
        return `${baseClass} ${isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`;
      case '1-0F':
        return `${baseClass} ${isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`;
      case '0-1F':
        return `${baseClass} ${isSelected ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`;
      case '1/2-1/2F':
        return `${baseClass} ${isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`;
      default:
        return `${baseClass} ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Users className="h-4 w-4 mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('round')}
              className={`${
                activeTab === 'round'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Round {currentRound}
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`${
                activeTab === 'generator'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Cog className="h-4 w-4 mr-2" />
              Generator
            </button>
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Round Status Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Round Status Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(roundStatus).map(([round, status]) => (
                <div key={round} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Round {round}</h4>
                    <div className="flex items-center space-x-2">
                      {status.isComplete ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : status.hasPairings ? (
                        <Pause className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Play className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {status.totalPairings} pairings • {status.completedPairings} completed
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        status.isComplete ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${status.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {status.percentage}% complete
                  </div>
                  <div className="mt-2 flex space-x-1">
                    <button
                      onClick={() => {
                        setCurrentRound(parseInt(round));
                        setActiveTab('round');
                      }}
                      className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                    >
                      View
                    </button>
                    {!status.hasPairings && (
                      <button
                        onClick={() => handleGeneratePairings(false)}
                        disabled={loading}
                        className="flex-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 disabled:opacity-50"
                      >
                        Generate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Round Tab */}
      {activeTab === 'round' && (
        <div className="space-y-6">
          {/* Round Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Round {currentRound} Pairings
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRoundChange(currentRound - 1)}
                    disabled={currentRound <= 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                    Round {currentRound}
                  </span>
                  <button
                    onClick={() => handleRoundChange(currentRound + 1)}
                    disabled={currentRound >= (tournament?.rounds || 5)}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedSection}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableSections.map(section => (
                    <option key={section} value={section}>
                      {section} Section
                    </option>
                  ))}
                </select>
                <button
                  onClick={onPrint}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Round Status */}
            {currentRoundStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">{currentRoundStatus.completedPairings}</span> of{' '}
                      <span className="font-medium">{currentRoundStatus.totalPairings}</span> completed
                    </div>
                    <div className="text-sm text-blue-600">
                      {currentRoundStatus.percentage}% complete
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleGeneratePairings(false)}
                      disabled={loading || currentRoundStatus.hasPairings}
                      className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      <span>Generate</span>
                    </button>
                    <button
                      onClick={() => handleGeneratePairings(true)}
                      disabled={loading}
                      className="flex items-center space-x-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Regenerate</span>
                    </button>
                    <button
                      onClick={handleResetPairings}
                      disabled={loading}
                      className="flex items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentRoundStatus.isComplete ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${currentRoundStatus.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Pairings Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {sectionPairings.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Pairings Yet</h4>
                <p className="text-gray-500 mb-6">
                  Generate pairings for Round {currentRound} to get started.
                </p>
                <button
                  onClick={() => handleGeneratePairings(false)}
                  disabled={loading}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  <span>Generate Pairings</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Board
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        White Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Black Player
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sectionPairings.map((pairing) => (
                      <tr key={pairing.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {pairing.board}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{pairing.white_name || 'TBD'}</span>
                            {pairing.white_rating && (
                              <span className="text-xs text-gray-500">({pairing.white_rating})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{pairing.black_name || 'TBD'}</span>
                            {pairing.black_rating && (
                              <span className="text-xs text-gray-500">({pairing.black_rating})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex space-x-1 justify-center">
                            <button
                              onClick={() => handleUpdateResult(pairing.id, '1-0')}
                              className={getResultButtonClass('1-0', pairing.result)}
                              title="White wins"
                            >
                              1-0
                            </button>
                            <button
                              onClick={() => handleUpdateResult(pairing.id, '0-1')}
                              className={getResultButtonClass('0-1', pairing.result)}
                              title="Black wins"
                            >
                              0-1
                            </button>
                            <button
                              onClick={() => handleUpdateResult(pairing.id, '1/2-1/2')}
                              className={getResultButtonClass('1/2-1/2', pairing.result)}
                              title="Draw"
                            >
                              ½-½
                            </button>
                            <button
                              onClick={() => handleUpdateResult(pairing.id, '1-0F')}
                              className={getResultButtonClass('1-0F', pairing.result)}
                              title="White wins by forfeit"
                            >
                              1-0F
                            </button>
                            <button
                              onClick={() => handleUpdateResult(pairing.id, '0-1F')}
                              className={getResultButtonClass('0-1F', pairing.result)}
                              title="Black wins by forfeit"
                            >
                              0-1F
                            </button>
                            <button
                              onClick={() => handleUpdateResult(pairing.id, '1/2-1/2F')}
                              className={getResultButtonClass('1/2-1/2F', pairing.result)}
                              title="Draw by forfeit"
                            >
                              ½-½F
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generator Tab */}
      {activeTab === 'generator' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Generator</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Generate Round {currentRound}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Generate pairings for the current round using the enhanced pairing system.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleGeneratePairings(false)}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    <span>Generate</span>
                  </button>
                  <button
                    onClick={() => handleGeneratePairings(true)}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Section-Specific Generation</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Generate pairings for individual sections independently.
                </p>
                <div className="space-y-2">
                  {availableSections.map(section => (
                    <button
                      key={section}
                      onClick={() => handleGenerateSectionPairings(section)}
                      disabled={loading}
                      className="w-full flex items-center justify-between px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
                    >
                      <span>{section} Section</span>
                      <Play className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundIndependentPairingSystem;
