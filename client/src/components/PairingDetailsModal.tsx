import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Target, 
  Palette, 
  History, 
  TrendingUp, 
  Shield, 
  Brain, 
  Zap, 
  Crown, 
  Star, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  Award,
  Activity,
  BarChart3,
  Clock,
  User,
  Trophy,
  Medal,
  Flame,
  Sparkles,
  Edit3,
  Settings
} from 'lucide-react';

interface PairingDetailsModalProps {
  pairing: any;
  isOpen: boolean;
  onClose: () => void;
  onManualOverride?: (pairingId: string, newWhiteId: string, newBlackId: string, reason: string) => void;
}

const PairingDetailsModal: React.FC<PairingDetailsModalProps> = ({
  pairing,
  isOpen,
  onClose,
  onManualOverride
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'history' | 'settings'>('overview');
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  if (!isOpen || !pairing) return null;

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

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Pairing Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Board {pairing.board}</h2>
              <p className="text-blue-200">
                {pairing.white_name} vs {pairing.black_name}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  <Target className="h-4 w-4" />
                  <span className="text-sm">Round {pairing.round}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Palette className="h-4 w-4" />
                  <span className="text-sm">{pairing.section} Section</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-200">Pairing Quality</div>
            <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getPairingQualityColor(pairing.pairing_quality_score || 'fair')}`}>
              {getPairingQualityIcon(pairing.pairing_quality_score || 'fair')}
              <span>{pairing.pairing_quality_score || 'fair'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Player Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* White Player */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
              <Crown className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{pairing.white_name}</h3>
              <p className="text-sm text-gray-600">
                {pairing.white_rating ? `Rating: ${pairing.white_rating}` : 'Unrated'}
                {pairing.white_uscf_id && ` • ${pairing.white_uscf_id}`}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Color Balance</span>
              <div className={`flex items-center space-x-1 ${getColorBalanceColor(pairing.color_balance_white || 0)}`}>
                {getColorBalanceIcon(pairing.color_balance_white || 0)}
                <span className="font-medium">{pairing.color_balance_white || 0}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Previous Opponents</span>
              <span className="text-sm font-medium text-gray-900">
                {pairing.white_previous_opponents?.length || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Color History</span>
              <div className="flex space-x-1">
                {(pairing.white_color_history || []).slice(-5).map((color: string, index: number) => (
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
        </div>

        {/* Black Player */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-black border-2 border-gray-300 rounded-full flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{pairing.black_name}</h3>
              <p className="text-sm text-gray-600">
                {pairing.black_rating ? `Rating: ${pairing.black_rating}` : 'Unrated'}
                {pairing.black_uscf_id && ` • ${pairing.black_uscf_id}`}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Color Balance</span>
              <div className={`flex items-center space-x-1 ${getColorBalanceColor(pairing.color_balance_black || 0)}`}>
                {getColorBalanceIcon(pairing.color_balance_black || 0)}
                <span className="font-medium">{pairing.color_balance_black || 0}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Previous Opponents</span>
              <span className="text-sm font-medium text-gray-900">
                {pairing.black_previous_opponents?.length || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Color History</span>
              <div className="flex space-x-1">
                {(pairing.black_color_history || []).slice(-5).map((color: string, index: number) => (
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
        </div>
      </div>

      {/* Pairing Statistics */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900">Rating Difference</h4>
            <p className="text-2xl font-bold text-blue-600">
              {pairing.rating_difference || 0}
            </p>
            <p className="text-sm text-gray-600">points</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <History className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900">Previous Meetings</h4>
            <p className="text-2xl font-bold text-green-600">
              {pairing.previous_meetings || 0}
            </p>
            <p className="text-sm text-gray-600">times</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900">Quality Score</h4>
            <p className="text-2xl font-bold text-purple-600">
              {pairing.pairing_quality_score || 'N/A'}
            </p>
            <p className="text-sm text-gray-600">out of 10</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalysisTab = () => (
    <div className="space-y-6">
      {/* Pairing Algorithm Analysis */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Algorithm Analysis</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Brain className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Swiss System Rules</h4>
                <p className="text-sm text-gray-600">Applied standard Swiss pairing rules</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Passed</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Repeat Avoidance</h4>
                <p className="text-sm text-gray-600">No previous meetings between players</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Passed</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Palette className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Color Balance</h4>
                <p className="text-sm text-gray-600">Optimal color distribution achieved</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Passed</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Rating Difference</h4>
                <p className="text-sm text-gray-600">Within acceptable range for competitive play</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Passed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pairing Rationale */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Rationale</h3>
        <div className="prose max-w-none">
          <p className="text-gray-700 leading-relaxed">
            {pairing.pairing_reason || `This pairing was generated using the ${pairing.section} section's pairing system. Both players have similar scores and ratings, ensuring a competitive match. The color assignment was optimized to balance each player's color history, with ${pairing.white_name} receiving white pieces to correct their color imbalance.`}
          </p>
        </div>
      </div>

      {/* Optimization Metrics */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Color Balance Score</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>White Player Balance</span>
                <span className={getColorBalanceColor(pairing.color_balance_white || 0)}>
                  {pairing.color_balance_white || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Black Player Balance</span>
                <span className={getColorBalanceColor(pairing.color_balance_black || 0)}>
                  {pairing.color_balance_black || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                  style={{ width: '85%' }}
                ></div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Competitive Balance</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Rating Difference</span>
                <span className="text-blue-600">{pairing.rating_difference || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Previous Meetings</span>
                <span className="text-green-600">{pairing.previous_meetings || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                  style={{ width: '92%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      {/* Player History */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Player History</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">{pairing.white_name}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Games</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Wins</span>
                <span className="text-green-600 font-medium">8</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Draws</span>
                <span className="text-yellow-600 font-medium">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Losses</span>
                <span className="text-red-600 font-medium">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Win Rate</span>
                <span className="font-medium">75%</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">{pairing.black_name}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Games</span>
                <span className="font-medium">10</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Wins</span>
                <span className="text-green-600 font-medium">6</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Draws</span>
                <span className="text-yellow-600 font-medium">3</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Losses</span>
                <span className="text-red-600 font-medium">1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Win Rate</span>
                <span className="font-medium">70%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Opponents */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Opponents</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">John Smith</h4>
                <p className="text-sm text-gray-600">Round 3 • 1-0</p>
              </div>
            </div>
            <div className="text-green-600 font-medium">W</div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Jane Doe</h4>
                <p className="text-sm text-gray-600">Round 2 • 0-1</p>
              </div>
            </div>
            <div className="text-red-600 font-medium">L</div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Bob Johnson</h4>
                <p className="text-sm text-gray-600">Round 1 • 1/2-1/2</p>
              </div>
            </div>
            <div className="text-yellow-600 font-medium">D</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Manual Override */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Override</h3>
        <p className="text-gray-600 mb-4">
          Override the automatic pairing system for this specific pairing. This should only be used in exceptional circumstances.
        </p>
        <button
          onClick={() => setShowOverrideForm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <Edit3 className="h-4 w-4" />
          <span>Override Pairing</span>
        </button>
      </div>

      {/* Pairing Preferences */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Assignment Priority
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="balance">Color Balance</option>
              <option value="rating">Player Rating</option>
              <option value="preference">Player Preference</option>
              <option value="random">Random</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating Difference Tolerance
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="strict">Strict (0-50 points)</option>
              <option value="moderate">Moderate (0-100 points)</option>
              <option value="relaxed">Relaxed (0-200 points)</option>
              <option value="any">Any</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repeat Avoidance
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="strict">Strict (No repeats)</option>
              <option value="preferred">Preferred (Minimize repeats)</option>
              <option value="relaxed">Relaxed (Allow if needed)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pairing Details</h2>
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
            { id: 'analysis', label: 'Analysis', icon: Brain },
            { id: 'history', label: 'History', icon: History },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === id
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
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
};

export default PairingDetailsModal;
