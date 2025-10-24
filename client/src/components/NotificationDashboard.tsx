import React, { useState, useMemo } from 'react';
import { AlertTriangle, Clock, X, CheckCircle, Filter, Search, Bell, ChevronDown, ChevronUp, Users, Calendar, Shield } from 'lucide-react';

export interface NotificationItem {
  id: string;
  type: 'expired' | 'expiring' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  playerName: string;
  daysUntilExpiration?: number;
  expirationDate?: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  section?: string;
  uscfId?: string;
}

interface NotificationDashboardProps {
  notifications: NotificationItem[];
  onDismiss?: (notificationId: string) => void;
  onMarkAsRead?: (notificationId: string) => void;
  onViewPlayer?: (playerName: string) => void;
  className?: string;
}

const NotificationDashboard: React.FC<NotificationDashboardProps> = ({
  notifications,
  onDismiss,
  onMarkAsRead,
  onViewPlayer,
  className = ''
}) => {
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring' | 'warning' | 'info' | 'success'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['expired', 'expiring']));
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Filter and group notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications.filter(notification => 
      !dismissedNotifications.has(notification.id) &&
      (filter === 'all' || notification.type === filter) &&
      (searchTerm === '' || 
       notification.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       notification.message.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Sort by priority and timestamp
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return filtered;
  }, [notifications, filter, searchTerm, dismissedNotifications]);

  // Group notifications by type
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: NotificationItem[] } = {};
    filteredNotifications.forEach(notification => {
      if (!groups[notification.type]) {
        groups[notification.type] = [];
      }
      groups[notification.type].push(notification);
    });
    return groups;
  }, [filteredNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expired':
        return <X className="h-5 w-5 text-red-500" />;
      case 'expiring':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'info':
        return <Bell className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'expired':
        return 'border-l-red-500 bg-red-50 hover:bg-red-100';
      case 'expiring':
        return 'border-l-yellow-500 bg-yellow-50 hover:bg-yellow-100';
      case 'warning':
        return 'border-l-orange-500 bg-orange-50 hover:bg-orange-100';
      case 'info':
        return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100';
      case 'success':
        return 'border-l-green-500 bg-green-50 hover:bg-green-100';
      default:
        return 'border-l-gray-500 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'expired':
        return 'Expired USCF IDs';
      case 'expiring':
        return 'Expiring USCF IDs';
      case 'warning':
        return 'Warnings';
      case 'info':
        return 'Information';
      case 'success':
        return 'Success Messages';
      default:
        return 'Notifications';
    }
  };

  const getTypeCount = (type: string) => {
    return groupedNotifications[type]?.length || 0;
  };

  const toggleGroup = (type: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedGroups(newExpanded);
  };

  const handleDismiss = (notificationId: string) => {
    setDismissedNotifications(prev => new Set(Array.from(prev).concat(notificationId)));
    onDismiss?.(notificationId);
  };

  const handleMarkAsRead = (notificationId: string) => {
    onMarkAsRead?.(notificationId);
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (notifications.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-600">No notifications at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Notification Center</h2>
              <p className="text-sm text-gray-600">
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>
            
            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="all">All Types</option>
                <option value="expired">Expired IDs</option>
                <option value="expiring">Expiring IDs</option>
                <option value="warning">Warnings</option>
                <option value="info">Information</option>
                <option value="success">Success</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="divide-y divide-gray-200">
        {Object.entries(groupedNotifications).map(([type, typeNotifications]) => (
          <div key={type} className="p-6">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(type)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {getNotificationIcon(type)}
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{getTypeLabel(type)}</h3>
                  <p className="text-sm text-gray-600">{getTypeCount(type)} notification{getTypeCount(type) !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityBadge('high')}`}>
                  {typeNotifications.filter(n => n.priority === 'high').length} High
                </span>
                {expandedGroups.has(type) ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Group Content */}
            {expandedGroups.has(type) && (
              <div className="mt-4 space-y-3">
                {typeNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-l-4 rounded-lg p-4 transition-all duration-200 ${getNotificationColor(notification.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-gray-900 truncate">{notification.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityBadge(notification.priority)}`}>
                            {notification.priority}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">{notification.message}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{notification.playerName}</span>
                          </div>
                          {notification.section && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{notification.section}</span>
                            </div>
                          )}
                          {notification.uscfId && (
                            <div className="flex items-center space-x-1">
                              <Shield className="h-3 w-3" />
                              <span>ID: {notification.uscfId}</span>
                            </div>
                          )}
                          <span>{formatTimeAgo(notification.timestamp)}</span>
                        </div>
                        
                        {notification.daysUntilExpiration !== undefined && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    notification.daysUntilExpiration < 0
                                      ? 'bg-red-500'
                                      : notification.daysUntilExpiration <= 7
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, (30 - notification.daysUntilExpiration) / 30 * 100))}%`
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">
                                {notification.daysUntilExpiration < 0
                                  ? 'Expired'
                                  : `${notification.daysUntilExpiration} days left`
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {onViewPlayer && (
                          <button
                            onClick={() => onViewPlayer(notification.playerName)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                          >
                            View Player
                          </button>
                        )}
                        {onMarkAsRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDismiss(notification.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setDismissedNotifications(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  const allIds = notifications.map(n => n.id);
                  setDismissedNotifications(new Set(allIds));
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
              >
                Dismiss All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDashboard;
