import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { OrganizationSettings } from '../types';

interface BrandingState {
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
    logoUrl?: string;
    faviconUrl?: string;
    customFont?: string;
    headerText?: string;
    tagline?: string;
    customCss?: string;
    customFontUrl?: string;
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
    customFooter?: string;
    welcomeMessage?: string;
    aboutSection?: string;
    defaultTournamentInfo?: string;
    showSchedule?: boolean;
    showLocation?: boolean;
    showOfficials?: boolean;
    showRating?: boolean;
    showRegistration?: boolean;
    showStats?: boolean;
  };
  social: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    discord?: string;
    linkedin?: string;
    twitch?: string;
    tiktok?: string;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    customHeadHtml?: string;
    customBodyHtml?: string;
    robotsIndex: boolean;
    canonicalUrl?: string;
  };
  advanced: {
    customDomain?: string;
    analyticsId?: string;
    trackingCode?: string;
    customScripts?: string;
    enableDarkMode: boolean;
    enableRtl: boolean;
    enablePwa: boolean;
  };
  isEmbedded: boolean;
  embedSettings: {
    allowFullscreen: boolean;
    allowResize: boolean;
    minHeight: number;
    maxHeight: number;
    responsive: boolean;
  };
}

type BrandingAction =
  | { type: 'SET_ORGANIZATION_BRANDING'; payload: Partial<OrganizationSettings> }
  | { type: 'SET_THEME'; payload: Partial<BrandingState['theme']> }
  | { type: 'SET_BRANDING'; payload: Partial<BrandingState['branding']> }
  | { type: 'SET_LAYOUT'; payload: Partial<BrandingState['layout']> }
  | { type: 'SET_CONTENT'; payload: Partial<BrandingState['content']> }
  | { type: 'SET_SOCIAL'; payload: Partial<BrandingState['social']> }
  | { type: 'SET_SEO'; payload: Partial<BrandingState['seo']> }
  | { type: 'SET_ADVANCED'; payload: Partial<BrandingState['advanced']> }
  | { type: 'SET_EMBEDDED'; payload: boolean }
  | { type: 'SET_EMBED_SETTINGS'; payload: Partial<BrandingState['embedSettings']> }
  | { type: 'RESET_TO_DEFAULT' };

const defaultTheme = {
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
};

const defaultBranding = {
  logoPosition: 'left' as const,
  logoSize: 'medium' as const,
};

const defaultLayout = {
  headerStyle: 'default' as const,
  sidebarPosition: 'none' as const,
  cardStyle: 'default' as const,
  showStats: true,
  showSocialLinks: true,
  showBreadcrumbs: true,
  showSearch: true,
  showFilters: true,
  gridColumns: 3,
  animationStyle: 'fade' as const,
};

const defaultContent = {
  showAnnouncements: true,
  showCalendar: true,
  showNews: true,
  showContactInfo: true,
  showSchedule: true,
  showLocation: true,
  showOfficials: true,
  showRating: true,
  showRegistration: true,
  showStats: true,
};

const defaultSocial = {};

const defaultSeo = {
  robotsIndex: true,
};

const defaultAdvanced = {
  enableDarkMode: false,
  enableRtl: false,
  enablePwa: true,
};

const defaultEmbedSettings = {
  allowFullscreen: true,
  allowResize: true,
  minHeight: 400,
  maxHeight: 1200,
  responsive: true,
};

const initialState: BrandingState = {
  theme: defaultTheme,
  branding: defaultBranding,
  layout: defaultLayout,
  content: defaultContent,
  social: defaultSocial,
  seo: defaultSeo,
  advanced: defaultAdvanced,
  isEmbedded: false,
  embedSettings: defaultEmbedSettings,
};

