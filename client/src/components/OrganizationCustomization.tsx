import React, { useState } from 'react';
import { 
  Palette, 
  Type, 
  Image, 
  Layout, 
  Globe, 
  Calendar, 
  Users, 
  Trophy,
  Settings,
  Eye,
  Save,
  Upload,
  X,
  Edit
} from 'lucide-react';

interface OrganizationCustomizationProps {
  organization: any;
  onSave: (customization: any) => void;
  onPreview: (customization: any) => void;
  isEditing?: boolean;
}

interface CustomizationSettings {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderColor: string;
    hoverColor: string;
    shadowColor: string;
    gradientColors: string[];
    borderRadius: string;
    spacing: string;
  };
  branding: {
    logoUrl: string;
    faviconUrl: string;
    customFont: string;
    headerText: string;
    tagline: string;
    customCss: string;
    customFontUrl: string;
    logoPosition: 'left' | 'center' | 'right';
    logoSize: 'small' | 'medium' | 'large';
  };
  layout: {
    headerStyle: 'default' | 'minimal' | 'hero' | 'sidebar' | 'floating';
    sidebarPosition: 'left' | 'right' | 'none';
    cardStyle: 'default' | 'modern' | 'classic' | 'minimal' | 'elevated';
    showStats: boolean;
    showSocialLinks: boolean;
    showBreadcrumbs: boolean;
    showSearch: boolean;
    showFilters: boolean;
    gridColumns: number;
    animationStyle: 'none' | 'fade' | 'slide' | 'scale';
  };
  content: {
    showAnnouncements: boolean;
    showCalendar: boolean;
    showNews: boolean;
    showContactInfo: boolean;
    customFooter: string;
    welcomeMessage: string;
    aboutSection: string;
    customWidgets: CustomWidget[];
  };
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
    discord: string;
    linkedin: string;
    twitch: string;
    tiktok: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImage: string;
    customHeadHtml: string;
    customBodyHtml: string;
    robotsIndex: boolean;
    canonicalUrl: string;
  };
  advanced: {
    customDomain: string;
    analyticsId: string;
    trackingCode: string;
    customScripts: string;
    enableDarkMode: boolean;
    enableRtl: boolean;
    enablePwa: boolean;
    customManifest: string;
  };
}

interface CustomWidget {
  id: string;
  type: 'text' | 'image' | 'video' | 'map' | 'countdown' | 'stats' | 'testimonial';
  title: string;
  content: string;
  position: 'header' | 'sidebar' | 'footer' | 'content';
  order: number;
  settings: any;
}

