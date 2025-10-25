import React, { useState, useEffect } from 'react';
import { useBranding } from '../contexts/BrandingContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { 
  Palette, 
  Image, 
  Layout, 
  Globe, 
  Share2, 
  Code, 
  Eye, 
  Save, 
  RotateCcw,
  Upload,
  Download,
  Copy,
  Check
} from 'lucide-react';
import BrandedHeader from '../components/BrandedHeader';
import BrandedFooter from '../components/BrandedFooter';
import EmbeddableTournament from '../components/EmbeddableTournament';

const OrganizationBrandingSettings: React.FC = () => {
  const { state: brandingState, setTheme, setBranding, setLayout, setContent, setSocial, setSeo, setAdvanced, resetToDefault, generateThemeCSS } = useBranding();
  const { state: organizationState, updateOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState<'theme' | 'branding' | 'layout' | 'content' | 'social' | 'seo' | 'advanced' | 'preview' | 'embed'>('theme');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const currentOrganization = organizationState.currentOrganization;

  // Save settings to organization
  const saveSettings = async () => {
    if (!currentOrganization) return;
    
    setIsSaving(true);
    try {
      const settings = {
        theme: brandingState.theme,
        branding: brandingState.branding,
        layout: brandingState.layout,
        content: brandingState.content,
        social: brandingState.social,
        seo: brandingState.seo,
        advanced: brandingState.advanced,
      };
      
      await updateOrganization(currentOrganization.id, { settings });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Generate embed code
  const generateEmbedCode = () => {
    const baseUrl = window.location.origin;
    const tournamentId = 'example-tournament-id'; // This would come from props or state
    
    return `<iframe 
  src="${baseUrl}/public/tournament/${tournamentId}?embedded=true&org=${currentOrganization?.id || ''}"
  width="100%" 
  height="600" 
  frameborder="0" 
  allowfullscreen>
</iframe>`;
  };

  // Generate CSS code
  const generateCSSCode = () => {
    return generateThemeCSS();
  };

  const tabs = [
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'branding', label: 'Branding', icon: Image },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'content', label: 'Content', icon: Globe },
    { id: 'social', label: 'Social', icon: Share2 },
    { id: 'seo', label: 'SEO', icon: Code },
    { id: 'advanced', label: 'Advanced', icon: Code },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'embed', label: 'Embed', icon: Code },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BrandedHeader
        organizationName={currentOrganization?.name}
        logoUrl={currentOrganization?.logoUrl}
        showNavigation={false}
        showSocialLinks={false}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Branding Settings</h1>
          <p className="mt-2 text-gray-600">
            Customize the appearance and branding of your public tournament pages.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
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
          </nav>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
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
                            value={brandingState.theme.primaryColor}
                            onChange={(e) => setTheme({ primaryColor: e.target.value })}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandingState.theme.primaryColor}
                            onChange={(e) => setTheme({ primaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            value={brandingState.theme.secondaryColor}
                            onChange={(e) => setTheme({ secondaryColor: e.target.value })}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandingState.theme.secondaryColor}
                            onChange={(e) => setTheme({ secondaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            value={brandingState.theme.backgroundColor}
                            onChange={(e) => setTheme({ backgroundColor: e.target.value })}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandingState.theme.backgroundColor}
                            onChange={(e) => setTheme({ backgroundColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            value={brandingState.theme.textColor}
                            onChange={(e) => setTheme({ textColor: e.target.value })}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandingState.theme.textColor}
                            onChange={(e) => setTheme({ textColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            value={brandingState.theme.accentColor}
                            onChange={(e) => setTheme({ accentColor: e.target.value })}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandingState.theme.accentColor}
                            onChange={(e) => setTheme({ accentColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            value={brandingState.theme.borderColor}
                            onChange={(e) => setTheme({ borderColor: e.target.value })}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={brandingState.theme.borderColor}
                            onChange={(e) => setTheme({ borderColor: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Border Radius
                      </label>
                      <select
                        value={brandingState.theme.borderRadius}
                        onChange={(e) => setTheme({ borderRadius: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="0">None</option>
                        <option value="0.25rem">Small</option>
                        <option value="0.5rem">Medium</option>
                        <option value="0.75rem">Large</option>
                        <option value="1rem">Extra Large</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'branding' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Branding</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Logo URL
                        </label>
                        <input
                          type="url"
                          value={brandingState.branding.logoUrl || ''}
                          onChange={(e) => setBranding({ logoUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Header Text
                        </label>
                        <input
                          type="text"
                          value={brandingState.branding.headerText || ''}
                          onChange={(e) => setBranding({ headerText: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Your Organization Name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tagline
                        </label>
                        <input
                          type="text"
                          value={brandingState.branding.tagline || ''}
                          onChange={(e) => setBranding({ tagline: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Your organization tagline"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Font
                        </label>
                        <input
                          type="text"
                          value={brandingState.branding.customFont || ''}
                          onChange={(e) => setBranding({ customFont: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Inter, Roboto, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom CSS
                        </label>
                        <textarea
                          value={brandingState.branding.customCss || ''}
                          onChange={(e) => setBranding({ customCss: e.target.value })}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          placeholder="/* Your custom CSS here */"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'layout' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Layout</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Header Style
                        </label>
                        <select
                          value={brandingState.layout.headerStyle}
                          onChange={(e) => setLayout({ headerStyle: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="default">Default</option>
                          <option value="minimal">Minimal</option>
                          <option value="hero">Hero</option>
                          <option value="floating">Floating</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Style
                        </label>
                        <select
                          value={brandingState.layout.cardStyle}
                          onChange={(e) => setLayout({ cardStyle: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          Logo Position
                        </label>
                        <select
                          value={brandingState.branding.logoPosition}
                          onChange={(e) => setBranding({ logoPosition: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          value={brandingState.branding.logoSize}
                          onChange={(e) => setBranding({ logoSize: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900">Display Options</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                          { key: 'showStats', label: 'Show Stats' },
                          { key: 'showSocialLinks', label: 'Show Social Links' },
                          { key: 'showBreadcrumbs', label: 'Show Breadcrumbs' },
                          { key: 'showSearch', label: 'Show Search' },
                          { key: 'showFilters', label: 'Show Filters' },
                        ].map((option) => (
                          <label key={option.key} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={brandingState.layout[option.key as keyof typeof brandingState.layout] as boolean}
                              onChange={(e) => setLayout({ [option.key]: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'content' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Content</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Welcome Message
                        </label>
                        <textarea
                          value={brandingState.content.welcomeMessage || ''}
                          onChange={(e) => setContent({ welcomeMessage: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Welcome to our chess tournaments..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          About Section
                        </label>
                        <textarea
                          value={brandingState.content.aboutSection || ''}
                          onChange={(e) => setContent({ aboutSection: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="About your organization..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Footer HTML
                        </label>
                        <textarea
                          value={brandingState.content.customFooter || ''}
                          onChange={(e) => setContent({ customFooter: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          placeholder="<div>Your custom footer content</div>"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'social' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Social Media</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
                        { key: 'twitter', label: 'Twitter', placeholder: 'https://twitter.com/yourhandle' },
                        { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
                        { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/yourchannel' },
                        { key: 'discord', label: 'Discord', placeholder: 'https://discord.gg/yourserver' },
                        { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourcompany' },
                        { key: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/yourchannel' },
                        { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
                      ].map((social) => (
                        <div key={social.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {social.label}
                          </label>
                          <input
                            type="url"
                            value={brandingState.social[social.key as keyof typeof brandingState.social] || ''}
                            onChange={(e) => setSocial({ [social.key]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={social.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'seo' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">SEO Settings</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Meta Title
                        </label>
                        <input
                          type="text"
                          value={brandingState.seo.metaTitle || ''}
                          onChange={(e) => setSeo({ metaTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Your Tournament Page Title"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Meta Description
                        </label>
                        <textarea
                          value={brandingState.seo.metaDescription || ''}
                          onChange={(e) => setSeo({ metaDescription: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Description of your tournament page"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Meta Keywords
                        </label>
                        <input
                          type="text"
                          value={brandingState.seo.metaKeywords || ''}
                          onChange={(e) => setSeo({ metaKeywords: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="chess, tournament, competition"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          OG Image URL
                        </label>
                        <input
                          type="url"
                          value={brandingState.seo.ogImage || ''}
                          onChange={(e) => setSeo({ ogImage: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://example.com/og-image.png"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Domain
                        </label>
                        <input
                          type="text"
                          value={brandingState.advanced.customDomain || ''}
                          onChange={(e) => setAdvanced({ customDomain: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="tournaments.yourdomain.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Analytics ID
                        </label>
                        <input
                          type="text"
                          value={brandingState.advanced.analyticsId || ''}
                          onChange={(e) => setAdvanced({ analyticsId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="GA-XXXXXXXXX-X"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Scripts
                        </label>
                        <textarea
                          value={brandingState.advanced.customScripts || ''}
                          onChange={(e) => setAdvanced({ customScripts: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          placeholder="<!-- Your custom scripts here -->"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={brandingState.advanced.enableDarkMode}
                            onChange={(e) => setAdvanced({ enableDarkMode: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Enable Dark Mode</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={brandingState.advanced.enableRtl}
                            onChange={(e) => setAdvanced({ enableRtl: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Enable RTL Support</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={brandingState.advanced.enablePwa}
                            onChange={(e) => setAdvanced({ enablePwa: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Enable PWA</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
                    <p className="text-gray-600">
                      This is a preview of how your tournament page will look with the current settings.
                    </p>
                    
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="ml-4 text-sm text-gray-600">Preview</span>
                        </div>
                      </div>
                      <div className="h-96 overflow-auto">
                        <iframe
                          src={`/public/tournament/example?embedded=true&org=${currentOrganization?.id || ''}`}
                          className="w-full h-full border-0"
                          title="Preview"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'embed' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900">Embed Code</h3>
                    <p className="text-gray-600">
                      Use this code to embed your tournament page on your website.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Basic Embed Code
                        </label>
                        <div className="relative">
                          <textarea
                            value={generateEmbedCode()}
                            readOnly
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(generateEmbedCode(), 'embed')}
                            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700"
                          >
                            {copied === 'embed' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom CSS
                        </label>
                        <div className="relative">
                          <textarea
                            value={generateCSSCode()}
                            readOnly
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(generateCSSCode(), 'css')}
                            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700"
                          >
                            {copied === 'css' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                  
                  <button
                    onClick={resetToDefault}
                    className="w-full flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset to Default</span>
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
                <div className="space-y-3">
                  <div className="p-4 border border-gray-200 rounded-md">
                    <div className="text-sm font-medium text-gray-700 mb-2">Primary Color</div>
                    <div 
                      className="w-full h-8 rounded"
                      style={{ backgroundColor: brandingState.theme.primaryColor }}
                    ></div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-md">
                    <div className="text-sm font-medium text-gray-700 mb-2">Sample Button</div>
                    <button 
                      className="px-4 py-2 rounded text-white text-sm"
                      style={{ 
                        backgroundColor: brandingState.theme.primaryColor,
                        borderRadius: brandingState.theme.borderRadius
                      }}
                    >
                      Sample Button
                    </button>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-md">
                    <div className="text-sm font-medium text-gray-700 mb-2">Sample Card</div>
                    <div 
                      className="p-3 rounded"
                      style={{ 
                        backgroundColor: brandingState.theme.backgroundColor,
                        borderColor: brandingState.theme.borderColor,
                        borderRadius: brandingState.theme.borderRadius
                      }}
                    >
                      <div className="text-sm" style={{ color: brandingState.theme.textColor }}>
                        Sample content
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BrandedFooter
        organizationName={currentOrganization?.name}
        contactEmail={currentOrganization?.contactEmail}
        contactPhone={currentOrganization?.contactPhone}
        address={currentOrganization?.address}
        website={currentOrganization?.website}
      />
    </div>
  );
};

export default OrganizationBrandingSettings;
