import React, { useState, useEffect } from 'react';
import { Settings, Users, Trophy, Play, RotateCcw, CheckCircle } from 'lucide-react';
import { tournamentApi, pairingApi, playerApi } from '../services/api';
import PairingSystem from './PairingSystem';

interface Player {
  id: string;
  name: string;
  rating: number;
  uscf_id: string;
  points: number;
  colorPreference: string;
  absoluteColorPreference: boolean;
  strongColorPreference: boolean;
  colorImbalance: number;
  matches: any[];
}

interface Section {
  name: string;
  players: Player[];
  pairings: any[];
  currentRound: number;
  isComplete: boolean;
}

interface TournamentManagerProps {
  tournamentId: string;
}

const TournamentManager: React.FC<TournamentManagerProps> = ({ tournamentId }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTournamentData();
  }, [tournamentId]);

  const loadTournamentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load tournament details
      const tournamentResponse = await tournamentApi.getById(tournamentId);
      const tournament = tournamentResponse.data.data;
      
      // Load sections
      const sectionsData = await Promise.all(
        (tournament.settings?.sections || []).map(async (section: any) => {
          try {
            // Load players for this section
            const playersResponse = await playerApi.getByTournament(tournamentId);
            const players = playersResponse.data || [];
            
            // Load current round pairings
            const currentRound = await getCurrentRound(tournamentId, section.name);
            const pairingsResponse = await pairingApi.getByRound(tournamentId, currentRound, section.name);
            const pairings = pairingsResponse.data || [];
            
            return {
              name: section.name,
              players,
              pairings,
              currentRound,
              isComplete: false // TODO: Determine if section is complete
            };
          } catch (err) {
            console.error(`Failed to load section ${section.name}:`, err);
            return {
              name: section.name,
              players: [],
              pairings: [],
              currentRound: 1,
              isComplete: false
            };
          }
        })
      );
      
      setSections(sectionsData);
      if (sectionsData.length > 0) {
        setSelectedSection(sectionsData[0].name);
      }
    } catch (err: any) {
      console.error('Failed to load tournament data:', err);
      setError(err.response?.data?.message || 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentRound = async (tournamentId: string, section: string): Promise<number> => {
    try {
      const response = await pairingApi.getCurrentRound(tournamentId, section);
      return response.data?.round || 1;
    } catch (err) {
      return 1;
    }
  };

  const handlePairingsGenerated = (sectionName: string, pairings: any[]) => {
    setSections(prev => prev.map(section => 
      section.name === sectionName 
        ? { ...section, pairings }
        : section
    ));
  };

  const selectedSectionData = sections.find(s => s.name === selectedSection);

  if (loading) {
    return (
      <div className="tournament-manager">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading tournament data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tournament-manager">
        <div className="error-container">
          <span>{error}</span>
          <button onClick={loadTournamentData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tournament-manager">
      {/* Header */}
      <div className="tournament-header">
        <div className="tournament-title">
          <Trophy className="h-8 w-8" />
          <h1>Tournament Director</h1>
        </div>
        <div className="tournament-actions">
          <button className="btn-secondary">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Section Selector */}
      <div className="section-selector">
        <h3>Select Section</h3>
        <div className="section-tabs">
          {sections.map(section => (
            <button
              key={section.name}
              className={`section-tab ${selectedSection === section.name ? 'active' : ''}`}
              onClick={() => setSelectedSection(section.name)}
            >
              <div className="section-name">{section.name}</div>
              <div className="section-stats">
                <span>{section.players.length} players</span>
                <span>Round {section.currentRound}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Section */}
      {selectedSectionData && (
        <div className="selected-section">
          <div className="section-header">
            <h2>{selectedSectionData.name}</h2>
            <div className="section-info">
              <div className="info-item">
                <Users className="h-4 w-4" />
                <span>{selectedSectionData.players.length} Players</span>
              </div>
              <div className="info-item">
                <Play className="h-4 w-4" />
                <span>Round {selectedSectionData.currentRound}</span>
              </div>
            </div>
          </div>

          <PairingSystem
            tournamentId={tournamentId}
            section={selectedSectionData.name}
            round={selectedSectionData.currentRound}
            players={selectedSectionData.players}
            onPairingsGenerated={(pairings) => handlePairingsGenerated(selectedSectionData.name, pairings)}
          />
        </div>
      )}

      {/* Sections Overview */}
      <div className="sections-overview">
        <h3>All Sections</h3>
        <div className="sections-grid">
          {sections.map(section => (
            <div key={section.name} className="section-card">
              <div className="section-card-header">
                <h4>{section.name}</h4>
                <div className={`section-status ${section.isComplete ? 'complete' : 'active'}`}>
                  {section.isComplete ? 'Complete' : 'Active'}
                </div>
              </div>
              <div className="section-card-stats">
                <div className="stat">
                  <Users className="h-4 w-4" />
                  <span>{section.players.length} players</span>
                </div>
                <div className="stat">
                  <Play className="h-4 w-4" />
                  <span>Round {section.currentRound}</span>
                </div>
                <div className="stat">
                  <Trophy className="h-4 w-4" />
                  <span>{section.pairings.length} pairings</span>
                </div>
              </div>
              <div className="section-card-actions">
                <button
                  onClick={() => setSelectedSection(section.name)}
                  className="btn-primary"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentManager;
