import React from 'react';

const ChessGame: React.FC = () => {
  // In development, use the standalone 2PlayerChess server on port 3000
  // In production (Heroku), the main server serves 2PlayerChess at /chess
  const isDevelopment = process.env.NODE_ENV === 'development';
  const chessGameUrl = isDevelopment 
    ? 'http://localhost:3000'
    : '/chess';
  
  return (
    <div className="fixed inset-0 bg-black" style={{ top: '64px', zIndex: 1000 }}>
      <iframe 
        src={chessGameUrl}
        title="2PlayerChess"
        className="w-full h-full border-0"
        style={{ height: 'calc(100vh - 64px)', width: '100%' }}
        allowFullScreen
      />
    </div>
  );
};

export default ChessGame;

