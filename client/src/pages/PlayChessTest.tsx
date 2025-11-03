import React from 'react';

const PlayChessTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>Chess Game Test Page</h1>
      <p>If you see this, the route is working!</p>
      <p>Now testing chess.js import...</p>
      <TestChessImport />
    </div>
  );
};

const TestChessImport: React.FC = () => {
  const [status, setStatus] = React.useState<string>('Testing...');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const test = async () => {
      try {
        const chessModule = await import('chess.js');
        const { Chess } = chessModule;
        const game = new Chess();
        setStatus(`✅ Success! Chess FEN: ${game.fen()}`);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setStatus('❌ Failed to load chess.js');
      }
    };
    test();
  }, []);

  return (
    <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
      <p><strong>Import Test:</strong> {status}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
};

export default PlayChessTest;





