import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChart,
  Activity,
  Award,
  Clock,
  MapPin,
  Star,
  Download,
  RefreshCw
} from 'lucide-react';

interface OrganizationAnalyticsProps {
  organizationId: string;
  organizationSlug: string;
}

interface AnalyticsData {
  tournaments: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    byFormat: { [format: string]: number };
    byStatus: { [status: string]: number };
    byMonth: { [month: string]: number };
    averagePlayers: number;
    totalPlayers: number;
  };
  players: {
    total: number;
    unique: number;
    averageRating: number;
    ratingDistribution: { [range: string]: number };
    byLocation: { [location: string]: number };
  };
  engagement: {
    publicPageViews: number;
    tournamentViews: number;
    registrationClicks: number;
    socialShares: number;
  };
  performance: {
    averageTournamentDuration: number;
    completionRate: number;
    playerRetentionRate: number;
    satisfactionScore: number;
  };
}

const OrganizationAnalytics: React.FC<OrganizationAnalyticsProps> = ({
  organizationId,
  organizationSlug
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock analytics data - in a real app, this would come from an API
      const mockData: AnalyticsData = {
        tournaments: {
          total: 24,
          active: 3,
          completed: 18,
          cancelled: 3,
          byFormat: {
            'swiss': 15,
            'round-robin': 5,
            'team-swiss': 3,
            'blitz': 1
          },
          byStatus: {
            'completed': 18,
            'active': 3,
            'created': 2,
            'cancelled': 3
          },
          byMonth: {
            'Jan': 2,
            'Feb': 3,
            'Mar': 4,
            'Apr': 3,
            'May': 5,
            'Jun': 4,
            'Jul': 3
          },
          averagePlayers: 28,
          totalPlayers: 672
        },
        players: {
          total: 672,
          unique: 234,
          averageRating: 1456,
          ratingDistribution: {
            'Under 1000': 45,
            '1000-1200': 67,
            '1200-1400': 89,
            '1400-1600': 78,
            '1600-1800': 45,
            '1800-2000': 23,
            '2000+': 12
          },
          byLocation: {
            'New York': 89,
            'California': 67,
            'Texas': 45,
            'Florida': 34,
            'Other': 79
          }
        },
        engagement: {
          publicPageViews: 1247,
          tournamentViews: 3456,
          registrationClicks: 234,
          socialShares: 89
        },
        performance: {
          averageTournamentDuration: 4.2,
          completionRate: 94.2,
          playerRetentionRate: 67.8,
          satisfactionScore: 4.6
        }
      };

      setAnalytics(mockData);
      setLastUpdated(new Date());
    } catch (error: any) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: any;
    color?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600'
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-2">
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    );
  };

  const SimpleChart = ({ 
    data, 
    title, 
    type = 'bar' 
  }: {
    data: { [key: string]: number };
    title: string;
    type?: 'bar' | 'pie';
  }) => {
    const maxValue = Math.max(...Object.values(data));
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{key}</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="mx-auto h-12 w-12 mb-4" />
        <p>No analytics data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Insights into your organization's performance</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={loadAnalytics}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tournaments"
          value={analytics.tournaments.total}
          change={12.5}
          icon={Trophy}
          color="blue"
        />
        <StatCard
          title="Total Players"
          value={formatNumber(analytics.tournaments.totalPlayers)}
          change={8.3}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Public Page Views"
          value={formatNumber(analytics.engagement.publicPageViews)}
          change={-2.1}
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="Completion Rate"
          value={`${analytics.performance.completionRate}%`}
          change={1.2}
          icon={Award}
          color="orange"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          data={analytics.tournaments.byFormat}
          title="Tournaments by Format"
        />
        <SimpleChart
          data={analytics.players.ratingDistribution}
          title="Player Rating Distribution"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Average Tournament Duration"
          value={`${analytics.performance.averageTournamentDuration} days`}
          change={-0.5}
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Player Retention Rate"
          value={`${analytics.performance.playerRetentionRate}%`}
          change={3.2}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Satisfaction Score"
          value={`${analytics.performance.satisfactionScore}/5.0`}
          change={0.1}
          icon={Star}
          color="orange"
        />
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatNumber(analytics.engagement.publicPageViews)}
            </div>
            <div className="text-sm text-gray-600">Public Page Views</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatNumber(analytics.engagement.tournamentViews)}
            </div>
            <div className="text-sm text-gray-600">Tournament Views</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analytics.engagement.registrationClicks}
            </div>
            <div className="text-sm text-gray-600">Registration Clicks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {analytics.engagement.socialShares}
            </div>
            <div className="text-sm text-gray-600">Social Shares</div>
          </div>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart
          data={analytics.players.byLocation}
          title="Players by Location"
        />
        <SimpleChart
          data={analytics.tournaments.byMonth}
          title="Tournaments by Month"
        />
      </div>

      {/* Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Tournament Growth</p>
              <p className="text-sm text-gray-600">
                Your organization has grown by 12.5% in tournament count this period, 
                indicating strong community engagement.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Users className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Player Retention</p>
              <p className="text-sm text-gray-600">
                Player retention rate of 67.8% shows healthy community loyalty and 
                consistent tournament participation.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Star className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">High Satisfaction</p>
              <p className="text-sm text-gray-600">
                With a satisfaction score of 4.6/5.0, your tournaments are well-received 
                by the chess community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationAnalytics;
