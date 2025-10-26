import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, ArrowUp, ArrowDown } from 'lucide-react';

interface CustomPage {
  id?: string;
  tournament_id: string;
  title: string;
  slug: string;
  content: string;
  order_index: number;
  is_active: boolean;
  icon?: string;
}

interface CustomPagesManagerProps {
  tournamentId: string;
}

const CustomPagesManager: React.FC<CustomPagesManagerProps> = ({ tournamentId }) => {
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPages();
  }, [tournamentId]);

  const fetchPages = async () => {
    try {
      const response = await fetch(`/api/custom-pages/tournament/${tournamentId}`);
      const data = await response.json();
      if (data.success) {
        setPages(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch custom pages:', error);
    }
  };

  const handleCreate = async (page: CustomPage) => {
    setLoading(true);
    try {
      const response = await fetch('/api/custom-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...page,
          tournament_id: tournamentId
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchPages();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to create page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (page: CustomPage) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/custom-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(page)
      });
      const data = await response.json();
      if (data.success) {
        await fetchPages();
        setEditingPage(null);
      }
    } catch (error) {
      console.error('Failed to update page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this page?')) return;
    try {
      const response = await fetch(`/api/custom-pages/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        await fetchPages();
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Custom Pages</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Page
        </button>
      </div>

      <div className="space-y-3">
        {pages.map((page) => (
          <div key={page.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-gray-500 font-medium">{page.order_index + 1}.</span>
              {page.icon && <span className="text-2xl">{page.icon}</span>}
              <div className="flex-1">
                <div className="font-medium">{page.title}</div>
                <div className="text-sm text-gray-500">/{page.slug}</div>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${page.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {page.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingPage(page)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(page.id!)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingPage) && (
        <PageEditor
          page={editingPage || undefined}
          onClose={() => {
            setShowAddModal(false);
            setEditingPage(null);
          }}
          onSave={(page) => editingPage ? handleUpdate(page) : handleCreate(page)}
          loading={loading}
          slugify={slugify}
        />
      )}
    </div>
  );
};

interface PageEditorProps {
  page?: CustomPage;
  onClose: () => void;
  onSave: (page: CustomPage) => void;
  loading: boolean;
  slugify: (text: string) => string;
}

const PageEditor: React.FC<PageEditorProps> = ({ page, onClose, onSave, loading, slugify }) => {
  const [formData, setFormData] = useState<CustomPage>({
    id: page?.id,
    tournament_id: page?.tournament_id || '',
    title: page?.title || '',
    slug: page?.slug || '',
    content: page?.content || '',
    order_index: page?.order_index || 0,
    is_active: page?.is_active !== undefined ? page.is_active : true,
    icon: page?.icon || ''
  });

  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: slugify(title)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{page ? 'Edit Page' : 'Add Custom Page'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Icon (emoji)</label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="📋"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Page Title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="page-url"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content (HTML)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg h-64 font-mono text-sm"
              placeholder="<h3>Page Content</h3><p>Your HTML content here...</p>"
              required
            />
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Order</label>
              <input
                type="number"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPagesManager;

