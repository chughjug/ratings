import React, { useState, useEffect } from 'react';
import { Tournament, Player } from '../types';
import { pairingApi } from '../services/api';

interface DraggablePairingManagerProps {
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
  isCustom?: boolean;
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

interface DragState {
  isDragging: boolean;
  draggedPlayer: Player | null;
  draggedFrom: 'white' | 'black' | 'unpaired' | null;
  draggedFromBoard: number | null;
  draggedFromPairingId: string | null;
}

const DraggablePairingManager: React.FC<DraggablePairingManagerProps> = ({
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
  const [showCustomBoard, setShowCustomBoard] = useState(false);
  const [customBoardPlayers, setCustomBoardPlayers] = useState<{white: Player | null, black: Player | null}>({white: null, black: null});
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedPlayer: null,
    draggedFrom: null,
    draggedFromBoard: null,
    draggedFromPairingId: null
  });

  // All players (including those not in this section) for custom boards
  const allPlayers = players;

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
      await loadSectionData();
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

    // If dropping on the same position, do nothing
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
      // Update the pairing with the new player
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

      // If we're moving from another pairing, update that too
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
      
      // Send update to backend
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
        // Revert the local changes if backend update fails
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
      // Find the next available board number
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
      
      // Send to backend
      try {
        const response = await pairingApi.createCustomPairing(
          tournament.id,
          currentRound,
          sectionName,
          customBoardPlayers.white,
          customBoardPlayers.black
        );
        
        if (response.data.success) {
          // Update the pairing with the real ID from backend
          const updatedPairing = { ...newPairing, id: response.data.pairingId };
          setPairings(prev => prev.map(p => p.id === newPairing.id ? updatedPairing : p));
        }
      } catch (error) {
        console.error('Error creating custom pairing in backend:', error);
        // Remove the local pairing if backend creation fails
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
      // Send to backend first
      await pairingApi.deletePairing(pairingId);
      
      // Update local state
      setPairings(pairings.filter(p => p.id !== pairingId));
    } catch (error) {
      console.error('Error deleting pairing:', error);
      setError('Failed to delete pairing');
    }
  };

  // Get unpaired players
  const getUnpairedPlayers = () => {
    const pairedPlayerIds = new Set();
    pairings.forEach(pairing => {
      if (pairing.white_player_id) pairedPlayerIds.add(pairing.white_player_id);
      if (pairing.black_player_id) pairedPlayerIds.add(pairing.black_player_id);
    });
    
    return allPlayers.filter(player => !pairedPlayerIds.has(player.id));
  };

  const unpairedPlayers = getUnpairedPlayers();

  return (
    <div className="draggable-pairing-manager">
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
              onClick={() => setShowCustomBoard(!showCustomBoard)}
              className="btn btn-outline"
            >
              {showCustomBoard ? 'Cancel' : 'Add Custom Board'}
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

      {/* Custom Board Creation */}
      {showCustomBoard && (
        <div className="custom-board-creation">
          <h4>Create Custom Board</h4>
          <div className="custom-board-form">
            <div className="player-selection">
              <div className="player-select">
                <label>White Player:</label>
                <select
                  value={customBoardPlayers.white?.id || ''}
                  onChange={(e) => {
                    const player = allPlayers.find(p => p.id === e.target.value);
                    setCustomBoardPlayers(prev => ({...prev, white: player || null}));
                  }}
                >
                  <option value="">Select White Player</option>
                  {allPlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} ({player.rating}) - {player.section || 'Open'}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="player-select">
                <label>Black Player:</label>
                <select
                  value={customBoardPlayers.black?.id || ''}
                  onChange={(e) => {
                    const player = allPlayers.find(p => p.id === e.target.value);
                    setCustomBoardPlayers(prev => ({...prev, black: player || null}));
                  }}
                >
                  <option value="">Select Black Player</option>
                  {allPlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} ({player.rating}) - {player.section || 'Open'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="custom-board-actions">
              <button
                onClick={handleCreateCustomBoard}
                disabled={!customBoardPlayers.white || !customBoardPlayers.black}
                className="btn btn-primary"
              >
                Create Board
              </button>
              <button
                onClick={() => setShowCustomBoard(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unpaired Players */}
      {unpairedPlayers.length > 0 && (
        <div className="unpaired-players">
          <h4>Unpaired Players</h4>
          <div className="unpaired-grid">
            {unpairedPlayers.map(player => (
              <div
                key={player.id}
                className="unpaired-player"
                draggable
                onDragStart={(e) => handleDragStart(e, player, 'unpaired')}
                onDragEnd={handleDragEnd}
              >
                <div className="player-name">{player.name}</div>
                <div className="player-details">
                  {player.rating} ({player.uscf_id}) - {player.section || 'Open'}
                </div>
              </div>
            ))}
          </div>
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
                <tr key={pairing.id} className={pairing.isCustom ? 'custom-pairing' : ''}>
                  <td>
                    <div className="board-info">
                      <span className="board-number">{pairing.board}</span>
                      {pairing.isCustom && <span className="custom-badge">Custom</span>}
                    </div>
                  </td>
                  <td
                    className={`player-slot ${dragState.isDragging ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'white', pairing.board, pairing.id)}
                  >
                    {pairing.white_player_id ? (
                      <div
                        className="player-info draggable-player"
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
                          {pairing.white_rating} ({pairing.white_uscf_id})
                        </div>
                      </div>
                    ) : (
                      <div className="empty-slot">
                        Drop player here
                      </div>
                    )}
                  </td>
                  <td
                    className={`player-slot ${dragState.isDragging ? 'drag-over' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'black', pairing.board, pairing.id)}
                  >
                    {pairing.black_player_id ? (
                      <div
                        className="player-info draggable-player"
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
                          {pairing.black_rating} ({pairing.black_uscf_id})
                        </div>
                      </div>
                    ) : (
                      <div className="empty-slot">
                        Drop player here
                      </div>
                    )}
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
                    <div className="pairing-actions">
                      <button
                        onClick={() => handleUpdateResult(pairing.id, '')}
                        className="btn btn-sm btn-outline"
                        disabled={!pairing.result}
                      >
                        Clear
                      </button>
                      {pairing.isCustom && (
                        <button
                          onClick={() => handleDeletePairing(pairing.id)}
                          className="btn btn-sm btn-danger"
                        >
                          Delete
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
        .draggable-pairing-manager {
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

        .custom-board-creation {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
        }

        .custom-board-creation h4 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .custom-board-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .player-selection {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .player-select {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .player-select label {
          font-weight: 500;
          color: #333;
        }

        .player-select select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .custom-board-actions {
          display: flex;
          gap: 10px;
        }

        .unpaired-players {
          background: #fff3cd;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          border: 1px solid #ffeaa7;
        }

        .unpaired-players h4 {
          margin: 0 0 10px 0;
          color: #856404;
        }

        .unpaired-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }

        .unpaired-player {
          background: white;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #ffeaa7;
          cursor: grab;
          transition: all 0.2s;
        }

        .unpaired-player:hover {
          background: #f8f9fa;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .unpaired-player:active {
          cursor: grabbing;
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

        .custom-pairing {
          background: #f0f8ff;
        }

        .board-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .board-number {
          font-weight: bold;
        }

        .custom-badge {
          background: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.7rem;
          font-weight: bold;
        }

        .player-slot {
          min-height: 60px;
          padding: 8px;
          border: 2px dashed transparent;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .player-slot.drag-over {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .player-info {
          display: flex;
          flex-direction: column;
          cursor: grab;
          transition: all 0.2s;
        }

        .player-info:hover {
          background: #f8f9fa;
          border-radius: 4px;
          padding: 4px;
        }

        .player-info:active {
          cursor: grabbing;
        }

        .draggable-player {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          padding: 8px;
        }

        .player-name {
          font-weight: 500;
        }

        .player-details {
          font-size: 0.9rem;
          color: #666;
        }

        .empty-slot {
          color: #999;
          font-style: italic;
          text-align: center;
          padding: 20px;
          border: 2px dashed #ddd;
          border-radius: 4px;
        }

        .result-select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }

        .pairing-actions {
          display: flex;
          gap: 5px;
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

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default DraggablePairingManager;
