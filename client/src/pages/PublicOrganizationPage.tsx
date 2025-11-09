import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  Globe, 
  Mail, 
  Phone,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  MessageCircle,
  Grid,
  List,
  ArrowRight,
  Clock,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  Activity,
  BarChart3,
  Shield,
  Bell,
  Pin,
  Sparkles
} from 'lucide-react';
import { organizationApi } from '../services/organizationApi';
import api from '../services/api';
import { Organization, Tournament } from '../types';

const PublicOrganizationPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    if (slug) {
      loadOrganizationData();
    }
  }, [slug]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [orgResponse, tournamentsResponse, upcomingResponse, activeResponse, statsResponse] = await Promise.all([
        organizationApi.getPublicOrganization(slug!),
        organizationApi.getPublicTournaments(slug!, {
          status: filterStatus !== 'all' ? filterStatus : undefined,
          format: filterFormat !== 'all' ? filterFormat : undefined,
          limit: 12,
          offset: (currentPage - 1) * 12
        }),
        organizationApi.getPublicTournaments(slug!, {
          status: 'created',
          limit: 3
        }),
        organizationApi.getPublicTournaments(slug!, {
          status: 'active',
          limit: 3
        }),
        organizationApi.getOrganizationStats(slug!)
      ]);

      setOrganization(orgResponse.data.organization);
      setTournaments(tournamentsResponse.data.tournaments);
      setPagination(tournamentsResponse.data.pagination);
      setUpcomingTournaments(upcomingResponse.data.tournaments || []);
      setActiveTournaments(activeResponse.data.tournaments || []);
      setStats(statsResponse.data);

      if (orgResponse.data.organization?.id) {
        loadClubFeatures(orgResponse.data.organization.id);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizationData();
  }, [slug, filterStatus, filterFormat, currentPage]);

  const loadClubFeatures = async (organizationId: string) => {
    try {
      const [announcementsResponse, ratingsResponse] = await Promise.all([
        api.get(`/club-features/public/announcements?organizationId=${organizationId}&t=${Date.now()}`),
        api.get(`/club-features/public/ratings?organizationId=${organizationId}&ratingType=regular&limit=10&t=${Date.now()}`)
      ]);
      
      if (announcementsResponse.data.success) {
        setAnnouncements(announcementsResponse.data.data.announcements.slice(0, 5));
      }
      if (ratingsResponse.data.success) {
        setRatings(ratingsResponse.data.data.leaderboard.slice(0, 10));
      }
    } catch (error) {
      // Fail silently
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'created': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFormatIcon = (format: string) => {
    if (format.includes('team')) return Users;
    if (format.includes('blitz')) return Clock;
    if (format.includes('rapid')) return TrendingUp;
    return Trophy;
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return Facebook;
      case 'twitter': return Twitter;
      case 'instagram': return Instagram;
      case 'youtube': return Youtube;
      case 'discord': return MessageCircle;
      default: return Globe;
    }
  };

  const highlightFeatures = [
    {
      icon: Trophy,
      title: 'Automated Swiss Pairings',
      description: 'Advanced pairing algorithms ensure fair and competitive matches every round.'
    },
    {
      icon: Users,
      title: 'Player Management',
      description: 'Comprehensive player registration, rating tracking, and tournament history.'
    },
    {
      icon: BarChart3,
      title: 'Live Analytics',
      description: 'Real-time standings, statistics, and tournament progress tracking.'
    },
    {
      icon: Calendar,
      title: 'Flexible Scheduling',
      description: 'Support for multiple tournament formats and customizable time controls.'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee.'
    },
    {
      icon: Globe,
      title: 'Public Access',
      description: 'Public tournament pages for spectators and easy player registration.'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
        <p className="text-gray-600">The organization you're looking for doesn't exist or is not public.</p>
      </div>
    );
  }

  const renderTournamentCard = (tournament: any) => (
    <Link
      key={tournament.id}
      to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 flex-1">
            {tournament.name}
          </h3>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ml-3 flex-shrink-0 ${getStatusBadge(tournament.status)}`}>
            {tournament.status}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            {React.createElement(getFormatIcon(tournament.format), { className: "h-4 w-4 mr-2 text-orange-600" })}
            <span className="capitalize">{tournament.format.replace('-', ' ')}</span>
            <span className="mx-2">•</span>
            <Trophy className="h-4 w-4 mr-1" />
            <span>{tournament.rounds} rounds</span>
          </div>
          
          {tournament.startDate && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2 text-orange-600" />
              {formatDate(tournament.startDate)}
            </div>
          )}
          
          {tournament.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 text-orange-600" />
              <span className="truncate">{tournament.location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm font-medium text-orange-600 group-hover:text-orange-700 flex items-center">
            View Details
            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </span>
          {tournament.allowRegistration && tournament.status === 'created' && (
            <span className="px-4 py-1.5 bg-orange-600 text-white text-sm font-semibold rounded-lg">
              Register
            </span>
          )}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {organization?.logoUrl && (
              <img
                src={organization.logoUrl}
                alt={`${organization.name} logo`}
                className="h-24 w-auto rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              />
            )}
            <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-neutral-900">
                  {organization.settings?.branding?.headerText || organization?.name}
                </h1>
                {(organization?.description || organization.settings?.branding?.tagline) && (
                  <p className="mt-3 text-lg text-neutral-600 max-w-2xl">
                    {organization.settings?.branding?.tagline || organization.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {organization?.website && (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                {organization?.contactEmail && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-neutral-600">
                    <Mail className="h-4 w-4" />
                    {organization.contactEmail}
                  </div>
                )}
                {organization?.contactPhone && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-neutral-600">
                    <Phone className="h-4 w-4" />
                    {organization.contactPhone}
                  </div>
                )}
                {(organization?.city || organization?.state) && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-neutral-600">
                    <MapPin className="h-4 w-4" />
                    {organization?.city && organization?.state
                      ? `${organization.city}, ${organization.state}`
                      : organization?.city || organization?.state}
                  </div>
                )}
              </div>

              {organization?.settings?.social && Object.keys(organization.settings.social).length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  {Object.entries(organization.settings.social).map(([platform, url]) => {
                    if (!url) return null;
                    const Icon = getSocialIcon(platform);
                    return (
                      <a
                        key={platform}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="border-b border-neutral-200 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-900 text-white mb-3">
                  <Trophy className="h-6 w-6" />
                </div>
                <div className="text-3xl font-semibold text-neutral-900 mb-1">
                  {stats.tournaments.total_tournaments}
                </div>
                <div className="text-sm text-neutral-600 font-medium">Tournaments</div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-900 text-white mb-3">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="text-3xl font-semibold text-neutral-900 mb-1">
                  {stats.tournaments.active_tournaments}
                </div>
                <div className="text-sm text-neutral-600 font-medium">Active Now</div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-900 text-white mb-3">
                  <Award className="h-6 w-6" />
                </div>
                <div className="text-3xl font-semibold text-neutral-900 mb-1">
                  {stats.tournaments.completed_tournaments}
                </div>
                <div className="text-sm text-neutral-600 font-medium">Completed</div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-900 text-white mb-3">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-3xl font-semibold text-neutral-900 mb-1">
                  {stats.players.total_players}
                </div>
                <div className="text-sm text-neutral-600 font-medium">Players</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access: Upcoming & Active */}
      {(upcomingTournaments.length > 0 || activeTournaments.length > 0) && (
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingTournaments.length > 0 && (
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-8 text-white">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">Upcoming</h3>
                        <p className="text-orange-100 text-sm">Coming soon</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {upcomingTournaments.map((tournament: any) => (
                      <Link
                        key={tournament.id}
                        to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
                        className="block p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all"
                      >
                        <div className="font-semibold mb-1">{tournament.name}</div>
                        <div className="flex items-center space-x-4 text-sm text-orange-100">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(tournament.startDate)}
                          </span>
                          <span className="flex items-center">
                            <Trophy className="h-3 w-3 mr-1" />
                            {tournament.rounds} rounds
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {activeTournaments.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Activity className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">Live Now</h3>
                        <p className="text-emerald-100 text-sm">In progress</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                      LIVE
                    </div>
                  </div>
                  <div className="space-y-3">
                    {activeTournaments.map((tournament: any) => (
                      <Link
                        key={tournament.id}
                        to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
                        className="block p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all"
                      >
                        <div className="font-semibold mb-1">{tournament.name}</div>
                        <div className="flex items-center space-x-4 text-sm text-emerald-100">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Round {tournament.currentRound || 1}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {tournament.playerCount || 0} players
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Club Announcements */}
      {announcements.length > 0 && (
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 mb-4">
                <Bell className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">Club Announcements</h2>
              <p className="text-xl text-gray-600">Latest updates and news</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`bg-white rounded-2xl shadow-lg p-6 border-l-4 transition-all hover:shadow-xl ${
                    announcement.isPinned ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-white' : 'border-orange-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {announcement.isPinned && (
                        <Pin className="h-5 w-5 text-yellow-600 fill-current" />
                      )}
                      <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                    </div>
                  </div>
                  <div 
                    className="text-gray-700 mb-4 line-clamp-4"
                    dangerouslySetInnerHTML={{ __html: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : '') }}
                  />
                  {announcement.publishedAt && (
                    <div className="text-sm text-gray-500 pt-4 border-t border-gray-100">
                      {formatDate(announcement.publishedAt)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Club Ratings Leaderboard */}
      {ratings.length > 0 && (
        <div className="py-16 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-100 mb-4">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">Club Ratings</h2>
              <p className="text-xl text-gray-600">Top rated players</p>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-orange-600 to-orange-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Player</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Games</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Record</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ratings.map((rating, index) => (
                      <tr key={rating.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index < 3 && (
                              <Trophy className={`h-5 w-5 mr-2 ${
                                index === 0 ? 'text-yellow-500 fill-current' :
                                index === 1 ? 'text-gray-400 fill-current' :
                                'text-orange-500 fill-current'
                              }`} />
                            )}
                            <span className="text-lg font-bold text-gray-900">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base font-semibold text-gray-900">{rating.memberName}</div>
                          {rating.uscfId && (
                            <div className="text-sm text-gray-500">USCF: {rating.uscfId}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-2xl font-bold text-orange-600">{rating.rating}</div>
                          {rating.peakRating && rating.peakRating > rating.rating && (
                            <div className="text-xs text-green-600 font-medium">Peak: {rating.peakRating}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base font-semibold text-gray-900">{rating.gamesPlayed}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base text-gray-700 font-medium">
                            {rating.wins}-{rating.losses}-{rating.draws}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Tournaments */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div className="mb-6 sm:mb-0">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">All Tournaments</h2>
              <p className="text-xl text-gray-600">Browse all tournaments</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="created">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Formats</option>
                <option value="swiss">Swiss</option>
                <option value="round-robin">Round Robin</option>
                <option value="team-swiss">Team Swiss</option>
                <option value="blitz">Blitz</option>
              </select>

              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {tournaments.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Tournaments Found</h3>
              <p className="text-gray-600">
                {filterStatus !== 'all' || filterFormat !== 'all'
                  ? 'No tournaments match your filters.'
                  : `${organization?.name} hasn't made any tournaments public yet.`
                }
              </p>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {tournaments.map(renderTournamentCard)}
              </div>

              {pagination && pagination.total > pagination.limit && (
                <div className="flex items-center justify-between mt-12">
                  <div className="text-sm text-gray-700 font-medium">
                    Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} tournaments
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 inline" />
                    </button>
                    
                    <span className="px-4 py-2 text-sm font-medium text-gray-700">
                      Page {currentPage} of {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={!pagination.hasMore}
                      className="px-4 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 inline" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Highlights */}
      <div className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900">
              Professional tournament management with cutting-edge features
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlightFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-colors hover:border-neutral-300"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-bold mb-4">About {organization?.name}</h3>
              <p className="text-gray-400 leading-relaxed">
                {organization?.description || 'Professional chess tournament organization committed to excellence.'}
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/public/tournaments" className="hover:text-orange-400 transition-colors">Browse Tournaments</Link></li>
                <li><Link to="/public/organizations" className="hover:text-orange-400 transition-colors">Find Organizations</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Contact</h3>
              <div className="space-y-3 text-gray-400">
                {organization?.contactEmail && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {organization.contactEmail}
                  </div>
                )}
                {organization?.contactPhone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {organization.contactPhone}
                  </div>
                )}
                {organization?.website && (
                  <a href={organization.website} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-orange-400 transition-colors">
                    <Globe className="h-4 w-4 mr-2" />
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 {organization?.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicOrganizationPage;
