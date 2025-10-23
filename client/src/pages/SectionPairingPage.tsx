import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  RefreshCw,
  Printer,
  ExternalLink
} from 'lucide-react';
import { Pairing } from '../types';
import { pairingApi } from '../services/api';

interface SectionPairingPageProps {
  tournament?: any;
  players?: any[];
  pairings?: Pairing[];
  currentRound?: number;
  onRoundChange?: (round: number) => void;
  onPairingsUpdate?: (newPairings: Pairing[]) => void;
  onCompleteRound?: () => void;
  onResetPairings?: () => void;
  onPrint?: () => void;
  onGeneratePairingsForSection?: (sectionName: string) => void;
  onResetPairingsForSection?: (sectionName: string) => void;
  onUpdateResult?: (pairingId: string, result: string) => void;
  availableSections?: string[];
  isLoading?: boolean;
}

const SectionPairingPage: React.FC<SectionPairingPageProps> = ({
  tournament: propTournament,
  players: propPlayers,
  pairings: propPairings,
  currentRound: propCurrentRound,
  onRoundChange: propOnRoundChange,
  onPairingsUpdate: propOnPairingsUpdate,
  onCompleteRound: propOnCompleteRound,
  onResetPairings: propOnResetPairings,
  onPrint: propOnPrint,
  onGeneratePairingsForSection: propOnGeneratePairingsForSection,
  onResetPairingsForSection: propOnResetPairingsForSection,
  onUpdateResult: propOnUpdateResult,
  availableSections: propAvailableSections,
  isLoading: propIsLoading
}) => {
  const { tournamentId, sectionName } = useParams<{ tournamentId: string; sectionName: string }>();
  const navigate = useNavigate();
  
  // State for standalone mode (when accessed via URL)
  const [tournament, setTournament] = useState(propTournament);
  const [players, setPlayers] = useState(propPlayers || []);
  const [pairings, setPairings] = useState(propPairings || []);
  const [currentRound, setCurrentRound] = useState(propCurrentRound || 1);
  const [availableSections, setAvailableSections] = useState(propAvailableSections || []);
  const [selectedSection, setSelectedSection] = useState(sectionName || 'Open');
  const [isLoading, setIsLoading] = useState(propIsLoading || false);

  // Load data if in standalone mode
  useEffect(() => {
    if (tournamentId && !propTournament) {
      loadTournamentData();
    }
  }, [tournamentId, propTournament]);

  // Update selected section when URL changes
  useEffect(() => {
    if (sectionName) {
      setSelectedSection(sectionName);
    }
  }, [sectionName]);

  const loadTournamentData = async () => {
    if (!tournamentId) return;
    
    setIsLoading(true);
    try {
      // Load tournament, players, and pairings data
      // This would typically make API calls
      console.log('Loading tournament data for:', tournamentId);
      // For now, we'll use empty data - in a real implementation, you'd fetch from API
    } catch (error) {
      console.error('Failed to load tournament data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSectionChange = (newSection: string) => {
    setSelectedSection(newSection);
    if (tournamentId) {
      navigate(`/tournaments/${tournamentId}/pairings/${newSection}`);
    }
  };

  const handleRoundChange = (round: number) => {
    setCurrentRound(round);
    if (propOnRoundChange) {
      propOnRoundChange(round);
    }
  };

  const updateResult = async (pairingId: string, result: string) => {
    try {
      if (propOnUpdateResult) {
        await propOnUpdateResult(pairingId, result);
      } else {
        // Fallback to local state update
        const updatedPairings = pairings.map(p => 
          p.id === pairingId ? { ...p, result } : p
        );
        setPairings(updatedPairings);
        if (propOnPairingsUpdate) {
          propOnPairingsUpdate(updatedPairings);
        }
      }
    } catch (error) {
      console.error('Failed to update result:', error);
    }
  };

  const generatePairingsForSection = async (sectionName: string) => {
    try {
      if (propOnGeneratePairingsForSection) {
        await propOnGeneratePairingsForSection(sectionName);
      } else {
        // Fallback to API call
        console.log('Generating pairings for section:', sectionName);
      }
    } catch (error: any) {
      console.error('Failed to generate pairings for section:', error);
      alert(`Failed to generate pairings for section "${sectionName}". Please check the console for details.`);
    }
  };

  const resetPairingsForSection = async (sectionName: string) => {
    try {
      if (propOnResetPairingsForSection) {
        await propOnResetPairingsForSection(sectionName);
      } else {
        console.log('Resetting pairings for section:', sectionName);
      }
    } catch (error) {
      console.error('Failed to reset pairings for section:', error);
    }
  };

  // Filter pairings by current round and selected section
  const currentRoundPairings = pairings.filter(pairing => 
    pairing.round === currentRound && (pairing.section || 'Open') === selectedSection
  );

  // Check if section is ready for next round
  const isSectionReadyForNextRound = () => {
    return currentRoundPairings.length > 0 && currentRoundPairings.every(pairing => 
      pairing.result && pairing.result !== 'TBD'
    );
  };

  // Get completion stats
  const getCompletionStats = () => {
    const totalPairings = currentRoundPairings.length;
    const completedPairings = currentRoundPairings.filter(p => p.result && p.result !== 'TBD').length;
    const percentage = totalPairings > 0 ? Math.round((completedPairings / totalPairings) * 100) : 0;
    return { totalPairings, completedPairings, percentage };
  };

  const stats = getCompletionStats();

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold text-gray-900">
                {tournament?.name || 'Tournament'} - {selectedSection} Section
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Section:</label>
                <select
                  value={selectedSection}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableSections.map(section => (
                    <option key={section} value={section}>
                      {section === 'all' ? 'All Sections' : `${section} Section`}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => propOnPrint && propOnPrint()}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Round Navigation */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Round {currentRound} Pairings
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRoundChange(currentRound - 1)}
                    disabled={currentRound <= 1}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Prev</span>
                  </button>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md font-medium">
                    Round {currentRound}
                  </span>
                  <button
                    onClick={() => handleRoundChange(currentRound + 1)}
                    disabled={currentRound >= (tournament?.total_rounds || 5)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => resetPairingsForSection(selectedSection)}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={() => generatePairingsForSection(selectedSection)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      <span>Generate</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {stats.totalPairings > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Results Progress</span>
                  <span>{stats.completedPairings} of {stats.totalPairings} completed ({stats.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${stats.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Pairings Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {currentRoundPairings.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Pairings Yet</h4>
                <p className="text-gray-500 mb-4">
                  Click "Generate" to create pairings for this section.
                </p>
                <button
                  onClick={() => generatePairingsForSection(selectedSection)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Generate {selectedSection} Section
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Board
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        White Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Black Player
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentRoundPairings.map((pairing) => (
                      <tr key={pairing.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pairing.board}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">{pairing.white_name || 'TBD'}</span>
                            {pairing.white_rating && (
                              <span className="text-xs text-gray-500">({pairing.white_rating})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">{pairing.black_name || 'TBD'}</span>
                            {pairing.black_rating && (
                              <span className="text-xs text-gray-500">({pairing.black_rating})</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex space-x-1 justify-center">
                            <button
                              onClick={() => updateResult(pairing.id, '1-0')}
                              className={getResultButtonClass('1-0', pairing.result)}
                              title="White wins"
                            >
                              1-0
                            </button>
                            <button
                              onClick={() => updateResult(pairing.id, '0-1')}
                              className={getResultButtonClass('0-1', pairing.result)}
                              title="Black wins"
                            >
                              0-1
                            </button>
                            <button
                              onClick={() => updateResult(pairing.id, '1/2-1/2')}
                              className={getResultButtonClass('1/2-1/2', pairing.result)}
                              title="Draw"
                            >
                              ½-½
                            </button>
                            <button
                              onClick={() => updateResult(pairing.id, '1-0F')}
                              className={getResultButtonClass('1-0F', pairing.result)}
                              title="White wins by forfeit"
                            >
                              1-0F
                            </button>
                            <button
                              onClick={() => updateResult(pairing.id, '0-1F')}
                              className={getResultButtonClass('0-1F', pairing.result)}
                              title="Black wins by forfeit"
                            >
                              0-1F
                            </button>
                            <button
                              onClick={() => updateResult(pairing.id, '1/2-1/2F')}
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

          {/* Complete Round Button */}
          {stats.percentage === 100 && stats.totalPairings > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">All results submitted!</span>
                </div>
                <button
                  onClick={() => propOnCompleteRound && propOnCompleteRound()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Complete Round {currentRound}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionPairingPage;