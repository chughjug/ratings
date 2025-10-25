import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { tournamentApi, playerApi, pairingApi } from '../services/api';
import RedesignedPairingIntegration from './RedesignedPairingIntegration';

/**
 * Example component showing how to integrate the redesigned pairing system
 * into an existing tournament management application.
 */
const PairingSystemExample: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTournament = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await tournamentApi.getById(id);
        setTournament(response.data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tournament');
      } finally {
        setLoading(false);
      }
    };

    loadTournament();
  }, [id]);

  const handleTournamentUpdate = (updatedTournament: any) => {
    setTournament(updatedTournament);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Tournament</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tournament Not Found</h3>
          <p className="text-gray-600">The requested tournament could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
              <p className="text-gray-600 mt-2">
                {tournament.location} • {tournament.start_date} • {tournament.rounds} rounds
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Status</div>
              <div className="text-lg font-semibold text-gray-900">
                {tournament.status || 'Active'}
              </div>
            </div>
          </div>
        </div>

        {/* Redesigned Pairing System */}
        <RedesignedPairingIntegration
          tournament={tournament}
          onTournamentUpdate={handleTournamentUpdate}
        />
      </div>
    </div>
  );
};

export default PairingSystemExample;

