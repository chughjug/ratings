import React from 'react';
import { Award, BadgeCheck, RefreshCw, Trophy } from 'lucide-react';
import { useWinnersData, WinnerEntry } from '../hooks/useWinnersData';

interface TournamentWinnersPanelProps {
  tournamentId: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const TournamentWinnersPanel: React.FC<TournamentWinnersPanelProps> = ({ tournamentId }) => {
  const { sections, totals, loading, error, lastUpdated, refresh, totalWinners } = useWinnersData(tournamentId);

  const renderAmount = (winner: WinnerEntry) =>
    winner.prizeType === 'cash' ? formatCurrency(winner.amount || 0) : '—';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Prize Winners Overview</h2>
            <p className="text-sm text-gray-600 max-w-2xl">
              Track every cash and non-cash award assigned in this tournament. Cash awards follow US Chess
              Rule 32B pooled distribution; trophies and medals respect section tiebreaks and one-prize-per-player
              guidance (Rules 32F–32G).
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-400">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  <span>Refreshing</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </>
              )}
            </button>
            {totals && (
              <div className="flex items-center space-x-6 rounded-lg border border-gray-200 px-4 py-2 bg-gray-50">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Cash Total</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(totals.totalCash || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Cash Awards</p>
                  <p className="text-lg font-semibold text-gray-900">{totals.cashAwards}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Other Awards</p>
                  <p className="text-lg font-semibold text-gray-900">{totals.nonCashAwards}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Unique Winners</p>
                  <p className="text-lg font-semibold text-gray-900">{totals.uniqueWinners}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-2 flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Unable to load winners</span>
          </h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (!sections.length || totalWinners === 0) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No winners recorded yet</h3>
          <p className="text-gray-600">
            Once prizes are awarded, this dashboard will summarize cash payouts and trophy/medal recipients.
          </p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mb-3" />
          <p className="text-gray-600">Syncing winners data...</p>
        </div>
      )}

      {!loading &&
        !error &&
        sections.map((section) => (
          <div key={section.section} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{section.section} Section</h3>
                  <p className="text-xs text-gray-500">
                    {section.stats.cashCount} cash awards • {section.stats.nonCashCount} non-cash awards •{' '}
                    {section.stats.uniquePlayers} unique winners
                  </p>
                </div>
              </div>
              {section.stats.cashTotal > 0 && (
                <div className="flex items-center space-x-2">
                  <BadgeCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    Cash total: {formatCurrency(section.stats.cashTotal)}
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prize
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tie Group
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {section.winners.map((winner) => (
                    <tr key={winner.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{winner.playerName}</div>
                        {winner.playerUscfId && (
                          <div className="text-xs text-gray-500">USCF ID: {winner.playerUscfId}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{winner.prizeName}</div>
                        {winner.description && (
                          <div className="text-xs text-gray-500">{winner.description}</div>
                        )}
                        {winner.metadata?.ratingRange &&
                          (winner.metadata.ratingRange.min !== null ||
                            winner.metadata.ratingRange.max !== null) && (
                            <div className="text-xs text-emerald-600 font-medium">
                              Rating {winner.metadata.ratingRange.min ?? '—'} to {winner.metadata.ratingRange.max ?? '—'}
                            </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm capitalize text-gray-700">{winner.prizeType}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {renderAmount(winner)}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {winner.position ? `#${winner.position}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {winner.playerRating ? Math.round(winner.playerRating) : '—'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-700">
                        {winner.tieGroup ? `Group ${winner.tieGroup}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-2">
          US Chess Prize Compliance Notes
        </h3>
        <p className="text-sm text-blue-700">
          Cash awards are pooled and split evenly among tied finishers without exceeding the largest original prize
          in the group (Rules 32B2–32B3). Non-cash awards follow the published tiebreak hierarchy and remain limited
          to one per player (Rules 32F–32G). Document any exceptions in the tournament report.
        </p>
      </div>
    </div>
  );
};

export default TournamentWinnersPanel;


