import React, { useState } from 'react';
import { Mail } from 'lucide-react';

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

  const triggerEmailNotification = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Use the backend API endpoint which handles real tournament data
      const response = await fetch('/api/pairings/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: tournamentId,
          round: round,
          sectionName: sectionName
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onSuccess?.();
      } else {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Email notification failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };


  if (!isEnabled) {
    return null;
  }

  return (
    <button
      onClick={triggerEmailNotification}
      disabled={isProcessing}
      className={`
        flex items-center space-x-2 px-3 py-2 text-sm rounded-md font-medium transition-all duration-200
        ${isProcessing 
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
        }
      `}
    >
      {isProcessing ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-300 border-t-gray-600"></div>
          <span>Sending...</span>
        </>
      ) : (
        <>
          <Mail className="h-4 w-4" />
          <span>Send Emails</span>
        </>
      )}
    </button>
  );
};

export default SendPairingEmailsButton;