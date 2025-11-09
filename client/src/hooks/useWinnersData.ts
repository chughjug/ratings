import { useCallback, useEffect, useMemo, useState } from 'react';
import { tournamentApi } from '../services/api';

export interface WinnerEntry {
  id: string;
  prizeDistributionId: string;
  prizeId?: string;
  playerId: string;
  playerName: string;
  playerRating: number | null;
  playerSection: string;
  playerUscfId: string | null;
  prizeName: string;
  prizeType: string;
  amount: number;
  position: number | null;
  ratingCategory: string | null;
  tieGroup: number | null;
  description?: string | null;
  metadata?: Record<string, any>;
}

export interface WinnersSection {
  section: string;
  winners: WinnerEntry[];
  stats: {
    cashTotal: number;
    cashCount: number;
    nonCashCount: number;
    uniquePlayers: number;
  };
}

export interface WinnersTotals {
  sections: number;
  totalCash: number;
  cashAwards: number;
  nonCashAwards: number;
  uniqueWinners: number;
}

export interface WinnersResponse {
  sections: WinnersSection[];
  totals: WinnersTotals;
  lastUpdated?: string;
}

export const useWinnersData = (
  tournamentId?: string | null,
  initialData?: WinnersResponse | null
) => {
  const [sections, setSections] = useState<WinnersSection[]>(initialData?.sections || []);
  const [totals, setTotals] = useState<WinnersTotals | null>(initialData?.totals || null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(initialData?.lastUpdated || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWinners = useCallback(async () => {
    if (!tournamentId) {
      setSections(initialData?.sections || []);
      setTotals(initialData?.totals || null);
      setLastUpdated(initialData?.lastUpdated || null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await tournamentApi.getWinners(tournamentId);
      if (response.data?.success) {
        const data: WinnersResponse = response.data.data || { sections: [], totals: null, lastUpdated: null };
        setSections(data.sections || []);
        setTotals(data.totals || null);
        setLastUpdated(data.lastUpdated || null);
      } else {
        setError(response.data?.error || 'Unable to load winners.');
      }
    } catch (err: any) {
      console.error('Error fetching winners:', err);
      setError(err?.message || 'Unable to load winners.');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, initialData]);

  useEffect(() => {
    if (initialData) {
      setSections(initialData.sections || []);
      setTotals(initialData.totals || null);
      setLastUpdated(initialData.lastUpdated || null);
    }
  }, [initialData]);

  useEffect(() => {
    fetchWinners();
  }, [fetchWinners]);

  const totalWinners = useMemo(
    () => sections.reduce((sum, section) => sum + section.winners.length, 0),
    [sections]
  );

  return {
    sections,
    totals,
    lastUpdated,
    loading,
    error,
    totalWinners,
    refresh: fetchWinners
  };
};


