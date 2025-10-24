import React, { useState } from 'react';
import PairingSystemSelector from './PairingSystemSelector';

interface EnhancedPairingGeneratorProps {
  tournamentId: string;
  round: number;
  section?: string;
  onPairingsGenerated: (pairings: any[]) => void;
  onError: (error: string) => void;
}

const EnhancedPairingGenerator: React.FC<EnhancedPairingGeneratorProps> = ({
  tournamentId,
  round,
  section,
  onPairingsGenerated,
  onError
}) => {
  const [pairingSystem, setPairingSystem] = useState('fide_dutch');
  const [tiebreakerOrder, setTiebreakerOrder] = useState(['buchholz', 'sonneborn_berger', 'direct_encounter']);
  const [accelerationSettings, setAccelerationSettings] = useState({
    enabled: false,
    type: 'standard',
    rounds: 2,
    threshold: null
  });
  const [colorBalanceRules, setColorBalanceRules] = useState('fide');
  const [byeSettings, setByeSettings] = useState({
    fullPointBye: true,
    avoidUnratedDropping: true
  });
  const [generating, setGenerating] = useState(false);

  const handleGeneratePairings = async () => {
    console.log('🚀 Starting pairing generation...', {
      tournamentId,
      round,
      pairingSystem,
      tiebreakerOrder,
      accelerationSettings,
      colorBalanceRules,
      byeSettings
    });

    console.log('🔍 Round type:', typeof round, 'Round value:', round);
    
    if (!tournamentId) {
      console.error('❌ No tournament ID provided');
      onError('No tournament ID provided');
      return;
    }

    // Ensure round is a valid number
    const roundNumber = parseInt(round.toString());
    if (isNaN(roundNumber) || roundNumber < 1) {
      console.error('❌ Invalid round number:', round);
      onError('Invalid round number');
      return;
    }
    
    setGenerating(true);
    
    try {
      const response = await fetch('/api/pairings/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId,
          round: roundNumber
        }),
      });

      console.log('📡 API Response status:', response.status);
      const data = await response.json();
      console.log('📊 API Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate pairings');
      }

      console.log('✅ Pairings generated successfully:', data.pairings);
      onPairingsGenerated(data.pairings);
    } catch (error) {
      console.error('❌ Error generating pairings:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Generate Round {round} Pairings</h2>
        <button
          onClick={() => {
            console.log('🔘 Generate Pairings button clicked!');
            handleGeneratePairings();
          }}
          disabled={generating}
          className={`px-4 py-2 rounded-md font-medium ${
            generating
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {generating ? 'Generating...' : 'Generate Pairings'}
        </button>
      </div>

      <PairingSystemSelector
        onSystemChange={setPairingSystem}
        onTiebreakerChange={setTiebreakerOrder}
        onAccelerationChange={setAccelerationSettings}
        onColorBalanceChange={setColorBalanceRules}
        onByeSettingsChange={setByeSettings}
        selectedSystem={pairingSystem}
        selectedTiebreakers={tiebreakerOrder}
        accelerationSettings={accelerationSettings}
        colorBalanceRules={colorBalanceRules}
        byeSettings={byeSettings}
      />

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">Current Configuration</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Pairing System:</strong> {pairingSystem}</p>
          <p><strong>Tiebreakers:</strong> {tiebreakerOrder.join(', ')}</p>
          <p><strong>Color Balance:</strong> {colorBalanceRules}</p>
          {accelerationSettings.enabled && (
            <p><strong>Acceleration:</strong> {accelerationSettings.type} for {accelerationSettings.rounds} rounds</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedPairingGenerator;
