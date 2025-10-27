import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';
import { Key, Plus, Trash2, Edit, Copy, Eye, EyeOff, RefreshCw, Building2 } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  description: string;
  permissions: string;
  rate_limit: number;
  usage_count: number;
  last_used: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { state: orgState, createOrganization: createOrgFromContext, setCurrentOrganization } = useOrganization();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    description: '',
    website: '',
    contactEmail: ''
  });
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    description: '',
    permissions: 'read,write',
    rate_limit: 1000
  });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await userApi.getApiKeys(user.id);
      if (response.data.success) {
        setApiKeys(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    if (!user) return;
    
    try {
      const response = await userApi.generateApiKey(user.id, newKeyData);
      if (response.data.success) {
        setGeneratedKey(response.data.data.api_key);
        setNewKeyData({
          name: '',
          description: '',
          permissions: 'read,write',
          rate_limit: 1000
        });
        setShowNewKeyForm(false);
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!user) return;
    
    if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await userApi.revokeApiKey(user.id, keyId);
      if (response.data.success) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
    });
  };

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const createOrganization = async () => {
    if (!orgFormData.name.trim()) {
      alert('Organization name is required');
      return;
    }

    setOrgLoading(true);
    try {
      const newOrg = await createOrgFromContext(orgFormData);
      alert('Organization created successfully!');
      setOrgFormData({
        name: '',
        description: '',
        website: '',
        contactEmail: ''
      });
      setShowOrgForm(false);
      // Optionally set it as current organization
      if (newOrg) {
        setCurrentOrganization(newOrg);
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Error creating organization. Please try again.');
    } finally {
      setOrgLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (isActive: boolean, expiresAt: string) => {
    if (!isActive) return 'bg-red-100 text-red-800';
    if (new Date(expiresAt) < new Date()) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (isActive: boolean, expiresAt: string) => {
    if (!isActive) return 'Inactive';
    if (new Date(expiresAt) < new Date()) return 'Expired';
    return 'Active';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h1>
          <p className="text-gray-600">You need to be logged in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
            <p className="text-gray-600">Manage your account and API keys</p>
          </div>

          <div className="p-6">
            {/* User Information */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <p className="mt-1 text-sm text-gray-900">{user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Since</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Organizations Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Organizations</h2>
                <button
                  onClick={() => setShowOrgForm(!showOrgForm)}
                  className="flex items-center space-x-2 bg-orange-800 text-white px-4 py-2 rounded-lg hover:bg-orange-900 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Organization</span>
                </button>
              </div>

              {/* Create Organization Form */}
              {showOrgForm && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Create New Organization</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
                      <input
                        type="text"
                        value={orgFormData.name}
                        onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="My Chess Club"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={orgFormData.description}
                        onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Tell us about your organization..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input
                        type="url"
                        value={orgFormData.website}
                        onChange={(e) => setOrgFormData({ ...orgFormData, website: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                      <input
                        type="email"
                        value={orgFormData.contactEmail}
                        onChange={(e) => setOrgFormData({ ...orgFormData, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => {
                        setShowOrgForm(false);
                        setOrgFormData({ name: '', description: '', website: '', contactEmail: '' });
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      disabled={orgLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createOrganization}
                      disabled={orgLoading}
                      className="px-4 py-2 bg-orange-800 text-white rounded-md hover:bg-orange-900 disabled:bg-gray-400 transition-colors"
                    >
                      {orgLoading ? 'Creating...' : 'Create Organization'}
                    </button>
                  </div>
                </div>
              )}

              {/* Organizations List */}
              {orgState.organizations && orgState.organizations.length > 0 ? (
                <div className="space-y-4">
                  {orgState.organizations.map((org) => (
                    <div key={org.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Building2 className="h-6 w-6 text-orange-900 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-md font-semibold text-gray-900">{org.name}</h3>
                          {org.description && <p className="text-sm text-gray-600 mt-1">{org.description}</p>}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-orange-900 hover:underline">{org.website}</a>}
                            {org.contactEmail && <span>{org.contactEmail}</span>}
                          </div>
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              org.role === 'owner'
                                ? 'bg-purple-100 text-purple-800'
                                : org.role === 'admin'
                                ? 'bg-orange-200 text-orange-900'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {org.role ? org.role.charAt(0).toUpperCase() + org.role.slice(1) : 'Member'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-gray-200 rounded-lg">
                  <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">No organizations yet</p>
                  <p className="text-sm text-gray-500">Create your first organization to manage tournaments</p>
                </div>
              )}
            </div>

            {/* API Keys Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
                <button
                  onClick={() => setShowNewKeyForm(true)}
                  className="flex items-center space-x-2 bg-orange-800 text-white px-4 py-2 rounded-lg hover:bg-orange-900 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Generate New Key</span>
                </button>
              </div>

              {/* New Key Form */}
              {showNewKeyForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Generate New API Key</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        value={newKeyData.name}
                        onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="My API Key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rate Limit</label>
                      <input
                        type="number"
                        value={newKeyData.rate_limit}
                        onChange={(e) => setNewKeyData({ ...newKeyData, rate_limit: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="1"
                        max="10000"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <input
                        type="text"
                        value={newKeyData.description}
                        onChange={(e) => setNewKeyData({ ...newKeyData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Description of this API key's purpose"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                      <select
                        value={newKeyData.permissions}
                        onChange={(e) => setNewKeyData({ ...newKeyData, permissions: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="read">Read Only</option>
                        <option value="write">Write Only</option>
                        <option value="read,write">Read & Write</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => setShowNewKeyForm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={generateApiKey}
                      className="px-4 py-2 bg-orange-800 text-white rounded-md hover:bg-orange-900"
                    >
                      Generate Key
                    </button>
                  </div>
                </div>
              )}

              {/* Generated Key Display */}
              {generatedKey && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="text-md font-semibold text-green-900 mb-2">New API Key Generated</h3>
                  <p className="text-sm text-green-800 mb-3">
                    Please copy this API key now. You won't be able to see it again.
                  </p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-green-100 px-3 py-2 rounded font-mono text-sm">
                      {generatedKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedKey)}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => setGeneratedKey(null)}
                    className="mt-2 text-sm text-green-600 hover:text-green-800"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* API Keys List */}
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-600">Loading API keys...</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-600">No API keys found</p>
                  <p className="text-sm text-gray-500">Generate your first API key to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-md font-semibold text-gray-900">{apiKey.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(apiKey.is_active, apiKey.expires_at)}`}>
                              {getStatusText(apiKey.is_active, apiKey.expires_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{apiKey.description}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                            <div>
                              <span className="font-medium">Permissions:</span> {apiKey.permissions}
                            </div>
                            <div>
                              <span className="font-medium">Rate Limit:</span> {apiKey.rate_limit}/hour
                            </div>
                            <div>
                              <span className="font-medium">Usage:</span> {apiKey.usage_count} requests
                            </div>
                            <div>
                              <span className="font-medium">Created:</span> {formatDate(apiKey.created_at)}
                            </div>
                          </div>
                          {apiKey.last_used && (
                            <div className="text-sm text-gray-500 mt-1">
                              <span className="font-medium">Last Used:</span> {formatDate(apiKey.last_used)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleApiKeyVisibility(apiKey.id)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Toggle API key visibility"
                          >
                            {showApiKey[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.name)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Copy API key name"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => revokeApiKey(apiKey.id)}
                            className="p-2 text-red-400 hover:text-red-600"
                            title="Revoke API key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {showApiKey[apiKey.id] && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center space-x-2">
                            <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm">
                              {apiKey.name}
                            </code>
                            <button
                              onClick={() => copyToClipboard(apiKey.name)}
                              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;