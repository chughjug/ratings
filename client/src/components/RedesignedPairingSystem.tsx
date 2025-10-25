import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  User,
  Award,
  Calendar,
  RefreshCw,
  Eye,
  Edit3,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Activity,
  Info,
  ArrowUpDown,
  Palette,
  Brain,
  Layers,
  Filter,
  Search,
  Download,
  Printer,
  ExternalLink,
  QrCode,
  History,
  Star,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  ArrowRight,
  ArrowLeft,
  Crown,
  Trophy,
  Medal,
  Flame,
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface Pairing {
  id: string;
  white_player_id: string;
  black_player_id: string;
  white_name: string;
  black_name: string;
  white_rating?: number;
  black_rating?: number;
  white_uscf_id?: string;
  black_uscf_id?: string;
  result?: string;
  board: number;
  round: number;
  section: string;
  is_bye?: boolean;
  bye_type?: string;
  color_balance_white?: number;
  color_balance_black?: number;
  previous_meetings?: number;
  rating_difference?: number;
  pairing_quality_score?: number;
  pairing_reason?: string;
  created_at?: string;
  updated_at?: string;
}

interface Player {
  id: string;
  name: string;
  rating?: number;
  uscf_id?: string;
  fide_id?: string;
  section: string;
  points: number;
  color_balance: number;
  color_history: string[];
  previous_opponents: string[];
  pairing_preferences?: {
    preferred_color?: 'white' | 'black' | 'either';
    avoid_players?: string[];
    team_members?: string[];
  };
  performance_metrics?: {
    buchholz_score?: number;
    sonneborn_berger?: number;
    performance_rating?: number;
    average_opponent_rating?: number;
  };
}

