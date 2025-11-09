import React from 'react';
import { Award, DollarSign, Sparkles, Trophy } from 'lucide-react';
import { useWinnersData, WinnerEntry } from '../hooks/useWinnersData';

interface PublicWinnersListProps {
  tournamentId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const getPrizeIcon = (type: string) => {
  switch (type) {
    case 'cash':
      return <DollarSign className="w-4 h-4 text-green-600" />;
    case 'trophy':
      return <Trophy className="w-4 h-4 text-yellow-500" />;
    case 'medal':
      return <Award className="w-4 h-4 text-blue-500" />;
    default:
      return <Sparkles className="w-4 h-4 text-purple-500" />;
  }
};

const PublicWinnersList: React.FC<PublicWinnersListProps> = ({ tournamentId }) => {
  const { sections, totals, loading, error, totalWinners } = useWinnersData(tournamentId);

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

  if (!sections.length || totalWinners === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <Trophy className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-700">
          Prize winners will appear here once the event awards have been finalized.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-blue-50 to-white">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Tournament Winners</h3>
          <p className="text-sm text-gray-600 max-w-2xl">
            Official list of cash and award recipients. Cash prizes are pooled and split per US Chess
            Rules 32B2–32B3. Non-cash awards (trophies, medals, etc.) follow posted tiebreaks.
          </p>
        </div>
        {totals && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Cash Awarded</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(totals.totalCash || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Winners</p>
              <p className="text-xl font-semibold text-gray-900">{totalWinners}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {sections.map((section) => {
          const cashWinners = section.winners.filter(
            (winner) => winner.prizeType === 'cash' && winner.amount > 0
          );
          const awardWinners = section.winners.filter((winner) => winner.prizeType !== 'cash');

          const renderWinnerRow = (winner: WinnerEntry) => (
            <div
              key={winner.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {getPrizeIcon(winner.prizeType)}
                <div>
                  <div className="font-semibold text-gray-900">{winner.playerName}</div>
                  <div className="text-sm text-gray-600">{winner.prizeName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {winner.position && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        #{winner.position}
                      </span>
                    )}
                    {winner.tieGroup && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        Pooled prize
                      </span>
                    )}
            {winner.metadata?.ratingRange &&
              (winner.metadata.ratingRange.min !== null ||
                winner.metadata.ratingRange.max !== null) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                  Rating {winner.metadata.ratingRange.min ?? '—'} to {winner.metadata.ratingRange.max ?? '—'}
                </span>
            )}
                    {winner.prizeType !== 'cash' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                        {winner.prizeType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {winner.prizeType === 'cash' ? (
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(winner.amount)}
                  </div>
                ) : (
                  <div className="text-sm font-medium text-gray-500">Award</div>
                )}
              </div>
            </div>
          );

          return (
            <div key={section.section} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold text-gray-800">{section.section} Section</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{section.stats.cashCount} cash prizes</span>
                  <span>•</span>
                  <span>{section.stats.nonCashCount} awards</span>
                  <span>•</span>
                  <span>{section.stats.uniquePlayers} winners</span>
                </div>
              </div>

              {cashWinners.length > 0 && (
                <div className="border-b border-gray-200 bg-white/60">
                  <div className="px-4 py-2 flex items-center justify-between bg-green-50">
                    <span className="text-sm font-semibold text-green-800">Cash Prizes</span>
                    <span className="text-sm font-semibold text-green-700">
                      {formatCurrency(section.stats.cashTotal)}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {cashWinners.map((winner) => renderWinnerRow(winner))}
                  </div>
                </div>
              )}

              {awardWinners.length > 0 && (
                <div className="bg-white">
                  <div className="px-4 py-2 flex items-center justify-between bg-gray-50">
                    <span className="text-sm font-semibold text-gray-800">Awards & Trophies</span>
                    <span className="text-sm text-gray-500">{awardWinners.length} recipients</span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {awardWinners.map((winner) => renderWinnerRow(winner))}
                  </div>
                </div>
              )}

              {cashWinners.length === 0 && awardWinners.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Winners will be published here once the section is finalized.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PublicWinnersList;



