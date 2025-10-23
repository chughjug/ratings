import React, { useState, useEffect } from 'react';

interface PairingSystem {
  id: string;
  name: string;
  description: string;
  suitableFor: string;
  features: string[];
}

interface Tiebreaker {
  id: string;
  name: string;
  description: string;
  calculation: string;
}

interface PairingSystemSelectorProps {
  onSystemChange: (system: string) => void;
  onTiebreakerChange: (tiebreakers: string[]) => void;
  onAccelerationChange: (settings: any) => void;
  onColorBalanceChange: (rules: string) => void;
  onByeSettingsChange: (settings: any) => void;
  selectedSystem?: string;
  selectedTiebreakers?: string[];
  accelerationSettings?: any;
  colorBalanceRules?: string;
  byeSettings?: any;
}

const PairingSystemSelector: React.FC<PairingSystemSelectorProps> = ({
  onSystemChange,
  onTiebreakerChange,
  onAccelerationChange,
  onColorBalanceChange,
  onByeSettingsChange,
  selectedSystem = 'fide_dutch',
  selectedTiebreakers = ['buchholz', 'sonneborn_berger', 'direct_encounter'],
  accelerationSettings = { enabled: false, type: 'standard', rounds: 2, threshold: null },
  colorBalanceRules = 'fide',
  byeSettings = { fullPointBye: true, avoidUnratedDropping: true }
}) => {
  const [pairingSystems, setPairingSystems] = useState<PairingSystem[]>([]);
  const [tiebreakers, setTiebreakers] = useState<Tiebreaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchPairingSystems();
    fetchTiebreakers();
  }, []);

  const fetchPairingSystems = async () => {
    try {
      const response = await fetch('/api/pairings/systems');
      const data = await response.json();
      setPairingSystems(data);
    } catch (error) {
      console.error('Error fetching pairing systems:', error);
    }
  };

  const fetchTiebreakers = async () => {
    try {
      const response = await fetch('/api/pairings/tiebreakers');
      const data = await response.json();
      setTiebreakers(data);
    } catch (error) {
      console.error('Error fetching tiebreakers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemChange = (systemId: string) => {
    onSystemChange(systemId);
  };

  const handleTiebreakerChange = (tiebreakerId: string, checked: boolean) => {
    if (checked) {
      onTiebreakerChange([...selectedTiebreakers, tiebreakerId]);
    } else {
      onTiebreakerChange(selectedTiebreakers.filter(t => t !== tiebreakerId));
    }
  };

  const handleAccelerationChange = (field: string, value: any) => {
    onAccelerationChange({
      ...accelerationSettings,
      [field]: value
    });
  };

  const handleColorBalanceChange = (rules: string) => {
    onColorBalanceChange(rules);
  };

  const handleByeSettingsChange = (field: string, value: any) => {
    onByeSettingsChange({
      ...byeSettings,
      [field]: value
    });
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading pairing systems...</div>;
  }

  const selectedSystemInfo = pairingSystems.find(s => s.id === selectedSystem);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Pairing System Configuration</h3>
      
      {/* Pairing System Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pairing System
        </label>
        <select
          value={selectedSystem}
          onChange={(e) => handleSystemChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {pairingSystems.map(system => (
            <option key={system.id} value={system.id}>
              {system.name}
            </option>
          ))}
        </select>
        
        {selectedSystemInfo && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600 mb-1">{selectedSystemInfo.description}</p>
            <p className="text-xs text-gray-500 mb-2">Suitable for: {selectedSystemInfo.suitableFor}</p>
            <div className="flex flex-wrap gap-1">
              {selectedSystemInfo.features.map((feature, index) => (
                <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tiebreaker Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tiebreaker Order
        </label>
        <div className="space-y-2">
          {tiebreakers.map(tiebreaker => (
            <label key={tiebreaker.id} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedTiebreakers.includes(tiebreaker.id)}
                onChange={(e) => handleTiebreakerChange(tiebreaker.id, e.target.checked)}
                className="mr-2"
              />
              <div className="flex-1">
                <span className="text-sm font-medium">{tiebreaker.name}</span>
                <p className="text-xs text-gray-500">{tiebreaker.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4"
      >
        {showAdvanced ? '▼' : '▶'} Advanced Settings
      </button>

      {showAdvanced && (
        <div className="space-y-6 border-t pt-4">
          {/* Acceleration Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acceleration Settings
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={accelerationSettings.enabled}
                  onChange={(e) => handleAccelerationChange('enabled', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Enable acceleration for large tournaments</span>
              </label>
              
              {accelerationSettings.enabled && (
                <div className="ml-6 space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Acceleration Type</label>
                    <select
                      value={accelerationSettings.type}
                      onChange={(e) => handleAccelerationChange('type', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="standard">Standard (A1 vs A2, B1 vs B2)</option>
                      <option value="added_score">Added Score</option>
                      <option value="sixths">Sixths</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Rounds to Accelerate</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={accelerationSettings.rounds}
                      onChange={(e) => handleAccelerationChange('rounds', parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Player Threshold (optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Auto-calculate if empty"
                      value={accelerationSettings.threshold || ''}
                      onChange={(e) => handleAccelerationChange('threshold', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Color Balance Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Balance Rules
            </label>
            <select
              value={colorBalanceRules}
              onChange={(e) => handleColorBalanceChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="fide">FIDE Rules (Aggressive color correction)</option>
              <option value="uscf">USCF Rules (Rating-aware with limits)</option>
              <option value="simple">Simple (Basic color balancing)</option>
            </select>
          </div>

          {/* Bye Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bye Settings
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={byeSettings.fullPointBye}
                  onChange={(e) => handleByeSettingsChange('fullPointBye', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Full-point bye (1.0 points)</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={byeSettings.avoidUnratedDropping}
                  onChange={(e) => handleByeSettingsChange('avoidUnratedDropping', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Avoid dropping unrated players</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PairingSystemSelector;
