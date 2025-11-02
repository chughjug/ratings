import React, { useState } from 'react';
import { Copy, Check, Link as LinkIcon, Clock, Users } from 'lucide-react';
import axios from 'axios';

const CreateGame: React.FC = () => {
  const [whitePlayerName, setWhitePlayerName] = useState('');
  const [blackPlayerName, setBlackPlayerName] = useState('');
  const [initialTimeMinutes, setInitialTimeMinutes] = useState(10);
  const [incrementSeconds, setIncrementSeconds] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createdGame, setCreatedGame] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const apiUrl = process.env.NODE_ENV === 'production'
        ? '/api/games'
        : 'http://localhost:5000/api/games';

      const response = await axios.post(`${apiUrl}/create`, {
        whitePlayerName: whitePlayerName || 'White',
        blackPlayerName: blackPlayerName || 'Black',
        initialTimeMinutes,
        incrementSeconds,
      });

      if (response.data.success) {
        setCreatedGame(response.data.game);
      }
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (link: string, type: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const formatTimeControl = (minutes: number, increment: number) => {
    if (increment > 0) {
      return `${minutes}+${increment}`;
    }
    return `${minutes}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <LinkIcon className="w-8 h-8 text-indigo-600" />
            Create Custom Chess Game
          </h1>
          <p className="text-gray-600 mb-8">
            Generate unique game links for two players with custom time controls
          </p>

          {!createdGame ? (
            <div className="space-y-6">
              {/* Player Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    White Player Name
                  </label>
                  <input
                    type="text"
                    value={whitePlayerName}
                    onChange={(e) => setWhitePlayerName(e.target.value)}
                    placeholder="Enter white player name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-2" />
                    Black Player Name
                  </label>
                  <input
                    type="text"
                    value={blackPlayerName}
                    onChange={(e) => setBlackPlayerName(e.target.value)}
                    placeholder="Enter black player name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Time Control */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  <Clock className="w-5 h-5 inline mr-2" />
                  Time Control Settings
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Initial Time (minutes)
                    </label>
                    <input
                      type="number"
                      value={initialTimeMinutes}
                      onChange={(e) => setInitialTimeMinutes(Number(e.target.value))}
                      min="1"
                      max="120"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Choose between 1 and 120 minutes
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Increment (seconds)
                    </label>
                    <input
                      type="number"
                      value={incrementSeconds}
                      onChange={(e) => setIncrementSeconds(Number(e.target.value))}
                      min="0"
                      max="60"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Time added after each move (0-60 seconds)
                    </p>
                  </div>
                </div>
                <div className="mt-4 bg-white rounded-lg p-4 border border-indigo-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Selected:</span>{' '}
                    <span className="text-lg font-bold text-indigo-700">
                      {formatTimeControl(initialTimeMinutes, incrementSeconds)}
                    </span>
                    {incrementSeconds > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Fischer delay)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateGame}
                disabled={isCreating}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isCreating ? 'Creating Game...' : 'Create Game Links'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                <h2 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
                  <Check className="w-6 h-6" />
                  Game Created Successfully!
                </h2>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">White:</span> {createdGame.whitePlayer}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-semibold">Black:</span> {createdGame.blackPlayer}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Time Control:</span>{' '}
                    {formatTimeControl(initialTimeMinutes, incrementSeconds)}
                  </p>
                </div>
              </div>

              {/* White Player Link */}
              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="px-3 py-1 bg-gray-100 rounded-md">White</span>
                  Player Link
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createdGame.whiteUrl}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => handleCopyLink(createdGame.whiteUrl, 'white')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    {copiedLink === 'white' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Black Player Link */}
              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="px-3 py-1 bg-gray-800 text-white rounded-md">Black</span>
                  Player Link
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createdGame.blackUrl}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => handleCopyLink(createdGame.blackUrl, 'black')}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
                  >
                    {copiedLink === 'black' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCreatedGame(null);
                    setWhitePlayerName('');
                    setBlackPlayerName('');
                    setInitialTimeMinutes(10);
                    setIncrementSeconds(0);
                  }}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Create Another Game
                </button>
                <button
                  onClick={() => window.location.href = createdGame.whiteUrl}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Open White's View
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGame;

