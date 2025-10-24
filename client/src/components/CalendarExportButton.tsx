import React, { useState } from 'react';
import { Calendar, Download, ExternalLink, Copy, CheckCircle, AlertTriangle } from 'lucide-react';

interface CalendarExportButtonProps {
  tournamentId: string;
  tournamentName: string;
}

const CalendarExportButton: React.FC<CalendarExportButtonProps> = ({ tournamentId, tournamentName }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const handleOpenModal = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/calendar/tournament/${tournamentId}/links`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLinks(data.data);
        setShowModal(true);
      } else {
        setError('Failed to load calendar links');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar links');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadICS = () => {
    window.location.href = `/api/calendar/tournament/${tournamentId}/ics`;
  };

  const handleCopyLink = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Calendar className="h-4 w-4" />
        <span>Export to Calendar</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="h-6 w-6 text-blue-600" />
                <span>Export Tournament to Calendar</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">{tournamentName}</p>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="flex items-start space-x-3 bg-red-50 border border-red-200 rounded-lg p-4">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {links && (
                <div className="space-y-4">
                  {/* ICS Download */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                      <Download className="h-4 w-4 text-blue-600" />
                      <span>Download ICS File</span>
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Download a calendar file (.ics) that works with most calendar applications (Google Calendar, Outlook, Apple Calendar, etc.)
                    </p>
                    <button
                      onClick={handleDownloadICS}
                      className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Schedule.ics</span>
                    </button>
                  </div>

                  {/* Google Calendar */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Google Calendar</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Add this tournament to your Google Calendar
                    </p>
                    <button
                      onClick={() => window.open(links.googleCalendarLink, '_blank')}
                      className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Add to Google Calendar</span>
                    </button>
                  </div>

                  {/* Outlook Calendar */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Outlook Calendar</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Add this tournament to your Outlook/Office 365 calendar
                    </p>
                    <button
                      onClick={() => window.open(links.outlookLink, '_blank')}
                      className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Add to Outlook Calendar</span>
                    </button>
                  </div>

                  {/* Apple Calendar */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Apple Calendar</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Download the ICS file and import into Apple Calendar or iCal
                    </p>
                    <button
                      onClick={handleDownloadICS}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download for Apple Calendar</span>
                    </button>
                  </div>

                  {/* Tournament Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Tournament Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Start Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(links.tournament.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">End Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(links.tournament.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rounds</p>
                        <p className="font-medium text-gray-900">{links.tournament.rounds}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Time Control</p>
                        <p className="font-medium text-gray-900">{links.tournament.timeControl || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CalendarExportButton;
