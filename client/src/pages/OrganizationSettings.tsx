import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Upload, 
  X, 
  Palette, 
  Type, 
  Image, 
  Layout, 
  Globe, 
  Users,
  Settings,
  Building2,
  AlertCircle,
  Trophy,
  Bell,
  Mail
} from 'lucide-react';
import { organizationApi } from '../services/organizationApi';
import OrganizationCustomization from '../components/OrganizationCustomization';
import AdvancedCustomization from '../components/AdvancedCustomization';
import WidgetManager from '../components/WidgetManager';
import PaymentSettings from '../components/PaymentSettings';
import ClubMembersManager from '../components/ClubMembersManager';
import ClubAnnouncementsManager from '../components/ClubAnnouncementsManager';
import ClubEmailCampaignManager from '../components/ClubEmailCampaignManager';
import ClubRatingsManager from '../components/ClubRatingsManager';

interface OrganizationSettingsProps {}

const OrganizationSettings: React.FC<OrganizationSettingsProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeClubTab, setActiveClubTab] = useState<'members' | 'announcements' | 'emails' | 'ratings'>('members');

  useEffect(() => {
    if (id) {
      loadOrganization();
    }
  }, [id]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await organizationApi.getOrganization(id!);
      if (response.success) {
        setOrganization(response.data.organization);
      } else {
        setError('Failed to load organization');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomization = async (customization: any) => {
    try {
      setSaving(true);
      setError(null);
      
      // Merge customization with existing settings
      const updatedSettings = {
        ...organization.settings,
        ...customization
      };

      const response = await organizationApi.updateOrganization(id!, {
        settings: updatedSettings,
        logoUrl: customization.branding?.logoUrl || organization.logoUrl,
        description: organization.description,
        website: organization.website,
        contactEmail: organization.contactEmail,
        contactPhone: organization.contactPhone,
        city: organization.city,
        state: organization.state,
        country: organization.country
      });

      if (response.success) {
        setSuccess('Organization settings saved successfully!');
        setOrganization((prev: any) => ({
          ...prev,
          settings: updatedSettings,
          logoUrl: customization.branding?.logoUrl || prev.logoUrl
        }));
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to save organization settings');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save organization settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = (customization: any) => {
    // Open organization public page in new tab with preview mode
    const previewUrl = `/public/organizations/${organization.slug}?preview=true`;
    window.open(previewUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
          <p className="text-gray-600">The organization you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Organization Settings</h1>
                  <p className="text-sm text-gray-600">{organization.name}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open(`/public/organizations/${organization.slug}`, '_blank')}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Public Page
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Organization Info Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Organization Information</h2>
            <p className="text-sm text-gray-600 mt-1">Basic information about your organization</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
                  {organization.name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Slug
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
                  {organization.slug}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Public URL
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
                    {window.location.origin}/public/organizations/{organization.slug}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/public/organizations/${organization.slug}`);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customization Component */}
        <OrganizationCustomization
          organization={organization}
          onSave={handleSaveCustomization}
          onPreview={handlePreview}
          isEditing={true}
        />

        {/* Payment Settings */}
        <PaymentSettings
          organizationId={id!}
          organization={organization}
          onSave={async (credentials: any) => {
            console.log('💳 Saving organization payment credentials:', credentials);
            try {
              const response = await organizationApi.updateOrganization(id!, credentials);
              if (response.success) {
                setOrganization(response.data.organization);
                console.log('✅ Organization payment credentials saved successfully');
              }
            } catch (error: any) {
              console.error('Failed to save organization payment credentials:', error);
              alert(`Failed to save payment credentials: ${error.message || error}`);
            }
          }}
        />

        {/* Club Features Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <h2 className="text-xl font-bold text-gray-900">Club Management</h2>
            <p className="text-sm text-gray-600 mt-1">Manage members, announcements, email campaigns, and ratings</p>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex space-x-1 px-6 overflow-x-auto" aria-label="Club Features">
              <button
                onClick={() => setActiveClubTab('members')}
                className={`flex items-center space-x-2 py-4 px-4 font-medium text-sm whitespace-nowrap transition-all ${
                  activeClubTab === 'members'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Members</span>
              </button>
              <button
                onClick={() => setActiveClubTab('announcements')}
                className={`flex items-center space-x-2 py-4 px-4 font-medium text-sm whitespace-nowrap transition-all ${
                  activeClubTab === 'announcements'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Bell className="h-4 w-4" />
                <span>Announcements</span>
              </button>
              <button
                onClick={() => setActiveClubTab('emails')}
                className={`flex items-center space-x-2 py-4 px-4 font-medium text-sm whitespace-nowrap transition-all ${
                  activeClubTab === 'emails'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Mail className="h-4 w-4" />
                <span>Email Campaigns</span>
              </button>
              <button
                onClick={() => setActiveClubTab('ratings')}
                className={`flex items-center space-x-2 py-4 px-4 font-medium text-sm whitespace-nowrap transition-all ${
                  activeClubTab === 'ratings'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Trophy className="h-4 w-4" />
                <span>Ratings</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 bg-gray-50 min-h-[500px]">
            {activeClubTab === 'members' && (
              <ClubMembersManager organizationId={id!} />
            )}
            {activeClubTab === 'announcements' && (
              <ClubAnnouncementsManager organizationId={id!} />
            )}
            {activeClubTab === 'emails' && (
              <ClubEmailCampaignManager organizationId={id!} />
            )}
            {activeClubTab === 'ratings' && (
              <ClubRatingsManager organizationId={id!} />
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <p className="text-sm text-gray-600 mt-1">Common tasks for managing your organization</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(`/organizations/${id}/tournaments`)}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Trophy className="h-6 w-6 text-blue-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Manage Tournaments</div>
                  <div className="text-sm text-gray-600">Create and manage tournaments</div>
                </div>
              </button>
              
              <button
                onClick={() => navigate(`/organizations/${id}/members`)}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="h-6 w-6 text-green-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Manage Members</div>
                  <div className="text-sm text-gray-600">Invite and manage team members</div>
                </div>
              </button>
              
              <button
                onClick={() => window.open(`/public/organizations/${organization.slug}`, '_blank')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Globe className="h-6 w-6 text-purple-600 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">View Public Page</div>
                  <div className="text-sm text-gray-600">See how your organization appears publicly</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
