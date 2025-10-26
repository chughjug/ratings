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

  // Fetch sections from standings when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSectionsFromPairings();
      
      // Initialize settings with currentSettings if available, ensure sections is an array
      if (currentSettings) {
        const sectionsArray = Array.isArray(currentSettings.sections) 
          ? currentSettings.sections 
          : [];
        
        setSettings({
          enabled: currentSettings.enabled || false,
          autoAssign: currentSettings.autoAssign || false,
          sections: sectionsArray
        });
      } else {
        setSettings({
          enabled: false,
          autoAssign: false,
          sections: []
        });
      }
    }
  }, [isOpen, currentSettings]);

  // Filter out invalid sections when availableSections loads
  useEffect(() => {
    if (isOpen && availableSections.length > 0 && settings.sections.length > 0) {
      const validSections = settings.sections.filter(section => 
        availableSections.includes(section.name)
      );
      
      if (validSections.length !== settings.sections.length) {
        console.log(`Filtered out ${settings.sections.length - validSections.length} invalid sections`);
        setSettings(prev => ({
          ...prev,
          sections: validSections
        }));
      }
    }
  }, [availableSections, isOpen]);

  const fetchSectionsFromPairings = async () => {
    try {
      const response = await tournamentApi.getSections(tournamentId);
      if (response.data.success) {
        setAvailableSections(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sections from pairings:', error);
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

  const addSection = () => {
    setSettings(prev => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          name: '',
          prizes: []
        }
      ]
    }));
  };

  const updateSection = (index: number, updatedSection: PrizeSection) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map((section, i) => i === index ? updatedSection : section)
    }));
  };

  const removeSection = (index: number) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const addPrize = (sectionIndex: number) => {
    const newPrize: PrizeConfiguration = {
      name: '',
      type: 'cash',
      position: 1,
      amount: 0,
      description: ''
    };

    updateSection(sectionIndex, {
      ...settings.sections[sectionIndex],
      prizes: [...settings.sections[sectionIndex].prizes, newPrize]
    });
  };

  const addRatingBasedPrize = (sectionIndex: number, ratingCategory: string) => {
    const newPrize: PrizeConfiguration = {
      name: `${ratingCategory} 1st Place`,
      type: 'cash',
      ratingCategory: ratingCategory,
      position: 1,
      amount: 0,
      description: `Top player in ${ratingCategory}`
    };

    updateSection(sectionIndex, {
      ...settings.sections[sectionIndex],
      prizes: [...settings.sections[sectionIndex].prizes, newPrize]
    });
  };

  const commonRatingCategories = [
    'Unrated',
    'Under 800',
    'Under 1000', 
    'Under 1200',
    'Under 1400',
    'Under 1600',
    'Under 1800',
    'Under 2000',
    'Under 2200',
    'Class E (Under 1200)',
    'Class D (1200-1399)',
    'Class C (1400-1599)',
    'Class B (1600-1799)',
    'Class A (1800-1999)',
    'Expert (2000-2199)',
    'Master (2200+)'
  ];

  const updatePrize = (sectionIndex: number, prizeIndex: number, updatedPrize: PrizeConfiguration) => {
    updateSection(sectionIndex, {
      ...settings.sections[sectionIndex],
      prizes: settings.sections[sectionIndex].prizes.map((prize, i) => 
        i === prizeIndex ? updatedPrize : prize
      )
    });
  };

  const removePrize = (sectionIndex: number, prizeIndex: number) => {
    updateSection(sectionIndex, {
      ...settings.sections[sectionIndex],
      prizes: settings.sections[sectionIndex].prizes.filter((_, i) => i !== prizeIndex)
    });
  };

  const getPrizeIcon = (type: string) => {
    switch (type) {
      case 'cash': return <DollarSign className="w-4 h-4" />;
      case 'trophy': return <Trophy className="w-4 h-4" />;
      case 'medal': return <Medal className="w-4 h-4" />;
      case 'plaque': return <Award className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Global Settings */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Global Prize Settings</h3>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="mr-2"
                />
                <span className="font-medium">Enable prizes for this tournament</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoAssign}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoAssign: e.target.checked }))}
                  className="mr-2"
                />
                <span className="font-medium">Auto-assign prizes when final round is completed</span>
              </label>
            </div>
          </div>

          {/* Prize Fund and Auto-Generation */}
          {settings.enabled && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Quick Setup</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prize Fund (optional)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      value={prizeFund}
                      onChange={(e) => setPrizeFund(parseFloat(e.target.value) || 0)}
                      placeholder="Enter total prize fund amount"
                      min="0"
                      step="0.01"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleGenerateStandardStructure}
                      disabled={generatingStructure}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {generatingStructure ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4 mr-2" />
                          Generate Standard Structure
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    This will automatically create position-based prizes, trophies, and under prizes based on your tournament size and prize fund.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Prize Sections */}
          {settings.enabled && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Prize Sections</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={addSection}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </button>
                  <button
                    onClick={() => {
                      // Add common tournament sections with typical prizes
                      const commonSections: PrizeSection[] = [
                        {
                          name: 'Open',
                          prizes: [
                            { name: '1st Place', type: 'cash' as const, position: 1, amount: 100, description: 'Open Section Champion' },
                            { name: '2nd Place', type: 'cash' as const, position: 2, amount: 75, description: 'Open Section Runner-up' },
                            { name: '3rd Place', type: 'cash' as const, position: 3, amount: 50, description: 'Open Section Third Place' }
                          ]
                        },
                        {
                          name: 'U1600',
                          prizes: [
                            { name: 'U1600 1st Place', type: 'cash' as const, ratingCategory: 'Under 1600', position: 1, amount: 50, description: 'Top U1600 Player' },
                            { name: 'U1600 2nd Place', type: 'trophy' as const, ratingCategory: 'Under 1600', position: 2, description: 'U1600 Runner-up Trophy' }
                          ]
                        },
                        {
                          name: 'U1200',
                          prizes: [
                            { name: 'U1200 1st Place', type: 'cash' as const, ratingCategory: 'Under 1200', position: 1, amount: 25, description: 'Top U1200 Player' },
                            { name: 'U1200 2nd Place', type: 'medal' as const, ratingCategory: 'Under 1200', position: 2, description: 'U1200 Runner-up Medal' }
                          ]
                        }
                      ];
                      
                      setSettings(prev => ({
                        ...prev,
                        sections: [...prev.sections, ...commonSections]
                      }));
                    }}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Add Common Sections
                  </button>
                </div>
              </div>

              {settings.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => updateSection(sectionIndex, { ...section, name: e.target.value })}
                      placeholder="Section name (e.g., Open, U1600, U1200)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mr-4"
                    />
                    <button
                      onClick={() => removeSection(sectionIndex)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Prizes for {section.name || 'this section'}</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => addPrize(sectionIndex)}
                            className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Prize
                          </button>
                          <div className="relative group">
                            <button className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                              <Award className="w-3 h-3 mr-1" />
                              Rating Prizes
                            </button>
                            <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                              <div className="p-2">
                                <div className="text-xs font-medium text-gray-600 mb-2">Quick Add Rating-Based Prizes:</div>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  {commonRatingCategories.slice(0, 8).map((category) => (
                                    <button
                                      key={category}
                                      onClick={() => addRatingBasedPrize(sectionIndex, category)}
                                      className="px-2 py-1 text-left hover:bg-gray-100 rounded"
                                    >
                                      {category}
                                    </button>
                                  ))}
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-xs font-medium text-gray-600 mb-1">USCF Classes:</div>
                                  <div className="grid grid-cols-1 gap-1 text-xs">
                                    {commonRatingCategories.slice(8).map((category) => (
                                      <button
                                        key={category}
                                        onClick={() => addRatingBasedPrize(sectionIndex, category)}
                                        className="px-2 py-1 text-left hover:bg-gray-100 rounded"
                                      >
                                        {category}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                    {section.prizes.map((prize, prizeIndex) => (
                      <div key={prizeIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          {getPrizeIcon(prize.type)}
                          <span className="text-sm font-medium">
                            {prize.ratingCategory ? prize.ratingCategory : `${prize.position}${getOrdinalSuffix(prize.position || 1)} Place`}
                          </span>
                        </div>

                        <input
                          type="text"
                          value={prize.name}
                          onChange={(e) => updatePrize(sectionIndex, prizeIndex, { ...prize, name: e.target.value })}
                          placeholder="Prize name"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />

                        <input
                          type="text"
                          value={prize.description || ''}
                          onChange={(e) => updatePrize(sectionIndex, prizeIndex, { ...prize, description: e.target.value })}
                          placeholder="Description (optional)"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />

                        <select
                          value={prize.type}
                          onChange={(e) => updatePrize(sectionIndex, prizeIndex, { ...prize, type: e.target.value as any })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="cash">Cash</option>
                          <option value="trophy">Trophy</option>
                          <option value="medal">Medal</option>
                          <option value="plaque">Plaque</option>
                        </select>

                        {prize.type === 'cash' && (
                          <input
                            type="number"
                            value={prize.amount || 0}
                            onChange={(e) => updatePrize(sectionIndex, prizeIndex, { ...prize, amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Amount"
                            min="0"
                            step="0.01"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}

                        {!prize.ratingCategory && (
                          <input
                            type="number"
                            value={prize.position || 1}
                            onChange={(e) => updatePrize(sectionIndex, prizeIndex, { ...prize, position: parseInt(e.target.value) || 1 })}
                            placeholder="Position"
                            min="1"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )}
                        
                        <select
                          value={prize.ratingCategory || ''}
                          onChange={(e) => updatePrize(sectionIndex, prizeIndex, { 
                            ...prize, 
                            ratingCategory: e.target.value || undefined,
                            position: e.target.value ? undefined : prize.position
                          })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Position-based</option>
                          {commonRatingCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => removePrize(sectionIndex, prizeIndex)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {section.prizes.length === 0 && (
                      <div className="text-gray-500 text-center py-4 text-sm">
                        No prizes configured for this section. Click "Add Prize" to get started.
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {settings.sections.length === 0 && (
                <div className="text-gray-500 text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No prize sections configured yet. Click "Add Section" to get started.</p>
                </div>
              )}
            </div>
          )}

          {!settings.enabled && (
            <div className="text-gray-500 text-center py-8">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Enable prizes to configure prize sections and awards.</p>
            </div>
          )}

          {/* Help Information */}
          {settings.enabled && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Chess Tournament Prize Types</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <div><strong>Position Prizes:</strong> Awarded to players based on their final ranking (1st, 2nd, 3rd place)</div>
                <div><strong>Rating Prizes:</strong> Awarded to top performers within specific rating categories:</div>
                <div className="ml-4 space-y-1">
                  <div>• <strong>Under Prizes:</strong> "Under 1600", "Under 1200" - open to all players below the rating</div>
                  <div>• <strong>USCF Classes:</strong> "Class A (1800-1999)", "Class B (1600-1799)", etc.</div>
                  <div>• <strong>Unrated:</strong> For players without an official rating</div>
                </div>
                <div><strong>Prize Types:</strong> Cash, Trophies, Medals, or Plaques</div>
                <div><strong>Auto-Assignment:</strong> Prizes are automatically calculated and assigned when the tournament completes</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrizeConfigurationModal;


