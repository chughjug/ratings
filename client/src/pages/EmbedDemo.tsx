import React, { useState } from 'react';
import { BrandingProvider } from '../contexts/BrandingContext';
import EmbeddableTournament from '../components/EmbeddableTournament';
import { Copy, Check, Download, Code } from 'lucide-react';

const EmbedDemo: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const [tournamentId, setTournamentId] = useState('demo-tournament');
  const [organizationId, setOrganizationId] = useState('demo-org');
  const [width, setWidth] = useState('100%');
  const [height, setHeight] = useState(600);
  const [allowFullscreen, setAllowFullscreen] = useState(true);
  const [allowResize, setAllowResize] = useState(true);
  const [responsive, setResponsive] = useState(true);

  // Theme customization
  const [theme, setTheme] = useState({
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    accentColor: '#f59e0b',
    borderColor: '#e5e7eb',
    hoverColor: '#f3f4f6',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    gradientColors: ['#3b82f6', '#1d4ed8'],
    borderRadius: '0.5rem',
    spacing: '1rem',
  });

  // Branding customization
  const [branding, setBranding] = useState({
    logoUrl: '',
    headerText: 'Chess Tournament',
    tagline: 'Professional chess tournament management',
    customFont: '',
    logoPosition: 'left' as const,
    logoSize: 'medium' as const,
  });

  // Layout customization
  const [layout, setLayout] = useState({
    headerStyle: 'default' as const,
    cardStyle: 'default' as const,
    showStats: true,
    showSocialLinks: true,
    showSearch: true,
    showFilters: true,
    gridColumns: 3,
    animationStyle: 'fade' as const,
  });

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateEmbedCode = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    
    params.set('embedded', 'true');
    if (organizationId) params.set('org', organizationId);
    
    // Add theme parameters
    Object.entries(theme).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(`theme_${key}`, String(value));
      }
    });
    
    // Add branding parameters
    Object.entries(branding).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(`branding_${key}`, String(value));
      }
    });
    
    // Add layout parameters
    Object.entries(layout).forEach(([key, value]) => {
      if (value !== undefined) {
        params.set(`layout_${key}`, String(value));
      }
    });
    
    return `<iframe 
  src="${baseUrl}/public/tournament/${tournamentId}?${params.toString()}"
  width="${width}" 
  height="${height}" 
  frameborder="0" 
  ${allowFullscreen ? 'allowfullscreen' : ''}>
</iframe>`;
  };

  const generateReactCode = () => {
    return `import EmbeddableTournament from './components/EmbeddableTournament';

<EmbeddableTournament
  tournamentId="${tournamentId}"
  organizationId="${organizationId}"
  width="${width}"
  height={${height}}
  allowFullscreen={${allowFullscreen}}
  allowResize={${allowResize}}
  responsive={${responsive}}
  theme={${JSON.stringify(theme, null, 2)}}
  branding={${JSON.stringify(branding, null, 2)}}
  layout={${JSON.stringify(layout, null, 2)}}
/>`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Embeddable Tournament Demo</h1>
          <p className="mt-2 text-gray-600">
            Customize and embed chess tournament pages on your website.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tournament ID
                  </label>
                  <input
                    type="text"
                    value={tournamentId}
                    onChange={(e) => setTournamentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization ID
                  </label>
                  <input
                    type="text"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Width
                    </label>
                    <input
                      type="text"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={allowFullscreen}
                      onChange={(e) => setAllowFullscreen(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Fullscreen</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={allowResize}
                      onChange={(e) => setAllowResize(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Resize</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={responsive}
                      onChange={(e) => setResponsive(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Responsive</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Theme Customization */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme Colors</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={theme.secondaryColor}
                      onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.secondaryColor}
                      onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.backgroundColor}
                      onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={theme.textColor}
                      onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.textColor}
                      onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Branding Customization */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Header Text
                  </label>
                  <input
                    type="text"
                    value={branding.headerText}
                    onChange={(e) => setBranding({ ...branding, headerText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={branding.tagline}
                    onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={branding.logoUrl}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview and Code Panel */}
          <div className="space-y-6">
            {/* Live Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <EmbeddableTournament
                  tournamentId={tournamentId}
                  organizationId={organizationId}
                  width={width}
                  height={height}
                  allowFullscreen={allowFullscreen}
                  allowResize={allowResize}
                  responsive={responsive}
                  theme={theme}
                  branding={branding}
                  layout={layout}
                />
              </div>
            </div>

            {/* Embed Code */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Embed Code</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(generateEmbedCode(), 'html')}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {copied === 'html' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied === 'html' ? 'Copied!' : 'Copy HTML'}</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(generateReactCode(), 'react')}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {copied === 'react' ? <Check className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                    <span>{copied === 'react' ? 'Copied!' : 'Copy React'}</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">HTML/JavaScript</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">React Component</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <code>{generateReactCode()}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Fully customizable theme and branding</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Responsive design for all devices</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Real-time tournament updates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Embeddable iframe with security</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Custom CSS and JavaScript support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>SEO optimized with meta tags</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbedDemo;
