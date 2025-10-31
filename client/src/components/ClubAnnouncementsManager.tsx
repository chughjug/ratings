import React, { useState, useEffect } from 'react';
import { Bell, Plus, Edit2, Trash2, Pin, Eye, EyeOff, X, Save } from 'lucide-react';
import { clubFeaturesApi } from '../services/api';

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  [key: string]: any;
}

interface ClubAnnouncementsManagerProps {
  organizationId: string;
}

const ClubAnnouncementsManager: React.FC<ClubAnnouncementsManagerProps> = ({ organizationId }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, [organizationId, showPublishedOnly]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clubFeaturesApi.getAnnouncements(
        organizationId,
        showPublishedOnly ? true : undefined
      );
      if (response.data.success) {
        setAnnouncements(response.data.data.announcements);
      } else {
        setError('Failed to load announcements');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await clubFeaturesApi.deleteAnnouncement(id);
      if (response.data.success) {
        setAnnouncements(announcements.filter(a => a.id !== id));
      } else {
        alert('Failed to delete announcement');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete announcement');
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const response = await clubFeaturesApi.updateAnnouncement(announcement.id, {
        isPinned: !announcement.isPinned
      });
      if (response.data.success) {
        loadAnnouncements();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update announcement');
    }
  };

  const handleTogglePublish = async (announcement: Announcement) => {
    try {
      const response = await clubFeaturesApi.updateAnnouncement(announcement.id, {
        isPublished: !announcement.isPublished
      });
      if (response.data.success) {
        loadAnnouncements();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update announcement');
    }
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Club Announcements</h2>
          <span className="text-sm text-gray-500">({announcements.length})</span>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPublishedOnly}
              onChange={(e) => setShowPublishedOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Published only</span>
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Announcement</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No announcements yet. Click "New Announcement" to create one.</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-white rounded-lg shadow-sm border ${
                announcement.isPinned ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              } p-6`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {announcement.isPinned && (
                      <Pin className="h-4 w-4 text-blue-600 fill-current" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      announcement.isPublished
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {announcement.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="prose max-w-none text-gray-700 mb-4">
                    <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
                  </div>
                  <div className="text-sm text-gray-500">
                    {announcement.publishedAt && (
                      <span>Published: {new Date(announcement.publishedAt).toLocaleDateString()}</span>
                    )}
                    {announcement.expiresAt && (
                      <span className="ml-4">Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleTogglePin(announcement)}
                    className={`p-2 rounded-lg transition-colors ${
                      announcement.isPinned
                        ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                        : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                    title={announcement.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTogglePublish(announcement)}
                    className={`p-2 rounded-lg transition-colors ${
                      announcement.isPublished
                        ? 'text-green-600 bg-green-100 hover:bg-green-200'
                        : 'text-gray-400 hover:text-green-600 hover:bg-gray-100'
                    }`}
                    title={announcement.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {announcement.isPublished ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingAnnouncement(announcement)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingAnnouncement) && (
        <AnnouncementModal
          organizationId={organizationId}
          announcement={editingAnnouncement}
          onClose={() => {
            setShowAddModal(false);
            setEditingAnnouncement(null);
          }}
          onSave={() => {
            loadAnnouncements();
            setShowAddModal(false);
            setEditingAnnouncement(null);
          }}
        />
      )}
    </div>
  );
};

interface AnnouncementModalProps {
  organizationId: string;
  announcement?: Announcement | null;
  onClose: () => void;
  onSave: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ organizationId, announcement, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    isPinned: announcement?.isPinned || false,
    isPublished: announcement?.isPublished || false,
    expiresAt: announcement?.expiresAt || '',
    targetAudience: announcement?.targetAudience || 'all',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const data = {
        ...formData,
        organizationId,
      };

      let response;
      if (announcement) {
        response = await clubFeaturesApi.updateAnnouncement(announcement.id, data);
      } else {
        response = await clubFeaturesApi.createAnnouncement(data);
      }

      if (response.data.success) {
        onSave();
      } else {
        setError(response.data.error || 'Failed to save announcement');
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {announcement ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="You can use HTML formatting..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Pin to top</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Publish immediately</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Optional)</label>
            <input
              type="date"
              value={formData.expiresAt ? formData.expiresAt.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value ? `${e.target.value}T23:59:59` : '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : announcement ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubAnnouncementsManager;

