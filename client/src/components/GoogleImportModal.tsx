import React, { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, FileText, CheckCircle, XCircle, AlertCircle, Users, Brain, Eye, Download, ExternalLink } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';

interface GoogleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  data: {
    tournament_id: string;
    tournament_name: string;
    imported_count: number;
    player_ids: string[];
    rating_lookup_results: any[];
    import_errors: any[];
    validation_errors: any[];
    field_mapping?: any;
    data_analysis?: any;
    metadata?: any;
  };
}

const GoogleImportModal: React.FC<GoogleImportModalProps> = ({ isOpen, onClose, tournamentId }) => {
  const { dispatch } = useTournament();
  const [step, setStep] = useState<'select' | 'configure' | 'preview' | 'importing' | 'complete'>('select');
  const [importType, setImportType] = useState<'sheets' | 'forms' | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [formId, setFormId] = useState('');
  const [range, setRange] = useState('Sheet1!A1:Z1000');
  const [lookupRatings, setLookupRatings] = useState(true);
  const [autoAssignSections, setAutoAssignSections] = useState(true);
  const [useSmartImport, setUseSmartImport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [apiKey, setApiKey] = useState('demo-key-123');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setImportType(null);
      setSpreadsheetId('');
      setFormId('');
      setRange('Sheet1!A1:Z1000');
      setLookupRatings(true);
      setAutoAssignSections(true);
      setUseSmartImport(true);
      setLoading(false);
      setError(null);
      setPreviewData(null);
      setImportResults(null);
    }
  }, [isOpen]);

  const handleImportTypeSelect = (type: 'sheets' | 'forms') => {
    setImportType(type);
    setStep('configure');
    setError(null);
  };

  const handlePreview = async () => {
    if (!importType) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = importType === 'sheets' 
        ? '/api/google-import/sheets/preview'
        : '/api/google-import/forms/preview';

      const requestBody = importType === 'sheets'
        ? { spreadsheet_id: spreadsheetId, range, api_key: apiKey }
        : { form_id: formId, api_key: apiKey };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setPreviewData(data.data);
        setStep('preview');
      } else {
        setError(data.error || 'Failed to preview data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to preview data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importType) return;

    setLoading(true);
    setError(null);
    setStep('importing');

    try {
      const endpoint = useSmartImport
        ? `/api/google-import/smart/${importType}`
        : `/api/google-import/${importType}`;

      const requestBody = {
        ...(importType === 'sheets' ? { spreadsheet_id: spreadsheetId, range } : { form_id: formId }),
        tournament_id: tournamentId,
        lookup_ratings: lookupRatings,
        auto_assign_sections: autoAssignSections,
        api_key: apiKey
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setImportResults(data);
        setStep('complete');
        
        // Refresh tournament data
        dispatch({ type: 'REFRESH_TOURNAMENT', payload: tournamentId });
      } else {
        setError(data.error || 'Failed to import data');
        setStep('configure');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import data');
      setStep('configure');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleBack = () => {
    if (step === 'preview') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('select');
    }
  };

  const getSpreadsheetIdFromUrl = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  };

  const getFormIdFromUrl = (url: string) => {
    const match = url.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Google Import</h2>
              <p className="text-sm text-gray-500">Import players from Google Sheets or Forms</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Import Type */}
          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Import Source</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleImportTypeSelect('sheets')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">Google Sheets</h4>
                        <p className="text-sm text-gray-500">Import from a spreadsheet</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Import player data from a Google Sheets spreadsheet. Perfect for bulk imports and data management.
                    </p>
                  </button>

                  <button
                    onClick={() => handleImportTypeSelect('forms')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <FileText className="h-8 w-8 text-purple-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">Google Forms</h4>
                        <p className="text-sm text-gray-500">Import from form responses</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Import player registrations from Google Forms responses. Great for online registration.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configure Import */}
          {step === 'configure' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-medium text-gray-900">
                  Configure {importType === 'sheets' ? 'Google Sheets' : 'Google Forms'} Import
                </h3>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your API key"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use 'demo-key-123' for testing, or contact administrator for production key
                </p>
              </div>

              {/* Google Sheets Configuration */}
              {importType === 'sheets' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spreadsheet URL or ID
                    </label>
                    <input
                      type="text"
                      value={spreadsheetId}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.includes('docs.google.com')) {
                          setSpreadsheetId(getSpreadsheetIdFromUrl(value));
                        } else {
                          setSpreadsheetId(value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://docs.google.com/spreadsheets/d/... or spreadsheet ID (use 'demo' for testing)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste the full Google Sheets URL or just the spreadsheet ID. Use 'demo' to test with sample data.
                    </p>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setSpreadsheetId('demo')}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                      >
                        Use Demo Data
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Range (optional)
                    </label>
                    <input
                      type="text"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Sheet1!A1:Z1000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Specify the range to import (e.g., Sheet1!A1:Z1000)
                    </p>
                  </div>
                </>
              )}

              {/* Google Forms Configuration */}
              {importType === 'forms' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Form URL or ID
                  </label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.includes('forms.google.com')) {
                        setFormId(getFormIdFromUrl(value));
                      } else {
                        setFormId(value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://forms.google.com/d/... or form ID"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the full Google Forms URL or just the form ID
                  </p>
                </div>
              )}

              {/* Import Options */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Import Options</h4>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="smartImport"
                    checked={useSmartImport}
                    onChange={(e) => setUseSmartImport(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="smartImport" className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">Smart Import</span>
                    <span className="text-xs text-gray-500">(Recommended)</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-7">
                  Automatically detect and map fields, validate data, and provide intelligent recommendations
                </p>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="lookupRatings"
                    checked={lookupRatings}
                    onChange={(e) => setLookupRatings(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="lookupRatings" className="text-sm font-medium text-gray-700">
                    Lookup USCF Ratings
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-7">
                  Automatically fetch current ratings for players with USCF IDs
                </p>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="autoAssignSections"
                    checked={autoAssignSections}
                    onChange={(e) => setAutoAssignSections(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoAssignSections" className="text-sm font-medium text-gray-700">
                    Auto-assign Sections
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-7">
                  Automatically assign players to sections based on their ratings
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePreview}
                  disabled={loading || (!spreadsheetId && !formId)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview Data</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview Data */}
          {step === 'preview' && previewData && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ← Back
                </button>
                <h3 className="text-lg font-medium text-gray-900">Preview Data</h3>
              </div>

              {/* Preview Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Preview Summary</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Total Players:</span>
                    <span className="ml-2 font-medium">{previewData.players?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Errors:</span>
                    <span className="ml-2 font-medium">{previewData.errors?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Source:</span>
                    <span className="ml-2 font-medium capitalize">{importType}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Smart Import:</span>
                    <span className="ml-2 font-medium">{useSmartImport ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Sample Data */}
              {previewData.players && previewData.players.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Sample Players (first 5)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">USCF ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewData.players.slice(0, 5).map((player: any, index: number) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{player.name || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{player.uscf_id || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{player.rating || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{player.section || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{player.email || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Errors */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-900 mb-3">Errors Found</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="space-y-2">
                      {previewData.errors.slice(0, 5).map((error: any, index: number) => (
                        <div key={index} className="text-sm text-red-700">
                          <span className="font-medium">Row {error.row || error.response}:</span> {error.error}
                        </div>
                      ))}
                      {previewData.errors.length > 5 && (
                        <div className="text-sm text-red-600">
                          ... and {previewData.errors.length - 5} more errors
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import Players</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Players</h3>
              <p className="text-gray-500">Please wait while we import your data...</p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && importResults && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete!</h3>
                <p className="text-gray-500">
                  Successfully imported {importResults.data.imported_count} players
                </p>
              </div>

              {/* Results Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Imported:</span>
                    <span className="ml-2 font-medium text-green-900">{importResults.data.imported_count}</span>
                  </div>
                  <div>
                    <span className="text-green-700">Rating Lookups:</span>
                    <span className="ml-2 font-medium text-green-900">
                      {importResults.data.rating_lookup_results?.length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700">Errors:</span>
                    <span className="ml-2 font-medium text-green-900">
                      {(importResults.data.import_errors?.length || 0) + (importResults.data.validation_errors?.length || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700">Tournament:</span>
                    <span className="ml-2 font-medium text-green-900">{importResults.data.tournament_name}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleImportModal;
