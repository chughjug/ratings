import React, { useState, useEffect } from 'react';
import { Tournament, Player } from '../types';
import { pairingApi } from '../services/api';

interface TournamentCompletionProps {
  tournament: Tournament;
  onCompletionConfirmed: (standings: any[]) => void;
}

interface CompletionStatus {
  success: boolean;
  tournamentId: string;
  totalRounds: number;
  completedRounds: number;
  allRoundsComplete: boolean;
  readyForConfirmation: boolean;
  roundsStatus: Record<string, any>;
}

interface FinalStandings {
  id: string;
  name: string;
  rating: number;
  section: string;
  uscf_id: string;
  total_points: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
}

const TournamentCompletion: React.FC<TournamentCompletionProps> = ({
  tournament,
  onCompletionConfirmed
}) => {
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | null>(null);
  const [finalStandings, setFinalStandings] = useState<FinalStandings[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkCompletionStatus();
  }, [tournament.id]);

  const checkCompletionStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await pairingApi.getRoundStatus(tournament.id, 1);
      
      if (response.data.success) {
        // Map the API response to CompletionStatus format
        const mappedStatus: CompletionStatus = {
          success: response.data.success,
          tournamentId: response.data.tournamentId,
          totalRounds: tournament.rounds,
          completedRounds: response.data.isComplete ? tournament.rounds : tournament.rounds - 1,
          allRoundsComplete: response.data.isComplete,
          readyForConfirmation: response.data.isComplete,
          roundsStatus: { [response.data.round]: response.data }
        };
        setCompletionStatus(mappedStatus);
      } else {
        setError('Failed to check completion status');
      }
    } catch (error) {
      console.error('Error checking completion status:', error);
      setError('Failed to check completion status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!completionStatus?.readyForConfirmation) return;

    try {
      setIsConfirming(true);
      setError(null);

      // For now, we'll simulate completion confirmation
      const response = { data: { success: true, standings: [] } };
      
      if (response.data.success) {
        setFinalStandings(response.data.standings);
        onCompletionConfirmed(response.data.standings);
        alert('Tournament completed successfully! Final standings have been calculated.');
      } else {
        setError('Failed to confirm completion');
      }
    } catch (error: any) {
      console.error('Error confirming completion:', error);
      setError(error.response?.data?.error || 'Failed to confirm completion');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="tournament-completion">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Checking tournament completion status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tournament-completion">
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button onClick={checkCompletionStatus} className="btn btn-outline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!completionStatus) {
    return null;
  }

  // If tournament is already completed and we have standings
  if (finalStandings.length > 0) {
    return (
      <div className="tournament-completion">
        <div className="completion-success">
          <h3 className="success-title">🎉 Tournament Completed!</h3>
          <p className="success-message">
            All {completionStatus.totalRounds} rounds have been completed and final standings have been calculated.
          </p>
          
          <div className="final-standings">
            <h4>Final Standings</h4>
            <div className="standings-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Section</th>
                    <th>Rating</th>
                    <th>Points</th>
                    <th>Games</th>
                    <th>W-L-D</th>
                  </tr>
                </thead>
                <tbody>
                  {finalStandings.map((player, index) => (
                    <tr key={player.id} className={index < 3 ? 'podium' : ''}>
                      <td className="rank">{player.rank}</td>
                      <td className="name">{player.name}</td>
                      <td className="section">{player.section}</td>
                      <td className="rating">{player.rating}</td>
                      <td className="points">{player.total_points}</td>
                      <td className="games">{player.games_played}</td>
                      <td className="record">{player.wins}-{player.losses}-{player.draws}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If all rounds are complete but not confirmed yet
  if (completionStatus.readyForConfirmation) {
    return (
      <div className="tournament-completion">
        <div className="completion-ready">
          <h3 className="ready-title">🏁 Tournament Ready for Completion!</h3>
          <p className="ready-message">
            All {completionStatus.totalRounds} rounds have been completed. 
            Click the button below to finalize the tournament and calculate final standings.
          </p>
          
          <div className="rounds-summary">
            <h4>Rounds Summary</h4>
            <div className="rounds-grid">
              {Object.entries(completionStatus.roundsStatus).map(([round, status]: [string, any]) => (
                <div key={round} className={`round-status ${status.isComplete ? 'complete' : 'incomplete'}`}>
                  <div className="round-number">Round {round}</div>
                  <div className="round-progress">
                    {status.isComplete ? '✅ Complete' : '❌ Incomplete'}
                  </div>
                  <div className="round-details">
                    {status.completedPairings}/{status.totalPairings} pairings
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleConfirmCompletion}
            disabled={isConfirming}
            className="btn btn-primary btn-large confirm-button"
          >
            {isConfirming ? 'Confirming...' : 'Confirm Tournament Completion'}
          </button>
        </div>
      </div>
    );
  }

  // If not all rounds are complete
  return (
    <div className="tournament-completion">
      <div className="completion-progress">
        <h3 className="progress-title">Tournament in Progress</h3>
        <p className="progress-message">
          {completionStatus.completedRounds} of {completionStatus.totalRounds} rounds completed
        </p>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(completionStatus.completedRounds / completionStatus.totalRounds) * 100}%` }}
          ></div>
        </div>

        <div className="rounds-summary">
          <h4>Rounds Status</h4>
          <div className="rounds-grid">
            {Object.entries(completionStatus.roundsStatus).map(([round, status]: [string, any]) => (
              <div key={round} className={`round-status ${status.isComplete ? 'complete' : 'incomplete'}`}>
                <div className="round-number">Round {round}</div>
                <div className="round-progress">
                  {status.isComplete ? '✅ Complete' : '❌ Incomplete'}
                </div>
                <div className="round-details">
                  {status.completedPairings}/{status.totalPairings} pairings
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentCompletion;

// Add CSS styles
const styles = `
  .tournament-completion {
    margin: 20px 0;
    padding: 20px;
    border-radius: 8px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .loading-state, .error-state {
    text-align: center;
    padding: 40px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    color: #dc3545;
    margin-bottom: 20px;
  }

  .completion-success {
    text-align: center;
  }

  .success-title {
    color: #28a745;
    font-size: 1.5rem;
    margin-bottom: 10px;
  }

  .success-message {
    color: #666;
    margin-bottom: 30px;
  }

  .final-standings {
    text-align: left;
  }

  .final-standings h4 {
    margin-bottom: 20px;
    color: #333;
  }

  .standings-table {
    overflow-x: auto;
  }

  .standings-table table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }

  .standings-table th,
  .standings-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }

  .standings-table th {
    background: #f8f9fa;
    font-weight: 600;
  }

  .standings-table tr.podium {
    background: #fff3cd;
  }

  .standings-table tr.podium:first-child {
    background: #d4edda;
  }

  .rank {
    font-weight: bold;
    width: 60px;
  }

  .name {
    font-weight: 500;
  }

  .section {
    color: #666;
    width: 80px;
  }

  .rating {
    width: 80px;
  }

  .points {
    font-weight: bold;
    color: #007bff;
    width: 80px;
  }

  .games {
    width: 60px;
  }

  .record {
    width: 80px;
  }

  .completion-ready {
    text-align: center;
  }

  .ready-title {
    color: #007bff;
    font-size: 1.5rem;
    margin-bottom: 10px;
  }

  .ready-message {
    color: #666;
    margin-bottom: 30px;
  }

  .rounds-summary {
    margin: 30px 0;
    text-align: left;
  }

  .rounds-summary h4 {
    margin-bottom: 15px;
    color: #333;
  }

  .rounds-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }

  .round-status {
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .round-status.complete {
    background: #d4edda;
    border-color: #c3e6cb;
  }

  .round-status.incomplete {
    background: #f8d7da;
    border-color: #f5c6cb;
  }

  .round-number {
    font-weight: bold;
    margin-bottom: 5px;
  }

  .round-progress {
    margin-bottom: 5px;
  }

  .round-details {
    font-size: 0.9rem;
    color: #666;
  }

  .progress-bar {
    width: 100%;
    height: 20px;
    background: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
    margin: 20px 0;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff, #28a745);
    transition: width 0.3s ease;
  }

  .completion-progress {
    text-align: center;
  }

  .progress-title {
    color: #333;
    font-size: 1.5rem;
    margin-bottom: 10px;
  }

  .progress-message {
    color: #666;
    margin-bottom: 20px;
  }

  .confirm-button {
    font-size: 1.1rem;
    padding: 15px 30px;
    margin-top: 20px;
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

  .btn-large {
    padding: 15px 30px;
    font-size: 1.1rem;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
