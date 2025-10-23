import React, { useState } from 'react';
import { X, Save, Users, School, Building, Star, Download, Upload } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../services/api';

interface PlayerTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
}

interface PlayerTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  players: Array<{
    name: string;
    rating?: number;
    section?: string;
    uscf_id?: string;
    fide_id?: string;
  }>;
}

const PlayerTemplatesModal: React.FC<PlayerTemplatesModalProps> = ({
  isOpen,
  onClose,
  tournamentId
}) => {
  const { dispatch } = useTournament();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PlayerTemplate | null>(null);
  const [customPlayers, setCustomPlayers] = useState<Array<{
    name: string;
    rating: string;
    section: string;
    uscf_id: string;
    fide_id: string;
  }>>([]);

  const templates: PlayerTemplate[] = [
    {
      id: 'school-team',
      name: 'School Team',
      description: '4-player school chess team with board assignments',
      icon: <School className="h-6 w-6" />,
      players: [
        { name: 'Board 1 Player', rating: 1800, section: 'Open' },
        { name: 'Board 2 Player', rating: 1600, section: 'Open' },
        { name: 'Board 3 Player', rating: 1400, section: 'Reserve' },
        { name: 'Board 4 Player', rating: 1200, section: 'Reserve' }
      ]
    },
    {
      id: 'club-members',
      name: 'Chess Club',
      description: '6-member chess club with mixed ratings',
      icon: <Building className="h-6 w-6" />,
      players: [
        { name: 'Club President', rating: 2000, section: 'Open' },
        { name: 'Vice President', rating: 1800, section: 'Open' },
        { name: 'Treasurer', rating: 1600, section: 'Reserve' },
        { name: 'Secretary', rating: 1400, section: 'Reserve' },
        { name: 'Member 1', rating: 1200, section: 'Reserve' },
        { name: 'Member 2', rating: 1000, section: 'Reserve' }
      ]
    },
    {
      id: 'unrated-group',
      name: 'Unrated Players',
      description: 'Group of unrated players for beginners',
      icon: <Users className="h-6 w-6" />,
      players: [
        { name: 'Unrated Player 1', rating: 0, section: 'Unrated' },
        { name: 'Unrated Player 2', rating: 0, section: 'Unrated' },
        { name: 'Unrated Player 3', rating: 0, section: 'Unrated' },
        { name: 'Unrated Player 4', rating: 0, section: 'Unrated' }
      ]
    },
    {
      id: 'tournament-regulars',
      name: 'Tournament Regulars',
      description: 'Regular tournament participants',
      icon: <Star className="h-6 w-6" />,
      players: [
        { name: 'Master Player', rating: 2200, section: 'Open' },
        { name: 'Expert Player', rating: 2000, section: 'Open' },
        { name: 'Class A Player', rating: 1800, section: 'Open' },
        { name: 'Class B Player', rating: 1600, section: 'Reserve' },
        { name: 'Class C Player', rating: 1400, section: 'Reserve' }
      ]
    }
  ];

  const handleTemplateSelect = (template: PlayerTemplate) => {
    setSelectedTemplate(template);
    setCustomPlayers(template.players.map(player => ({
      name: player.name,
      rating: player.rating?.toString() || '',
      section: player.section || '',
      uscf_id: player.uscf_id || '',
      fide_id: player.fide_id || ''
    })));
  };

  const updateCustomPlayer = (index: number, field: string, value: string) => {
    setCustomPlayers(prev => prev.map((player, i) => 
      i === index ? { ...player, [field]: value } : player
    ));
  };

  const addCustomPlayer = () => {
    setCustomPlayers(prev => [...prev, {
      name: '',
      rating: '',
      section: '',
      uscf_id: '',
      fide_id: ''
    }]);
  };

  const removeCustomPlayer = (index: number) => {
    setCustomPlayers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    setLoading(true);

    try {
      const validPlayers = customPlayers.filter(p => p.name.trim() !== '');
      
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
        status: 'active' as const,
        intentional_bye_rounds: undefined
      }));

      // Add players one by one
      for (const player of playerData) {
        try {
          const response = await playerApi.create(player);
          if (response.data.success) {
            dispatch({ type: 'ADD_PLAYER', payload: response.data.data });
          }
        } catch (error) {
          console.error(`Failed to add player ${player.name}:`, error);
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to add template players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setCustomPlayers([]);
    onClose();
  };

  const exportTemplate = (template: PlayerTemplate) => {
    const csvContent = [
      ['Name', 'Rating', 'Section', 'USCF ID', 'FIDE ID'],
      ...template.players.map(player => [
        player.name,
        player.rating?.toString() || '',
        player.section || '',
        player.uscf_id || '',
        player.fide_id || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-chess-board" />
            <h2 className="text-xl font-semibold text-gray-900">Player Templates</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!selectedTemplate ? (
            <div className="space-y-6">
              <div className="text-sm text-gray-600">
                Choose a template to quickly add groups of players to your tournament:
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600 mt-1">
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportTemplate(template);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Export template"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        <div className="mt-2 text-xs text-gray-400">
                          {template.players.length} players
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="text-blue-600">
                  {selectedTemplate.icon}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Players ({customPlayers.length})</h4>
                  <button
                    onClick={addCustomPlayer}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    <span>Add Player</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {customPlayers.map((player, index) => (
                    <div key={index} className="grid grid-cols-6 gap-3 items-center p-3 border border-gray-200 rounded-lg">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => updateCustomPlayer(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Player name"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={player.rating}
                          onChange={(e) => updateCustomPlayer(index, 'rating', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Rating"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={player.section}
                          onChange={(e) => updateCustomPlayer(index, 'section', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Section"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={player.uscf_id}
                          onChange={(e) => updateCustomPlayer(index, 'uscf_id', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="USCF ID"
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={player.fide_id}
                          onChange={(e) => updateCustomPlayer(index, 'fide_id', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="FIDE ID"
                        />
                        <button
                          onClick={() => removeCustomPlayer(index)}
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={selectedTemplate ? () => setSelectedTemplate(null) : handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              {selectedTemplate ? 'Back' : 'Cancel'}
            </button>
            {selectedTemplate && (
              <button
                onClick={handleSubmit}
                disabled={loading || customPlayers.filter(p => p.name.trim()).length === 0}
                className="flex items-center space-x-2 bg-chess-board text-white px-4 py-2 rounded-md hover:bg-chess-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Adding...' : `Add ${customPlayers.filter(p => p.name.trim()).length} Players`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerTemplatesModal;
