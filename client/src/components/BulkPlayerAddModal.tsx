import React, { useState } from 'react';
import { X, Save, Users, Plus, Trash2, Copy, Download } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../services/api';

interface BulkPlayerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
}

interface PlayerEntry {
  id: string;
  name: string;
  uscf_id: string;
  fide_id: string;
  rating: string;
  section: string;
  status: 'active' | 'withdrawn' | 'bye' | 'inactive';
}

const BulkPlayerAddModal: React.FC<BulkPlayerAddModalProps> = ({ isOpen, onClose, tournamentId }) => {
  const { dispatch } = useTournament();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerEntry[]>([
    { id: '1', name: '', uscf_id: '', fide_id: '', rating: '', section: '', status: 'active' }
  ]);
  const [showTemplates, setShowTemplates] = useState(false);

  const addPlayerRow = () => {
    const newId = (players.length + 1).toString();
    setPlayers([...players, { 
      id: newId, 
      name: '', 
      uscf_id: '', 
      fide_id: '', 
      rating: '', 
      section: '', 
      status: 'active' 
    }]);
  };

  const removePlayerRow = (id: string) => {
    if (players.length > 1) {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  const updatePlayer = (id: string, field: keyof PlayerEntry, value: string) => {
    setPlayers(players.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const duplicatePlayer = (id: string) => {
    const playerToDuplicate = players.find(p => p.id === id);
    if (playerToDuplicate) {
      const newId = (players.length + 1).toString();
      const duplicatedPlayer = { ...playerToDuplicate, id: newId, name: '' };
      setPlayers([...players, duplicatedPlayer]);
    }
  };

  const clearAllPlayers = () => {
    setPlayers([{ id: '1', name: '', uscf_id: '', fide_id: '', rating: '', section: '', status: 'active' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validPlayers = players.filter(p => p.name.trim() !== '');
      
      if (validPlayers.length === 0) {
        throw new Error('Please add at least one player with a name');
      }

      const playerData = validPlayers.map(player => ({
        tournament_id: tournamentId,
        name: player.name.trim(),
        uscf_id: player.uscf_id.trim() || undefined,
        fide_id: player.fide_id.trim() || undefined,
        rating: player.rating ? parseInt(player.rating) : undefined,
        section: player.section.trim() || undefined,
        status: player.status,
        intentional_bye_rounds: undefined
      }));

      // Add players one by one to maintain individual error handling
      const addedPlayers = [];
      for (const player of playerData) {
        try {
          const response = await playerApi.create(player);
          if (response.data.success) {
            addedPlayers.push(response.data.data);
            dispatch({ type: 'ADD_PLAYER', payload: response.data.data });
          }
        } catch (error) {
          console.error(`Failed to add player ${player.name}:`, error);
          // Continue with other players even if one fails
        }
      }

      if (addedPlayers.length > 0) {
        // Reset form
        setPlayers([{ id: '1', name: '', uscf_id: '', fide_id: '', rating: '', section: '', status: 'active' }]);
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to add players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPlayers([{ id: '1', name: '', uscf_id: '', fide_id: '', rating: '', section: '', status: 'active' }]);
    onClose();
  };

  const loadTemplate = (template: string) => {
    let templatePlayers: PlayerEntry[] = [];
    
    switch (template) {
      case 'school-team':
        templatePlayers = [
          { id: '1', name: 'Board 1 Player', uscf_id: '', fide_id: '', rating: '1800', section: 'Open', status: 'active' },
          { id: '2', name: 'Board 2 Player', uscf_id: '', fide_id: '', rating: '1600', section: 'Open', status: 'active' },
          { id: '3', name: 'Board 3 Player', uscf_id: '', fide_id: '', rating: '1400', section: 'Reserve', status: 'active' },
          { id: '4', name: 'Board 4 Player', uscf_id: '', fide_id: '', rating: '1200', section: 'Reserve', status: 'active' }
        ];
        break;
      case 'club-members':
        templatePlayers = [
          { id: '1', name: 'Club Member 1', uscf_id: '', fide_id: '', rating: '', section: '', status: 'active' },
          { id: '2', name: 'Club Member 2', uscf_id: '', fide_id: '', rating: '', section: '', status: 'active' },
          { id: '3', name: 'Club Member 3', uscf_id: '', fide_id: '', rating: '', section: '', status: 'active' }
        ];
        break;
      case 'unrated-players':
        templatePlayers = [
          { id: '1', name: 'Unrated Player 1', uscf_id: '', fide_id: '', rating: '0', section: 'Unrated', status: 'active' },
          { id: '2', name: 'Unrated Player 2', uscf_id: '', fide_id: '', rating: '0', section: 'Unrated', status: 'active' }
        ];
        break;
    }
    
    setPlayers(templatePlayers);
    setShowTemplates(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-chess-board" />
            <h2 className="text-xl font-semibold text-gray-900">Bulk Add Players</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              Templates
            </button>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Templates Dropdown */}
        {showTemplates && (
          <div className="px-6 py-3 bg-gray-50 border-b">
            <div className="flex space-x-2">
              <button
                onClick={() => loadTemplate('school-team')}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                School Team (4 players)
              </button>
              <button
                onClick={() => loadTemplate('club-members')}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
              >
                Club Members (3 players)
              </button>
              <button
                onClick={() => loadTemplate('unrated-players')}
                className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
              >
                Unrated Players (2 players)
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-8 gap-4 text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-md">
                <div className="col-span-2">Name *</div>
                <div>Rating</div>
                <div>USCF ID</div>
                <div>FIDE ID</div>
                <div>Section</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Player Rows */}
              {players.map((player, index) => (
                <div key={player.id} className="grid grid-cols-8 gap-4 items-center">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                      placeholder="Player name"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={player.rating}
                      onChange={(e) => updatePlayer(player.id, 'rating', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                      placeholder="Rating"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={player.uscf_id}
                      onChange={(e) => updatePlayer(player.id, 'uscf_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                      placeholder="USCF ID"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={player.fide_id}
                      onChange={(e) => updatePlayer(player.id, 'fide_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                      placeholder="FIDE ID"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={player.section}
                      onChange={(e) => updatePlayer(player.id, 'section', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                      placeholder="Section"
                    />
                  </div>
                  <div>
                    <select
                      value={player.status}
                      onChange={(e) => updatePlayer(player.id, 'status', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="withdrawn">Withdrawn</option>
                      <option value="bye">Bye</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => duplicatePlayer(player.id)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Duplicate row"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePlayerRow(player.id)}
                      disabled={players.length === 1}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={addPlayerRow}
                  className="flex items-center space-x-1 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Row</span>
                </button>
                <button
                  type="button"
                  onClick={clearAllPlayers}
                  className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-chess-board text-white px-4 py-2 rounded-md hover:bg-chess-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Adding...' : `Add ${players.filter(p => p.name.trim()).length} Players`}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkPlayerAddModal;
