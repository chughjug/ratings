import React, { useState } from 'react';
import { Printer, Eye } from 'lucide-react';
import EnhancedPrintPreview from './EnhancedPrintPreview';
import { TournamentData, PairingData, StandingData } from '../services/pdfExport';

interface PrintPreviewIntegrationProps {
  tournament: TournamentData;
  pairings?: PairingData[];
  standings?: StandingData[];
  currentRound?: number;
  viewType: 'pairings' | 'standings' | 'report';
}

const PrintPreviewIntegration: React.FC<PrintPreviewIntegrationProps> = ({
  tournament,
  pairings = [],
  standings = [],
  currentRound = 1,
  viewType
}) => {
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handlePrintPreview = () => {
    setShowPrintPreview(true);
  };

  const handleClosePreview = () => {
    setShowPrintPreview(false);
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrintPreview}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-4 h-4 mr-2" />
          Print Preview
        </button>
        
        <button
          onClick={() => window.print()}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Now
        </button>
      </div>

      {showPrintPreview && (
        <EnhancedPrintPreview
          tournament={tournament}
          pairings={pairings}
          standings={standings}
          currentRound={currentRound}
          viewType={viewType}
          onClose={handleClosePreview}
        />
      )}
    </>
  );
};

export default PrintPreviewIntegration;
