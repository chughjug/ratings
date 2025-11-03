import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, Trophy, Award, Medal } from 'lucide-react';
import { PrizeSettings, PrizeSection, PrizeConfiguration } from '../types';
import { tournamentApi } from '../services/api';

interface PrizeConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  currentSettings: PrizeSettings | null;
  onUpdate: (settings: PrizeSettings) => void;
}

const PrizeConfigurationModal: React.FC<PrizeConfigurationModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  currentSettings,
  onUpdate
}) => {
  const [settings, setSettings] = useState<PrizeSettings>({
    enabled: false,
    autoAssign: false,
    sections: []
  });
  const [loading, setLoading] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [prizeFund, setPrizeFund] = useState<number>(0);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [calculatingPrizes, setCalculatingPrizes] = useState(false);

  // Fetch available sections from API when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableSections();
      
      if (currentSettings) {
        setSettings(currentSettings);
      } else {
        setSettings({
          enabled: false,
          autoAssign: false,
          sections: []
        });
      }
    }
  }, [isOpen, currentSettings]);

  const fetchAvailableSections = async () => {
    try {
      const response = await tournamentApi.getSections(tournamentId);
      if (response.data.success) {
        setAvailableSections(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setAvailableSections([]);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await tournamentApi.updatePrizeSettings(tournamentId, settings);
      onUpdate(settings);
      onClose();
    } catch (error) {
      console.error('Error saving prize settings:', error);
      alert('Failed to save prize settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePrizes = async () => {
    try {
      setCalculatingPrizes(true);
      const response = await tournamentApi.calculatePrizes(tournamentId);
      if (response.data.success) {
        alert(`Successfully calculated and distributed ${response.data.data.length} prizes!`);
        onUpdate(settings); // Refresh display
      } else {
        alert('Failed to calculate prizes: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error calculating prizes:', error);
      alert('Failed to calculate prizes: ' + (error.message || 'Unknown error'));
    } finally {
      setCalculatingPrizes(false);
    }
  };

  const handleGenerateStandardStructure = async () => {
    try {
      setGeneratingStructure(true);
      const response = await tournamentApi.generatePrizeStructure(tournamentId, prizeFund);
      if (response.data.success) {
        setSettings(response.data.data);
        alert('Standard prize structure generated successfully!');
      } else {
        alert('Failed to generate prize structure');
      }
    } catch (error) {
      console.error('Error generating prize structure:', error);
      alert('Failed to generate prize structure');
    } finally {
      setGeneratingStructure(false);
    }
  };

  const addSection = (sectionName: string) => {
    if (!settings.sections.find(s => s.name === sectionName)) {
      setSettings(prev => ({
        ...prev,
        sections: [
          ...prev.sections,
          {
            name: sectionName,
            prizes: []
          }
        ]
      }));
    }
  };

  const removeSection = (sectionName: string) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.name !== sectionName)
    }));
  };

  const addPrize = (sectionName: string) => {
    const newPrize: PrizeConfiguration = {
      name: '',
      type: 'cash',
      position: 1,
      amount: 0,
      description: ''
    };

    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.name === sectionName
          ? { ...section, prizes: [...section.prizes, newPrize] }
          : section
      )
    }));
  };

  const addBulkPrizes = (sectionName: string, count: number, type: 'cash' | 'trophy' | 'medal' | 'plaque', startPosition: number = 1) => {
    const newPrizes: PrizeConfiguration[] = [];
    for (let i = 0; i < count; i++) {
      const position = startPosition + i;
      const positionSuffix = position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th';
      newPrizes.push({
        name: `${position}${positionSuffix} Place ${type === 'cash' ? 'Prize' : type.charAt(0).toUpperCase() + type.slice(1)}`,
        type: type,
        position: position,
        amount: type === 'cash' ? 0 : undefined,
        description: ''
      });
    }

    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.name === sectionName
          ? { ...section, prizes: [...section.prizes, ...newPrizes] }
          : section
      )
    }));
  };

  const updatePrize = (sectionName: string, prizeIndex: number, updatedPrize: PrizeConfiguration) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.name === sectionName
          ? {
              ...section,
              prizes: section.prizes.map((prize, i) => 
                i === prizeIndex ? updatedPrize : prize
              )
            }
          : section
      )
    }));
  };

  const removePrize = (sectionName: string, prizeIndex: number) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.name === sectionName
          ? {
              ...section,
              prizes: section.prizes.filter((_, i) => i !== prizeIndex)
            }
          : section
      )
    }));
  };

  const getPrizeIcon = (type: string) => {
    switch (type) {
      case 'cash': return <DollarSign className="w-4 h-4" />;
      case 'trophy': return <Trophy className="w-4 w-4" />;
      case 'medal': return <Medal className="w-4 w-4" />;
      case 'plaque': return <Award className="w-4 w-4" />;
      default: return <Award className="w-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Prize Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Global Prize Settings */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Prize Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="ml-2 text-gray-900">Enable prizes for this tournament</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoAssign}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoAssign: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="ml-2 text-gray-900">Auto-assign prizes when final round is completed</span>
              </label>
            </div>
          </div>

          {/* Quick Setup */}
          <div className="mb-8 bg-blue-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Quick Setup</h4>
            <div className="flex space-x-2">
              <input
                type="number"
                value={prizeFund}
                onChange={(e) => setPrizeFund(parseFloat(e.target.value) || 0)}
                placeholder="Prize Fund (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={handleGenerateStandardStructure}
                disabled={generatingStructure}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                {generatingStructure ? 'Generating...' : 'Generate Standard Structure'}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              This will automatically create position-based prizes, trophies, and under prizes based on your tournament size and prize fund.
            </p>
          </div>

          {/* Prize Sections */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prize Sections</h3>
            
            {/* Available Sections to Add */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Available sections from your tournament:</p>
              <div className="flex flex-wrap gap-2">
                {availableSections.map(section => {
                  const hasSection = settings.sections.some(s => s.name === section);
                  return (
                    <button
                      key={section}
                      onClick={() => hasSection ? removeSection(section) : addSection(section)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        hasSection
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {hasSection ? '✓ ' : '+'} {section}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configured Sections */}
            {settings.sections.map((section) => (
              <div key={section.name} className="mb-6 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-900">Prizes for {section.name}</h4>
                  <button
                    onClick={() => removeSection(section.name)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove Section
                  </button>
                </div>

                {section.prizes.map((prize, prizeIndex) => (
                  <div key={prizeIndex} className="bg-gray-50 p-4 rounded-lg mb-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prize Name</label>
                        <input
                          type="text"
                          value={prize.name}
                          onChange={(e) => updatePrize(section.name, prizeIndex, { ...prize, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 1st Place"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={prize.type}
                          onChange={(e) => updatePrize(section.name, prizeIndex, { ...prize, type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="cash">Cash</option>
                          <option value="trophy">Trophy</option>
                          <option value="medal">Medal</option>
                          <option value="plaque">Plaque</option>
                        </select>
                      </div>
                      {prize.type === 'cash' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                            <input
                              type="number"
                              value={prize.amount}
                              onChange={(e) => updatePrize(section.name, prizeIndex, { ...prize, amount: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                            <input
                              type="number"
                              value={prize.position}
                              onChange={(e) => updatePrize(section.name, prizeIndex, { ...prize, position: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              min="1"
                            />
                          </div>
                        </>
                      )}
                      {prize.type !== 'cash' && prize.ratingCategory && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rating Category</label>
                          <input
                            type="text"
                            value={prize.ratingCategory}
                            onChange={(e) => updatePrize(section.name, prizeIndex, { ...prize, ratingCategory: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="e.g., Under 1600"
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                        <input
                          type="text"
                          value={prize.description}
                          onChange={(e) => updatePrize(section.name, prizeIndex, { ...prize, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 1st Place Trophy in Championship section"
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => removePrize(section.name, prizeIndex)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove Prize
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => addPrize(section.name)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Prize
                  </button>
                  <button
                    onClick={() => {
                      const count = parseInt(prompt('How many trophies?', '3') || '3');
                      if (count > 0) {
                        const startPos = parseInt(prompt('Starting position?', '1') || '1');
                        addBulkPrizes(section.name, count, 'trophy', startPos);
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm flex items-center"
                  >
                    <Trophy className="w-4 h-4 mr-1" /> Bulk Add Trophies
                  </button>
                  <button
                    onClick={() => {
                      const count = parseInt(prompt('How many medals?', '5') || '5');
                      if (count > 0) {
                        const startPos = parseInt(prompt('Starting position?', '1') || '1');
                        addBulkPrizes(section.name, count, 'medal', startPos);
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm flex items-center"
                  >
                    <Medal className="w-4 h-4 mr-1" /> Bulk Add Medals
                  </button>
                  <button
                    onClick={() => {
                      const count = parseInt(prompt('How many plaques?', '3') || '3');
                      if (count > 0) {
                        const startPos = parseInt(prompt('Starting position?', '1') || '1');
                        addBulkPrizes(section.name, count, 'plaque', startPos);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm flex items-center"
                  >
                    <Award className="w-4 h-4 mr-1" /> Bulk Add Plaques
                  </button>
                </div>
              </div>
            ))}

            {settings.sections.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                Select sections above to configure prizes
              </p>
            )}
          </div>

          {/* Help Text */}
          <div className="bg-gray-50 p-4 rounded-lg mt-6">
            <h4 className="font-semibold text-gray-900 mb-2">Chess Tournament Prize Types</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><strong>Position Prizes:</strong> Awarded to players based on their final ranking (1st, 2nd, 3rd place)</li>
              <li><strong>Rating Prizes:</strong> Awarded to top performers within specific rating categories:
                <ul className="ml-4 mt-1 space-y-0.5">
                  <li>• Under Prizes: "Under 1600", "Under 1200" - open to all players below the rating</li>
                  <li>• USCF Classes: "Class A (1800-1999)", "Class B (1600-1799)", etc.</li>
                  <li>• Unrated: For players without an official rating</li>
                </ul>
              </li>
              <li><strong>Prize Types:</strong> Cash, Trophies, Medals, or Plaques</li>
              <li><strong>Auto-Assignment:</strong> Prizes are automatically calculated and assigned when the tournament completes</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleCalculatePrizes}
            disabled={calculatingPrizes || !settings.enabled}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {calculatingPrizes ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Calculating...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Calculate Prizes
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrizeConfigurationModal;

