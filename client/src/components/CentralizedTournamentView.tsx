import React, { useState, useEffect, useCallback } from 'react';
import { Users, Trophy, Settings, CheckCircle, AlertCircle, Clock, Play, RotateCcw } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { tournamentApi, pairingApi } from '../services/api';
import { getSectionOptions } from '../utils/sectionUtils';

interface Section {
  name: string;
  currentRound: number;
  totalRounds: number;
  isComplete: boolean;
  canGenerateNext: boolean;
  hasIncompleteResults: boolean;
  players: any[];
  pairings: any[];
  standings: any[];
}

interface CentralizedTournamentViewProps {
  tournamentId: string;
  onSectionSelect?: (sectionName: string) => void;
}

const CentralizedTournamentView: React.FC<CentralizedTournamentViewProps> = ({
  tournamentId,
  onSectionSelect
}) => {
  const { state } = useTournament();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tournament, setTournament] = useState<any>(null);

  // Fetch tournament data
  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;
    
    try {
      setIsLoading(true);
      const response = await tournamentApi.getById(tournamentId);
      setTournament(response.data.data);
      
      // Initialize sections
      const sectionOptions = getSectionOptions(response.data.data, []);
      const sectionsData: Section[] = await Promise.all(
        sectionOptions.map(async (sectionName) => {
          try {
            // Get section status
            const statusResponse = await pairingApi.getSectionStatusSimple(tournamentId, sectionName);
            const status = statusResponse.data;
            
            // Get section players
            const players = state.players.filter(p => p.section === sectionName);
            
            // Get current round pairings
            const pairingsResponse = await pairingApi.getByRound(tournamentId, status.currentRound, sectionName);
            const pairings = pairingsResponse.data || [];
            
            // Get standings
            const standingsResponse = await pairingApi.getStandings(tournamentId, true, true);
            const standings = standingsResponse.data.data ? standingsResponse.data.data.filter((s: any) => s.section === sectionName) : [];
            
            return {
              name: sectionName,
              currentRound: status.currentRound,
              totalRounds: response.data.data ? response.data.data.rounds : 5,
              isComplete: status.isComplete,
              canGenerateNext: status.canGenerateNextRound,
              hasIncompleteResults: status.hasIncompleteResults,
              players,
              pairings,
              standings
            };
          } catch (error) {
            console.error(`Error fetching data for section ${sectionName}:`, error);
            return {
              name: sectionName,
              currentRound: 1,
              totalRounds: response.data.data ? response.data.data.rounds : 5,
              isComplete: false,
              canGenerateNext: false,
              hasIncompleteResults: false,
              players: [],
              pairings: [],
              standings: []
            };
          }
        })
      );
      
      setSections(sectionsData);
      
      // Select first section by default
      if (sectionsData.length > 0 && !selectedSection) {
        setSelectedSection(sectionsData[0].name);
        onSectionSelect?.(sectionsData[0].name);
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId, state.players, selectedSection, onSectionSelect]);

  // Complete round for a section
  const completeRound = async (sectionName: string) => {
    if (!tournamentId) return;
    
    try {
      const section = sections.find(s => s.name === sectionName);
      if (!section) return;
      
      const response = await pairingApi.completeRound(tournamentId, section.currentRound, sectionName);
      
      // Refresh section data
      await fetchTournament();
      
      alert(response.data.message);
    } catch (error: any) {
      console.error('Failed to complete round:', error);
      alert(error.response?.data?.error || 'Failed to complete round');
    }
  };

  // Generate next round for a section
  const generateNextRound = async (sectionName: string) => {
    if (!tournamentId) return;
    
    try {
      const section = sections.find(s => s.name === sectionName);
      if (!section) return;
      
      const response = await pairingApi.generateNextRound(tournamentId, sectionName);
      
      // Refresh section data
      await fetchTournament();
      
      alert(response.data.message);
    } catch (error: any) {
      console.error('Failed to generate next round:', error);
      alert(error.response?.data?.error || 'Failed to generate next round');
    }
  };

  // Reset section
  const resetSection = async (sectionName: string) => {
    if (!tournamentId) return;
    
    if (!window.confirm(`Are you sure you want to reset section "${sectionName}"? This will delete all pairings and results.`)) {
      return;
    }
    
    try {
      const response = await pairingApi.resetSection(tournamentId, sectionName);
      
      // Refresh section data
      await fetchTournament();
      
      alert(response.data.message);
    } catch (error: any) {
      console.error('Failed to reset section:', error);
      alert(error.response?.data?.error || 'Failed to reset section');
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const selectedSectionData = sections.find(s => s.name === selectedSection);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading tournament data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tournament?.name}</h1>
            <p className="text-gray-600 mt-1">
              {tournament?.format} • {tournament?.rounds} rounds • {sections.length} section{sections.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">
              {sections.filter(s => s.isComplete).length} of {sections.length} sections complete
            </div>
          </div>
        </div>
      </div>

      {/* Section Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <div
            key={section.name}
            className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
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
              <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
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
            
            <div className="space-y-2 text-sm text-gray-600">
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
                  className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  Complete Round
                </button>
              )}
              
              {section.canGenerateNext && !section.isComplete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    generateNextRound(section.name);
                  }}
                  className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Next Round
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetSection(section.name);
                }}
                className="px-3 py-1.5 text-gray-600 hover:text-red-600 transition-colors"
                title="Reset Section"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Section Details */}
      {selectedSectionData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedSectionData.name} Section
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Round {selectedSectionData.currentRound} of {selectedSectionData.totalRounds}
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{selectedSectionData.players.length} players</span>
              </div>
            </div>
          </div>

          {/* Section Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Standings</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedSectionData.standings.length}
              </div>
              <div className="text-sm text-gray-600">Players ranked</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Settings className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Pairings</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedSectionData.pairings.length}
              </div>
              <div className="text-sm text-gray-600">Current round</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">Progress</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((selectedSectionData.currentRound / selectedSectionData.totalRounds) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>

          {/* Section Actions */}
          <div className="flex space-x-3">
            {selectedSectionData.hasIncompleteResults && (
              <button
                onClick={() => completeRound(selectedSectionData.name)}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Complete Round {selectedSectionData.currentRound}</span>
              </button>
            )}
            
            {selectedSectionData.canGenerateNext && !selectedSectionData.isComplete && (
              <button
                onClick={() => generateNextRound(selectedSectionData.name)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="h-4 w-4" />
                <span>Generate Round {selectedSectionData.currentRound + 1}</span>
              </button>
            )}
            
            <button
              onClick={() => resetSection(selectedSectionData.name)}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Section</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralizedTournamentView;
