import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Layers,
  RefreshCcw,
  X,
} from 'lucide-react';
import { exportApi } from '../services/api';

interface TRFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
  totalRounds: number;
  currentRound?: number;
}

interface TrfMetadata {
  round?: number;
  totalPlayers?: number;
  playedRounds?: number;
  expectedRounds?: number;
}

interface TrfAllRoundsResult {
  summary?: {
    totalRounds: number;
    successCount: number;
    failureCount: number;
  };
  files?: Array<{
    round: number;
    fileName: string;
    filePath?: string;
  }>;
  errors?: Array<{
    round: number;
    error: string;
  }>;
}

interface TrfValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats?: {
    totalLines: number;
    playerLines: number;
    extensionLines: number;
  };
}

const sanitizeFileName = (name: string) =>
  (name || 'Tournament').replace(/[^a-zA-Z0-9]/g, '_');

const TRFExportModal: React.FC<TRFExportModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  tournamentName,
  totalRounds,
  currentRound,
}) => {
  const [selectedRound, setSelectedRound] = useState<number>(() =>
    Math.max(currentRound || totalRounds || 1, 1)
  );
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<TrfMetadata | null>(null);
  const [content, setContent] = useState<string>('');
  const [validation, setValidation] = useState<TrfValidationResult | null>(null);
  const [allRoundsResult, setAllRoundsResult] =
    useState<TrfAllRoundsResult | null>(null);
  const [latestFileName, setLatestFileName] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultRound = Math.max(currentRound || totalRounds || 1, 1);
      setSelectedRound(defaultRound);
      setError(null);
      setSuccess(null);
      setValidation(null);
    }
  }, [isOpen, currentRound, totalRounds]);

  const roundOptions = useMemo(() => {
    const roundCount = Math.max(totalRounds, 1);
    return Array.from({ length: roundCount }, (_, index) => index + 1);
  }, [totalRounds]);

  const handleGenerateTrf = useCallback(async () => {
    setLoadingAction('generate');
    setError(null);
    setSuccess(null);
    setValidation(null);
    try {
      const response = await exportApi.exportTRF(tournamentId, {
        round: selectedRound,
      });
      if (response.data?.success) {
        setSuccess(`TRF file generated for round ${selectedRound}.`);
        setMetadata(response.data.metadata || null);
        setContent(response.data.content || '');
        setLatestFileName(response.data.file?.fileName || null);
      } else {
        setError(response.data?.message || 'Failed to generate TRF file');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to generate TRF file'
      );
    } finally {
      setLoadingAction(null);
    }
  }, [selectedRound, tournamentId]);

  const handlePreviewTrf = useCallback(async () => {
    setLoadingAction('preview');
    setError(null);
    setSuccess(null);
    try {
      const response = await exportApi.getTRFContent(tournamentId, selectedRound);
      if (response.data?.success) {
        setContent(response.data.content || '');
        setMetadata(response.data.metadata || null);
        setSuccess(`Loaded TRF content for round ${selectedRound}.`);
      } else {
        setError(response.data?.message || 'Failed to load TRF content');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load TRF content'
      );
    } finally {
      setLoadingAction(null);
    }
  }, [selectedRound, tournamentId]);

  const handleDownloadTrf = useCallback(async () => {
    setLoadingAction('download');
    setError(null);
    setSuccess(null);
    try {
      const response = await exportApi.downloadTRF(tournamentId, selectedRound);
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = sanitizeFileName(tournamentName);
      const fileName =
        latestFileName ||
        `${safeName}_Round${selectedRound}.trf`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess(`TRF file downloaded (${fileName}).`);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to download TRF file'
      );
    } finally {
      setLoadingAction(null);
    }
  }, [latestFileName, selectedRound, tournamentId, tournamentName]);

  const handleExportAllRounds = useCallback(async () => {
    setLoadingAction('export-all');
    setError(null);
    setSuccess(null);
    try {
      const response = await exportApi.exportAllTRF(tournamentId);
      if (response.data?.success) {
        setAllRoundsResult({
          summary: response.data.summary,
          files: response.data.files,
          errors: response.data.errors,
        });
        setSuccess(
          `Exported ${response.data.summary?.successCount || 0} of ${
            response.data.summary?.totalRounds || 0
          } rounds.`
        );
      } else {
        setError(response.data?.message || 'Failed to export TRF files');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to export TRF files'
      );
    } finally {
      setLoadingAction(null);
    }
  }, [tournamentId]);

  const handleDownloadAll = useCallback(async () => {
    setLoadingAction('download-all');
    setError(null);
    setSuccess(null);
    try {
      const response = await exportApi.downloadAllTRF(tournamentId);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `${sanitizeFileName(
        tournamentName
      )}_TRF_Export.zip`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess('TRF export ZIP downloaded successfully.');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to download TRF ZIP file'
      );
    } finally {
      setLoadingAction(null);
    }
  }, [tournamentId, tournamentName]);

  const handleValidateContent = useCallback(async () => {
    if (!content) {
      setError('Load or generate TRF content before validating.');
      return;
    }
    setLoadingAction('validate');
    setError(null);
    setSuccess(null);
    try {
      const response = await exportApi.validateTRF(content);
      if (response.data?.success) {
        setValidation(response.data.validation);
        setSuccess('TRF content validated.');
      } else {
        setError(response.data?.message || 'Failed to validate TRF content');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to validate TRF content'
      );
    } finally {
      setLoadingAction(null);
    }
  }, [content]);

  if (!isOpen) {
    return null;
  }

  const isRoundSelectable = totalRounds > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Export FIDE TRF Files
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Generate TRF16-compliant reports directly from your tournament
              data. These files are compatible with JaVaFo, Vega, Swiss-Manager,
              and other FIDE-rated tournament systems.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close TRF export modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
              {success}
            </div>
          )}

          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Round Export
                </h3>
                <p className="text-sm text-gray-600">
                  Generate a TRF export up to the selected round. The generated
                  file includes all completed rounds up to this point.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <label className="flex flex-col space-y-2">
                <span className="text-xs font-semibold uppercase text-gray-600">
                  Round
                </span>
                <select
                  value={selectedRound}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setSelectedRound(Number.isNaN(value) ? 1 : value);
                  }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={!isRoundSelectable}
                >
                  {roundOptions.map((round) => (
                    <option key={round} value={round}>
                      Round {round}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">
                  Tournament has {totalRounds || 0} scheduled rounds.
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleGenerateTrf}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  !isRoundSelectable || loadingAction === 'generate'
                }
              >
                {loadingAction === 'generate' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Generating...
                  </span>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Generate TRF
                  </>
                )}
              </button>

              <button
                onClick={handlePreviewTrf}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  !isRoundSelectable || loadingAction === 'preview'
                }
              >
                {loadingAction === 'preview' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Loading...
                  </span>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Preview TRF
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadTrf}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  !isRoundSelectable || loadingAction === 'download'
                }
              >
                {loadingAction === 'download' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Downloading...
                  </span>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download TRF
                  </>
                )}
              </button>
            </div>
          </div>

          {metadata && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-blue-900">
                Latest TRF Export Details
              </h4>
              <div className="mt-2 grid gap-3 text-sm text-blue-900 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="font-medium">Round:</span>{' '}
                  {metadata.round ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Total Players:</span>{' '}
                  {metadata.totalPlayers ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Played Rounds:</span>{' '}
                  {metadata.playedRounds ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Expected Rounds:</span>{' '}
                  {metadata.expectedRounds ?? '—'}
                </div>
              </div>
            </div>
          )}

          {content && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  TRF Preview (read-only)
                </h4>
                <span className="text-xs text-gray-500">
                  {content.split('\n').length} lines
                </span>
              </div>
              <div className="mt-3 h-64 overflow-auto rounded-md bg-gray-900 p-4 text-xs text-green-100">
                <pre className="whitespace-pre-wrap font-mono">{content}</pre>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleValidateContent}
                  className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loadingAction === 'validate'}
                >
                  {loadingAction === 'validate' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Validating...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Validate Content
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {validation && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-center gap-2">
                {validation.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                <h4 className="text-sm font-semibold text-indigo-900">
                  TRF Validation
                </h4>
              </div>
              <div className="mt-3 grid gap-3 text-sm text-indigo-900 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  {validation.valid ? 'Valid' : 'Needs attention'}
                </div>
                <div>
                  <span className="font-medium">Total lines:</span>{' '}
                  {validation.stats?.totalLines ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Player lines:</span>{' '}
                  {validation.stats?.playerLines ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Extension lines:</span>{' '}
                  {validation.stats?.extensionLines ?? '—'}
                </div>
              </div>
              {validation.errors.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold uppercase text-amber-800">
                    Errors
                  </h5>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">
                    {validation.errors.map((item, index) => (
                      <li key={`trf-error-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold uppercase text-indigo-800">
                    Warnings
                  </h5>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-indigo-900">
                    {validation.warnings.map((item, index) => (
                      <li key={`trf-warning-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  All Rounds Export
                </h3>
                <p className="text-sm text-gray-600">
                  Generate TRF files for every round and download them as a
                  single ZIP archive.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleExportAllRounds}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loadingAction === 'export-all' || totalRounds === 0}
              >
                {loadingAction === 'export-all' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Exporting...
                  </span>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Export All Rounds
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadAll}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loadingAction === 'download-all' || totalRounds === 0}
              >
                {loadingAction === 'download-all' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Downloading...
                  </span>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download ZIP
                  </>
                )}
              </button>
            </div>

            {allRoundsResult?.summary && (
              <div className="mt-4 rounded-md border border-white bg-white p-4 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Total rounds:</span>{' '}
                  {allRoundsResult.summary.totalRounds}
                </div>
                <div>
                  <span className="font-medium">Exported successfully:</span>{' '}
                  {allRoundsResult.summary.successCount}
                </div>
                <div>
                  <span className="font-medium">Failed exports:</span>{' '}
                  {allRoundsResult.summary.failureCount}
                </div>
                {allRoundsResult.errors && allRoundsResult.errors.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-semibold uppercase text-rose-600">
                      Failed rounds
                    </h5>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {allRoundsResult.errors.map((item, index) => (
                        <li key={`trf-round-error-${index}`}>
                          Round {item.round}: {item.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {allRoundsResult.files && allRoundsResult.files.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-semibold uppercase text-green-700">
                      Generated files
                    </h5>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {allRoundsResult.files.map((file) => (
                        <li key={file.round}>
                          Round {file.round}: {file.fileName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TRFExportModal;

