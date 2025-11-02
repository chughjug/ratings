import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Link as LinkIcon, Clock, Users } from 'lucide-react';
import io from 'socket.io-client';

const CreateGame: React.FC = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState<any>(null);
  const [playerName, setPlayerName] = useState('');
  const [initialTimeMinutes, setInitialTimeMinutes] = useState(10);
  const [incrementSeconds, setIncrementSeconds] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [gameRoomId, setGameRoomId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [joinGameRoomCode, setJoinGameRoomCode] = useState('');
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  useEffect(() => {
    // Connect to socket.io on component mount
    const socketUrl = process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:5000';
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('newroom', (roomCode) => {
      console.log('Received room code:', roomCode);
      setGameRoomId(roomCode);
      setIsCreating(false);
      setWaitingForOpponent(true);
    });

    // Listen for second player to join
    newSocket.on('username2', (name: string, opponent: string, room: string) => {
      console.log('Both players present!', name, opponent, room);
      setWaitingForOpponent(false);
      // Navigate to /play-chess when both players are ready
      navigate('/play-chess');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [navigate]);

  const handleStartGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsCreating(true);
    // Emit 'newroom' event to create a room
    socket.emit('newroom', playerName);
  };

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!joinGameRoomCode.trim()) {
      alert('Please enter a room code');
      return;
    }

    setIsCreating(true);
    socket.emit('validate', joinGameRoomCode.toUpperCase());
    
    // Wait for validation response
    socket.once('validate', (isValid: boolean) => {
      if (isValid) {
        socket.emit('join', joinGameRoomCode.toUpperCase(), playerName, false, 0);
        setIsCreating(false);
      } else {
        alert('Invalid room code');
        setIsCreating(false);
      }
    });
  };

  const handleCopyRoomCode = () => {
    if (gameRoomId) {
      const gameUrl = window.location.origin;
      const link = `${gameUrl}/create-game?room=${gameRoomId}`;
      navigator.clipboard.writeText(link);
      setCopiedLink('room');
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const formatTimeControl = (minutes: number, increment: number) => {
    if (increment > 0) {
      return `${minutes}+${increment}`;
    }
    return `${minutes}`;
  };

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-lg shadow-xl p-8 border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <LinkIcon className="w-8 h-8 text-green-500" />
            <span>&lt; 2-Player Chess &gt;</span>
          </h1>
          <p className="text-gray-400 mb-8 text-center">
            Create a room or join an existing game
          </p>

          {!gameRoomId && !waitingForOpponent ? (
            <div className="space-y-6">
              {!showJoinGame ? (
                // Start Game Form
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      <Users className="w-4 h-4 inline mr-2 text-green-500" />
                      Enter Your Name
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
                    />
                  </div>

                  {/* Time Control */}
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <label className="block text-sm font-semibold text-gray-300 mb-4">
                      <Clock className="w-5 h-5 inline mr-2 text-green-500" />
                      Time Control Settings
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Initial Time (minutes)
                        </label>
                        <input
                          type="number"
                          value={initialTimeMinutes}
                          onChange={(e) => setInitialTimeMinutes(Number(e.target.value))}
                          min="1"
                          max="120"
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Increment (seconds)
                        </label>
                        <input
                          type="number"
                          value={incrementSeconds}
                          onChange={(e) => setIncrementSeconds(Number(e.target.value))}
                          min="0"
                          max="60"
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="mt-4 bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold">Selected:</span>{' '}
                        <span className="text-lg font-bold text-green-400">
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

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleStartGame}
                      disabled={isCreating || !socket}
                      className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? 'Creating...' : 'Start Game'}
                    </button>
                    <button
                      onClick={() => setShowJoinGame(true)}
                      disabled={isCreating}
                      className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold text-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Join Game
                    </button>
                  </div>
                </>
              ) : (
                // Join Game Form
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      <Users className="w-4 h-4 inline mr-2 text-red-500" />
                      Enter Your Name
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Game Room ID Code
                    </label>
                    <input
                      type="text"
                      value={joinGameRoomCode}
                      onChange={(e) => setJoinGameRoomCode(e.target.value.toUpperCase())}
                      placeholder="Enter room code"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-500 font-mono"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleJoinGame}
                      disabled={isCreating || !socket}
                      className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold text-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? 'Joining...' : 'Join Game'}
                    </button>
                    <button
                      onClick={() => setShowJoinGame(false)}
                      disabled={isCreating}
                      className="flex-1 py-4 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all disabled:opacity-50"
                    >
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : gameRoomId && waitingForOpponent ? (
            // Waiting for opponent
            <div className="space-y-6">
              <div className="bg-yellow-900 rounded-lg p-6 border border-yellow-700">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center justify-center gap-2">
                  <Clock className="w-6 h-6 animate-pulse" />
                  Waiting for Opponent...
                </h2>
                <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
                  <p className="text-sm text-gray-300 mb-1 text-center">
                    <span className="font-semibold">Room Code:</span>{' '}
                    <span className="font-mono text-lg font-bold text-green-400">{gameRoomId}</span>
                  </p>
                  <p className="text-sm text-gray-400 text-center">
                    Share this code with your opponent
                  </p>
                </div>
              </div>

              <div className="border-2 border-gray-700 rounded-lg p-6 bg-gray-800">
                <h3 className="text-lg font-bold text-white mb-3 text-center">
                  Game Link
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/create-game?room=${gameRoomId}`}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyRoomCode}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    {copiedLink === 'room' ? (
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

              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CreateGame;
