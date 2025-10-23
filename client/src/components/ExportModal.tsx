import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileImage, Printer, X } from 'lucide-react';
import { exportPairingsPDF, exportStandingsPDF, exportTournamentReportPDF } from '../services/pdfExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: any;
  pairings: any[];
  standings: any[];
  currentRound?: number;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  tournament,
  pairings,
  standings,
  currentRound = 1
}) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: string, format: string) => {
    if (!tournament) return;

    setExporting(`${type}-${format}`);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const tournamentName = tournament.name.replace(/[^a-zA-Z0-9]/g, '_');

      switch (type) {
        case 'pairings':
          if (format === 'pdf') {
            await exportPairingsPDF(
              tournament,
              pairings,
              currentRound,
              `${tournamentName}_Round_${currentRound}_Pairings_${timestamp}.pdf`
            );
          } else if (format === 'csv') {
            exportPairingsCSV(pairings, currentRound, tournamentName, timestamp);
          } else if (format === 'print') {
            window.print();
          }
          break;

        case 'standings':
          if (format === 'pdf') {
            await exportStandingsPDF(
              tournament,
              standings,
              `${tournamentName}_Standings_${timestamp}.pdf`
            );
          } else if (format === 'csv') {
            exportStandingsCSV(standings, tournamentName, timestamp);
          } else if (format === 'print') {
            window.print();
          }
          break;

        case 'report':
          if (format === 'pdf') {
            await exportTournamentReportPDF(
              tournament,
              standings,
              pairings,
              `${tournamentName}_Tournament_Report_${timestamp}.pdf`
            );
          } else if (format === 'print') {
            window.print();
          }
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const exportPairingsCSV = (pairings: any[], round: number, tournamentName: string, timestamp: string) => {
    const headers = ['Board', 'White Player', 'White Rating', 'White USCF ID', 'Black Player', 'Black Rating', 'Black USCF ID', 'Result', 'Section'];
    const csvContent = [
      headers.join(','),
      ...pairings.map(pairing => [
        pairing.board || '',
        `"${pairing.white_name || ''}"`,
        pairing.white_rating || '',
        pairing.white_uscf_id || '',
        `"${pairing.black_name || ''}"`,
        pairing.black_rating || '',
        pairing.black_uscf_id || '',
        pairing.result || '',
        pairing.section || 'Open'
      ].join(','))
    ].join('\n');

    downloadCSV(csvContent, `${tournamentName}_Round_${round}_Pairings_${timestamp}.csv`);
  };

  const exportStandingsCSV = (standings: any[], tournamentName: string, timestamp: string) => {
    const headers = ['Rank', 'Name', 'USCF ID', 'Rating', 'Points', 'Games', 'Wins', 'Losses', 'Draws', 'Buchholz', 'Sonneborn-Berger', 'Section'];
    const csvContent = [
      headers.join(','),
      ...standings.map((standing, index) => [
        index + 1,
        `"${standing.name}"`,
        standing.uscf_id || '',
        standing.rating || '',
        standing.total_points,
        standing.games_played,
        standing.wins,
        standing.losses,
        standing.draws,
        standing.buchholz || '',
        standing.sonneborn_berger || '',
        standing.section || 'Open'
      ].join(','))
    ].join('\n');

    downloadCSV(csvContent, `${tournamentName}_Standings_${timestamp}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const exportOptions = [
    {
      type: 'pairings',
      title: 'Pairings',
      description: 'Export current round pairings',
      icon: <FileText className="h-5 w-5" />,
      formats: [
        { id: 'pdf', name: 'PDF', icon: <FileText className="h-4 w-4" /> },
        { id: 'csv', name: 'CSV', icon: <FileSpreadsheet className="h-4 w-4" /> },
        { id: 'print', name: 'Print', icon: <Printer className="h-4 w-4" /> }
      ]
    },
    {
      type: 'standings',
      title: 'Standings',
      description: 'Export current standings',
      icon: <FileText className="h-5 w-5" />,
      formats: [
        { id: 'pdf', name: 'PDF', icon: <FileText className="h-4 w-4" /> },
        { id: 'csv', name: 'CSV', icon: <FileSpreadsheet className="h-4 w-4" /> },
        { id: 'print', name: 'Print', icon: <Printer className="h-4 w-4" /> }
      ]
    },
    {
      type: 'report',
      title: 'Tournament Report',
      description: 'Complete tournament report with all data',
      icon: <FileText className="h-5 w-5" />,
      formats: [
        { id: 'pdf', name: 'PDF', icon: <FileText className="h-4 w-4" /> },
        { id: 'print', name: 'Print', icon: <Printer className="h-4 w-4" /> }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Export Tournament Data</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Choose what to export and in which format
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exportOptions.map((option) => (
              <div key={option.type} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="text-blue-600 mr-3">
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {option.formats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => handleExport(option.type, format.id)}
                      disabled={exporting === `${option.type}-${format.id}`}
                      className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                        exporting === `${option.type}-${format.id}`
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {exporting === `${option.type}-${format.id}` ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        format.icon
                      )}
                      <span>
                        {exporting === `${option.type}-${format.id}` ? 'Exporting...' : format.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tournament Info */}
          {tournament && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Tournament Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Name:</span> {tournament.name}
                </div>
                <div>
                  <span className="font-medium">Format:</span> {tournament.format}
                </div>
                <div>
                  <span className="font-medium">Rounds:</span> {tournament.rounds}
                </div>
                <div>
                  <span className="font-medium">Players:</span> {standings.length}
                </div>
                {tournament.start_date && (
                  <div>
                    <span className="font-medium">Start:</span> {new Date(tournament.start_date).toLocaleDateString()}
                  </div>
                )}
                {tournament.end_date && (
                  <div>
                    <span className="font-medium">End:</span> {new Date(tournament.end_date).toLocaleDateString()}
                  </div>
                )}
                {tournament.city && tournament.state && (
                  <div>
                    <span className="font-medium">Location:</span> {tournament.city}, {tournament.state}
                  </div>
                )}
                <div>
                  <span className="font-medium">Status:</span> {tournament.status}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
