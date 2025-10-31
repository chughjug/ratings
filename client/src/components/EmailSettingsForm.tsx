import React, { useState, useEffect } from 'react';
import { Mail, ExternalLink, Save, HelpCircle } from 'lucide-react';

interface EmailSettingsFormProps {
  organizationId: string;
  organization: any;
  onSave: (settings: { googleAppsScriptUrl?: string }) => Promise<void>;
}

const EmailSettingsForm: React.FC<EmailSettingsFormProps> = ({ organization, onSave }) => {
  const [googleAppsScriptUrl, setGoogleAppsScriptUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.settings) {
      try {
        const settings = JSON.parse(organization.settings);
        setGoogleAppsScriptUrl(settings.email?.googleAppsScriptUrl || '');
      } catch (e) {
        // Ignore parse errors
      }
    }
    setLoading(false);
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        googleAppsScriptUrl: googleAppsScriptUrl || undefined
      });
    } catch (error) {
      console.error('Failed to save email settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Google Apps Script Web App URL</span>
          </div>
        </label>
        <input
          type="url"
          value={googleAppsScriptUrl}
          onChange={(e) => setGoogleAppsScriptUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-2 text-sm text-gray-500">
          Optional: Configure a Google Apps Script web app URL to send emails via Google's email service. 
          This provides better deliverability and allows you to use custom email templates.
        </p>
        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Setup Instructions:</h4>
              <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                <li>Copy the Google Apps Script template from <code className="bg-blue-100 px-1 rounded">server/scripts/google-apps-script-email-template.js</code></li>
                <li>Create a new Google Apps Script project at <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">script.google.com</a></li>
                <li>Paste the template code into your script</li>
                <li>Deploy as a web app: <strong>Execute as:</strong> "Me", <strong>Who has access:</strong> "Anyone"</li>
                <li>Copy the web app URL and paste it above</li>
              </ol>
              <div className="mt-3">
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm text-blue-700 hover:text-blue-900 font-medium"
                >
                  <span>Open Google Apps Script</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Email Settings'}</span>
        </button>
      </div>
    </form>
  );
};

export default EmailSettingsForm;