function brandingReducer(state: BrandingState, action: BrandingAction): BrandingState {
  switch (action.type) {
    case 'SET_ORGANIZATION_BRANDING':
      return {
        ...state,
        theme: { ...state.theme, ...action.payload.theme },
        branding: { ...state.branding, ...action.payload.branding },
        layout: { ...state.layout, ...action.payload.layout },
        content: { ...state.content, ...action.payload.content },
        social: { ...state.social, ...action.payload.social },
        seo: { ...state.seo, ...action.payload.seo },
        advanced: { ...state.advanced, ...action.payload.advanced },
      };
    case 'SET_THEME':
      return { ...state, theme: { ...state.theme, ...action.payload } };
    case 'SET_BRANDING':
      return { ...state, branding: { ...state.branding, ...action.payload } };
    case 'SET_LAYOUT':
      return { ...state, layout: { ...state.layout, ...action.payload } };
    case 'SET_CONTENT':
      return { ...state, content: { ...state.content, ...action.payload } };
    case 'SET_SOCIAL':
      return { ...state, social: { ...state.social, ...action.payload } };
    case 'SET_SEO':
      return { ...state, seo: { ...state.seo, ...action.payload } };
    case 'SET_ADVANCED':
      return { ...state, advanced: { ...state.advanced, ...action.payload } };
    case 'SET_EMBEDDED':
      return { ...state, isEmbedded: action.payload };
    case 'SET_EMBED_SETTINGS':
      return { ...state, embedSettings: { ...state.embedSettings, ...action.payload } };
    case 'RESET_TO_DEFAULT':
      return initialState;
    default:
      return state;
  }
}

