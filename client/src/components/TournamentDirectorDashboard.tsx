import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Trophy, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Play, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  User,
  Award,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { tournamentApi, pairingApi } from '../services/api';
import '../styles/pairing-system.css';

interface Player {
  id: string;
  name: string;
  rating?: number;
  uscf_id?: string;
  points: number;
  section: string;
  status: string;
  roundResults: { [round: number]: any };
  tiebreakers: any;
}

interface Section {
  name: string;
  currentRound: number;
  totalRounds: number;
  players: Player[];
  pairings: any[];
  isComplete: boolean;
  hasIncompleteResults: boolean;
  canGenerateNext: boolean;
}

interface TournamentDirectorDashboardProps {
  tournamentId: string;
  onSectionSelect?: (sectionName: string) => void;
}

const TournamentDirectorDashboard: React.FC<TournamentDirectorDashboardProps> = ({
  tournamentId,
  onSectionSelect
}) => {
  const { tournament, refreshTournament } = useTournament();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pairings' | 'standings' | 'settings'>('overview');

  // Load tournament data
  const loadTournamentData = useCallback(async () => {
    if (!tournamentId) return;
    
    setIsLoading(true);
    try {
      const [tournamentData, sectionsData] = await Promise.all([
        tournamentApi.getTournament(tournamentId),
        tournamentApi.getSections(tournamentId)
      ]);

      const sectionsWithData = await Promise.all(
        sectionsData.map(async (section: any) => {
          const [players, pairings] = await Promise.all([
            tournamentApi.getPlayers(tournamentId, section.name),
            pairingApi.getPairings(tournamentId, section.name)
          ]);

          // Calculate player points and standings
          const playersWithPoints = players.map((player: Player) => {
            let totalPoints = 0;
            const roundResults: { [round: number]: any } = {};
            
            // Calculate points from pairings
            pairings.forEach((pairing: any) => {
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

            return {
              ...player,
              points: totalPoints,
              roundResults
            };
          });

          // Sort players by points and rating
          const sortedPlayers = playersWithPoints.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return (b.rating || 0) - (a.rating || 0);
          });

          // Add rank
          sortedPlayers.forEach((player, index) => {
            player.rank = index + 1;
          });

          const currentRound = Math.max(...pairings.map((p: any) => p.round), 0) + 1;
          const isComplete = currentRound > tournamentData.rounds;
          const hasIncompleteResults = pairings.some((p: any) => !p.result);
          const canGenerateNext = !isComplete && pairings.length > 0;

          return {
            name: section.name,
            currentRound,
            totalRounds: tournamentData.rounds,
            players: sortedPlayers,
            pairings,
            isComplete,
            hasIncompleteResults,
            canGenerateNext
          };
        })
      );

      setSections(sectionsWithData);
      if (sectionsWithData.length > 0 && !selectedSection) {
        setSelectedSection(sectionsWithData[0].name);
      }
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, selectedSection]);

  useEffect(() => {
    loadTournamentData();
  }, [loadTournamentData]);

  // Generate next round for a section
  const generateNextRound = async (sectionName: string) => {
    setIsLoading(true);
    try {
      const section = sections.find(s => s.name === sectionName);
      if (!section) return;

      const round = section.currentRound;
      await pairingApi.generateNextRound(tournamentId, sectionName, round);
      await loadTournamentData();
    } catch (error) {
      console.error('Error generating next round:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete round for a section
  const completeRound = async (sectionName: string) => {
    setIsLoading(true);
    try {
      await pairingApi.completeRound(tournamentId, sectionName);
      await loadTournamentData();
    } catch (error) {
      console.error('Error completing round:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset section
  const resetSection = async (sectionName: string) => {
    if (!window.confirm(`Are you sure you want to reset ${sectionName}? This will delete all pairings and results.`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      await pairingApi.resetSection(tournamentId, sectionName);
      await loadTournamentData();
    } catch (error) {
      console.error('Error resetting section:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSectionData = sections.find(s => s.name === selectedSection);

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
    <div className="tournament-director-dashboard">
      {/* Header */}
      <div className="tournament-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="tournament-title">{tournament?.name || 'Tournament Director Dashboard'}</h1>
            <p className="tournament-subtitle">
              {tournament?.location} • {tournament?.date} • {sections.length} sections
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadTournamentData}
              className="btn btn-outline"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'pairings', label: 'Pairings', icon: Users },
          { id: 'standings', label: 'Standings', icon: Trophy },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Section Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => (
              <div
                key={section.name}
                className={`section-card cursor-pointer transition-all ${
                  selectedSection === section.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedSection(section.name);
                  onSectionSelect?.(section.name);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="section-title">{section.name}</h3>
                  <div className="flex items-center space-x-1">
                    {section.isComplete ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : section.hasIncompleteResults ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                <div className="section-stats">
                  <div className="flex justify-between">
                    <span>Round:</span>
                    <span className="font-medium">{section.currentRound} / {section.totalRounds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Players:</span>
                    <span className="font-medium">{section.players.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${
                      section.isComplete ? 'text-green-600' :
                      section.hasIncompleteResults ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {section.isComplete ? 'Complete' :
                       section.hasIncompleteResults ? 'Incomplete Results' :
                       'Ready'}
                    </span>
                  </div>
                </div>

                {/* Section Actions */}
                <div className="mt-4 flex space-x-2">
                  {section.hasIncompleteResults && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        completeRound(section.name);
                      }}
                      className="btn btn-sm flex-1"
                    >
                      Complete Round
                    </button>
                  )}
                  
                  {section.pairings.length === 0 && section.players.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateNextRound(section.name);
                      }}
                      className="generate-btn flex-1"
                    >
                      Generate Round 1
                    </button>
                  )}
                  
                  {section.canGenerateNext && !section.isComplete && section.pairings.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateNextRound(section.name);
                      }}
                      className="generate-btn flex-1"
                    >
                      Next Round
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetSection(section.name);
                    }}
                    className="btn btn-sm btn-outline"
                    title="Reset Section"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pairings Tab */}
      {activeTab === 'pairings' && selectedSectionData && (
        <div className="space-y-6">
          {/* Section Selector */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="result-select"
            >
              {sections.map(section => (
                <option key={section.name} value={section.name}>
                  {section.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(parseInt(e.target.value))}
              className="result-select"
            >
              {Array.from({ length: selectedSectionData.totalRounds }, (_, i) => i + 1).map(round => (
                <option key={round} value={round}>
                  Round {round}
                </option>
              ))}
            </select>
          </div>

          {/* Pairings Table */}
          {selectedSectionData.pairings.length > 0 ? (
            <div className="pairings-table">
              <table className="pairing-table">
                <thead>
                  <tr>
                    <th>Board</th>
                    <th>White Player</th>
                    <th>Black Player</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSectionData.pairings
                    .filter(p => p.round === selectedRound)
                    .map((pairing) => (
                    <tr key={pairing.id}>
                      <td>
                        <div className="board-number">
                          {pairing.board}
                        </div>
                      </td>
                      <td>
                        {pairing.white_player_id ? (
                          <div className="player-info white-player">
                            <div className="player-name">{pairing.white_name}</div>
                            <div className="player-details">
                              <span className="player-rating">{pairing.white_rating}</span>
                              <span className="player-uscf-id">({pairing.white_uscf_id})</span>
                            </div>
                          </div>
                        ) : (
                          <div className="empty-slot">TBD</div>
                        )}
                      </td>
                      <td>
                        {pairing.black_player_id ? (
                          <div className="player-info black-player">
                            <div className="player-name">{pairing.black_name}</div>
                            <div className="player-details">
                              <span className="player-rating">{pairing.black_rating}</span>
                              <span className="player-uscf-id">({pairing.black_uscf_id})</span>
                            </div>
                          </div>
                        ) : (
                          <div className="empty-slot">TBD</div>
                        )}
                      </td>
                      <td>
                        <select
                          value={pairing.result || ''}
                          onChange={(e) => {
                            // Handle result update
                            console.log('Update result:', pairing.id, e.target.value);
                          }}
                          className="result-select"
                        >
                          <option value="">Select Result</option>
                          <option value="1-0">1-0 (White Wins)</option>
                          <option value="0-1">0-1 (Black Wins)</option>
                          <option value="1/2-1/2">1/2-1/2 (Draw)</option>
                          <option value="1-0F">1-0F (White Forfeit)</option>
                          <option value="0-1F">0-1F (Black Forfeit)</option>
                          <option value="1/2-1/2F">1/2-1/2F (Draw by Forfeit)</option>
                        </select>
                      </td>
                      <td>
                        <div className="status-info">
                          {pairing.result ? (
                            <span className="status-completed">Completed</span>
                          ) : (
                            <span className="status-pending">Pending</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="pairing-actions">
                          <button
                            onClick={() => {
                              // Handle clear result
                              console.log('Clear result:', pairing.id);
                            }}
                            className="btn btn-sm btn-outline"
                            disabled={!pairing.result}
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pairings Yet</h3>
              <p className="text-gray-600 mb-4">
                Generate pairings to get started with {selectedSectionData.name}
              </p>
              <button
                onClick={() => generateNextRound(selectedSectionData.name)}
                className="generate-btn"
                disabled={isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Generate Round 1
              </button>
            </div>
          )}
        </div>
      )}

      {/* Standings Tab */}
      {activeTab === 'standings' && selectedSectionData && (
        <div className="space-y-6">
          {/* Section Selector */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="result-select"
            >
              {sections.map(section => (
                <option key={section.name} value={section.name}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Rating</th>
                  <th>USCF ID</th>
                  <th className="score">Points</th>
                  {Array.from({ length: selectedSectionData.totalRounds }, (_, i) => i + 1).map(round => (
                    <th key={round}>R{round}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedSectionData.players.map((player) => (
                  <tr key={player.id}>
                    <td>{player.rank}</td>
                    <td className="player">{player.name}</td>
                    <td>{player.rating || 'Unrated'}</td>
                    <td>{player.uscf_id || '-'}</td>
                    <td className="score">{player.points}</td>
                    {Array.from({ length: selectedSectionData.totalRounds }, (_, i) => i + 1).map(round => (
                      <td key={round} className="opponent">
                        {player.roundResults[round] ? (
                          <div className="text-center">
                            <div className="text-sm font-medium">
                              {player.roundResults[round].result}
                            </div>
                            <div className="text-xs text-gray-500">
                              vs {player.roundResults[round].opponent}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tournament Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Name
                </label>
                <input
                  type="text"
                  value={tournament?.name || ''}
                  className="result-select w-full"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={tournament?.location || ''}
                  className="result-select w-full"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="text"
                  value={tournament?.date || ''}
                  className="result-select w-full"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDirectorDashboard;
