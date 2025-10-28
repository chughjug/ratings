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

  // Apps Script webhook endpoint
  const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwq-_6VBehlLjilnt7hfFpSlAsfyhYjbpw7Qmpnle3IqetPdSVIJmVajy2GvUa_EabL/exec';

  const triggerEmailNotification = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Create payload that matches Apps Script doPost function expectations
      const emailPayload = {
        event: 'pairings_generated', // This is what the Apps Script expects
        tournament: {
          id: tournamentId,
          name: `Tournament ${tournamentId.slice(0, 8)}`,
          format: 'swiss',
          rounds: 5, // Default value
          logo_url: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/new-logo.png',
          organization_logo: 'https://chess-tournament-director-6ce5e76147d7.herokuapp.com/new-logo.png',
          organization_name: 'Chess Tournament Director'
        },
        round: round,
        pairings: generateMockPairings()
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
        onSuccess?.();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Email notification failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate realistic mock pairings that match Apps Script expectations
  const generateMockPairings = () => {
    const pairings = [];
    const players = [
      { id: 'p1', name: 'Alice Johnson', rating: 1850, email: 'aarushchugh1@gmail.com' },
      { id: 'p2', name: 'Bob Smith', rating: 1720, email: 'aarushchugh1@gmail.com' },
      { id: 'p3', name: 'Carol Davis', rating: 1980, email: 'aarushchugh1@gmail.com' },
      { id: 'p4', name: 'David Wilson', rating: 1650, email: 'aarushchugh1@gmail.com' }
    ];

    for (let i = 0; i < Math.min(pairingsCount, 4); i++) {
      const whitePlayer = players[i * 2] || players[0];
      const blackPlayer = players[i * 2 + 1] || players[1];
      
      pairings.push({
        board: i + 1,
        white: {
          id: whitePlayer.id,
          name: whitePlayer.name,
          rating: whitePlayer.rating,
          email: whitePlayer.email
        },
        black: {
          id: blackPlayer.id,
          name: blackPlayer.name,
          rating: blackPlayer.rating,
          email: blackPlayer.email
        },
        section: sectionName
      });
    }

    return pairings;
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