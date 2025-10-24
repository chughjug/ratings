import React, { useState, useCallback } from 'react';
import { 
  Users, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Shuffle, 
  Target, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  BarChart3,
  Clock,
  Trophy
} from 'lucide-react';
import { Pairing, Player } from '../types';

interface BulkPairingOperationsProps {
  pairings: Pairing[];
  players: Player[];
  onPairingsUpdate: (pairings: Pairing[]) => void;
  tournamentId: string;
  round: number;
  section: string;
}

interface BulkOperation {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: (pairings: Pairing[], players: Player[]) => Pairing[];
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

const BulkPairingOperations: React.FC<BulkPairingOperationsProps> = ({
  pairings,
  players,
  onPairingsUpdate,
  tournamentId,
  round,
  section
}) => {
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [operationResult, setOperationResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Define bulk operations
  const bulkOperations: BulkOperation[] = [
    {
      id: 'reorder-boards',
      name: 'Reorder Boards',
      description: 'Reorder all boards sequentially starting from 1',
      icon: <Target className="h-5 w-5" />,
      action: (pairings) => {
        return pairings
          .sort((a, b) => a.board - b.board)
          .map((pairing, index) => ({
            ...pairing,
            board: index + 1
          }));
      }
    },
    {
      id: 'shuffle-pairings',
      name: 'Shuffle Pairings',
      description: 'Randomly shuffle the order of all pairings',
      icon: <Shuffle className="h-5 w-5" />,
      action: (pairings) => {
        const shuffled = [...pairings].sort(() => Math.random() - 0.5);
        return shuffled.map((pairing, index) => ({
          ...pairing,
          board: index + 1
        }));
      }
    },
    {
      id: 'swap-colors',
      name: 'Swap All Colors',
      description: 'Swap white and black players in all pairings',
      icon: <RotateCcw className="h-5 w-5" />,
      action: (pairings) => {
        return pairings.map(pairing => ({
          ...pairing,
          white_id: pairing.black_id,
          white_name: pairing.black_name,
          white_rating: pairing.black_rating,
          black_id: pairing.white_id,
          black_name: pairing.white_name,
          black_rating: pairing.white_rating
        }));
      }
    },
    {
      id: 'balance-ratings',
      name: 'Balance by Rating',
      description: 'Reorder pairings to balance rating differences',
      icon: <BarChart3 className="h-5 w-5" />,
      action: (pairings) => {
        // Sort by rating difference (ascending)
        const sorted = [...pairings].sort((a, b) => {
          const diffA = Math.abs((a.white_rating || 0) - (a.black_rating || 0));
          const diffB = Math.abs((b.white_rating || 0) - (b.black_rating || 0));
          return diffA - diffB;
        });
        
        return sorted.map((pairing, index) => ({
          ...pairing,
          board: index + 1
        }));
      }
    },
    {
      id: 'reset-results',
      name: 'Reset All Results',
      description: 'Clear all game results (set to TBD)',
      icon: <Clock className="h-5 w-5" />,
      action: (pairings) => {
        return pairings.map(pairing => ({
          ...pairing,
          result: 'TBD'
        }));
      },
      requiresConfirmation: true,
      confirmationMessage: 'This will clear all game results. Are you sure?'
    },
    {
      id: 'optimize-pairings',
      name: 'Optimize Pairings',
      description: 'Optimize pairings based on Swiss system principles',
      icon: <Zap className="h-5 w-5" />,
      action: (pairings) => {
        // This is a simplified optimization - in practice, you'd want more sophisticated logic
        const optimized = [...pairings].sort((a, b) => {
          // Sort by board number first, then by rating sum (descending)
          const ratingSumA = (a.white_rating || 0) + (a.black_rating || 0);
          const ratingSumB = (b.white_rating || 0) + (b.black_rating || 0);
          return ratingSumB - ratingSumA;
        });
        
        return optimized.map((pairing, index) => ({
          ...pairing,
          board: index + 1
        }));
      }
    },
    {
      id: 'create-byes',
      name: 'Create Byes',
      description: 'Add bye pairings for odd number of players',
      icon: <Users className="h-5 w-5" />,
      action: (pairings) => {
        // Find players not in any pairing
        const pairedPlayerIds = new Set<string>();
        pairings.forEach(pairing => {
          if (pairing.white_id) pairedPlayerIds.add(pairing.white_id);
          if (pairing.black_id) pairedPlayerIds.add(pairing.black_id);
        });
        
        const unpairedPlayers = players.filter(player => !pairedPlayerIds.has(player.id));
        
        if (unpairedPlayers.length === 0) return pairings;
        
        // Create bye pairings
        const byePairings = unpairedPlayers.map((player, index) => ({
          id: `bye_${Date.now()}_${index}`,
          tournament_id: tournamentId,
          round: round,
          section: section,
          board: pairings.length + index + 1,
          white_player_id: player.id,
          black_player_id: '', // Empty for bye
          white_id: player.id,
          white_name: player.name,
          white_rating: player.rating,
          black_id: undefined,
          black_name: 'BYE',
          black_rating: undefined,
          result: '1-0F', // Bye is typically a win for the player
          created_at: new Date().toISOString(),
          is_bye: true
        }));
        
        return [...pairings, ...byePairings];
      }
    }
  ];

  const handleOperation = useCallback((operation: BulkOperation) => {
    setSelectedOperation(operation.id);
    
    if (operation.requiresConfirmation) {
      setShowConfirmation(true);
    } else {
      executeOperation(operation);
    }
  }, []);

  const executeOperation = useCallback((operation: BulkOperation) => {
    try {
      const updatedPairings = operation.action(pairings, players);
      onPairingsUpdate(updatedPairings);
      
      setOperationResult({
        success: true,
        message: `${operation.name} completed successfully`,
        details: {
          originalCount: pairings.length,
          updatedCount: updatedPairings.length,
          operation: operation.name
        }
      });
      
      // Clear result after 3 seconds
      setTimeout(() => setOperationResult(null), 3000);
    } catch (error) {
      setOperationResult({
        success: false,
        message: `Failed to execute ${operation.name}: ${error}`,
        details: { error }
      });
    }
    
    setSelectedOperation(null);
    setShowConfirmation(false);
  }, [pairings, players, onPairingsUpdate]);

  const confirmOperation = useCallback(() => {
    const operation = bulkOperations.find(op => op.id === selectedOperation);
    if (operation) {
      executeOperation(operation);
    }
  }, [selectedOperation, bulkOperations, executeOperation]);

  const cancelOperation = useCallback(() => {
    setSelectedOperation(null);
    setShowConfirmation(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Operation Result */}
      {operationResult && (
        <div className={`rounded-lg p-4 ${
          operationResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {operationResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            )}
            <span className={`font-medium ${
              operationResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {operationResult.message}
            </span>
            <button
              onClick={() => setOperationResult(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          {operationResult.details && (
            <div className="mt-2 text-sm text-gray-600">
              <pre className="bg-gray-100 p-2 rounded text-xs">
                {JSON.stringify(operationResult.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Operation</h3>
            </div>
            <p className="text-gray-600 mb-6">
              {bulkOperations.find(op => op.id === selectedOperation)?.confirmationMessage}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmOperation}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={cancelOperation}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bulkOperations.map((operation) => (
          <div
            key={operation.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleOperation(operation)}
          >
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0 mr-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  {operation.icon}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {operation.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {operation.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {pairings.length} pairings
              </span>
              <div className="flex items-center space-x-1">
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Pairing Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{pairings.length}</div>
            <div className="text-xs text-gray-500">Total Pairings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {pairings.filter(p => p.result && p.result !== 'TBD').length}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {pairings.filter(p => !p.result || p.result === 'TBD').length}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.max(...pairings.map(p => p.board), 0)}
            </div>
            <div className="text-xs text-gray-500">Max Board</div>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Advanced Options</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Auto-optimize after changes</div>
              <div className="text-xs text-gray-500">Automatically optimize pairings after manual edits</div>
            </div>
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Validate before save</div>
              <div className="text-xs text-gray-500">Check for conflicts before saving changes</div>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Show rating differences</div>
              <div className="text-xs text-gray-500">Display rating differences in pairing table</div>
            </div>
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPairingOperations;

