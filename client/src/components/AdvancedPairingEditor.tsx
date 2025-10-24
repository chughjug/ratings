import React, { useState, useEffect, useCallback } from 'react';
import { 
  Edit3, 
  Save, 
  Undo, 
  Redo, 
  Search, 
  ArrowLeftRight, 
  AlertTriangle, 
  Plus,
  Trash2,
  Copy,
  Eye
} from 'lucide-react';
import { Pairing, Player } from '../types';

interface AdvancedPairingEditorProps {
  pairings: Pairing[];
  players: Player[];
  onPairingsUpdate: (pairings: Pairing[]) => void;
  onSave: (pairings: Pairing[]) => Promise<void>;
  tournamentId: string;
  round: number;
  section: string;
  isLoading?: boolean;
}

interface EditingState {
  isEditing: boolean;
  selectedPairings: Set<string>;
  draggedPairing: string | null;
  draggedPlayer: string | null;
  hoveredPairing: string | null;
  hoveredPosition: 'white' | 'black' | null;
}

interface PairingHistory {
  pairings: Pairing[];
  timestamp: number;
  action: string;
}

const AdvancedPairingEditor: React.FC<AdvancedPairingEditorProps> = ({
  pairings,
  players,
  onPairingsUpdate,
  onSave,
  tournamentId,
  round,
  section,
  isLoading = false
}) => {
  const [editingState, setEditingState] = useState<EditingState>({
    isEditing: false,
    selectedPairings: new Set(),
    draggedPairing: null,
    draggedPlayer: null,
    hoveredPairing: null,
    hoveredPosition: null
  });

  const [showAddBoardModal, setShowAddBoardModal] = useState(false);
  const [newBoardData, setNewBoardData] = useState({
    whitePlayer: '',
    blackPlayer: '',
    boardNumber: Math.max(...pairings.map(p => p.board), 0) + 1
  });

  const [history, setHistory] = useState<PairingHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    showCompleted: true,
    showPending: true,
    showForfeits: true,
    ratingRange: { min: 0, max: 3000 }
  });
  const [showValidation, setShowValidation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize history with current pairings
  useEffect(() => {
    if (pairings.length > 0 && history.length === 0) {
      addToHistory(pairings, 'Initial load');
    }
  }, [pairings]);

  // Calculate player scores from all pairings
  const calculatePlayerScores = useCallback(() => {
    const playerScores: Record<string, number> = {};
    
    // Initialize all players with 0 points
    players.forEach(player => {
      playerScores[player.id] = 0;
    });
    
    // Calculate scores from all pairings (not just current round)
    pairings.forEach(pairing => {
      if (pairing.result && pairing.result !== 'TBD') {
        // White player score
        if (pairing.white_player_id) {
          if (pairing.result === '1-0' || pairing.result === '1-0F') {
            playerScores[pairing.white_player_id] = (playerScores[pairing.white_player_id] || 0) + 1;
          } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
            playerScores[pairing.white_player_id] = (playerScores[pairing.white_player_id] || 0) + 0.5;
          }
        }
        
        // Black player score
        if (pairing.black_player_id) {
          if (pairing.result === '0-1' || pairing.result === '0-1F') {
            playerScores[pairing.black_player_id] = (playerScores[pairing.black_player_id] || 0) + 1;
          } else if (pairing.result === '1/2-1/2' || pairing.result === '1/2-1/2F') {
            playerScores[pairing.black_player_id] = (playerScores[pairing.black_player_id] || 0) + 0.5;
          }
        }
      }
    });
    
    return playerScores;
  }, [pairings, players]);

  // Add to history
  const addToHistory = useCallback((newPairings: Pairing[], action: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      pairings: [...newPairings],
      timestamp: Date.now(),
      action
    });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      onPairingsUpdate(previousState.pairings);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, onPairingsUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      onPairingsUpdate(nextState.pairings);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, onPairingsUpdate]);

  // Filter pairings based on search and filter options
  const filteredPairings = pairings.filter(pairing => {
    const matchesSearch = !searchTerm || 
      pairing.white_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pairing.black_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pairing.id.includes(searchTerm);

    const matchesFilters = 
      (filterOptions.showCompleted && pairing.result && pairing.result !== 'TBD') ||
      (filterOptions.showPending && (!pairing.result || pairing.result === 'TBD')) ||
      (filterOptions.showForfeits && pairing.result?.includes('F'));

    const matchesRating = 
      (!pairing.white_rating || (pairing.white_rating >= filterOptions.ratingRange.min && pairing.white_rating <= filterOptions.ratingRange.max)) &&
      (!pairing.black_rating || (pairing.black_rating >= filterOptions.ratingRange.min && pairing.black_rating <= filterOptions.ratingRange.max));

    return matchesSearch && matchesFilters && matchesRating;
  });

  // Validation functions
  const validatePairings = useCallback((pairingsToValidate: Pairing[]) => {
    const errors: string[] = [];
    const playerGames = new Map<string, number>();
    const boardNumbers = new Set<number>();

    pairingsToValidate.forEach(pairing => {
      // Check for duplicate board numbers
      if (boardNumbers.has(pairing.board)) {
        errors.push(`Duplicate board number ${pairing.board}`);
      }
      boardNumbers.add(pairing.board);

      // Check for players playing themselves
      if (pairing.white_id === pairing.black_id) {
        errors.push(`Player ${pairing.white_name} is paired against themselves on board ${pairing.board}`);
      }

      // Count games per player
      if (pairing.white_id) {
        playerGames.set(pairing.white_id, (playerGames.get(pairing.white_id) || 0) + 1);
      }
      if (pairing.black_id) {
        playerGames.set(pairing.black_id, (playerGames.get(pairing.black_id) || 0) + 1);
      }
    });

    // Check for players with multiple games
    playerGames.forEach((count, playerId) => {
      if (count > 1) {
        const player = players.find(p => p.id === playerId);
        errors.push(`Player ${player?.name} appears in ${count} games`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [players]);

  // Swap players in a pairing
  const swapPlayers = useCallback((pairingId: string) => {
    const updatedPairings = pairings.map(pairing => {
      if (pairing.id === pairingId) {
        return {
          ...pairing,
          white_id: pairing.black_id,
          white_name: pairing.black_name,
          white_rating: pairing.black_rating,
          black_id: pairing.white_id,
          black_name: pairing.white_name,
          black_rating: pairing.white_rating
        };
      }
      return pairing;
    });
    
    addToHistory(updatedPairings, 'Swap players');
    onPairingsUpdate(updatedPairings);
  }, [pairings, onPairingsUpdate, addToHistory]);

  // Swap two pairings
  const swapPairings = useCallback((pairingId1: string, pairingId2: string) => {
    const updatedPairings = pairings.map(pairing => {
      if (pairing.id === pairingId1) {
        const otherPairing = pairings.find(p => p.id === pairingId2);
        return otherPairing ? { ...pairing, board: otherPairing.board } : pairing;
      }
      if (pairing.id === pairingId2) {
        const otherPairing = pairings.find(p => p.id === pairingId1);
        return otherPairing ? { ...pairing, board: otherPairing.board } : pairing;
      }
      return pairing;
    });
    
    addToHistory(updatedPairings, 'Swap pairings');
    onPairingsUpdate(updatedPairings);
  }, [pairings, onPairingsUpdate, addToHistory]);

  // Move player to different pairing
  const movePlayer = useCallback((fromPairingId: string, toPairingId: string, position: 'white' | 'black') => {
    const fromPairing = pairings.find(p => p.id === fromPairingId);
    const toPairing = pairings.find(p => p.id === toPairingId);
    
    if (!fromPairing || !toPairing) return;

    // Determine which player to move based on position
    const playerToMove = position === 'white' ? {
      id: fromPairing.white_id,
      name: fromPairing.white_name,
      rating: fromPairing.white_rating
    } : {
      id: fromPairing.black_id,
      name: fromPairing.black_name,
      rating: fromPairing.black_rating
    };

    const updatedPairings = pairings.map(pairing => {
      if (pairing.id === fromPairingId) {
        // Remove player from source pairing
        if (position === 'white') {
          return { ...pairing, white_id: undefined, white_name: 'TBD', white_rating: undefined };
        } else {
          return { ...pairing, black_id: undefined, black_name: 'TBD', black_rating: undefined };
        }
      }
      if (pairing.id === toPairingId) {
        // Add player to target pairing
        if (position === 'white') {
          return {
            ...pairing,
            white_id: playerToMove.id,
            white_name: playerToMove.name,
            white_rating: playerToMove.rating
          };
        } else {
          return {
            ...pairing,
            black_id: playerToMove.id,
            black_name: playerToMove.name,
            black_rating: playerToMove.rating
          };
        }
      }
      return pairing;
    });
    
    addToHistory(updatedPairings, 'Move player');
    onPairingsUpdate(updatedPairings);
  }, [pairings, onPairingsUpdate, addToHistory]);

  // Add new custom pairing
  const addCustomPairing = useCallback((whitePlayerId: string, blackPlayerId: string, boardNumber: number) => {
    const whitePlayer = players.find(p => p.id === whitePlayerId);
    const blackPlayer = players.find(p => p.id === blackPlayerId);
    
    if (!whitePlayer || !blackPlayer) return;

    const newPairing: Pairing = {
      id: `pairing_${Date.now()}`,
      tournament_id: tournamentId,
      round: round,
      section: section,
      board: boardNumber,
      white_player_id: whitePlayer.id,
      white_id: whitePlayer.id,
      white_name: whitePlayer.name,
      white_rating: whitePlayer.rating,
      black_player_id: blackPlayer.id,
      black_id: blackPlayer.id,
      black_name: blackPlayer.name,
      black_rating: blackPlayer.rating,
      result: 'TBD',
      created_at: new Date().toISOString()
    };

    const updatedPairings = [...pairings, newPairing];
    addToHistory(updatedPairings, 'Add custom pairing');
    onPairingsUpdate(updatedPairings);
    setShowAddBoardModal(false);
    setNewBoardData({
      whitePlayer: '',
      blackPlayer: '',
      boardNumber: Math.max(...updatedPairings.map(p => p.board), 0) + 1
    });
  }, [players, tournamentId, round, section, pairings, onPairingsUpdate, addToHistory]);

  // Delete pairing
  const deletePairing = useCallback((pairingId: string) => {
    const updatedPairings = pairings.filter(p => p.id !== pairingId);
    addToHistory(updatedPairings, 'Delete pairing');
    onPairingsUpdate(updatedPairings);
  }, [pairings, onPairingsUpdate, addToHistory]);

  // Duplicate pairing
  const duplicatePairing = useCallback((pairingId: string) => {
    const pairing = pairings.find(p => p.id === pairingId);
    if (!pairing) return;

    const newPairing: Pairing = {
      ...pairing,
      id: `pairing_${Date.now()}`,
      board: Math.max(...pairings.map(p => p.board)) + 1
    };

    const updatedPairings = [...pairings, newPairing];
    addToHistory(updatedPairings, 'Duplicate pairing');
    onPairingsUpdate(updatedPairings);
  }, [pairings, onPairingsUpdate, addToHistory]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (validatePairings(pairings)) {
      await onSave(pairings);
      setEditingState(prev => ({ ...prev, isEditing: false, selectedPairings: new Set() }));
    }
  }, [pairings, onSave, validatePairings]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, pairingId: string, playerPosition?: 'white' | 'black') => {
    e.dataTransfer.effectAllowed = 'move';
    setEditingState(prev => ({
      ...prev,
      draggedPairing: pairingId,
      draggedPlayer: playerPosition || null
    }));
  };

  const handleDragOver = (e: React.DragEvent, pairingId: string, position?: 'white' | 'black') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setEditingState(prev => ({
      ...prev,
      hoveredPairing: pairingId,
      hoveredPosition: position || null
    }));
  };

  const handleDrop = (e: React.DragEvent, targetPairingId: string, position?: 'white' | 'black') => {
    e.preventDefault();
    const { draggedPairing, draggedPlayer } = editingState;

    if (draggedPairing && draggedPlayer && position) {
      // Move player from one position to another (could be same or different pairing)
      movePlayer(draggedPairing, targetPairingId, position);
    } else if (draggedPairing && !draggedPlayer) {
      // Swap entire pairings
      swapPairings(draggedPairing, targetPairingId);
    }

    setEditingState(prev => ({
      ...prev,
      draggedPairing: null,
      draggedPlayer: null,
      hoveredPairing: null,
      hoveredPosition: null
    }));
  };

  const handleDragEnd = () => {
    setEditingState(prev => ({
      ...prev,
      draggedPairing: null,
      draggedPlayer: null,
      hoveredPairing: null,
      hoveredPosition: null
    }));
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Advanced Pairing Editor
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditingState(prev => ({ ...prev, isEditing: !prev.isEditing }))}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  editingState.isEditing
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                <span>{editingState.isEditing ? 'Exit Edit' : 'Edit Mode'}</span>
              </button>
              
              {editingState.isEditing && (
                <>
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Undo className="h-4 w-4" />
                    <span>Undo</span>
                  </button>
                  
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Redo className="h-4 w-4" />
                    <span>Redo</span>
                  </button>
                  
                  <button
                    onClick={() => setShowAddBoardModal(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Board</span>
                  </button>
                  
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                showValidation
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Validate</span>
            </button>
            
            <button
              onClick={() => setFilterOptions(prev => ({ ...prev, showCompleted: !prev.showCompleted }))}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterOptions.showCompleted
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Completed</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Rating Range:</label>
            <input
              type="number"
              placeholder="Min"
              value={filterOptions.ratingRange.min}
              onChange={(e) => setFilterOptions(prev => ({
                ...prev,
                ratingRange: { ...prev.ratingRange, min: parseInt(e.target.value) || 0 }
              }))}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filterOptions.ratingRange.max}
              onChange={(e) => setFilterOptions(prev => ({
                ...prev,
                ratingRange: { ...prev.ratingRange, max: parseInt(e.target.value) || 3000 }
              }))}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {showValidation && validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <h4 className="text-red-800 font-medium">Validation Errors</h4>
          </div>
          <ul className="text-red-700 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Edit Mode Instructions */}
      {editingState.isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Edit Mode Active
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Drag & Drop:</strong> Drag players between different boards to reassign them</li>
                  <li><strong>Cross-board moves:</strong> Drag a black player from one board to white on another</li>
                  <li><strong>Add Board:</strong> Click "Add Board" to create custom pairings</li>
                  <li><strong>Swap Players:</strong> Use the swap button to exchange white/black within a pairing</li>
                  <li><strong>Undo/Redo:</strong> Use the history buttons to revert changes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pairings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {editingState.isEditing && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={editingState.selectedPairings.size === filteredPairings.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingState(prev => ({
                            ...prev,
                            selectedPairings: new Set(filteredPairings.map(p => p.id))
                          }));
                        } else {
                          setEditingState(prev => ({
                            ...prev,
                            selectedPairings: new Set()
                          }));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Board
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  White Player
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Black Player
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                {editingState.isEditing && (
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPairings.map((pairing) => (
                <tr 
                  key={pairing.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    editingState.selectedPairings.has(pairing.id) ? 'bg-blue-50' : ''
                  } ${
                    editingState.hoveredPairing === pairing.id ? 'bg-yellow-50' : ''
                  }`}
                >
                  {editingState.isEditing && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={editingState.selectedPairings.has(pairing.id)}
                        onChange={(e) => {
                          setEditingState(prev => {
                            const newSelected = new Set(prev.selectedPairings);
                            if (e.target.checked) {
                              newSelected.add(pairing.id);
                            } else {
                              newSelected.delete(pairing.id);
                            }
                            return { ...prev, selectedPairings: newSelected };
                          });
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {pairing.board}
                  </td>
                  
                  <td 
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      editingState.isEditing ? 'cursor-move' : ''
                    } ${
                      editingState.hoveredPairing === pairing.id && editingState.hoveredPosition === 'white'
                        ? 'bg-yellow-100 border-2 border-yellow-300' 
                        : ''
                    } ${
                      editingState.draggedPairing === pairing.id && editingState.draggedPlayer === 'white'
                        ? 'opacity-50' 
                        : ''
                    }`}
                    draggable={editingState.isEditing}
                    onDragStart={(e) => handleDragStart(e, pairing.id, 'white')}
                    onDragOver={(e) => handleDragOver(e, pairing.id, 'white')}
                    onDrop={(e) => handleDrop(e, pairing.id, 'white')}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${
                        pairing.white_name && pairing.white_name !== 'TBD' 
                          ? 'text-gray-900' 
                          : 'text-gray-400 italic'
                      }`}>
                        {pairing.white_name || 'TBD'}
                      </span>
                      {pairing.white_rating && (
                        <span className="text-xs text-gray-500">({pairing.white_rating})</span>
                      )}
                      {editingState.isEditing && (
                        <span className="text-xs text-blue-500 mt-1">Drag to move</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {pairing.white_player_id ? calculatePlayerScores()[pairing.white_player_id] || 0 : '-'}
                  </td>
                  
                  <td 
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      editingState.isEditing ? 'cursor-move' : ''
                    } ${
                      editingState.hoveredPairing === pairing.id && editingState.hoveredPosition === 'black'
                        ? 'bg-yellow-100 border-2 border-yellow-300' 
                        : ''
                    } ${
                      editingState.draggedPairing === pairing.id && editingState.draggedPlayer === 'black'
                        ? 'opacity-50' 
                        : ''
                    }`}
                    draggable={editingState.isEditing}
                    onDragStart={(e) => handleDragStart(e, pairing.id, 'black')}
                    onDragOver={(e) => handleDragOver(e, pairing.id, 'black')}
                    onDrop={(e) => handleDrop(e, pairing.id, 'black')}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${
                        pairing.black_name && pairing.black_name !== 'TBD' 
                          ? 'text-gray-900' 
                          : 'text-gray-400 italic'
                      }`}>
                        {pairing.black_name || 'TBD'}
                      </span>
                      {pairing.black_rating && (
                        <span className="text-xs text-gray-500">({pairing.black_rating})</span>
                      )}
                      {editingState.isEditing && (
                        <span className="text-xs text-blue-500 mt-1">Drag to move</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                    {pairing.black_player_id ? calculatePlayerScores()[pairing.black_player_id] || 0 : '-'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex space-x-1 justify-center">
                      <button
                        onClick={() => swapPlayers(pairing.id)}
                        className="px-2 py-1 text-xs font-medium rounded transition-colors bg-blue-100 text-blue-800 hover:bg-blue-200"
                        title="Swap players"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                      </button>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                        {pairing.result || 'TBD'}
                      </span>
                    </div>
                  </td>
                  
                  {editingState.isEditing && (
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex space-x-1 justify-center">
                        <button
                          onClick={() => duplicatePairing(pairing.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Duplicate pairing"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deletePairing(pairing.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete pairing"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Actions */}
      {editingState.isEditing && editingState.selectedPairings.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {editingState.selectedPairings.size} pairing(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const selectedPairings = pairings.filter(p => editingState.selectedPairings.has(p.id));
                  // Implement bulk swap logic
                  console.log('Bulk swap selected pairings:', selectedPairings);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span>Bulk Swap</span>
              </button>
              <button
                onClick={() => {
                  const updatedPairings = pairings.filter(p => !editingState.selectedPairings.has(p.id));
                  addToHistory(updatedPairings, 'Bulk delete');
                  onPairingsUpdate(updatedPairings);
                  setEditingState(prev => ({ ...prev, selectedPairings: new Set() }));
                }}
                className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Board Modal */}
      {showAddBoardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Pairing</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board Number
                </label>
                <input
                  type="number"
                  value={newBoardData.boardNumber}
                  onChange={(e) => setNewBoardData(prev => ({
                    ...prev,
                    boardNumber: parseInt(e.target.value) || 1
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  White Player
                </label>
                <select
                  value={newBoardData.whitePlayer}
                  onChange={(e) => setNewBoardData(prev => ({
                    ...prev,
                    whitePlayer: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select white player</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} ({player.rating || 'Unrated'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Black Player
                </label>
                <select
                  value={newBoardData.blackPlayer}
                  onChange={(e) => setNewBoardData(prev => ({
                    ...prev,
                    blackPlayer: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select black player</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} ({player.rating || 'Unrated'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  if (newBoardData.whitePlayer && newBoardData.blackPlayer) {
                    addCustomPairing(newBoardData.whitePlayer, newBoardData.blackPlayer, newBoardData.boardNumber);
                  } else {
                    alert('Please select both white and black players');
                  }
                }}
                disabled={!newBoardData.whitePlayer || !newBoardData.blackPlayer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Pairing
              </button>
              <button
                onClick={() => setShowAddBoardModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedPairingEditor;