interface Section {
  name: string;
  players: Player[];
  pairings: Pairing[];
  currentRound: number;
  totalRounds: number;
  isComplete: boolean;
  hasIncompleteResults: boolean;
  canGenerateNext: boolean;
  pairingSystem: 'fide_dutch' | 'burstein' | 'swiss' | 'round_robin' | 'quad';
  colorBalanceStatus: 'balanced' | 'imbalanced' | 'critical';
  pairingQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface PairingSystemProps {
  tournament: any;
  sections: Section[];
  currentRound: number;
  onRoundChange: (round: number) => void;
  onPairingsUpdate: (sectionName: string, pairings: Pairing[]) => void;
  onCompleteRound: (sectionName: string) => void;
  onResetPairings: (sectionName: string) => void;
  onGeneratePairings: (sectionName: string) => void;
  onUpdateResult: (pairingId: string, result: string) => void;
  onManualOverride: (pairingId: string, newWhiteId: string, newBlackId: string, reason: string) => void;
  isLoading: boolean;
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

const RedesignedPairingSystem: React.FC<PairingSystemProps> = ({
  tournament,
  sections,
  currentRound,
  onRoundChange,
  onPairingsUpdate,
  onCompleteRound,
  onResetPairings,
  onGeneratePairings,
  onUpdateResult,
  onManualOverride,
  isLoading,
  selectedSection,
  onSectionChange
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'pairings' | 'analytics' | 'settings'>('overview');
  const [showPairingDetails, setShowPairingDetails] = useState<string | null>(null);
  const [showColorBalance, setShowColorBalance] = useState(false);
  const [showPairingHistory, setShowPairingHistory] = useState(false);
  const [filterByStatus, setFilterByStatus] = useState<'all' | 'completed' | 'pending' | 'byes'>('all');
  const [sortBy, setSortBy] = useState<'board' | 'rating_diff' | 'quality' | 'color_balance'>('board');

  const selectedSectionData = sections.find(s => s.name === selectedSection);

  // Color balance visualization
  const getColorBalanceColor = (balance: number) => {
    if (balance === 0) return 'text-gray-600';
    if (balance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getColorBalanceIcon = (balance: number) => {
    if (balance === 0) return <Minus className="h-3 w-3" />;
    if (balance > 0) return <ArrowUp className="h-3 w-3" />;
    return <ArrowDown className="h-3 w-3" />;
  };

  // Pairing quality indicators
  const getPairingQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPairingQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return <Crown className="h-4 w-4" />;
      case 'good': return <Star className="h-4 w-4" />;
      case 'fair': return <Target className="h-4 w-4" />;
      case 'poor': return <AlertCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  // Section status indicators
  const getSectionStatusColor = (section: Section) => {
    if (section.isComplete) return 'text-green-600 bg-green-100';
    if (section.hasIncompleteResults) return 'text-yellow-600 bg-yellow-100';
    if (section.canGenerateNext) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getSectionStatusIcon = (section: Section) => {
    if (section.isComplete) return <CheckCircle2 className="h-5 w-5" />;
    if (section.hasIncompleteResults) return <Clock className="h-5 w-5" />;
    if (section.canGenerateNext) return <Play className="h-5 w-5" />;
    return <Users className="h-5 w-5" />;
  };

  // Filter and sort pairings
  const getFilteredPairings = (pairings: Pairing[]) => {
    let filtered = pairings;
    
    if (filterByStatus === 'completed') {
      filtered = filtered.filter(p => p.result && p.result !== 'TBD');
    } else if (filterByStatus === 'pending') {
      filtered = filtered.filter(p => !p.result || p.result === 'TBD');
    } else if (filterByStatus === 'byes') {
      filtered = filtered.filter(p => p.is_bye);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating_diff':
          return (b.rating_difference || 0) - (a.rating_difference || 0);
        case 'quality':
          const qualityOrder = { 'excellent': 4, 'good': 3, 'fair': 2, 'poor': 1 };
          const bQuality = typeof b.pairing_quality_score === 'string' ? b.pairing_quality_score : 'fair';
          const aQuality = typeof a.pairing_quality_score === 'string' ? a.pairing_quality_score : 'fair';
          return (qualityOrder[bQuality as keyof typeof qualityOrder] || 0) - 
                 (qualityOrder[aQuality as keyof typeof qualityOrder] || 0);
        case 'color_balance':
          const aBalance = Math.abs(a.color_balance_white || 0) + Math.abs(a.color_balance_black || 0);
          const bBalance = Math.abs(b.color_balance_white || 0) + Math.abs(b.color_balance_black || 0);
          return bBalance - aBalance;
        default:
          return a.board - b.board;
      }
    });
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{tournament?.name}</h1>
            <p className="text-blue-100 mt-1">
              Round {currentRound} of {tournament?.rounds || 5} • {sections.length} sections
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-blue-200">Pairing System</div>
              <div className="font-semibold">
                {selectedSectionData?.pairingSystem?.toUpperCase().replace('_', ' ') || 'FIDE DUTCH'}
              </div>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Brain className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Section Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <div
            key={section.name}
            className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-xl ${
              selectedSection === section.name
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSectionChange(section.name)}
          >
            <div className="p-6">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getSectionStatusColor(section)}`}>
                    {getSectionStatusIcon(section)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.name}</h3>
                    <p className="text-sm text-gray-600">
                      {section.players.length} players • Round {section.currentRound}/{section.totalRounds}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">System</div>
                  <div className="text-sm font-medium text-gray-900">
                    {section.pairingSystem.toUpperCase().replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round((section.currentRound / section.totalRounds) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(section.currentRound / section.totalRounds) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Section Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {section.pairings.filter(p => p.result && p.result !== 'TBD').length}
                  </div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {section.pairings.filter(p => !p.result || p.result === 'TBD').length}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
              </div>

              {/* Quality Indicators */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Palette className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Color Balance:</span>
                  <span className={`font-medium ${
                    section.colorBalanceStatus === 'balanced' ? 'text-green-600' :
                    section.colorBalanceStatus === 'imbalanced' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {section.colorBalanceStatus}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Quality:</span>
                  <span className={`font-medium ${
                    section.pairingQuality === 'excellent' ? 'text-green-600' :
                    section.pairingQuality === 'good' ? 'text-blue-600' :
                    section.pairingQuality === 'fair' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {section.pairingQuality}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex space-x-2">
                {section.hasIncompleteResults && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteRound(section.name);
                    }}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Complete Round
                  </button>
                )}
                
                {section.pairings.length === 0 && section.players.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGeneratePairings(section.name);
                    }}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    disabled={isLoading}
                  >
                    Generate Round 1
                  </button>
                )}
                
                {section.canGenerateNext && !section.isComplete && section.pairings.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGeneratePairings(section.name);
                    }}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    disabled={isLoading}
                  >
                    Next Round
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPairingsTab = () => {
    if (!selectedSectionData) {
      return (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Section</h3>
          <p className="text-gray-600">Choose a section from the overview to view pairings</p>
        </div>
      );
    }

    const filteredPairings = getFilteredPairings(selectedSectionData.pairings);

    return (
      <div className="space-y-6">
        {/* Section Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedSectionData.name} Section</h2>
                  <p className="text-blue-200">
                    Round {currentRound} • {selectedSectionData.pairings.length} pairings • 
                    {selectedSectionData.pairingSystem.toUpperCase().replace('_', ' ')} System
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowColorBalance(!showColorBalance)}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors flex items-center space-x-2"
                >
                  <Palette className="h-4 w-4" />
                  <span>Color Balance</span>
                </button>
                <button
                  onClick={() => setShowPairingHistory(!showPairingHistory)}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors flex items-center space-x-2"
                >
                  <History className="h-4 w-4" />
                  <span>History</span>
                </button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={filterByStatus}
                    onChange={(e) => setFilterByStatus(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All Pairings</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="byes">Byes</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="board">Board Number</option>
                    <option value="rating_diff">Rating Difference</option>
                    <option value="quality">Pairing Quality</option>
                    <option value="color_balance">Color Balance</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onGeneratePairings(selectedSectionData.name)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span>Generate Pairings</span>
                </button>
                <button
                  onClick={() => onResetPairings(selectedSectionData.name)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pairings Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {filteredPairings.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Pairings Found</h3>
              <p className="text-gray-600 mb-4">
                {filterByStatus === 'all' 
                  ? 'No pairings have been generated for this section yet.'
                  : `No ${filterByStatus} pairings found.`
                }
              </p>
              <button
                onClick={() => onGeneratePairings(selectedSectionData.name)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Pairings
              </button>
            </div>
          ) : (
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color Balance
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPairings.map((pairing) => (
                    <tr key={pairing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-semibold">
                            {pairing.board}
                          </div>
                          {pairing.is_bye && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              BYE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                            <Crown className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pairing.white_name || 'TBD'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {pairing.white_rating ? `${pairing.white_rating}` : 'Unrated'}
                              {pairing.white_uscf_id && ` (${pairing.white_uscf_id})`}
                            </div>
                            {showColorBalance && pairing.color_balance_white !== undefined && (
                              <div className={`text-xs flex items-center space-x-1 ${getColorBalanceColor(pairing.color_balance_white)}`}>
                                {getColorBalanceIcon(pairing.color_balance_white)}
                                <span>{pairing.color_balance_white > 0 ? '+' : ''}{pairing.color_balance_white}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-black border-2 border-gray-300 rounded-full flex items-center justify-center">
                            <Crown className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pairing.black_name || 'TBD'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {pairing.black_rating ? `${pairing.black_rating}` : 'Unrated'}
                              {pairing.black_uscf_id && ` (${pairing.black_uscf_id})`}
                            </div>
                            {showColorBalance && pairing.color_balance_black !== undefined && (
                              <div className={`text-xs flex items-center space-x-1 ${getColorBalanceColor(pairing.color_balance_black)}`}>
                                {getColorBalanceIcon(pairing.color_balance_black)}
                                <span>{pairing.color_balance_black > 0 ? '+' : ''}{pairing.color_balance_black}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex space-x-1 justify-center">
                          {['1-0', '0-1', '1/2-1/2', '1-0F', '0-1F', '1/2-1/2F'].map((result) => (
                            <button
                              key={result}
                              onClick={() => onUpdateResult(pairing.id, result)}
                              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                pairing.result === result
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {result}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPairingQualityColor(typeof pairing.pairing_quality_score === 'string' ? pairing.pairing_quality_score : 'fair')}`}>
                          {getPairingQualityIcon(typeof pairing.pairing_quality_score === 'string' ? pairing.pairing_quality_score : 'fair')}
                          <span>{typeof pairing.pairing_quality_score === 'string' ? pairing.pairing_quality_score : 'fair'}</span>
                        </div>
                        {pairing.rating_difference && (
                          <div className="text-xs text-gray-500 mt-1">
                            ±{pairing.rating_difference} rating
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className={`text-xs ${getColorBalanceColor(pairing.color_balance_white || 0)}`}>
                            W: {pairing.color_balance_white || 0}
                          </div>
                          <div className="text-gray-400">|</div>
                          <div className={`text-xs ${getColorBalanceColor(pairing.color_balance_black || 0)}`}>
                            B: {pairing.color_balance_black || 0}
                          </div>
                        </div>
                        {pairing.previous_meetings !== undefined && (
                          <div className="text-xs text-gray-500 mt-1">
                            {pairing.previous_meetings} previous meetings
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setShowPairingDetails(pairing.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Handle manual override
                              console.log('Manual override for pairing:', pairing.id);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Manual Override"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Generate QR code
                              console.log('Generate QR code for pairing:', pairing.id);
                            }}
                            className="text-purple-600 hover:text-purple-800"
                            title="QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900">Pairing Quality</h4>
            <p className="text-sm text-gray-600">Average quality score across all pairings</p>
            <div className="mt-2 text-2xl font-bold text-blue-600">8.7/10</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Palette className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900">Color Balance</h4>
            <p className="text-sm text-gray-600">Players with balanced colors</p>
            <div className="mt-2 text-2xl font-bold text-green-600">92%</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900">Rating Spread</h4>
            <p className="text-sm text-gray-600">Average rating difference</p>
            <div className="mt-2 text-2xl font-bold text-purple-600">47</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing System Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pairing System
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="fide_dutch">FIDE Dutch System</option>
              <option value="burstein">Burstein System</option>
              <option value="swiss">Swiss System</option>
              <option value="round_robin">Round Robin</option>
              <option value="quad">Quad System</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Balance Priority
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat Avoidance
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="strict">Strict (No repeats)</option>
              <option value="preferred">Preferred (Minimize repeats)</option>
              <option value="relaxed">Relaxed (Allow repeats if needed)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'pairings', label: 'Pairings', icon: Users },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeView === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverviewTab()}
      {activeView === 'pairings' && renderPairingsTab()}
      {activeView === 'analytics' && renderAnalyticsTab()}
      {activeView === 'settings' && renderSettingsTab()}
    </div>
  );
};

export default RedesignedPairingSystem;
