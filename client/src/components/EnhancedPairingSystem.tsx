import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  History, 
  Palette, 
  CheckCircle, 
  AlertTriangle, 
  Edit3, 
  Eye,
  Download,
  QrCode,
  Clock,
  Target,
  ExternalLink
} from 'lucide-react';
import { Pairing, PairingHistory, ColorPreference, PairingValidation } from '../types';
import EnhancedPairingGenerator from './EnhancedPairingGenerator';

interface EnhancedPairingSystemProps {
  tournament: any;
  players: any[];
  pairings: Pairing[];
  currentRound: number;
  onRoundChange: (round: number) => void;
  onPairingsUpdate: (newPairings: Pairing[]) => void;
  onCompleteRound: () => void;
  onResetPairings: () => void;
  onPrint: () => void;
  selectedSection: string;
  onSectionChange: (section: string) => void;
  availableSections: string[];
  displayOptions: any;
  onDisplayOptionsChange: (options: any) => void;
  pairingType: 'standard' | 'accelerated';
  onPairingTypeChange: (type: 'standard' | 'accelerated') => void;
  pairingValidation: {warnings: string[], errors: string[]} | null;
  isLoading: boolean;
  onManualOverride?: (pairingId: string, newWhiteId: string, newBlackId: string, reason: string) => void;
  onGeneratePairings?: () => void;
  onGeneratePairingsForSection?: (sectionName: string) => void;
  onResetPairingsForSection?: (sectionName: string) => void;
  onUpdateResult?: (pairingId: string, result: string) => void;
}

