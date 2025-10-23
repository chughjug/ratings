import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Trophy, 
  Users,
  Plus,
  Filter
} from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: 'created' | 'active' | 'completed' | 'cancelled';
  format: string;
  location?: string;
  isPublic: boolean;
  allowRegistration: boolean;
}

interface OrganizationCalendarProps {
  tournaments: Tournament[];
  onTournamentClick?: (tournament: Tournament) => void;
  onCreateTournament?: () => void;
}

const OrganizationCalendar: React.FC<OrganizationCalendarProps> = ({
  tournaments,
  onTournamentClick,
  onCreateTournament
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');

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

  const getTournamentsForDate = (date: Date) => {
    if (!tournaments) return [];
    
    return tournaments.filter(tournament => {
      const tournamentDate = new Date(tournament.startDate);
      return tournamentDate.toDateString() === date.toDateString();
    });
  };

  const getFilteredTournaments = () => {
    let filtered = tournaments || [];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    
    if (filterFormat !== 'all') {
      filtered = filtered.filter(t => t.format === filterFormat);
    }
    
    return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'created': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFormatIcon = (format: string) => {
    if (format.includes('team')) return Users;
    if (format.includes('blitz')) return Clock;
    return Trophy;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{monthName}</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const tournamentsForDay = day ? getTournamentsForDate(day) : [];
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border border-gray-100 ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-blue-600' : ''}`}>
                        {day.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {tournamentsForDay.slice(0, 2).map(tournament => (
                          <div
                            key={tournament.id}
                            onClick={() => onTournamentClick?.(tournament)}
                            className={`text-xs p-1 rounded cursor-pointer transition-colors ${getStatusColor(tournament.status)} hover:opacity-80`}
                          >
                            <div className="truncate font-medium">{tournament.name}</div>
                            <div className="flex items-center text-xs opacity-75">
                              {React.createElement(getFormatIcon(tournament.format), { className: "h-3 w-3 mr-1" })}
                              {tournament.format}
                            </div>
                          </div>
                        ))}
                        {tournamentsForDay.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{tournamentsForDay.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const weekRange = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{weekRange}</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                This Week
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-4">
            {weekDates.map((date, index) => {
              const tournamentsForDay = getTournamentsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div key={index} className="min-h-[200px]">
                  <div className={`text-center mb-3 ${
                    isToday ? 'text-blue-600 font-semibold' : 'text-gray-900'
                  }`}>
                    <div className="text-sm font-medium">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-lg font-bold">{date.getDate()}</div>
                  </div>
                  
                  <div className="space-y-2">
                    {tournamentsForDay.map(tournament => (
                      <div
                        key={tournament.id}
                        onClick={() => onTournamentClick?.(tournament)}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${getStatusColor(tournament.status)} hover:opacity-80`}
                      >
                        <div className="font-medium text-sm truncate">{tournament.name}</div>
                        <div className="flex items-center text-xs opacity-75 mt-1">
                          {React.createElement(getFormatIcon(tournament.format), { className: "h-3 w-3 mr-1" })}
                          {tournament.format}
                        </div>
                        {tournament.location && (
                          <div className="flex items-center text-xs opacity-75 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {tournament.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const filteredTournaments = getFilteredTournaments();

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Tournaments</h3>
        </div>
        
        <div className="p-4">
          {filteredTournaments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="mx-auto h-12 w-12 mb-4" />
              <p>No tournaments found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTournaments.map(tournament => (
                <div
                  key={tournament.id}
                  onClick={() => onTournamentClick?.(tournament)}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{tournament.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(tournament.status)}`}>
                        {tournament.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(new Date(tournament.startDate))}
                      </span>
                      <span className="flex items-center">
                        {React.createElement(getFormatIcon(tournament.format), { className: "h-4 w-4 mr-1" })}
                        {tournament.format}
                      </span>
                      {tournament.location && (
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {tournament.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {tournament.isPublic && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        Public
                      </span>
                    )}
                    {tournament.allowRegistration && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        Registration Open
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Tournament Calendar</h2>
          {onCreateTournament && (
            <button
              onClick={onCreateTournament}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Tournament
            </button>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="created">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Formats</option>
              <option value="swiss">Swiss</option>
              <option value="round-robin">Round Robin</option>
              <option value="team-swiss">Team Swiss</option>
              <option value="blitz">Blitz</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar content */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'list' && renderListView()}
    </div>
  );
};

export default OrganizationCalendar;
