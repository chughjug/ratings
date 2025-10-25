import React, { useState, useEffect } from 'react';
import { 
  User, 
  Camera, 
  Trophy, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Star,
  Edit,
  Save,
  X,
  Plus,
  Award,
  BarChart3,
  History
} from 'lucide-react';
import { playerProfileApi } from '../services/api';

interface PlayerProfileProps {
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PlayerProfile {
  id: string;
  name: string;
  uscf_id?: string;
  fide_id?: string;
  rating: number;
  peak_rating: number;
  photos: {
    thumb: string;
    medium: string;
    large: string;
  };
  achievements: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    tournament?: string;
    date: string;
  }>;
  statistics: {
    total_tournaments: number;
    total_games: number;
    wins: number;
    losses: number;
    draws: number;
    win_percentage: number;
    current_streak: number;
    longest_streak: number;
  };
  recent_tournaments: Array<{
    id: string;
    name: string;
    date: string;
    place: number;
    score: string;
    rating_change: string;
  }>;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'statistics' | 'history'>('overview');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showAddAchievement, setShowAddAchievement] = useState(false);
  const [newAchievement, setNewAchievement] = useState({
    type: '',
    title: '',
    description: '',
    tournament: '',
    date: ''
  });
  const [achievementTypes, setAchievementTypes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && playerId) {
      loadPlayerProfile();
      loadAchievementTypes();
    }
  }, [isOpen, playerId]);

  const loadPlayerProfile = async () => {
    setLoading(true);
    try {
      const response = await playerProfileApi.getProfile(playerId);
      setProfile(response.data.data);
      setEditData(response.data.data);
    } catch (error) {
      console.error('Failed to load player profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievementTypes = async () => {
    try {
      const response = await playerProfileApi.getAchievementTypes();
      setAchievementTypes(response.data.data);
    } catch (error) {
      console.error('Failed to load achievement types:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await playerProfileApi.updateProfile(playerId, editData);
      setProfile(response.data.data);
      setEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await playerProfileApi.uploadPhoto(playerId, formData);
      setProfile(prev => prev ? { ...prev, photos: response.data.data.photos } : null);
    } catch (error) {
      console.error('Failed to upload photo:', error);
    }
  };

  const handleAddAchievement = async () => {
    try {
      const response = await playerProfileApi.addAchievement(playerId, newAchievement);
      setProfile(prev => prev ? {
        ...prev,
        achievements: [...prev.achievements, response.data.data]
      } : null);
      setNewAchievement({
        type: '',
        title: '',
        description: '',
        tournament: '',
        date: ''
      });
      setShowAddAchievement(false);
    } catch (error) {
      console.error('Failed to add achievement:', error);
    }
  };

  const getAchievementIcon = (type: string) => {
    const achievementType = achievementTypes.find(t => t.value === type);
    return achievementType?.icon || '🏆';
  };

  const getAchievementColor = (type: string) => {
    const colors: { [key: string]: string } = {
      tournament_win: 'bg-yellow-100 text-yellow-800',
      rating_milestone: 'bg-blue-100 text-blue-800',
      perfect_score: 'bg-green-100 text-green-800',
      upset_win: 'bg-red-100 text-red-800',
      long_streak: 'bg-orange-100 text-orange-800',
      first_tournament: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                {profile?.name || 'Player Profile'}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {editing ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center space-x-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : profile ? (
          <div className="flex">
            {/* Left Panel - Profile Info */}
            <div className="w-1/3 p-6 border-r bg-gray-50">
              {/* Photo Section */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <img
                    src={profile.photos?.large || '/default-avatar.png'}
                    alt={profile.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  {editing && (
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mt-4">{profile.name}</h3>
                <p className="text-gray-600">Rating: {profile.rating}</p>
                {profile.peak_rating > profile.rating && (
                  <p className="text-sm text-gray-500">Peak: {profile.peak_rating}</p>
                )}
              </div>

              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">USCF ID: {profile.uscf_id || 'N/A'}</span>
                </div>
                {profile.fide_id && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">FIDE ID: {profile.fide_id}</span>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tournaments:</span>
                  <span className="text-sm font-medium">{profile.statistics.total_tournaments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Games:</span>
                  <span className="text-sm font-medium">{profile.statistics.total_games}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Win %:</span>
                  <span className="text-sm font-medium">{profile.statistics.win_percentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Streak:</span>
                  <span className="text-sm font-medium">{profile.statistics.current_streak}</span>
                </div>
              </div>
            </div>

            {/* Right Panel - Content */}
            <div className="w-2/3">
              {/* Tabs */}
              <div className="border-b">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: User },
                    { id: 'achievements', label: 'Achievements', icon: Trophy },
                    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
                    { id: 'history', label: 'History', icon: History }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Tournaments</h4>
                      <div className="space-y-3">
                        {profile.recent_tournaments.map((tournament, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{tournament.name}</p>
                              <p className="text-sm text-gray-600">{tournament.date}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">#{tournament.place}</p>
                              <p className="text-sm text-gray-600">{tournament.score}</p>
                              <p className={`text-sm ${tournament.rating_change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                {tournament.rating_change}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Achievements Tab */}
                {activeTab === 'achievements' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium text-gray-900">Achievements</h4>
                      <button
                        onClick={() => setShowAddAchievement(true)}
                        className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Achievement</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.achievements.map((achievement, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <div className="text-2xl">{getAchievementIcon(achievement.type)}</div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h5 className="font-medium text-gray-900">{achievement.title}</h5>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAchievementColor(achievement.type)}`}>
                                  {achievement.type.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                              {achievement.tournament && (
                                <p className="text-sm text-gray-500">Tournament: {achievement.tournament}</p>
                              )}
                              <p className="text-sm text-gray-500">{achievement.date}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistics Tab */}
                {activeTab === 'statistics' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900">Detailed Statistics</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{profile.statistics.wins}</div>
                        <div className="text-sm text-blue-800">Wins</div>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">{profile.statistics.losses}</div>
                        <div className="text-sm text-red-800">Losses</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-gray-600">{profile.statistics.draws}</div>
                        <div className="text-sm text-gray-800">Draws</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{profile.statistics.win_percentage.toFixed(1)}%</div>
                        <div className="text-sm text-green-800">Win Rate</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3">Current Streak</h5>
                        <div className="text-3xl font-bold text-blue-600">{profile.statistics.current_streak}</div>
                        <p className="text-sm text-gray-600">consecutive wins</p>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-3">Longest Streak</h5>
                        <div className="text-3xl font-bold text-green-600">{profile.statistics.longest_streak}</div>
                        <p className="text-sm text-gray-600">consecutive wins</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-medium text-gray-900">Tournament History</h4>
                    <div className="space-y-3">
                      {profile.recent_tournaments.map((tournament, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl font-bold text-gray-400">#{tournament.place}</div>
                            <div>
                              <p className="font-medium text-gray-900">{tournament.name}</p>
                              <p className="text-sm text-gray-600">{tournament.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{tournament.score}</p>
                            <p className={`text-sm ${tournament.rating_change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                              {tournament.rating_change}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Add Achievement Modal */}
        {showAddAchievement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Achievement</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newAchievement.type}
                    onChange={(e) => setNewAchievement({...newAchievement, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type</option>
                    {achievementTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newAchievement.title}
                    onChange={(e) => setNewAchievement({...newAchievement, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newAchievement.description}
                    onChange={(e) => setNewAchievement({...newAchievement, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tournament (Optional)</label>
                  <input
                    type="text"
                    value={newAchievement.tournament}
                    onChange={(e) => setNewAchievement({...newAchievement, tournament: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={newAchievement.date}
                    onChange={(e) => setNewAchievement({...newAchievement, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddAchievement(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAchievement}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Achievement
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
