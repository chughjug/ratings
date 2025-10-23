import React from 'react';
import { TournamentData, PairingData, StandingData } from '../services/pdfExport';

interface PrintableViewProps {
  tournament: TournamentData;
  pairings?: PairingData[];
  standings?: StandingData[];
  currentRound?: number;
  viewType: 'pairings' | 'standings' | 'report';
  selectedSection?: string;
  separatePages?: boolean;
}

const PrintableView: React.FC<PrintableViewProps> = ({
  tournament,
  pairings = [],
  standings = [],
  currentRound = 1,
  viewType,
  selectedSection = 'all',
  separatePages = false
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString();
  };

  const groupBySection = (items: any[], sectionKey: string = 'section') => {
    const grouped: { [key: string]: any[] } = {};
    items.forEach(item => {
      const section = item[sectionKey] || 'Open';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(item);
    });
    return grouped;
  };

  const getAvailableSections = () => {
    const sections = new Set<string>();
    sections.add('all');
    
    // Get sections from pairings
    pairings.forEach(pairing => {
      if (pairing.section) {
        sections.add(pairing.section);
      }
    });
    
    // Get sections from standings
    standings.forEach(standing => {
      if (standing.section) {
        sections.add(standing.section);
      }
    });
    
    return Array.from(sections).sort();
  };

  const filterBySection = (items: any[], sectionKey: string = 'section') => {
    if (selectedSection === 'all') {
      return items;
    }
    return items.filter(item => (item[sectionKey] || 'Open') === selectedSection);
  };

  const renderTournamentHeader = () => (
    <div className="tournament-header">
      <h1 className="tournament-title">{tournament.name}</h1>
      {viewType === 'pairings' && (
        <h2 className="tournament-subtitle">Round {currentRound} Pairings</h2>
      )}
      {viewType === 'standings' && (
        <h2 className="tournament-subtitle">Tournament Standings</h2>
      )}
      {viewType === 'report' && (
        <h2 className="tournament-subtitle">Tournament Report</h2>
      )}
      
      <div className="tournament-details">
        {tournament.start_date && (
          <span>Start: {formatDate(tournament.start_date)}</span>
        )}
        {tournament.end_date && (
          <span>End: {formatDate(tournament.end_date)}</span>
        )}
        {tournament.time_control && (
          <span>Time Control: {tournament.time_control}</span>
        )}
        {tournament.city && tournament.state && (
          <span>Location: {tournament.city}, {tournament.state}</span>
        )}
        {tournament.location && (
          <span>Venue: {tournament.location}</span>
        )}
        <span>Format: {tournament.format}</span>
        <span>Rounds: {tournament.rounds}</span>
        <span>Players: {standings.length}</span>
      </div>
    </div>
  );

  const renderPairings = () => {
    // Filter pairings by current round
    const currentRoundPairings = pairings.filter(pairing => pairing.round === currentRound);
    const filteredPairings = filterBySection(currentRoundPairings);
    
    if (selectedSection !== 'all') {
      // Single section view
      const sectionPairings = filteredPairings;
      sectionPairings.sort((a, b) => (a.board || 0) - (b.board || 0));

      return (
        <div className="section">
          <h3 className="section-header">{selectedSection} Section</h3>
          
          <div className="table-container">
            <table className="pairings-table">
              <thead>
                <tr>
                  <th className="board-number">Board</th>
                  <th>White Player</th>
                  <th>Black Player</th>
                  <th className="result">Result</th>
                </tr>
              </thead>
              <tbody>
                {sectionPairings.map((pairing) => (
                  <tr key={pairing.id} className="player-row">
                    <td className="board-number">{pairing.board || '-'}</td>
                    <td>
                      <div className="player-name">
                        <span className="white-piece">♔</span> {pairing.white_name || 'TBD'}
                      </div>
                      {pairing.white_rating && (
                        <div className="player-rating">({pairing.white_rating})</div>
                      )}
                      {pairing.white_uscf_id && (
                        <div className="player-id">[{pairing.white_uscf_id}]</div>
                      )}
                      {pairing.is_bye && (
                        <div className="bye-indicator">
                          {pairing.is_intentional_bye ? 'Intentional Bye' : 'Bye'}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="player-name">
                        <span className="black-piece">♚</span> {pairing.black_name || 'TBD'}
                      </div>
                      {pairing.black_rating && (
                        <div className="player-rating">({pairing.black_rating})</div>
                      )}
                      {pairing.black_uscf_id && (
                        <div className="player-id">[{pairing.black_uscf_id}]</div>
                      )}
                      {pairing.is_bye && (
                        <div className="bye-indicator">
                          {pairing.is_intentional_bye ? 'Intentional Bye' : 'Bye'}
                        </div>
                      )}
                    </td>
                    <td className="result">{pairing.result || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // All sections view
    const pairingsBySection = groupBySection(filteredPairings);
    const sortedSections = Object.keys(pairingsBySection).sort();

    return (
      <div className="section">
        {sortedSections.map((sectionName, index) => {
          const sectionPairings = pairingsBySection[sectionName];
          sectionPairings.sort((a, b) => (a.board || 0) - (b.board || 0));

          return (
            <div key={sectionName} className={separatePages && index > 0 ? 'section-break' : 'no-page-break'}>
              <h3 className="section-header">{sectionName} Section</h3>
              
              <div className="table-container">
                <table className="pairings-table">
                  <thead>
                    <tr>
                      <th className="board-number">Board</th>
                      <th>White Player</th>
                      <th>Black Player</th>
                      <th className="result">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionPairings.map((pairing) => (
                      <tr key={pairing.id} className="player-row">
                        <td className="board-number">{pairing.board || '-'}</td>
                        <td>
                          <div className="player-name">
                            <span className="white-piece">♔</span> {pairing.white_name || 'TBD'}
                          </div>
                          {pairing.white_rating && (
                            <div className="player-rating">({pairing.white_rating})</div>
                          )}
                          {pairing.white_uscf_id && (
                            <div className="player-id">[{pairing.white_uscf_id}]</div>
                          )}
                          {pairing.is_bye && (
                            <div className="bye-indicator">
                              {pairing.is_intentional_bye ? 'Intentional Bye' : 'Bye'}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="player-name">
                            <span className="black-piece">♚</span> {pairing.black_name || 'TBD'}
                          </div>
                          {pairing.black_rating && (
                            <div className="player-rating">({pairing.black_rating})</div>
                          )}
                          {pairing.black_uscf_id && (
                            <div className="player-id">[{pairing.black_uscf_id}]</div>
                          )}
                          {pairing.is_bye && (
                            <div className="bye-indicator">
                              {pairing.is_intentional_bye ? 'Intentional Bye' : 'Bye'}
                            </div>
                          )}
                        </td>
                        <td className="result">{pairing.result || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStandings = () => {
    const filteredStandings = filterBySection(standings);
    
    if (selectedSection !== 'all') {
      // Single section view
      const sectionStandings = filteredStandings;
      sectionStandings.sort((a, b) => b.total_points - a.total_points);

      return (
        <div className="section">
          <h3 className="section-header">{selectedSection} Section</h3>
          
          <div className="table-container">
            <table className="standings-table">
              <thead>
                <tr>
                  <th className="rank">Rank</th>
                  <th>Name</th>
                  <th>Rating</th>
                  <th className="points">Points</th>
                  <th>Games</th>
                  <th>W-L-D</th>
                  <th className="tiebreak">Buchholz</th>
                  <th className="tiebreak">S-B</th>
                </tr>
              </thead>
              <tbody>
                {sectionStandings.map((standing, index) => (
                  <tr key={standing.id} className="player-row">
                    <td className="rank">{index + 1}</td>
                    <td>
                      <div className="player-name">{standing.name}</div>
                      {standing.uscf_id && (
                        <div className="player-id">[{standing.uscf_id}]</div>
                      )}
                    </td>
                    <td>{standing.rating || 'Unrated'}</td>
                    <td className="points">{standing.total_points}</td>
                    <td>{standing.games_played}</td>
                    <td>{standing.wins}-{standing.losses}-{standing.draws}</td>
                    <td className="tiebreak">{standing.buchholz?.toFixed(1) || '-'}</td>
                    <td className="tiebreak">{standing.sonneborn_berger?.toFixed(1) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // All sections view
    const standingsBySection = groupBySection(filteredStandings);
    const sortedSections = Object.keys(standingsBySection).sort();

    return (
      <div className="section">
        {sortedSections.map((sectionName, index) => {
          const sectionStandings = standingsBySection[sectionName];
          sectionStandings.sort((a, b) => b.total_points - a.total_points);

          return (
            <div key={sectionName} className={separatePages && index > 0 ? 'section-break' : 'no-page-break'}>
              <h3 className="section-header">{sectionName} Section</h3>
              
              <div className="table-container">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th className="rank">Rank</th>
                      <th>Name</th>
                      <th>Rating</th>
                      <th className="points">Points</th>
                      <th>Games</th>
                      <th>W-L-D</th>
                      <th className="tiebreak">Buchholz</th>
                      <th className="tiebreak">S-B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionStandings.map((standing, index) => (
                      <tr key={standing.id} className="player-row">
                        <td className="rank">{index + 1}</td>
                        <td>
                          <div className="player-name">{standing.name}</div>
                          {standing.uscf_id && (
                            <div className="player-id">[{standing.uscf_id}]</div>
                          )}
                        </td>
                        <td>{standing.rating || 'Unrated'}</td>
                        <td className="points">{standing.total_points}</td>
                        <td>{standing.games_played}</td>
                        <td>{standing.wins}-{standing.losses}-{standing.draws}</td>
                        <td className="tiebreak">{standing.buchholz?.toFixed(1) || '-'}</td>
                        <td className="tiebreak">{standing.sonneborn_berger?.toFixed(1) || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTournamentReport = () => (
    <div className="section">
      {/* Tournament Summary */}
      <div className="tournament-info">
        <h3>Tournament Summary</h3>
        <p><strong>Format:</strong> {tournament.format}</p>
        <p><strong>Rounds:</strong> {tournament.rounds}</p>
        <p><strong>Players:</strong> {standings.length}</p>
        <p><strong>Status:</strong> 
          <span className={`status-badge status-${tournament.status}`}>
            {tournament.status}
          </span>
        </p>
        {tournament.chief_td_name && (
          <p><strong>Chief TD:</strong> {tournament.chief_td_name}</p>
        )}
        {tournament.chief_arbiter_name && (
          <p><strong>Chief Arbiter:</strong> {tournament.chief_arbiter_name}</p>
        )}
      </div>

      {/* Standings */}
      {renderStandings()}

      {/* Pairings for each round */}
      {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(round => (
        <div key={round} className="page-break">
          <h2 className="tournament-subtitle">Round {round} Pairings</h2>
          {/* Note: In a real implementation, you'd fetch pairings for each round */}
          <p className="text-gray-600">Pairings for Round {round} would be displayed here</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="printable-content">
      {renderTournamentHeader()}
      
      {viewType === 'pairings' && renderPairings()}
      {viewType === 'standings' && renderStandings()}
      {viewType === 'report' && renderTournamentReport()}
      
      <div className="print-footer">
        Generated on {new Date().toLocaleString()} | {tournament.name}
      </div>
    </div>
  );
};

export default PrintableView;
