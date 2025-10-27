import React, { useState, useEffect } from 'react';
import { Save, UserPlus, Mail, Phone, Award, BookOpen, CheckCircle, Plus, X, Trash2, CreditCard, DollarSign } from 'lucide-react';

interface RegistrationSettingsProps {
  tournamentId: string;
  tournament: any;
  onSave: (settings: any) => void;
}

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'tel' | 'select' | 'system_link';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  linkedField?: 'section' | 'team' | 'rating' | 'uscf_id' | 'fide_id'; // Links to existing system fields
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
  customFields: CustomField[];
  // Payment settings
  require_payment: boolean;
  entry_fee: number | undefined;
  payment_method: 'stripe' | 'paypal' | 'both';
  paypal_client_id?: string;
  paypal_secret?: string;
  stripe_publishable_key?: string;
  stripe_secret_key?: string;
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
    custom_success_message: 'Thank you for registering! Your registration is now pending approval.',
    customFields: [],
    // Payment settings
    require_payment: false,
    entry_fee: tournament?.settings?.entry_fee || 0,
    payment_method: 'both',
    paypal_client_id: '',
    paypal_secret: '',
    stripe_publishable_key: '',
    stripe_secret_key: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<Partial<CustomField>>({
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
    linkedField: undefined
  });

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
    
    // Load entry_fee and payment settings from tournament.settings
    if (tournament?.settings) {
      try {
        const tournamentSettings = typeof tournament.settings === 'string'
          ? JSON.parse(tournament.settings)
          : tournament.settings;
          
        if (tournamentSettings.entry_fee !== undefined) {
          setSettings(prev => ({ 
            ...prev, 
            entry_fee: tournamentSettings.entry_fee 
          }));
        }
        
        if (tournamentSettings.payment_settings) {
          setSettings(prev => ({
            ...prev,
            payment_method: tournamentSettings.payment_settings.payment_method || 'both',
            paypal_client_id: tournamentSettings.payment_settings.paypal_client_id || '',
            paypal_secret: tournamentSettings.payment_settings.paypal_secret || '',
            stripe_publishable_key: tournamentSettings.payment_settings.stripe_publishable_key || '',
            stripe_secret_key: tournamentSettings.payment_settings.stripe_secret_key || ''
          }));
        }
      } catch (error) {
        console.error('Error loading tournament payment settings:', error);
      }
    }
  }, [tournament]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all settings (onSave handler will extract payment settings to settings field)
      await onSave({ registration_settings: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save registration settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    if (!newField.label) return;
    
    const field: CustomField = {
      id: `field_${Date.now()}`,
      label: newField.label,
      type: newField.type || 'text',
      required: newField.required || false,
      placeholder: newField.placeholder || '',
      options: newField.type === 'select' ? [] : undefined,
      linkedField: newField.type === 'system_link' ? (newField.linkedField as any) : undefined
    };
    
    setSettings(prev => ({
      ...prev,
      customFields: [...prev.customFields, field]
    }));
    
    setNewField({
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
      linkedField: undefined
    });
    setShowAddField(false);
  };

  const removeCustomField = (id: string) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.filter(field => field.id !== id)
    }));
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

        {/* Customizable Fields */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Customizable Fields</h4>
            <button
              onClick={() => setShowAddField(!showAddField)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Custom Field</span>
            </button>
          </div>

          {/* Add Field Form */}
          {showAddField && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Label *
                  </label>
                  <input
                    type="text"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Emergency Contact"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Field Type *
                  </label>
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value as CustomField['type'], linkedField: undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="tel">Phone</option>
                    <option value="select">Dropdown</option>
                    <option value="system_link">Link to System Field</option>
                  </select>
                </div>
                
                {newField.type === 'system_link' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link to System Field *
                    </label>
                    <select
                      value={newField.linkedField || ''}
                      onChange={(e) => setNewField({ ...newField, linkedField: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a system field...</option>
                      <option value="section">Section</option>
                      <option value="team">Team</option>
                      <option value="rating">Rating</option>
                      <option value="uscf_id">USCF ID</option>
                      <option value="fide_id">FIDE ID</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This field will collect data for the selected system field
                    </p>
                  </div>
                )}
                
                {newField.type !== 'system_link' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placeholder (optional)
                    </label>
                    <input
                      type="text"
                      value={newField.placeholder}
                      onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter placeholder text..."
                    />
                  </div>
                )}
                
                {newField.type !== 'system_link' && (
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newField.required}
                        onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Required</span>
                    </label>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowAddField(false);
                    setNewField({ label: '', type: 'text', required: false, placeholder: '', options: [], linkedField: undefined });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addCustomField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={!newField.label || (newField.type === 'system_link' && !newField.linkedField)}
                >
                  Add Field
                </button>
              </div>
            </div>
          )}

          {/* Existing Custom Fields */}
          {settings.customFields.length > 0 && (
            <div className="space-y-2">
              {settings.customFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{field.label}</span>
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                        {field.type}
                      </span>
                      {field.type === 'system_link' && field.linkedField && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          → {field.linkedField}
                        </span>
                      )}
                      {field.required && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    {field.placeholder && (
                      <p className="text-xs text-gray-500 mt-1">{field.placeholder}</p>
                    )}
                    {field.type === 'system_link' && field.linkedField && (
                      <p className="text-xs text-blue-600 mt-1">
                        Links to: {field.linkedField}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeCustomField(field.id)}
                    className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {settings.customFields.length === 0 && !showAddField && (
            <p className="text-sm text-gray-500 italic">No custom fields added yet</p>
          )}
        </div>

        {/* Payment Settings */}
        <div className="border-b border-gray-200 pb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
            Payment Settings
          </h4>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.require_payment}
                onChange={(e) => setSettings({ ...settings, require_payment: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Require payment during registration</span>
            </label>
            
            {settings.require_payment && (
              <div className="ml-7 space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entry Fee (USD)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={settings.entry_fee || ''}
                      onChange={(e) => setSettings({ ...settings, entry_fee: e.target.value ? parseFloat(e.target.value) : 0 })}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Amount players must pay to complete registration
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accepted Payment Methods
                  </label>
                  <select
                    value={settings.payment_method}
                    onChange={(e) => setSettings({ ...settings, payment_method: e.target.value as 'stripe' | 'paypal' | 'both' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="both">Both Stripe and PayPal</option>
                    <option value="stripe">Stripe Only</option>
                    <option value="paypal">PayPal Only</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select which payment gateways to offer to players
                  </p>
                </div>

                {/* PayPal Credentials */}
                {(settings.payment_method === 'paypal' || settings.payment_method === 'both') && (
                  <div className="border-t border-blue-300 pt-4 mt-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">PayPal Configuration</label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">PayPal Client ID</label>
                        <input
                          type="text"
                          value={settings.paypal_client_id || ''}
                          onChange={(e) => setSettings({ ...settings, paypal_client_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter PayPal Client ID"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">PayPal Client Secret</label>
                        <input
                          type="password"
                          value={settings.paypal_secret || ''}
                          onChange={(e) => setSettings({ ...settings, paypal_secret: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter PayPal Client Secret"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Stripe Credentials */}
                {(settings.payment_method === 'stripe' || settings.payment_method === 'both') && (
                  <div className="border-t border-blue-300 pt-4 mt-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Stripe Configuration</label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Stripe Publishable Key</label>
                        <input
                          type="text"
                          value={settings.stripe_publishable_key || ''}
                          onChange={(e) => setSettings({ ...settings, stripe_publishable_key: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="pk_test_..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Stripe Secret Key</label>
                        <input
                          type="password"
                          value={settings.stripe_secret_key || ''}
                          onChange={(e) => setSettings({ ...settings, stripe_secret_key: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="sk_test_..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
