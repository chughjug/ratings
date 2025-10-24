import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, FileSpreadsheet, Code, Database, CheckCircle, XCircle, AlertCircle, Users, Brain, Eye, Download, ExternalLink } from 'lucide-react';
import { useTournament } from '../contexts/TournamentContext';

interface UnifiedImportModalProps {
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

const UnifiedImportModal: React.FC<UnifiedImportModalProps> = ({ isOpen, onClose, tournamentId }) => {
  const { dispatch } = useTournament();
  const [step, setStep] = useState<'select' | 'configure' | 'preview' | 'importing' | 'complete'>('select');
  const [importType, setImportType] = useState<'csv' | 'excel' | 'sheets' | 'forms' | 'api' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [formId, setFormId] = useState('');
  const [range, setRange] = useState('Sheet1!A1:Z1000');
  const [apiData, setApiData] = useState('');
  const [lookupRatings, setLookupRatings] = useState(true);
  const [autoAssignSections, setAutoAssignSections] = useState(true);
  const [useSmartImport, setUseSmartImport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [apiKey, setApiKey] = useState('demo-key-123');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setImportType(null);
      setFile(null);
      setSpreadsheetId('');
      setFormId('');
      setRange('Sheet1!A1:Z1000');
      setApiData('');
      setLookupRatings(true);
      setAutoAssignSections(true);
      setUseSmartImport(true);
      setLoading(false);
      setError(null);
      setPreviewData(null);
      setImportResults(null);
    }
  }, [isOpen]);

  const handleImportTypeSelect = (type: 'csv' | 'excel' | 'sheets' | 'forms' | 'api') => {
    setImportType(type);
    setStep('configure');
    setError(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      const fileMimeType = selectedFile.type;
      
      // Check for CSV files
      if (fileName.endsWith('.csv') || fileMimeType === 'text/csv') {
        setFile(selectedFile);
        setImportType('csv');
      }
      // Check for Excel files
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
               fileMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               fileMimeType === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        setImportType('excel');
      }
      else {
        setError('Please select a CSV or Excel file');
        return;
      }
      
      setStep('configure');
    }
  };

  const handleFilePreview = async () => {
    if (!file || !importType) return;

    try {
      // Determine the correct base URL based on environment
      const getApiBaseUrl = () => {
        if (process.env.REACT_APP_API_URL) {
          return process.env.REACT_APP_API_URL;
        }
        if (process.env.NODE_ENV === 'production') {
          return '/api';
        }
        return 'http://localhost:5000/api';
      };

      const baseUrl = getApiBaseUrl();
      let endpoint = '';
      
      if (importType === 'csv') {
        endpoint = `${baseUrl}/players/csv-upload`;
      } else if (importType === 'excel') {
        endpoint = `${baseUrl}/players/excel-upload`;
      }

      const formData = new FormData();
      formData.append(importType === 'csv' ? 'csvFile' : 'excelFile', file);
      formData.append('tournament_id', tournamentId);
      formData.append('lookup_ratings', 'false'); // Don't lookup ratings for preview

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setPreviewData({
          players: data.data.players || [],
          errors: data.data.parseErrors || [],
          validationErrors: data.data.validationErrors || [],
          message: `File parsed successfully. Found ${data.data.players?.length || 0} players.`
        });
        setStep('preview');
      } else {
        setError(data.error || 'Failed to parse file');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to parse file');
    }
  };

  const handlePreview = async () => {
    if (!importType) return;

    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      let requestBody: any = {};

      switch (importType) {
        case 'csv':
        case 'excel':
          if (!file) {
            setError('Please select a file first');
            setLoading(false);
            return;
          }
          // Parse file for preview
          await handleFilePreview();
          setLoading(false);
          return;

        case 'sheets':
          // Determine the correct base URL based on environment
          const getSheetsPreviewBaseUrl = () => {
            if (process.env.REACT_APP_API_URL) {
              return process.env.REACT_APP_API_URL;
            }
            if (process.env.NODE_ENV === 'production') {
              return '/api';
            }
            return 'http://localhost:5000/api';
          };
          const sheetsPreviewBaseUrl = getSheetsPreviewBaseUrl();
          endpoint = `${sheetsPreviewBaseUrl}/google-import/sheets/preview`;
          requestBody = { 
            spreadsheet_id: spreadsheetId, 
            range, 
            api_key: apiKey 
          };
          break;

        case 'forms':
          // Determine the correct base URL based on environment
          const getFormsPreviewBaseUrl = () => {
            if (process.env.REACT_APP_API_URL) {
              return process.env.REACT_APP_API_URL;
            }
            if (process.env.NODE_ENV === 'production') {
              return '/api';
            }
            return 'http://localhost:5000/api';
          };
          const formsPreviewBaseUrl = getFormsPreviewBaseUrl();
          endpoint = `${formsPreviewBaseUrl}/google-import/forms/preview`;
          requestBody = { 
            form_id: formId, 
            api_key: apiKey 
          };
          break;

        case 'api':
          // For API data, we'll parse it directly
          try {
            const parsedData = JSON.parse(apiData);
            setPreviewData({ 
              players: Array.isArray(parsedData) ? parsedData : parsedData.players || [],
              message: 'API data parsed successfully'
            });
            setStep('preview');
            setLoading(false);
            return;
          } catch (parseError) {
            setError('Invalid JSON data. Please check your API data format.');
            setLoading(false);
            return;
          }
      }

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
      let endpoint = '';
      let requestBody: any = {
        tournament_id: tournamentId,
        lookup_ratings: lookupRatings,
        auto_assign_sections: autoAssignSections
      };

      // Add API key only for services that require it
      if (importType === 'sheets' || importType === 'forms' || importType === 'api') {
        requestBody.api_key = apiKey;
      }

      switch (importType) {
        case 'csv':
          if (!file) {
            setError('Please select a CSV file');
            setStep('configure');
            setLoading(false);
            return;
          }
          // Determine the correct base URL based on environment
          const getApiBaseUrl = () => {
            if (process.env.REACT_APP_API_URL) {
              return process.env.REACT_APP_API_URL;
            }
            if (process.env.NODE_ENV === 'production') {
              return '/api';
            }
            return 'http://localhost:5000/api';
          };
          const baseUrl = getApiBaseUrl();
          endpoint = `${baseUrl}/players/csv-upload`;
          // For file uploads, we need to use FormData
          const csvFormData = new FormData();
          csvFormData.append('csvFile', file);
          csvFormData.append('tournament_id', tournamentId);
          csvFormData.append('lookup_ratings', lookupRatings.toString());

          const csvResponse = await fetch(endpoint, {
            method: 'POST',
            body: csvFormData,
          });

          const csvData = await csvResponse.json();
          if (csvData.success) {
            // Now import the parsed data
            const importResponse = await fetch(`${baseUrl}/players/csv-import`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tournament_id: tournamentId,
                players: csvData.data.players,
                lookup_ratings: lookupRatings
              })
            });
            const importData = await importResponse.json();
            setImportResults(importData);
            setStep('complete');
            dispatch({ type: 'REFRESH_TOURNAMENT', payload: tournamentId });
          } else {
            setError(csvData.error || 'Failed to import CSV');
            setStep('configure');
          }
          setLoading(false);
          return;

        case 'excel':
          if (!file) {
            setError('Please select an Excel file');
            setStep('configure');
            setLoading(false);
            return;
          }
          // Determine the correct base URL based on environment
          const getExcelApiBaseUrl = () => {
            if (process.env.REACT_APP_API_URL) {
              return process.env.REACT_APP_API_URL;
            }
            if (process.env.NODE_ENV === 'production') {
              return '/api';
            }
            return 'http://localhost:5000/api';
          };
          const excelBaseUrl = getExcelApiBaseUrl();
          endpoint = `${excelBaseUrl}/players/excel-upload`;
          // For file uploads, we need to use FormData
          const excelFormData = new FormData();
          excelFormData.append('excelFile', file);
          excelFormData.append('tournament_id', tournamentId);
          excelFormData.append('lookup_ratings', lookupRatings.toString());

          const excelResponse = await fetch(endpoint, {
            method: 'POST',
            body: excelFormData,
          });

          const excelData = await excelResponse.json();
          if (excelData.success) {
            // Now import the parsed data
            const importResponse = await fetch(`${excelBaseUrl}/players/excel-import`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tournament_id: tournamentId,
                players: excelData.data.players,
                lookup_ratings: lookupRatings
              })
            });
            const importData = await importResponse.json();
            setImportResults(importData);
            setStep('complete');
            dispatch({ type: 'REFRESH_TOURNAMENT', payload: tournamentId });
          } else {
            setError(excelData.error || 'Failed to import Excel');
            setStep('configure');
          }
          setLoading(false);
          return;

        case 'sheets':
          // Determine the correct base URL based on environment
          const getSheetsApiBaseUrl = () => {
            if (process.env.REACT_APP_API_URL) {
              return process.env.REACT_APP_API_URL;
            }
            if (process.env.NODE_ENV === 'production') {
              return '/api';
            }
            return 'http://localhost:5000/api';
          };
          const sheetsBaseUrl = getSheetsApiBaseUrl();
          endpoint = useSmartImport 
            ? `${sheetsBaseUrl}/google-import/smart/sheets` 
            : `${sheetsBaseUrl}/google-import/sheets`;
          requestBody = {
            ...requestBody,
            spreadsheet_id: spreadsheetId,
            range
          };
          break;

        case 'forms':
          // Determine the correct base URL based on environment
          const getFormsApiBaseUrl = () => {
            if (process.env.REACT_APP_API_URL) {
              return process.env.REACT_APP_API_URL;
            }
            if (process.env.NODE_ENV === 'production') {
              return '/api';
            }
            return 'http://localhost:5000/api';
          };
          const formsBaseUrl = getFormsApiBaseUrl();
          endpoint = useSmartImport 
            ? `${formsBaseUrl}/google-import/smart/forms` 
            : `${formsBaseUrl}/google-import/forms`;
          requestBody = {
            ...requestBody,
            form_id: formId
          };
          break;

        case 'api':
          // Determine the correct base URL based on environment
          const getApiImportBaseUrl = () => {
            if (process.env.REACT_APP_API_URL) {
              return process.env.REACT_APP_API_URL;
            }
            if (process.env.NODE_ENV === 'production') {
              return '/api';
            }
            return 'http://localhost:5000/api';
          };
          const apiImportBaseUrl = getApiImportBaseUrl();
          endpoint = `${apiImportBaseUrl}/players/api-import/${tournamentId}`;
          requestBody = {
            api_key: apiKey,
            players: JSON.parse(apiData),
            lookup_ratings: lookupRatings,
            auto_assign_sections: autoAssignSections
          };
          break;
      }

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
              <h2 className="text-xl font-semibold text-gray-900">Import Players</h2>
              <p className="text-sm text-gray-500">Import players from various sources</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* File Upload */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">File Upload</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleImportTypeSelect('csv')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group text-left"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <FileText className="h-6 w-6 text-green-600" />
                          <div>
                            <h5 className="font-medium text-gray-900">CSV File</h5>
                            <p className="text-sm text-gray-500">Upload CSV file</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleImportTypeSelect('excel')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                          <div>
                            <h5 className="font-medium text-gray-900">Excel File</h5>
                            <p className="text-sm text-gray-500">Upload Excel file</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Google Services */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Google Services</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleImportTypeSelect('sheets')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group text-left"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <FileSpreadsheet className="h-6 w-6 text-green-600" />
                          <div>
                            <h5 className="font-medium text-gray-900">Google Sheets</h5>
                            <p className="text-sm text-gray-500">Import from spreadsheet</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => handleImportTypeSelect('forms')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group text-left"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <FileText className="h-6 w-6 text-purple-600" />
                          <div>
                            <h5 className="font-medium text-gray-900">Google Forms</h5>
                            <p className="text-sm text-gray-500">Import from form responses</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* API */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">API Integration</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleImportTypeSelect('api')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group text-left"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <Code className="h-6 w-6 text-orange-600" />
                          <div>
                            <h5 className="font-medium text-gray-900">API Data</h5>
                            <p className="text-sm text-gray-500">Paste JSON data</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
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
                  Configure {importType?.toUpperCase()} Import
                </h3>
              </div>

              {/* API Key - Only show for Google services and API */}
              {(importType === 'sheets' || importType === 'forms' || importType === 'api') && (
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
              )}

              {/* File Upload Configuration */}
              {(importType === 'csv' || importType === 'excel') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={importType === 'csv' ? '.csv' : '.xlsx,.xls'}
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {file && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Selected: {file.name}
                    </p>
                  )}
                </div>
              )}

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
                      placeholder="https://docs.google.com/spreadsheets/d/... or spreadsheet ID"
                    />
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
                </div>
              )}

              {/* API Data Configuration */}
              {importType === 'api' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JSON Data
                  </label>
                  <textarea
                    value={apiData}
                    onChange={(e) => setApiData(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 font-mono text-sm"
                    placeholder='[{"name": "John Doe", "uscf_id": "12345", "rating": 1800}, ...]'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste JSON array of player objects
                  </p>
                </div>
              )}

              {/* Import Options */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Import Options</h4>
                
                {(importType === 'sheets' || importType === 'forms') && (
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
                )}

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
                  disabled={loading || 
                    (importType === 'csv' && !file) ||
                    (importType === 'excel' && !file) ||
                    (importType === 'sheets' && !spreadsheetId) ||
                    (importType === 'forms' && !formId) ||
                    (importType === 'api' && !apiData)
                  }
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
                  <Database className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Preview Summary</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Total Players:</span>
                    <span className="ml-2 font-medium">{previewData.players?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Parse Errors:</span>
                    <span className="ml-2 font-medium">{previewData.errors?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Validation Errors:</span>
                    <span className="ml-2 font-medium">{previewData.validationErrors?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">Source:</span>
                    <span className="ml-2 font-medium capitalize">{importType}</span>
                  </div>
                </div>
                {previewData.message && (
                  <div className="mt-3 text-sm text-blue-700">
                    {previewData.message}
                  </div>
                )}
              </div>

              {/* Sample Data */}
              {previewData.players && previewData.players.length > 0 ? (
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
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">No Players Found</span>
                  </div>
                  <p className="text-yellow-700 mt-1">
                    The file was processed but no valid player data was found. Please check your file format and try again.
                  </p>
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

export default UnifiedImportModal;
