import React, { useState } from 'react';
import { Mail, Loader, ExternalLink } from 'lucide-react';

interface SendPairingEmailsButtonProps {
  tournamentId: string;
  round: number;
  pairingsCount: number;
  isEnabled?: boolean;
  sectionName?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const SendPairingEmailsButton: React.FC<SendPairingEmailsButtonProps> = ({
  tournamentId,
  round,
  pairingsCount,
  isEnabled = true,
  sectionName,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Correct Apps Script webhook URL
  const APPS_SCRIPT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwq-_6VBehlLjilnt7hfFpSlAsfyhYjbpw7Qmpnle3IqetPdSVIJmVajy2GvUa_EabL/exec';

  const handleSendEmails = async () => {
    setLoading(true);
    setResult(null);
    setErrorMessage('');

    try {
      const response = await fetch('/api/pairings/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId,
          round,
          sectionName: sectionName || 'Open'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send emails');
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
            rounds: 3,
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

  if (!isEnabled) {
    return null;
  }

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
            <p className="text-gray-600 mb-6">
              This will send personalized pairing emails to all players in {sectionName || 'Open'} section for Round {round}.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmails}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Emails
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Messages */}
      {result === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-800 text-sm font-medium">Emails sent successfully!</span>
          </div>
        </div>
      )}

      {result === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-red-800 text-sm font-medium">Error: {errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendPairingEmailsButton;
