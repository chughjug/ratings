import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, DollarSign, Trophy, Award, Medal, Users, Search, Check } from 'lucide-react';
import { tournamentApi, pairingApi } from '../services/api';

interface PrizeAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  onAssign: () => void;
  section?: string; // Optional section filter - if provided, only shows players from that section
}

interface Player {
  id: string;
  name: string;
  rating?: number;
  section?: string;
  total_points?: number;
  prize?: string;
}

interface PrizeDistribution {
  id: string;
  player_id: string;
  player_name: string;
  prize_name: string;
  prize_type: string;
  amount?: number;
  position?: number;
  section?: string;
  rating_category?: string;
}

const PrizeAssignmentModal: React.FC<PrizeAssignmentModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  onAssign,
  section
}) => {
  const [standings, setStandings] = useState<Player[]>([]);
  const [prizeDistributions, setPrizeDistributions] = useState<PrizeDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>(section || 'all');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [prizeForm, setPrizeForm] = useState({
    prizeName: '',
    prizeType: 'cash' as 'cash' | 'trophy' | 'medal' | 'plaque',
    amount: '',
    position: '',
    ratingCategory: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setSelectedPlayer(null);
      setPrizeForm({
        prizeName: '',
        prizeType: 'cash',
        amount: '',
        position: '',
        ratingCategory: ''
      });
    }
  }, [isOpen, tournamentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [standingsResponse, prizesResponse] = await Promise.all([
        pairingApi.getStandings(tournamentId, false, true),
        tournamentApi.getPrizes(tournamentId)
      ]);

      if (standingsResponse.data.success) {
        setStandings(standingsResponse.data.data);
      }
      if (prizesResponse.data.success) {
        setPrizeDistributions(prizesResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSections = () => {
    const sections = new Set<string>();
    standings.forEach(player => {
      if (player.section) sections.add(player.section);
    });
    return Array.from(sections).sort();
  };

  const filteredStandings = standings.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    // If section prop is provided, only show that section. Otherwise use selectedSection filter
    const sectionFilter = section || selectedSection;
    const matchesSection = sectionFilter === 'all' || player.section === sectionFilter;
    return matchesSearch && matchesSection;
  });

  const getPlayerPrizes = (playerId: string) => {
    return prizeDistributions.filter(p => p.player_id === playerId);
  };

  const handleAssignPrize = async () => {
    if (!selectedPlayer || !prizeForm.prizeName.trim()) {
      alert('Please select a player and enter a prize name');
      return;
    }

    try {
      setAssigning(true);
      await tournamentApi.assignPrize(tournamentId, {
        playerId: selectedPlayer.id,
        prizeName: prizeForm.prizeName.trim(),
        prizeType: prizeForm.prizeType,
        amount: prizeForm.amount ? parseFloat(prizeForm.amount) : undefined,
        position: prizeForm.position ? parseInt(prizeForm.position) : undefined,
        section: selectedPlayer.section || undefined,
        ratingCategory: prizeForm.ratingCategory || undefined
      });

      // Refresh data
      await fetchData();
      setSelectedPlayer(null);
      setPrizeForm({
        prizeName: '',
        prizeType: 'cash',
        amount: '',
        position: '',
        ratingCategory: ''
      });
      
      onAssign();
      alert('Prize assigned successfully!');
    } catch (error: any) {
      console.error('Error assigning prize:', error);
      alert('Failed to assign prize: ' + (error.response?.data?.error || error.message));
    } finally {
      setAssigning(false);
    }
  };

  const handleRemovePrize = async (distributionId: string) => {
    if (!confirm('Are you sure you want to remove this prize assignment?')) {
      return;
    }

    try {
      await tournamentApi.removePrizeAssignment(tournamentId, distributionId);
      await fetchData();
      onAssign();
      alert('Prize assignment removed successfully!');
    } catch (error: any) {
      console.error('Error removing prize:', error);
      alert('Failed to remove prize assignment: ' + (error.response?.data?.error || error.message));
    }
  };

  const quickAssignPrize = (player: Player, prizeName: string, prizeType: 'cash' | 'trophy' | 'medal' | 'plaque', amount?: number, position?: number) => {
    setSelectedPlayer(player);
    setPrizeForm({
      prizeName,
      prizeType,
      amount: amount?.toString() || '',
      position: position?.toString() || '',
      ratingCategory: ''
    });
  };

  const getPrizeIcon = (type: string) => {
    switch (type) {
      case 'cash': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'trophy': return <Trophy className="w-4 h-4 text-yellow-600" />;
      case 'medal': return <Medal className="w-4 h-4 text-blue-600" />;
      case 'plaque': return <Award className="w-4 h-4 text-purple-600" />;
      default: return <Award className="w-4 h-4 text-gray-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Assign Prizes{section && ` - ${section} Section`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Click on a player to assign or modify prizes</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel: Players List */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {!section && (
                <div>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Sections</option>
                    {getAvailableSections().map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              {section && (
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">Section: {section}</p>
                  <p className="text-xs text-blue-700 mt-1">Showing players from this section only</p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredStandings.map((player, index) => {
                    const playerPrizes = getPlayerPrizes(player.id);
                    const isSelected = selectedPlayer?.id === player.id;
                    return (
                      <div
                        key={player.id}
                        onClick={() => setSelectedPlayer(player)}
                        className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${
                          isSelected ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                              <span className="font-medium text-gray-900">{player.name}</span>
                              {player.rating && (
                                <span className="text-sm text-gray-500">({player.rating})</span>
                              )}
                            </div>
                            <div className="ml-8 text-sm text-gray-600">
                              {player.section && <span>{player.section} • </span>}
                              {player.total_points !== undefined && (
                                <span>{player.total_points} points</span>
                              )}
                            </div>
                            {playerPrizes.length > 0 && (
                              <div className="ml-8 mt-2 flex flex-wrap gap-2">
                                {playerPrizes.map(prize => (
                                  <div
                                    key={prize.id}
                                    className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs"
                                  >
                                    {getPrizeIcon(prize.prize_type)}
                                    <span>{prize.prize_name}</span>
                                    {prize.amount && <span>(${prize.amount})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredStandings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No players found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Prize Assignment Form */}
          <div className="w-1/2 flex flex-col">
            {selectedPlayer ? (
              <>
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Assign Prize to {selectedPlayer.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedPlayer.section && <span>Section: {selectedPlayer.section}</span>}
                    {selectedPlayer.rating && <span> • Rating: {selectedPlayer.rating}</span>}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {/* Quick Assign Buttons */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Assign
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => quickAssignPrize(selectedPlayer, '1st Place', 'trophy', undefined, 1)}
                        className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 text-sm font-medium"
                      >
                        <Trophy className="w-4 h-4 inline mr-1" />
                        1st Place Trophy
                      </button>
                      <button
                        onClick={() => quickAssignPrize(selectedPlayer, '2nd Place', 'trophy', undefined, 2)}
                        className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 text-sm font-medium"
                      >
                        <Trophy className="w-4 h-4 inline mr-1" />
                        2nd Place Trophy
                      </button>
                      <button
                        onClick={() => quickAssignPrize(selectedPlayer, '3rd Place', 'trophy', undefined, 3)}
                        className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 text-sm font-medium"
                      >
                        <Trophy className="w-4 h-4 inline mr-1" />
                        3rd Place Trophy
                      </button>
                      <button
                        onClick={() => quickAssignPrize(selectedPlayer, 'Best Game', 'medal')}
                        className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm font-medium"
                      >
                        <Medal className="w-4 h-4 inline mr-1" />
                        Best Game
                      </button>
                    </div>
                  </div>

                  {/* Prize Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prize Name *
                      </label>
                      <input
                        type="text"
                        value={prizeForm.prizeName}
                        onChange={(e) => setPrizeForm({ ...prizeForm, prizeName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 1st Place, Best Under 1600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prize Type *
                      </label>
                      <select
                        value={prizeForm.prizeType}
                        onChange={(e) => setPrizeForm({ ...prizeForm, prizeType: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="trophy">Trophy</option>
                        <option value="medal">Medal</option>
                        <option value="plaque">Plaque</option>
                      </select>
                    </div>

                    {prizeForm.prizeType === 'cash' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={prizeForm.amount}
                          onChange={(e) => setPrizeForm({ ...prizeForm, amount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position (optional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={prizeForm.position}
                        onChange={(e) => setPrizeForm({ ...prizeForm, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 1 for 1st place"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rating Category (optional)
                      </label>
                      <input
                        type="text"
                        value={prizeForm.ratingCategory}
                        onChange={(e) => setPrizeForm({ ...prizeForm, ratingCategory: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Under 1600, Under 1200"
                      />
                    </div>

                    <button
                      onClick={handleAssignPrize}
                      disabled={assigning || !prizeForm.prizeName.trim()}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {assigning ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Assigning...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Assign Prize</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Existing Prizes for this Player */}
                  {getPlayerPrizes(selectedPlayer.id).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Current Prizes</h4>
                      <div className="space-y-2">
                        {getPlayerPrizes(selectedPlayer.id).map(prize => (
                          <div
                            key={prize.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div className="flex items-center space-x-2">
                              {getPrizeIcon(prize.prize_type)}
                              <div>
                                <div className="font-medium text-gray-900">{prize.prize_name}</div>
                                {prize.amount && (
                                  <div className="text-sm text-green-600">${prize.amount}</div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemovePrize(prize.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a player from the list to assign prizes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrizeAssignmentModal;

