import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar, 
  User, 
  Globe, 
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Megaphone,
  X
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
  isPublished: boolean;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  views: number;
}

interface OrganizationNewsProps {
  organizationId: string;
  isAdmin?: boolean;
}

const OrganizationNews: React.FC<OrganizationNewsProps> = ({
  organizationId,
  isAdmin = false
}) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Mock data - in a real app, this would come from an API
  const mockNewsItems: NewsItem[] = [
    {
      id: '1',
      title: 'Upcoming Championship Tournament',
      content: 'We are excited to announce our upcoming championship tournament scheduled for next month. This will be our biggest tournament of the year with prizes totaling $5,000.',
      author: 'John Smith',
      publishedAt: '2024-01-15T10:00:00Z',
      isPublished: true,
      priority: 'high',
      tags: ['tournament', 'championship', 'prizes'],
      views: 234
    },
    {
      id: '2',
      title: 'New Rating System Implementation',
      content: 'Starting next month, we will be implementing a new rating system that better reflects player performance. All existing ratings will be preserved.',
      author: 'Sarah Johnson',
      publishedAt: '2024-01-10T14:30:00Z',
      isPublished: true,
      priority: 'medium',
      tags: ['rating', 'system', 'update'],
      views: 156
    },
    {
      id: '3',
      title: 'Monthly Club Meeting - Draft',
      content: 'Don\'t forget about our monthly club meeting this Saturday at 2 PM. We will be discussing tournament schedules and club improvements.',
      author: 'Mike Davis',
      publishedAt: '2024-01-08T09:15:00Z',
      isPublished: false,
      priority: 'low',
      tags: ['meeting', 'club'],
      views: 0
    }
  ];

  useEffect(() => {
    loadNewsItems();
  }, [organizationId]);

  const loadNewsItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNewsItems(mockNewsItems);
    } catch (error: any) {
      setError('Failed to load news items');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNews = async (newsData: Partial<NewsItem>) => {
    try {
      const newItem: NewsItem = {
        id: Date.now().toString(),
        title: newsData.title || '',
        content: newsData.content || '',
        author: newsData.author || 'Current User',
        publishedAt: new Date().toISOString(),
        isPublished: newsData.isPublished || false,
        priority: newsData.priority || 'medium',
        tags: newsData.tags || [],
        views: 0
      };

      setNewsItems(prev => [newItem, ...prev]);
      setShowCreateForm(false);
    } catch (error) {
      setError('Failed to create news item');
    }
  };

  const handleUpdateNews = async (id: string, updates: Partial<NewsItem>) => {
    try {
      setNewsItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      setEditingItem(null);
    } catch (error) {
      setError('Failed to update news item');
    }
  };

  const handleDeleteNews = async (id: string) => {
    try {
      setNewsItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      setError('Failed to delete news item');
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      setNewsItems(prev => prev.map(item => 
        item.id === id 
          ? { 
              ...item, 
              isPublished: !item.isPublished,
              publishedAt: !item.isPublished ? new Date().toISOString() : item.publishedAt
            }
          : item
      ));
    } catch (error) {
      setError('Failed to update news item');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNews = newsItems.filter(item => {
    if (filter === 'published') return item.isPublished;
    if (filter === 'draft') return !item.isPublished;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">News & Announcements</h2>
          <p className="text-gray-600 mt-1">Keep your community informed with latest updates</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Items</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create News
            </button>
          )}
        </div>
      </div>

      {/* News Items */}
      {filteredNews.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No news items</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No news items have been created yet.'
              : `No ${filter} news items found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}>
                          <div className="flex items-center space-x-1">
                            {getPriorityIcon(item.priority)}
                            <span className="capitalize">{item.priority}</span>
                          </div>
                        </span>
                        {item.isPublished ? (
                          <span className="flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            <Globe className="h-3 w-3 mr-1" />
                            Published
                          </span>
                        ) : (
                          <span className="flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-3">{item.content}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {item.author}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(item.publishedAt)}
                      </span>
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {item.views} views
                      </span>
                    </div>
                    
                    {item.tags.length > 0 && (
                      <div className="flex items-center space-x-2 mt-3">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleTogglePublish(item.id)}
                        className={`p-2 rounded-md transition-colors ${
                          item.isPublished 
                            ? 'text-gray-400 hover:text-gray-600' 
                            : 'text-green-400 hover:text-green-600'
                        }`}
                      >
                        {item.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingItem ? 'Edit News Item' : 'Create News Item'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingItem(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = {
                    title: formData.get('title') as string,
                    content: formData.get('content') as string,
                    priority: formData.get('priority') as 'low' | 'medium' | 'high',
                    isPublished: formData.get('isPublished') === 'on',
                    tags: (formData.get('tags') as string).split(',').map(tag => tag.trim()).filter(Boolean)
                  };

                  if (editingItem) {
                    handleUpdateNews(editingItem.id, data);
                  } else {
                    handleCreateNews(data);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingItem?.title || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    name="content"
                    rows={6}
                    defaultValue={editingItem?.content || ''}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      defaultValue={editingItem?.priority || 'medium'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      defaultValue={editingItem?.tags?.join(', ') || ''}
                      placeholder="tournament, championship, update"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isPublished"
                    defaultChecked={editingItem?.isPublished || false}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Publish immediately
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingItem(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingItem ? 'Update' : 'Create'} News Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationNews;
