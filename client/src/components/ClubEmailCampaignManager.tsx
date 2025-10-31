import React, { useState, useEffect } from 'react';
import { Mail, Plus, Send, BarChart3, Eye, X, Save, TrendingUp } from 'lucide-react';
import { clubFeaturesApi } from '../services/api';

interface EmailCampaign {
  id: string;
  subject: string;
  status: string;
  sentAt?: string;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  createdAt: string;
  [key: string]: any;
}

interface ClubEmailCampaignManagerProps {
  organizationId: string;
}

const ClubEmailCampaignManager: React.FC<ClubEmailCampaignManagerProps> = ({ organizationId }) => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, [organizationId]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clubFeaturesApi.getEmailCampaigns(organizationId);
      if (response.data.success) {
        setCampaigns(response.data.data.campaigns);
      } else {
        setError('Failed to load email campaigns');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load email campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to send this email campaign to all recipients?')) return;

    try {
      const response = await clubFeaturesApi.sendEmailCampaign(campaignId);
      if (response.data.success) {
        alert('Email campaign is being sent');
        loadCampaigns();
      } else {
        alert(response.data.error || 'Failed to send campaign');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send campaign');
    }
  };

  const loadInsights = async (campaignId: string) => {
    try {
      const response = await clubFeaturesApi.getEmailInsights(campaignId);
      if (response.data.success) {
        setInsights(response.data.data);
        setSelectedCampaign(campaigns.find(c => c.id === campaignId) || null);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to load insights');
    }
  };

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Mail className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Email Campaigns</h2>
          <span className="text-sm text-gray-500">({campaigns.length})</span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Campaigns List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No email campaigns yet. Click "New Campaign" to create one.</p>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{campaign.subject}</h3>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                    campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                    campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
              </div>

              {campaign.status === 'sent' && (
                <div className="space-y-2 mb-4">
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Recipients:</span>
                      <span className="font-medium">{campaign.totalRecipients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivered:</span>
                      <span className="font-medium">{campaign.totalDelivered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Opened:</span>
                      <span className="font-medium text-blue-600">
                        {campaign.totalOpened} ({campaign.totalDelivered > 0 
                          ? ((campaign.totalOpened / campaign.totalDelivered) * 100).toFixed(1) 
                          : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Clicked:</span>
                      <span className="font-medium text-purple-600">
                        {campaign.totalClicked} ({campaign.totalDelivered > 0 
                          ? ((campaign.totalClicked / campaign.totalDelivered) * 100).toFixed(1) 
                          : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                {campaign.status === 'draft' && (
                  <button
                    onClick={() => handleSend(campaign.id)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </button>
                )}
                {campaign.status === 'sent' && (
                  <button
                    onClick={() => loadInsights(campaign.id)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>View Insights</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Insights Modal */}
      {insights && selectedCampaign && (
        <EmailInsightsModal
          campaign={selectedCampaign}
          insights={insights}
          onClose={() => {
            setInsights(null);
            setSelectedCampaign(null);
          }}
        />
      )}

      {/* Add Campaign Modal */}
      {showAddModal && (
        <EmailCampaignModal
          organizationId={organizationId}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            loadCampaigns();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};

interface EmailInsightsModalProps {
  campaign: EmailCampaign;
  insights: any;
  onClose: () => void;
}

const EmailInsightsModal: React.FC<EmailInsightsModalProps> = ({ campaign, insights, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Campaign Insights</h3>
            <p className="text-sm text-gray-600 mt-1">{campaign.subject}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Delivery Rate</div>
              <div className="text-2xl font-bold text-blue-900">{insights.metrics.deliveryRate}%</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Open Rate</div>
              <div className="text-2xl font-bold text-green-900">{insights.metrics.openRate}%</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Click Rate</div>
              <div className="text-2xl font-bold text-purple-900">{insights.metrics.clickRate}%</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium">Bounce Rate</div>
              <div className="text-2xl font-bold text-red-900">{insights.metrics.bounceRate}%</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Delivery Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Recipients:</span>
                  <span className="font-medium">{insights.campaign.totalRecipients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Successfully Sent:</span>
                  <span className="font-medium text-green-600">{insights.campaign.totalSent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivered:</span>
                  <span className="font-medium text-blue-600">{insights.campaign.totalDelivered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-medium text-red-600">{insights.campaign.totalFailed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bounced:</span>
                  <span className="font-medium text-orange-600">{insights.campaign.totalBounced}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Engagement Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Opened:</span>
                  <span className="font-medium text-green-600">{insights.campaign.totalOpened}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Clicked:</span>
                  <span className="font-medium text-purple-600">{insights.campaign.totalClicked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Open Rate:</span>
                  <span className="font-medium">{insights.metrics.openRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Click Rate:</span>
                  <span className="font-medium">{insights.metrics.clickRate}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmailCampaignModalProps {
  organizationId: string;
  onClose: () => void;
  onSave: () => void;
}

const EmailCampaignModal: React.FC<EmailCampaignModalProps> = ({ organizationId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    subject: '',
    contentHtml: '',
    contentText: '',
    senderName: '',
    senderEmail: '',
    targetAudience: 'all',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await clubFeaturesApi.createEmailCampaign({
        organizationId,
        ...formData,
      });

      if (response.data.success) {
        onSave();
      } else {
        setError(response.data.error || 'Failed to create campaign');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">New Email Campaign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Content (HTML) *</label>
            <textarea
              required
              value={formData.contentHtml}
              onChange={(e) => setFormData({ ...formData, contentHtml: e.target.value })}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              placeholder="<h1>Hello Club Members!</h1><p>Your email content here...</p>"
            />
            <p className="text-xs text-gray-500 mt-1">You can use HTML formatting. The email will be wrapped with your club's branding.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plain Text Version (Optional)</label>
            <textarea
              value={formData.contentText}
              onChange={(e) => setFormData({ ...formData, contentText: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Plain text version for email clients that don't support HTML"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name (Optional)</label>
              <input
                type="text"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Club Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender Email (Optional)</label>
              <input
                type="email"
                value={formData.senderEmail}
                onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="info@yourclub.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
            <select
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Active Members</option>
              <option value="active_members">Active Members Only</option>
              <option value="inactive_members">Inactive Members</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The email will be sent with your club's branding (logo, colors) and will not include any Chess Nut branding.
              Email tracking (opens, clicks) will be enabled automatically.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubEmailCampaignManager;

