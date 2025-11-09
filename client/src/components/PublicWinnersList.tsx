import React, { useMemo } from 'react';
import { Award, DollarSign, Sparkles, Trophy } from 'lucide-react';
import {
  useWinnersData,
  WinnerEntry,
  WinnersResponse,
  WinnersSection,
  WinnersTotals
} from '../hooks/useWinnersData';

interface PublicWinnersListProps {
  tournamentId: string;
  initialDistributions?: any[] | null;
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

const buildInitialResponse = (distributions?: any[] | null): WinnersResponse | null => {
  if (!distributions || distributions.length === 0) {
    return null;
  }

  const sectionsMap = new Map<
    string,
    {
      section: string;
      winners: WinnerEntry[];
      stats: {
        cashTotal: number;
        cashCount: number;
        nonCashCount: number;
        uniquePlayers: Set<string>;
      };
    }
  >();
  const uniquePlayers = new Set<string>();
  let totalCash = 0;
  let cashAwards = 0;
  let nonCashAwards = 0;
  let latestTimestamp: Date | null = null;

  distributions.forEach((dist) => {
    const sectionKey = dist.section || dist.player_section || 'Open';

    if (!sectionsMap.has(sectionKey)) {
      sectionsMap.set(sectionKey, {
        section: sectionKey,
        winners: [],
        stats: {
          cashTotal: 0,
          cashCount: 0,
          nonCashCount: 0,
          uniquePlayers: new Set<string>()
        }
      });
    }

    const sectionEntry = sectionsMap.get(sectionKey)!;

    const amountRaw =
      typeof dist.amount === 'number' ? dist.amount : dist.amount ? Number(dist.amount) : 0;
    const amount = Number.isFinite(amountRaw) ? amountRaw : 0;
    const prizeType =
      dist.prize_type ||
      dist.prizeType ||
      (amount > 0 ? 'cash' : 'recognition');
    const prizeName = dist.prize_name || dist.prizeName || 'Prize';
    const ratingCategory = dist.rating_category || dist.ratingCategory || null;
    const tieGroup = dist.tie_group || dist.tieGroup || null;
    const position = dist.position ?? null;
    const prizeDescription = dist.description || dist.prize_description || null;

    const ratingRange =
      typeof ratingCategory === 'string' && ratingCategory.startsWith('rating:')
        ? (() => {
            const [, range] = ratingCategory.split(':');
            if (!range) return null;
            const [minPart, maxPart] = range.split('-');
            const min = minPart && minPart !== '-' ? Number(minPart) : null;
            const max = maxPart && maxPart !== '-' ? Number(maxPart) : null;
            return {
              min: Number.isFinite(min) ? min : null,
              max: Number.isFinite(max) ? max : null
            };
          })()
        : null;

    const winner: WinnerEntry = {
      id: dist.id,
      prizeDistributionId: dist.id,
      prizeId: dist.prize_id || dist.prizeId,
      playerId: dist.player_id || dist.playerId,
      playerName: dist.player_name || dist.playerName || 'Unknown Player',
      playerRating:
        typeof dist.player_rating === 'number'
          ? dist.player_rating
          : dist.player_rating
          ? Number(dist.player_rating)
          : null,
      playerSection: dist.player_section || sectionKey,
      playerUscfId: dist.player_uscf_id || dist.playerUscfId || null,
      prizeName,
      prizeType,
      amount,
      position,
      ratingCategory,
      tieGroup,
      description: prizeDescription,
      metadata: {
        awardType: prizeType,
        ...(ratingRange ? { ratingRange } : {})
      }
    };

    sectionEntry.winners.push(winner);
    if (winner.playerId) {
      sectionEntry.stats.uniquePlayers.add(winner.playerId);
      uniquePlayers.add(winner.playerId);
    }

    if (prizeType === 'cash' && amount > 0) {
      sectionEntry.stats.cashTotal += amount;
      sectionEntry.stats.cashCount += 1;
      totalCash += amount;
      cashAwards += 1;
    } else {
      sectionEntry.stats.nonCashCount += 1;
      nonCashAwards += 1;
    }

    const timestampString = dist.updated_at || dist.created_at;
    if (timestampString) {
      const ts = new Date(timestampString);
      if (!Number.isNaN(ts.getTime())) {
        if (!latestTimestamp || ts > latestTimestamp) {
          latestTimestamp = ts;
        }
      }
    }
  });

  const sections = Array.from(sectionsMap.values()).map((section) => ({
    section: section.section,
    winners: section.winners,
    stats: {
      cashTotal: Number(section.stats.cashTotal.toFixed(2)),
      cashCount: section.stats.cashCount,
      nonCashCount: section.stats.nonCashCount,
      uniquePlayers: section.stats.uniquePlayers.size
    }
  }));

  const totals: WinnersTotals = {
    sections: sections.length,
    totalCash: Number(totalCash.toFixed(2)),
    cashAwards,
    nonCashAwards,
    uniqueWinners: uniquePlayers.size
  };

  return {
    sections,
    totals,
    lastUpdated: latestTimestamp ? latestTimestamp.toISOString() : undefined
  };
};

const PublicWinnersList: React.FC<PublicWinnersListProps> = ({
  tournamentId,
  initialDistributions
}) => {
  const fallbackResponse = useMemo(
    () => buildInitialResponse(initialDistributions),
    [initialDistributions]
  );
  const { sections, totals, loading, error, totalWinners } = useWinnersData(
    tournamentId,
    fallbackResponse
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



