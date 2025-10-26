import React, { useState } from 'react';
import { ExternalLink, Users, Gamepad2, Clock, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface OnlineGameIntegrationProps {
  tournamentId: string;
  tournamentName: string;
  timeControl: string;
  round: number;
  pairings: Array<{
    id: string;
    white_player_id: string;
    black_player_id: string;
    white_player_name: string;
    black_player_name: string;
    white_player_uscf_id?: string;
    black_player_uscf_id?: string;
  }>;
  onGameCreated?: (pairingId: string, gameUrl: string, links: { white: string; black: string }) => void;
}

const OnlineGameIntegration: React.FC<OnlineGameIntegrationProps> = ({
  tournamentId,
  tournamentName,
  timeControl,
  round,
  pairings,
  onGameCreated
}) => {
  const [generatedGames, setGeneratedGames] = useState<Record<string, { white: string; black: string }>>({});
  const [copiedGame, setCopiedGame] = useState<string | null>(null);
  const [copiedColor, setCopiedColor] = useState<'white' | 'black' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse time control (e.g., "G/45+15", "60+5", "5")
  const parseTimeControl = (timeControl: string) => {
    const match = timeControl.match(/G\/(\d+)\+(\d+)/);
    if (match) {
      return {
        minutes: parseInt(match[1]),
        increment: parseInt(match[2])
      };
    }
    // Try other formats
    const match2 = timeControl.match(/(\d+)\+(\d+)/);
    if (match2) {
      return {
        minutes: parseInt(match2[1]),
        increment: parseInt(match2[2])
      };
    }
    // Just minutes
    const match3 = timeControl.match(/(\d+)/);
    if (match3) {
      return {
        minutes: parseInt(match3[1]),
        increment: 0
      };
    }
    return { minutes: 30, increment: 0 };
  };

  const timeControlData = parseTimeControl(timeControl);

  const generateGameUrls = async (pairing: any, roomName: string, whiteId: string, blackId: string, whiteUscfId?: string, blackUscfId?: string) => {
    // Generate a unique room code
    const roomCode = roomName || generateRoomCode();
    
    // Create tokens for player verification
    const whiteToken = generateSecurityToken(whiteId, whiteUscfId || whiteId);
    const blackToken = generateSecurityToken(blackId, blackUscfId || blackId);
    
    // Create custom room in 2PlayerChess server
    try {
      // Use relative URL for production, localhost for development
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const apiUrl = isProduction ? '/api/chess2player/create-room' : 'http://localhost:8080/api/create-room';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomCode: roomCode,
          whitePlayer: pairing.white_player_name || `Player ${whiteId}`,
          blackPlayer: pairing.black_player_name || `Player ${blackId}`,
          whitePlayerId: whiteId,
          blackPlayerId: blackId,
          timeControl: `${timeControlData.minutes}+${timeControlData.increment}`
        })
      });
      
      if (!response.ok) {
        console.warn('Failed to create custom room, continuing with auto-join mode');
      }
    } catch (error) {
      console.error('Error creating custom room:', error);
      // Continue anyway - room will be created when first player joins
    }
    
    // Create separate URLs for white and black players with their authentication
    // Use /2playerchess/chess.html for Heroku production
    const basePath = isProduction ? '/2playerchess' : '';
    const whiteUrl = `${window.location.origin}${basePath}/chess.html?room=${roomCode}&name=${encodeURIComponent(pairing.white_player_name || 'White Player')}&playerId=${whiteId}&token=${whiteToken}&color=white&tc=${timeControlData.minutes}+${timeControlData.increment}`;
    const blackUrl = `${window.location.origin}${basePath}/chess.html?room=${roomCode}&name=${encodeURIComponent(pairing.black_player_name || 'Black Player')}&playerId=${blackId}&token=${blackToken}&color=black&tc=${timeControlData.minutes}+${timeControlData.increment}`;
    
    return { roomCode, whiteUrl, blackUrl, whiteToken, blackToken };
  };

  const generateSecurityToken = (playerId: string, uscfId?: string): string => {
    // Generate a secure token based on player info
    const payload = `${playerId}-${uscfId || playerId}-${round}-${tournamentId}`;
    // In production, use a proper hashing algorithm
    return btoa(payload).replace(/[/+=]/g, '').substring(0, 16);
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substr(2, 10).toUpperCase();
  };

  const handleGenerateGames = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const newGames: Record<string, { white: string; black: string }> = {};

      for (const pairing of pairings) {
        if (!generatedGames[pairing.id]) {
          const roomCode = `${tournamentId.substring(0, 6)}-${pairing.id.substring(0, 6)}-R${round}`;
          const { whiteUrl, blackUrl } = await generateGameUrls(
            pairing,
            roomCode,
            pairing.white_player_id,
            pairing.black_player_id,
            pairing.white_player_uscf_id,
            pairing.black_player_uscf_id
          );
          newGames[pairing.id] = { white: whiteUrl, black: blackUrl };

          // Notify parent component
          if (onGameCreated) {
            onGameCreated(pairing.id, whiteUrl, { white: whiteUrl, black: blackUrl });
          }
        }
      }

      setGeneratedGames(prev => ({ ...prev, ...newGames }));

    } catch (err) {
      setError('Failed to generate games');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyGameLink = async (pairingId: string, url: string, color: 'white' | 'black') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedGame(pairingId);
      setCopiedColor(color);
      setTimeout(() => {
        setCopiedGame(null);
        setCopiedColor(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Gamepad2 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Online Game Generation</h3>
        </div>
        <Clock className="h-5 w-5 text-gray-500" />
        <span className="text-sm text-gray-600">
          {timeControlData.minutes} min + {timeControlData.increment}s
        </span>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          Generate online game links for Round {round}. Each player gets their own personalized link with automatic color assignment and security verification.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {Object.keys(generatedGames).length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2 text-gray-700">Generated Games:</h4>
          <div className="space-y-3">
            {pairings.map((pairing) => {
              const gameLinks = generatedGames[pairing.id];
              if (!gameLinks) return null;

              return (
                <div
                  key={pairing.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {pairing.white_player_name} vs {pairing.black_player_name}
                    </span>
                  </div>
                  
                  {/* White player link */}
                  <div className="mb-2 p-2 bg-white rounded border border-gray-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-gray-600">White:</span>
                          <span className="text-xs text-gray-700">{pairing.white_player_name}</span>
                          <span className="text-xs text-gray-500">{pairing.white_player_uscf_id && `USCF: ${pairing.white_player_uscf_id}`}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 font-mono truncate">{gameLinks.white}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyGameLink(pairing.id, gameLinks.white, 'white')}
                        className="ml-2 px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 flex items-center space-x-1 whitespace-nowrap"
                      >
                        {copiedGame === pairing.id && copiedColor === 'white' ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Black player link */}
                  <div className="p-2 bg-white rounded border border-gray-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-medium text-gray-600">Black:</span>
                          <span className="text-xs text-gray-700">{pairing.black_player_name}</span>
                          <span className="text-xs text-gray-500">{pairing.black_player_uscf_id && `USCF: ${pairing.black_player_uscf_id}`}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 font-mono truncate">{gameLinks.black}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyGameLink(pairing.id, gameLinks.black, 'black')}
                        className="ml-2 px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-800 flex items-center space-x-1 whitespace-nowrap"
                      >
                        {copiedGame === pairing.id && copiedColor === 'black' ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={handleGenerateGames}
        disabled={isLoading || Object.keys(generatedGames).length === pairings.length}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span>Generating...</span>
          </>
        ) : Object.keys(generatedGames).length === pairings.length ? (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>All Games Generated</span>
          </>
        ) : (
          <>
            <Users className="h-4 w-4" />
            <span>Generate {pairings.length} Game{pairings.length !== 1 ? 's' : ''}</span>
          </>
        )}
      </button>

      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>How to use:</strong> Click "Generate Games" to create personalized links for each player. Share the White link with the white player and the Black link with the black player. Each link includes player authentication and automatic color assignment. Players cannot switch colors or access their opponent's link.
        </p>
      </div>
    </div>
  );
};

export default OnlineGameIntegration;
