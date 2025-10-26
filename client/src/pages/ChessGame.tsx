import React from 'react';

const ChessGame: React.FC = () => {
  // Use window.location to get the origin and point to the correct backend port
  const backendUrl = process.env.NODE_ENV === 'production' 
    ? window.location.origin 
    : 'http://localhost:5000';
  
  return (
    <div className="fixed inset-0 bg-black" style={{ top: '64px', zIndex: 1000 }}>
      <iframe 
        src={`${backendUrl}/2playerchess/`}
        title="2PlayerChess"
        className="w-full h-full border-0"
        style={{ height: 'calc(100vh - 64px)', width: '100%' }}
        allowFullScreen
      />
    </div>
  );
};

export default ChessGame;

