import React, { useState } from 'react';
import { 
  Palette, 
  Type, 
  Layout, 
  Globe, 
  Users, 
  Eye, 
  Settings, 
  Code, 
  Image, 
  Video, 
  MapPin, 
  Clock, 
  BarChart3, 
  MessageSquare,
  Upload,
  Download,
  Copy,
  Trash2,
  Edit,
  Plus,
  Save,
  Eye as PreviewIcon
} from 'lucide-react';

interface AdvancedCustomizationProps {
  organization: any;
  onSave: (customization: any) => void;
  onPreview: (customization: any) => void;
}

interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  category: 'theme' | 'layout' | 'branding' | 'complete';
  preview: string;
  settings: any;
  isPublic: boolean;
  downloads: number;
  rating: number;
}

const AdvancedCustomization: React.FC<AdvancedCustomizationProps> = ({
  organization,
  onSave,
  onPreview
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'css' | 'fonts' | 'assets' | 'export'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<CustomTemplate | null>(null);
  const [customCSS, setCustomCSS] = useState('');
  const [customFonts, setCustomFonts] = useState<any[]>([]);
  const [uploadedAssets, setUploadedAssets] = useState<any[]>([]);

  const templates: CustomTemplate[] = [
    {
      id: '1',
      name: 'Chess Master Pro',
      description: 'Professional chess tournament theme with elegant typography',
      category: 'complete',
      preview: '/api/preview/chess-master-pro',
      settings: {
        theme: { primaryColor: '#1a1a1a', secondaryColor: '#f0f0f0' },
        branding: { customFont: 'Playfair Display' },
        layout: { headerStyle: 'hero', cardStyle: 'elevated' }
      },
      isPublic: true,
      downloads: 1247,
      rating: 4.8
    },
    {
      id: '2',
      name: 'Modern Minimal',
      description: 'Clean and minimal design focused on content',
      category: 'layout',
      preview: '/api/preview/modern-minimal',
      settings: {
        layout: { headerStyle: 'minimal', cardStyle: 'minimal' },
        theme: { spacing: '24px', borderRadius: '4px' }
      },
      isPublic: true,
      downloads: 892,
      rating: 4.6
    },
    {
      id: '3',
      name: 'Classic Tournament',
      description: 'Traditional chess tournament styling',
      category: 'theme',
      preview: '/api/preview/classic-tournament',
      settings: {
        theme: { primaryColor: '#8B4513', secondaryColor: '#F5F5DC' },
        branding: { customFont: 'Times New Roman' }
      },
      isPublic: true,
      downloads: 654,
      rating: 4.4
    }
  ];

  const handleTemplateSelect = (template: CustomTemplate) => {
    setSelectedTemplate(template);
  };

  const handleTemplateApply = () => {
    if (selectedTemplate) {
      onSave(selectedTemplate.settings);
    }
  };

  const handleAssetUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newAssets = files.map(file => ({
      id: Date.now().toString(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString()
    }));
    setUploadedAssets(prev => [...prev, ...newAssets]);
  };

  const handleAssetDelete = (assetId: string) => {
    setUploadedAssets(prev => prev.filter(asset => asset.id !== assetId));
  };

  const tabs = [
    { id: 'templates', label: 'Templates', icon: Layout },
    { id: 'css', label: 'Custom CSS', icon: Code },
    { id: 'fonts', label: 'Fonts', icon: Type },
    { id: 'assets', label: 'Assets', icon: Image },
    { id: 'export', label: 'Export/Import', icon: Download }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Advanced Customization</h2>
          <p className="text-gray-600 mt-1">
            Advanced customization options for your organization
          </p>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Custom Templates</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  <Plus className="h-4 w-4 mr-2 inline" />
                  Create Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="aspect-video bg-gray-100 rounded mb-4 flex items-center justify-center">
                      <PreviewIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="capitalize">{template.category}</span>
                      <div className="flex items-center space-x-2">
                        <span>{template.rating}★</span>
                        <span>{template.downloads} downloads</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTemplate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900">{selectedTemplate.name}</h4>
                      <p className="text-sm text-blue-700">{selectedTemplate.description}</p>
                    </div>
                    <button
                      onClick={handleTemplateApply}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Apply Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'css' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Custom CSS Editor</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom CSS Code
                  </label>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                      <Copy className="h-4 w-4 mr-1 inline" />
                      Copy
                    </button>
                    <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                      <PreviewIcon className="h-4 w-4 mr-1 inline" />
                      Preview
                    </button>
                  </div>
                </div>
                
                <textarea
                  value={customCSS}
                  onChange={(e) => setCustomCSS(e.target.value)}
                  rows={20}
                  placeholder="/* Enter your custom CSS here */&#10;.custom-header {&#10;  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);&#10;  color: white;&#10;  padding: 2rem;&#10;  text-align: center;&#10;}&#10;&#10;.custom-card {&#10;  border-radius: 12px;&#10;  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);&#10;  transition: transform 0.2s ease;&#10;}&#10;&#10;.custom-card:hover {&#10;  transform: translateY(-2px);&#10;}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">CSS Variables Available</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <code className="bg-white px-2 py-1 rounded">--primary-color</code>
                    <code className="bg-white px-2 py-1 rounded">--secondary-color</code>
                    <code className="bg-white px-2 py-1 rounded">--background-color</code>
                    <code className="bg-white px-2 py-1 rounded">--text-color</code>
                    <code className="bg-white px-2 py-1 rounded">--border-radius</code>
                    <code className="bg-white px-2 py-1 rounded">--spacing</code>
                    <code className="bg-white px-2 py-1 rounded">--font-family</code>
                    <code className="bg-white px-2 py-1 rounded">--box-shadow</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fonts' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Custom Fonts</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font URL (Google Fonts, etc.)
                  </label>
                  <input
                    type="url"
                    placeholder="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Family Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your Custom Font"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Upload Custom Font Files</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">Drop font files here or click to upload</p>
                  <p className="text-sm text-gray-500">Supports .woff, .woff2, .ttf, .otf files</p>
                  <input
                    type="file"
                    multiple
                    accept=".woff,.woff2,.ttf,.otf"
                    className="hidden"
                    id="font-upload"
                  />
                  <label
                    htmlFor="font-upload"
                    className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Choose Files
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Asset Library</h3>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleAssetUpload}
                  className="hidden"
                  id="asset-upload"
                />
                <label
                  htmlFor="asset-upload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4 mr-2 inline" />
                  Upload Assets
                </label>
              </div>

              {uploadedAssets.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {uploadedAssets.map((asset) => (
                    <div key={asset.id} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        {asset.type.startsWith('image/') ? (
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <div className="flex space-x-2">
                          <button className="p-2 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30 transition-colors">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAssetDelete(asset.id)}
                            className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">{asset.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No assets uploaded yet</p>
                  <p className="text-sm text-gray-500">Upload images and videos to use in your customizations</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Export & Import</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Export Configuration</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Download your current customization settings as a JSON file
                  </p>
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    <Download className="h-4 w-4 mr-2 inline" />
                    Export Settings
                  </button>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Import Configuration</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a JSON file to restore customization settings
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    id="config-upload"
                  />
                  <label
                    htmlFor="config-upload"
                    className="w-full inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer text-center"
                  >
                    <Upload className="h-4 w-4 mr-2 inline" />
                    Import Settings
                  </label>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Backup Recommendations</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Export your settings before making major changes</li>
                  <li>• Keep backups of custom CSS and uploaded assets</li>
                  <li>• Test imported configurations in a preview environment first</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Advanced customization features
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => onPreview({})}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <PreviewIcon className="h-4 w-4 mr-2 inline" />
              Preview
            </button>
            <button
              onClick={() => onSave({})}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCustomization;
