import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, Users, Trophy, Play, RefreshCw, Layers, Clock, Search as SearchIcon } from 'lucide-react';
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
  const [sectionSearchTerm, setSectionSearchTerm] = useState('');
  const [sectionSort, setSectionSort] = useState<'name' | 'players'>('name');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const sectionCardRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLDivElement | null>(null);

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
      setLastUpdated(new Date());
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
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Failed to refresh data for section ${sectionName}:`, err);
    }
  };

  const handleRefreshAll = () => {
    loadTournamentData();
  };

  const filteredSections = useMemo(() => {
    const query = sectionSearchTerm.trim().toLowerCase();
    const filtered = sections.filter(section =>
      section.name.toLowerCase().includes(query)
    );

    return filtered.sort((a, b) => {
      if (sectionSort === 'players') {
        return b.players.length - a.players.length || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [sections, sectionSearchTerm, sectionSort]);

  useEffect(() => {
    if (!filteredSections.length) {
      return;
    }

    const isSelectedVisible = filteredSections.some(section => section.name === selectedSection);
    if (!isSelectedVisible) {
      setSelectedSection(filteredSections[0].name);
    }
  }, [filteredSections, selectedSection]);

  const totalPlayers = sections.reduce((sum, section) => sum + section.players.length, 0);
  const totalPairings = sections.reduce((sum, section) => sum + section.pairings.length, 0);
  const highestRound = sections.length
    ? Math.max(...sections.map(section => section.currentRound || 0))
    : 0;
  const completedSections = sections.filter(section => section.isComplete).length;
  const completionRate = sections.length ? Math.round((completedSections / sections.length) * 100) : 0;
  const activeSections = sections.length - completedSections;
  const pairingsPerSection = sections.length ? Math.round(totalPairings / sections.length) : 0;
  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const scrollToActiveSection = () => {
    sectionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToSnapshot = () => {
    overviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <div className="tm-background" />
      <div className="tm-shell">
        <div className="tm-page-header">
          <div className="tm-title">
            <Trophy className="h-10 w-10 tm-title-icon" />
            <div>
              <h1>Tournament Director Console</h1>
              <p>Your command center for rounds, registrations, and real-time pairings.</p>
            </div>
          </div>
          <div className="tm-header-actions">
            <span className="tm-updated-chip">Last sync {lastUpdatedLabel}</span>
            <button
              className="tm-icon-button"
              onClick={handleRefreshAll}
              aria-label="Reload tournament data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="btn-secondary tm-settings-button">
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>

        <div className="tm-summary-grid">
          <div className="tm-summary-card">
            <Users className="h-6 w-6" />
            <div>
              <span className="tm-summary-label">Total Players</span>
              <span className="tm-summary-value">{totalPlayers}</span>
            </div>
          </div>
          <div className="tm-summary-card">
            <Layers className="h-6 w-6" />
            <div>
              <span className="tm-summary-label">Sections</span>
              <span className="tm-summary-value">{sections.length}</span>
            </div>
          </div>
          <div className="tm-summary-card">
            <Clock className="h-6 w-6" />
            <div>
              <span className="tm-summary-label">Highest Round</span>
              <span className="tm-summary-value">{highestRound || '—'}</span>
            </div>
          </div>
          <div className="tm-summary-card">
            <Trophy className="h-6 w-6" />
            <div>
              <span className="tm-summary-label">Pairings Loaded</span>
              <span className="tm-summary-value">{totalPairings}</span>
            </div>
          </div>
        </div>

        <div className="tm-dashboard">
          <aside className="tm-secondary-panel">
            <div className="tm-panel-card">
              <div className="tm-panel-header">
                <h3>Progress Overview</h3>
                <span className="tm-updated-chip muted">Updated {lastUpdatedLabel}</span>
              </div>
              <div className="tm-progress">
                <div className="tm-progress-track">
                  <div
                    className="tm-progress-value"
                    style={{ width: `${completionRate}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="tm-progress-metrics">
                  <span><strong>{completionRate}%</strong> complete</span>
                  <span>{completedSections} of {sections.length} sections finished</span>
                </div>
                <div className="tm-progress-meta">
                  <span>{activeSections} active sections</span>
                  <span>{pairingsPerSection} avg pairings/section</span>
                </div>
              </div>
            </div>

            <div className="tm-panel-card">
              <div className="tm-panel-header">
                <h3>Quick Actions</h3>
              </div>
              <div className="tm-quick-actions">
                <button className="tm-action-button" onClick={handleRefreshAll}>
                  <RefreshCw className="h-4 w-4" />
                  Reload data
                </button>
                <button className="tm-action-button" onClick={scrollToActiveSection}>
                  <Play className="h-4 w-4" />
                  Jump to active section
                </button>
                <button className="tm-action-button" onClick={scrollToSnapshot}>
                  <Layers className="h-4 w-4" />
                  Review snapshot
                </button>
              </div>
            </div>

            <div className="tm-panel-card">
              <div className="tm-panel-header">
                <div>
                  <h3>Section Directory</h3>
                  <span className="tm-panel-subtitle">{filteredSections.length} of {sections.length} visible</span>
                </div>
                <button
                  className="tm-icon-button muted"
                  onClick={handleRefreshAll}
                  aria-label="Reload all sections"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="tm-search-field">
                <SearchIcon className="h-4 w-4" />
                <input
                  type="search"
                  placeholder="Search sections"
                  value={sectionSearchTerm}
                  onChange={(event) => setSectionSearchTerm(event.target.value)}
                  aria-label="Search sections"
                />
                {sectionSearchTerm && (
                  <button
                    className="tm-clear-button"
                    onClick={() => setSectionSearchTerm('')}
                    aria-label="Clear section search"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="tm-sidebar-actions">
                <span className="tm-sidebar-label">Sort by</span>
                <div className="tm-sort-group">
                  <button
                    className={`tm-sort-button ${sectionSort === 'name' ? 'active' : ''}`}
                    onClick={() => setSectionSort('name')}
                  >
                    A → Z
                  </button>
                  <button
                    className={`tm-sort-button ${sectionSort === 'players' ? 'active' : ''}`}
                    onClick={() => setSectionSort('players')}
                  >
                    Players
                  </button>
                </div>
              </div>

              <div className="tm-timeline">
                {sections.map(section => (
                  <div key={section.name} className="tm-timeline-item">
                    <span className={`tm-timeline-dot ${section.isComplete ? 'complete' : ''}`} />
                    <div className="tm-timeline-content">
                      <div className="tm-timeline-title">{section.name}</div>
                      <div className="tm-timeline-meta">
                        <span>Round {section.currentRound}</span>
                        <span>{section.players.length} players</span>
                      </div>
                    </div>
                    <button
                      className={`tm-timeline-button ${selectedSection === section.name ? 'active' : ''}`}
                      onClick={() => setSelectedSection(section.name)}
                    >
                      Manage
                    </button>
                  </div>
                ))}
              </div>

              <div className="tm-section-list">
                {filteredSections.map(section => (
                  <button
                    key={section.name}
                    className={`tm-section-item ${selectedSection === section.name ? 'active' : ''}`}
                    onClick={() => setSelectedSection(section.name)}
                  >
                    <div className="tm-section-item-header">
                      <span className="tm-section-name">{section.name}</span>
                      <span className="tm-section-round">Round {section.currentRound}</span>
                    </div>
                    <div className="tm-section-meta">
                      <span>
                        <Users className="h-4 w-4" />
                        {section.players.length} players
                      </span>
                      <span>
                        <Trophy className="h-4 w-4" />
                        {section.pairings.length} pairings
                      </span>
                    </div>
                  </button>
                ))}

                {filteredSections.length === 0 && (
                  <div className="tm-empty-state">
                    <p>No sections match “{sectionSearchTerm}”.</p>
                    <button
                      className="btn-secondary"
                      onClick={() => setSectionSearchTerm('')}
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="tm-main-panel">
            {selectedSectionData ? (
              <div className="tm-card tm-glass" ref={sectionCardRef}>
                <div className="tm-card-header">
                  <div>
                    <h2>{selectedSectionData.name}</h2>
                    <p>Manage players, standings, and pairings for this section.</p>
                  </div>
                  <div className="tm-card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => refreshSectionData(selectedSectionData.name)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh section
                    </button>
                  </div>
                </div>

                <div className="tm-card-metrics">
                  <div className="tm-metric">
                    <Users className="h-4 w-4" />
                    <span>{selectedSectionData.players.length} Players</span>
                  </div>
                  <div className="tm-metric">
                    <Clock className="h-4 w-4" />
                    <span>Round {selectedSectionData.currentRound}</span>
                  </div>
                  <div className="tm-metric">
                    <Play className="h-4 w-4" />
                    <span>{selectedSectionData.pairings.length} Pairings</span>
                  </div>
                </div>

                <div className="tm-card-body">
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
              </div>
            ) : (
              <div className="tm-empty-state tm-glass">
                <p>Select a section to begin managing pairings.</p>
              </div>
            )}

            <div className="tm-card tm-overview-card tm-glass" ref={overviewRef}>
              <div className="tm-card-header">
                <div>
                  <h3>Section Snapshot</h3>
                  <p>Compare player counts, rounds, and status across every section.</p>
                </div>
                <button
                  className="tm-icon-button"
                  onClick={handleRefreshAll}
                  aria-label="Reload section snapshot"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="tm-overview-grid">
                {sections.map(section => (
                  <div key={section.name} className="tm-overview-item">
                    <div className="tm-overview-title">
                      <span>{section.name}</span>
                      <span className={`tm-status ${section.isComplete ? 'complete' : 'active'}`}>
                        {section.isComplete ? 'Complete' : 'In Progress'}
                      </span>
                    </div>
                    <div className="tm-overview-meta">
                      <span>
                        <Users className="h-4 w-4" />
                        {section.players.length} players
                      </span>
                      <span>
                        <Clock className="h-4 w-4" />
                        Round {section.currentRound}
                      </span>
                      <span>
                        <Trophy className="h-4 w-4" />
                        {section.pairings.length} pairings
                      </span>
                    </div>
                    <div className="tm-overview-actions">
                      <button
                        className="btn-primary"
                        onClick={() => setSelectedSection(section.name)}
                      >
                        Manage
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => refreshSectionData(section.name)}
                        title={`Refresh ${section.name}`}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TournamentManager;
