import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Users, 
  Award, 
  Activity, 
  Brain, 
  Shield, 
  Zap, 
  Crown, 
  Star, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  Palette,
  History,
  Trophy,
  Medal,
  Flame,
  Sparkles,
  PieChart,
  LineChart,
  BarChart,
  RefreshCw,
  Download,
  Printer,
  Eye,
  EyeOff,
  Filter,
  Search,
  Settings,
  Calendar,
  Clock,
  User,
  Gamepad2,
  Layers,
  X
} from 'lucide-react';

interface PairingAnalytics {
  totalPairings: number;
  completedPairings: number;
  pendingPairings: number;
  averageQuality: number;
  colorBalanceScore: number;
  repeatAvoidanceScore: number;
  ratingDistributionScore: number;
  overallScore: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  colorBalanceStats: {
    balanced: number;
    whiteHeavy: number;
    blackHeavy: number;
    severeImbalance: number;
  };
  ratingDifferenceStats: {
    average: number;
    median: number;
    min: number;
    max: number;
    optimal: number;
  };
  repeatPairings: number;
  systemPerformance: {
    algorithm: string;
    executionTime: number;
    memoryUsage: number;
    accuracy: number;
  };
  trends: {
    qualityImprovement: number;
    colorBalanceImprovement: number;
    efficiencyImprovement: number;
  };
}

interface PairingAnalyticsDashboardProps {
  tournament: any;
  sections: any[];
  currentRound: number;
  isOpen: boolean;
  onClose: () => void;
}

