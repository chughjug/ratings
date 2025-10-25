import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, CheckCircle, Clock, Users, Trophy } from 'lucide-react';
import { pairingApi } from '../services/api';

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

interface Pairing {
  id: string;
  white_player_id: string;
  black_player_id: string;
  white_name: string;
  black_name: string;
  white_rating: number;
  black_rating: number;
  white_uscf_id: string;
  black_uscf_id: string;
  result: string;
  is_bye: boolean;
  bye_type?: string;
  board: number;
  section: string;
  round: number;
  tournament_id: string;
}

interface PairingSystemProps {
  tournamentId: string;
  section: string;
  round: number;
  players: Player[];
  onPairingsGenerated: (pairings: Pairing[]) => void;
}

const PairingSystem: React.FC<PairingSystemProps> = ({
  tournamentId,
  section,
  round,
  players,
  onPairingsGenerated
}) => {
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPairings();
  }, [tournamentId, section, round]);

  const loadPairings = async () => {
    try {
      setLoading(true);
      const response = await pairingApi.getByRound(tournamentId, round, section);
      const pairings = (response.data || []).map(pairing => ({
        ...pairing,
        white_name: pairing.white_name || '',
        black_name: pairing.black_name || '',
        white_rating: pairing.white_rating || 0,
        black_rating: pairing.black_rating || 0,
        white_uscf_id: pairing.white_uscf_id || '',
        black_uscf_id: pairing.black_uscf_id || '',
        white_lichess_username: pairing.white_lichess_username || '',
        black_lichess_username: pairing.black_lichess_username || '',
        result: pairing.result || '',
        section: pairing.section || '',
        white_id: pairing.white_id || '',
        black_id: pairing.black_id || ''
      }));
      setPairings(pairings);
      onPairingsGenerated(pairings);
    } catch (err) {
      console.error('Failed to load pairings:', err);
      setError('Failed to load pairings');
    } finally {
      setLoading(false);
    }
  };

  const generatePairings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await pairingApi.generatePairings(tournamentId, section, round);
      setPairings(response.data || []);
      onPairingsGenerated(response.data || []);
    } catch (err: any) {
      console.error('Failed to generate pairings:', err);
      setError(err.response?.data?.message || 'Failed to generate pairings');
    } finally {
      setLoading(false);
    }
  };

  const generateNextRound = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await pairingApi.generateNextRound(tournamentId, section);
      setPairings(response.data || []);
      onPairingsGenerated(response.data || []);
    } catch (err: any) {
      console.error('Failed to generate next round:', err);
      setError(err.response?.data?.message || 'Failed to generate next round');
    } finally {
      setLoading(false);
    }
  };

  const completeRound = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await pairingApi.completeRound(tournamentId, section, round);
      await loadPairings();
    } catch (err: any) {
      console.error('Failed to complete round:', err);
      setError(err.response?.data?.message || 'Failed to complete round');
    } finally {
      setLoading(false);
    }
  };

  const resetSection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await pairingApi.resetSection(tournamentId, section);
      setPairings([]);
      onPairingsGenerated([]);
    } catch (err: any) {
      console.error('Failed to reset section:', err);
      setError(err.response?.data?.message || 'Failed to reset section');
    } finally {
      setLoading(false);
    }
  };

  const hasIncompleteResults = pairings.some(p => !p.is_bye && !p.result);

  return (
    <div className="pairing-system">
      {/* Header */}
      <div className="pairing-header">
        <div className="pairing-title">
          <Trophy className="h-6 w-6" />
          <h2>{section} - Round {round}</h2>
        </div>
        <div className="pairing-stats">
          <div className="stat">
            <Users className="h-4 w-4" />
            <span>{players.length} Players</span>
          </div>
          <div className="stat">
            <Play className="h-4 w-4" />
            <span>{pairings.length} Pairings</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pairing-actions">
        {pairings.length === 0 ? (
          <button
            onClick={generatePairings}
            disabled={loading || players.length < 2}
            className="btn-primary"
          >
            <Play className="h-4 w-4" />
            {round === 1 ? 'Generate Round 1' : `Generate Round ${round}`}
          </button>
        ) : (
          <>
            <button
              onClick={generateNextRound}
              disabled={loading || hasIncompleteResults}
              className="btn-primary"
            >
              <Play className="h-4 w-4" />
              Generate Round {round + 1}
            </button>
            {hasIncompleteResults && (
              <button
                onClick={completeRound}
                disabled={loading}
                className="btn-warning"
              >
                <CheckCircle className="h-4 w-4" />
                Complete Round
              </button>
            )}
            <button
              onClick={resetSection}
              disabled={loading}
              className="btn-danger"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Section
            </button>
          </>
        )}
      </div>

      {/* Pairings Table */}
      {pairings.length > 0 && (
        <div className="pairings-table-container">
          <table className="pairings-table">
            <thead>
              <tr>
                <th>Board</th>
                <th>White Player</th>
                <th>Black Player</th>
                <th>Result</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pairings.map((pairing, index) => (
                <tr key={pairing.id || index} className={pairing.is_bye ? 'bye-row' : ''}>
                  <td className="board-cell">
                    <div className="board-number">
                      {pairing.board || index + 1}
                    </div>
                  </td>
                  <td className="player-cell white-player">
                    {pairing.white_player_id ? (
                      <div className="player-info">
                        <div className="player-name">{pairing.white_name}</div>
                        <div className="player-details">
                          <span className="rating">{pairing.white_rating}</span>
                          <span className="uscf-id">({pairing.white_uscf_id})</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bye-player">BYE</div>
                    )}
                  </td>
                  <td className="player-cell black-player">
                    {pairing.black_player_id ? (
                      <div className="player-info">
                        <div className="player-name">{pairing.black_name}</div>
                        <div className="player-details">
                          <span className="rating">{pairing.black_rating}</span>
                          <span className="uscf-id">({pairing.black_uscf_id})</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bye-player">BYE</div>
                    )}
                  </td>
                  <td className="result-cell">
                    <div className="result-display">
                      {pairing.result || '-'}
                    </div>
                  </td>
                  <td className="status-cell">
                    <div className={`status ${pairing.is_bye ? 'bye' : pairing.result ? 'completed' : 'pending'}`}>
                      {pairing.is_bye ? (
                        <>
                          <Clock className="h-4 w-4" />
                          BYE
                        </>
                      ) : pairing.result ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          Pending
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
};

export default PairingSystem;
