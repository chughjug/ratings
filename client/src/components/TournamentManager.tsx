import React, { useState, useEffect } from 'react';
import { Settings, Users, Trophy, Play } from 'lucide-react';
import { tournamentApi, playerApi, pairingApi } from '../services/api';
import { Player } from '../types';
import PairingSystem from './PairingSystem';

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
      
      // Fetch tournament data
      const tournamentResponse = await tournamentApi.getById(tournamentId);
      if (!tournamentResponse.data.success) {
        throw new Error(tournamentResponse.data.error || 'Failed to load tournament');
      }
      
      const tournament = tournamentResponse.data.data;
      
      // Fetch players data
      const playersResponse = await playerApi.getByTournament(tournamentId);
      if (!playersResponse.data.success) {
        throw new Error(playersResponse.data.error || 'Failed to load players');
      }
      
      const allPlayers = playersResponse.data.data;
      
      // Get sections from tournament settings or from players
      const tournamentSections = new Set<string>();
      
      // Add sections from tournament settings
      if (tournament?.settings?.sections) {
        tournament.settings.sections.forEach((s: any) => {
          if (s.name && s.name.trim() !== '') {
            tournamentSections.add(s.name);
          }
        });
      }
      
      // Add sections from players
      allPlayers.forEach(player => {
        if (player.section && player.section.trim() !== '') {
          tournamentSections.add(player.section);
        }
      });
      
      // If no sections found, create a default one
      if (tournamentSections.size === 0) {
        tournamentSections.add('CHAMPIONSHIP 2DAY');
      }
      
      // Group players by section
      const playersBySection = allPlayers.reduce((acc, player) => {
        const section = player.section || 'CHAMPIONSHIP 2DAY';
        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(player);
        return acc;
      }, {} as Record<string, Player[]>);
      
      // Create sections data and load pairings for each section
      const sectionsData = await Promise.all(
        Array.from(tournamentSections).map(async (sectionName) => {
          const sectionPlayers = playersBySection[sectionName] || [];
          
          // Try to load pairings for this section
          let sectionPairings: any[] = [];
          let currentRound = 1;
          
          try {
            // Try to get pairings for round 1 first
            const pairingsResponse = await pairingApi.getByRound(tournamentId, 1, sectionName);
            sectionPairings = pairingsResponse.data || [];
            
            // Determine current round based on pairings data
            if (sectionPairings.length > 0) {
              const rounds = Array.from(new Set(sectionPairings.map(p => p.round))).sort((a, b) => b - a);
              currentRound = rounds[0] || 1;
            }
          } catch (err) {
            console.warn(`Failed to load pairings for section ${sectionName}:`, err);
            // Continue with empty pairings
          }
          
          return {
            name: sectionName,
            players: sectionPlayers,
            pairings: sectionPairings,
            currentRound,
            isComplete: false // Will be determined from tournament status
          };
        })
      );
      
      setSections(sectionsData);
      if (sectionsData.length > 0) {
        setSelectedSection(sectionsData[0].name);
      }
    } catch (err: any) {
      console.error('Failed to load tournament data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  // getCurrentRound function removed to avoid API issues

  const handlePairingsGenerated = (sectionName: string, pairings: any[]) => {
    setSections(prev => prev.map(section => 
      section.name === sectionName 
        ? { ...section, pairings }
        : section
    ));
  };

  const refreshSectionData = async (sectionName: string) => {
    try {
      // Reload pairings for the specific section
      const pairingsResponse = await pairingApi.getByRound(tournamentId, 1, sectionName);
      const sectionPairings = pairingsResponse.data || [];
      
      // Update the section with new pairings data
      setSections(prev => prev.map(section => 
        section.name === sectionName 
          ? { 
              ...section, 
              pairings: sectionPairings,
              currentRound: sectionPairings.length > 0 
                ? Math.max(...sectionPairings.map(p => p.round)) 
                : section.currentRound
            }
          : section
      ));
    } catch (err) {
      console.error(`Failed to refresh data for section ${sectionName}:`, err);
    }
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

  console.log('TournamentManager rendering with tournamentId:', tournamentId);
  console.log('Sections:', sections);
  console.log('Selected section:', selectedSection);

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
            onPairingsGenerated={(pairings) => {
              handlePairingsGenerated(selectedSectionData.name, pairings);
              refreshSectionData(selectedSectionData.name);
            }}
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
                <button
                  onClick={() => refreshSectionData(section.name)}
                  className="btn-secondary"
                  title="Refresh section data"
                >
                  ↻
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