const OrganizationCustomization: React.FC<OrganizationCustomizationProps> = ({
  organization,
  onSave,
  onPreview,
  isEditing = false
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'branding' | 'layout' | 'content' | 'social' | 'seo' | 'advanced' | 'widgets'>('theme');
  const [customization, setCustomization] = useState<CustomizationSettings>({
    theme: {
      primaryColor: organization?.settings?.theme?.primaryColor || '#3B82F6',
      secondaryColor: organization?.settings?.theme?.secondaryColor || '#1E40AF',
      backgroundColor: organization?.settings?.theme?.backgroundColor || '#FFFFFF',
      textColor: organization?.settings?.theme?.textColor || '#1F2937',
      accentColor: organization?.settings?.theme?.accentColor || '#F59E0B',
      borderColor: organization?.settings?.theme?.borderColor || '#E5E7EB',
      hoverColor: organization?.settings?.theme?.hoverColor || '#F3F4F6',
      shadowColor: organization?.settings?.theme?.shadowColor || '#00000010',
      gradientColors: organization?.settings?.theme?.gradientColors || ['#3B82F6', '#1E40AF'],
      borderRadius: organization?.settings?.theme?.borderRadius || '8px',
      spacing: organization?.settings?.theme?.spacing || '16px'
    },
    branding: {
      logoUrl: organization?.logoUrl || '',
      faviconUrl: organization?.settings?.branding?.faviconUrl || '',
      customFont: organization?.settings?.branding?.customFont || 'Inter',
      headerText: organization?.settings?.branding?.headerText || organization?.name || '',
      tagline: organization?.settings?.branding?.tagline || '',
      customCss: organization?.settings?.branding?.customCss || '',
      customFontUrl: organization?.settings?.branding?.customFontUrl || '',
      logoPosition: organization?.settings?.branding?.logoPosition || 'left',
      logoSize: organization?.settings?.branding?.logoSize || 'medium'
    },
    layout: {
      headerStyle: organization?.settings?.layout?.headerStyle || 'default',
      sidebarPosition: organization?.settings?.layout?.sidebarPosition || 'none',
      cardStyle: organization?.settings?.layout?.cardStyle || 'default',
      showStats: organization?.settings?.layout?.showStats !== false,
      showSocialLinks: organization?.settings?.layout?.showSocialLinks !== false,
      showBreadcrumbs: organization?.settings?.layout?.showBreadcrumbs !== false,
      showSearch: organization?.settings?.layout?.showSearch !== false,
      showFilters: organization?.settings?.layout?.showFilters !== false,
      gridColumns: organization?.settings?.layout?.gridColumns || 3,
      animationStyle: organization?.settings?.layout?.animationStyle || 'fade'
    },
    content: {
      showAnnouncements: organization?.settings?.content?.showAnnouncements !== false,
      showCalendar: organization?.settings?.content?.showCalendar !== false,
      showNews: organization?.settings?.content?.showNews !== false,
      showContactInfo: organization?.settings?.content?.showContactInfo !== false,
      customFooter: organization?.settings?.content?.customFooter || '',
      welcomeMessage: organization?.settings?.content?.welcomeMessage || '',
      aboutSection: organization?.settings?.content?.aboutSection || '',
      customWidgets: organization?.settings?.content?.customWidgets || []
    },
    social: {
      facebook: organization?.settings?.social?.facebook || '',
      twitter: organization?.settings?.social?.twitter || '',
      instagram: organization?.settings?.social?.instagram || '',
      youtube: organization?.settings?.social?.youtube || '',
      discord: organization?.settings?.social?.discord || '',
      linkedin: organization?.settings?.social?.linkedin || '',
      twitch: organization?.settings?.social?.twitch || '',
      tiktok: organization?.settings?.social?.tiktok || ''
    },
    seo: {
      metaTitle: organization?.settings?.seo?.metaTitle || organization?.name || '',
      metaDescription: organization?.settings?.seo?.metaDescription || organization?.description || '',
      metaKeywords: organization?.settings?.seo?.metaKeywords || '',
      ogImage: organization?.settings?.seo?.ogImage || organization?.logoUrl || '',
      customHeadHtml: organization?.settings?.seo?.customHeadHtml || '',
      customBodyHtml: organization?.settings?.seo?.customBodyHtml || '',
      robotsIndex: organization?.settings?.seo?.robotsIndex !== false,
      canonicalUrl: organization?.settings?.seo?.canonicalUrl || ''
    },
    advanced: {
      customDomain: organization?.settings?.advanced?.customDomain || '',
      analyticsId: organization?.settings?.advanced?.analyticsId || '',
      trackingCode: organization?.settings?.advanced?.trackingCode || '',
      customScripts: organization?.settings?.advanced?.customScripts || '',
      enableDarkMode: organization?.settings?.advanced?.enableDarkMode || false,
      enableRtl: organization?.settings?.advanced?.enableRtl || false,
      enablePwa: organization?.settings?.advanced?.enablePwa || false,
      customManifest: organization?.settings?.advanced?.customManifest || ''
    }
  });

  const handleColorChange = (colorType: keyof CustomizationSettings['theme'], color: string) => {
    setCustomization(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [colorType]: color
      }
    }));
  };

  const handleBrandingChange = (field: keyof CustomizationSettings['branding'], value: string) => {
    setCustomization(prev => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: value
      }
    }));
  };

  const handleLayoutChange = (field: keyof CustomizationSettings['layout'], brand: any) => {
    setCustomization(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [field]: brand
      }
    }));
  };

  const handleContentChange = (field: keyof CustomizationSettings['content'], value: any) => {
    setCustomization(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [field]: value
      }
    }));
  };

  const handleSocialChange = (platform: keyof CustomizationSettings['social'], url: string) => {
    setCustomization(prev => ({
      ...prev,
      social: {
        ...prev.social,
        [platform]: url
      }
    }));
  };

  const handleSave = () => {
    onSave(customization);
  };

  const handlePreview = () => {
    onPreview(customization);
  };

  const tabs = [
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'branding', label: 'Branding', icon: Type },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'content', label: 'Content', icon: Globe },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'seo', label: 'SEO', icon: Eye },
    { id: 'widgets', label: 'Widgets', icon: Settings },
    { id: 'advanced', label: 'Advanced', icon: Settings }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Organization Customization</h2>
              <p className="text-gray-600 mt-1">Customize your organization's public appearance</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handlePreview}
                className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </button>
              {isEditing && (
                <button
                  onClick={handleSave}
                  className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'theme' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Theme Colors</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={customization.theme.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customization.theme.primaryColor}
                      onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={customization.theme.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customization.theme.secondaryColor}
                      onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={customization.theme.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customization.theme.backgroundColor}
                      onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={customization.theme.textColor}
                      onChange={(e) => handleColorChange('textColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customization.theme.textColor}
                      onChange={(e) => handleColorChange('textColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={customization.theme.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customization.theme.accentColor}
                      onChange={(e) => handleColorChange('accentColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Border Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={customization.theme.borderColor}
                      onChange={(e) => handleColorChange('borderColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customization.theme.borderColor}
                      onChange={(e) => handleColorChange('borderColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hover Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={customization.theme.hoverColor}
                      onChange={(e) => handleColorChange('hoverColor', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={customization.theme.hoverColor}
                      onChange={(e) => handleColorChange('hoverColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Border Radius
                  </label>
                  <select
                    value={customization.theme.borderRadius}
                    onChange={(e) => handleColorChange('borderRadius', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0px">No Radius</option>
                    <option value="4px">Small (4px)</option>
                    <option value="8px">Medium (8px)</option>
                    <option value="12px">Large (12px)</option>
                    <option value="16px">Extra Large (16px)</option>
                    <option value="50%">Fully Rounded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spacing
                  </label>
                  <select
                    value={customization.theme.spacing}
                    onChange={(e) => handleColorChange('spacing', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="8px">Compact (8px)</option>
                    <option value="12px">Small (12px)</option>
                    <option value="16px">Medium (16px)</option>
                    <option value="20px">Large (20px)</option>
                    <option value="24px">Extra Large (24px)</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
                <div 
                  className="p-4 rounded-lg"
                  style={{ 
                    backgroundColor: customization.theme.backgroundColor,
                    color: customization.theme.textColor
                  }}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-8 h-8 rounded"
                      style={{ backgroundColor: customization.theme.primaryColor }}
                    ></div>
                    <span className="font-semibold">Organization Name</span>
                  </div>
                  <p className="text-sm opacity-75">Sample text with your chosen colors</p>
                  <button 
                    className="mt-3 px-4 py-2 rounded text-white text-sm"
                    style={{ backgroundColor: customization.theme.primaryColor }}
                  >
                    Sample Button
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Branding & Identity</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={customization.branding.logoUrl}
                    onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {customization.branding.logoUrl && (
                    <div className="mt-2">
                      <img
                        src={customization.branding.logoUrl}
                        alt="Logo preview"
                        className="h-16 w-auto rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Favicon URL
                  </label>
                  <input
                    type="url"
                    value={customization.branding.faviconUrl}
                    onChange={(e) => handleBrandingChange('faviconUrl', e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Font
                  </label>
                  <select
                    value={customization.branding.customFont}
                    onChange={(e) => handleBrandingChange('customFont', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Montserrat">Montserrat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header Text
                  </label>
                  <input
                    type="text"
                    value={customization.branding.headerText}
                    onChange={(e) => handleBrandingChange('headerText', e.target.value)}
                    placeholder="Organization Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={customization.branding.tagline}
                    onChange={(e) => handleBrandingChange('tagline', e.target.value)}
                    placeholder="Your organization's tagline"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Font URL
                  </label>
                  <input
                    type="url"
                    value={customization.branding.customFontUrl}
                    onChange={(e) => handleBrandingChange('customFontUrl', e.target.value)}
                    placeholder="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">URL for custom font from Google Fonts or other providers</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo Position
                  </label>
                  <select
                    value={customization.branding.logoPosition}
                    onChange={(e) => handleBrandingChange('logoPosition', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo Size
                  </label>
                  <select
                    value={customization.branding.logoSize}
                    onChange={(e) => handleBrandingChange('logoSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="small">Small (32px)</option>
                    <option value="medium">Medium (48px)</option>
                    <option value="large">Large (64px)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom CSS
                  </label>
                  <textarea
                    value={customization.branding.customCss}
                    onChange={(e) => handleBrandingChange('customCss', e.target.value)}
                    rows={6}
                    placeholder="/* Custom CSS styles */&#10;.custom-header {&#10;  font-weight: bold;&#10;  color: #your-color;&#10;}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Custom CSS to override default styles</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Layout & Design</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header Style
                  </label>
                  <select
                    value={customization.layout.headerStyle}
                    onChange={(e) => handleLayoutChange('headerStyle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="default">Default</option>
                    <option value="minimal">Minimal</option>
                    <option value="hero">Hero</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="floating">Floating</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Style
                  </label>
                  <select
                    value={customization.layout.cardStyle}
                    onChange={(e) => handleLayoutChange('cardStyle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="default">Default</option>
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                    <option value="elevated">Elevated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sidebar Position
                  </label>
                  <select
                    value={customization.layout.sidebarPosition}
                    onChange={(e) => handleLayoutChange('sidebarPosition', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grid Columns
                  </label>
                  <select
                    value={customization.layout.gridColumns}
                    onChange={(e) => handleLayoutChange('gridColumns', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 Column</option>
                    <option value={2}>2 Columns</option>
                    <option value={3}>3 Columns</option>
                    <option value={4}>4 Columns</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Animation Style
                  </label>
                  <select
                    value={customization.layout.animationStyle}
                    onChange={(e) => handleLayoutChange('animationStyle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="scale">Scale</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showStats"
                        checked={customization.layout.showStats}
                        onChange={(e) => handleLayoutChange('showStats', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="showStats" className="ml-2 block text-sm text-gray-900">
                        Show Statistics Dashboard
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showSocialLinks"
                        checked={customization.layout.showSocialLinks}
                        onChange={(e) => handleLayoutChange('showSocialLinks', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="showSocialLinks" className="ml-2 block text-sm text-gray-900">
                        Show Social Media Links
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showBreadcrumbs"
                        checked={customization.layout.showBreadcrumbs}
                        onChange={(e) => handleLayoutChange('showBreadcrumbs', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="showBreadcrumbs" className="ml-2 block text-sm text-gray-900">
                        Show Breadcrumb Navigation
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showSearch"
                        checked={customization.layout.showSearch}
                        onChange={(e) => handleLayoutChange('showSearch', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="showSearch" className="ml-2 block text-sm text-gray-900">
                        Show Search Bar
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showFilters"
                        checked={customization.layout.showFilters}
                        onChange={(e) => handleLayoutChange('showFilters', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="showFilters" className="ml-2 block text-sm text-gray-900">
                        Show Filter Options
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Content Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showAnnouncements"
                    checked={customization.content.showAnnouncements}
                    onChange={(e) => handleContentChange('showAnnouncements', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showAnnouncements" className="ml-2 block text-sm text-gray-900">
                    Show Announcements Section
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showCalendar"
                    checked={customization.content.showCalendar}
                    onChange={(e) => handleContentChange('showCalendar', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showCalendar" className="ml-2 block text-sm text-gray-900">
                    Show Tournament Calendar
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showNews"
                    checked={customization.content.showNews}
                    onChange={(e) => handleContentChange('showNews', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showNews" className="ml-2 block text-sm text-gray-900">
                    Show News Section
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showContactInfo"
                    checked={customization.content.showContactInfo}
                    onChange={(e) => handleContentChange('showContactInfo', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showContactInfo" className="ml-2 block text-sm text-gray-900">
                    Show Contact Information
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={customization.content.welcomeMessage}
                  onChange={(e) => handleContentChange('welcomeMessage', e.target.value)}
                  rows={3}
                  placeholder="Welcome message displayed on the homepage..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  About Section
                </label>
                <textarea
                  value={customization.content.aboutSection}
                  onChange={(e) => handleContentChange('aboutSection', e.target.value)}
                  rows={4}
                  placeholder="About section content describing your organization..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Footer Text
                </label>
                <textarea
                  value={customization.content.customFooter}
                  onChange={(e) => handleContentChange('customFooter', e.target.value)}
                  rows={3}
                  placeholder="Enter custom footer text or HTML..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">SEO & Meta Tags</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={customization.seo.metaTitle}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      seo: { ...prev.seo, metaTitle: e.target.value }
                    }))}
                    placeholder="Your organization's page title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 50-60 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={customization.seo.metaDescription}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      seo: { ...prev.seo, metaDescription: e.target.value }
                    }))}
                    rows={3}
                    placeholder="Describe your organization for search engines"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Keywords
                  </label>
                  <input
                    type="text"
                    value={customization.seo.metaKeywords}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      seo: { ...prev.seo, metaKeywords: e.target.value }
                    }))}
                    placeholder="chess, tournament, organization, competitions"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated keywords</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Open Graph Image URL
                  </label>
                  <input
                    type="url"
                    value={customization.seo.ogImage}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      seo: { ...prev.seo, ogImage: e.target.value }
                    }))}
                    placeholder="https://example.com/og-image.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Image for social media sharing (1200x630px recommended)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Canonical URL
                  </label>
                  <input
                    type="url"
                    value={customization.seo.canonicalUrl}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      seo: { ...prev.seo, canonicalUrl: e.target.value }
                    }))}
                    placeholder="https://yourdomain.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Head HTML
                  </label>
                  <textarea
                    value={customization.seo.customHeadHtml}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      seo: { ...prev.seo, customHeadHtml: e.target.value }
                    }))}
                    rows={4}
                    placeholder="<!-- Custom meta tags, scripts, etc. -->"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Body HTML
                  </label>
                  <textarea
                    value={customization.seo.customBodyHtml}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      seo: { ...prev.seo, customBodyHtml: e.target.value }
                    }))}
                    rows={4}
                    placeholder="<!-- Custom scripts, tracking codes, etc. -->"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="robotsIndex"
                    checked={customization.seo.robotsIndex}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      seo: { ...prev.seo, robotsIndex: e.target.checked }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="robotsIndex" className="ml-2 block text-sm text-gray-900">
                    Allow search engines to index this page
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Domain
                  </label>
                  <input
                    type="url"
                    value={customization.advanced.customDomain}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      advanced: { ...prev.advanced, customDomain: e.target.value }
                    }))}
                    placeholder="https://yourdomain.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your custom domain for the organization page</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Analytics ID
                  </label>
                  <input
                    type="text"
                    value={customization.advanced.analyticsId}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      advanced: { ...prev.advanced, analyticsId: e.target.value }
                    }))}
                    placeholder="GA-XXXXXXXXX-X"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Tracking Code
                  </label>
                  <textarea
                    value={customization.advanced.trackingCode}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      advanced: { ...prev.advanced, trackingCode: e.target.value }
                    }))}
                    rows={4}
                    placeholder="<!-- Google Analytics, Facebook Pixel, etc. -->"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Scripts
                  </label>
                  <textarea
                    value={customization.advanced.customScripts}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      advanced: { ...prev.advanced, customScripts: e.target.value }
                    }))}
                    rows={4}
                    placeholder="// Custom JavaScript code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Feature Toggles</h4>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableDarkMode"
                      checked={customization.advanced.enableDarkMode}
                      onChange={(e) => setCustomization(prev => ({
                        ...prev,
                        advanced: { ...prev.advanced, enableDarkMode: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableDarkMode" className="ml-2 block text-sm text-gray-900">
                      Enable Dark Mode Toggle
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableRtl"
                      checked={customization.advanced.enableRtl}
                      onChange={(e) => setCustomization(prev => ({
                        ...prev,
                        advanced: { ...prev.advanced, enableRtl: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableRtl" className="ml-2 block text-sm text-gray-900">
                      Enable Right-to-Left Support
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enablePwa"
                      checked={customization.advanced.enablePwa}
                      onChange={(e) => setCustomization(prev => ({
                        ...prev,
                        advanced: { ...prev.advanced, enablePwa: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enablePwa" className="ml-2 block text-sm text-gray-900">
                      Enable Progressive Web App Features
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom PWA Manifest
                  </label>
                  <textarea
                    value={customization.advanced.customManifest}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      advanced: { ...prev.advanced, customManifest: e.target.value }
                    }))}
                    rows={6}
                    placeholder='{"name": "Your Organization", "short_name": "Org", ...}'
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'widgets' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Custom Widgets</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 mb-4">Add custom widgets to enhance your organization page</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['text', 'image', 'video', 'map', 'countdown', 'stats', 'testimonial'].map((widgetType) => (
                    <div key={widgetType} className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-900 capitalize mb-2">{widgetType} Widget</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {widgetType === 'text' && 'Add custom text content'}
                        {widgetType === 'image' && 'Display images or galleries'}
                        {widgetType === 'video' && 'Embed videos from YouTube/Vimeo'}
                        {widgetType === 'map' && 'Show location with Google Maps'}
                        {widgetType === 'countdown' && 'Countdown timer for events'}
                        {widgetType === 'stats' && 'Display statistics and metrics'}
                        {widgetType === 'testimonial' && 'Show testimonials and reviews'}
                      </p>
                      <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                        Add {widgetType} Widget
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {customization.content.customWidgets.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Current Widgets</h4>
                  <div className="space-y-3">
                    {customization.content.customWidgets.map((widget, index) => (
                      <div key={widget.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">{widget.title}</h5>
                            <p className="text-sm text-gray-600 capitalize">{widget.type} widget</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="p-2 text-red-400 hover:text-red-600 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Social Media Links</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook URL
                  </label>
                  <input
                    type="url"
                    value={customization.social.facebook}
                    onChange={(e) => handleSocialChange('facebook', e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twitter URL
                  </label>
                  <input
                    type="url"
                    value={customization.social.twitter}
                    onChange={(e) => handleSocialChange('twitter', e.target.value)}
                    placeholder="https://twitter.com/yourhandle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={customization.social.instagram}
                    onChange={(e) => handleSocialChange('instagram', e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={customization.social.youtube}
                    onChange={(e) => handleSocialChange('youtube', e.target.value)}
                    placeholder="https://youtube.com/c/yourchannel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discord URL
                  </label>
                  <input
                    type="url"
                    value={customization.social.discord}
                    onChange={(e) => handleSocialChange('discord', e.target.value)}
                    placeholder="https://discord.gg/yourinvite"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={customization.social.linkedin}
                    onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/your-org"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twitch URL
                  </label>
                  <input
                    type="url"
                    value={customization.social.twitch}
                    onChange={(e) => handleSocialChange('twitch', e.target.value)}
                    placeholder="https://twitch.tv/your-channel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TikTok URL
                  </label>
                  <input
                    type="url"
                    value={customization.social.tiktok}
                    onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                    placeholder="https://tiktok.com/@your-username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationCustomization;
