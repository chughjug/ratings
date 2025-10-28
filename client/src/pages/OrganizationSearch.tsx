import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Building2, MapPin, Globe, ArrowRight, Trophy, Users, Calendar } from 'lucide-react';
import PairCraftLogo from '../components/PairCraftLogo';
import { organizationApi } from '../services/organizationApi';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  contactEmail?: string;
  city?: string;
  state?: string;
  country?: string;
  tournamentCount?: number;
}

const OrganizationSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load all organizations on component mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await organizationApi.searchOrganizations();
      if (response.success) {
        setOrganizations(response.data.organizations);
      } else {
        setError('Failed to load organizations');
      }
    } catch (err: any) {
      setError('Failed to load organizations');
      console.error('Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const response = await organizationApi.searchOrganizations(searchQuery.trim() || undefined);
      if (response.success) {
        setOrganizations(response.data.organizations);
      } else {
        setError('Failed to search organizations');
      }
    } catch (err: any) {
      setError('Failed to search organizations');
      console.error('Error searching organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationClick = (slug: string) => {
    navigate(`/public/organizations/${slug}`);
  };

  // Since we're using API search, we don't need client-side filtering
  const filteredOrganizations = organizations;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/public" className="flex items-center">
              <PairCraftLogo size="md" showText={true} />
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/public/tournaments"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                All Tournaments
              </Link>
              <Link
                to="/public"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                For Directors
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Find Chess Organizations
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover chess organizations and their tournaments
          </p>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search organizations by name, location, or description..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Organizations List */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md mx-auto">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Building2 className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No organizations found' : 'No organizations available'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try adjusting your search terms or browse all organizations'
                  : 'Check back later for available organizations'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    loadOrganizations();
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear search and show all
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {searchQuery ? `Search Results (${filteredOrganizations.length})` : 'All Organizations'}
                </h2>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      loadOrganizations();
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrganizations.map((organization) => (
                  <div
                    key={organization.id}
                    onClick={() => handleOrganizationClick(organization.slug)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  >
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        {organization.logoUrl ? (
                          <img
                            src={organization.logoUrl}
                            alt={`${organization.name} logo`}
                            className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {organization.name}
                          </h3>
                          {organization.description && (
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                              {organization.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {(organization.city || organization.state) && (
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>
                                  {organization.city && organization.state
                                    ? `${organization.city}, ${organization.state}`
                                    : organization.city || organization.state}
                                </span>
                              </div>
                            )}
                            {organization.tournamentCount !== undefined && (
                              <div className="flex items-center">
                                <Trophy className="h-4 w-4 mr-1" />
                                <span>{organization.tournamentCount} tournaments</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center text-blue-600 hover:text-blue-800">
                          <span className="text-sm font-medium">View tournaments</span>
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
                        {organization.website && (
                          <a
                            href={organization.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <PairCraftLogo size="md" showText={true} />
              <p className="mt-4 text-gray-400">
                Professional chess tournament management made simple.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/public/tournaments" className="text-gray-400 hover:text-white">All Tournaments</Link></li>
                <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Organization Search</li>
                <li>Public Tournament Views</li>
                <li>Swiss System Pairings</li>
                <li>Real-time Standings</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PairCraft. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OrganizationSearch;