interface BrandingContextType {
  state: BrandingState;
  setOrganizationBranding: (settings: Partial<OrganizationSettings>) => void;
  setTheme: (theme: Partial<BrandingState['theme']>) => void;
  setBranding: (branding: Partial<BrandingState['branding']>) => void;
  setLayout: (layout: Partial<BrandingState['layout']>) => void;
  setContent: (content: Partial<BrandingState['content']>) => void;
  setSocial: (social: Partial<BrandingState['social']>) => void;
  setSeo: (seo: Partial<BrandingState['seo']>) => void;
  setAdvanced: (advanced: Partial<BrandingState['advanced']>) => void;
  setEmbedded: (embedded: boolean) => void;
  setEmbedSettings: (settings: Partial<BrandingState['embedSettings']>) => void;
  resetToDefault: () => void;
  applyCustomCSS: () => void;
  generateThemeCSS: () => string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

interface BrandingProviderProps {
  children: ReactNode;
  organizationSettings?: Partial<OrganizationSettings>;
  isEmbedded?: boolean;
  embedSettings?: Partial<BrandingState['embedSettings']>;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({
  children,
  organizationSettings,
  isEmbedded = false,
  embedSettings,
}) => {
  const [state, dispatch] = useReducer(brandingReducer, {
    ...initialState,
    isEmbedded,
    embedSettings: { ...defaultEmbedSettings, ...embedSettings },
  });

  // Apply organization settings on mount
  useEffect(() => {
    if (organizationSettings) {
      dispatch({ type: 'SET_ORGANIZATION_BRANDING', payload: organizationSettings });
    }
  }, [organizationSettings]);

  // Apply custom CSS when branding changes
  useEffect(() => {
    applyCustomCSS();
  }, [state.branding.customCss, state.theme]);

  const setOrganizationBranding = (settings: Partial<OrganizationSettings>) => {
    dispatch({ type: 'SET_ORGANIZATION_BRANDING', payload: settings });
  };

  const setTheme = (theme: Partial<BrandingState['theme']>) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const setBranding = (branding: Partial<BrandingState['branding']>) => {
    dispatch({ type: 'SET_BRANDING', payload: branding });
  };

  const setLayout = (layout: Partial<BrandingState['layout']>) => {
    dispatch({ type: 'SET_LAYOUT', payload: layout });
  };

  const setContent = (content: Partial<BrandingState['content']>) => {
    dispatch({ type: 'SET_CONTENT', payload: content });
  };

  const setSocial = (social: Partial<BrandingState['social']>) => {
    dispatch({ type: 'SET_SOCIAL', payload: social });
  };

  const setSeo = (seo: Partial<BrandingState['seo']>) => {
    dispatch({ type: 'SET_SEO', payload: seo });
  };

  const setAdvanced = (advanced: Partial<BrandingState['advanced']>) => {
    dispatch({ type: 'SET_ADVANCED', payload: advanced });
  };

  const setEmbedded = (embedded: boolean) => {
    dispatch({ type: 'SET_EMBEDDED', payload: embedded });
  };

  const setEmbedSettings = (settings: Partial<BrandingState['embedSettings']>) => {
    dispatch({ type: 'SET_EMBED_SETTINGS', payload: settings });
  };

  const resetToDefault = () => {
    dispatch({ type: 'RESET_TO_DEFAULT' });
  };

  const generateThemeCSS = (): string => {
    const { theme } = state;
    return `
      :root {
        --brand-primary: ${theme.primaryColor};
        --brand-secondary: ${theme.secondaryColor};
        --brand-background: ${theme.backgroundColor};
        --brand-text: ${theme.textColor};
        --brand-accent: ${theme.accentColor};
        --brand-border: ${theme.borderColor};
        --brand-hover: ${theme.hoverColor};
        --brand-shadow: ${theme.shadowColor};
        --brand-radius: ${theme.borderRadius};
        --brand-spacing: ${theme.spacing};
        --brand-gradient: linear-gradient(135deg, ${theme.gradientColors.join(', ')});
      }
      
      .brand-primary { color: var(--brand-primary); }
      .brand-secondary { color: var(--brand-secondary); }
      .brand-background { background-color: var(--brand-background); }
      .brand-text { color: var(--brand-text); }
      .brand-accent { color: var(--brand-accent); }
      .brand-border { border-color: var(--brand-border); }
      .brand-hover:hover { background-color: var(--brand-hover); }
      .brand-shadow { box-shadow: 0 4px 6px var(--brand-shadow); }
      .brand-radius { border-radius: var(--brand-radius); }
      .brand-gradient { background: var(--brand-gradient); }
      
      .btn-primary {
        background-color: var(--brand-primary);
        border-color: var(--brand-primary);
        color: white;
      }
      
      .btn-primary:hover {
        background-color: ${theme.primaryColor}dd;
        border-color: ${theme.primaryColor}dd;
      }
      
      .card {
        background-color: var(--brand-background);
        border: 1px solid var(--brand-border);
        border-radius: var(--brand-radius);
        box-shadow: 0 2px 4px var(--brand-shadow);
      }
      
      .text-primary { color: var(--brand-primary); }
      .bg-primary { background-color: var(--brand-primary); }
      .border-primary { border-color: var(--brand-primary); }
    `;
  };

  const applyCustomCSS = () => {
    // Remove existing custom style element
    const existingStyle = document.getElementById('branding-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Apply theme CSS
    const themeStyle = document.createElement('style');
    themeStyle.id = 'branding-theme-css';
    themeStyle.textContent = generateThemeCSS();
    document.head.appendChild(themeStyle);

    // Apply custom CSS if provided
    if (state.branding.customCss) {
      const customStyle = document.createElement('style');
      customStyle.id = 'branding-custom-css';
      customStyle.textContent = state.branding.customCss;
      document.head.appendChild(customStyle);
    }

    // Apply custom font if provided
    if (state.branding.customFont) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = state.branding.customFontUrl || `https://fonts.googleapis.com/css2?family=${state.branding.customFont.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
      document.head.appendChild(fontLink);

      const fontStyle = document.createElement('style');
      fontStyle.textContent = `
        body, .font-brand {
          font-family: '${state.branding.customFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }
      `;
      document.head.appendChild(fontStyle);
    }
  };

  const value: BrandingContextType = {
    state,
    setOrganizationBranding,
    setTheme,
    setBranding,
    setLayout,
    setContent,
    setSocial,
    setSeo,
    setAdvanced,
    setEmbedded,
    setEmbedSettings,
    resetToDefault,
    applyCustomCSS,
    generateThemeCSS,
  };

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
};

export default BrandingContext;