const EnhancedPairingSystem: React.FC<EnhancedPairingSystemProps> = ({
  tournament,
  players,
  pairings,
  currentRound,
  onRoundChange,
  onPairingsUpdate,
  onCompleteRound,
  onResetPairings,
  onPrint,
  selectedSection,
  onSectionChange,
  availableSections,
  displayOptions,
  onDisplayOptionsChange,
  pairingType,
  onPairingTypeChange,
  pairingValidation,
  isLoading,
  onManualOverride,
  onGeneratePairings,
  onGeneratePairingsForSection,
  onResetPairingsForSection,
  onUpdateResult,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pairings' | 'history' | 'preferences' | 'validation' | 'generator'>('pairings');
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [selectedPairing, setSelectedPairing] = useState<Pairing | null>(null);
  const [pairingHistory, setPairingHistory] = useState<PairingHistory[]>([]);
  const [colorPreferences, setColorPreferences] = useState<ColorPreference[]>([]);
  const [validation, setValidation] = useState<PairingValidation | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    loadPairingHistory();
    loadColorPreferences();
    validatePairings();
  }, [pairings]);

  const loadPairingHistory = async () => {
    // Load pairing history for visualization
    // This would typically make an API call
    setPairingHistory([]);
  };

  const loadColorPreferences = async () => {
    // Load color preferences
    // This would typically make an API call
    setColorPreferences([]);
  };

  const validatePairings = async () => {
    // Validate current pairings
    // This would typically make an API call
    setValidation({
      is_valid: true,
      warnings: [],
      errors: [],
      repeat_pairings: [],
      color_imbalances: [],
      rating_differences: []
    });
  };

  const updateResult = async (pairingId: string, result: string) => {
    try {
      if (onUpdateResult) {
        await onUpdateResult(pairingId, result);
      } else if (onPairingsUpdate) {
        // Fallback to local state update if no API function provided
        const updatedPairings = pairings.map(p => 
          p.id === pairingId ? { ...p, result } : p
        );
        onPairingsUpdate(updatedPairings);
      }
    } catch (error) {
      console.error('Failed to update result:', error);
    }
  };

  const generatePairingsForSection = async (sectionName: string) => {
    try {
      if (onGeneratePairingsForSection) {
        await onGeneratePairingsForSection(sectionName);
      } else if (onGeneratePairings) {
        // Fallback to generating all pairings if section-specific function not available
        await onGeneratePairings();
      }
    } catch (error: any) {
      console.error('Failed to generate pairings for section:', error);
      
      // Handle prerequisite error with detailed messaging
      if (error.response?.status === 400 && error.response?.data?.error) {
        const errorData = error.response.data;
        if (errorData.section && errorData.previousRound && errorData.incompleteCount !== undefined) {
          // Show detailed error about this specific section
          alert(`Cannot generate Round ${currentRound} pairings for section "${sectionName}".\n\nRound ${errorData.previousRound} is not complete for this section: ${errorData.incompleteCount} game${errorData.incompleteCount !== 1 ? 's' : ''} still need${errorData.incompleteCount === 1 ? 's' : ''} results.\n\nPlease complete Round ${errorData.previousRound} for section "${sectionName}" before generating Round ${currentRound} pairings.`);
        } else {
          alert(errorData.error);
        }
      } else {
        alert(`Failed to generate pairings for section "${sectionName}". Please check the console for details.`);
      }
    }
  };

  const resetPairingsForSection = async (sectionName: string) => {
    try {
      if (onResetPairingsForSection) {
        await onResetPairingsForSection(sectionName);
      } else if (onResetPairings) {
        // Fallback to resetting all pairings if section-specific function not available
        await onResetPairings();
      }
    } catch (error) {
      console.error('Failed to reset pairings for section:', error);
    }
  };

  const getResultButtonClass = (result: string, currentResult?: string) => {
    const baseClass = "px-3 py-1 text-xs font-medium rounded-md transition-colors";
    const isSelected = currentResult === result;
    
    switch (result) {
      case '1-0':
        return `${baseClass} ${isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`;
      case '0-1':
        return `${baseClass} ${isSelected ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`;
      case '1/2-1/2':
        return `${baseClass} ${isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`;
      case '1-0F':
        return `${baseClass} ${isSelected ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`;
      case '0-1F':
        return `${baseClass} ${isSelected ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`;
      case '1/2-1/2F':
        return `${baseClass} ${isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`;
      default:
        return `${baseClass} ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`;
    }
  };

  // Check if a section is ready for the next round (all pairings have results)
  const isSectionReadyForNextRound = (sectionPairings: Pairing[]) => {
    return sectionPairings.length > 0 && sectionPairings.every(pairing => 
      pairing.result && pairing.result !== 'TBD'
    );
  };

  // Check if any sections are not ready for the next round
  const hasIncompleteSections = () => {
    return Object.values(groupedPairings).some(sectionPairings => 
      sectionPairings.length > 0 && !isSectionReadyForNextRound(sectionPairings)
    );
  };

  // Filter pairings by current round and group by section
  const currentRoundPairings = pairings.filter(pairing => pairing.round === currentRound);
  const groupedPairings = currentRoundPairings.reduce((acc, pairing) => {
    const section = pairing.section || 'Open';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(pairing);
    return acc;
  }, {} as Record<string, Pairing[]>);

  const handleManualOverride = (pairingId: string, newWhiteId: string, newBlackId: string, reason: string) => {
    if (onManualOverride) {
      onManualOverride(pairingId, newWhiteId, newBlackId, reason);
    }
    setShowManualOverride(false);
    setSelectedPairing(null);
  };

  const generateQRCode = async (pairing: Pairing) => {
    // Generate QR code for pairing
    setShowQRCode(true);
  };

  const exportPairings = () => {
    // Export pairings to various formats
    console.log('Exporting pairings...');
  };

  const navigateToSectionPairings = (sectionName: string) => {
    if (tournament?.id) {
      navigate(`/tournaments/${tournament.id}/pairings/${sectionName}`);
    }
  };

  const isAllResultsSubmitted = () => {
    if (pairings.length === 0) return false;
    return pairings.every(pairing => pairing.result && pairing.result !== '');
  };

  const renderPairingsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Round {currentRound} Pairings</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onRoundChange && onRoundChange(currentRound - 1)}
              disabled={currentRound <= 1}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Prev</span>
            </button>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md font-medium">
              Round {currentRound}
            </span>
            <button
              onClick={() => onRoundChange && onRoundChange(currentRound + 1)}
              disabled={currentRound >= (tournament?.total_rounds || 5)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <span>Next</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onResetPairings}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
            title="Reset all pairings for this round"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset</span>
          </button>
          <button
            onClick={exportPairings}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {validation && !validation.is_valid && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Pairing Validation Errors</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {validation && validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Pairing Warnings</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-sm font-medium text-gray-800">Section Navigation</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableSections.filter(section => section !== 'all').map((sectionName) => {
            const sectionPairings = groupedPairings[sectionName] || [];
            const submittedCount = sectionPairings.filter(p => p.result && p.result !== '').length;
            const totalCount = sectionPairings.length;
            const percentage = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
            const isReady = isSectionReadyForNextRound(sectionPairings);
            
            return (
              <div key={sectionName} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{sectionName} Section</h4>
                  <button
                    onClick={() => navigateToSectionPairings(sectionName)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title={`View ${sectionName} section in separate page`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {totalCount} games • Round {currentRound}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isReady ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8">
                    {percentage}%
                  </span>
                </div>
                {isReady && totalCount > 0 && (
                  <div className="mt-2 flex items-center space-x-1 text-green-600 text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>Ready for Round {currentRound + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Progress - Per Section */}
      {Object.keys(groupedPairings).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-800">Results Progress</span>
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(groupedPairings).map(([sectionName, sectionPairings]) => {
              const submittedCount = sectionPairings.filter(p => p.result && p.result !== '').length;
              const totalCount = sectionPairings.length;
              const percentage = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
              
              return (
                <div key={sectionName} className="flex items-center justify-between">
                  <div className="text-sm text-blue-600">
                    {sectionName}: {submittedCount} of {totalCount} results submitted
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-blue-600 w-8">
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-16">
        {Object.keys(groupedPairings).length > 0 ? (
          Object.entries(groupedPairings).map(([sectionName, sectionPairings], index) => (
            <div key={sectionName}>
              {index > 0 && (
                <div className="mb-8 flex items-center">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <div className="px-4 bg-gray-50 text-gray-500 text-sm font-medium rounded-full">
                    SECTION SEPARATOR
                  </div>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
              )}
              <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-white">
                          {sectionName} Section
                        </h3>
                        {isSectionReadyForNextRound(sectionPairings) && (
                          <div className="flex items-center space-x-1 bg-green-500 bg-opacity-20 px-2 py-1 rounded-full">
                            <CheckCircle className="h-4 w-4 text-green-200" />
                            <span className="text-green-200 text-xs font-medium">Ready for Round {currentRound + 1}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-blue-200 text-sm mt-1">
                        {sectionPairings.length} games • Round {currentRound}
                        {!isSectionReadyForNextRound(sectionPairings) && sectionPairings.length > 0 && (
                          <span className="ml-2 text-yellow-200">
                            • {sectionPairings.filter(p => !p.result || p.result === 'TBD').length} incomplete
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigateToSectionPairings(sectionName)}
                        className="px-4 py-2 bg-blue-500 bg-opacity-20 text-white rounded-md hover:bg-opacity-30 flex items-center space-x-2"
                        title={`View ${sectionName} section in separate page`}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View Section</span>
                      </button>
                      <button
                        onClick={() => generatePairingsForSection(sectionName)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => resetPairingsForSection(sectionName)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-500 bg-opacity-20 text-white rounded-md hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    title={`Reset pairings for ${sectionName} section`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Reset</span>
                  </button>
                  {isSectionReadyForNextRound(sectionPairings) && sectionPairings.length > 0 && (
                    <button
                      onClick={() => {
                        // Handle section-specific round completion
                        console.log(`Section ${sectionName} is ready for next round`);
                        if (onCompleteRound) {
                          onCompleteRound();
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
                      title={`${sectionName} section is ready for Round ${currentRound + 1}`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Ready for Round {currentRound + 1}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Pairings Table */}
            <div className="overflow-x-auto">
              {sectionPairings.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Pairings Yet</h4>
                  <p className="text-gray-500 mb-4">
                    Click the "Generate" button above to create pairings for this section.
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Board
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        White Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Black Player
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sectionPairings.map((pairing) => (
                    <tr key={pairing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pairing.board}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{pairing.white_name || 'TBD'}</span>
                          {pairing.white_rating && (
                            <span className="text-xs text-gray-500">({pairing.white_rating})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{pairing.black_name || 'TBD'}</span>
                          {pairing.black_rating && (
                            <span className="text-xs text-gray-500">({pairing.black_rating})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex space-x-1 justify-center">
                          <button
                            onClick={() => updateResult(pairing.id, '1-0')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              pairing.result === '1-0' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title="White wins"
                          >
                            1-0
                          </button>
                          <button
                            onClick={() => updateResult(pairing.id, '0-1')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              pairing.result === '0-1' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                            title="Black wins"
                          >
                            0-1
                          </button>
                          <button
                            onClick={() => updateResult(pairing.id, '1/2-1/2')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              pairing.result === '1/2-1/2' 
                                ? 'bg-yellow-600 text-white' 
                                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            }`}
                            title="Draw"
                          >
                            ½-½
                          </button>
                          <button
                            onClick={() => updateResult(pairing.id, '1-0F')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              pairing.result === '1-0F' 
                                ? 'bg-green-600 text-white' 
                                : 'bg-green-100 text-gray-700 hover:bg-green-200'
                            }`}
                            title="White wins by forfeit"
                          >
                            1-0F
                          </button>
                          <button
                            onClick={() => updateResult(pairing.id, '0-1F')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              pairing.result === '0-1F' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-red-100 text-gray-700 hover:bg-red-200'
                            }`}
                            title="Black wins by forfeit"
                          >
                            0-1F
                          </button>
                          <button
                            onClick={() => updateResult(pairing.id, '1/2-1/2F')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              pairing.result === '1/2-1/2F' 
                                ? 'bg-yellow-600 text-white' 
                                : 'bg-yellow-100 text-gray-700 hover:bg-yellow-200'
                            }`}
                            title="Draw by forfeit"
                          >
                            ½-½F
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPairing(pairing);
                              setShowManualOverride(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Manual Override"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => generateQRCode(pairing)}
                            className="text-green-600 hover:text-green-900"
                            title="Generate QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* View pairing history */}}
                            className="text-purple-600 hover:text-purple-900"
                            title="View History"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              )}
                </div>
              </div>
            </div>
          ))
        ) : (
          availableSections.filter(section => section !== 'all').map((sectionName, index) => (
            <div key={sectionName}>
              {index > 0 && (
                <div className="mb-8 flex items-center">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <div className="px-4 bg-gray-50 text-gray-500 text-sm font-medium rounded-full">
                    SECTION SEPARATOR
                  </div>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>
              )}
              <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-white">
                          {sectionName} Section
                        </h3>
                      </div>
                      <p className="text-blue-200 text-sm mt-1">
                        0 games • Round {currentRound}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigateToSectionPairings(sectionName)}
                        className="px-4 py-2 bg-blue-500 bg-opacity-20 text-white rounded-md hover:bg-opacity-30 flex items-center space-x-2"
                        title={`View ${sectionName} section in separate page`}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View Section</span>
                      </button>
                      <button
                        onClick={() => generatePairingsForSection(sectionName)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-md hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4" />
                            Generate
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => resetPairingsForSection(sectionName)}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-500 bg-opacity-20 text-white rounded-md hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        title={`Reset pairings for ${sectionName} section`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Empty Pairings Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Board
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          White Player
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Black Player
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Result
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">No Pairings Yet</h4>
                          <p className="text-gray-500 mb-4">
                            Click the "Generate" button above to create pairings for this section.
                          </p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
       </div>
      </div>
    );

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pairing History</h3>
      <div className="bg-gray-50 rounded-md p-4">
        <p className="text-sm text-gray-600">
          Visual representation of previous meetings between players.
        </p>
        {/* This would contain a visual graph or table of pairing history */}
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Color Preferences</h3>
      <div className="space-y-2">
        {players.map((player) => (
          <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span className="text-sm font-medium">{player.name}</span>
            <select
              value={colorPreferences.find(cp => cp.player_id === player.id)?.preferred_color || 'either'}
              onChange={(e) => {
                // Update color preference
                console.log('Update color preference for', player.id, e.target.value);
              }}
              className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="either">Either</option>
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  const renderValidationTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pairing Validation</h3>
      {validation && (
        <div className="space-y-4">
          <div className="flex items-center">
            {validation.is_valid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            <span className="ml-2 font-medium">
              {validation.is_valid ? 'Pairings are valid' : 'Pairings have issues'}
            </span>
          </div>

          {validation.repeat_pairings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-red-800">Repeat Pairings</h4>
              <ul className="mt-2 text-sm text-red-700">
                {validation.repeat_pairings.map((repeat, index) => (
                  <li key={index}>{repeat}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.color_imbalances.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-yellow-800">Color Imbalances</h4>
              <ul className="mt-2 text-sm text-yellow-700">
                {validation.color_imbalances.map((imbalance, index) => (
                  <li key={index}>{imbalance}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.rating_differences.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800">Rating Differences</h4>
              <ul className="mt-2 text-sm text-blue-700">
                {validation.rating_differences.map((diff, index) => (
                  <li key={index}>{diff}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          {[
            { id: 'pairings', label: 'Pairings', icon: Users },
            { id: 'generator', label: 'Generator', icon: Settings },
            { id: 'history', label: 'History', icon: History },
            { id: 'preferences', label: 'Color Prefs', icon: Palette },
            { id: 'validation', label: 'Validation', icon: CheckCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'pairings' && renderPairingsTab()}
        {activeTab === 'generator' && (
          <EnhancedPairingGenerator
            tournamentId={tournament?.id}
            round={currentRound}
            onPairingsGenerated={(pairings) => {
              console.log('Generated pairings:', pairings);
              // Handle generated pairings
            }}
            onError={(error) => {
              console.error('Pairing generation error:', error);
              // Handle error
            }}
          />
        )}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'preferences' && renderPreferencesTab()}
        {activeTab === 'validation' && renderValidationTab()}
      </div>

      {/* Manual Override Modal */}
      {showManualOverride && selectedPairing && (
        <ManualOverrideModal
          pairing={selectedPairing}
          players={players}
          onClose={() => {
            setShowManualOverride(false);
            setSelectedPairing(null);
          }}
          onOverride={handleManualOverride}
        />
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <QRCodeModal
          onClose={() => setShowQRCode(false)}
          // QR code data would be passed here
        />
      )}
    </div>
  );
};

// Manual Override Modal Component
const ManualOverrideModal: React.FC<{
  pairing: Pairing;
  players: any[];
  onClose: () => void;
  onOverride: (pairingId: string, newWhiteId: string, newBlackId: string, reason: string) => void;
}> = ({ pairing, players, onClose, onOverride }) => {
  const [newWhiteId, setNewWhiteId] = useState(pairing.white_player_id);
  const [newBlackId, setNewBlackId] = useState(pairing.black_player_id);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWhiteId && newBlackId && reason) {
      onOverride(pairing.id, newWhiteId, newBlackId, reason);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Pairing Override</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">White Player</label>
              <select
                value={newWhiteId}
                onChange={(e) => setNewWhiteId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.rating || 'Unrated'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Black Player</label>
              <select
                value={newBlackId}
                onChange={(e) => setNewBlackId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.rating || 'Unrated'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Reason for override"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Apply Override
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// QR Code Modal Component
const QRCodeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">QR Code</h3>
          <div className="text-center">
            <div className="w-48 h-48 bg-gray-200 mx-auto mb-4 flex items-center justify-center">
              <QrCode className="h-24 w-24 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              QR code for this pairing
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPairingSystem;
