import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Trophy,
  DollarSign,
  Medal,
  Award,
  Plus,
  Trash2,
  Zap,
  Settings,
  ChevronRight
} from 'lucide-react';
import { tournamentApi } from '../services/api';
import { PrizeConfiguration, PrizeSection, PrizeSettings } from '../types';

interface PrizeManagerDrawerProps {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  currentSettings: PrizeSettings | null;
  onUpdate: (settings: PrizeSettings) => void;
}

const EMPTY_SETTINGS: PrizeSettings = {
  enabled: false,
  autoAssign: false,
  sections: []
};

const cloneSettings = (settings: PrizeSettings | null): PrizeSettings => {
  if (!settings) return { ...EMPTY_SETTINGS, sections: [] };
  const clonedSections = Array.isArray(settings.sections)
    ? settings.sections.map(section => ({
        ...section,
        prizes: Array.isArray(section.prizes)
          ? section.prizes.map(prize => ({ ...prize }))
          : []
      }))
    : [];

  return {
    enabled: Boolean(settings.enabled),
    autoAssign: Boolean(settings.autoAssign),
    sections: clonedSections
  };
};

const PrizeManagerDrawer: React.FC<PrizeManagerDrawerProps> = ({
  open,
  onClose,
  tournamentId,
  currentSettings,
  onUpdate
}) => {
  const [settings, setSettings] = useState<PrizeSettings>(cloneSettings(currentSettings));
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [prizeFund, setPrizeFund] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'success' | 'error' | 'neutral'>('neutral');

  useEffect(() => {
    if (!open) return;
    setSettings(cloneSettings(currentSettings));
    fetchAvailableSections();
  }, [open, currentSettings]);

  useEffect(() => {
    if (!open) {
      setStatusMessage(null);
      setStatusTone('neutral');
    }
  }, [open]);

  const fetchAvailableSections = async () => {
    try {
      const response = await tournamentApi.getSections(tournamentId);
      if (response.data.success) {
        setAvailableSections(response.data.data);
      } else {
        setAvailableSections([]);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setAvailableSections([]);
    }
  };

  const handleSettingToggle = (key: 'enabled' | 'autoAssign') => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setStatusMessage(null);
      await tournamentApi.updatePrizeSettings(tournamentId, settings);
      onUpdate(settings);
      setStatusTone('success');
      setStatusMessage('Prize configuration saved.');
    } catch (error: any) {
      console.error('Error saving prize settings:', error);
      setStatusTone('error');
      setStatusMessage(error?.message || 'Failed to save prize settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!window.confirm('Automatically calculate and assign prizes based on current standings?')) {
      return;
    }
    try {
      setIsCalculating(true);
      const response = await tournamentApi.calculatePrizes(tournamentId);
      if (response.data.success) {
        setStatusTone('success');
        setStatusMessage(`Auto-assigned ${response.data.data.length} prizes.`);
        onUpdate(settings);
      } else {
        setStatusTone('error');
        setStatusMessage(response.data.error || 'Failed to auto-assign prizes.');
      }
    } catch (error: any) {
      console.error('Error calculating prizes:', error);
      setStatusTone('error');
      setStatusMessage(error?.message || 'Failed to auto-assign prizes.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleGenerateStructure = async () => {
    try {
      setIsGeneratingStructure(true);
      const response = await tournamentApi.generatePrizeStructure(tournamentId, prizeFund);
      if (response.data.success) {
        const newSettings = cloneSettings(response.data.data);
        setSettings(newSettings);
        setStatusTone('success');
        setStatusMessage('Standard prize structure generated.');
        onUpdate(newSettings);
      } else {
        setStatusTone('error');
        setStatusMessage('Failed to generate standard prize structure.');
      }
    } catch (error: any) {
      console.error('Error generating prize structure:', error);
      setStatusTone('error');
      setStatusMessage(error?.message || 'Failed to generate prize structure.');
    } finally {
      setIsGeneratingStructure(false);
    }
  };

  const addSection = (sectionName: string) => {
    setSettings(prev => {
      if (prev.sections.find(section => section.name === sectionName)) {
        return prev;
      }
      const newSection: PrizeSection = {
        name: sectionName,
        prizes: []
      };
      return {
        ...prev,
        sections: [...prev.sections, newSection]
      };
    });
  };

  const removeSection = (sectionName: string) => {
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.name !== sectionName)
    }));
  };

  const addPrize = (sectionName: string) => {
    const defaultPrize: PrizeConfiguration = {
      name: 'New Prize',
      type: 'cash',
      amount: 0,
      position: 1,
      description: ''
    };
    setSettings(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.name === sectionName
          ? { ...section, prizes: [...section.prizes, defaultPrize] }
          : section
      )
    }));
  };

  const addBulkPrizes = (sectionName: string, count: number, type: 'cash' | 'trophy' | 'medal' | 'plaque', startPosition: number = 1) => {
    if (count <= 0) return;
    const newPrizes: PrizeConfiguration[] = [];
    for (let i = 0; i < count; i++) {
      const isCash = type === 'cash';
      const position = isCash ? startPosition + i : undefined;
      const suffix = (() => {
        const value = position || 0;
        if (value % 10 === 1 && value !== 11) return 'st';
        if (value % 10 === 2 && value !== 12) return 'nd';
        if (value % 10 === 3 && value !== 13) return 'rd';
        return 'th';
      })();

      newPrizes.push({
        name: isCash ? `${position}${suffix} Place` : `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`,
        type,
        position,
        amount: isCash ? 0 : undefined,
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
              prizes: section.prizes.map((prize, index) =>
                index === prizeIndex ? { ...updatedPrize } : prize
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
              prizes: section.prizes.filter((_, index) => index !== prizeIndex)
            }
          : section
      )
    }));
  };

  const totalCashValue = useMemo(() => {
    return settings.sections.reduce((total, section) => {
      return (
        total +
        section.prizes
          .filter(prize => prize.type === 'cash' && typeof prize.amount === 'number')
          .reduce((subTotal, prize) => subTotal + (prize.amount || 0), 0)
      );
    }, 0);
  }, [settings.sections]);

  const prizeCounts = useMemo(() => {
    return settings.sections.reduce(
      (counts, section) => {
        section.prizes.forEach(prize => {
          counts[prize.type as keyof typeof counts] =
            (counts[prize.type as keyof typeof counts] || 0) + 1;
        });
        return counts;
      },
      { cash: 0, trophy: 0, medal: 0, plaque: 0 }
    );
  }, [settings.sections]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-gray-900/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative ml-auto flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl transition-transform">
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Prize Management
            </p>
            <h2 className="text-2xl font-bold text-gray-900">US Chess Compliant Prizes</h2>
            <p className="text-sm text-gray-600">
              Configure prize structures, auto-assign winners, and stay aligned with Rule 32B3.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close prize manager"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Status</span>
              <Settings className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              {settings.enabled ? 'Active' : 'Disabled'}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {settings.enabled
                ? 'Prizes will be calculated and displayed on public pages.'
                : 'Enable prizes to start configuring payouts.'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Cash Value</span>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-900">
              ${totalCashValue.toFixed(2)}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Automatically enforces “largest single prize” caps when ties occur.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Prize Inventory</span>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="font-semibold">{prizeCounts.cash}</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{prizeCounts.trophy}</span>
              </div>
              <div className="flex items-center gap-1">
                <Medal className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">{prizeCounts.medal}</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="h-4 w-4 text-purple-500" />
                <span className="font-semibold">{prizeCounts.plaque}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Counts include all configured sections.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Global Prize Controls</h3>
                  <p className="text-sm text-gray-600">
                    Toggle automatic assignment and enablement for your event.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm transition hover:border-blue-300 hover:bg-blue-50">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={() => handleSettingToggle('enabled')}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-700">Enable Prizes</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm transition hover:border-blue-300 hover:bg-blue-50">
                    <input
                      type="checkbox"
                      checked={settings.autoAssign}
                      onChange={() => handleSettingToggle('autoAssign')}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-700">Auto Assign After Final Round</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[2fr,1fr]">
                <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                    <Zap className="h-4 w-4" />
                    Quick Actions
                  </h4>
                  <p className="mt-2 text-xs text-blue-800">
                    Generate a baseline structure, then auto-assign once standings are final.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <div className="flex flex-1 items-center rounded-md border border-white bg-white px-3 py-2">
                      <span className="text-sm font-medium text-gray-500">$</span>
                      <input
                        type="number"
                        value={prizeFund}
                        onChange={event => setPrizeFund(parseFloat(event.target.value) || 0)}
                        className="ml-2 w-full border-0 bg-transparent text-sm font-medium text-gray-800 focus:outline-none focus:ring-0"
                        placeholder="Prize fund (optional)"
                        min={0}
                        step={50}
                      />
                    </div>
                    <button
                      onClick={handleGenerateStructure}
                      disabled={isGeneratingStructure}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 md:w-auto"
                    >
                      {isGeneratingStructure ? 'Generating...' : 'Generate Structure'}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleAutoAssign}
                      disabled={isCalculating}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-green-500 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-green-200 disabled:text-green-300 md:w-auto"
                    >
                      {isCalculating ? 'Auto-Assigning...' : 'Auto Assign Now'}
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h4 className="text-sm font-semibold text-gray-800">Available Sections</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    Tap to include or exclude sections from prize calculations.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableSections.length === 0 && (
                      <span className="text-xs text-gray-400">No sections found.</span>
                    )}
                    {availableSections.map(sectionName => {
                      const isActive = settings.sections.some(section => section.name === sectionName);
                      return (
                        <button
                          key={sectionName}
                          onClick={() => (isActive ? removeSection(sectionName) : addSection(sectionName))}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            isActive
                              ? 'border-green-300 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-200 hover:text-blue-700'
                          }`}
                        >
                          {isActive ? '✓' : '+'} {sectionName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              {settings.sections.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                  <Trophy className="mx-auto h-12 w-12 text-gray-300" />
                  <h4 className="mt-4 text-lg font-semibold text-gray-700">
                    No sections selected yet
                  </h4>
                  <p className="mt-2 text-sm text-gray-500">
                    Add a section from “Available Sections” to start configuring prizes.
                  </p>
                </div>
              )}

              {settings.sections.map(section => (
                <div
                  key={section.name}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {section.name} Section
                      </h3>
                      <p className="text-xs text-gray-500">
                        Position prizes automatically pool and enforce second-place caps.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => addPrize(section.name)}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Prize
                      </button>
                      <button
                        onClick={() => {
                          const count = Number(window.prompt('How many trophies?', '3')) || 0;
                          addBulkPrizes(section.name, count, 'trophy');
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-100"
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        Bulk Trophies
                      </button>
                      <button
                        onClick={() => {
                          const count = Number(window.prompt('How many medals?', '5')) || 0;
                          addBulkPrizes(section.name, count, 'medal');
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-blue-400 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        <Medal className="h-3.5 w-3.5" />
                        Bulk Medals
                      </button>
                      <button
                        onClick={() => {
                          const count = Number(window.prompt('How many plaques?', '3')) || 0;
                          addBulkPrizes(section.name, count, 'plaque');
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-purple-400 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                      >
                        <Award className="h-3.5 w-3.5" />
                        Bulk Plaques
                      </button>
                      <button
                        onClick={() => removeSection(section.name)}
                        className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove Section
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {section.prizes.length === 0 && (
                      <div className="px-5 py-6 text-center text-sm text-gray-500">
                        No prizes configured yet for this section.
                      </div>
                    )}

                    {section.prizes.map((prize, index) => (
                      <div key={index} className="px-5 py-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Prize Name
                            </label>
                            <input
                              type="text"
                              value={prize.name || ''}
                              onChange={event =>
                                updatePrize(section.name, index, { ...prize, name: event.target.value })
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="e.g., 1st Place"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Prize Type
                            </label>
                            <select
                              value={prize.type}
                              onChange={event =>
                                updatePrize(section.name, index, {
                                  ...prize,
                                  type: event.target.value as PrizeConfiguration['type']
                                })
                              }
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Amount ($)
                                </label>
                                <input
                                  type="number"
                                  value={prize.amount ?? 0}
                                  min={0}
                                  step={25}
                                  onChange={event =>
                                    updatePrize(section.name, index, {
                                      ...prize,
                                      amount: parseFloat(event.target.value) || 0
                                    })
                                  }
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Position
                                </label>
                                <input
                                  type="number"
                                  value={prize.position ?? 1}
                                  min={1}
                                  onChange={event =>
                                    updatePrize(section.name, index, {
                                      ...prize,
                                      position: parseInt(event.target.value, 10) || 1
                                    })
                                  }
                                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </>
                          )}
                          {prize.type !== 'cash' && (
                            <div className="md:col-span-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Rating Category (optional)
                              </label>
                              <input
                                type="text"
                                value={prize.ratingCategory || ''}
                                onChange={event =>
                                  updatePrize(section.name, index, {
                                    ...prize,
                                    ratingCategory: event.target.value
                                  })
                                }
                                placeholder="e.g., Under 1600"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}
                          <div className="md:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Description
                            </label>
                            <textarea
                              value={prize.description || ''}
                              onChange={event =>
                                updatePrize(section.name, index, {
                                  ...prize,
                                  description: event.target.value
                                })
                              }
                              rows={2}
                              placeholder="Optional details for tournament staff"
                              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => removePrize(section.name, index)}
                            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove Prize
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Trophy className="h-4 w-4" />
                US Chess Compliance Tips
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-blue-800">
                <li>
                  <strong>Rule 32B3:</strong> Tied players split pooled prizes, capped by the largest single prize in the pool.
                </li>
                <li>
                  <strong>One Cash Prize:</strong> Players receive only one cash prize per event. The engine automatically guards against duplicates.
                </li>
                <li>
                  <strong>Announce in Advance:</strong> Publish prize structures before round one to avoid disputes.
                </li>
                <li>
                  <strong>Special Prizes:</strong> Flag rating or special-category awards clearly for players and TD staff.
                </li>
              </ul>
            </section>
          </div>
        </div>

        <footer className="border-t border-gray-200 bg-white px-6 py-4">
          {statusMessage && (
            <div
              className={`mb-3 rounded-md border px-3 py-2 text-sm ${
                statusTone === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : statusTone === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              {statusMessage}
            </div>
          )}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-gray-500">
              Changes are saved to the tournament immediately. Close this drawer to return to standings or continue editing.
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Done
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PrizeManagerDrawer;


