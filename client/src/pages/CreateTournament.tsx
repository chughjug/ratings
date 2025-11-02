import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X, FileText, Download, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { tournamentApi } from '../services/api';
import { Section, TournamentTemplate } from '../types';
import { templateService } from '../services/templateService';
import USCFComplianceForm from '../components/USCFComplianceForm';

const CreateTournament: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useTournament();
  const { state: orgState, setCurrentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TournamentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUSCFForm, setShowUSCFForm] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templatesData = await templateService.getTemplates();
        setTemplates(templatesData);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    loadTemplates();
  }, []);

  const handleTemplateSelect = (template: TournamentTemplate) => {
    setSelectedTemplate(template.id);
    
    // Validate and map format to supported formats
    const validFormats: ('swiss' | 'online' | 'online-rated' | 'quad' | 'team-swiss' | 'team-tournament')[] = ['swiss', 'online', 'online-rated', 'quad', 'team-swiss', 'team-tournament'];
    const validFormat = validFormats.includes(template.format as any) 
      ? template.format as any 
      : 'swiss'; // Default to swiss if invalid format
    
    // Force quad tournaments to 3 rounds
    const isQuad = validFormat === 'quad';
    
    setFormData(prev => ({
      ...prev,
      format: validFormat,
      rounds: isQuad ? 3 : prev.rounds,
      settings: {
        ...prev.settings,
        ...template.settings
      } as typeof prev.settings
    }));
    setShowTemplates(false);
  };

  const [formData, setFormData] = useState({
    name: '',
    format: 'swiss' as 'swiss' | 'online' | 'online-rated' | 'quad' | 'team-swiss' | 'team-tournament',
    rounds: 5,
    time_control: '',
    start_date: '',
    end_date: '',
    status: 'created' as 'created' | 'active' | 'completed' | 'cancelled',
    organization_id: '',
    is_public: false,
    public_url: '',
    
    // USCF Compliance Fields - Required for DBF Export
    // Location Information
    city: '',
    state: '',
    zipcode: '',
    location: '',
    venue_name: '',
    venue_address: '',
    venue_city: '',
    venue_state: '',
    venue_zipcode: '',
    
    // Tournament Director Information
    chief_td_name: '',
    chief_td_uscf_id: '',
    chief_td_email: '',
    chief_td_phone: '',
    assistant_td_name: '',
    assistant_td_uscf_id: '',
    
    // USCF Administrative Fields
    affiliate_id: 'A6000220', // Default affiliate ID
    uscf_tournament_id: '',
    uscf_section_ids: '',
    
    // Tournament Classification
    scholastic_tournament: false,
    fide_rated: false,
    uscf_rated: true,
    send_crosstable: true,
    
    // Rating System Configuration
    rating_system: 'regular' as 'regular' | 'quick' | 'blitz',
    k_factor: 'regular' as 'regular' | 'scholastic' | 'provisional',
    pairing_system: 'swiss' as 'swiss' | 'round_robin',
    tournament_type: 'swiss' as 'swiss' | 'round_robin',
    
    // Scoring Configuration
    bye_points: 0.5,
    forfeit_points: 0.0,
    half_point_bye_points: 0.5,
    full_point_bye_points: 1.0,
    pairing_allocated_bye_points: 1.0,
    
    // Rating Thresholds
    provisional_rating_threshold: 20,
    minimum_games_for_rating: 4,
    
    // Player Statistics
    expected_players: undefined as number | undefined,
    total_players: 0,
    rated_players: 0,
    unrated_players: 0,
    foreign_players: 0,
    provisional_players: 0,
    withdrawn_players: 0,
    forfeit_players: 0,
    bye_players: 0,
    half_point_bye_players: 0,
    full_point_bye_players: 0,
    pairing_allocated_bye_players: 0,
    
    // Tournament Management
    allow_registration: true,
    website: '',
    entry_fee_amount: undefined as number | undefined,
    prize_fund_amount: undefined as number | undefined,
    time_control_description: '',
    
    // USCF Export Status
    rating_submission_status: 'not_submitted' as 'not_submitted' | 'submitted' | 'accepted' | 'rejected',
    rating_submission_date: '',
    rating_submission_notes: '',
    uscf_rating_report_generated: false,
    uscf_rating_report_date: '',
    uscf_rating_report_notes: '',
    
    // Compliance and Validation
    compliance_notes: '',
    regulatory_notes: '',
    audit_trail: '',
    validation_status: 'pending' as 'pending' | 'validated' | 'failed',
    validation_notes: '',
    validation_date: '',
    validation_by: '',
    
    // System Fields
    created_by: '',
    last_modified_by: '',
    last_modified_date: '',
    version: '1.0',
    compliance_version: 'uscf_2024',
    export_format_version: 'dbf_iv',
    data_integrity_hash: '',
    
    // Legacy fields for backward compatibility
    chief_arbiter_name: '',
    chief_arbiter_fide_id: '',
    chief_organizer_name: '',
    chief_organizer_fide_id: '',
      settings: {
        tie_break_criteria: ['buchholz', 'sonnebornBerger'] as ('buchholz' | 'sonnebornBerger' | 'performanceRating' | 'modifiedBuchholz' | 'cumulative' | 'koya' | 'directEncounter' | 'avgOpponentRating')[],
        sections: [{
          name: '',
          min_rating: undefined,
          max_rating: undefined,
          description: ''
        }] as Section[],
        rating_floor: undefined as number | undefined,
        rating_ceiling: undefined as number | undefined,
      bye_points: 0.5,
      pairing_type: 'standard' as 'standard' | 'accelerated',
      pairing_method: 'fide_dutch' as 'fide_dutch' | 'round_robin' | 'quad' | 'single_elimination',
      equalization_limit: 200,
      alternation_limit: 80,
      use_full_color_history: true,
      due_color_to_higher_ranked: true,
      avoid_dropping_unrated: true,
      acceleration_type: 'standard' as 'standard' | 'sixths' | 'all_rounds' | 'added_score',
      acceleration_rounds: 2,
      acceleration_threshold: undefined,
      acceleration_break_point: undefined,
      added_score_accelerators: false,
      entry_fee: undefined,
      prize_fund: undefined,
      prize_settings: {
        enabled: true,
        autoAssign: true,
        sections: []
      }
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('settings.')) {
      const settingKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingKey]: settingKey === 'rating_floor' || settingKey === 'rating_ceiling' || settingKey === 'acceleration_rounds' || settingKey === 'acceleration_threshold' || settingKey === 'acceleration_break_point'
            ? (value ? parseInt(value) : undefined)
            : value
        }
      }));
    } else if (name === 'fide_rated' || name === 'uscf_rated') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (name.startsWith('settings.') && (e.target as HTMLInputElement).type === 'checkbox') {
      const settingKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [settingKey]: (e.target as HTMLInputElement).checked
        }
      }));
    } else if (name === 'format') {
      // Force quad tournaments to 3 rounds
      const isQuad = value === 'quad';
      setFormData(prev => ({
        ...prev,
        format: value as 'swiss' | 'online' | 'online-rated' | 'quad' | 'team-swiss' | 'team-tournament',
        rounds: isQuad ? 3 : prev.rounds
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'rounds' || name === 'expected_players' 
          ? (value ? parseInt(value) : undefined)
          : value
      }));
    }
  };

  const addSection = () => {
    const newSection: Section = {
      name: '',
      min_rating: undefined,
      max_rating: undefined,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        sections: [...prev.settings.sections, newSection]
      }
    }));
  };

  const removeSection = (index: number) => {
    // Prevent removing the last section
    if (formData.settings.sections.length <= 1) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        sections: prev.settings.sections.filter((_, i) => i !== index)
      }
    }));
  };

  const updateSection = (index: number, field: keyof Section, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        sections: prev.settings.sections.map((section, i) => 
          i === index ? { ...section, [field]: value } : section
        )
      }
    }));
  };

  // USCF Compliance Validation
  const validateUSCFCompliance = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields for USCF compliance
    if (!formData.city?.trim()) {
      newErrors.city = 'City is required for USCF compliance';
    }
    
    if (!formData.state?.trim()) {
      newErrors.state = 'State is required for USCF compliance';
    }
    
    if (!formData.zipcode?.trim()) {
      newErrors.zipcode = 'ZIP code is required for USCF compliance';
    }
    
    if (!formData.chief_td_name?.trim()) {
      newErrors.chief_td_name = 'Chief TD name is required for USCF compliance';
    }
    
    if (!formData.chief_td_uscf_id?.trim()) {
      newErrors.chief_td_uscf_id = 'Chief TD USCF ID is required for USCF compliance';
    }
    
    if (!formData.affiliate_id?.trim()) {
      newErrors.affiliate_id = 'Affiliate ID is required for USCF compliance';
    }
    
    // Validate USCF ID format (8 characters, alphanumeric)
    if (formData.chief_td_uscf_id && !/^[A-Z0-9]{8}$/.test(formData.chief_td_uscf_id)) {
      newErrors.chief_td_uscf_id = 'USCF ID must be 8 alphanumeric characters';
    }
    
    // Validate ZIP code format
    if (formData.zipcode && !/^\d{5}(-\d{4})?$/.test(formData.zipcode)) {
      newErrors.zipcode = 'ZIP code must be in format 12345 or 12345-6789';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate USCF compliance if USCF rated
    if (formData.uscf_rated && !validateUSCFCompliance()) {
      setShowUSCFForm(true);
      return;
    }
    
    // Validate that at least one section has a name
    const hasValidSection = formData.settings.sections.some(section => section.name.trim() !== '');
    if (!hasValidSection) {
      alert('Please provide a name for at least one section.');
      return;
    }
    
    // Validate that an organization is selected
    if (!orgState.currentOrganization) {
      alert('Please select an organization to create a tournament.');
      setShowOrgSelector(true);
      return;
    }
    
    // Validate quad tournaments have 3 rounds
    if (formData.format === 'quad' && formData.rounds !== 3) {
      alert('Quad tournaments must have exactly 3 rounds.');
      setFormData(prev => ({ ...prev, rounds: 3 }));
      return;
    }
    
    setLoading(true);

    try {
      // Set organization_id from current organization
      const tournamentData = {
        ...formData,
        organization_id: orgState.currentOrganization.id
      };
      
      console.log('Submitting tournament:', tournamentData);
      const response = await tournamentApi.create(tournamentData);
      console.log('Tournament creation response:', response);
      
      if (response.data.success) {
        // Create a full tournament object for the context
        const tournament = {
          id: response.data.data.id,
          ...formData,
          created_at: new Date().toISOString()
        };
        dispatch({ type: 'ADD_TOURNAMENT', payload: tournament });
        alert('Tournament created successfully!');
        navigate(`/tournaments/${response.data.data.id}`);
      } else {
        throw new Error(response.data.error || 'Failed to create tournament');
      }
    } catch (error: any) {
      console.error('Failed to create tournament:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to create tournament: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create Tournament</h1>
        <p className="text-gray-600 mt-2">Set up a new chess tournament</p>
      </div>

      {/* Template Selection */}
      {templates.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tournament Templates</h2>
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center space-x-2 text-chess-board hover:text-chess-dark"
            >
              <FileText className="h-4 w-4" />
              <span>{showTemplates ? 'Hide Templates' : 'Show Templates'}</span>
            </button>
          </div>
          
          {showTemplates && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-chess-board bg-chess-board/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {template.format}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Used {template.usage_count} times</span>
                    {template.is_public && (
                      <span className="text-green-600">Public</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {selectedTemplate && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-800">
                  Using template: {templates.find(t => t.id === selectedTemplate)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Selection */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization</h2>
          
          {orgState.currentOrganization ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-900">{orgState.currentOrganization.name}</h3>
                  <p className="text-sm text-blue-700">{orgState.currentOrganization.description || 'No description'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOrgSelector(true)}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No organization selected</p>
              <button
                type="button"
                onClick={() => setShowOrgSelector(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Select Organization
              </button>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Tournament Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter tournament name"
              />
            </div>

            <div>
              <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-2">
                Format *
              </label>
              <select
                id="format"
                name="format"
                value={formData.format}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              >
                <option value="swiss">Swiss System</option>
                <option value="online">Online (Lichess)</option>
                <option value="online-rated">Online Rated (Lichess Swiss)</option>
                <option value="quad">Quad Tournament</option>
                <option value="team-swiss">Team Swiss (Team vs Team matches with sections)</option>
                <option value="team-tournament">Team Tournament (Team vs Team matches with sections)</option>
              </select>
            </div>

            <div>
              <label htmlFor="rounds" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Rounds *
                {formData.format === 'quad' && (
                  <span className="ml-2 text-xs text-gray-500 font-normal">(Fixed at 3 rounds for Quad format)</span>
                )}
              </label>
              <input
                type="number"
                id="rounds"
                name="rounds"
                value={formData.rounds}
                onChange={handleInputChange}
                min="1"
                max="20"
                required
                disabled={formData.format === 'quad'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="time_control" className="block text-sm font-medium text-gray-700 mb-2">
                Time Control
              </label>
              <input
                type="text"
                id="time_control"
                name="time_control"
                value={formData.time_control}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="e.g., 90+30, 60+0"
              />
            </div>

            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                State *
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter state"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Venue/Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="e.g., Community Center, Hotel Conference Room"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tournament Officials</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="chief_td_name" className="block text-sm font-medium text-gray-700 mb-2">
                Chief Tournament Director Name *
              </label>
              <input
                type="text"
                id="chief_td_name"
                name="chief_td_name"
                value={formData.chief_td_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter Chief TD name"
              />
            </div>

            <div>
              <label htmlFor="chief_td_uscf_id" className="block text-sm font-medium text-gray-700 mb-2">
                Chief TD USCF ID *
              </label>
              <input
                type="text"
                id="chief_td_uscf_id"
                name="chief_td_uscf_id"
                value={formData.chief_td_uscf_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter USCF ID"
              />
            </div>

            <div>
              <label htmlFor="chief_arbiter_name" className="block text-sm font-medium text-gray-700 mb-2">
                Chief Arbiter Name
              </label>
              <input
                type="text"
                id="chief_arbiter_name"
                name="chief_arbiter_name"
                value={formData.chief_arbiter_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter Chief Arbiter name"
              />
            </div>

            <div>
              <label htmlFor="chief_arbiter_fide_id" className="block text-sm font-medium text-gray-700 mb-2">
                Chief Arbiter FIDE ID
              </label>
              <input
                type="text"
                id="chief_arbiter_fide_id"
                name="chief_arbiter_fide_id"
                value={formData.chief_arbiter_fide_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter FIDE ID"
              />
            </div>

            <div>
              <label htmlFor="chief_organizer_name" className="block text-sm font-medium text-gray-700 mb-2">
                Chief Organizer Name
              </label>
              <input
                type="text"
                id="chief_organizer_name"
                name="chief_organizer_name"
                value={formData.chief_organizer_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter Chief Organizer name"
              />
            </div>

            <div>
              <label htmlFor="chief_organizer_fide_id" className="block text-sm font-medium text-gray-700 mb-2">
                Chief Organizer FIDE ID
              </label>
              <input
                type="text"
                id="chief_organizer_fide_id"
                name="chief_organizer_fide_id"
                value={formData.chief_organizer_fide_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Enter FIDE ID"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tournament Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="expected_players" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Number of Players
              </label>
              <input
                type="number"
                id="expected_players"
                name="expected_players"
                value={formData.expected_players || ''}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Estimated participants"
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Tournament Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex space-x-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="uscf_rated"
                    name="uscf_rated"
                    checked={formData.uscf_rated}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-chess-board focus:ring-chess-board border-gray-300 rounded"
                  />
                  <label htmlFor="uscf_rated" className="ml-2 block text-sm text-gray-900">
                    USCF Rated Tournament
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="fide_rated"
                    name="fide_rated"
                    checked={formData.fide_rated}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-chess-board focus:ring-chess-board border-gray-300 rounded"
                  />
                  <label htmlFor="fide_rated" className="ml-2 block text-sm text-gray-900">
                    FIDE Rated Tournament
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allow_registration"
                    name="allow_registration"
                    checked={formData.allow_registration}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-chess-board focus:ring-chess-board border-gray-300 rounded"
                  />
                  <label htmlFor="allow_registration" className="ml-2 block text-sm text-gray-900">
                    Allow Registration
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                FIDE rated tournaments require a licensed FIDE arbiter and additional registration.
                When registration is disabled, players cannot register for this tournament.
              </p>
            </div>
          </div>
        </div>

        {/* USCF Compliance Form */}
        {formData.uscf_rated && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">USCF Compliance</h2>
              <div className="flex items-center space-x-2">
                {Object.keys(errors).length === 0 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Compliant</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">{Object.keys(errors).length} issues</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowUSCFForm(!showUSCFForm)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showUSCFForm ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            </div>
            
            {showUSCFForm && (
              <USCFComplianceForm
                formData={formData}
                setFormData={setFormData}
                errors={errors}
              />
            )}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tournament Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="settings.rating_floor" className="block text-sm font-medium text-gray-700 mb-2">
                Rating Floor
              </label>
              <input
                type="number"
                id="settings.rating_floor"
                name="settings.rating_floor"
                value={formData.settings.rating_floor || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Minimum rating"
              />
            </div>

            <div>
              <label htmlFor="settings.rating_ceiling" className="block text-sm font-medium text-gray-700 mb-2">
                Rating Ceiling
              </label>
              <input
                type="number"
                id="settings.rating_ceiling"
                name="settings.rating_ceiling"
                value={formData.settings.rating_ceiling || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Maximum rating"
              />
            </div>

            <div>
              <label htmlFor="settings.bye_points" className="block text-sm font-medium text-gray-700 mb-2">
                Bye Points
              </label>
              <select
                id="settings.bye_points"
                name="settings.bye_points"
                value={formData.settings.bye_points}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
              >
                <option value={0}>0 points</option>
                <option value={0.5}>0.5 points</option>
                <option value={1}>1 point</option>
              </select>
            </div>

            <div>
              <label htmlFor="settings.entry_fee" className="block text-sm font-medium text-gray-700 mb-2">
                Entry Fee ($)
              </label>
              <input
                type="number"
                id="settings.entry_fee"
                name="settings.entry_fee"
                value={formData.settings.entry_fee || ''}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Players will pay this amount during registration if payment is enabled
              </p>
            </div>

            <div>
              <label htmlFor="settings.pairing_method" className="block text-sm font-medium text-gray-700 mb-2">
                Pairing Method
              </label>
              <select
                id="settings.pairing_method"
                name="settings.pairing_method"
                value={formData.settings.pairing_method}
                onChange={handleInputChange}
                disabled={formData.format === 'online' || formData.format === 'quad'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="fide_dutch">FIDE Dutch System</option>
                <option value="round_robin">Round Robin</option>
                <option value="quad">Quad System</option>
                <option value="single_elimination">Single Elimination</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.settings.pairing_method === 'fide_dutch' && 'Algorithmic pairing system with aggressive color correction and systematic transpositions.'}
                {formData.settings.pairing_method === 'round_robin' && 'All players play each other exactly once. Best for small tournaments.'}
                {formData.settings.pairing_method === 'quad' && 'Players grouped into quads of 4, round-robin within each quad. Good for 8-32 players.'}
                {formData.settings.pairing_method === 'single_elimination' && 'Knockout tournament with bracket system. Fast completion with clear winner.'}
              </p>
            </div>

            <div>
              <label htmlFor="settings.pairing_type" className="block text-sm font-medium text-gray-700 mb-2">
                Pairing Type
              </label>
              <select
                id="settings.pairing_type"
                name="settings.pairing_type"
                value={formData.settings.pairing_type}
                onChange={handleInputChange}
                disabled={formData.format === 'online' || formData.format === 'quad'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="standard">Standard Swiss</option>
                <option value="accelerated">Accelerated Swiss</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Accelerated pairings pair higher-rated players earlier to reduce perfect scores
              </p>
            </div>


            {formData.settings.pairing_type === 'accelerated' && (
              <>
                <div>
                  <label htmlFor="settings.acceleration_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Acceleration Type
                  </label>
                  <select
                    id="settings.acceleration_type"
                    name="settings.acceleration_type"
                    value={formData.settings.acceleration_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  >
                    <option value="standard">Standard Accelerated (WinTD)</option>
                    <option value="sixths">1/6's Accelerated</option>
                    <option value="added_score">Added Score Method</option>
                    <option value="all_rounds">All Rounds Accelerated</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose the acceleration method based on WinTD standards
                  </p>
                </div>

                {formData.settings.acceleration_type !== 'all_rounds' && (
                  <div>
                    <label htmlFor="settings.acceleration_rounds" className="block text-sm font-medium text-gray-700 mb-2">
                      Acceleration Rounds
                    </label>
                    <input
                      type="number"
                      id="settings.acceleration_rounds"
                      name="settings.acceleration_rounds"
                      value={formData.settings.acceleration_rounds}
                      onChange={handleInputChange}
                      min="1"
                      max="5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of rounds to use acceleration (default: 2)
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="settings.acceleration_threshold" className="block text-sm font-medium text-gray-700 mb-2">
                    Acceleration Threshold
                  </label>
                  <input
                    type="number"
                    id="settings.acceleration_threshold"
                    name="settings.acceleration_threshold"
                    value={formData.settings.acceleration_threshold || ''}
                    onChange={handleInputChange}
                    min="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                    placeholder={`Auto: ${Math.pow(2, formData.rounds + 1)} players`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum players to trigger acceleration (auto: 2^(rounds+1))
                  </p>
                </div>

                {formData.settings.acceleration_type === 'standard' && (
                  <div>
                    <label htmlFor="settings.acceleration_break_point" className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Break Point (Optional)
                    </label>
                    <input
                      type="number"
                      id="settings.acceleration_break_point"
                      name="settings.acceleration_break_point"
                      value={formData.settings.acceleration_break_point || ''}
                      onChange={handleInputChange}
                      min="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                      placeholder="Auto: Round up to even number"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Custom break point between A and B groups (auto: round up to even)
                    </p>
                  </div>
                )}

                {formData.settings.acceleration_type === 'standard' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="settings.added_score_accelerators"
                      name="settings.added_score_accelerators"
                      checked={formData.settings.added_score_accelerators}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-chess-board focus:ring-chess-board border-gray-300 rounded"
                    />
                    <label htmlFor="settings.added_score_accelerators" className="ml-2 block text-sm text-gray-700">
                      Use Added Score Method (USCF 28R1)
                    </label>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Tiebreaker Settings</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure the order of tiebreakers used to rank players with equal scores. 
              Based on USCF tournament standards.
            </p>
            
            <div className="space-y-3">
              {formData.settings.tie_break_criteria.map((tiebreaker, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700 w-8">{index + 1}.</span>
                  <select
                    value={tiebreaker}
                    onChange={(e) => {
                      const newCriteria = [...formData.settings.tie_break_criteria];
                      newCriteria[index] = e.target.value as 'buchholz' | 'sonnebornBerger' | 'performanceRating' | 'modifiedBuchholz' | 'cumulative' | 'koya' | 'directEncounter' | 'avgOpponentRating';
                      setFormData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          tie_break_criteria: newCriteria
                        }
                      }));
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                  >
                    <option value="buchholz">Buchholz (Sum of Opponents' Scores)</option>
                    <option value="sonnebornBerger">Sonneborn-Berger</option>
                    <option value="performanceRating">Performance Rating</option>
                    <option value="modifiedBuchholz">Modified Buchholz</option>
                    <option value="cumulative">Cumulative</option>
                  </select>
                  {formData.settings.tie_break_criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newCriteria = formData.settings.tie_break_criteria.filter((_, i) => i !== index);
                        setFormData(prev => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            tie_break_criteria: newCriteria
                          }
                        }));
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      tie_break_criteria: [...prev.settings.tie_break_criteria, 'buchholz']
                    }
                  }));
                }}
                className="flex items-center space-x-2 text-chess-board hover:text-chess-dark text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Tiebreaker</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tournament Sections</h2>
            <button
              type="button"
              onClick={addSection}
              className="flex items-center space-x-2 bg-chess-board text-white px-4 py-2 rounded-lg hover:bg-chess-dark transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Section</span>
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Define sections to group players by rating ranges. Players will be automatically assigned to sections based on their ratings.
          </p>

          <div className="space-y-4">
            {formData.settings.sections.map((section, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-md font-medium text-gray-900">Section {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    disabled={formData.settings.sections.length <= 1}
                    className={`text-red-600 hover:text-red-800 ${
                      formData.settings.sections.length <= 1 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    }`}
                    title={formData.settings.sections.length <= 1 ? 'At least one section is required' : 'Remove section'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Section Name *
                      </label>
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) => updateSection(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                        placeholder="e.g., Open, U1800, U1400"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Rating
                      </label>
                      <input
                        type="number"
                        value={section.min_rating || ''}
                        onChange={(e) => updateSection(index, 'min_rating', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                        placeholder="e.g., 1400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Rating
                      </label>
                      <input
                        type="number"
                        value={section.max_rating || ''}
                        onChange={(e) => updateSection(index, 'max_rating', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                        placeholder="e.g., 1799"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={section.description || ''}
                      onChange={(e) => updateSection(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                      placeholder="Brief description of this section"
                    />
                  </div>
                </div>
              ))}
            </div>
        </div>

        {/* Prize Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Prize Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prize Fund ($)
              </label>
              <input
                type="number"
                name="settings.prize_fund"
                value={formData.settings.prize_fund || ''}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Total prize fund amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Fee ($)
              </label>
              <input
                type="number"
                name="settings.entry_fee"
                value={formData.settings.entry_fee || ''}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-chess-board focus:border-transparent"
                placeholder="Entry fee per player"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto_populate"
                name="settings.prize_settings.autoAssign"
                checked={formData.settings.prize_settings?.autoAssign || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      prize_settings: {
                        ...prev.settings.prize_settings,
                        autoAssign: checked
                      }
                    }
                  }));
                }}
                className="h-4 w-4 text-chess-board focus:ring-chess-board border-gray-300 rounded"
              />
              <label htmlFor="auto_populate" className="ml-2 block text-sm text-gray-900">
                Auto-populate prizes when tournament completes
              </label>
            </div>

          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-chess-board text-white px-6 py-2 rounded-lg hover:bg-chess-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            <span>{loading ? 'Creating...' : 'Create Tournament'}</span>
          </button>
        </div>
      </form>

      {/* Organization Selector Modal */}
      {showOrgSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Select Organization</h2>
              <button
                onClick={() => setShowOrgSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {orgState.organizations.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">You don't belong to any organizations yet.</p>
                <button
                  onClick={() => {
                    setShowOrgSelector(false);
                    navigate('/profile');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Organization
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orgState.organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      orgState.currentOrganization?.id === org.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setCurrentOrganization(org);
                      setShowOrgSelector(false);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-6 w-6 text-blue-600" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{org.name}</h3>
                        <p className="text-sm text-gray-600">{org.description || 'No description'}</p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-2 ${
                          org.role === 'owner'
                            ? 'bg-purple-100 text-purple-800'
                            : org.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {org.role}
                        </span>
                      </div>
                      {orgState.currentOrganization?.id === org.id && (
                        <div className="text-blue-600 font-medium">Selected</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowOrgSelector(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowOrgSelector(false);
                  navigate('/profile');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Manage Organizations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTournament;
