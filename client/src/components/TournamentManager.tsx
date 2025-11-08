import React, { useState, useEffect, useMemo } from 'react';
import { Users, Trophy, Play, RefreshCw, Layers, Clock, Search as SearchIcon } from 'lucide-react';
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

  const selectedSectionData = sections.find(s => s.name === selectedSection);

  if (loading) {
    return (
      <div className="tournament-manager td-director">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading tournament data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tournament-manager td-director">
        <div className="error-container">
          <span>{error}</span>
          <button onClick={loadTournamentData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tournament-manager td-director">
      <header className="td-hero">
        <div className="td-hero__heading">
          <span className="td-hero__icon">
            <Trophy className="h-8 w-8" />
          </span>
          <div>
            <h1>Director Control Center</h1>
            <p>All of your tournament sections, pairings, and player counts in one focused view.</p>
          </div>
        </div>
        <button
          type="button"
          className="td-hero__refresh"
          onClick={handleRefreshAll}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh data
        </button>
      </header>

      <section className="td-stats">
        <div className="td-stat-card">
          <Users className="h-5 w-5" />
          <div>
            <span className="td-stat-card__label">Total players</span>
            <span className="td-stat-card__value">{totalPlayers}</span>
          </div>
        </div>
        <div className="td-stat-card">
          <Layers className="h-5 w-5" />
          <div>
            <span className="td-stat-card__label">Sections</span>
            <span className="td-stat-card__value">{sections.length}</span>
          </div>
        </div>
        <div className="td-stat-card">
          <Clock className="h-5 w-5" />
          <div>
            <span className="td-stat-card__label">Highest round</span>
            <span className="td-stat-card__value">{highestRound || '—'}</span>
          </div>
        </div>
        <div className="td-stat-card">
          <Play className="h-5 w-5" />
          <div>
            <span className="td-stat-card__label">Pairings loaded</span>
            <span className="td-stat-card__value">{totalPairings}</span>
          </div>
        </div>
      </section>

      <div className="td-toolbar">
        <div className="td-toolbar__group td-toolbar__group--search">
          <label htmlFor="td-director-search">Search sections</label>
          <div className="td-search">
            <SearchIcon className="td-search__icon" />
            <input
              id="td-director-search"
              type="search"
              placeholder="Search by section name"
              value={sectionSearchTerm}
              onChange={(event) => setSectionSearchTerm(event.target.value)}
              aria-label="Search sections"
            />
            {sectionSearchTerm && (
              <button
                type="button"
                className="td-search__clear"
                onClick={() => setSectionSearchTerm('')}
                aria-label="Clear section search"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="td-toolbar__group">
          <label htmlFor="td-director-sort">Sort sections</label>
          <div className="td-select">
            <select
              id="td-director-sort"
              value={sectionSort}
              onChange={(event) => setSectionSort(event.target.value as 'name' | 'players')}
            >
              <option value="name">Alphabetical</option>
              <option value="players">Player count</option>
            </select>
          </div>
        </div>
        <div className="td-toolbar__group td-toolbar__group--selection">
          <label htmlFor="td-director-section">Jump to section</label>
          <div className="td-select">
            <select
              id="td-director-section"
              value={selectedSection || ''}
              onChange={(event) => setSelectedSection(event.target.value)}
              disabled={!sections.length}
            >
              <option value="" disabled>
                {sections.length ? 'Select a section' : 'No sections available'}
              </option>
              {sections.map(section => (
                <option key={section.name} value={section.name}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="td-layout">
        <aside className="td-section-panel">
          <div className="td-section-panel__header">
            <div>
              <h2>Sections</h2>
              <span>{filteredSections.length} of {sections.length} shown</span>
            </div>
            <button
              type="button"
              className="td-icon-button"
              onClick={handleRefreshAll}
              aria-label="Reload section list"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          {filteredSections.length > 0 ? (
            <ul className="td-section-list">
              {filteredSections.map(section => (
                <li key={section.name}>
                  <button
                    type="button"
                    className={`td-section-item ${selectedSection === section.name ? 'is-active' : ''}`}
                    onClick={() => setSelectedSection(section.name)}
                  >
                    <div className="td-section-item__header">
                      <span className="td-section-item__name">{section.name}</span>
                      <span className="td-section-item__round">
                        Round {section.currentRound || '—'}
                      </span>
                    </div>
                    <div className="td-section-item__meta">
                      <span>
                        <Users className="h-4 w-4" />
                        {section.players.length} players
                      </span>
                      <span>
                        <Play className="h-4 w-4" />
                        {section.pairings.length} pairings
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="td-empty">
              <p>No sections match “{sectionSearchTerm}”.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSectionSearchTerm('')}
              >
                Clear search
              </button>
            </div>
          )}
        </aside>

        <section className="td-section-content">
          {selectedSectionData ? (
            <div className="td-card td-card--primary">
              <div className="td-card__header">
                <div>
                  <h2>{selectedSectionData.name}</h2>
                  <p>Manage players, standings, and pairings for this section.</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => refreshSectionData(selectedSectionData.name)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh section
                </button>
              </div>
              <div className="td-metrics">
                <div className="td-metric">
                  <Users className="h-4 w-4" />
                  <span>{selectedSectionData.players.length} players</span>
                </div>
                <div className="td-metric">
                  <Clock className="h-4 w-4" />
                  <span>Round {selectedSectionData.currentRound}</span>
                </div>
                <div className="td-metric">
                  <Play className="h-4 w-4" />
                  <span>{selectedSectionData.pairings.length} pairings</span>
                </div>
              </div>
              <div className="td-card__body">
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
            <div className="td-empty td-empty--card">
              <p>Select a section to begin managing pairings.</p>
            </div>
          )}

          <div className="td-card td-card--table">
            <div className="td-card__header">
              <div>
                <h3>Section snapshot</h3>
                <p>Compare participation and progress across every section.</p>
              </div>
              <button
                type="button"
                className="td-icon-button"
                onClick={handleRefreshAll}
                aria-label="Reload section snapshot"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="td-snapshot">
              <table>
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Players</th>
                    <th>Round</th>
                    <th>Pairings</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.length > 0 ? (
                    sections.map(section => (
                      <tr
                        key={section.name}
                        className={selectedSection === section.name ? 'is-active' : ''}
                        tabIndex={0}
                        role="button"
                        onClick={() => setSelectedSection(section.name)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedSection(section.name);
                          }
                        }}
                      >
                        <td>{section.name}</td>
                        <td>{section.players.length}</td>
                        <td>{section.currentRound || '—'}</td>
                        <td>{section.pairings.length}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="td-snapshot__empty">
                      <td colSpan={4}>Sections will appear here as soon as they are set up for this tournament.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TournamentManager;
