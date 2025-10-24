import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Edit3, 
  Download,
  Printer,
  ExternalLink,
  Settings,
  Cog
} from 'lucide-react';
import { Pairing } from '../types';
import EnhancedPairingGenerator from './EnhancedPairingGenerator';
import AdvancedPairingEditor from './AdvancedPairingEditor';
import BulkPairingOperations from './BulkPairingOperations';
import PairingTemplates from './PairingTemplates';
import { pairingApi, pairingEditorApi } from '../services/api';

interface StreamlinedPairingSystemProps {
  tournament: any;
  players: any[];
  pairings: Pairing[];
  currentRound: number;
  onRoundChange: (round: number) => void;
  onPairingsUpdate: (newPairings: Pairing[]) => void;
  onCompleteRound: (sectionName: string) => void;
  onResetPairings: () => void;
  onPrint: () => void;
  onGeneratePairingsForSection: (sectionName: string) => void;
  onResetPairingsForSection: (sectionName: string) => void;
  onUpdateResult: (pairingId: string, result: string) => void;
  onSectionChange: (sectionName: string) => void;
  availableSections: string[];
  isLoading: boolean;
}

const StreamlinedPairingSystem: React.FC<StreamlinedPairingSystemProps> = ({
  tournament,
  players,
  pairings,
  currentRound,
  onRoundChange,
  onPairingsUpdate,
  onCompleteRound,
  onResetPairings,
  onPrint,
  onGeneratePairingsForSection,
  onResetPairingsForSection,
  onUpdateResult,
  onSectionChange,
  availableSections,
  isLoading
}) => {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState(availableSections[0] || 'Open');
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'pairings' | 'generator' | 'editor' | 'bulk' | 'templates'>('pairings');
  const [roundStatus, setRoundStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Fetch round status from API
  const fetchRoundStatus = async () => {
    if (!tournament?.id) return;
    
    setLoadingStatus(true);
    try {
      const response = await pairingApi.getRoundStatus(tournament.id, currentRound, selectedSection);
      setRoundStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch round status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Fetch round status when round or section changes
  useEffect(() => {
    fetchRoundStatus();
  }, [tournament?.id, currentRound, selectedSection]);

  // Filter pairings by current round and selected section
  console.log('🎯 StreamlinedPairingSystem - Total pairings:', pairings.length);
  console.log('🎯 Current round:', currentRound, 'Selected section:', selectedSection);
  console.log('🎯 All pairings:', pairings);
  const currentRoundPairings = pairings.filter(pairing => 
    pairing.round === currentRound && 
    (pairing.section || 'Open') === selectedSection
  );
  console.log('🎯 Filtered pairings for round', currentRound, ':', currentRoundPairings.length);

  // Group pairings by section
  const groupedPairings = currentRoundPairings.reduce((acc, pairing) => {
    const section = pairing.section || 'Open';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(pairing);
    return acc;
  }, {} as Record<string, Pairing[]>);

  // Check if section is ready for next round
  const isSectionReadyForNextRound = (sectionPairings: Pairing[]) => {
    return sectionPairings.length > 0 && sectionPairings.every(pairing => 
      pairing.result && pairing.result !== 'TBD'
    );
  };

  // Get completion stats - use API data if available, fallback to local calculation
  const getCompletionStats = () => {
    if (roundStatus) {
      return {
        totalPairings: roundStatus.totalPairings,
        completedPairings: roundStatus.completedPairings,
        percentage: roundStatus.completionPercentage,
        isComplete: roundStatus.isComplete,
        canGenerateNextRound: roundStatus.canGenerateNextRound
      };
    }
    
    // Fallback to local calculation
    const totalPairings = currentRoundPairings.length;
    const completedPairings = currentRoundPairings.filter(p => p.result && p.result !== 'TBD').length;
    const percentage = totalPairings > 0 ? Math.round((completedPairings / totalPairings) * 100) : 0;
    return { 
      totalPairings, 
      completedPairings, 
      percentage,
      isComplete: totalPairings > 0 && completedPairings === totalPairings,
      canGenerateNextRound: false
    };
  };

  const stats = getCompletionStats();

  const handleSectionChange = (section: string) => {
    if (section !== 'all') {
      setSelectedSection(section);
      setShowSectionDropdown(false);
      onSectionChange(section);
    }
  };

  // Enhanced result update handler that refreshes round status
  const handleUpdateResult = async (pairingId: string, result: string) => {
    try {
      console.log('🎯 Updating result for pairing:', pairingId, 'result:', result);
      await onUpdateResult(pairingId, result);
      console.log('✅ Result updated successfully');
      
      // Refresh round status after updating result
      setTimeout(() => {
        console.log('🔄 Refreshing round status...');
        fetchRoundStatus();
      }, 500); // Small delay to ensure database is updated
    } catch (error) {
      console.error('❌ Failed to update result:', error);
      alert(`Failed to update result: ${error}`);
    }
  };

  // Test function to verify API connectivity
  const testApiConnection = async () => {
    try {
      console.log('🧪 Testing API connection...');
      const response = await fetch('/api/pairings/tournament/325ebfb8-cb75-42ac-9f0f-1cde9aa940d8/round/2/status');
      const data = await response.json();
      console.log('🧪 API test response:', data);
      alert(`API Test Successful! Round 2 has ${data.totalPairings} pairings.`);
    } catch (error) {
      console.error('🧪 API test failed:', error);
      alert(`API Test Failed: ${error}`);
    }
  };

  const navigateToSectionPairings = (sectionName: string) => {
    if (tournament?.id) {
      navigate(`/tournaments/${tournament.id}/pairings/${sectionName}`);
    }
  };


  const getResultButtonClass = (result: string, currentResult?: string) => {
    const baseClass = "px-2 py-1 text-xs font-medium rounded transition-colors";
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

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('pairings')}
              className={`${
                activeTab === 'pairings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Users className="h-4 w-4 mr-2" />
              Pairings
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`${
                activeTab === 'generator'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Cog className="h-4 w-4 mr-2" />
              Generator
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`${
                activeTab === 'editor'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`${
                activeTab === 'bulk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Ops
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Settings className="h-4 w-4 mr-2" />
              Templates
            </button>
          </nav>
        </div>
      </div>

      {/* Generator Tab Content */}
      {activeTab === 'generator' && (
        <EnhancedPairingGenerator
          tournamentId={tournament?.id}
          round={currentRound}
          section={selectedSection}
          onPairingsGenerated={(pairings) => {
            console.log('Generated pairings:', pairings);
            onPairingsUpdate(pairings);
            setActiveTab('pairings'); // Switch to pairings tab to show results
          }}
          onError={(error: any) => {
            console.error('Pairing generation error:', error);
            const errorMessage = typeof error === 'string' ? error : (error?.message || 'Unknown error');
            alert(`Pairing generation failed: ${errorMessage}`);
          }}
        />
      )}

      {/* Advanced Editor Tab Content */}
      {activeTab === 'editor' && (
        <AdvancedPairingEditor
          pairings={currentRoundPairings}
          players={players}
          onPairingsUpdate={onPairingsUpdate}
          onSave={async (updatedPairings) => {
            try {
              await pairingEditorApi.bulkUpdate(updatedPairings);
              console.log('Pairings saved successfully');
            } catch (error) {
              console.error('Failed to save pairings:', error);
              throw error;
            }
          }}
          tournamentId={tournament?.id}
          round={currentRound}
          section={selectedSection}
          isLoading={isLoading}
        />
      )}

      {/* Bulk Operations Tab Content */}
      {activeTab === 'bulk' && (
        <BulkPairingOperations
          pairings={currentRoundPairings}
          players={players}
          onPairingsUpdate={onPairingsUpdate}
          tournamentId={tournament?.id}
          round={currentRound}
          section={selectedSection}
        />
      )}

      {/* Templates Tab Content */}
      {activeTab === 'templates' && (
        <PairingTemplates
          pairings={currentRoundPairings}
          players={players}
          onPairingsUpdate={onPairingsUpdate}
          onApplyTemplate={async (template) => {
            try {
              // Apply template logic here
              console.log('Applying template:', template);
              // This would call the appropriate pairing generation based on template
              const response = await pairingApi.generate(tournament?.id, currentRound, true);
              if (response.data.success) {
                onPairingsUpdate(response.data.pairings);
                setActiveTab('pairings');
              }
            } catch (error) {
              console.error('Failed to apply template:', error);
              throw error;
            }
          }}
          tournamentId={tournament?.id}
          round={currentRound}
          section={selectedSection}
        />
      )}

      {/* Pairings Tab Content */}
      {activeTab === 'pairings' && (
        <>
          {/* Round Navigation Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Round {currentRound} Pairings
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onRoundChange(currentRound - 1)}
                  disabled={currentRound <= 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Prev</span>
                </button>
                <span className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md">
                  Round {currentRound}
                </span>
                <button
                  onClick={() => onRoundChange(currentRound + 1)}
                  disabled={currentRound >= (tournament?.total_rounds || 5)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <span>Next</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Section Filter */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowSectionDropdown(!showSectionDropdown)}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <span>{selectedSection} Section</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showSectionDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      {availableSections.map(section => (
                        <button
                          key={section}
                          onClick={() => handleSectionChange(section)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            selectedSection === section ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {section} Section
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Information Box */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Independent Section Pairings
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Each section generates pairings independently. You can generate pairings for individual sections or all sections at once.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onPrint}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button
                onClick={onResetPairings}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset</span>
              </button>
              
              {/* Generate Single Section Button */}
              {selectedSection && (
                <button
                  onClick={() => onGeneratePairingsForSection(selectedSection)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      <span>Generate {selectedSection} Section</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Progress Stats */}
            {stats.totalPairings > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{stats.completedPairings}</span> of <span className="font-medium">{stats.totalPairings}</span> completed ({stats.percentage}%)
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {stats.totalPairings > 0 && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${stats.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section Navigation Cards */}
      {selectedSection === 'all' && Object.keys(groupedPairings).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedPairings).map(([sectionName, sectionPairings]) => {
            const sectionStats = {
              total: sectionPairings.length,
              completed: sectionPairings.filter(p => p.result && p.result !== 'TBD').length
            };
            const sectionPercentage = sectionStats.total > 0 ? Math.round((sectionStats.completed / sectionStats.total) * 100) : 0;
            const isReady = isSectionReadyForNextRound(sectionPairings);
            
            return (
              <div key={sectionName} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900">{sectionName} Section</h3>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Independent
                    </span>
                  </div>
                  <button
                    onClick={() => navigateToSectionPairings(sectionName)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="View in separate page"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {sectionStats.total} games • Round {currentRound}
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isReady ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${sectionPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8">{sectionPercentage}%</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onGeneratePairingsForSection(sectionName)}
                    disabled={isLoading}
                    className="flex-1 px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50 transition-colors"
                  >
                    Generate
                  </button>
                  <button
                    onClick={() => onResetPairingsForSection(sectionName)}
                    disabled={isLoading}
                    className="flex-1 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
                {isReady && sectionStats.total > 0 && (
                  <div className="mt-2 flex items-center space-x-1 text-green-600 text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>Ready for Round {currentRound + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pairings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {currentRoundPairings.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Pairings Yet</h4>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {selectedSection === 'all' 
                ? 'Select a section to generate pairings for this round.'
                : `Click "Generate" to create pairings for the ${selectedSection} section.`
              }
            </p>
            {selectedSection !== 'all' && (
              <button
                onClick={() => onGeneratePairingsForSection(selectedSection)}
                disabled={isLoading}
                className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    <span>Generate Pairings</span>
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Board
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    White Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Black Player
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentRoundPairings.map((pairing) => (
                  <tr key={pairing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {pairing.board}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{pairing.white_name || 'TBD'}</span>
                        {pairing.white_rating && (
                          <span className="text-xs text-gray-500">({pairing.white_rating})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{pairing.black_name || 'TBD'}</span>
                        {pairing.black_rating && (
                          <span className="text-xs text-gray-500">({pairing.black_rating})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex space-x-1 justify-center">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            console.log('🔥 BUTTON CLICKED: 1-0 for pairing:', pairing.id);
                            handleUpdateResult(pairing.id, '1-0');
                          }}
                          className={getResultButtonClass('1-0', pairing.result)}
                          title="White wins"
                        >
                          1-0
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            console.log('🔥 BUTTON CLICKED: 0-1 for pairing:', pairing.id);
                            handleUpdateResult(pairing.id, '0-1');
                          }}
                          className={getResultButtonClass('0-1', pairing.result)}
                          title="Black wins"
                        >
                          0-1
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            console.log('🔥 BUTTON CLICKED: 1/2-1/2 for pairing:', pairing.id);
                            handleUpdateResult(pairing.id, '1/2-1/2');
                          }}
                          className={getResultButtonClass('1/2-1/2', pairing.result)}
                          title="Draw"
                        >
                          ½-½
                        </button>
                        <button
                          onClick={() => handleUpdateResult(pairing.id, '1-0F')}
                          className={getResultButtonClass('1-0F', pairing.result)}
                          title="White wins by forfeit"
                        >
                          1-0F
                        </button>
                        <button
                          onClick={() => handleUpdateResult(pairing.id, '0-1F')}
                          className={getResultButtonClass('0-1F', pairing.result)}
                          title="Black wins by forfeit"
                        >
                          0-1F
                        </button>
                        <button
                          onClick={() => handleUpdateResult(pairing.id, '1/2-1/2F')}
                          className={getResultButtonClass('1/2-1/2F', pairing.result)}
                          title="Draw by forfeit"
                        >
                          ½-½F
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pairing.section || 'Open'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Round Button */}
      {stats.isComplete && stats.totalPairings > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">All results submitted!</span>
              {stats.canGenerateNextRound && (
                <span className="text-green-600 text-sm">Ready for Round {currentRound + 1}</span>
              )}
            </div>
            <div className="flex space-x-2">
              {stats.canGenerateNextRound && (
                <button
                  onClick={() => onRoundChange(currentRound + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Go to Round {currentRound + 1}
                </button>
              )}
              <button
                onClick={() => onCompleteRound(selectedSection)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Complete Round {currentRound}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round Status Debug Info */}
        {process.env.NODE_ENV === 'development' && roundStatus && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-xs">
            <h4 className="font-semibold mb-2">Round Status Debug:</h4>
            <pre>{JSON.stringify(roundStatus, null, 2)}</pre>
            <button
              onClick={testApiConnection}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              Test API Connection
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default StreamlinedPairingSystem;
