import React, { useState, useEffect } from 'react';
import { Printer, Download, Eye, Settings, ChevronLeft, ChevronRight, FileText, Trophy, Users } from 'lucide-react';
import PrintableView from './PrintableView';
import { TournamentData, PairingData, StandingData } from '../services/pdfExport';

interface EnhancedPrintPreviewProps {
  tournament: TournamentData;
  pairings?: PairingData[];
  standings?: StandingData[];
  currentRound?: number;
  viewType: 'pairings' | 'standings' | 'report';
  onClose: () => void;
}

const EnhancedPrintPreview: React.FC<EnhancedPrintPreviewProps> = ({
  tournament,
  pairings = [],
  standings = [],
  currentRound = 1,
  viewType,
  onClose
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [separatePages, setSeparatePages] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Get available sections
  const getAvailableSections = () => {
    const sections = new Set<string>();
    sections.add('all');
    
    pairings.forEach(pairing => {
      if (pairing.section) {
        sections.add(pairing.section);
      }
    });
    
    standings.forEach(standing => {
      if (standing.section) {
        sections.add(standing.section);
      }
    });
    
    return Array.from(sections).sort();
  };

  const availableSections = getAvailableSections();

  // Calculate total pages based on sections
  useEffect(() => {
    if (separatePages && selectedSection === 'all') {
      setTotalPages(availableSections.length - 1); // -1 because 'all' doesn't count as a page
    } else {
      setTotalPages(1);
    }
    setCurrentPage(1);
  }, [separatePages, selectedSection, availableSections.length]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    // This would integrate with the PDF export service
    console.log('Exporting PDF...');
  };

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getCurrentSectionForPage = () => {
    if (!separatePages || selectedSection !== 'all') {
      return selectedSection;
    }
    
    const sections = availableSections.filter(s => s !== 'all');
    return sections[currentPage - 1] || 'all';
  };

  const renderNavigation = () => (
    <div className="print-preview-controls">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Print Preview
          </h2>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Section:</label>
            <select
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              {availableSections.map(section => (
                <option key={section} value={section}>
                  {section === 'all' ? 'All Sections' : `${section} Section`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={separatePages}
                onChange={(e) => setSeparatePages(e.target.checked)}
                className="mr-2"
              />
              Separate Pages
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleExportPDF}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Export PDF
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Printer className="w-4 h-4 mr-1" />
            Print
          </button>
          
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            Close
          </button>
        </div>
      </div>

      {separatePages && selectedSection === 'all' && totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 mb-4">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {showSettings && (
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <h3 className="text-sm font-semibold mb-2">Print Settings</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-medium mb-1">Orientation</label>
              <select className="w-full px-2 py-1 border border-gray-300 rounded">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Paper Size</label>
              <select className="w-full px-2 py-1 border border-gray-300 rounded">
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPreview = () => {
    const currentSection = getCurrentSectionForPage();
    
    return (
      <div className="print-preview-content">
        <PrintableView
          tournament={tournament}
          pairings={pairings}
          standings={standings}
          currentRound={currentRound}
          viewType={viewType}
          selectedSection={currentSection}
          separatePages={separatePages}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {renderNavigation()}
        
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {renderPreview()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPrintPreview;
