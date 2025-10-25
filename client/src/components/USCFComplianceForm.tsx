import React, { useState } from 'react';
import { Building2, MapPin, User, Settings, DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface USCFComplianceFormProps {
  formData: any;
  setFormData: (data: any) => void;
  errors?: Record<string, string>;
}

const USCFComplianceForm: React.FC<USCFComplianceFormProps> = ({ formData, setFormData, errors = {} }) => {
  const [activeTab, setActiveTab] = useState('location');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const tabs = [
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'directors', label: 'Directors', icon: User },
    { id: 'uscf', label: 'USCF Admin', icon: Building2 },
    { id: 'rating', label: 'Rating System', icon: Settings },
    { id: 'scoring', label: 'Scoring', icon: DollarSign },
    { id: 'compliance', label: 'Compliance', icon: FileText }
  ];

  const renderLocationTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="city"
            value={formData.city || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Enter city"
          />
          {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <select
            name="state"
            value={formData.state || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.state ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select State</option>
            <option value="AL">Alabama</option>
            <option value="AK">Alaska</option>
            <option value="AZ">Arizona</option>
            <option value="AR">Arkansas</option>
            <option value="CA">California</option>
            <option value="CO">Colorado</option>
            <option value="CT">Connecticut</option>
            <option value="DE">Delaware</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="HI">Hawaii</option>
            <option value="ID">Idaho</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
            <option value="IA">Iowa</option>
            <option value="KS">Kansas</option>
            <option value="KY">Kentucky</option>
            <option value="LA">Louisiana</option>
            <option value="ME">Maine</option>
            <option value="MD">Maryland</option>
            <option value="MA">Massachusetts</option>
            <option value="MI">Michigan</option>
            <option value="MN">Minnesota</option>
            <option value="MS">Mississippi</option>
            <option value="MO">Missouri</option>
            <option value="MT">Montana</option>
            <option value="NE">Nebraska</option>
            <option value="NV">Nevada</option>
            <option value="NH">New Hampshire</option>
            <option value="NJ">New Jersey</option>
            <option value="NM">New Mexico</option>
            <option value="NY">New York</option>
            <option value="NC">North Carolina</option>
            <option value="ND">North Dakota</option>
            <option value="OH">Ohio</option>
            <option value="OK">Oklahoma</option>
            <option value="OR">Oregon</option>
            <option value="PA">Pennsylvania</option>
            <option value="RI">Rhode Island</option>
            <option value="SC">South Carolina</option>
            <option value="SD">South Dakota</option>
            <option value="TN">Tennessee</option>
            <option value="TX">Texas</option>
            <option value="UT">Utah</option>
            <option value="VT">Vermont</option>
            <option value="VA">Virginia</option>
            <option value="WA">Washington</option>
            <option value="WV">West Virginia</option>
            <option value="WI">Wisconsin</option>
            <option value="WY">Wyoming</option>
          </select>
          {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="zipcode"
            value={formData.zipcode || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.zipcode ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="12345"
            maxLength={10}
          />
          {errors.zipcode && <p className="text-red-500 text-xs mt-1">{errors.zipcode}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Venue Name
          </label>
          <input
            type="text"
            name="venue_name"
            value={formData.venue_name || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter venue name"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Venue Address
        </label>
        <input
          type="text"
          name="venue_address"
          value={formData.venue_address || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Enter venue address"
        />
      </div>
    </div>
  );

  const renderDirectorsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chief TD Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="chief_td_name"
            value={formData.chief_td_name || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.chief_td_name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Enter chief TD name"
          />
          {errors.chief_td_name && <p className="text-red-500 text-xs mt-1">{errors.chief_td_name}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chief TD USCF ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="chief_td_uscf_id"
            value={formData.chief_td_uscf_id || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.chief_td_uscf_id ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Enter USCF ID"
            maxLength={8}
          />
          {errors.chief_td_uscf_id && <p className="text-red-500 text-xs mt-1">{errors.chief_td_uscf_id}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chief TD Email
          </label>
          <input
            type="email"
            name="chief_td_email"
            value={formData.chief_td_email || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter email"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chief TD Phone
          </label>
          <input
            type="tel"
            name="chief_td_phone"
            value={formData.chief_td_phone || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter phone number"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assistant TD Name
          </label>
          <input
            type="text"
            name="assistant_td_name"
            value={formData.assistant_td_name || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter assistant TD name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assistant TD USCF ID
          </label>
          <input
            type="text"
            name="assistant_td_uscf_id"
            value={formData.assistant_td_uscf_id || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter USCF ID"
            maxLength={8}
          />
        </div>
      </div>
    </div>
  );

  const renderUSCFTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Affiliate ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="affiliate_id"
            value={formData.affiliate_id || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.affiliate_id ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="A6000220"
            maxLength={8}
          />
          {errors.affiliate_id && <p className="text-red-500 text-xs mt-1">{errors.affiliate_id}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            USCF Tournament ID
          </label>
          <input
            type="text"
            name="uscf_tournament_id"
            value={formData.uscf_tournament_id || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Auto-generated"
            readOnly
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="uscf_rated"
              checked={formData.uscf_rated || false}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">USCF Rated Tournament</span>
          </label>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="scholastic_tournament"
              checked={formData.scholastic_tournament || false}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Scholastic Tournament</span>
          </label>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="send_crosstable"
              checked={formData.send_crosstable || false}
              onChange={handleInputChange}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Send Crosstable to USCF</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderRatingTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rating System <span className="text-red-500">*</span>
          </label>
          <select
            name="rating_system"
            value={formData.rating_system || 'regular'}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.rating_system ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="regular">Regular</option>
            <option value="quick">Quick</option>
            <option value="blitz">Blitz</option>
          </select>
          {errors.rating_system && <p className="text-red-500 text-xs mt-1">{errors.rating_system}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            K-Factor <span className="text-red-500">*</span>
          </label>
          <select
            name="k_factor"
            value={formData.k_factor || 'regular'}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.k_factor ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="regular">Regular</option>
            <option value="scholastic">Scholastic</option>
            <option value="provisional">Provisional</option>
          </select>
          {errors.k_factor && <p className="text-red-500 text-xs mt-1">{errors.k_factor}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pairing System <span className="text-red-500">*</span>
          </label>
          <select
            name="pairing_system"
            value={formData.pairing_system || 'swiss'}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.pairing_system ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="swiss">Swiss</option>
            <option value="round_robin">Round Robin</option>
          </select>
          {errors.pairing_system && <p className="text-red-500 text-xs mt-1">{errors.pairing_system}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tournament Type <span className="text-red-500">*</span>
          </label>
          <select
            name="tournament_type"
            value={formData.tournament_type || 'swiss'}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.tournament_type ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="swiss">Swiss</option>
            <option value="round_robin">Round Robin</option>
          </select>
          {errors.tournament_type && <p className="text-red-500 text-xs mt-1">{errors.tournament_type}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provisional Rating Threshold
          </label>
          <input
            type="number"
            name="provisional_rating_threshold"
            value={formData.provisional_rating_threshold || 20}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="0"
            max="50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Games for Rating
          </label>
          <input
            type="number"
            name="minimum_games_for_rating"
            value={formData.minimum_games_for_rating || 4}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            min="1"
            max="20"
          />
        </div>
      </div>
    </div>
  );

  const renderScoringTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bye Points <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="bye_points"
            value={formData.bye_points || 0.5}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.bye_points ? 'border-red-500' : 'border-gray-300'}`}
            step="0.1"
            min="0"
            max="1"
          />
          {errors.bye_points && <p className="text-red-500 text-xs mt-1">{errors.bye_points}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Forfeit Points
          </label>
          <input
            type="number"
            name="forfeit_points"
            value={formData.forfeit_points || 0.0}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            step="0.1"
            min="0"
            max="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Half-Point Bye Points
          </label>
          <input
            type="number"
            name="half_point_bye_points"
            value={formData.half_point_bye_points || 0.5}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            step="0.1"
            min="0"
            max="1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full-Point Bye Points
          </label>
          <input
            type="number"
            name="full_point_bye_points"
            value={formData.full_point_bye_points || 1.0}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            step="0.1"
            min="0"
            max="1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pairing-Allocated Bye Points
          </label>
          <input
            type="number"
            name="pairing_allocated_bye_points"
            value={formData.pairing_allocated_bye_points || 1.0}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            step="0.1"
            min="0"
            max="1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entry Fee Amount
          </label>
          <input
            type="number"
            name="entry_fee_amount"
            value={formData.entry_fee_amount || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            step="0.01"
            min="0"
          />
        </div>
      </div>
    </div>
  );

  const renderComplianceTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-sm font-medium text-blue-800">USCF Compliance Status</h3>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          This form ensures your tournament meets all USCF requirements for rating submission.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Compliance Notes
        </label>
        <textarea
          name="compliance_notes"
          value={formData.compliance_notes || ''}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Any additional compliance notes..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Regulatory Notes
        </label>
        <textarea
          name="regulatory_notes"
          value={formData.regulatory_notes || ''}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Any regulatory requirements or notes..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Validation Status
          </label>
          <select
            name="validation_status"
            value={formData.validation_status || 'pending'}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="pending">Pending</option>
            <option value="validated">Validated</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Validation By
          </label>
          <input
            type="text"
            name="validation_by"
            value={formData.validation_by || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Validator name"
          />
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'location':
        return renderLocationTab();
      case 'directors':
        return renderDirectorsTab();
      case 'uscf':
        return renderUSCFTab();
      case 'rating':
        return renderRatingTab();
      case 'scoring':
        return renderScoringTab();
      case 'compliance':
        return renderComplianceTab();
      default:
        return renderLocationTab();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default USCFComplianceForm;
