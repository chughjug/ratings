import React, { useState, useEffect } from 'react';
import { Mail, Plus, Edit, Trash2, Eye, Copy, Send, X, AlertTriangle, CheckCircle, Loader } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_template: string;
  text_template?: string;
  variables?: string[];
  created_at?: string;
}

interface EmailTemplateManagerProps {
  organizationId: string;
  onClose?: () => void;
}

const EmailTemplateManager: React.FC<EmailTemplateManagerProps> = ({ organizationId, onClose }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [presets, setPresets] = useState<any>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlTemplate: '',
    textTemplate: '',
    variables: [] as string[]
  });

  useEffect(() => {
    fetchTemplates();
    fetchPresets();
  }, [organizationId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/email-templates/organization/${organizationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const response = await fetch('/api/email-templates/presets/list');
      if (response.ok) {
        const data = await response.json();
        setPresets(data.data || {});
      }
    } catch (err) {
      console.error('Failed to load presets');
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      htmlTemplate: template.html_template,
      textTemplate: template.text_template || '',
      variables: template.variables || []
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      subject: '',
      htmlTemplate: '',
      textTemplate: '',
      variables: []
    });
    setShowForm(true);
  };

  const handleUsePreset = (presetKey: string) => {
    const preset = presets[presetKey];
    if (preset) {
      setFormData({
        name: preset.name,
        subject: preset.subject,
        htmlTemplate: preset.htmlTemplate,
        textTemplate: preset.textTemplate || '',
        variables: preset.variables || []
      });
      setEditingTemplate(null);
      setShowForm(true);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.htmlTemplate) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const url = editingTemplate 
        ? `/api/email-templates/${editingTemplate.id}`
        : '/api/email-templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        organizationId: !editingTemplate ? organizationId : undefined
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccess(editingTemplate ? 'Template updated!' : 'Template created!');
        setShowForm(false);
        fetchTemplates();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save template');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/email-templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setSuccess('Template deleted!');
        fetchTemplates();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete template');
      }
    } catch (err) {
      setError('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      setError('Please enter an email address');
      return;
    }

    if (!previewTemplate) {
      setError('No template selected');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/email-templates/send-test/${previewTemplate.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipientEmail: testEmail,
          testVariables: {
            tournamentName: 'Sample Tournament',
            playerName: 'Sample Player',
            round: 1,
            boardNumber: 1,
            opponentName: 'Opponent',
            opponentRating: 1600,
            color: 'White',
            timeControl: '90/30+30',
            organizationName: 'Your Organization',
            score: '1.0',
            ratingChange: '+15',
            result: 'Win',
            startDate: new Date().toLocaleDateString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
          }
        })
      });

      if (response.ok) {
        setSuccess('Test email sent successfully!');
        setTestEmail('');
        setPreviewTemplate(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send test email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Mail className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Template</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start space-x-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-900">{success}</p>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Presets (only for new templates) */}
              {!editingTemplate && Object.keys(presets).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-3">Quick Start with Presets:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(presets).map(([key, preset]: any) => (
                      <button
                        key={key}
                        onClick={() => handleUsePreset(key)}
                        className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm font-medium text-left"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Pairing Notification"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Round {{round}} Pairings for {{tournamentName}}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">{'Use {{variable}} for dynamic content'}</p>
              </div>

              {/* HTML Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Email Template *
                </label>
                <textarea
                  value={formData.htmlTemplate}
                  onChange={(e) => setFormData({ ...formData, htmlTemplate: e.target.value })}
                  placeholder="<p>Hello {{playerName}},</p>..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-48 font-mono text-sm"
                />
              </div>

              {/* Text Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Email Template (Optional)
                </label>
                <textarea
                  value={formData.textTemplate}
                  onChange={(e) => setFormData({ ...formData, textTemplate: e.target.value })}
                  placeholder="Plain text version..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 font-mono text-sm"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                <span>Save Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Preview & Test</h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Subject:</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded">{previewTemplate.subject}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <div className="border border-gray-200 rounded-lg p-4 bg-white overflow-x-auto">
                  <div
                    dangerouslySetInnerHTML={{ __html: previewTemplate.html_template }}
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send Test Email To:
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSendTest}
                disabled={loading || !testEmail}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4" />
                <span>Send Test</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && templates.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No templates yet. Create one to get started!</p>
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-semibold text-gray-900 mb-2 truncate">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4 truncate">{template.subject}</p>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="flex items-center space-x-1 flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="flex items-center space-x-1 flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmailTemplateManager;
