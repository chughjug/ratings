import React, { useState } from 'react';
import { Mail, Loader, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface SendPairingEmailsButtonProps {
  tournamentId: string;
  round: number;
  pairingsCount: number;
  isEnabled: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  sectionName?: string;
}

const SendPairingEmailsButton: React.FC<SendPairingEmailsButtonProps> = ({
  tournamentId,
  round,
  pairingsCount,
  isEnabled,
  onSuccess,
  onError,
  sectionName
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Apps Script webhook URL for pairing email notifications (correct URL)
  const APPS_SCRIPT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwq-_6VBehlLjilnt7hfFpSlAsfyhYjbpw7Qmpnle3IqetPdSVIJmVajy2GvUa_EabL/exec';

  const handleSendEmails = async () => {
    setLoading(true);
    setResult(null);
    setErrorMessage('');

    try {
      // Use the backend API endpoint instead of calling webhook directly
      const response = await fetch('/api/pairings/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          round,
          sectionName
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send emails');
      }

      setResult('success');
      onSuccess?.();
    } catch (error: any) {
      const message = error.message || 'Failed to send emails';
      setErrorMessage(message);
      setResult('error');
      onError?.(message);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleDirectWebhook = async () => {
    setLoading(true);
    setResult(null);
    setErrorMessage('');

    try {
      // Direct call to Apps Script webhook with test data
      const response = await fetch(APPS_SCRIPT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'pairings_generated',
          tournament: {
            id: tournamentId,
            name: 'Test Tournament',
            format: 'swiss',
            rounds: 5,
            logo_url: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/new-logo.png',
            organization_logo: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/new-logo.png',
            organization_name: 'Chess Tournament Director'
          },
          round: round,
          pairingsCount: pairingsCount,
          timestamp: new Date().toISOString(),
          pairings: [
            {
              board: 1,
              white: {
                id: 'test-white',
                name: 'Test Player (White)',
                rating: 1800,
                email: 'aarushchugh1@gmail.com'
              },
              black: {
                id: 'test-black', 
                name: 'Test Opponent (Black)',
                rating: 1750,
                email: 'aarushchugh1@gmail.com'
              },
              section: sectionName || 'Open'
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger Apps Script webhook');
      }

      setResult('success');
      onSuccess?.();
    } catch (error: any) {
      const message = error.message || 'Failed to trigger webhook';
      setErrorMessage(message);
      setResult('error');
      onError?.(message);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Button Group */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Backend API Button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className={`flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={loading ? 'Sending emails...' : 'Send emails via backend API'}
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Sending Emails...</span>
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              <span>Send Pairing Emails</span>
            </>
          )}
        </button>

        {/* Direct Apps Script Button */}
        <button
          onClick={handleDirectWebhook}
          disabled={loading}
          className={`flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          title={loading ? 'Triggering webhook...' : 'Direct Apps Script webhook'}
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Triggering...</span>
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              <span>Direct Webhook</span>
            </>
          )}
        </button>
      </div>

      {/* Apps Script Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium">Apps Script Webhook</p>
            <p className="text-blue-700 mt-1">
              Direct webhook URL: <code className="bg-blue-100 px-1 rounded text-xs">{APPS_SCRIPT_WEBHOOK_URL}</code>
            </p>
            <p className="text-blue-600 text-xs mt-1">
              Use the green button to test the Apps Script webhook directly, or the blue button for the full backend integration.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && !loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Pairing Emails?</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
              <p className="text-sm text-gray-700">
                This will send personalized pairing emails to <strong>{pairingsCount}</strong> player{pairingsCount !== 1 ? 's' : ''} for <strong>Round {round}</strong>.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Each player will receive their board number and opponent details.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmails}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Send Emails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Message */}
      {result === 'success' && (
        <div className="flex items-start space-x-3 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-900">Emails Sent Successfully!</p>
            <p className="text-xs text-green-700 mt-1">
              {pairingsCount} player{pairingsCount !== 1 ? 's' : ''} will receive their pairings for Round {round}.
            </p>
          </div>
        </div>
      )}

      {result === 'error' && (
        <div className="flex items-start space-x-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">Failed to Send Emails</p>
            <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendPairingEmailsButton;
