import React, { useEffect, useState, useRef } from 'react';
import { BrandingProvider } from '../contexts/BrandingContext';

interface EmbeddableTournamentProps {
  tournamentId: string;
  organizationId?: string;
  width?: string | number;
  height?: string | number;
  allowFullscreen?: boolean;
  allowResize?: boolean;
  responsive?: boolean;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    borderColor?: string;
    hoverColor?: string;
    shadowColor?: string;
    gradientColors?: string[];
    borderRadius?: string;
    spacing?: string;
  };
  branding?: {
    logoUrl?: string;
    faviconUrl?: string;
    customFont?: string;
    headerText?: string;
    tagline?: string;
    customCss?: string;
    customFontUrl?: string;
    logoPosition?: 'left' | 'center' | 'right';
    logoSize?: 'small' | 'medium' | 'large';
  };
  layout?: {
    headerStyle?: 'default' | 'minimal' | 'hero' | 'sidebar' | 'floating';
    sidebarPosition?: 'left' | 'right' | 'none';
    cardStyle?: 'default' | 'modern' | 'classic' | 'minimal' | 'elevated';
    showStats?: boolean;
    showSocialLinks?: boolean;
    showBreadcrumbs?: boolean;
    showSearch?: boolean;
    showFilters?: boolean;
    gridColumns?: number;
    animationStyle?: 'none' | 'fade' | 'slide' | 'scale';
  };
  content?: {
    showAnnouncements?: boolean;
    showCalendar?: boolean;
    showNews?: boolean;
    showContactInfo?: boolean;
    customFooter?: string;
    welcomeMessage?: string;
    aboutSection?: string;
  };
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    discord?: string;
    linkedin?: string;
    twitch?: string;
    tiktok?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    customHeadHtml?: string;
    customBodyHtml?: string;
    robotsIndex?: boolean;
    canonicalUrl?: string;
  };
  advanced?: {
    customDomain?: string;
    analyticsId?: string;
    trackingCode?: string;
    customScripts?: string;
    enableDarkMode?: boolean;
    enableRtl?: boolean;
    enablePwa?: boolean;
  };
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const EmbeddableTournament: React.FC<EmbeddableTournamentProps> = ({
  tournamentId,
  organizationId,
  width = '100%',
  height = 600,
  allowFullscreen = true,
  allowResize = true,
  responsive = true,
  theme,
  branding,
  layout,
  content,
  social,
  seo,
  advanced,
  className = '',
  onLoad,
  onError,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate iframe URL with parameters
  const generateIframeUrl = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    
    params.set('embedded', 'true');
    if (organizationId) params.set('org', organizationId);
    
    // Add theme parameters
    if (theme) {
      Object.entries(theme).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(`theme_${key}`, String(value));
        }
      });
    }
    
    // Add branding parameters
    if (branding) {
      Object.entries(branding).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(`branding_${key}`, String(value));
        }
      });
    }
    
    // Add layout parameters
    if (layout) {
      Object.entries(layout).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(`layout_${key}`, String(value));
        }
      });
    }
    
    // Add content parameters
    if (content) {
      Object.entries(content).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(`content_${key}`, String(value));
        }
      });
    }
    
    // Add social parameters
    if (social) {
      Object.entries(social).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(`social_${key}`, String(value));
        }
      });
    }
    
    // Add SEO parameters
    if (seo) {
      Object.entries(seo).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(`seo_${key}`, String(value));
        }
      });
    }
    
    // Add advanced parameters
    if (advanced) {
      Object.entries(advanced).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(`advanced_${key}`, String(value));
        }
      });
    }
    
    return `${baseUrl}/public/tournament/${tournamentId}?${params.toString()}`;
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    onLoad?.();
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    const error = new Error('Failed to load tournament');
    setError(error.message);
    onError?.(error);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!iframeRef.current) return;
    
    if (!isFullscreen) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      } else if ((iframeRef.current as any).webkitRequestFullscreen) {
        (iframeRef.current as any).webkitRequestFullscreen();
      } else if ((iframeRef.current as any).msRequestFullscreen) {
        (iframeRef.current as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle resize
  const handleResize = (event: React.MouseEvent) => {
    if (!allowResize || !iframeRef.current) return;
    
    const startY = event.clientY;
    const startHeight = iframeRef.current.offsetHeight;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = startHeight + (e.clientY - startY);
      iframeRef.current!.style.height = `${Math.max(200, newHeight)}px`;
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (error) {
    return (
      <div className={`border border-red-200 bg-red-50 text-red-800 p-4 rounded ${className}`}>
        <p className="font-medium">Error loading tournament</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading tournament...</p>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">
          Tournament #{tournamentId}
        </div>
        <div className="flex items-center space-x-2">
          {allowFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? '⤓' : '⤢'}
            </button>
          )}
          {allowResize && (
            <div
              className="w-4 h-4 cursor-ns-resize text-gray-500 hover:text-gray-700"
              onMouseDown={handleResize}
              title="Resize"
            >
              ⋮
            </div>
          )}
        </div>
      </div>
      
      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={generateIframeUrl()}
        width={width}
        height={height}
        frameBorder="0"
        allowFullScreen={allowFullscreen}
        className={`w-full ${responsive ? 'max-w-full' : ''}`}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        title={`Chess Tournament ${tournamentId}`}
      />
      
      {/* Resize handle */}
      {allowResize && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-gray-200 hover:bg-gray-300 transition-colors"
          onMouseDown={handleResize}
        />
      )}
    </div>
  );
};

export default EmbeddableTournament;
