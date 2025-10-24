import React, { useState, useEffect } from 'react';
import { Tournament, Player } from '../types';
import { pairingApi } from '../services/api';

interface SectionPairingManagerProps {
  tournament: Tournament;
  sectionName: string;
  players: Player[];
  onPairingsUpdate: () => void;
  onUpdateResult: (pairingId: string, result: string) => void;
  onPrint: (section: string, round: number) => void;
  isLoading: boolean;
}

interface SectionPairing {
  id: string;
  tournament_id: string;
  round: number;
  board: number;
  white_player_id: string;
  black_player_id: string;
  result: string | null;
  section: string;
  white_name: string;
  white_rating: number;
  white_uscf_id: string;
  black_name: string;
  black_rating: number;
  black_uscf_id: string;
}

interface SectionStatus {
  section: string;
  round: number;
  totalPairings: number;
  completedPairings: number;
  pendingPairings: number;
  percentage: number;
  isComplete: boolean;
  hasPairings: boolean;
  canGenerateNextRound: boolean;
}

const SectionPairingManager: React.FC<SectionPairingManagerProps> = ({
  tournament,
  sectionName,
  players,
  onPairingsUpdate,
  onUpdateResult,
  onPrint,
  isLoading
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [pairings, setPairings] = useState<SectionPairing[]>([]);
  const [sectionStatus, setSectionStatus] = useState<SectionStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter players for this section
  const sectionPlayers = players.filter(player => 
    (player.section || 'Open') === sectionName
  );

  // Load section data when component mounts or round changes
  useEffect(() => {
    loadSectionData();
  }, [tournament.id, sectionName, currentRound]);

  const loadSectionData = async () => {
    try {
      setError(null);
      
      // Load pairings for this section and round
      const pairingsResponse = await pairingApi.getSectionPairings(
        tournament.id, 
        currentRound, 
        sectionName
      );
      
      if (pairingsResponse.data.success) {
        setPairings(pairingsResponse.data.pairings);
        setSectionStatus(pairingsResponse.data.sectionStatus);
      }

      // Load section status
      const statusResponse = await pairingApi.getSectionStatus(
        tournament.id, 
        currentRound, 
        sectionName
      );
      
      if (statusResponse.data.success) {
        setSectionStatus(statusResponse.data);
      }
    } catch (error) {
      console.error(`Error loading ${sectionName} section data:`, error);
      setError(`Failed to load ${sectionName} section data`);
    }
  };

  const handleGeneratePairings = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await pairingApi.generateSectionPairings(
        tournament.id,
        currentRound,
        sectionName
      );

      if (response.data.success) {
        setPairings(response.data.pairings);
        setSectionStatus(response.data.sectionStatus);
        onPairingsUpdate();
      } else {
        setError('Failed to generate pairings');
      }
    } catch (error) {
      console.error(`Error generating ${sectionName} pairings:`, error);
      setError(`Failed to generate ${sectionName} pairings`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateResult = async (pairingId: string, result: string) => {
    try {
      await onUpdateResult(pairingId, result);
      await loadSectionData(); // Reload to get updated status
      // The parent component will handle refreshing standings
    } catch (error) {
      console.error('Error updating result:', error);
      setError('Failed to update result');
    }
  };

  const handleRoundChange = (round: number) => {
    if (round >= 1 && round <= tournament.rounds) {
      setCurrentRound(round);
    }
  };

  const handlePrint = () => {
    onPrint(sectionName, currentRound);
  };

  return (
    <div className="section-pairing-manager">
      <div className="section-header">
        <h3 className="section-title">{sectionName} Section</h3>
        <div className="section-controls">
          <div className="round-navigation">
            <button 
              onClick={() => handleRoundChange(currentRound - 1)}
              disabled={currentRound <= 1}
              className="btn btn-sm btn-outline"
            >
              ← Previous
            </button>
            <span className="round-display">Round {currentRound}</span>
            <button 
              onClick={() => handleRoundChange(currentRound + 1)}
              disabled={currentRound >= tournament.rounds}
              className="btn btn-sm btn-outline"
            >
              Next →
            </button>
          </div>
          
          <div className="section-actions">
            <button
              onClick={handleGeneratePairings}
              disabled={isGenerating || isLoading}
              className="btn btn-primary"
            >
              {isGenerating ? 'Generating...' : 'Generate Pairings'}
            </button>
            
            <button
              onClick={handlePrint}
              disabled={pairings.length === 0}
              className="btn btn-outline"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {sectionStatus && (
        <div className="section-status">
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Total Pairings:</span>
              <span className="status-value">{sectionStatus.totalPairings}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Completed:</span>
              <span className="status-value">{sectionStatus.completedPairings}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Pending:</span>
              <span className="status-value">{sectionStatus.pendingPairings}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Progress:</span>
              <span className="status-value">{sectionStatus.percentage}%</span>
            </div>
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className={`status-value ${sectionStatus.isComplete ? 'complete' : 'incomplete'}`}>
                {sectionStatus.isComplete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
          </div>
        </div>
      )}

      {pairings.length > 0 ? (
        <div className="pairings-table">
          <table>
            <thead>
              <tr>
                <th>Board</th>
                <th>White Player</th>
                <th>Black Player</th>
                <th>Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pairings.map((pairing) => (
                <tr key={pairing.id}>
                  <td>{pairing.board}</td>
                  <td>
                    <div className="player-info">
                      <div className="player-name">{pairing.white_name}</div>
                      <div className="player-details">
                        {pairing.white_rating} ({pairing.white_uscf_id})
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="player-info">
                      <div className="player-name">{pairing.black_name}</div>
                      <div className="player-details">
                        {pairing.black_rating} ({pairing.black_uscf_id})
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={pairing.result || ''}
                      onChange={(e) => handleUpdateResult(pairing.id, e.target.value)}
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
                    <button
                      onClick={() => handleUpdateResult(pairing.id, '')}
                      className="btn btn-sm btn-outline"
                      disabled={!pairing.result}
                    >
                      Clear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-pairings">
          <p>No pairings found for {sectionName} section, Round {currentRound}</p>
          <button
            onClick={handleGeneratePairings}
            disabled={isGenerating || isLoading}
            className="btn btn-primary"
          >
            {isGenerating ? 'Generating...' : 'Generate Pairings'}
          </button>
        </div>
      )}

      <style>{`
        .section-pairing-manager {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          background: white;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e0e0e0;
        }

        .section-title {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }

        .section-controls {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .round-navigation {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .round-display {
          font-weight: bold;
          min-width: 80px;
          text-align: center;
        }

        .section-actions {
          display: flex;
          gap: 10px;
        }

        .section-status {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-label {
          font-weight: 500;
          color: #666;
        }

        .status-value {
          font-weight: bold;
          color: #333;
        }

        .status-value.complete {
          color: #28a745;
        }

        .status-value.incomplete {
          color: #dc3545;
        }

        .pairings-table {
          overflow-x: auto;
        }

        .pairings-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .pairings-table th,
        .pairings-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .pairings-table th {
          background: #f8f9fa;
          font-weight: 600;
        }

        .player-info {
          display: flex;
          flex-direction: column;
        }

        .player-name {
          font-weight: 500;
        }

        .player-details {
          font-size: 0.9rem;
          color: #666;
        }

        .result-select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .no-pairings {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-outline {
          background: transparent;
          color: #007bff;
          border: 1px solid #007bff;
        }

        .btn-outline:hover:not(:disabled) {
          background: #007bff;
          color: white;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default SectionPairingManager;
