import React, { useState, useEffect } from 'react';
import { X, Users, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { clubMembersApi } from '../services/api';
import { useTournament } from '../contexts/TournamentContext';

interface ImportClubMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  organizationId: string;
  onImportComplete: () => void;
}

const ImportClubMembersModal: React.FC<ImportClubMembersModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  organizationId,
  onImportComplete
}) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [section, setSection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { state } = useTournament();

  useEffect(() => {
    if (isOpen && organizationId) {
      loadMembers();
    }
  }, [isOpen, organizationId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clubMembersApi.getAll(organizationId, { status: 'active' });
      if (response.data.success) {
        setMembers(response.data.data.members);
      } else {
        setError('Failed to load club members');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load club members');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m.id)));
    }
  };

  const handleSelectMember = (id: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (selectedMembers.size === 0) {
      alert('Please select at least one member to import');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      
      const response = await clubMembersApi.importToTournament(
        organizationId,
        tournamentId,
        Array.from(selectedMembers),
        section || undefined
      );

      if (response.data.success) {
        const importedCount = response.data.data.imported.length;
        const skippedCount = response.data.data.skipped?.length || 0;
        
        let message = `Successfully imported ${importedCount} member(s)`;
        if (skippedCount > 0) {
          message += `. ${skippedCount} member(s) were skipped (already in tournament).`;
        }
        
        alert(message);
        onImportComplete();
        onClose();
        setSelectedMembers(new Set());
      } else {
        setError(response.data.error || 'Failed to import members');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to import members');
    } finally {
      setImporting(false);
    }
  };

  // Get available sections from tournament
  const getAvailableSections = () => {
    const sections = new Set<string>();
    state.players?.forEach(player => {
      if (player.section) sections.add(player.section);
    });
    if (state.currentTournament?.settings) {
      try {
        const settings = typeof state.currentTournament.settings === 'string' 
          ? JSON.parse(state.currentTournament.settings) 
          : state.currentTournament.settings;
        if (settings.sections) {
          settings.sections.forEach((sec: any) => {
            if (sec.name) sections.add(sec.name);
          });
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    return Array.from(sections).sort();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Import Club Members to Tournament</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Section Selector */}
          {getAvailableSections().length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Section (Optional)
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">No Section</option>
                {getAvailableSections().map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          )}

          {/* Members List */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active club members found. Add members in Organization Settings first.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  {selectedMembers.size === members.length && members.length > 0 ? (
                    <CheckSquare className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {selectedMembers.size === members.length ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
                <span className="text-sm text-gray-500">
                  {selectedMembers.size} of {members.length} selected
                </span>
              </div>

              {/* Members */}
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMembers.has(member.id)
                        ? 'bg-purple-50 border-purple-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectMember(member.id)}
                  >
                    <div className="mr-3">
                      {selectedMembers.has(member.id) ? (
                        <CheckSquare className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">
                        {member.uscfId && `USCF ID: ${member.uscfId}`}
                        {member.uscfId && member.rating && ' • '}
                        {member.rating && `Rating: ${member.rating}`}
                        {member.email && ` • ${member.email}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || selectedMembers.size === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                <span>Import Selected ({selectedMembers.size})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportClubMembersModal;

