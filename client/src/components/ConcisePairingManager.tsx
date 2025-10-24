import React, { useState, useEffect } from 'react';
import { Tournament, Player } from '../types';
import { pairingApi, tournamentApi } from '../services/api';

interface ConcisePairingManagerProps {
  tournament: Tournament;
  sectionName: string;
  players: Player[];
  onPairingsUpdate: () => void;
  onUpdateResult: (pairingId: string, result: string) => void;
  onPrint: (section: string, round: number) => void;
  isLoading: boolean;
}

interface PlayerScore {
  id: string;
  name: string;
  points: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
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
  isCustom?: boolean;
}

interface DragState {
  isDragging: boolean;
  draggedPlayer: Player | null;
  draggedFrom: 'white' | 'black' | 'unpaired' | null;
  draggedFromBoard: number | null;
  draggedFromPairingId: string | null;
}

const ConcisePairingManager: React.FC<ConcisePairingManagerProps> = ({
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPairingMethod, setSelectedPairingMethod] = useState<string>('fide_dutch');
  const [showCustomBoard, setShowCustomBoard] = useState(false);
  const [customBoardPlayers, setCustomBoardPlayers] = useState<{white: Player | null, black: Player | null}>({white: null, black: null});
  const [playerScores, setPlayerScores] = useState<Map<string, PlayerScore>>(new Map());
  const [isSectionComplete, setIsSectionComplete] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedPlayer: null,
    draggedFrom: null,
    draggedFromBoard: null,
    draggedFromPairingId: null
  });

  const allPlayers = players;

  useEffect(() => {
    loadSectionData();
    loadPlayerScores();
  }, [tournament.id, sectionName, currentRound]);

  const loadSectionData = async () => {
    try {
      setError(null);
      
      const pairingsResponse = await pairingApi.getSectionPairings(
        tournament.id, 
        currentRound, 
        sectionName
      );
      
      if (pairingsResponse.data.success) {
        setPairings(pairingsResponse.data.pairings);
      }
    } catch (error) {
      console.error(`Error loading ${sectionName} section data:`, error);
      setError(`Failed to load ${sectionName} section data`);
    }
  };

  const loadPlayerScores = async () => {
    try {
      const standingsResponse = await pairingApi.getStandings(tournament.id, false, false);
      
      if (standingsResponse.data.success) {
        const scoresMap = new Map<string, PlayerScore>();
        
        // Filter standings for this section only
        const sectionStandings = standingsResponse.data.data.filter((standing: any) => 
          (standing.section || 'Open') === sectionName
        );
        
        sectionStandings.forEach((standing: any) => {
          scoresMap.set(standing.id, {
            id: standing.id,
            name: standing.name,
            points: standing.total_points || 0,
            games_played: standing.games_played || 0,
            wins: standing.wins || 0,
            losses: standing.losses || 0,
            draws: standing.draws || 0
          });
        });
        
        setPlayerScores(scoresMap);
      }
    } catch (error) {
      console.error('Error loading player scores:', error);
      // Don't set error state for scores as it's not critical
    }
  };

  const handleGeneratePairings = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // First, update the tournament settings with the selected pairing method
      const currentSettings = tournament.settings || {};
      const updatedSettings = {
        ...currentSettings,
        pairing_method: selectedPairingMethod as 'fide_dutch' | 'us_chess' | 'round_robin' | 'quad' | 'single_elimination'
      };
      
      // Update tournament settings
      await tournamentApi.update(tournament.id, {
        ...tournament,
        settings: updatedSettings
      });

      // First try to clear existing pairings for this section and round
      try {
        await pairingApi.resetPairings(tournament.id, currentRound, sectionName);
      } catch (clearError) {
        console.log('No existing pairings to clear or clear failed:', clearError);
      }

      const response = await pairingApi.generateSectionPairings(
        tournament.id,
        currentRound,
        sectionName
      );

      if (response.data.success) {
        setPairings(response.data.pairings);
        onPairingsUpdate();
      } else {
        setError(response.data.message || 'Failed to generate pairings');
      }
    } catch (error: any) {
      console.error(`Error generating ${sectionName} pairings:`, error);
      setError(error.response?.data?.error || 'Failed to generate pairings');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateResult = async (pairingId: string, result: string) => {
    try {
      await onUpdateResult(pairingId, result);
      await loadSectionData();
      await loadPlayerScores(); // Refresh scores after updating result
      
      // Check if section is complete after updating result
      await checkSectionCompletion();
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, player: Player, from: 'white' | 'black' | 'unpaired', boardNumber?: number, pairingId?: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragState({
      isDragging: true,
      draggedPlayer: player,
      draggedFrom: from,
      draggedFromBoard: boardNumber || null,
      draggedFromPairingId: pairingId || null
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetPosition: 'white' | 'black', targetBoard: number, targetPairingId: string) => {
    e.preventDefault();
    
    if (!dragState.draggedPlayer || !dragState.isDragging) return;

    if (dragState.draggedFrom === targetPosition && 
        dragState.draggedFromBoard === targetBoard && 
        dragState.draggedFromPairingId === targetPairingId) {
      setDragState({
        isDragging: false,
        draggedPlayer: null,
        draggedFrom: null,
        draggedFromBoard: null,
        draggedFromPairingId: null
      });
      return;
    }

    try {
      const updatedPairings = pairings.map(pairing => {
        if (pairing.id === targetPairingId) {
          const updatedPairing = { ...pairing };
          if (targetPosition === 'white') {
            updatedPairing.white_player_id = dragState.draggedPlayer!.id;
            updatedPairing.white_name = dragState.draggedPlayer!.name;
            updatedPairing.white_rating = dragState.draggedPlayer!.rating || 0;
            updatedPairing.white_uscf_id = dragState.draggedPlayer!.uscf_id || '';
          } else {
            updatedPairing.black_player_id = dragState.draggedPlayer!.id;
            updatedPairing.black_name = dragState.draggedPlayer!.name;
            updatedPairing.black_rating = dragState.draggedPlayer!.rating || 0;
            updatedPairing.black_uscf_id = dragState.draggedPlayer!.uscf_id || '';
          }
          return updatedPairing;
        }
        return pairing;
      });

      if (dragState.draggedFromPairingId && dragState.draggedFromPairingId !== targetPairingId) {
        const sourcePairing = updatedPairings.find(p => p.id === dragState.draggedFromPairingId);
        if (sourcePairing) {
          const sourceUpdatedPairing = { ...sourcePairing };
          if (dragState.draggedFrom === 'white') {
            sourceUpdatedPairing.white_player_id = '';
            sourceUpdatedPairing.white_name = '';
            sourceUpdatedPairing.white_rating = 0;
            sourceUpdatedPairing.white_uscf_id = '';
          } else {
            sourceUpdatedPairing.black_player_id = '';
            sourceUpdatedPairing.black_name = '';
            sourceUpdatedPairing.black_rating = 0;
            sourceUpdatedPairing.black_uscf_id = '';
          }
          const sourceIndex = updatedPairings.findIndex(p => p.id === dragState.draggedFromPairingId);
          updatedPairings[sourceIndex] = sourceUpdatedPairing;
        }
      }

      setPairings(updatedPairings);
      
      try {
        const targetPairing = updatedPairings.find(p => p.id === targetPairingId);
        if (targetPairing) {
          await pairingApi.updatePairingPlayers(
            targetPairingId,
            targetPairing.white_player_id,
            targetPairing.black_player_id,
            {
              id: targetPairing.white_player_id,
              name: targetPairing.white_name,
              rating: targetPairing.white_rating,
              uscf_id: targetPairing.white_uscf_id
            },
            {
              id: targetPairing.black_player_id,
              name: targetPairing.black_name,
              rating: targetPairing.black_rating,
              uscf_id: targetPairing.black_uscf_id
            }
          );
        }
      } catch (error) {
        console.error('Error updating pairing in backend:', error);
        await loadSectionData();
      }
      
    } catch (error) {
      console.error('Error updating pairing:', error);
      setError('Failed to update pairing');
    } finally {
      setDragState({
        isDragging: false,
        draggedPlayer: null,
        draggedFrom: null,
        draggedFromBoard: null,
        draggedFromPairingId: null
      });
    }
  };

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedPlayer: null,
      draggedFrom: null,
      draggedFromBoard: null,
      draggedFromPairingId: null
    });
  };

  // Custom board creation
  const handleCreateCustomBoard = async () => {
    if (!customBoardPlayers.white || !customBoardPlayers.black) {
      setError('Please select both white and black players');
      return;
    }

    try {
      const maxBoard = Math.max(...pairings.map(p => p.board), 0);
      const newBoard = maxBoard + 1;

      const newPairing: SectionPairing = {
        id: `custom-${Date.now()}`,
        tournament_id: tournament.id,
        round: currentRound,
        board: newBoard,
        white_player_id: customBoardPlayers.white.id,
        black_player_id: customBoardPlayers.black.id,
        result: null,
        section: sectionName,
        white_name: customBoardPlayers.white.name,
        white_rating: customBoardPlayers.white.rating || 0,
        white_uscf_id: customBoardPlayers.white.uscf_id || '',
        black_name: customBoardPlayers.black.name,
        black_rating: customBoardPlayers.black.rating || 0,
        black_uscf_id: customBoardPlayers.black.uscf_id || '',
        isCustom: true
      };

      setPairings([...pairings, newPairing]);
      setCustomBoardPlayers({white: null, black: null});
      setShowCustomBoard(false);
      
      try {
        const response = await pairingApi.createCustomPairing(
          tournament.id,
          currentRound,
          sectionName,
          customBoardPlayers.white,
          customBoardPlayers.black
        );
        
        if (response.data.success) {
          const updatedPairing = { ...newPairing, id: response.data.pairingId };
          setPairings(prev => prev.map(p => p.id === newPairing.id ? updatedPairing : p));
        }
      } catch (error) {
        console.error('Error creating custom pairing in backend:', error);
        setPairings(pairings);
        setError('Failed to create custom pairing');
      }
      
    } catch (error) {
      console.error('Error creating custom board:', error);
      setError('Failed to create custom board');
    }
  };

  const handleDeletePairing = async (pairingId: string) => {
    try {
      await pairingApi.deletePairing(pairingId);
      setPairings(pairings.filter(p => p.id !== pairingId));
    } catch (error) {
      console.error('Error deleting pairing:', error);
      setError('Failed to delete pairing');
    }
  };

  const getUnpairedPlayers = () => {
    const pairedPlayerIds = new Set();
    pairings.forEach(pairing => {
      if (pairing.white_player_id) pairedPlayerIds.add(pairing.white_player_id);
      if (pairing.black_player_id) pairedPlayerIds.add(pairing.black_player_id);
    });
    
    return allPlayers.filter(player => !pairedPlayerIds.has(player.id));
  };

  const getPlayerScore = (playerId: string): PlayerScore | null => {
    return playerScores.get(playerId) || null;
  };

  const checkSectionCompletion = async () => {
    try {
      // Check if this is the last round for this section
      if (currentRound === tournament.rounds) {
        // Get section status to see if all pairings are complete
        const statusResponse = await pairingApi.getSectionStatus(
          tournament.id, 
          currentRound, 
          sectionName
        );
        
        if (statusResponse.data.success && statusResponse.data.isComplete) {
          // Section is complete - trigger final standings calculation
          await handleSectionCompletion();
        }
      }
    } catch (error) {
      console.error('Error checking section completion:', error);
    }
  };

  const handleSectionCompletion = async () => {
    try {
      // Calculate final standings for this section
      const standingsResponse = await pairingApi.getStandings(tournament.id, true, true);
      
      if (standingsResponse.data.success) {
        // Filter standings for this section
        const sectionStandings = standingsResponse.data.data.filter((standing: any) => 
          (standing.section || 'Open') === sectionName
        );
        
        // Update tournament status to completed for this section
        await pairingApi.updateTournamentStatus(tournament.id, 'completed');
        
        // Mark section as complete
        setIsSectionComplete(true);
        
        // Show completion message
        alert(`🎉 ${sectionName} Section Complete!\n\nFinal standings have been calculated. Check the standings tab to see results and prizes.`);
        
        // Refresh standings in parent component
        onPairingsUpdate();
      }
    } catch (error) {
      console.error('Error handling section completion:', error);
    }
  };

  const unpairedPlayers = getUnpairedPlayers();

  return (
    <div className="concise-pairing-manager">
      {/* Compact Header */}
      <div className="compact-header">
        <div className="section-info">
          <div className="section-title-row">
            <h3>{sectionName}</h3>
            {isSectionComplete && (
              <div className="section-complete-badge">
                ✅ Complete
              </div>
            )}
          </div>
          <span className="round-info">Round {currentRound}</span>
        </div>
        
        <div className="compact-controls">
          <div className="round-nav">
            <button 
              onClick={() => handleRoundChange(currentRound - 1)}
              disabled={currentRound <= 1}
              className="btn-sm"
            >
              ←
            </button>
            <button 
              onClick={() => handleRoundChange(currentRound + 1)}
              disabled={currentRound >= tournament.rounds}
              className="btn-sm"
            >
              →
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <label htmlFor="pairing-method" className="text-xs font-medium text-gray-600">
              Method:
            </label>
            <select
              id="pairing-method"
              value={selectedPairingMethod}
              onChange={(e) => setSelectedPairingMethod(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="fide_dutch">FIDE Dutch</option>
              <option value="round_robin">Round Robin</option>
              <option value="quad">Quad</option>
              <option value="single_elimination">Elimination</option>
            </select>
          </div>
          
          <button
            onClick={handleGeneratePairings}
            disabled={isGenerating || isLoading || isSectionComplete}
            className="btn-primary btn-sm"
          >
            {isGenerating ? '...' : isSectionComplete ? 'Complete' : 'Generate'}
          </button>
          
          <button
            onClick={() => setShowCustomBoard(!showCustomBoard)}
            className="btn-outline btn-sm"
          >
            {showCustomBoard ? 'Cancel' : 'Custom'}
          </button>
          
          <button
            onClick={() => onPrint(sectionName, currentRound)}
            disabled={pairings.length === 0}
            className="btn-outline btn-sm"
          >
            Print
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)} className="close-btn">×</button>
        </div>
      )}

      {/* Custom Board Creation - Compact */}
      {showCustomBoard && (
        <div className="custom-board-compact">
          <div className="player-selects">
            <select
              value={customBoardPlayers.white?.id || ''}
              onChange={(e) => {
                const player = allPlayers.find(p => p.id === e.target.value);
                setCustomBoardPlayers(prev => ({...prev, white: player || null}));
              }}
            >
              <option value="">White Player</option>
              {allPlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.rating || 0})
                </option>
              ))}
            </select>
            
            <select
              value={customBoardPlayers.black?.id || ''}
              onChange={(e) => {
                const player = allPlayers.find(p => p.id === e.target.value);
                setCustomBoardPlayers(prev => ({...prev, black: player || null}));
              }}
            >
              <option value="">Black Player</option>
              {allPlayers.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} ({player.rating || 0})
                </option>
              ))}
            </select>
          </div>
          
          <div className="custom-actions">
            <button
              onClick={handleCreateCustomBoard}
              disabled={!customBoardPlayers.white || !customBoardPlayers.black}
              className="btn-primary btn-sm"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Unpaired Players - Compact */}
      {unpairedPlayers.length > 0 && (
        <div className="unpaired-compact">
          <span className="unpaired-label">Unpaired:</span>
          <div className="unpaired-list">
            {unpairedPlayers.slice(0, 5).map(player => {
              const score = getPlayerScore(player.id);
              return (
                <div
                  key={player.id}
                  className="unpaired-player"
                  draggable
                  onDragStart={(e) => handleDragStart(e, player, 'unpaired')}
                  onDragEnd={handleDragEnd}
                  title={`${player.name} (${player.rating || 0})${score ? ` - ${score.points}pts` : ''}`}
                >
                  <div className="unpaired-player-name">{player.name}</div>
                  {score && (
                    <div className="unpaired-player-score">{score.points}pts</div>
                  )}
                </div>
              );
            })}
            {unpairedPlayers.length > 5 && (
              <span className="more-count">+{unpairedPlayers.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      {/* Pairings Table - Compact */}
      {pairings.length > 0 ? (
        <div className="pairings-compact">
          <table>
            <thead>
              <tr>
                <th>Board</th>
                <th>White</th>
                <th>Black</th>
                <th>Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pairings.map((pairing) => (
                <tr key={pairing.id} className={pairing.isCustom ? 'custom-row' : ''}>
                  <td className="board-cell">
                    <span className="board-num">{pairing.board}</span>
                    {pairing.isCustom && <span className="custom-badge">C</span>}
                  </td>
                  
                  <td
                    className={`player-slot ${dragState.isDragging ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'white', pairing.board, pairing.id)}
                  >
                    {pairing.white_player_id ? (
                      <div
                        className="player-compact draggable"
                        draggable
                        onDragStart={(e) => handleDragStart(e, {
                          id: pairing.white_player_id,
                          name: pairing.white_name,
                          rating: pairing.white_rating || 0,
                          uscf_id: pairing.white_uscf_id || '',
                          section: sectionName
                        } as Player, 'white', pairing.board, pairing.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="player-name">{pairing.white_name}</div>
                        <div className="player-details">
                          <span className="player-rating">{pairing.white_rating}</span>
                          {getPlayerScore(pairing.white_player_id) && (
                            <span className="player-score">
                              {getPlayerScore(pairing.white_player_id)!.points}pts
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-slot">Drop here</div>
                    )}
                  </td>
                  
                  <td
                    className={`player-slot ${dragState.isDragging ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'black', pairing.board, pairing.id)}
                  >
                    {pairing.black_player_id ? (
                      <div
                        className="player-compact draggable"
                        draggable
                        onDragStart={(e) => handleDragStart(e, {
                          id: pairing.black_player_id,
                          name: pairing.black_name,
                          rating: pairing.black_rating || 0,
                          uscf_id: pairing.black_uscf_id || '',
                          section: sectionName
                        } as Player, 'black', pairing.board, pairing.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="player-name">{pairing.black_name}</div>
                        <div className="player-details">
                          <span className="player-rating">{pairing.black_rating}</span>
                          {getPlayerScore(pairing.black_player_id) && (
                            <span className="player-score">
                              {getPlayerScore(pairing.black_player_id)!.points}pts
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-slot">Drop here</div>
                    )}
                  </td>
                  
                  <td>
                    <select
                      value={pairing.result || ''}
                      onChange={(e) => handleUpdateResult(pairing.id, e.target.value)}
                      className="result-select"
                    >
                      <option value="">-</option>
                      <option value="1-0">1-0</option>
                      <option value="0-1">0-1</option>
                      <option value="1/2-1/2">½-½</option>
                      <option value="1-0F">1-0F</option>
                      <option value="0-1F">0-1F</option>
                      <option value="1/2-1/2F">½-½F</option>
                    </select>
                  </td>
                  
                  <td>
                    <div className="actions-compact">
                      <button
                        onClick={() => handleUpdateResult(pairing.id, '')}
                        className="btn-sm btn-outline"
                        disabled={!pairing.result}
                        title="Clear result"
                      >
                        ✕
                      </button>
                      {pairing.isCustom && (
                        <button
                          onClick={() => handleDeletePairing(pairing.id)}
                          className="btn-sm btn-danger"
                          title="Delete pairing"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-pairings-compact">
          <p>No pairings for Round {currentRound}</p>
          <button
            onClick={handleGeneratePairings}
            disabled={isGenerating || isLoading || isSectionComplete}
            className="btn-primary"
          >
            {isGenerating ? 'Generating...' : isSectionComplete ? 'Section Complete' : 'Generate Pairings'}
          </button>
        </div>
      )}

      <style>{`
        .concise-pairing-manager {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .compact-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f0f0f0;
        }

        .section-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-info h3 {
          margin: 0;
          font-size: 1.2rem;
          color: #333;
        }

        .section-complete-badge {
          background: #28a745;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .round-info {
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #666;
        }

        .compact-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .round-nav {
          display: flex;
          gap: 4px;
        }

        .error-banner {
          background: #f8d7da;
          color: #721c24;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }

        .close-btn {
          background: none;
          border: none;
          color: #721c24;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
        }

        .custom-board-compact {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          border: 1px solid #e0e0e0;
        }

        .player-selects {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }

        .player-selects select {
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .custom-actions {
          display: flex;
          gap: 8px;
        }

        .unpaired-compact {
          background: #fff3cd;
          padding: 8px 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          border: 1px solid #ffeaa7;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .unpaired-label {
          font-weight: 500;
          color: #856404;
          font-size: 0.9rem;
        }

        .unpaired-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .unpaired-player {
          background: white;
          padding: 4px 8px;
          border-radius: 3px;
          border: 1px solid #ffeaa7;
          cursor: grab;
          font-size: 0.8rem;
          white-space: nowrap;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .unpaired-player-name {
          font-weight: 500;
        }

        .unpaired-player-score {
          background: #28a745;
          color: white;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 0.7rem;
          font-weight: bold;
        }

        .unpaired-player:hover {
          background: #f8f9fa;
        }

        .unpaired-player:active {
          cursor: grabbing;
        }

        .more-count {
          color: #666;
          font-size: 0.8rem;
          font-style: italic;
        }

        .pairings-compact {
          overflow-x: auto;
        }

        .pairings-compact table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .pairings-compact th,
        .pairings-compact td {
          padding: 8px 6px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        .pairings-compact th {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 0.8rem;
          color: #666;
        }

        .custom-row {
          background: #f0f8ff;
        }

        .board-cell {
          text-align: center;
          width: 60px;
        }

        .board-num {
          font-weight: bold;
          color: #333;
        }

        .custom-badge {
          background: #007bff;
          color: white;
          padding: 1px 4px;
          border-radius: 2px;
          font-size: 0.7rem;
          margin-left: 4px;
        }

        .player-slot {
          min-height: 40px;
          padding: 4px;
          border: 2px dashed transparent;
          border-radius: 3px;
          transition: all 0.2s;
        }

        .player-slot.drag-over {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .player-compact {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 3px;
          padding: 6px;
          cursor: grab;
          transition: all 0.2s;
        }

        .player-compact:hover {
          background: #f8f9fa;
        }

        .player-compact:active {
          cursor: grabbing;
        }

        .player-name {
          font-weight: 500;
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .player-details {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .player-rating {
          font-size: 0.75rem;
          color: #666;
          font-weight: 500;
        }

        .player-score {
          background: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.7rem;
          font-weight: bold;
        }

        .empty-slot {
          color: #999;
          font-style: italic;
          text-align: center;
          padding: 8px;
          border: 2px dashed #ddd;
          border-radius: 3px;
          font-size: 0.8rem;
        }

        .result-select {
          padding: 4px 6px;
          border: 1px solid #ddd;
          border-radius: 3px;
          background: white;
          font-size: 0.85rem;
          min-width: 60px;
        }

        .actions-compact {
          display: flex;
          gap: 4px;
        }

        .no-pairings-compact {
          text-align: center;
          padding: 30px;
          color: #666;
        }

        .no-pairings-compact p {
          margin-bottom: 15px;
        }

        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.8rem;
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

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }
      `}</style>
    </div>
  );
};

export default ConcisePairingManager;
