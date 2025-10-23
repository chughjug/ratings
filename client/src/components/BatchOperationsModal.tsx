import React, { useState } from 'react';
import { X, Save, Users, Trash2, Edit, Copy, Download, Upload } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { playerApi } from '../services/api';

interface BatchOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayers: Set<string>;
  onPlayersUpdated: () => void;
}

interface BatchOperation {
  type: 'status' | 'section' | 'rating' | 'delete' | 'export' | 'duplicate';
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresInput?: boolean;
  inputType?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
}

const BatchOperationsModal: React.FC<BatchOperationsModalProps> = ({
  isOpen,
  onClose,
  selectedPlayers,
  onPlayersUpdated
}) => {
  const { state, dispatch } = useTournament();
  const [loading, setLoading] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BatchOperation | null>(null);
  const [operationValue, setOperationValue] = useState('');
  const [operationStatus, setOperationStatus] = useState<'active' | 'withdrawn' | 'bye' | 'inactive'>('active');

  const operations: BatchOperation[] = [
    {
      type: 'status',
      label: 'Change Status',
      description: 'Update player status for all selected players',
      icon: <Edit className="h-5 w-5" />,
      requiresInput: true,
      inputType: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'withdrawn', label: 'Withdrawn' },
        { value: 'bye', label: 'Bye' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      type: 'section',
      label: 'Change Section',
      description: 'Move all selected players to a new section',
      icon: <Users className="h-5 w-5" />,
      requiresInput: true,
      inputType: 'text'
    },
    {
      type: 'rating',
      label: 'Adjust Rating',
      description: 'Add or subtract points from all selected players',
      icon: <Edit className="h-5 w-5" />,
      requiresInput: true,
      inputType: 'number'
    },
    {
      type: 'duplicate',
      label: 'Duplicate Players',
      description: 'Create copies of all selected players',
      icon: <Copy className="h-5 w-5" />
    },
    {
      type: 'export',
      label: 'Export Selected',
      description: 'Export selected players to CSV',
      icon: <Download className="h-5 w-5" />
    },
    {
      type: 'delete',
      label: 'Delete Players',
      description: 'Remove all selected players from tournament',
      icon: <Trash2 className="h-5 w-5" />
    }
  ];

  const selectedPlayerData = state.players.filter(p => selectedPlayers.has(p.id));

  const handleOperationSelect = (operation: BatchOperation) => {
    setSelectedOperation(operation);
    setOperationValue('');
    setOperationStatus('active');
  };

  const handleExecute = async () => {
    if (!selectedOperation) return;

    setLoading(true);

    try {
      switch (selectedOperation.type) {
        case 'status':
          await Promise.all(
            selectedPlayerData.map(player =>
              playerApi.update(player.id, { ...player, status: operationStatus })
            )
          );
          break;

        case 'section':
          await Promise.all(
            selectedPlayerData.map(player =>
              playerApi.update(player.id, { ...player, section: operationValue })
            )
          );
          break;

        case 'rating':
          const ratingAdjustment = parseInt(operationValue);
          if (!isNaN(ratingAdjustment)) {
            await Promise.all(
              selectedPlayerData.map(player => {
                const newRating = (player.rating || 0) + ratingAdjustment;
                return playerApi.update(player.id, { ...player, rating: Math.max(0, newRating) });
              })
            );
          }
          break;

        case 'duplicate':
          await Promise.all(
            selectedPlayerData.map(player => {
              const duplicateData = {
                ...player,
                name: `${player.name} (Copy)`,
                id: undefined // Let the API generate a new ID
              };
              return playerApi.create(duplicateData);
            })
          );
          break;

        case 'export':
          // Create CSV content
          const csvContent = [
            ['Name', 'USCF ID', 'FIDE ID', 'Rating', 'Section', 'Status'],
            ...selectedPlayerData.map(player => [
              player.name,
              player.uscf_id || '',
              player.fide_id || '',
              player.rating?.toString() || '',
              player.section || '',
              player.status
            ])
          ].map(row => row.join(',')).join('\n');

          // Download CSV
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `selected_players_${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          break;

        case 'delete':
          await Promise.all(
            selectedPlayerData.map(player => playerApi.delete(player.id))
          );
          break;
      }

      onPlayersUpdated();
      onClose();
    } catch (error) {
      console.error('Batch operation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedOperation(null);
    setOperationValue('');
    setOperationStatus('active');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-chess-board" />
            <h2 className="text-xl font-semibold text-gray-900">
              Batch Operations ({selectedPlayers.size} players)
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {!selectedOperation ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Select an operation to perform on {selectedPlayers.size} selected players:
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {operations.map((operation) => (
                  <button
                    key={operation.type}
                    onClick={() => handleOperationSelect(operation)}
                    className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-left"
                  >
                    <div className="text-blue-600 mt-0.5">
                      {operation.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{operation.label}</div>
                      <div className="text-sm text-gray-500">{operation.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="text-blue-600">
                  {selectedOperation.icon}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedOperation.label}</h3>
                  <p className="text-sm text-gray-500">{selectedOperation.description}</p>
                </div>
              </div>

              {selectedOperation.requiresInput && (
                <div>
                  {selectedOperation.inputType === 'select' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Status
                      </label>
                      <select
                        value={operationStatus}
                        onChange={(e) => setOperationStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                      >
                        {selectedOperation.options?.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {selectedOperation.type === 'section' ? 'Section Name' : 
                         selectedOperation.type === 'rating' ? 'Rating Adjustment (+/-)' : 'Value'}
                      </label>
                      <input
                        type={selectedOperation.inputType}
                        value={operationValue}
                        onChange={(e) => setOperationValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                        placeholder={
                          selectedOperation.type === 'section' ? 'Enter section name' :
                          selectedOperation.type === 'rating' ? 'Enter rating adjustment' :
                          'Enter value'
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This operation will affect {selectedPlayers.size} players:
                </div>
                <div className="mt-2 text-sm text-yellow-700">
                  {selectedPlayerData.slice(0, 5).map(player => player.name).join(', ')}
                  {selectedPlayerData.length > 5 && ` and ${selectedPlayerData.length - 5} more...`}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={selectedOperation ? () => setSelectedOperation(null) : handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              {selectedOperation ? 'Back' : 'Cancel'}
            </button>
            {selectedOperation && (
              <button
                onClick={handleExecute}
                disabled={loading || (selectedOperation.requiresInput && !operationValue && selectedOperation.inputType !== 'select')}
                className="flex items-center space-x-2 bg-chess-board text-white px-4 py-2 rounded-md hover:bg-chess-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Processing...' : 'Execute'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchOperationsModal;
