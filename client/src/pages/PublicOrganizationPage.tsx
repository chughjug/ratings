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
    <div 
      className="min-h-screen" 
      style={{ backgroundColor: organization?.settings?.theme?.backgroundColor || '#F9FAFB' }}
    >
      {/* Custom CSS Injection */}
      {organization?.settings?.branding?.customCss && (
        <style dangerouslySetInnerHTML={{ __html: organization.settings.branding.customCss }} />
      )}
      
      {/* Custom Font Loading */}
      {organization?.settings?.branding?.customFontUrl && (
        <link rel="stylesheet" href={organization.settings.branding.customFontUrl} />
      )}

      {/* Header */}
      <div 
        className={`shadow-sm ${
          headerStyle === 'hero' ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white' :
          headerStyle === 'minimal' ? 'bg-transparent shadow-none' :
          'bg-white'
        }`}
        style={{
          backgroundColor: headerStyle === 'hero' ? undefined : (organization?.settings?.theme?.backgroundColor || '#FFFFFF'),
          color: headerStyle === 'hero' ? undefined : (organization?.settings?.theme?.textColor || '#1F2937')
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              {organization?.logoUrl && (
                <img
                  src={organization.logoUrl}
                  alt={`${organization.name} logo`}
                  className="h-20 w-20 object-cover border border-gray-200"
                  style={{
                    borderRadius: organization?.settings?.theme?.borderRadius || '8px'
                  }}
                />
              )}
              <div className="flex-1">
                <h1 
                  className="text-3xl font-bold mb-2"
                  style={{
                    color: headerStyle === 'hero' ? 'white' : (organization?.settings?.theme?.textColor || '#1F2937'),
                    fontFamily: organization?.settings?.branding?.customFont || 'inherit'
                  }}
                >
                  {organization.settings?.branding?.headerText || organization?.name}
                </h1>
                {(organization?.description || organization.settings?.branding?.tagline) && (
                  <p 
                    className="text-lg mb-4 max-w-3xl"
                    style={{
                      color: headerStyle === 'hero' ? 'rgba(255,255,255,0.8)' : (organization?.settings?.theme?.textColor || '#6B7280')
                    }}
                  >
                    {organization.settings?.branding?.tagline || organization.description}
                  </p>
                )}
                
                {/* Contact Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                  {organization?.website && (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Website
                    </a>
                  )}
                  {organization?.contactEmail && (
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {organization.contactEmail}
                    </span>
                  )}
                  {organization?.contactPhone && (
                    <span className="flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {organization.contactPhone}
                    </span>
                  )}
                  {(organization?.city || organization?.state) && (
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {organization?.city && organization?.state
                        ? `${organization.city}, ${organization.state}`
                        : organization?.city || organization?.state}
                    </span>
                  )}
                </div>

                {/* Social Links */}
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
                          className={`${getSocialColor(platform)} transition-colors`}
                          style={{
                            color: headerStyle === 'hero' ? 'white' : (organization?.settings?.theme?.primaryColor || '#3B82F6')
                          }}
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
      </div>

      {/* Stats Section */}
      {showStats && stats && (
        <div 
          className="border-b"
          style={{
            backgroundColor: organization?.settings?.theme?.backgroundColor || '#FFFFFF',
            borderColor: organization?.settings?.theme?.borderColor || '#E5E7EB'
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2"
                  style={{
                    backgroundColor: `${organization?.settings?.theme?.primaryColor || '#3B82F6'}20`,
                    borderRadius: organization?.settings?.theme?.borderRadius || '8px'
                  }}
                >
                  <Trophy 
                    className="h-6 w-6" 
                    style={{ color: organization?.settings?.theme?.primaryColor || '#3B82F6' }}
                  />
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: organization?.settings?.theme?.textColor || '#1F2937' }}
                >
                  {stats.tournaments.total_tournaments}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: organization?.settings?.theme?.textColor || '#6B7280' }}
                >
                  Total Tournaments
                </div>
              </div>
              <div className="text-center">
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2"
                  style={{
                    backgroundColor: `${organization?.settings?.theme?.accentColor || '#10B981'}20`,
                    borderRadius: organization?.settings?.theme?.borderRadius || '8px'
                  }}
                >
                  <TrendingUp 
                    className="h-6 w-6" 
                    style={{ color: organization?.settings?.theme?.accentColor || '#10B981' }}
                  />
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: organization?.settings?.theme?.textColor || '#1F2937' }}
                >
                  {stats.tournaments.active_tournaments}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: organization?.settings?.theme?.textColor || '#6B7280' }}
                >
                  Active
                </div>
              </div>
              <div className="text-center">
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2"
                  style={{
                    backgroundColor: `${organization?.settings?.theme?.secondaryColor || '#8B5CF6'}20`,
                    borderRadius: organization?.settings?.theme?.borderRadius || '8px'
                  }}
                >
                  <Award 
                    className="h-6 w-6" 
                    style={{ color: organization?.settings?.theme?.secondaryColor || '#8B5CF6' }}
                  />
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: organization?.settings?.theme?.textColor || '#1F2937' }}
                >
                  {stats.tournaments.completed_tournaments}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: organization?.settings?.theme?.textColor || '#6B7280' }}
                >
                  Completed
                </div>
              </div>
              <div className="text-center">
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2"
                  style={{
                    backgroundColor: `${organization?.settings?.theme?.primaryColor || '#F59E0B'}20`,
                    borderRadius: organization?.settings?.theme?.borderRadius || '8px'
                  }}
                >
                  <Users 
                    className="h-6 w-6" 
                    style={{ color: organization?.settings?.theme?.primaryColor || '#F59E0B' }}
                  />
                </div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: organization?.settings?.theme?.textColor || '#1F2937' }}
                >
                  {stats.players.total_players}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: organization?.settings?.theme?.textColor || '#6B7280' }}
                >
                  Players
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Sections - Upcoming & Active Tournaments */}
      {(upcomingTournaments.length > 0 || activeTournaments.length > 0) && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-t border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Upcoming Tournaments */}
              {upcomingTournaments.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Upcoming Tournaments</h3>
                    </div>
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Get ready for these exciting events!</p>
                  <div className="space-y-3">
                    {upcomingTournaments.map((tournament: any) => (
                      <Link
                        key={tournament.id}
                        to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
                        className="block p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{tournament.name}</h4>
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
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
                          <ArrowRight className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        </div>
                        {tournament.allowRegistration && (
                          <button className="mt-2 w-full text-center py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                            Register Now
                          </button>
                        )}
                      </Link>
                    ))}
                  </div>
                  <Link
                    to={`/public/organizations/${organization?.slug}`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View all upcoming tournaments
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              )}

              {/* Active Tournaments */}
              {activeTournaments.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-green-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Activity className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Active Now</h3>
                    </div>
                    <Eye className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Follow these tournaments in real-time!</p>
                  <div className="space-y-3">
                    {activeTournaments.map((tournament: any) => (
                      <Link
                        key={tournament.id}
                        to={`/public/organizations/${organization?.slug}/tournaments/${tournament.id}`}
                        className="block p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{tournament.name}</h4>
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                              <span className="flex items-center">
                                <BarChart3 className="h-4 w-4 mr-1" />
                                Live now
                              </span>
                              <span className="flex items-center">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                {tournament.rounds} rounds
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-green-600 flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link
                    to={`/public/organizations/${organization?.slug}?status=active`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800"
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
    </div>
  );
};

export default PublicOrganizationPage;