const PairingAnalyticsDashboard: React.FC<PairingAnalyticsDashboardProps> = ({
  tournament,
  sections,
  currentRound,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'color' | 'performance' | 'trends'>('overview');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'current' | 'all' | 'recent'>('current');
  const [showDetails, setShowDetails] = useState(false);

  // Mock analytics data - in real implementation, this would come from API
  const [analytics, setAnalytics] = useState<PairingAnalytics>({
    totalPairings: 156,
    completedPairings: 142,
    pendingPairings: 14,
    averageQuality: 8.7,
    colorBalanceScore: 92,
    repeatAvoidanceScore: 98,
    ratingDistributionScore: 85,
    overallScore: 91,
    qualityDistribution: {
      excellent: 45,
      good: 67,
      fair: 32,
      poor: 12
    },
    colorBalanceStats: {
      balanced: 89,
      whiteHeavy: 34,
      blackHeavy: 28,
      severeImbalance: 5
    },
    ratingDifferenceStats: {
      average: 47,
      median: 42,
      min: 12,
      max: 156,
      optimal: 38
    },
    repeatPairings: 2,
    systemPerformance: {
      algorithm: 'FIDE Dutch System',
      executionTime: 1.2,
      memoryUsage: 45,
      accuracy: 94
    },
    trends: {
      qualityImprovement: 12,
      colorBalanceImprovement: 8,
      efficiencyImprovement: 15
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <Crown className="h-4 w-4" />;
    if (score >= 80) return <Star className="h-4 w-4" />;
    if (score >= 70) return <Target className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{analytics.overallScore}</div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analytics.overallScore}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Palette className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{analytics.colorBalanceScore}</div>
              <div className="text-sm text-gray-600">Color Balance</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analytics.colorBalanceScore}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{analytics.repeatAvoidanceScore}</div>
              <div className="text-sm text-gray-600">Repeat Avoidance</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analytics.repeatAvoidanceScore}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{analytics.ratingDistributionScore}</div>
              <div className="text-sm text-gray-600">Rating Distribution</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${analytics.ratingDistributionScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Quality Distribution */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Quality Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(analytics.qualityDistribution).map(([quality, count]) => (
            <div key={quality} className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                quality === 'excellent' ? 'bg-green-100' :
                quality === 'good' ? 'bg-blue-100' :
                quality === 'fair' ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                {quality === 'excellent' ? <Crown className="h-8 w-8 text-green-600" /> :
                 quality === 'good' ? <Star className="h-8 w-8 text-blue-600" /> :
                 quality === 'fair' ? <Target className="h-8 w-8 text-yellow-600" /> :
                 <AlertCircle className="h-8 w-8 text-red-600" />}
              </div>
              <h4 className="font-medium text-gray-900 capitalize">{quality}</h4>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-600">pairings</p>
            </div>
          ))}
        </div>
      </div>

      {/* System Performance */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900">Execution Time</h4>
            <p className="text-2xl font-bold text-blue-600">{analytics.systemPerformance.executionTime}s</p>
            <p className="text-sm text-gray-600">average</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Brain className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900">Accuracy</h4>
            <p className="text-2xl font-bold text-green-600">{analytics.systemPerformance.accuracy}%</p>
            <p className="text-sm text-gray-600">optimal pairings</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900">Memory Usage</h4>
            <p className="text-2xl font-bold text-purple-600">{analytics.systemPerformance.memoryUsage}MB</p>
            <p className="text-sm text-gray-600">peak usage</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQualityTab = () => (
    <div className="space-y-6">
      {/* Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Score Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Color Balance</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${analytics.colorBalanceScore}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{analytics.colorBalanceScore}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Repeat Avoidance</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${analytics.repeatAvoidanceScore}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{analytics.repeatAvoidanceScore}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rating Distribution</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${analytics.ratingDistributionScore}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">{analytics.ratingDistributionScore}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Trends</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Quality Improvement</span>
              <div className="flex items-center space-x-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{analytics.trends.qualityImprovement}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Color Balance Improvement</span>
              <div className="flex items-center space-x-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{analytics.trends.colorBalanceImprovement}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Efficiency Improvement</span>
              <div className="flex items-center space-x-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{analytics.trends.efficiencyImprovement}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Recommendations */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Recommendations</h3>
        <div className="space-y-3">
          {analytics.qualityDistribution.poor > 5 && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Poor Quality Pairings</h4>
                <p className="text-sm text-red-700">
                  {analytics.qualityDistribution.poor} pairings have poor quality. Consider adjusting 
                  pairing parameters or using manual overrides for critical matches.
                </p>
              </div>
            </div>
          )}
          
          {analytics.repeatPairings > 0 && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Repeat Pairings Detected</h4>
                <p className="text-sm text-yellow-700">
                  {analytics.repeatPairings} repeat pairings found. Review pairing history to ensure 
                  proper opponent rotation.
                </p>
              </div>
            </div>
          )}
          
          {analytics.overallScore >= 90 && (
            <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">Excellent Pairing Quality</h4>
                <p className="text-sm text-green-700">
                  Overall pairing quality is excellent. The system is performing optimally.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderColorTab = () => (
    <div className="space-y-6">
      {/* Color Balance Overview */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Balance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900">Balanced</h4>
            <p className="text-2xl font-bold text-green-600">{analytics.colorBalanceStats.balanced}</p>
            <p className="text-sm text-gray-600">players</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ArrowUp className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900">White Heavy</h4>
            <p className="text-2xl font-bold text-blue-600">{analytics.colorBalanceStats.whiteHeavy}</p>
            <p className="text-sm text-gray-600">players</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ArrowDown className="h-8 w-8 text-red-600" />
            </div>
            <h4 className="font-medium text-gray-900">Black Heavy</h4>
            <p className="text-2xl font-bold text-red-600">{analytics.colorBalanceStats.blackHeavy}</p>
            <p className="text-sm text-gray-600">players</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-8 w-8 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900">Severe Imbalance</h4>
            <p className="text-2xl font-bold text-purple-600">{analytics.colorBalanceStats.severeImbalance}</p>
            <p className="text-sm text-gray-600">players</p>
          </div>
        </div>
      </div>

      {/* Color Balance Recommendations */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Balance Recommendations</h3>
        <div className="space-y-3">
          {analytics.colorBalanceStats.severeImbalance > 0 && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">Severe Color Imbalance</h4>
                <p className="text-sm text-red-700">
                  {analytics.colorBalanceStats.severeImbalance} players have severe color imbalance. 
                  Prioritize these players for color correction in the next round.
                </p>
              </div>
            </div>
          )}
          
          {analytics.colorBalanceStats.whiteHeavy > analytics.colorBalanceStats.blackHeavy + 5 && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Color Distribution Imbalance</h4>
                <p className="text-sm text-yellow-700">
                  More players are white-heavy than black-heavy. Consider adjusting color assignment 
                  priorities to balance the distribution.
                </p>
              </div>
            </div>
          )}
          
          {analytics.colorBalanceScore >= 90 && (
            <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">Excellent Color Balance</h4>
                <p className="text-sm text-green-700">
                  Color balance is excellent. The pairing system is effectively managing color distribution.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* System Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Algorithm Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Algorithm</span>
              <span className="text-sm font-medium text-gray-900">{analytics.systemPerformance.algorithm}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Execution Time</span>
              <span className="text-sm font-medium text-gray-900">{analytics.systemPerformance.executionTime}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="text-sm font-medium text-gray-900">{analytics.systemPerformance.memoryUsage}MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Accuracy</span>
              <span className="text-sm font-medium text-gray-900">{analytics.systemPerformance.accuracy}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Quality Improvement</span>
              <div className="flex items-center space-x-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{analytics.trends.qualityImprovement}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Efficiency Improvement</span>
              <div className="flex items-center space-x-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{analytics.trends.efficiencyImprovement}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Color Balance Improvement</span>
              <div className="flex items-center space-x-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">+{analytics.trends.colorBalanceImprovement}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Recommendations</h3>
        <div className="space-y-3">
          {analytics.systemPerformance.executionTime > 2 && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Slow Execution Time</h4>
                <p className="text-sm text-yellow-700">
                  Execution time is above optimal. Consider optimizing the pairing algorithm or 
                  reducing the number of players per section.
                </p>
              </div>
            </div>
          )}
          
          {analytics.systemPerformance.memoryUsage > 100 && (
            <div className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">High Memory Usage</h4>
                <p className="text-sm text-orange-700">
                  Memory usage is high. Consider implementing memory optimization techniques 
                  or reducing the complexity of the pairing algorithm.
                </p>
              </div>
            </div>
          )}
          
          {analytics.systemPerformance.accuracy >= 95 && (
            <div className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">Excellent Performance</h4>
                <p className="text-sm text-green-700">
                  System performance is excellent. The pairing algorithm is working optimally.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTrendsTab = () => (
    <div className="space-y-6">
      {/* Trend Analysis */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900">Quality Improvement</h4>
            <p className="text-3xl font-bold text-green-600">+{analytics.trends.qualityImprovement}%</p>
            <p className="text-sm text-gray-600">over last 5 rounds</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Palette className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="font-medium text-gray-900">Color Balance Improvement</h4>
            <p className="text-3xl font-bold text-blue-600">+{analytics.trends.colorBalanceImprovement}%</p>
            <p className="text-sm text-gray-600">over last 5 rounds</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900">Efficiency Improvement</h4>
            <p className="text-3xl font-bold text-purple-600">+{analytics.trends.efficiencyImprovement}%</p>
            <p className="text-sm text-gray-600">over last 5 rounds</p>
          </div>
        </div>
      </div>

      {/* Historical Performance */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historical Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Round 1</h4>
                <p className="text-sm text-gray-600">Initial pairings</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Score: 85</div>
              <div className="text-xs text-gray-600">Good</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Star className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Round 2</h4>
                <p className="text-sm text-gray-600">Improved balance</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Score: 88</div>
              <div className="text-xs text-gray-600">Good</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Crown className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Round 3</h4>
                <p className="text-sm text-gray-600">Optimal pairings</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Score: 91</div>
              <div className="text-xs text-gray-600">Excellent</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pairing Analytics Dashboard</h2>
            <p className="text-gray-600">{tournament?.name} • Round {currentRound}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{showDetails ? 'Hide' : 'Show'} Details</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'quality', label: 'Quality', icon: Target },
            { id: 'color', label: 'Color Balance', icon: Palette },
            { id: 'performance', label: 'Performance', icon: Zap },
            { id: 'trends', label: 'Trends', icon: TrendingUp }
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
        {activeTab === 'quality' && renderQualityTab()}
        {activeTab === 'color' && renderColorTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'trends' && renderTrendsTab()}
      </div>
    </div>
  );
};

export default PairingAnalyticsDashboard;
