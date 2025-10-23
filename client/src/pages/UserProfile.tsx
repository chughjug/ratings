import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Organization } from '../types';
import { Building2, Plus, Users, Settings, User } from 'lucide-react';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { state, createOrganization, setCurrentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState<'profile' | 'organizations'>('profile');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website: '',
    contactEmail: '',
    city: '',
    state: '',
    country: 'US'
  });

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newOrg = await createOrganization(createFormData);
      setCurrentOrganization(newOrg);
      setShowCreateForm(false);
      setCreateFormData({
        name: '',
        slug: '',
        description: '',
        website: '',
        contactEmail: '',
        city: '',
        state: '',
        country: 'US'
      });
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const handleSelectOrganization = (organization: Organization) => {
    setCurrentOrganization(organization);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-2 text-gray-600">Manage your profile and organizations</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'organizations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            Organizations
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <div className="mt-1 text-sm text-gray-900">{user?.username || 'N/A'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 text-sm text-gray-900">{user?.email || 'N/A'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <div className="mt-1 text-sm text-gray-900">{user?.firstName || 'Not provided'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <div className="mt-1 text-sm text-gray-900">{user?.lastName || 'Not provided'}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <div className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user?.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800'
                    : user?.role === 'td'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user?.role || 'user'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Member Since</label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
              Edit Profile
            </button>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="space-y-6">
          {/* Current Organization */}
          {state.currentOrganization && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {state.currentOrganization.name}
                  </h2>
                  <p className="text-gray-600">{state.currentOrganization.description}</p>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span>Role: {state.currentOrganization.role}</span>
                    <span>Joined: {new Date(state.currentOrganization.joinedAt || '').toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentOrganization(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Switch Organization
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Organizations List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.organizations.map((organization) => (
              <div
                key={organization.id}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all duration-200 ${
                  state.currentOrganization?.id === organization.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => handleSelectOrganization(organization)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {organization.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    organization.role === 'owner'
                      ? 'bg-purple-100 text-purple-800'
                      : organization.role === 'admin'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {organization.role}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">
                  {organization.description || 'No description provided'}
                </p>
                
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Slug: {organization.slug}</div>
                  <div>Joined: {new Date(organization.joinedAt || '').toLocaleDateString()}</div>
                  {organization.website && (
                    <div>Website: {organization.website}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create Organization Button */}
          {!showCreateForm && (
            <div className="text-center">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Create New Organization
              </button>
            </div>
          )}

          {/* Create Organization Form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Organization</h3>
              
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      id="slug"
                      required
                      value={createFormData.slug}
                      onChange={(e) => setCreateFormData({ ...createFormData, slug: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="my-chess-club"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={createFormData.description}
                      onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={createFormData.website}
                      onChange={(e) => setCreateFormData({ ...createFormData, website: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      id="contactEmail"
                      value={createFormData.contactEmail}
                      onChange={(e) => setCreateFormData({ ...createFormData, contactEmail: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={createFormData.city}
                      onChange={(e) => setCreateFormData({ ...createFormData, city: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <input
                      type="text"
                      id="state"
                      value={createFormData.state}
                      onChange={(e) => setCreateFormData({ ...createFormData, state: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Create Organization
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;
