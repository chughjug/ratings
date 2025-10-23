import React, { useState } from 'react';
import { Plus, Users, Trophy, Upload, Zap, Keyboard } from 'lucide-react';

interface QuickAddToolbarProps {
  onAddPlayer: () => void;
  onBulkAddPlayers: () => void;
  onCreateTeam: () => void;
  onImportCSV: () => void;
  onQuickAdd: (type: 'unrated' | 'rated' | 'school') => void;
}

const QuickAddToolbar: React.FC<QuickAddToolbarProps> = ({
  onAddPlayer,
  onBulkAddPlayers,
  onCreateTeam,
  onImportCSV,
  onQuickAdd
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const quickAddOptions = [
    {
      type: 'unrated' as const,
      label: 'Quick Unrated',
      description: 'Add unrated player',
      icon: '👤',
      shortcut: 'U'
    },
    {
      type: 'rated' as const,
      label: 'Quick Rated',
      description: 'Add rated player',
      icon: '⭐',
      shortcut: 'R'
    },
    {
      type: 'school' as const,
      label: 'School Team',
      description: 'Add school team template',
      icon: '🏫',
      shortcut: 'S'
    }
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onAddPlayer();
          break;
        case 'b':
          e.preventDefault();
          onBulkAddPlayers();
          break;
        case 't':
          e.preventDefault();
          onCreateTeam();
          break;
        case 'i':
          e.preventDefault();
          onImportCSV();
          break;
      }
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Quick Add</h3>
        </div>
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Keyboard className="h-4 w-4" />
          <span>Shortcuts</span>
        </button>
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <button
          onClick={onAddPlayer}
          className="flex items-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <Plus className="h-4 w-4 text-chess-board" />
          <span className="text-sm font-medium">Add Player</span>
        </button>

        <button
          onClick={onBulkAddPlayers}
          className="flex items-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <Users className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium">Bulk Add</span>
        </button>

        <button
          onClick={onCreateTeam}
          className="flex items-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <Trophy className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-medium">Create Team</span>
        </button>

        <button
          onClick={onImportCSV}
          className="flex items-center space-x-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <Upload className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">Import CSV</span>
        </button>
      </div>

      {/* Quick Add Templates */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {quickAddOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => onQuickAdd(option.type)}
              className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-md hover:border-blue-300 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{option.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                {option.shortcut}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="text-sm font-medium text-gray-700 mb-2">Keyboard Shortcuts:</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div><kbd className="bg-white px-1 py-0.5 rounded border">Ctrl+N</kbd> Add Player</div>
            <div><kbd className="bg-white px-1 py-0.5 rounded border">Ctrl+B</kbd> Bulk Add</div>
            <div><kbd className="bg-white px-1 py-0.5 rounded border">Ctrl+T</kbd> Create Team</div>
            <div><kbd className="bg-white px-1 py-0.5 rounded border">Ctrl+I</kbd> Import CSV</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAddToolbar;
