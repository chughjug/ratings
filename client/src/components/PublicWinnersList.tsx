import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Trophy, Award } from 'lucide-react';
import { tournamentApi } from '../services/api';

interface PrizeDistribution {
  id: string;
  player_id: string;
  player_name: string;
  prize_name: string;
  prize_type: 'cash' | 'trophy' | 'medal' | 'plaque';
  amount?: number;
  position?: number;
  section?: string;
  tie_group?: number;
  rating_category?: string;
}

interface PublicWinnersListProps {
  tournamentId: string;
}

const PublicWinnersList: React.FC<PublicWinnersListProps> = ({ tournamentId }) => {
  const [distributions, setDistributions] = useState<PrizeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDistributions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await tournamentApi.getPrizes(tournamentId);
        if (!isMounted) return;

        if (response.data.success) {
          const cashPrizes = (response.data.data || []).filter(
            (dist: PrizeDistribution) => dist.prize_type === 'cash'
          );
          setDistributions(cashPrizes);
        } else {
          setError('Unable to load winners right now.');
        }
      } catch (err) {
        console.error('Error fetching winners:', err);
        if (isMounted) {
          setError('Unable to load winners right now.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDistributions();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  const groupedBySection = useMemo(() => {
    const groups: Record<string, PrizeDistribution[]> = {};

    distributions.forEach((dist) => {
      const key = dist.section || 'Open';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(dist);
    });

    Object.keys(groups).forEach((section) => {
      groups[section].sort((a, b) => {
        if (a.position && b.position && a.position !== b.position) {
          return a.position - b.position;
        }
        if (a.amount && b.amount && a.amount !== b.amount) {
          return b.amount - a.amount;
        }
        return a.player_name.localeCompare(b.player_name);
      });
    });

    return groups;
  }, [distributions]);

  const totalCashAwarded = useMemo(
    () => distributions.reduce((sum, dist) => sum + (dist.amount || 0), 0),
    [distributions]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-600">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600" />
          <span>Loading winners...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <Award className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-gray-700">{error}</p>
      </div>
    );
  }

  if (distributions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <Trophy className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-700">Cash prize winners will appear here once prizes have been awarded.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cash Prize Winners</h3>
          <p className="text-sm text-gray-600">
            Final prize distribution including pooled payouts for tied players.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="text-xl font-bold text-green-600">${totalCashAwarded.toFixed(2)}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {Object.entries(groupedBySection).map(([section, entries]) => (
          <div key={section} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold text-gray-800">{section} Section</span>
              </div>
              <span className="text-sm text-gray-500">{entries.length} winners</span>
            </div>

            <div className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{entry.player_name}</div>
                    <div className="text-sm text-gray-600">{entry.prize_name}</div>
                    {entry.tie_group && (
                      <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mt-1">
                        Tied prize pool
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.position && (
                      <div className="text-sm text-gray-500 mb-1">#{entry.position}</div>
                    )}
                    <div className="text-lg font-bold text-green-600">
                      ${entry.amount ? entry.amount.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicWinnersList;


