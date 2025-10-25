import React, { useState } from 'react';
import { Gamepad2, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface LichessGameCreatorProps {
  pairingId: string;
  whitePlayer: {
    id: string;
    name: string;
    lichess_username?: string;
  };
  blackPlayer: {
    id: string;
    name: string;
    lichess_username?: string;
  };
  timeControl: string;
  onGameCreated?: (gameData: any) => void;
  onError?: (error: string) => void;
}

const LichessGameCreator: React.FC<LichessGameCreatorProps> = ({
  pairingId,
  whitePlayer,
  blackPlayer,
  timeControl,
  onGameCreated,
  onError
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [gameStatus, setGameStatus] = useState<'idle' | 'creating' | 'created' | 'error'>('idle');
  const [gameData, setGameData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const createLichessGame = async () => {
    if (!whitePlayer.lichess_username || !blackPlayer.lichess_username) {
      const missingUsernames = [];
      if (!whitePlayer.lichess_username) missingUsernames.push(whitePlayer.name);
      if (!blackPlayer.lichess_username) missingUsernames.push(blackPlayer.name);
      
      const errorMsg = `Missing Lichess usernames for: ${missingUsernames.join(', ')}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setIsCreating(true);
      setGameStatus('creating');
      setError('');

      // Call the Lichess game creation API
      const response = await fetch('/api/lichess/create-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pairingId,
          whitePlayer: whitePlayer.lichess_username,
          blackPlayer: blackPlayer.lichess_username,
          timeControl: timeControl
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create Lichess game');
      }

      setGameData(result.game);
      setGameStatus('created');
      onGameCreated?.(result.game);

    } catch (err: any) {
      console.error('Error creating Lichess game:', err);
      setError(err.message);
      setGameStatus('error');
      onError?.(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const openGame = () => {
    if (gameData?.url) {
      window.open(gameData.url, '_blank');
    }
  };

  const openChallenge = (url: string) => {
    window.open(url, '_blank');
  };

  // Don't render if no Lichess usernames are available
  if (!whitePlayer.lichess_username && !blackPlayer.lichess_username) {
    return (
      <div className="text-xs text-gray-400">
        No Lichess usernames
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {gameStatus === 'idle' && (
        <button
          onClick={createLichessGame}
          disabled={isCreating}
          className="flex items-center space-x-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Gamepad2 className="w-3 h-3" />
          )}
          <span>Create Game</span>
        </button>
      )}

      {gameStatus === 'creating' && (
        <div className="flex items-center space-x-1 text-xs text-blue-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Creating...</span>
        </div>
      )}

      {gameStatus === 'created' && gameData && (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-xs text-green-600">Game Ready</span>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={openGame}
              className="flex items-center space-x-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Seek Game</span>
            </button>
            {gameData.whiteChallengeUrl && (
              <button
                onClick={() => openChallenge(gameData.whiteChallengeUrl)}
                className="flex items-center space-x-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Challenge</span>
              </button>
            )}
          </div>
          {gameData.instructions && (
            <div className="text-xs text-gray-500 max-w-48">
              {gameData.instructions}
            </div>
          )}
        </div>
      )}

      {gameStatus === 'error' && (
        <div className="flex items-center space-x-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          <span title={error}>Error</span>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 max-w-32 truncate" title={error}>
          {error}
        </div>
      )}
    </div>
  );
};

export default LichessGameCreator;
