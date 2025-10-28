import React, { useState } from 'react';
import { Mail, Loader, CheckCircle, AlertTriangle } from 'lucide-react';

interface SendPairingEmailsButtonProps {
  tournamentId: string;
  round: number;
  pairingsCount: number;
  webhookUrl: string;
  isEnabled: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const SendPairingEmailsButton: React.FC<SendPairingEmailsButtonProps> = ({
  tournamentId,
  round,
  pairingsCount,
  webhookUrl,
  isEnabled,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendEmails = async () => {
    if (!isEnabled) {
      setErrorMessage('Email notifications are disabled. Enable them in the Notification Center first.');
      setResult('error');
      onError?.(errorMessage);
      return;
    }

    setLoading(true);
    setResult(null);
    setErrorMessage('');

    try {
      // Fetch pairings for this round
      const response = await fetch(`/api/tournaments/${tournamentId}/pairings?round=${round}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pairings');
      }

      const data = await response.json();
      const pairings = data.data || [];

      if (pairings.length === 0) {
        throw new Error('No pairings found for this round');
      }

      // Send webhook to Google Apps Script
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'pairings_generated',
          tournament: {
            id: tournamentId,
            name: 'Tournament',
            format: 'swiss',
            rounds: round
          },
          round: round,
          pairings: pairings,
          timestamp: new Date().toISOString()
        })
      });

      if (!webhookResponse.ok) {
        throw new Error('Failed to send webhook');
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

  return (
    <div className="space-y-2">
      {/* Main Button - Always visible */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading || pairingsCount === 0 || !isEnabled}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          loading || pairingsCount === 0 || !isEnabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={!isEnabled ? 'Enable notifications in settings to send emails' : pairingsCount === 0 ? 'Generate pairings first' : 'Send emails to all players'}
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
