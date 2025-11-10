import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Edit, Save, Users, ArrowRight } from 'lucide-react';
import { Section, Player } from '../types';
import { tournamentApi } from '../services/api';

interface SectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  players: Player[];
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => Promise<void>;
  tournamentSettings?: any;
  onUpdateTournamentSettings?: (settings: any) => Promise<void>;
  onAfterMerge?: (details: {
    sourceSection: string;
    targetSection: string;
    stats: Record<string, any>;
  }) => Promise<void> | void;
}

const SectionsModal: React.FC<SectionsModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  players,
  onUpdatePlayer,
  tournamentSettings,
  onUpdateTournamentSettings,
  onAfterMerge
}) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newSection, setNewSection] = useState<Partial<Section>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [playerSectionAssignments, setPlayerSectionAssignments] = useState<{ [playerId: string]: string }>({});
  const [mergingSection, setMergingSection] = useState<string | null>(null);
  const [targetSection, setTargetSection] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);
  const [settingsState, setSettingsState] = useState<any>({});

  const normalizeSections = useCallback((rawSections: any): Section[] => {
    if (!rawSections && rawSections !== 0) {
      return [];
    }

    let parsedSections: any = rawSections;
    if (typeof rawSections === 'string') {
      try {
        parsedSections = JSON.parse(rawSections);
      } catch (error) {
        console.error('Failed to parse sections JSON:', error);
        parsedSections = [];
      }
    }

    if (!Array.isArray(parsedSections)) {
      return [];
    }

    return parsedSections
      .map((section) => {
        if (!section && section !== 0) {
          return null;
        }

        if (typeof section === 'string') {
          const name = section.trim();
          return name ? { name } : null;
        }

        const nameCandidate = section.name || section.title || section.label;
        if (!nameCandidate) {
          return null;
        }

        const normalized: Section = {
          name: nameCandidate.toString().trim()
        };

        if (section.min_rating !== undefined && section.min_rating !== null && section.min_rating !== '') {
          const min = Number(section.min_rating);
          if (!Number.isNaN(min)) {
            normalized.min_rating = min;
          }
        }

        if (section.max_rating !== undefined && section.max_rating !== null && section.max_rating !== '') {
          const max = Number(section.max_rating);
          if (!Number.isNaN(max)) {
            normalized.max_rating = max;
          }
        }

        if (section.description) {
          normalized.description = section.description.toString();
        }

        return normalized;
      })
      .filter((section): section is Section => Boolean(section && section.name));
  }, []);

  useEffect(() => {
    if (isOpen) {
      let parsedSettings: any = {};
      if (tournamentSettings) {
        if (typeof tournamentSettings === 'string') {
          try {
            parsedSettings = JSON.parse(tournamentSettings) || {};
          } catch (error) {
            console.error('Failed to parse tournament settings string:', error);
            parsedSettings = {};
          }
        } else {
          parsedSettings = { ...tournamentSettings };
        }
      }

      let existingSections = normalizeSections(parsedSettings?.sections);

      if (existingSections.length === 0) {
        const derivedSectionNames = Array.from(
          new Set(
            players
              .map(player => (player.section || '').trim())
              .filter(name => name && name.length > 0 && name.toLowerCase() !== 'open')
          )
        );

        if (derivedSectionNames.length > 0) {
          existingSections = derivedSectionNames.map(name => ({ name }));
        }
      }

      const sortedSections = [...existingSections].sort((a, b) => a.name.localeCompare(b.name));
      const nextSettingsState = {
        ...parsedSettings,
        sections: sortedSections
      };
      setSettingsState(nextSettingsState);
      setSections(sortedSections);
      
      // Initialize player section assignments
      const assignments: { [playerId: string]: string } = {};
      players.forEach(player => {
        assignments[player.id] = player.section || 'Open';
      });
      setPlayerSectionAssignments(assignments);
    }
  }, [isOpen, tournamentSettings, players, normalizeSections]);

  const handleAddSection = async () => {
    if (!newSection.name?.trim()) return;

    const section: Section = {
      name: newSection.name.trim(),
      min_rating: newSection.min_rating || undefined,
      max_rating: newSection.max_rating || undefined,
      description: newSection.description || undefined
    };

    const updatedSections = [...sections, section];
    setSections(updatedSections);
    setNewSection({});
    setIsAdding(false);

    // Update tournament settings if callback provided
    if (onUpdateTournamentSettings) {
      const baseSettings = settingsState && typeof settingsState === 'object' ? settingsState : {};
      const updatedSettings = {
        ...baseSettings,
        sections: updatedSections
      };
      await onUpdateTournamentSettings(updatedSettings);
      setSettingsState(updatedSettings);
    }
  };

  const handleUpdateSection = async (index: number, updatedSection: Section) => {
    const updatedSections = [...sections];
    updatedSections[index] = updatedSection;
    setSections(updatedSections);
    setEditingSection(null);

    // Update tournament settings if callback provided
    if (onUpdateTournamentSettings) {
      const baseSettings = settingsState && typeof settingsState === 'object' ? settingsState : {};
      const updatedSettings = {
        ...baseSettings,
        sections: updatedSections
      };
      await onUpdateTournamentSettings(updatedSettings);
      setSettingsState(updatedSettings);
    }
  };

  const handleDeleteSection = async (index: number) => {
    const sectionToDelete = sections[index];
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`Are you sure you want to delete the "${sectionToDelete.name}" section? Players in this section will be moved to "Open".`)) {
      const updatedSections = sections.filter((_, i) => i !== index);
      setSections(updatedSections);

      // Move players from deleted section to Open
      const playersToUpdate = players.filter(p => p.section === sectionToDelete.name);
      for (const player of playersToUpdate) {
        await onUpdatePlayer(player.id, { section: 'Open' });
      }

      // Update player assignments state
      const updatedAssignments = { ...playerSectionAssignments };
      playersToUpdate.forEach(player => {
        updatedAssignments[player.id] = 'Open';
      });
      setPlayerSectionAssignments(updatedAssignments);

      // Update tournament settings if callback provided
      if (onUpdateTournamentSettings) {
        const baseSettings = settingsState && typeof settingsState === 'object' ? settingsState : {};
        const updatedSettings = {
          ...baseSettings,
          sections: updatedSections
        };
        await onUpdateTournamentSettings(updatedSettings);
        setSettingsState(updatedSettings);
      }
    }
  };

  const handlePlayerSectionChange = async (playerId: string, sectionName: string) => {
    await onUpdatePlayer(playerId, { section: sectionName });
    setPlayerSectionAssignments(prev => ({
      ...prev,
      [playerId]: sectionName
    }));
  };

  const getPlayersInSection = (sectionName: string) => {
    return players.filter(p => (p.section || 'Open') === sectionName);
  };

  const getAvailableSections = () => {
    return ['Open', ...sections.map(s => s.name)];
  };

  const handleMergeSections = async () => {
    if (!mergingSection || !targetSection) {
      alert('Please select both source and target sections');
      return;
    }

    if (mergingSection === targetSection) {
      alert('Source and target sections must be different');
      return;
    }

    if (!window.confirm(
      `Are you sure you want to merge "${mergingSection}" into "${targetSection}"?\n\n` +
      `This will move all players and pairings from "${mergingSection}" to "${targetSection}".\n\n` +
      `Players: ${getPlayersInSection(mergingSection).length} → ${targetSection}\n\n` +
      `This action cannot be undone.`
    )) {
      return;
    }

    try {
      setIsMerging(true);
      const response = await tournamentApi.mergeSections(
        tournamentId,
        mergingSection,
        targetSection,
        true // Remove source section
      );

      if (response.data.success) {
        const mergeData = response.data.data || {};
        const summaryLines: string[] = [];
        if (typeof mergeData.playersUpdated === 'number') {
          summaryLines.push(`Players moved: ${mergeData.playersUpdated}`);
        }
        if (typeof mergeData.pairingsUpdated === 'number') {
          summaryLines.push(`Pairings re-tagged: ${mergeData.pairingsUpdated}`);
        }
        if (typeof mergeData.registrationsUpdated === 'number') {
          summaryLines.push(`Registrations updated: ${mergeData.registrationsUpdated}`);
        }
        if (typeof mergeData.teamsUpdated === 'number') {
          summaryLines.push(`Teams updated: ${mergeData.teamsUpdated}`);
        }
        if (typeof mergeData.prizesUpdated === 'number') {
          summaryLines.push(`Prize definitions updated: ${mergeData.prizesUpdated}`);
        }
        if (typeof mergeData.prizeDistributionsUpdated === 'number') {
          summaryLines.push(`Prize awards updated: ${mergeData.prizeDistributionsUpdated}`);
        }
        if (typeof mergeData.sourceSectionRemoved === 'boolean') {
          summaryLines.push(
            `Source section removed from settings: ${mergeData.sourceSectionRemoved ? 'Yes' : 'No'}`
          );
        }

        const summaryMessage = summaryLines.length
          ? `${response.data.message}\n\n${summaryLines.join('\n')}`
          : response.data.message;

        alert(summaryMessage);
        
        // Reload sections
        const updatedSections = sections.filter(s => s.name !== mergingSection);
        setSections(updatedSections);
        
        // Update tournament settings
        if (onUpdateTournamentSettings) {
          const baseSettings = settingsState && typeof settingsState === 'object' ? settingsState : {};
          const updatedSettings = {
            ...baseSettings,
            sections: updatedSections
          };
          await onUpdateTournamentSettings(updatedSettings);
          setSettingsState(updatedSettings);
        }
        
        // Move players in state
        const updatedAssignments = { ...playerSectionAssignments };
        Object.keys(updatedAssignments).forEach(playerId => {
          if (updatedAssignments[playerId] === mergingSection) {
            updatedAssignments[playerId] = targetSection;
          }
        });
        setPlayerSectionAssignments(updatedAssignments);
        
        // Notify parent so it can refresh players/pairings/standings
        if (onAfterMerge) {
          try {
            await onAfterMerge({
              sourceSection: mergingSection,
              targetSection,
              stats: mergeData
            });
          } catch (callbackError) {
            console.error('onAfterMerge callback failed:', callbackError);
          }
        }

        // Close merge modal
        setMergingSection(null);
        setTargetSection('');
      } else {
        throw new Error(response.data.error || 'Failed to merge sections');
      }
    } catch (error: any) {
      console.error('Failed to merge sections:', error);
      alert(`Failed to merge sections: ${error.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Manage Sections</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sections Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Sections</h3>
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center space-x-2 bg-chess-board text-white px-3 py-2 rounded-lg hover:bg-chess-dark transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Section</span>
                </button>
              </div>

              {/* Add New Section */}
              {isAdding && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Add New Section</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section Name *
                      </label>
                      <input
                        type="text"
                        value={newSection.name || ''}
                        onChange={(e) => setNewSection(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                        placeholder="e.g., U1600, Open, Reserve"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Rating
                        </label>
                        <input
                          type="number"
                          value={newSection.min_rating || ''}
                          onChange={(e) => setNewSection(prev => ({ ...prev, min_rating: e.target.value ? parseInt(e.target.value) : undefined }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                          placeholder="e.g., 1200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Rating
                        </label>
                        <input
                          type="number"
                          value={newSection.max_rating || ''}
                          onChange={(e) => setNewSection(prev => ({ ...prev, max_rating: e.target.value ? parseInt(e.target.value) : undefined }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                          placeholder="e.g., 1599"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={newSection.description || ''}
                        onChange={(e) => setNewSection(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddSection}
                        className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setNewSection({});
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Sections */}
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    {editingSection === section.name ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          defaultValue={section.name}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board font-medium"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            defaultValue={section.min_rating || ''}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                            placeholder="Min Rating"
                          />
                          <input
                            type="number"
                            defaultValue={section.max_rating || ''}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                            placeholder="Max Rating"
                          />
                        </div>
                        <input
                          type="text"
                          defaultValue={section.description || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                          placeholder="Description"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingSection(null)}
                            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingSection(null)}
                            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{section.name}</h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setMergingSection(section.name);
                                setTargetSection('');
                              }}
                              className="text-purple-600 hover:text-purple-800"
                              title="Merge section"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingSection(section.name)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {section.min_rating && section.max_rating && (
                            <p>Rating Range: {section.min_rating} - {section.max_rating}</p>
                          )}
                          {section.description && <p>{section.description}</p>}
                          <p className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {getPlayersInSection(section.name).length} players
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Player Section Assignments */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Player Assignments</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {players.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{player.name}</p>
                      <p className="text-sm text-gray-600">
                        {player.rating ? `Rating: ${player.rating}` : 'Unrated'}
                      </p>
                    </div>
                    <select
                      value={playerSectionAssignments[player.id] || 'Open'}
                      onChange={(e) => handlePlayerSectionChange(player.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                    >
                      {getAvailableSections().map(sectionName => (
                        <option key={sectionName} value={sectionName}>
                          {sectionName}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Merge Section Modal */}
      {mergingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Merge Sections</h3>
              <p className="text-sm text-gray-600 mb-4">
                Merge <strong>{mergingSection}</strong> into another section. This will move all players and pairings from <strong>{mergingSection}</strong> to the target section.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Section
                </label>
                <select
                  value={targetSection}
                  onChange={(e) => setTargetSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board"
                >
                  <option value="">Select a target section...</option>
                  {getAvailableSections()
                    .filter(s => s !== mergingSection)
                    .map(sectionName => (
                      <option key={sectionName} value={sectionName}>
                        {sectionName} ({getPlayersInSection(sectionName).length} players)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setMergingSection(null);
                    setTargetSection('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isMerging}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMergeSections}
                  disabled={!targetSection || isMerging}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMerging ? 'Merging...' : 'Merge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionsModal;
