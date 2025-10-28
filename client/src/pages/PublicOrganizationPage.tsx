import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building2, 
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
  Filter,
  Grid,
  List,
  ArrowRight,
  Clock,
  Star,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  Activity,
  BarChart3,
  Eye,
  Zap,
  Megaphone
} from 'lucide-react';
import { organizationApi } from '../services/organizationApi';
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

  useEffect(() => {
    if (slug) {
      loadOrganizationData();
    }
  }, [slug]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load organization data and tournaments in parallel
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
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizationData();
  }, [slug, filterStatus, filterFormat, currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'created':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
          <p className="text-gray-600">The organization you're looking for doesn't exist or is not public.</p>
        </div>
      </div>
    );
  }

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return Facebook;
      case 'twitter': return Twitter;
      case 'instagram': return Instagram;
      case 'youtube': return Youtube;
      case 'discord': return MessageCircle;
      case 'linkedin': return Globe; // You can import LinkedIn icon if available
      case 'twitch': return Globe; // You can import Twitch icon if available
      case 'tiktok': return Globe; // You can import TikTok icon if available
      default: return Globe;
    }
  };

  const getSocialColor = (platform: string) => {
    switch (platform) {
      case 'facebook': return 'text-blue-600 hover:text-blue-700';
      case 'twitter': return 'text-blue-400 hover:text-blue-500';
      case 'instagram': return 'text-pink-500 hover:text-pink-600';
      case 'youtube': return 'text-red-600 hover:text-red-700';
      case 'discord': return 'text-indigo-600 hover:text-indigo-700';
      case 'linkedin': return 'text-blue-700 hover:text-blue-800';
      case 'twitch': return 'text-purple-600 hover:text-purple-700';
      case 'tiktok': return 'text-black hover:text-gray-800';
      default: return 'text-gray-600 hover:text-gray-700';
    }
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

  const renderTournamentCard = (tournament: any) => (
    <div
      key={tournament.id}
      className={`transition-all duration-200 ${
        cardStyle === 'minimal' ? 'bg-transparent border-0 shadow-none' :
        cardStyle === 'elevated' ? 'shadow-xl hover:shadow-2xl' :
        'shadow hover:shadow-lg'
      }`}
      style={{
        backgroundColor: cardStyle === 'minimal' ? 'transparent' : (organization?.settings?.theme?.backgroundColor || '#FFFFFF'),
        borderRadius: organization?.settings?.theme?.borderRadius || '8px',
        borderColor: organization?.settings?.theme?.borderColor || '#E5E7EB',
        border: cardStyle === 'minimal' ? 'none' : `1px solid ${organization?.settings?.theme?.borderColor || '#E5E7EB'}`
      }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 
              className="text-lg font-semibold line-clamp-2 mb-1"
              style={{ color: organization?.settings?.theme?.textColor || '#1F2937' }}
            >
              {tournament.name}
            </h3>
            <div className="flex items-center space-x-2 mb-2">
              {React.createElement(getFormatIcon(tournament.format), { className: "h-4 w-4 text-gray-500" })}
              <span className="text-sm text-gray-600 capitalize">
                {tournament.format.replace('-', ' ')}
              </span>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadge(tournament.status)}`}>
            {tournament.status}
          </span>
        </div>

        <div className="space-y-3 text-sm text-gray-600 mb-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              Rounds
            </span>
            <span className="font-medium">{tournament.rounds}</span>
          </div>
          
          {tournament.timeControl && (
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                Time Control
              </span>
              <span className="font-medium">{tournament.timeControl}</span>
            </div>
          )}
          
          {tournament.startDate && (
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                Start Date
              </span>
              <span className="font-medium">{formatDate(tournament.startDate)}</span>
            </div>
          )}
          
          {tournament.location && (
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                Location
              </span>
              <span className="font-medium truncate ml-2">{tournament.location}</span>
            </div>
          )}

          {tournament.fideRated && (
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-2 text-yellow-500" />
              <span className="text-xs text-yellow-700 font-medium">FIDE Rated</span>
            </div>
          )}

          {tournament.uscfRated && (
            <div className="flex items-center">
              <Award className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-xs text-blue-700 font-medium">USCF Rated</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <Link
            to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
          >
            View Tournament
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
          {tournament.allowRegistration && tournament.status === 'created' && (
            <Link
              to={`/register/${tournament.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium"
            >
              Register
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  const renderTournamentList = (tournament: any) => (
    <div
      key={tournament.id}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{tournament.name}</h3>
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadge(tournament.status)}`}>
              {tournament.status}
            </span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <span className="flex items-center">
              {React.createElement(getFormatIcon(tournament.format), { className: "h-4 w-4 mr-2" })}
              {tournament.format.replace('-', ' ')}
            </span>
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {tournament.rounds} rounds
            </span>
            {tournament.startDate && (
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {formatDate(tournament.startDate)}
              </span>
            )}
            {tournament.location && (
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                {tournament.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
          >
            View
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
          {tournament.allowRegistration && tournament.status === 'created' && (
            <Link
              to={`/register/${tournament.id}`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium"
            >
              Register
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  // Apply custom styling based on organization settings
  const customStyles = organization?.settings ? {
    '--primary-color': organization.settings.theme?.primaryColor || '#3B82F6',
    '--secondary-color': organization.settings.theme?.secondaryColor || '#1E40AF',
    '--background-color': organization.settings.theme?.backgroundColor || '#FFFFFF',
    '--text-color': organization.settings.theme?.textColor || '#1F2937',
    '--accent-color': organization.settings.theme?.accentColor || '#F59E0B',
    '--border-color': organization.settings.theme?.borderColor || '#E5E7EB',
    '--hover-color': organization.settings.theme?.hoverColor || '#F3F4F6',
    '--border-radius': organization.settings.theme?.borderRadius || '8px',
    '--spacing': organization.settings.theme?.spacing || '16px'
  } as React.CSSProperties : {};

  const headerStyle = organization?.settings?.layout?.headerStyle || 'default';
  const cardStyle = organization?.settings?.layout?.cardStyle || 'default';
  const showStats = organization?.settings?.layout?.showStats !== false;
  const showSocialLinks = organization?.settings?.layout?.showSocialLinks !== false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Custom CSS Injection */}
      {organization?.settings?.branding?.customCss && (
        <style dangerouslySetInnerHTML={{ __html: organization.settings.branding.customCss }} />
      )}
      
      {/* Custom Font Loading */}
      {organization?.settings?.branding?.customFontUrl && (
        <link rel="stylesheet" href={organization.settings.branding.customFontUrl} />
      )}

      {/* Hero Header with Orange Gradient */}
      <div className="relative bg-gradient-to-br from-orange-600 via-orange-700 to-red-600 text-white shadow-2xl overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {organization?.logoUrl && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                  <img
                    src={organization.logoUrl}
                    alt={`${organization.name} logo`}
                    className="relative h-24 w-24 object-cover rounded-2xl border-2 border-white/30 shadow-2xl"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 drop-shadow-lg">
                  {organization.settings?.branding?.headerText || organization?.name}
                </h1>
                {(organization?.description || organization.settings?.branding?.tagline) && (
                  <p className="text-xl text-blue-100 mb-6 max-w-3xl font-medium">
                    {organization.settings?.branding?.tagline || organization.description}
                  </p>
                )}
                
                {/* Contact Info with Modern Style */}
                <div className="flex flex-wrap items-center gap-6 text-sm mb-6">
                  {organization?.website && (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-white/20 transition-all border border-white/20"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  )}
                  {organization?.contactEmail && (
                    <div className="flex items-center text-blue-100">
                      <Mail className="h-4 w-4 mr-2" />
                      {organization.contactEmail}
                    </div>
                  )}
                  {organization?.contactPhone && (
                    <div className="flex items-center text-blue-100">
                      <Phone className="h-4 w-4 mr-2" />
                      {organization.contactPhone}
                    </div>
                  )}
                  {(organization?.city || organization?.state) && (
                    <div className="flex items-center text-blue-100">
                      <MapPin className="h-4 w-4 mr-2" />
                      {organization?.city && organization?.state
                        ? `${organization.city}, ${organization.state}`
                        : organization?.city || organization?.state}
                    </div>
                  )}
                </div>

                {/* Social Links with Glass Effect */}
                {showSocialLinks && organization?.settings?.social && Object.keys(organization.settings.social).length > 0 && (
                  <div className="flex items-center space-x-3">
                    {Object.entries(organization.settings.social).map(([platform, url]) => {
                      if (!url) return null;
                      const Icon = getSocialIcon(platform);
                      return (
                        <a
                          key={platform}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 border border-white/20 transition-all hover:scale-110"
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section with Modern Cards */}
      {showStats && stats && (
        <div className="relative -mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all border border-gray-100">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-3 shadow-lg">
                  <Trophy className="h-7 w-7 text-white" />
                </div>
                <div className="text-3xl font-extrabold text-gray-900 text-center mb-1">
                  {stats.tournaments.total_tournaments}
                </div>
                <div className="text-sm text-gray-600 text-center font-medium">
                  Total Tournaments
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all border border-gray-100">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 mx-auto mb-3 shadow-lg">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div className="text-3xl font-extrabold text-gray-900 text-center mb-1">
                  {stats.tournaments.active_tournaments}
                </div>
                <div className="text-sm text-gray-600 text-center font-medium">
                  Active Now
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all border border-gray-100">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 mx-auto mb-3 shadow-lg">
                  <Award className="h-7 w-7 text-white" />
                </div>
                <div className="text-3xl font-extrabold text-gray-900 text-center mb-1">
                  {stats.tournaments.completed_tournaments}
                </div>
                <div className="text-sm text-gray-600 text-center font-medium">
                  Completed
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all border border-gray-100">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 mx-auto mb-3 shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="text-3xl font-extrabold text-gray-900 text-center mb-1">
                  {stats.players.total_players}
                </div>
                <div className="text-sm text-gray-600 text-center font-medium">
                  Total Players
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Sections - Upcoming & Active Tournaments */}
      {(upcomingTournaments.length > 0 || activeTournaments.length > 0) && (
        <div className="py-12 bg-gradient-to-b from-white to-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Upcoming Tournaments */}
              {upcomingTournaments.length > 0 && (
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-300/20 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Upcoming Tournaments</h3>
                    </div>
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm text-orange-100 mb-4">Get ready for these exciting events!</p>
                  <div className="space-y-3">
                    {upcomingTournaments.map((tournament: any) => (
                      <Link
                        key={tournament.id}
                        to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
                        className="block p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{tournament.name}</h4>
                            <div className="flex items-center space-x-3 text-sm text-orange-100">
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {formatDate(tournament.startDate)}
                              </span>
                              <span className="flex items-center">
                                <Trophy className="h-4 w-4 mr-1" />
                                {tournament.rounds} rounds
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-white flex-shrink-0" />
                        </div>
                        {tournament.allowRegistration && (
                          <button className="mt-2 w-full text-center py-1.5 bg-white text-orange-600 rounded-md text-sm font-bold hover:bg-orange-50 transition-colors">
                            Register Now
                          </button>
                        )}
                      </Link>
                    ))}
                  </div>
                  <Link
                    to={`/public/organizations/${organization?.slug}`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-white hover:text-orange-200"
                  >
                    View all upcoming tournaments
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              )}

              {/* Active Tournaments */}
              {activeTournaments.length > 0 && (
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/20 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Active Now</h3>
                        <p className="text-sm text-orange-100">Games in progress</p>
                      </div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold">
                      LIVE
                    </div>
                  </div>
                  <div className="space-y-3">
                    {activeTournaments.map((tournament: any) => (
                      <Link
                        key={tournament.id}
                        to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
                        className="block p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{tournament.name}</h4>
                            <div className="flex items-center space-x-3 text-sm text-orange-100">
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Round {tournament.currentRound || 1}
                              </span>
                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {tournament.playerCount || 0} players
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-white flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link
                    to={`/public/organizations/${organization?.slug}?status=active`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-white hover:text-orange-200"
                  >
                    View all active tournaments
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournaments</h2>
            <p className="text-gray-600">
              Browse tournaments organized by {organization?.name}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Filters */}
            <div className="flex items-center space-x-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="created">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Formats</option>
                <option value="swiss">Swiss</option>
                <option value="round-robin">Round Robin</option>
                <option value="team-swiss">Team Swiss</option>
                <option value="blitz">Blitz</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tournaments */}
        {tournaments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Trophy className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tournaments Found</h3>
            <p className="text-gray-600">
              {filterStatus !== 'all' || filterFormat !== 'all'
                ? 'No tournaments match your current filters.'
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
              {tournaments.map(viewMode === 'grid' ? renderTournamentCard : renderTournamentList)}
            </div>

            {/* Pagination */}
            {pagination && pagination.total > pagination.limit && (
              <div className="flex items-center justify-between mt-8">
                <div className="text-sm text-gray-700">
                  Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} tournaments
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <span className="px-3 py-2 text-sm font-medium text-gray-700">
                    Page {currentPage} of {Math.ceil(pagination.total / pagination.limit)}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasMore}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose {organization?.name}?</h2>
            <p className="text-lg text-gray-600">Professional tournament management with cutting-edge features</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 border border-orange-200">
                <Trophy className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automated Swiss Pairings</h3>
              <p className="text-gray-700 leading-relaxed">
                Advanced pairing algorithms ensure fair and competitive matches every round.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 border border-orange-200">
                <Users className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Player Management</h3>
              <p className="text-gray-700 leading-relaxed">
                Comprehensive player registration, rating tracking, and tournament history.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 border border-orange-200">
                <BarChart3 className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Live Analytics</h3>
              <p className="text-gray-700 leading-relaxed">
                Real-time standings, statistics, and tournament progress tracking.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 border border-orange-200">
                <Calendar className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Flexible Scheduling</h3>
              <p className="text-gray-700 leading-relaxed">
                Support for multiple tournament formats and customizable time controls.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 border border-orange-200">
                <Shield className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Reliable</h3>
              <p className="text-gray-700 leading-relaxed">
                Enterprise-grade security with 99.9% uptime guarantee.
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 border border-orange-200">
                <Globe className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Public Access</h3>
              <p className="text-gray-700 leading-relaxed">
                Public tournament pages for spectators and easy player registration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About {organization?.name}</h3>
              <p className="text-gray-400 leading-relaxed">
                {organization?.description || 'Professional chess tournament organization committed to excellence.'}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/public/tournaments" className="hover:text-orange-400 transition-colors">Browse Tournaments</Link></li>
                <li><Link to="/public/organizations" className="hover:text-orange-400 transition-colors">Find Organizations</Link></li>
                <li><Link to="/register" className="hover:text-orange-400 transition-colors">Register as Player</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-gray-400">
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
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 {organization?.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicOrganizationPage;
