import React, { useState, useEffect } from 'react';
import { 
  Eye, Save, RefreshCw, X, Palette, Layout, Image, 
  Globe, Settings, FileText, Code, Monitor, Smartphone,
  ChevronDown, ChevronUp, Plus, Trash2, Edit, Check
} from 'lucide-react';

interface CustomPage {
  id: string;
  name: string;
  slug: string;
  content: string;
  isEmbeddable: boolean;
  embedSettings?: {
    minHeight?: number;
    maxHeight?: number;
    allowFullscreen?: boolean;
    responsive?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface PublicViewCustomizationProps {
  tournament: any;
  onSave: (config: any) => Promise<void>;
  onClose: () => void;
}

const PublicViewCustomization: React.FC<PublicViewCustomizationProps> = ({ tournament, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overlay' | 'pages' | 'embed'>('overlay');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Overlay settings
  const [overlayConfig, setOverlayConfig] = useState({
    showHeader: true,
    showFooter: true,
    showBreadcrumbs: true,
    showNavigation: true,
    showSearch: true,
    showStats: true,
    customCSS: '',
    customJS: '',
    headerHTML: '',
    footerHTML: '',
    branding: {
      logoUrl: tournament?.logo_url || '',
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#f59e0b',
    }
  });

  // Custom pages
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
  const [newPage, setNewPage] = useState(false);
  const [pageForm, setPageForm] = useState({
    name: '',
    slug: '',
    content: '',
    isEmbeddable: false,
    embedSettings: {
      minHeight: 400,
      maxHeight: 1200,
      allowFullscreen: true,
      responsive: true
    }
  });

  // Load existing configuration
  useEffect(() => {
    if (tournament?.public_display_config) {
      try {
        const config = JSON.parse(tournament.public_display_config);
        setOverlayConfig(prev => ({ ...prev, ...config }));
      } catch (e) {
        console.error('Failed to parse display config:', e);
      }
    }
  }, [tournament]);

  const handleOverlayChange = (key: string, value: any) => {
    setOverlayConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleBrandingChange = (key: string, value: string) => {
    setOverlayConfig(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        public_display_config: JSON.stringify(overlayConfig),
        custom_pages: customPages
      });
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPage = () => {
    setNewPage(true);
    setPageForm({
      name: '',
      slug: '',
      content: '',
      isEmbeddable: false,
      embedSettings: {
        minHeight: 400,
        maxHeight: 1200,
        allowFullscreen: true,
        responsive: true
      }
    });
  };

  const handleSavePage = () => {
    if (!pageForm.name || !pageForm.slug) {
      alert('Name and slug are required');
      return;
    }

    const page: CustomPage = {
      id: editingPage?.id || `page-${Date.now()}`,
      name: pageForm.name,
      slug: pageForm.slug,
      content: pageForm.content,
      isEmbeddable: pageForm.isEmbeddable,
      embedSettings: pageForm.embedSettings,
      updatedAt: new Date().toISOString()
    };

    if (editingPage) {
      setCustomPages(prev => prev.map(p => p.id === editingPage.id ? page : p));
      setEditingPage(null);
    } else {
      setCustomPages(prev => [...prev, page]);
    }

    setNewPage(false);
    setPageForm({
      name: '',
      slug: '',
      content: '',
      isEmbeddable: false,
      embedSettings: {
        minHeight: 400,
        maxHeight: 1200,
        allowFullscreen: true,
        responsive: true
      }
    });
  };

  const handleEditPage = (page: CustomPage) => {
    setEditingPage(page);
    setPageForm({
      name: page.name,
      slug: page.slug,
      content: page.content,
      isEmbeddable: page.isEmbeddable,
      embedSettings: page.embedSettings || {
        minHeight: 400,
        maxHeight: 1200,
        allowFullscreen: true,
        responsive: true
      }
    });
    setNewPage(true);
  };

  const handleDeletePage = (pageId: string) => {
    if (window.confirm('Are you sure you want to delete this page?')) {
      setCustomPages(prev => prev.filter(p => p.id !== pageId));
    }
  };

  const getEmbedCode = (page: CustomPage) => {
    return `<iframe 
  src="${window.location.origin}/public/tournament/${tournament?.id}/page/${page.slug}"
  width="100%" 
  height="${page.embedSettings?.maxHeight || 800}" 
  frameborder="0" 
  allowfullscreen="${page.embedSettings?.allowFullscreen}">
</iframe>`;
  };

  const tabs = [
    { id: 'overlay', label: 'Overlay Settings', icon: Monitor },
    { id: 'pages', label: 'Custom Pages', icon: FileText },
    { id: 'embed', label: 'Embed Codes', icon: Code }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Eye className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Public View Customization</h2>
              <p className="text-sm text-gray-500">Manage how your tournament appears to the public</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overlay' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-blue-600" />
                  Display Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'showHeader', label: 'Show Header' },
                    { key: 'showFooter', label: 'Show Footer' },
                    { key: 'showBreadcrumbs', label: 'Show Breadcrumbs' },
                    { key: 'showNavigation', label: 'Show Navigation' },
                    { key: 'showSearch', label: 'Show Search' },
                    { key: 'showStats', label: 'Show Statistics' },
                  ].map(setting => (
                    <label key={setting.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={overlayConfig[setting.key as keyof typeof overlayConfig] as boolean}
                        onChange={(e) => handleOverlayChange(setting.key, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{setting.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Palette className="h-5 w-5 mr-2 text-blue-600" />
                  Branding
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo URL
                    </label>
                    <input
                      type="text"
                      value={overlayConfig.branding.logoUrl}
                      onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'primaryColor', label: 'Primary' },
                      { key: 'secondaryColor', label: 'Secondary' },
                      { key: 'backgroundColor', label: 'Background' },
                      { key: 'textColor', label: 'Text' },
                      { key: 'accentColor', label: 'Accent' },
                    ].map(color => (
                      <div key={color.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {color.label}
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={overlayConfig.branding[color.key as keyof typeof overlayConfig.branding] as string}
                            onChange={(e) => handleBrandingChange(color.key, e.target.value)}
                            className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={overlayConfig.branding[color.key as keyof typeof overlayConfig.branding] as string}
                            onChange={(e) => handleBrandingChange(color.key, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Code className="h-5 w-5 mr-2 text-blue-600" />
                  Custom Code
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom CSS
                    </label>
                    <textarea
                      value={overlayConfig.customCSS}
                      onChange={(e) => handleOverlayChange('customCSS', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="/* Your custom CSS */"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom JavaScript
                    </label>
                    <textarea
                      value={overlayConfig.customJS}
                      onChange={(e) => handleOverlayChange('customJS', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="// Your custom JavaScript"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Custom Pages</h3>
                <button
                  onClick={handleAddPage}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Page</span>
                </button>
              </div>

              {newPage && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Page Name
                      </label>
                      <input
                        type="text"
                        value={pageForm.name}
                        onChange={(e) => setPageForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="My Custom Page"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={pageForm.slug}
                        onChange={(e) => setPageForm(prev => ({ ...prev, slug: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="my-custom-page"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Content (HTML)
                    </label>
                    <textarea
                      value={pageForm.content}
                      onChange={(e) => setPageForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="<div>Your custom HTML content</div>"
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={pageForm.isEmbeddable}
                        onChange={(e) => setPageForm(prev => ({ ...prev, isEmbeddable: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Allow Embedding</span>
                    </label>
                  </div>

                  {pageForm.isEmbeddable && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Height (px)
                        </label>
                        <input
                          type="number"
                          value={pageForm.embedSettings.minHeight}
                          onChange={(e) => setPageForm(prev => ({ 
                            ...prev, 
                            embedSettings: { ...prev.embedSettings, minHeight: parseInt(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Height (px)
                        </label>
                        <input
                          type="number"
                          value={pageForm.embedSettings.maxHeight}
                          onChange={(e) => setPageForm(prev => ({ 
                            ...prev, 
                            embedSettings: { ...prev.embedSettings, maxHeight: parseInt(e.target.value) }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSavePage}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      <span>Save Page</span>
                    </button>
                    <button
                      onClick={() => {
                        setNewPage(false);
                        setEditingPage(null);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customPages.map(page => (
                  <div key={page.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{page.name}</h4>
                        <p className="text-sm text-gray-500">/{page.slug}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditPage(page)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeletePage(page.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {page.isEmbeddable && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Globe className="h-3 w-3 mr-1" />
                          Embeddable
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Use the embed codes below to integrate tournament content into your website or application.
                </p>
              </div>

              <div className="space-y-4">
                {customPages
                  .filter(page => page.isEmbeddable)
                  .map(page => (
                    <div key={page.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{page.name}</h4>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getEmbedCode(page));
                            alert('Embed code copied to clipboard!');
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Copy
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={getEmbedCode(page)}
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white font-mono text-sm"
                      />
                    </div>
                  ))}
              </div>

              {customPages.filter(page => page.isEmbeddable).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No embeddable pages yet.</p>
                  <p className="text-sm mt-2">Create custom pages and enable embedding to get embed codes here.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Tournament: {tournament?.name}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicViewCustomization;

