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
      <div className="flex h-64 items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900"></div>
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-900">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-neutral-900">Organization Settings</h1>
                  <p className="text-sm text-neutral-500">{organization.name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open(`/public/organizations/${organization.slug}`, '_blank')}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-neutral-700 hover:bg-neutral-700"
              >
                <Eye className="h-4 w-4" />
                View Public Page
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{success}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Organization Info Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-2xl border border-neutral-200 bg-white mb-6">
          <div className="px-6 py-5 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Organization Information</h2>
            <p className="mt-1 text-sm text-neutral-500">Basic details about your organization</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-600">
                  Organization Name
                </label>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900">
                  {organization.name}
                </div>
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-600">
                  Organization Slug
                </label>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900">
                  {organization.slug}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-neutral-600">
                  Public URL
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900">
                    {window.location.origin}/public/organizations/{organization.slug}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/public/organizations/${organization.slug}`);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-neutral-700 hover:bg-neutral-700"
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
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white">
          <div className="px-6 py-5 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Club Management</h2>
            <p className="mt-1 text-sm text-neutral-500">Manage members, announcements, email campaigns, and ratings</p>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-neutral-200 bg-white">
            <nav className="flex flex-wrap gap-2 px-6 py-4" aria-label="Club Features">
              <button
                onClick={() => setActiveClubTab('members')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  activeClubTab === 'members'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Members</span>
              </button>
              <button
                onClick={() => setActiveClubTab('announcements')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  activeClubTab === 'announcements'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
                }`}
              >
                <Bell className="h-4 w-4" />
                <span>Announcements</span>
              </button>
              <button
                onClick={() => setActiveClubTab('emails')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  activeClubTab === 'emails'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
                }`}
              >
                <Mail className="h-4 w-4" />
                <span>Email Campaigns</span>
              </button>
              <button
                onClick={() => setActiveClubTab('ratings')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  activeClubTab === 'ratings'
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
                }`}
              >
                <Trophy className="h-4 w-4" />
                <span>Ratings</span>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="px-6 pb-6">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 min-h-[480px]">
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
        </div>

        {/* Quick Actions */}
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white">
          <div className="px-6 py-5 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-neutral-500">Common tasks for managing your organization</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <button
                onClick={() => navigate(`/organizations/${id}/tournaments`)}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-300 hover:text-neutral-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
                  <Trophy className="h-5 w-5 text-neutral-900" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-neutral-900">Manage Tournaments</div>
                  <div className="text-sm text-neutral-500">Create and manage tournaments</div>
                </div>
              </button>
              
              <button
                onClick={() => navigate(`/organizations/${id}/members`)}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-300 hover:text-neutral-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
                  <Users className="h-5 w-5 text-neutral-900" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-neutral-900">Manage Members</div>
                  <div className="text-sm text-neutral-500">Invite and manage team members</div>
                </div>
              </button>
              
              <button
                onClick={() => window.open(`/public/organizations/${organization.slug}`, '_blank')}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-neutral-300 hover:text-neutral-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
                  <Globe className="h-5 w-5 text-neutral-900" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-neutral-900">View Public Page</div>
                  <div className="text-sm text-neutral-500">See how your organization appears publicly</div>
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
