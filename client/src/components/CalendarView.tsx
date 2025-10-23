import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, Users, ExternalLink } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  format: string;
  rounds: number;
  start_date?: string;
  end_date?: string;
  status: string;
  city?: string;
  state?: string;
  location?: string;
  expected_players?: number;
  website?: string;
  created_at: string;
  time_control?: string;
  chief_td_name?: string;
  chief_arbiter_name?: string;
  fide_rated?: boolean;
  uscf_rated?: boolean;
  settings?: any;
}

interface CalendarViewProps {
  tournaments: Tournament[];
  onTournamentClick?: (tournament: Tournament) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tournaments, onTournamentClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'created':
        return 'Open for Registration';
      case 'active':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Group tournaments by month and date
  const tournamentsByMonth = useMemo(() => {
    const grouped: { [key: string]: Tournament[] } = {};
    
    tournaments.forEach(tournament => {
      const startDate = formatDate(tournament.start_date);
      if (!startDate) return;
      
      const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      const dateKey = `${monthKey}-${String(startDate.getDate()).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      
      // Add tournament to the month group
      if (!grouped[monthKey].find(t => t.id === tournament.id)) {
        grouped[monthKey].push(tournament);
      }
    });
    
    return grouped;
  }, [tournaments]);

  // Get current month key
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthTournaments = tournamentsByMonth[currentMonthKey] || [];

  // Group current month tournaments by date
  const tournamentsByDate = useMemo(() => {
    const grouped: { [key: string]: Tournament[] } = {};
    
    currentMonthTournaments.forEach(tournament => {
      const startDate = formatDate(tournament.start_date);
      if (!startDate) return;
      
      const dateKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(tournament);
    });
    
    return grouped;
  }, [currentMonthTournaments]);

  // Get all dates in current month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const days = getDaysInMonth(currentDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {formatMonthYear(currentDate)}
        </h2>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-24 border-r border-b border-gray-200 last:border-r-0"></div>;
            }

            const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
            const dayTournaments = tournamentsByDate[dateKey] || [];
            const isCurrentDay = isToday(day);

            return (
              <div 
                key={index} 
                className={`h-24 border-r border-b border-gray-200 last:border-r-0 p-2 ${
                  isCurrentDay ? 'bg-blue-50' : 'bg-white'
                } hover:bg-gray-50 transition-colors`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentDay ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayTournaments.slice(0, 2).map(tournament => (
                    <div
                      key={tournament.id}
                      className={`text-xs p-1 rounded cursor-pointer truncate ${
                        tournament.status === 'active' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : tournament.status === 'completed'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                      onClick={() => onTournamentClick?.(tournament)}
                      title={tournament.name}
                    >
                      {tournament.name}
                    </div>
                  ))}
                  {dayTournaments.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayTournaments.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tournament Details for Selected Date */}
      {Object.keys(tournamentsByDate).length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournaments this month</h3>
          <div className="space-y-4">
            {Object.entries(tournamentsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, tournaments]) => {
                const date = new Date(dateKey);
                return (
                  <div key={dateKey} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {formatDay(date)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tournaments.map(tournament => (
                        <div key={tournament.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                              {tournament.name}
                            </h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              tournament.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : tournament.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getStatusText(tournament.status)}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-xs text-gray-600">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Format:</span>
                              <span className="capitalize">{tournament.format.replace('-', ' ')}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Rounds:</span>
                              <span>{tournament.rounds}</span>
                            </div>

                            {tournament.time_control && (
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3" />
                                <span>{tournament.time_control}</span>
                              </div>
                            )}

                            {(tournament.city || tournament.state) && (
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {tournament.city && tournament.state 
                                    ? `${tournament.city}, ${tournament.state}`
                                    : tournament.city || tournament.state
                                  }
                                </span>
                              </div>
                            )}

                            {tournament.expected_players && (
                              <div className="flex items-center space-x-2">
                                <Users className="h-3 w-3" />
                                <span>{tournament.expected_players} players</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-2 mt-4">
                            <Link
                              to={`/register/${tournament.id}`}
                              className="flex-1 bg-black text-white text-center py-1.5 px-3 rounded text-xs font-medium hover:bg-gray-800 transition-colors"
                            >
                              Register
                            </Link>
                            <Link
                              to={`/public/tournaments/${tournament.id}`}
                              className="flex-1 border border-gray-300 text-gray-700 text-center py-1.5 px-3 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                            >
                              View
                            </Link>
                            {tournament.website && (
                              <a
                                href={tournament.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                title="Visit tournament website"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
