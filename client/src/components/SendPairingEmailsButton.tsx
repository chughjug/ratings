import React, { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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
  sectionName = 'Open',
  onSuccess,
  onError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Apps Script webhook endpoint
  const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwq-_6VBehlLjilnt7hfFpSlAsfyhYjbpw7Qmpnle3IqetPdSVIJmVajy2GvUa_EabL/exec';

  const triggerEmailNotification = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setStatus('idle');
    setMessage('');

    try {
      // Create a comprehensive payload for the Apps Script
      const emailPayload = {
        action: 'send_pairing_emails',
        tournament: {
          id: tournamentId,
          name: `Tournament ${tournamentId.slice(0, 8)}`,
          round: round,
          section: sectionName,
          totalRounds: 5, // Default value
          format: 'swiss'
        },
        pairings: generateMockPairings(),
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'chess-tournament-director',
          version: '2.0'
        }
      };

      console.log('Sending email notification payload:', emailPayload);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });

      // Handle Apps Script response (usually returns HTML redirect)
      if (response.ok || response.status === 302) {
        setStatus('success');
        setMessage(`Pairing emails sent successfully for Round ${round} in ${sectionName} section!`);
        onSuccess?.();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Email notification failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus('error');
      setMessage(`Failed to send emails: ${errorMsg}`);
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate realistic mock pairings for testing
  const generateMockPairings = () => {
    const pairings = [];
    const players = [
      { name: 'Alice Johnson', rating: 1850, email: 'aarushchugh1@gmail.com' },
      { name: 'Bob Smith', rating: 1720, email: 'aarushchugh1@gmail.com' },
      { name: 'Carol Davis', rating: 1980, email: 'aarushchugh1@gmail.com' },
      { name: 'David Wilson', rating: 1650, email: 'aarushchugh1@gmail.com' }
    ];

    for (let i = 0; i < Math.min(pairingsCount, 4); i++) {
      const whitePlayer = players[i * 2] || players[0];
      const blackPlayer = players[i * 2 + 1] || players[1];
      
      pairings.push({
        board: i + 1,
        white: {
          name: whitePlayer.name,
          rating: whitePlayer.rating,
          email: whitePlayer.email
        },
        black: {
          name: blackPlayer.name,
          rating: blackPlayer.rating,
          email: blackPlayer.email
        },
        section: sectionName
      });
    }

    return pairings;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Main Action Button */}
      <button
        onClick={triggerEmailNotification}
        disabled={isProcessing}
        className={`
          w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
          ${isProcessing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
          }
        `}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            <span>Send Pairing Emails</span>
          </>
        )}
      </button>

      {/* Status Display */}
      {status !== 'idle' && (
        <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{message}</span>
          </div>
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold text-gray-900 mb-1">Email Notification System</h4>
            <p className="text-gray-600 mb-2">
              This will send personalized pairing emails to all players in the <strong>{sectionName}</strong> section for Round <strong>{round}</strong>.
            </p>
            <div className="text-xs text-gray-500">
              <p><strong>Webhook:</strong> {WEBHOOK_URL}</p>
              <p><strong>Pairings:</strong> {pairingsCount} boards</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendPairingEmailsButton;