import React, { useState, useEffect } from 'react';
import { Trophy, DollarSign, Medal, Award, Users, Star, Plus, Zap } from 'lucide-react';
import { tournamentApi } from '../services/api';
import PrizeAssignmentModal from './PrizeAssignmentModal';

interface PrizeDistribution {
  id: string;
  player_id: string;
  player_name: string;
  prize_name: string;
  prize_type: 'cash' | 'trophy' | 'medal' | 'plaque';
  amount?: number;
  position?: number;
  section?: string;
  tie_group?: number;
  rating_category?: string;
}

interface PrizeDisplayProps {
  tournamentId: string;
  showPrizeSettings?: boolean;
  onPrizeSettingsClick?: () => void;
}

const PrizeDisplay: React.FC<PrizeDisplayProps> = ({
  tournamentId,
  showPrizeSettings = true,
  onPrizeSettingsClick
}) => {
  const [prizeDistributions, setPrizeDistributions] = useState<PrizeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'section' | 'type' | 'position'>('section');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedSectionForModal, setSelectedSectionForModal] = useState<string | undefined>(undefined);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  useEffect(() => {
    fetchPrizeDistributions();
    fetchAvailableSections();
  }, [tournamentId]);

  const fetchAvailableSections = async () => {
    try {
      const response = await tournamentApi.getSections(tournamentId);
      if (response.data.success) {
        setAvailableSections(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const handleAutoAssign = async () => {
    if (!window.confirm('This will automatically calculate and assign prizes based on current standings. Continue?')) {
      return;
    }

    try {
      setAutoAssigning(true);
      const response = await tournamentApi.calculatePrizes(tournamentId);
      if (response.data.success) {
        alert(`Successfully auto-assigned ${response.data.data.length} prizes!`);
        await fetchPrizeDistributions();
      } else {
        alert('Failed to auto-assign prizes: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error auto-assigning prizes:', error);
      alert('Failed to auto-assign prizes: ' + (error.message || 'Unknown error'));
    } finally {
      setAutoAssigning(false);
    }
  };

  const fetchPrizeDistributions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tournamentApi.getPrizes(tournamentId);
      if (response.data.success) {
        setPrizeDistributions(response.data.data);
      } else {
        setError('Failed to fetch prize distributions');
      }
    } catch (error) {
      console.error('Error fetching prize distributions:', error);
      setError('Failed to fetch prize distributions');
    } finally {
      setLoading(false);
    }
  };

  const handlePrizeAssigned = () => {
    fetchPrizeDistributions();
  };

  const getPrizeIcon = (type: string) => {
    switch (type) {
      case 'cash': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'trophy': return <Trophy className="w-4 h-4 text-yellow-600" />;
      case 'medal': return <Medal className="w-4 h-4 text-blue-600" />;
      case 'plaque': return <Award className="w-4 h-4 text-purple-600" />;
      default: return <Award className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPrizeTypeColor = (type: string) => {
    switch (type) {
      case 'cash': return 'bg-green-100 text-green-800 border-green-200';
      case 'trophy': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'plaque': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const groupDistributions = (distributions: PrizeDistribution[]) => {
    switch (groupBy) {
      case 'section':
        return distributions.reduce((groups, dist) => {
          const section = dist.section || 'Open';
          if (!groups[section]) groups[section] = [];
          groups[section].push(dist);
          return groups;
        }, {} as Record<string, PrizeDistribution[]>);
      
      case 'type':
        return distributions.reduce((groups, dist) => {
          if (!groups[dist.prize_type]) groups[dist.prize_type] = [];
          groups[dist.prize_type].push(dist);
          return groups;
        }, {} as Record<string, PrizeDistribution[]>);
      
      case 'position':
        return distributions.reduce((groups, dist) => {
          const position = dist.position || 'Other';
          if (!groups[position]) groups[position] = [];
          groups[position].push(dist);
          return groups;
        }, {} as Record<string, PrizeDistribution[]>);
      
      default:
        return { 'All': distributions };
    }
  };

  const getTotalPrizeValue = () => {
    return prizeDistributions
      .filter(dist => dist.prize_type === 'cash' && dist.amount)
      .reduce((total, dist) => total + (dist.amount || 0), 0);
  };

  const getPrizeCounts = () => {
    const counts = { cash: 0, trophy: 0, medal: 0, plaque: 0 };
    prizeDistributions.forEach(dist => {
      counts[dist.prize_type] = (counts[dist.prize_type] || 0) + 1;
    });
    return counts;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading prize distributions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <Award className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium">Error Loading Prizes</p>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPrizeDistributions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (prizeDistributions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Prizes Awarded Yet</h3>
          <p className="text-gray-600 mb-4">
            Prizes will be automatically calculated and distributed when the tournament is completed.
          </p>
          {showPrizeSettings && onPrizeSettingsClick && (
            <button
              onClick={onPrizeSettingsClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Configure Prizes
            </button>
          )}
        </div>
      </div>
    );
  }

  const groupedDistributions = groupDistributions(prizeDistributions);
  const totalValue = getTotalPrizeValue();
  const prizeCounts = getPrizeCounts();

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Prize Distributions</h3>
            <p className="text-sm text-gray-600">
              {prizeDistributions.length} prizes distributed across {Object.keys(groupedDistributions).length} {groupBy === 'section' ? 'sections' : groupBy === 'type' ? 'prize types' : 'positions'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              ✓ US Chess Rules Compliant - Automatic prize pooling for tied players with Rule 32B3 cap enforcement
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium"
            >
              {autoAssigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Auto-Assigning...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Auto-Assign Prizes</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSelectedSectionForModal(undefined);
                setShowAssignmentModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Assign</span>
            </button>
            {totalValue > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">${totalValue.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Total Prize Value</div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{prizeCounts.trophy}</span>
              <DollarSign className="w-4 h-4 text-green-500 ml-2" />
              <span className="text-sm font-medium">{prizeCounts.cash}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grouping Controls */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Group by:</span>
          <div className="flex space-x-2">
            {[
              { value: 'section', label: 'Section' },
              { value: 'type', label: 'Prize Type' },
              { value: 'position', label: 'Position' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setGroupBy(option.value as any)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  groupBy === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prize Distributions */}
      <div className="p-6">
        <div className="space-y-6">
          {Object.entries(groupedDistributions).map(([group, distributions]) => (
            <div key={group} className="border border-gray-200 rounded-lg">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-gray-900 capitalize">
                  {group} ({distributions.length} prizes)
                </h4>
              </div>
              <div className="divide-y divide-gray-200">
                {distributions.map((distribution, index) => (
                  <div key={distribution.id || index} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getPrizeIcon(distribution.prize_type)}
                      <div>
                        <div className="font-medium text-gray-900">{distribution.player_name}</div>
                        <div className="text-sm text-gray-600">{distribution.prize_name}</div>
                        {distribution.rating_category && (
                          <div className="text-xs text-blue-600 font-medium">
                            {distribution.rating_category}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {distribution.amount && (
                        <div className="text-lg font-bold text-green-600">
                          ${distribution.amount.toFixed(2)}
                        </div>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPrizeTypeColor(distribution.prize_type)}`}>
                        {distribution.prize_type}
                      </span>
                      {distribution.position && (
                        <span className="text-sm text-gray-500">
                          #{distribution.position}
                        </span>
                      )}
                      {distribution.tie_group && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Tied (Pooled)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section-specific Prize Assignment Buttons */}
      {availableSections.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Assign by Section:</span>
            <div className="flex flex-wrap gap-2">
              {availableSections.map(sectionName => (
                <button
                  key={sectionName}
                  onClick={() => {
                    setSelectedSectionForModal(sectionName);
                    setShowAssignmentModal(true);
                  }}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium border border-blue-200"
                >
                  {sectionName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prize Assignment Modal */}
      <PrizeAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setSelectedSectionForModal(undefined);
        }}
        tournamentId={tournamentId}
        onAssign={handlePrizeAssigned}
        section={selectedSectionForModal}
      />
    </div>
  );
};

export default PrizeDisplay;
