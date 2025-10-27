import React, { useState, useEffect } from 'react';
import { Save, UserPlus, Mail, Phone, Award, BookOpen, CheckCircle } from 'lucide-react';

interface RegistrationSettingsProps {
  tournamentId: string;
  tournament: any;
  onSave: (settings: any) => void;
}

interface RegistrationSettingsData {
  allow_registration: boolean;
  require_name: boolean;
  require_email: boolean;
  require_uscf_id: boolean;
  require_rating: boolean;
  require_phone: boolean;
  require_section: boolean;
  allow_bye_requests: boolean;
  allow_notes: boolean;
  auto_approve: boolean;
  send_confirmation_email: boolean;
  custom_registration_message: string;
  custom_success_message: string;
}

const RegistrationSettings: React.FC<RegistrationSettingsProps> = ({ 
  tournamentId, 
  tournament,
  onSave 
}) => {
  const [settings, setSettings] = useState<RegistrationSettingsData>({
    allow_registration: tournament?.allow_registration || true,
    require_name: true,
    require_email: true,
    require_uscf_id: false,
    require_rating: false,
    require_phone: false,
    require_section: false,
    allow_bye_requests: true,
    allow_notes: true,
    auto_approve: false,
    send_confirmation_email: true,
    custom_registration_message: '',
    custom_success_message: 'Thank you for registering! Your registration is now pending approval.'
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing registration settings from tournament
    if (tournament?.registration_settings) {
      try {
        const existingSettings = typeof tournament.registration_settings === 'string' 
          ? JSON.parse(tournament.registration_settings)
          : tournament.registration_settings;
        setSettings(prev => ({ ...prev, ...existingSettings }));
      } catch (error) {
        console.error('Error loading registration settings:', error);
      }
    }
  }, [tournament]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ registration_settings: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save registration settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <UserPlus className="h-5 w-5 mr-2 text-blue-600" />
            Registration Form Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure the registration form fields and requirements
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {saved ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="border-b border-gray-200 pb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">General Settings</h4>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_registration}
                onChange={(e) => setSettings({ ...settings, allow_registration: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Allow public registration</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_approve}
                onChange={(e) => setSettings({ ...settings, auto_approve: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Auto-approve registrations</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.send_confirmation_email}
                onChange={(e) => setSettings({ ...settings, send_confirmation_email: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Send confirmation email to registrants</span>
            </label>
          </div>
        </div>

        {/* Required Fields */}
        <div className="border-b border-gray-200 pb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Required Fields</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_name}
                onChange={(e) => setSettings({ ...settings, require_name: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <UserPlus className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Player Name</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_email}
                onChange={(e) => setSettings({ ...settings, require_email: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Mail className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Email</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_uscf_id}
                onChange={(e) => setSettings({ ...settings, require_uscf_id: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Award className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">USCF ID</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_rating}
                onChange={(e) => setSettings({ ...settings, require_rating: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Award className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Rating</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_phone}
                onChange={(e) => setSettings({ ...settings, require_phone: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Phone className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Phone Number</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_section}
                onChange={(e) => setSettings({ ...settings, require_section: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <BookOpen className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">Section</span>
            </label>
          </div>
        </div>

        {/* Optional Features */}
        <div className="border-b border-gray-200 pb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Optional Features</h4>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_bye_requests}
                onChange={(e) => setSettings({ ...settings, allow_bye_requests: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Allow bye requests</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_notes}
                onChange={(e) => setSettings({ ...settings, allow_notes: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Allow additional notes/comments</span>
            </label>
          </div>
        </div>

        {/* Custom Messages */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">Custom Messages</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registration Form Message (optional)
              </label>
              <textarea
                value={settings.custom_registration_message}
                onChange={(e) => setSettings({ ...settings, custom_registration_message: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a custom message to display at the top of the registration form..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be displayed at the top of the registration form
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Success Message
              </label>
              <textarea
                value={settings.custom_success_message}
                onChange={(e) => setSettings({ ...settings, custom_success_message: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Thank you for registering!"
              />
              <p className="text-xs text-gray-500 mt-1">
                Message shown to players after successful registration
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSettings;
