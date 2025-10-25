import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Trophy, 
  Clock, 
  DollarSign,
  Download,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Filter,
  Calendar,
  Target,
  Award,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { analyticsApi } from '../services/api';

interface AnalyticsDashboardProps {
  tournamentId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  overview: any;
  players: any;
  pairings: any;
  ratings: any;
  performance: any;
  timeAnalysis: any;
  sections: any;
  financial: any;
  generatedAt: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ tournamentId, isOpen, onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'pairings' | 'ratings' | 'performance' | 'time' | 'sections' | 'financial'>('overview');
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(['overview', 'players', 'pairings', 'ratings']);
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    if (isOpen && tournamentId) {
      loadAnalytics();
    }
  }, [isOpen, tournamentId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && isOpen) {
      interval = setInterval(loadAnalytics, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isOpen, refreshInterval]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.getTournamentAnalytics(tournamentId);
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await analyticsApi.exportAnalytics(tournamentId, format);
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tournament-${tournamentId}-analytics.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const toggleWidget = (widget: string) => {
    setSelectedWidgets(prev => 
      prev.includes(widget) 
        ? prev.filter(w => w !== widget)
        : [...prev, widget]
    );
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
              {analytics && (
                <span className="text-sm text-gray-500">
                  Last updated: {new Date(analytics.generatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={loadAnalytics}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <EyeOff className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-blue-50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-blue-900">Dashboard Settings</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoRefresh" className="text-sm text-blue-800">
                    Auto-refresh
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-blue-800">Interval:</label>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                    className="px-2 py-1 border border-blue-300 rounded text-sm"
                  >
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                    <option value={60000}>1m</option>
                    <option value={300000}>5m</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExport('json')}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'players', label: 'Players', icon: Users },
              { id: 'pairings', label: 'Pairings', icon: Trophy },
              { id: 'ratings', label: 'Ratings', icon: Target },
              { id: 'performance', label: 'Performance', icon: Activity },
              { id: 'time', label: 'Time Analysis', icon: Clock },
              { id: 'sections', label: 'Sections', icon: Award },
              { id: 'financial', label: 'Financial', icon: DollarSign }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading analytics...</span>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600">Total Players</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatNumber(analytics.overview?.total_players || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <Trophy className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-600">Average Rating</p>
                        <p className="text-2xl font-bold text-green-900">
                          {Math.round(analytics.overview?.average_rating || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-yellow-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-600">Total Rounds</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {analytics.overview?.total_rounds || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-600">Entry Fee</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {formatCurrency(analytics.overview?.entry_fee || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Players Tab */}
              {activeTab === 'players' && analytics.players && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                      <div className="space-y-3">
                        {analytics.players.topPerformers?.slice(0, 5).map((player: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              <span className="text-sm font-medium text-gray-900">{player.name}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {player.score} pts ({player.rating})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Breakdown</h3>
                      <div className="space-y-2">
                        {Object.entries(analytics.players.sectionBreakdown || {}).map(([section, count]) => (
                          <div key={section} className="flex justify-between">
                            <span className="text-sm text-gray-600">{section}</span>
                            <span className="text-sm font-medium text-gray-900">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Statistics</h3>
                      <div className="space-y-2">
                        {Object.entries(analytics.players.teamStatistics || {}).map(([team, stats]: [string, any]) => (
                          <div key={team} className="flex justify-between">
                            <span className="text-sm text-gray-600">{team}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {stats.count} players ({stats.totalScore.toFixed(1)} pts)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pairings Tab */}
              {activeTab === 'pairings' && analytics.pairings && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pairing Quality</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Quality Score</span>
                          <span className="text-sm font-medium text-gray-900">
                            {analytics.pairings.pairingQuality?.qualityScore?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Rating Diff</span>
                          <span className="text-sm font-medium text-gray-900">
                            {analytics.pairings.pairingQuality?.averageRatingDiff?.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Pairings</span>
                          <span className="text-sm font-medium text-gray-900">
                            {analytics.pairings.totalPairings}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Draw Rate</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPercentage(analytics.pairings.averageDrawRate || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Round Analysis</h3>
                      <div className="space-y-3">
                        {analytics.pairings.rounds?.map((round: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Round {round.round}</span>
                            <div className="flex space-x-4 text-sm">
                              <span className="text-gray-900">{round.total_pairings} pairings</span>
                              <span className="text-green-600">{round.decisive_games} decisive</span>
                              <span className="text-blue-600">{round.draws} draws</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ratings Tab */}
              {activeTab === 'ratings' && analytics.ratings && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
                      <div className="space-y-2">
                        {Object.entries(analytics.ratings.ranges || {}).map(([range, count]) => (
                          <div key={range} className="flex justify-between">
                            <span className="text-sm text-gray-600">{range}</span>
                            <span className="text-sm font-medium text-gray-900">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Percentiles</h3>
                      <div className="space-y-2">
                        {Object.entries(analytics.ratings.percentiles || {}).map(([percentile, value]) => (
                          <div key={percentile} className="flex justify-between">
                            <span className="text-sm text-gray-600">{percentile.toUpperCase()}</span>
                            <span className="text-sm font-medium text-gray-900">{value as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && analytics.performance && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Rating</h3>
                      <div className="space-y-3">
                        {analytics.performance.performanceByRating?.slice(0, 10).map((perf: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-sm text-gray-600">{perf.rating}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {perf.averageScore.toFixed(2)} avg ({perf.count} players)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Upsets</span>
                          <span className="text-sm font-medium text-gray-900">{analytics.performance.upsets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Consistency Score</span>
                          <span className="text-sm font-medium text-gray-900">
                            {analytics.performance.consistency?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Analysis Tab */}
              {activeTab === 'time' && analytics.timeAnalysis && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Game Duration</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Average Duration</span>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(analytics.timeAnalysis.averageGameDuration || 0)} min
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Longest Game</span>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(analytics.timeAnalysis.durationByResult?.reduce((max: number, r: any) => 
                              Math.max(max, r.average), 0) || 0)} min
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Duration by Section</h3>
                      <div className="space-y-2">
                        {analytics.timeAnalysis.durationBySection?.map((section: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-sm text-gray-600">{section.section}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {Math.round(section.average)} min ({section.count} games)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sections Tab */}
              {activeTab === 'sections' && analytics.sections && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Comparison</h3>
                      <div className="space-y-3">
                        {analytics.sections.sections?.map((section: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-sm text-gray-600">{section.section}</span>
                            <div className="text-sm text-gray-900">
                              {section.player_count} players ({section.avg_score.toFixed(2)} avg score)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitiveness</h3>
                      <div className="space-y-2">
                        {analytics.sections.competitiveness?.map((comp: any, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-sm text-gray-600">{comp.section}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {comp.competitiveness.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Tab */}
              {activeTab === 'financial' && analytics.financial && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Analysis</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Revenue</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(analytics.financial.totalRevenue || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Prize Fund</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(analytics.financial.prizeDistribution?.totalPrizeFund || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Net Revenue</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(analytics.financial.costAnalysis?.netRevenue || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Profit Margin</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPercentage((analytics.financial.costAnalysis?.profitMargin || 0) / 100)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Prize Percentage</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPercentage((analytics.financial.costAnalysis?.prizePercentage || 0) / 100)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Break-even Players</span>
                          <span className="text-sm font-medium text-gray-900">
                            {analytics.financial.profitability?.breakEvenPlayers || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No analytics data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Analytics generated at {analytics?.generatedAt ? new Date(analytics.generatedAt).toLocaleString() : 'N/A'}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleExport('json')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Export JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Export CSV
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
