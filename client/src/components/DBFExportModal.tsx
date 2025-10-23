import React, { useState, useEffect, useCallback } from 'react';
import { exportApi } from '../services/api';

interface DBFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
}

interface ExportStatus {
  success: boolean;
  tournament: {
    id: string;
    name: string;
    rounds: number;
    format: string;
    status: string;
  };
  exportPath: string;
  files: {
    [key: string]: {
      exists: boolean;
      size: number;
      modified: string | null;
      path: string;
    };
  };
  allFilesExist: boolean;
}

const DBFExportModal: React.FC<DBFExportModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentName
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadExportStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await exportApi.getExportStatus(tournamentId);
      setExportStatus(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load export status');
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (isOpen) {
      loadExportStatus();
      // Auto-refresh every 30 seconds when modal is open
      const interval = setInterval(loadExportStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, tournamentId, loadExportStatus]);

  const handleExportDBF = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await exportApi.exportDBF(tournamentId);
      
      if (response.data.success) {
        setSuccess('DBF files exported successfully!');
        await loadExportStatus(); // Refresh status
      } else {
        setError(response.data.message || 'Export failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export DBF files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDBF = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      
      const response = await exportApi.downloadDBF(tournamentId);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tournamentName.replace(/[^a-zA-Z0-9]/g, '_')}_USCF_Export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess('DBF files downloaded successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download DBF files');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Export USCF DBF Files
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Tournament: {tournamentName}
            </h3>
            <p className="text-gray-600 text-sm">
              Export tournament data in USCF-compatible DBF format for rating submission.
              This creates three files: THEXPORT.DBF (Tournament Header), TSEXPORT.DBF (Section Header), 
              and TDEXPORT.DBF (Player Details).
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* Export Status */}
          {exportStatus && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-800 mb-3">
                Export Status
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(exportStatus.files).map(([fileName, fileInfo]) => (
                    <div key={fileName} className="text-sm">
                      <div className="font-medium text-gray-700">{fileName}</div>
                      <div className={`text-xs ${fileInfo.exists ? 'text-green-600' : 'text-red-600'}`}>
                        {fileInfo.exists ? '✓ Exists' : '✗ Missing'}
                      </div>
                      {fileInfo.exists && (
                        <>
                          <div className="text-xs text-gray-500">
                            Size: {formatFileSize(fileInfo.size)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Modified: {formatDate(fileInfo.modified)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      All files ready:
                    </span>
                    <span className={`text-sm font-medium ${exportStatus.allFilesExist ? 'text-green-600' : 'text-red-600'}`}>
                      {exportStatus.allFilesExist ? '✓ Yes' : '✗ No - Auto-generating...'}
                    </span>
                  </div>
                  {!exportStatus.allFilesExist && (
                    <div className="mt-2 text-xs text-blue-600">
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Missing files are being generated automatically...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportDBF}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                'Export DBF Files'
              )}
            </button>

            <button
              onClick={handleDownloadDBF}
              disabled={isDownloading || !exportStatus?.allFilesExist}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                'Download ZIP'
              )}
            </button>

            <button
              onClick={loadExportStatus}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refresh
            </button>
          </div>

          {/* USCF Information */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">
              USCF Submission Information
            </h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• These DBF files are compatible with USCF's TD/Affiliate Support Area</p>
              <p>• Upload the ZIP file to: <a href="https://secure2.uschess.org/TD_Affil" target="_blank" rel="noopener noreferrer" className="underline">secure2.uschess.org/TD_Affil</a></p>
              <p>• Files will be validated and processed for rating updates</p>
              <p>• Make sure all player USCF IDs and results are accurate before submission</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DBFExportModal;

