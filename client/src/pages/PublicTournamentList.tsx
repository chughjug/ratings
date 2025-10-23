import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Clock, Users, MapPin, ExternalLink, Search, Home, Grid, CalendarDays } from 'lucide-react';
import { tournamentApi } from '../services/api';
import PairCraftLogo from '../components/PairCraftLogo';
import CalendarView from '../components/CalendarView';

interface Tournament {
  id: string;
  name: string;
  format: string;
  rounds: number;
  start_date?: string;
  end_date?: string;
  status: string;
  city?: string;
  state?: string;
  location?: string;
  expected_players?: number;
  website?: string;
  created_at: string;
  time_control?: string;
  chief_td_name?: string;
  chief_arbiter_name?: string;
  fide_rated?: boolean;
  uscf_rated?: boolean;
  settings?: any;
}

const PublicTournamentList: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await tournamentApi.getAll();
      
      if (response.data.success) {
        // Filter to show only tournaments that are accepting registrations
        const publicTournaments = response.data.data.filter((tournament: Tournament) => 
          tournament.status === 'created' || tournament.status === 'active'
        );
        setTournaments(publicTournaments);
      } else {
        throw new Error('Failed to fetch tournaments');
      }
    } catch (error: any) {
      console.error('Error fetching tournaments:', error);
      setError('Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'created':
        return 'Open for Registration';
      case 'active':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tournament.state?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded">
            <p className="font-medium mb-2">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchTournaments}
            className="inline-flex items-center space-x-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors text-sm"
          >
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Navigation Bar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/public/tournaments" className="flex items-center">
              <PairCraftLogo size="sm" showText={true} />
            </Link>
            
            <Link
              to="/"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-black text-sm"
            >
              <Home className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Chess Tournaments
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Discover and register for upcoming chess tournaments. Find your perfect competition and showcase your skills.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search and Filter */}
        <div className="bg-white border border-gray-200 rounded mb-8 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <h2 className="text-lg font-semibold text-black mb-4 lg:mb-0">Find your tournament</h2>
            
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>Calendar</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tournaments by name, city, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                />
              </div>
            </div>
            <div className="md:w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="all">All Status</option>
                <option value="created">Open for Registration</option>
                <option value="active">In Progress</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tournaments Display */}
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-black mb-2">No tournaments found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search criteria to find more tournaments'
                : 'No tournaments are currently accepting registrations'
              }
            </p>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView 
            tournaments={filteredTournaments}
            onTournamentClick={(tournament) => {
              // Optional: Handle tournament click in calendar view
              console.log('Tournament clicked:', tournament);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
                <div key={tournament.id} className="bg-white border border-gray-200 rounded hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Tournament Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-black mb-3">
                        {tournament.name}
                      </h3>
                      <div className="flex items-center space-x-3 mb-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded ${
                          tournament.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : tournament.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getStatusText(tournament.status)}
                        </span>
                      </div>
                    </div>
                    {tournament.website && (
                      <a
                        href={tournament.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Visit tournament website"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Tournament Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Format:</span>
                      <span className="ml-2 capitalize text-black">{tournament.format.replace('-', ' ')}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Rounds:</span>
                      <span className="ml-2 text-black">{tournament.rounds}</span>
                    </div>

                    {tournament.time_control && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium">Time Control:</span>
                        <span className="ml-2 text-black">{tournament.time_control}</span>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Date:</span>
                      <span className="ml-2 text-black">
                        {tournament.start_date && tournament.end_date && tournament.start_date !== tournament.end_date
                          ? `${formatDate(tournament.start_date)} - ${formatDate(tournament.end_date)}`
                          : formatDate(tournament.start_date)
                        }
                      </span>
                    </div>

                    {(tournament.city || tournament.state) && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium">Location:</span>
                        <span className="ml-2 text-black">
                          {tournament.city && tournament.state 
                            ? `${tournament.city}, ${tournament.state}`
                            : tournament.city || tournament.state
                          }
                        </span>
                      </div>
                    )}

                    {tournament.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium">Venue:</span>
                        <span className="ml-2 text-black">{tournament.location}</span>
                      </div>
                    )}

                    {tournament.expected_players && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium">Expected:</span>
                        <span className="ml-2 text-black">{tournament.expected_players} players</span>
                      </div>
                    )}

                    {(tournament.chief_td_name || tournament.chief_arbiter_name) && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium">Officials:</span>
                        <span className="ml-2 text-black">
                          {tournament.chief_td_name && `TD: ${tournament.chief_td_name}`}
                          {tournament.chief_td_name && tournament.chief_arbiter_name && ', '}
                          {tournament.chief_arbiter_name && `Arbiter: ${tournament.chief_arbiter_name}`}
                        </span>
                      </div>
                    )}

                    {(tournament.uscf_rated || tournament.fide_rated) && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium">Rated:</span>
                        <span className="ml-2 text-black">
                          {tournament.uscf_rated && 'USCF'}
                          {tournament.uscf_rated && tournament.fide_rated && ' / '}
                          {tournament.fide_rated && 'FIDE'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Link
                      to={`/register/${tournament.id}`}
                      className="flex-1 bg-black text-white text-center py-2 px-4 rounded hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                      Register
                    </Link>
                    <Link
                      to={`/public/tournaments/${tournament.id}`}
                      className="flex-1 border border-gray-300 text-gray-700 text-center py-2 px-4 rounded hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 py-12 border-t border-gray-200">
          <div className="bg-white border border-gray-200 rounded p-8 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-black mb-4">Organize your own tournament</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Ready to create and manage your own chess tournament? Our professional tournament management system makes it easy to organize world-class events.
            </p>
            <a 
              href="/" 
              className="inline-flex items-center space-x-2 bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Trophy className="h-4 w-4" />
              <span>Get Started</span>
            </a>
          </div>
        </div>
        </div>
      </div>
  );
};

export default PublicTournamentList;


