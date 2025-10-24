import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, Users, FileSpreadsheet } from 'lucide-react';
import { playerApi } from '../services/api';
import { useTournament } from '../contexts/TournamentContext';

interface CSVPlayer {
  name: string;
  uscf_id?: string;
  fide_id?: string;
  rating?: number;
  section?: string;
  team_name?: string;
  status: string;
  state?: string;
  city?: string;
  email?: string;
  phone?: string;
  bye_rounds?: string;
  expiration_date?: string;
  notes?: string;
}

interface FileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
}

const FileImportModal: React.FC<FileImportModalProps> = ({ isOpen, onClose, tournamentId }) => {
  const { dispatch } = useTournament();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'excel' | null>(null);
  const [players, setPlayers] = useState<CSVPlayer[]>([]);
  const [parseErrors, setParseErrors] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [lookupRatings, setLookupRatings] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [importProgress, setImportProgress] = useState<{current: number, total: number, stage: string}>({current: 0, total: 0, stage: ''});

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      const fileMimeType = selectedFile.type;
      
      // Check for CSV files
      if (fileMimeType === 'text/csv' || fileName.endsWith('.csv')) {
        setFile(selectedFile);
        setFileType('csv');
        setError(null);
      }
      // Check for Excel files
      else if (
        fileMimeType === 'application/vnd.ms-excel' ||
        fileMimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        fileName.endsWith('.xls') ||
        fileName.endsWith('.xlsx')
      ) {
        setFile(selectedFile);
        setFileType('excel');
        setError(null);
      } else {
        setError('Please select a CSV or Excel file (.csv, .xls, .xlsx)');
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !fileType) return;

    setLoading(true);
    setError(null);

    try {
      let response;
      if (fileType === 'csv') {
        response = await playerApi.uploadCSV(file, tournamentId, lookupRatings);
      } else {
        response = await playerApi.uploadExcel(file, tournamentId, lookupRatings);
      }
      
      if (response.data.success) {
        const data = response.data.data;
        setPlayers(data.players);
        setParseErrors(data.parseErrors || []);
        setValidationErrors(data.validationErrors || []);
      } else {
        throw new Error(response.data.error || `Failed to upload ${fileType.toUpperCase()} file`);
      }
      setStep('preview');
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to upload ${fileType?.toUpperCase()} file`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setStep('importing');
    setImportProgress({current: 0, total: players.length, stage: 'Starting import...'});

    try {
      // Simulate progress updates for better UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => ({
          ...prev,
          current: Math.min(prev.current + Math.ceil(players.length / 10), players.length),
          stage: prev.current < players.length * 0.3 ? 'Parsing players...' :
                 prev.current < players.length * 0.7 ? 'Looking up ratings...' :
                 prev.current < players.length * 0.9 ? 'Importing to database...' :
                 'Finalizing...'
        }));
      }, 200);

      const response = fileType === 'csv' 
        ? await playerApi.importCSV(tournamentId, players, lookupRatings)
        : await playerApi.importExcel(tournamentId, players, lookupRatings);
      
      clearInterval(progressInterval);
      setImportProgress({current: players.length, total: players.length, stage: 'Complete!'});
      
      if (response.data.success) {
        const data = response.data.data;
        setImportResults(data);
        
        // Add players to tournament context
        if (data.player_ids && data.player_ids.length > 0) {
          // Fetch the updated player list
          const playersResponse = await playerApi.getByTournament(tournamentId);
          if (playersResponse.data.success) {
            dispatch({ type: 'SET_PLAYERS', payload: playersResponse.data.data });
          }
        }
      } else {
        throw new Error(response.data.error || 'Failed to import players');
      }

      setStep('complete');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import players');
      setStep('preview');
    } finally {
      setLoading(false);
      setImportProgress({current: 0, total: 0, stage: ''});
    }
  };

  const handleDownloadTemplate = async (type: 'csv' | 'excel') => {
    try {
      const response = type === 'csv' 
        ? await playerApi.downloadTemplate()
        : await playerApi.downloadExcelTemplate();
      
      const mimeType = type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const extension = type === 'csv' ? 'csv' : 'xlsx';
      
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `player_template.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to download ${type.toUpperCase()} template`);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setFileType(null);
    setPlayers([]);
    setParseErrors([]);
    setValidationErrors([]);
    setError(null);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Player File</h3>
        <p className="text-gray-600">Select a CSV or Excel file containing player data to import</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Player File (CSV or Excel)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-green-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB) - {fileType?.toUpperCase()}
            </p>
          )}
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="lookupRatings"
            checked={lookupRatings}
            onChange={(e) => setLookupRatings(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="lookupRatings" className="ml-2 block text-sm text-gray-700">
            Lookup ratings for players with USCF IDs
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => handleDownloadTemplate('csv')}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV Template</span>
          </button>
          <button
            onClick={() => handleDownloadTemplate('excel')}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Download Excel Template</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Import</h3>
        <p className="text-gray-600">
          Review the {players.length} players that will be imported
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h4 className="text-sm font-medium text-red-800">Validation Errors</h4>
          </div>
          <div className="text-sm text-red-700">
            {validationErrors.map((error, index) => (
              <div key={index} className="mb-1">
                Row {error.row}: {error.player} - {error.errors.join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            <h4 className="text-sm font-medium text-yellow-800">Parse Warnings</h4>
          </div>
          <div className="text-sm text-yellow-700">
            {parseErrors.map((error, index) => (
              <div key={index} className="mb-1">
                Row {error.row}: {error.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Players Preview */}
      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">USCF ID</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bye Rounds</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {players.slice(0, 10).map((player, index) => (
              <tr key={index}>
                <td className="px-3 py-2 text-sm text-gray-900">{player.name}</td>
                <td className="px-3 py-2 text-sm text-gray-900">{player.uscf_id || '-'}</td>
                <td className="px-3 py-2 text-sm text-gray-900">{player.rating || '-'}</td>
                <td className="px-3 py-2 text-sm text-gray-900">{player.section || '-'}</td>
                <td className="px-3 py-2 text-sm text-gray-900">{player.team_name || '-'}</td>
                <td className="px-3 py-2 text-sm text-gray-900">{player.status}</td>
                <td className="px-3 py-2 text-sm text-gray-900">{player.bye_rounds || '-'}</td>
                <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">{player.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {players.length > 10 && (
          <div className="px-3 py-2 text-sm text-gray-500 text-center bg-gray-50">
            ... and {players.length - 10} more players
          </div>
        )}
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <h3 className="text-lg font-semibold text-gray-900">Importing Players</h3>
      <p className="text-gray-600">{importProgress.stage}</p>
      
      {/* Progress bar */}
      {importProgress.total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
          ></div>
        </div>
      )}
      
      <p className="text-sm text-gray-500">
        {importProgress.current} of {importProgress.total} players processed
      </p>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-4">
      <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
      <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
      <div className="text-gray-600">
        <p>Successfully imported {importResults?.importedCount || 0} players</p>
        {importResults?.ratingLookupResults && (
          <p className="text-sm mt-2">
            Rating lookups: {importResults.ratingLookupResults.filter((r: any) => r.success).length} successful
          </p>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900">Import Players from File</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'importing' && renderImportingStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          {step === 'upload' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className={`px-4 py-2 rounded-md transition-colors ${
                  file && !loading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Uploading...' : 'Upload & Preview'}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading || players.length === 0}
                className={`px-4 py-2 rounded-md transition-colors ${
                  !loading && players.length > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Importing...' : `Import ${players.length} Players`}
              </button>
            </>
          )}

          {step === 'complete' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileImportModal;

