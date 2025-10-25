import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Users, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  Crown,
  Star,
  Award,
  Activity,
  BarChart3,
  PieChart,
  Zap,
  Shield,
  Brain,
  Eye,
  EyeOff,
  X,
  History
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  rating?: number;
  color_balance: number;
  color_history: string[];
  section: string;
  points: number;
  previous_opponents: string[];
}

interface ColorBalanceVisualizationProps {
  players: Player[];
  sectionName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ColorBalanceVisualization: React.FC<ColorBalanceVisualizationProps> = ({
  players,
  sectionName,
  isOpen,
  onClose
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'detailed' | 'history'>('overview');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'rating' | 'points'>('balance');
  const [showUnbalancedOnly, setShowUnbalancedOnly] = useState(false);

  if (!isOpen) return null;

  const getColorBalanceColor = (balance: number) => {
    if (balance === 0) return 'text-gray-600 bg-gray-100';
    if (balance > 0) return 'text-blue-600 bg-blue-100';
    return 'text-red-600 bg-red-100';
  };

  const getColorBalanceIcon = (balance: number) => {
    if (balance === 0) return <Minus className="h-4 w-4" />;
    if (balance > 0) return <ArrowUp className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

  const getBalanceSeverity = (balance: number) => {
    const abs = Math.abs(balance);
    if (abs === 0) return 'balanced';
    if (abs <= 1) return 'slight';
    if (abs <= 2) return 'moderate';
    return 'severe';
  };

  const getBalanceSeverityColor = (severity: string) => {
    switch (severity) {
      case 'balanced': return 'text-green-600 bg-green-100';
      case 'slight': return 'text-yellow-600 bg-yellow-100';
      case 'moderate': return 'text-orange-600 bg-orange-100';
      case 'severe': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getBalanceSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'balanced': return <CheckCircle className="h-4 w-4" />;
      case 'slight': return <Info className="h-4 w-4" />;
      case 'moderate': return <AlertCircle className="h-4 w-4" />;
      case 'severe': return <AlertCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  // Calculate color balance statistics
  const balanceStats = {
    total: players.length,
    balanced: players.filter(p => p.color_balance === 0).length,
    whiteHeavy: players.filter(p => p.color_balance > 0).length,
    blackHeavy: players.filter(p => p.color_balance < 0).length,
    averageBalance: players.reduce((sum, p) => sum + p.color_balance, 0) / players.length,
    maxImbalance: Math.max(...players.map(p => Math.abs(p.color_balance))),
    severeImbalance: players.filter(p => Math.abs(p.color_balance) > 2).length
  };

  // Sort players based on selected criteria
  const sortedPlayers = [...players].sort((a, b) => {
    if (showUnbalancedOnly) {
      const aBalanced = a.color_balance === 0;
      const bBalanced = b.color_balance === 0;
      if (aBalanced !== bBalanced) return aBalanced ? 1 : -1;
    }

    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'balance':
        return Math.abs(b.color_balance) - Math.abs(a.color_balance);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'points':
        return b.points - a.points;
      default:
        return 0;
    }
  });

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Balanced</h3>
          <p className="text-3xl font-bold text-green-600">{balanceStats.balanced}</p>
          <p className="text-sm text-gray-600">players</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ArrowUp className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">White Heavy</h3>
          <p className="text-3xl font-bold text-blue-600">{balanceStats.whiteHeavy}</p>
          <p className="text-sm text-gray-600">players</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ArrowDown className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Black Heavy</h3>
          <p className="text-3xl font-bold text-red-600">{balanceStats.blackHeavy}</p>
          <p className="text-sm text-gray-600">players</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Target className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Severe Imbalance</h3>
          <p className="text-3xl font-bold text-purple-600">{balanceStats.severeImbalance}</p>
          <p className="text-sm text-gray-600">players</p>
        </div>
      </div>

      {/* Balance Distribution Chart */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Balance Distribution</h3>
        <div className="space-y-4">
          {[-3, -2, -1, 0, 1, 2, 3].map(balance => {
            const count = players.filter(p => p.color_balance === balance).length;
            const percentage = (count / players.length) * 100;
            const isCurrentBalance = balance === 0;
            
            return (
              <div key={balance} className="flex items-center space-x-4">
                <div className="w-16 text-sm font-medium text-gray-700">
                  {balance > 0 ? `+${balance}` : balance}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div 
                    className={`h-6 rounded-full transition-all duration-300 ${
                      isCurrentBalance ? 'bg-green-500' : 
                      balance > 0 ? 'bg-blue-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {count > 0 && count}
                  </div>
                </div>
                <div className="w-12 text-sm text-gray-600 text-right">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Player Color Balance</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="unbalancedOnly"
                checked={showUnbalancedOnly}
                onChange={(e) => setShowUnbalancedOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="unbalancedOnly" className="text-sm text-gray-700">
                Show unbalanced only
              </label>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="balance">Sort by Balance</option>
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="points">Sort by Points</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {sortedPlayers.map((player) => {
            const severity = getBalanceSeverity(player.color_balance);
            return (
              <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                    <Crown className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{player.name}</h4>
                    <p className="text-sm text-gray-600">
                      {player.rating ? `Rating: ${player.rating}` : 'Unrated'} • 
                      {player.points} points
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getColorBalanceColor(player.color_balance)}`}>
                    {getColorBalanceIcon(player.color_balance)}
                    <span>{player.color_balance > 0 ? '+' : ''}{player.color_balance}</span>
                  </div>
                  
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getBalanceSeverityColor(severity)}`}>
                    {getBalanceSeverityIcon(severity)}
                    <span>{severity}</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    {player.color_history.slice(-5).map((color, index) => (
                      <div
                        key={index}
                        className={`w-4 h-4 rounded-full ${
                          color === 'W' ? 'bg-white border border-gray-300' : 'bg-black'
                        }`}
                        title={`Round ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderDetailedTab = () => (
    <div className="space-y-6">
      {/* Detailed Analysis */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Color Balance Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Balance Statistics</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Average Balance</span>
                <span className="font-medium">{balanceStats.averageBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Maximum Imbalance</span>
                <span className="font-medium">{balanceStats.maxImbalance}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Balanced Players</span>
                <span className="text-green-600 font-medium">{balanceStats.balanced}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Severe Imbalance</span>
                <span className="text-red-600 font-medium">{balanceStats.severeImbalance}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Balance Quality</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Quality</span>
                <span className={`font-medium ${
                  balanceStats.severeImbalance === 0 ? 'text-green-600' :
                  balanceStats.severeImbalance <= 2 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {balanceStats.severeImbalance === 0 ? 'Excellent' :
                   balanceStats.severeImbalance <= 2 ? 'Good' :
                   'Needs Attention'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Balance Score</span>
                <span className="font-medium">
                  {Math.max(0, 100 - (balanceStats.severeImbalance * 20))}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    balanceStats.severeImbalance === 0 ? 'bg-green-500' :
                    balanceStats.severeImbalance <= 2 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, 100 - (balanceStats.severeImbalance * 20))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
        <div className="space-y-3">
          {balanceStats.severeImbalance > 0 && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Immediate Action Required</h4>
                <p className="text-sm text-red-700">
                  {balanceStats.severeImbalance} player{balanceStats.severeImbalance !== 1 ? 's' : ''} have severe color imbalance. 
                  Consider manual pairing adjustments for the next round.
                </p>
              </div>
            </div>
          )}
          
          {balanceStats.whiteHeavy > balanceStats.blackHeavy + 2 && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Color Distribution Imbalance</h4>
                <p className="text-sm text-yellow-700">
                  More players are white-heavy than black-heavy. Consider adjusting color assignment 
                  priorities in the next round.
                </p>
              </div>
            </div>
          )}
          
          {balanceStats.balanced >= players.length * 0.8 && (
            <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">Excellent Color Balance</h4>
                <p className="text-sm text-green-700">
                  Over 80% of players have balanced colors. The pairing system is working well.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      {/* Color History Trends */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Color History Trends</h3>
        
        <div className="space-y-4">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                  <Crown className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{player.name}</h4>
                  <p className="text-sm text-gray-600">
                    Current balance: {player.color_balance > 0 ? '+' : ''}{player.color_balance}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {player.color_history.map((color, index) => (
                    <div
                      key={index}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        color === 'W' ? 'bg-white border border-gray-300 text-gray-700' : 'bg-black text-white'
                      }`}
                      title={`Round ${index + 1}`}
                    >
                      {color}
                    </div>
                  ))}
                </div>
                
                <div className="text-sm text-gray-600 ml-4">
                  {player.color_history.filter(c => c === 'W').length}W / {player.color_history.filter(c => c === 'B').length}B
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Color Balance Analysis</h2>
            <p className="text-gray-600">{sectionName} Section</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'detailed', label: 'Detailed', icon: Target },
            { id: 'history', label: 'History', icon: History }
          ].map(({ id, label, icon: IconComponent }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeView === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <IconComponent className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeView === 'overview' && renderOverviewTab()}
        {activeView === 'detailed' && renderDetailedTab()}
        {activeView === 'history' && renderHistoryTab()}
      </div>
    </div>
  );
};

export default ColorBalanceVisualization;
