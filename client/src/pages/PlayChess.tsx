import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess, Move } from 'chess.js';
import ChessBoard from '../components/chess/ChessBoard';
import { RotateCcw, FlipHorizontal, Square, Clock, Save, Copy, Check, Users, X, Minus } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';

interface ClockTimes {
  white: number; // in milliseconds
  black: number; // in milliseconds
}

// Parse time control from URL or default to 3+2
const getTimeControlFromURL = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const timeParam = urlParams.get('time');
  if (timeParam) {
    const parts = timeParam.split('+');
    if (parts.length >= 1) {
      const minutes = parseInt(parts[0]) || 3;
      const increment = parts[1] ? parseInt(parts[1]) : 2;
      return { minutes, increment };
    }
  }
  return { minutes: 3, increment: 2 };
};

const PlayChess: React.FC = () => {
  const [chess] = useState(() => {
    try {
      return new Chess();
    } catch (error) {
      console.error('Error creating Chess:', error);
      throw error;
    }
  });
  
  const [board, setBoard] = useState(() => {
    try {
      const b = chess.board();
      console.log('Initial board:', b);
      return b;
    } catch (error) {
      console.error('Error getting board:', error);
      return [];
    }
  });
  
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [gameStatus, setGameStatus] = useState<{
    isGameOver: boolean;
    result: string | null;
    inCheck: boolean;
  }>({
    isGameOver: false,
    result: null,
    inCheck: false,
  });

  // Socket.io state
  const [socket, setSocket] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameRoomId, setGameRoomId] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [showRoomCreation, setShowRoomCreation] = useState(true);
  const [joinGameRoomCode, setJoinGameRoomCode] = useState('');
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>(() => {
    // Check URL params for initial color
    const urlParams = new URLSearchParams(window.location.search);
    const colorParam = urlParams.get('color');
    return (colorParam === 'white' || colorParam === 'black') ? colorParam : 'white';
  });
  
  // Clock state - parse time control from URL or default to 3+2
  const timeControl = useMemo(() => getTimeControlFromURL(), []);
  const initialTimeMinutes = timeControl.minutes;
  const initialIncrementSeconds = timeControl.increment;
  const initialTime = initialTimeMinutes * 60 * 1000; // minutes in milliseconds
  const [clockTimes, setClockTimes] = useState<ClockTimes>({
    white: initialTime,
    black: initialTime,
  });
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [activeColor, setActiveColor] = useState<'white' | 'black'>('white');
  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [incrementSeconds, setIncrementSeconds] = useState(initialIncrementSeconds);
  const [drawOffered, setDrawOffered] = useState(false);
  const [opponentDrawOffer, setOpponentDrawOffer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [playerRating, setPlayerRating] = useState<number | null>(null);
  const [opponentRating, setOpponentRating] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{sender: string, message: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);

  // Helper function to verify password
  const verifyPassword = async (roomCode: string, password: string, playerColor: 'white' | 'black'): Promise<{ verified: boolean; passwordRequired?: boolean } | null> => {
    try {
      const apiUrl = process.env.NODE_ENV === 'production'
        ? '/api/games/verify-password'
        : 'http://localhost:5000/api/games/verify-password';
      
      console.log('[verifyPassword] Calling API:', { apiUrl, roomCode, playerColor, hasPassword: !!password });
      
      const response = await axios.post(apiUrl, {
        roomCode,
        password,
        playerColor
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[verifyPassword] Response received:', response.data);
      
      if (response.data && response.data.success) {
        return {
          verified: response.data.verified,
          passwordRequired: response.data.passwordRequired
        };
      }
      return null;
    } catch (error: any) {
      console.error('[verifyPassword] Error verifying password:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        roomCode,
        playerColor
      });
      
      // If room not found (404), return null to indicate verification failed
      if (error.response?.status === 404) {
        console.warn('[verifyPassword] Room not found:', roomCode);
        return null;
      }
      
      return null;
    }
  };

  // Helper function to update pairing result
  const updatePairingResult = async (gameId: string, result: string) => {
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/games/update-result'
        : 'http://localhost:5000/api/games/update-result';
      
      await axios.post(apiUrl, {
        gameId,
        result
      });
      
      console.log('Pairing result updated successfully');
    } catch (error) {
      console.error('Error updating pairing result:', error);
      // Don't show error to user - this is a background operation
    }
  };

  // Initialize Socket.io connection
  useEffect(() => {
    const socketUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : 'http://localhost:5000';
    
    console.log('Connecting to socket.io at:', socketUrl);
    
    // Check URL parameters for custom game setup
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const nameParam = urlParams.get('name');
    const colorParam = urlParams.get('color');
    const whiteRatingParam = urlParams.get('whiteRating');
    const blackRatingParam = urlParams.get('blackRating');
    const logoParam = urlParams.get('logo');
    
    // Set player name from URL if provided
    if (nameParam && !playerName) {
      setPlayerName(nameParam);
    }
    
    // Set player color from URL if provided
    if (colorParam && (colorParam === 'white' || colorParam === 'black')) {
      setPlayerColor(colorParam);
      
      // Set ratings based on color assignment
      if (colorParam === 'white') {
        // Player is white
        if (whiteRatingParam) {
          const rating = parseInt(whiteRatingParam);
          if (!isNaN(rating)) {
            setPlayerRating(rating);
          }
        }
        if (blackRatingParam) {
          const rating = parseInt(blackRatingParam);
          if (!isNaN(rating)) {
            setOpponentRating(rating);
          }
        }
      } else {
        // Player is black
        if (blackRatingParam) {
          const rating = parseInt(blackRatingParam);
          if (!isNaN(rating)) {
            setPlayerRating(rating);
          }
        }
        if (whiteRatingParam) {
          const rating = parseInt(whiteRatingParam);
          if (!isNaN(rating)) {
            setOpponentRating(rating);
          }
        }
      }
    }
    
    // Set organization logo from URL if provided
    // URLSearchParams.get() already decodes the value, so no need for decodeURIComponent
    if (logoParam) {
      setOrganizationLogo(logoParam);
    }
    
    const newSocket = io(socketUrl, {
      path: '/socket.io/',
      transports: ['polling', 'websocket'], // Prefer polling first for Heroku compatibility
      upgrade: true,
      rememberUpgrade: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      multiplex: true
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      setSocketConnected(true);
      
      // Check if we have a room in URL params and verify password first
      if (roomParam && !gameRoomId) {
        const playerNameToUse = nameParam || playerName;
        const colorFromUrl = colorParam === 'white' || colorParam === 'black' ? colorParam : 'white';
        const passwordFromUrl = urlParams.get('password');
        
        if (playerNameToUse) {
          // Check if password is in URL and verify it
          if (passwordFromUrl) {
            verifyPassword(roomParam.toUpperCase(), passwordFromUrl, colorFromUrl).then((result) => {
              if (result && result.verified) {
                setPasswordVerified(true);
                setGameRoomId(roomParam.toUpperCase());
                setShowRoomCreation(false);
                newSocket.emit('join', roomParam.toUpperCase(), playerNameToUse, false, 0);
              } else {
                setPasswordError('Invalid password. Please enter your email or last 4 digits of your phone number.');
                // Make sure gameRoomId is set so password prompt shows
                setGameRoomId(roomParam.toUpperCase());
                setShowRoomCreation(false);
              }
            });
          } else {
            // No password in URL - set gameRoomId and check if password is required
            setGameRoomId(roomParam.toUpperCase());
            setShowRoomCreation(false);
            // Check if password is required by verifying with empty password
            verifyPassword(roomParam.toUpperCase(), '', colorFromUrl).then((result) => {
              if (result) {
                if (result.passwordRequired && !result.verified) {
                  // Password is required but not provided - prompt will be shown
                  // Don't set passwordVerified to true
                } else {
                  // No password required - auto verify
                  setPasswordVerified(true);
                  newSocket.emit('join', roomParam.toUpperCase(), playerNameToUse, false, 0);
                }
              }
            });
          }
        }
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setSocketConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setSocketConnected(false);
    });

    newSocket.on('offer-draw', () => {
      setOpponentDrawOffer(true);
    });

    newSocket.on('decline-draw', () => {
      setOpponentDrawOffer(false);
      setDrawOffered(false);
    });

    newSocket.on('resign', () => {
      // Get room ID from URL params if gameRoomId state isn't set yet
      const urlParams = new URLSearchParams(window.location.search);
      const currentRoomId = gameRoomId || urlParams.get('room');
      const resignResult = playerColor === 'white' ? 'White wins by resignation!' : 'Black wins by resignation!';
      setGameStatus({
        isGameOver: true,
        result: resignResult,
        inCheck: false,
      });
      setIsClockRunning(false);
      // Update pairing result when opponent resigns
      if (currentRoomId) {
        updatePairingResult(currentRoomId, resignResult);
      }
    });

    newSocket.on('game-over', (data: { result: string }) => {
      // Get room ID from URL params if gameRoomId state isn't set yet
      const urlParams = new URLSearchParams(window.location.search);
      const currentRoomId = gameRoomId || urlParams.get('room');
      setGameStatus({
        isGameOver: true,
        result: data.result,
        inCheck: false,
      });
      setIsClockRunning(false);
      setDrawOffered(false);
      setOpponentDrawOffer(false);
      // Update pairing result when game ends
      if (currentRoomId && data.result) {
        updatePairingResult(currentRoomId, data.result);
      }
    });

    newSocket.on('newroom', (roomCode) => {
      console.log('Received room code:', roomCode);
      setGameRoomId(roomCode);
      setIsCreating(false);
      setWaitingForOpponent(true);
      setShowRoomCreation(false);
    });

    newSocket.on('username', (username: string) => {
      console.log('Received username:', username);
      // Player 1 receives this after creating a room
    });

    newSocket.on('username2', (name: string, opponent: string, room: string, rematch: boolean, rejoin: boolean, moveObj?: any, moveCount?: string) => {
      console.log('Both players present!', name, opponent, room, 'rematch:', rematch, 'rejoin:', rejoin);
      setWaitingForOpponent(false);
      setOpponentName(opponent);
      setShowRoomCreation(false);
      
      // Determine player color: 
      // - rejoin=false means first player who created room (WHITE)
      // - rejoin=true means second player who joined room (BLACK)
      // This matches lichess/chess.com behavior: first player = white
      setPlayerColor(rejoin ? 'black' : 'white');
      
      console.log(`Player ${playerName} assigned color: ${rejoin ? 'black' : 'white'}`);
      
      // Set ratings based on color assignment
      const urlParams = new URLSearchParams(window.location.search);
      const whiteRatingParam = urlParams.get('whiteRating');
      const blackRatingParam = urlParams.get('blackRating');
      
      if (rejoin) {
        // Player is black
        if (blackRatingParam) {
          const rating = parseInt(blackRatingParam);
          if (!isNaN(rating)) setPlayerRating(rating);
        }
        if (whiteRatingParam) {
          const rating = parseInt(whiteRatingParam);
          if (!isNaN(rating)) setOpponentRating(rating);
        }
      } else {
        // Player is white
        if (whiteRatingParam) {
          const rating = parseInt(whiteRatingParam);
          if (!isNaN(rating)) setPlayerRating(rating);
        }
        if (blackRatingParam) {
          const rating = parseInt(blackRatingParam);
          if (!isNaN(rating)) setOpponentRating(rating);
        }
      }
      
      // If there are existing moves, restore the game state
      if (moveObj && moveCount && parseInt(moveCount) > 0) {
        try {
          // Restore game from move history if reconnecting
          console.log('Restoring game from move history:', moveCount, 'moves');
        } catch (error) {
          console.error('Error restoring game state:', error);
        }
      }
    });

    // Chat handler
    newSocket.on('chat-msg', (msg: string, sender: string) => {
      setChatMessages(prev => [...prev, { sender, message: msg }]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-flip board if joining as black
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const colorParam = urlParams.get('color');
    if (colorParam === 'black') {
      setIsFlipped(true);
    }
  }, []);

  // Send chat message
  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && socket) {
      socket.emit('chat-msg', chatInput.trim());
      setChatInput('');
    }
  };

  // Handle incoming moves from socket
  useEffect(() => {
    if (!socket) return;

    const handleSocketMove = (piece: string, pos: string, color: string, simulation: boolean, atk: boolean, server: boolean, move: string, pawnPromote: string) => {
      if (server) {
        // This is a move from the opponent
        // pos is the source square, move is the destination square
        try {
          // Create move notation from source and destination
          const moveNotation = `${pos}${move}`;
          const moveResult = chess.move(moveNotation);
          if (moveResult) {
            // Update move history
            setMoveHistory((prev) => [...prev, moveResult]);
            
            // Update board state
            const newBoard = chess.board();
            setBoard(newBoard);
            
            // Switch active color for clock
            setActiveColor(moveResult.color === 'w' ? 'black' : 'white');
            
            // Start clock on first move (if it's white's first move)
            if (!isClockRunning && moveHistory.length === 0 && moveResult.color === 'w') {
              setIsClockRunning(true);
            }
            
            // Add increment to the player who just moved (if clock is running)
            if (incrementSeconds > 0 && isClockRunning) {
              setClockTimes((prev) => ({
                ...prev,
                [moveResult.color === 'w' ? 'white' : 'black']: prev[moveResult.color === 'w' ? 'white' : 'black'] + incrementSeconds * 1000
              }));
            }
            
            updateGameStatus();
          }
        } catch (error) {
          console.error('Error applying opponent move:', error);
        }
      }
    };

    socket.on('move', handleSocketMove);

    return () => {
      socket.off('move', handleSocketMove);
    };
  }, [socket, chess, isClockRunning, moveHistory.length, incrementSeconds]);

  const handleStartGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!socket || !socketConnected) {
      alert('Not connected to server. Please wait...');
      return;
    }

    console.log('Starting game for player:', playerName);
    socket.emit('newroom', playerName);
    socket.emit('game-options', '10', false, true, false);
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
      const link = `${window.location.origin}/play-chess`;
      navigator.clipboard.writeText(link);
      setCopiedLink('room');
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const updateGameStatus = () => {
    try {
      const isGameOver = chess.isGameOver();
      const inCheck = chess.inCheck();
      let result: string | null = null;
      const wasGameOver = gameStatus.isGameOver;

      if (isGameOver) {
        if (chess.isCheckmate()) {
          result = chess.turn() === 'w' ? 'Black wins by checkmate!' : 'White wins by checkmate!';
        } else if (chess.isDraw()) {
          if (chess.isStalemate()) {
            result = 'Draw by stalemate!';
          } else if (chess.isThreefoldRepetition()) {
            result = 'Draw by threefold repetition!';
          } else if (chess.isInsufficientMaterial()) {
            result = 'Draw by insufficient material!';
          } else {
            result = 'Draw!';
          }
        }
      }

      setGameStatus({ isGameOver, result, inCheck });
      const newBoard = chess.board();
      setBoard(newBoard);

      // If game just ended and we have a gameId (from URL room parameter), update pairing result
      if (isGameOver && !wasGameOver && result && gameRoomId) {
        updatePairingResult(gameRoomId, result);
      }
    } catch (error) {
      console.error('Error updating game status:', error);
    }
  };

  // Clock sync effect - send updates to server every second
  // Removed clockTimes from dependencies to prevent interval recreation
  useEffect(() => {
    if (!socket || !gameRoomId || !opponentName || !isClockRunning) return;

    const syncInterval = setInterval(() => {
      // Only send updates when clock is running
      // Use a ref to get current clock times without recreating interval
      setClockTimes((current) => {
        const minsB = Math.floor(current.black / 60000);
        const secsB = Math.floor((current.black % 60000) / 1000);
        const minsW = Math.floor(current.white / 60000);
        const secsW = Math.floor((current.white % 60000) / 1000);
        const zeroB = current.black === 0;
        const zeroW = current.white === 0;
        
        // Send update with active color so server knows which player is updating
        socket.emit('update-clock', minsB, minsW, secsB, secsW, zeroB, zeroW, activeColor);
        
        return current; // Return unchanged to avoid triggering state update
      });
    }, 1000);

    return () => {
      clearInterval(syncInterval);
    };
  }, [socket, gameRoomId, opponentName, isClockRunning, activeColor]);

  // Clock sync handler - receive authoritative updates from server
  useEffect(() => {
    if (!socket) return;

    const handleClockSync = (minsB: number, minsW: number, secsB: number, secsW: number, zeroB: boolean, zeroW: boolean) => {
      const newBlackTime = minsB * 60000 + secsB * 1000;
      const newWhiteTime = minsW * 60000 + secsW * 1000;
      
      // Always update from server - trust server as authoritative source of truth
      setClockTimes((prev) => {
        // Only update if there's a significant difference to avoid jitter
        const blackDiff = Math.abs(prev.black - newBlackTime);
        const whiteDiff = Math.abs(prev.white - newWhiteTime);
        
        // Update if difference is more than 100ms (to handle rounding differences)
        if (blackDiff > 100 || whiteDiff > 100 || prev.black !== newBlackTime || prev.white !== newWhiteTime) {
          return {
            black: newBlackTime,
            white: newWhiteTime,
          };
        }
        return prev;
      });
      
      // Handle time running out
      if (zeroB && !gameStatus.isGameOver) {
        setIsClockRunning(false);
        const timeResult = 'White wins on time!';
        setGameStatus({
          isGameOver: true,
          result: timeResult,
          inCheck: false,
        });
        if (gameRoomId) {
          updatePairingResult(gameRoomId, timeResult);
        }
      } else if (zeroW && !gameStatus.isGameOver) {
        setIsClockRunning(false);
        const timeResult = 'Black wins on time!';
        setGameStatus({
          isGameOver: true,
          result: timeResult,
          inCheck: false,
        });
        if (gameRoomId) {
          updatePairingResult(gameRoomId, timeResult);
        }
      }
    };

    socket.on('get-current-time', handleClockSync);

    return () => {
      socket.off('get-current-time', handleClockSync);
    };
  }, [socket, gameStatus.isGameOver, gameRoomId]);

  // Clock effect
  useEffect(() => {
    if (isClockRunning && !gameStatus.isGameOver) {
      clockIntervalRef.current = setInterval(() => {
        setClockTimes((prev) => {
          const newTimes = { ...prev };
          if (activeColor === 'white') {
            newTimes.white = Math.max(0, prev.white - 100);
          } else {
            newTimes.black = Math.max(0, prev.black - 100);
          }
          
          // Check if time ran out
          if (newTimes[activeColor] === 0) {
            setIsClockRunning(false);
            const timeResult = activeColor === 'white' ? 'Black wins on time!' : 'White wins on time!';
            setGameStatus({
              isGameOver: true,
              result: timeResult,
              inCheck: false,
            });
            // Update pairing result when time runs out
            if (gameRoomId) {
              updatePairingResult(gameRoomId, timeResult);
            }
          }
          
          return newTimes;
        });
      }, 100);

      return () => {
        if (clockIntervalRef.current) {
          clearInterval(clockIntervalRef.current);
        }
      };
    } else {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    }
  }, [isClockRunning, gameStatus.isGameOver, activeColor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    updateGameStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveHistory]);

  const handleMove = (move: Move) => {
    try {
      // Update move history
      setMoveHistory((prev) => [...prev, move]);
      
      // Update board state immediately
      const newBoard = chess.board();
      setBoard(newBoard);
      
      // Start clock on first move (after white's first move)
      if (!isClockRunning && moveHistory.length === 0 && move.color === 'w') {
        setIsClockRunning(true);
      }
      
      // Switch active color for clock after move is made
      setActiveColor(move.color === 'w' ? 'black' : 'white');
      
      // Note: Increment is now handled server-side when move is received
      // Server will broadcast updated times back to all clients
      
      // Send move to opponent via socket (move.to is the destination square)
      if (socket && gameRoomId) {
        socket.emit('move', move.piece, move.from, move.color, false, false, true, move.to, '');
      }
      
      updateGameStatus();
    } catch (error) {
      console.error('Error handling move:', error);
    }
  };

  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      if (socket && gameRoomId) {
        socket.emit('resign');
      }
      const resignResult = playerColor === 'white' ? 'Black wins by resignation!' : 'White wins by resignation!';
      setGameStatus({
        isGameOver: true,
        result: resignResult,
        inCheck: false,
      });
      setIsClockRunning(false);
      // Update pairing result when resigning
      if (gameRoomId) {
        updatePairingResult(gameRoomId, resignResult);
      }
    }
  };

  const handleOfferDraw = () => {
    if (socket && gameRoomId) {
      socket.emit('offer-draw');
      setDrawOffered(true);
    }
  };

  const handleAcceptDraw = () => {
    if (socket && gameRoomId) {
      socket.emit('accept-draw');
    }
    const drawResult = 'Draw by agreement!';
    setGameStatus({
      isGameOver: true,
      result: drawResult,
      inCheck: false,
    });
    setIsClockRunning(false);
    setDrawOffered(false);
    setOpponentDrawOffer(false);
    // Update pairing result when draw is accepted
    if (gameRoomId) {
      updatePairingResult(gameRoomId, drawResult);
    }
  };

  const handleDeclineDraw = () => {
    if (socket && gameRoomId) {
      socket.emit('decline-draw');
    }
    setDrawOffered(false);
    setOpponentDrawOffer(false);
  };

  const handleReset = () => {
    try {
      chess.reset();
      setMoveHistory([]);
      const newBoard = chess.board();
      setBoard(newBoard);
      setClockTimes({ white: initialTime, black: initialTime });
      setActiveColor('white');
      setIsClockRunning(false);
      setDrawOffered(false);
      setOpponentDrawOffer(false);
      updateGameStatus();
    } catch (error) {
      console.error('Error resetting game:', error);
    }
  };
  
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleSaveGame = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const pgn = chess.pgn();
      const result = gameStatus.result || null;
      
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/games'
        : 'http://localhost:5000/api/games';
      
      await axios.post(apiUrl, {
        whitePlayer: playerColor === 'white' ? playerName : opponentName,
        blackPlayer: playerColor === 'black' ? playerName : opponentName,
        pgn,
        result,
        whiteTimeMs: clockTimes.white,
        blackTimeMs: clockTimes.black,
        initialTimeMs: initialTime,
        moveCount: moveHistory.length
      });
      
      setSaveMessage('Game saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving game:', error);
      setSaveMessage('Failed to save game');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleUndo = () => {
    if (moveHistory.length === 0) return;
    
    try {
      chess.undo();
      setMoveHistory((prev) => prev.slice(0, -1));
      updateGameStatus();
    } catch (error) {
      console.error('Error undoing move:', error);
    }
  };

  const getMoveNotation = (move: Move, index: number) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhite = index % 2 === 0;
    return isWhite ? `${moveNumber}. ${move.san}` : move.san;
  };

  const formatTimeControl = (minutes: number, increment: number) => {
    if (increment > 0) {
      return `${minutes}+${increment}`;
    }
    return `${minutes}`;
  };

  // This effect is handled in the socket connect handler above
  // Removed duplicate logic to avoid race conditions

  // Handle password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const colorFromUrl = urlParams.get('color') === 'white' || urlParams.get('color') === 'black' ? urlParams.get('color') as 'white' | 'black' : 'white';
    
    if (!roomParam || !passwordInput.trim()) {
      setPasswordError('Please enter your password');
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError(null);

    const result = await verifyPassword(roomParam.toUpperCase(), passwordInput.trim(), colorFromUrl);
    
    setIsVerifyingPassword(false);

    if (result && result.verified) {
      setPasswordVerified(true);
      // Update URL to include password for future visits
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('password', passwordInput.trim());
      window.history.replaceState({}, '', newUrl.toString());
      
      // Now join the game
      if (socket) {
        const playerNameToUse = urlParams.get('name') || playerName;
        if (playerNameToUse) {
          socket.emit('join', roomParam.toUpperCase(), playerNameToUse, false, 0);
        }
      }
    } else {
      setPasswordError('Invalid password. Please enter your email or last 4 digits of your phone number.');
    }
  };

  // Show room creation UI if not in a game
  console.log('Render check:', { showRoomCreation, waitingForOpponent, gameRoomId, boardLength: board?.length, passwordVerified });
  
  // Show password verification form if password is required
  // Show it if we have a gameRoomId but haven't verified password yet
  // Also show it if there was a password error (user tried but failed)
  if (gameRoomId && !passwordVerified && !showRoomCreation) {
    const urlParams = new URLSearchParams(window.location.search);
    const playerNameToUse = urlParams.get('name') || playerName;
    const colorFromUrl = urlParams.get('color') === 'white' || urlParams.get('color') === 'black' ? urlParams.get('color') as 'white' | 'black' : 'white';
    
    return (
      <div className="min-h-screen bg-[#262421] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-[#1f1d1b] rounded-lg shadow-xl p-8 border border-[#3d3935]">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Game Access Verification
          </h2>
          <p className="text-gray-400 mb-6 text-center text-sm">
            To join this game as <span className="font-semibold text-white">{playerNameToUse}</span> ({colorFromUrl === 'white' ? 'White' : 'Black'}), please enter your password.
          </p>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password (Email or Last 4 Digits of Phone)
              </label>
              <input
                type="text"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Enter your email or last 4 digits of phone"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                autoFocus
                disabled={isVerifyingPassword}
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-400">{passwordError}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isVerifyingPassword || !passwordInput.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifyingPassword ? 'Verifying...' : 'Join Game'}
            </button>
          </form>
          
          <p className="mt-4 text-xs text-gray-500 text-center">
            The password is your email address or the last 4 digits of your phone number.
          </p>
        </div>
      </div>
    );
  }
  
  if (showRoomCreation) {
    return (
      <div className="min-h-screen bg-[#262421] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1f1d1b] rounded-lg shadow-xl p-8 border border-[#3d3935]">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
              <Users className="w-8 h-8 text-green-500" />
              <span>2-Player Chess</span>
            </h1>
            <p className="text-gray-400 mb-8 text-center">
              Create a room or join an existing game
            </p>

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
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
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
                        readOnly
                        disabled
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Increment (seconds)
                      </label>
                      <input
                        type="number"
                        value={incrementSeconds}
                        readOnly
                        disabled
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed"
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
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleStartGame}
                    disabled={!socket || !socketConnected}
                    className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Game
                  </button>
                  <button
                    onClick={() => setShowJoinGame(true)}
                    className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold text-lg hover:from-red-700 hover:to-red-800 transition-all"
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

                <div className="mt-6">
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
                <div className="flex gap-4 mt-6">
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
        </div>
      </div>
    );
  }

  // Show waiting for opponent UI
  if (waitingForOpponent && gameRoomId) {
    return (
      <div className="min-h-screen bg-[#262421] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1f1d1b] rounded-lg shadow-xl p-8 border border-[#3d3935]">
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
                    value={`${window.location.origin}/play-chess`}
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
          </div>
        </div>
      </div>
    );
  }

  // Safety check
  if (!board || board.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Loading Chess Game...</h1>
            <p className="text-gray-700">Initializing board...</p>
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="min-h-screen bg-[#262421] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Top Bar - Time Control and Game Info */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                {initialTimeMinutes}+{incrementSeconds} • Unrated
              </span>
              {opponentName && (
                <span className="text-sm text-gray-400">
                  {playerName} vs {opponentName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFlip}
                className="px-3 py-1.5 bg-[#3d3935] hover:bg-[#504b47] rounded text-sm transition-colors"
                title="Flip Board"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
            {/* Left Panel - Player Info & Clocks */}
            <div className="bg-[#1f1d1b] rounded-lg p-4 space-y-4">
              {/* Opponent Info */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                      <Users className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1">
                        <span className={`w-2 h-2 rounded ${isFlipped ? 'bg-white border border-gray-400' : 'bg-black border border-gray-600'}`}></span>
                        {opponentName || 'Waiting...'}
                      </div>
                      {opponentRating && (
                        <div className="text-xs text-gray-400">
                          {opponentRating}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-mono font-bold ${
                      activeColor === (isFlipped ? 'white' : 'black') && isClockRunning && !gameStatus.isGameOver
                        ? 'text-yellow-400' 
                        : 'text-white'
                    }`}>
                      {formatTime(isFlipped ? clockTimes.white : clockTimes.black)}
                    </div>
                    {incrementSeconds > 0 && (
                      <div className="text-xs text-gray-400">+{incrementSeconds}s</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Your Info */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <Users className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1">
                        <span className={`w-2 h-2 rounded ${isFlipped ? 'bg-black border border-gray-600' : 'bg-white border border-gray-400'}`}></span>
                        {playerName || 'You'}
                      </div>
                      {playerRating && (
                        <div className="text-xs text-gray-400">
                          {playerRating}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-mono font-bold ${
                      activeColor === (isFlipped ? 'black' : 'white') && isClockRunning && !gameStatus.isGameOver
                        ? 'text-yellow-400' 
                        : 'text-white'
                    }`}>
                      {formatTime(isFlipped ? clockTimes.black : clockTimes.white)}
                    </div>
                    {incrementSeconds > 0 && (
                      <div className="text-xs text-gray-400">+{incrementSeconds}s</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Status */}
              {!gameStatus.isGameOver && opponentName && !waitingForOpponent && (
                <div className="pt-2 border-t border-gray-700">
                  {gameStatus.inCheck && (
                    <div className="px-3 py-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-300 text-center">
                      Check!
                    </div>
                  )}
                  {!gameStatus.inCheck && (
                    <div className="text-xs text-gray-400 text-center">
                      {chess.turn() === 'w' && playerColor === 'white' && "Your turn"}
                      {chess.turn() === 'w' && playerColor === 'black' && "Opponent's turn"}
                      {chess.turn() === 'b' && playerColor === 'black' && "Your turn"}
                      {chess.turn() === 'b' && playerColor === 'white' && "Opponent's turn"}
                    </div>
                  )}
                </div>
              )}

              {/* Organization Logo */}
              <div className="pt-2 border-t border-gray-700">
                <div className="flex justify-center items-center p-4">
                  {organizationLogo ? (
                    <img
                      src={organizationLogo}
                      alt="Organization"
                      className="h-12 w-auto"
                      onError={(e) => {
                        // Fallback to PairCraft logo if image fails to load
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzE2NjNlYSIvPgo8dGV4dCB4PSI2MCIgeT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYWlyQ3JhZnQ8L3RleHQ+Cjwvc3ZnPgo=';
                      }}
                    />
                  ) : (
                    <img
                      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiByeD0iNCIgZmlsbD0iIzE2NjNlYSIvPgo8dGV4dCB4PSI2MCIgeT0iMjQiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QYWlyQ3JhZnQ8L3RleHQ+Cjwvc3ZnPgo="
                      alt="PairCraft"
                      className="h-12 w-auto"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Center - Chess Board */}
            <div className="flex justify-center items-center">
              <div className="bg-[#1f1d1b] rounded-lg p-4 shadow-2xl">
                <ChessBoard
                  chess={chess}
                  board={board}
                  setBoard={setBoard}
                  isFlipped={isFlipped}
                  onMove={handleMove}
                  disabled={
                    gameStatus.isGameOver || 
                    !opponentName || 
                    waitingForOpponent ||
                    (playerColor === 'white' && chess.turn() !== 'w') || 
                    (playerColor === 'black' && chess.turn() !== 'b')
                  }
                  averageRating={playerRating && opponentRating ? (playerRating + opponentRating) / 2 : undefined}
                  boxSize={75}
                />
              </div>
            </div>

            {/* Right Panel - Move History, Chat, and Actions */}
            <div className="bg-[#1f1d1b] rounded-lg p-4 space-y-4">
              {/* Game Controls */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Game</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleFlip}
                    className="px-2 py-1.5 bg-[#3d3935] hover:bg-[#504b47] rounded text-xs transition-colors"
                    title="Flip Board"
                  >
                    <FlipHorizontal className="w-3 h-3" />
                  </button>
                  {/* Only show New button when not joining from tournament link */}
                  {!gameRoomId && (
                    <button
                      onClick={handleReset}
                      className="px-2 py-1.5 bg-[#3d3935] hover:bg-[#504b47] rounded text-xs transition-colors"
                      title="New Game"
                    >
                      New
                    </button>
                  )}
                </div>
              </div>

              {/* Actions */}
              {opponentName && !waitingForOpponent && (
                <div className="flex gap-2">
                  {!gameStatus.isGameOver && (
                    <>
                      <button
                        onClick={handleResign}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Resign
                      </button>
                      <button
                        onClick={handleOfferDraw}
                        disabled={drawOffered}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" />
                        Draw
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Draw Offer Notification */}
              {opponentDrawOffer && (
                <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded">
                  <p className="text-xs mb-2">Opponent offers draw</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAcceptDraw}
                      className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs"
                    >
                      Accept
                    </button>
                    <button
                      onClick={handleDeclineDraw}
                      className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Game Result */}
              {gameStatus.result && (
                <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded">
                  <p className="text-xs font-semibold">{gameStatus.result}</p>
                </div>
              )}

              {/* Move History */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Moves</h3>
                <div className="bg-[#262421] rounded p-2 max-h-[250px] overflow-y-auto">
                  {moveHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4 text-xs">Starting Position</p>
                  ) : (
                    <div className="space-y-0.5">
                      {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => {
                        const whiteMove = moveHistory[i * 2];
                        const blackMove = moveHistory[i * 2 + 1];
                        return (
                          <div key={i} className="flex items-center gap-2 py-1 px-1 hover:bg-[#3d3935] rounded">
                            <span className="text-gray-400 w-5 text-xs">{i + 1}.</span>
                            {whiteMove && (
                              <span className="text-white text-xs cursor-pointer hover:text-blue-400">
                                {whiteMove.san}
                              </span>
                            )}
                            {blackMove && (
                              <span className="text-white text-xs cursor-pointer hover:text-blue-400">
                                {blackMove.san}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Chat */}
              {opponentName && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Chat</h3>
                  <div className="bg-[#262421] rounded p-2 max-h-[150px] overflow-y-auto mb-2">
                    {chatMessages.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 text-xs">No messages yet</p>
                    ) : (
                      <div className="space-y-1">
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-semibold text-blue-400">{msg.sender}:</span>{' '}
                            <span className="text-gray-300">{msg.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={sendChatMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type message..."
                      className="flex-1 px-2 py-1.5 bg-[#262421] border border-gray-600 text-white rounded text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Render error:', error);
    return (
      <div className="min-h-screen bg-[#262421] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="bg-[#1f1d1b] rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Chess Game</h1>
            <p className="text-gray-300 mb-4">Error: {(error as Error).message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default PlayChess;
