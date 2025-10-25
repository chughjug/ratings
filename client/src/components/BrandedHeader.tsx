import React from 'react';
import { useBranding } from '../contexts/BrandingContext';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, Clock, Globe, Menu, X } from 'lucide-react';

interface BrandedHeaderProps {
  tournamentName?: string;
  organizationName?: string;
  logoUrl?: string;
  showNavigation?: boolean;
  showSocialLinks?: boolean;
  className?: string;
}

const BrandedHeader: React.FC<BrandedHeaderProps> = ({
  tournamentName,
  organizationName,
  logoUrl,
  showNavigation = true,
  showSocialLinks = true,
  className = '',
}) => {
  const { state } = useBranding();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const {
    theme,
    branding,
    layout,
    social,
  } = state;

  const headerStyle = layout.headerStyle;
  const logoPosition = branding.logoPosition;
  const logoSize = branding.logoSize;

  const renderLogo = () => {
    const logoSrc = logoUrl || branding.logoUrl;
    const logoText = organizationName || branding.headerText || 'Chess Tournament';
    
    return (
      <Link to="/" className={`logo-brand logo-brand-${logoSize}`}>
        {logoSrc && (
          <img 
            src={logoSrc} 
            alt={logoText}
            style={{ 
              height: logoSize === 'small' ? '1.5rem' : logoSize === 'large' ? '3rem' : '2rem'
            }}
          />
        )}
        <span>{logoText}</span>
      </Link>
    );
  };

  const renderNavigation = () => {
    if (!showNavigation) return null;

    const navItems = [
      { label: 'Tournaments', href: '/tournaments', icon: Trophy },
      { label: 'Players', href: '/players', icon: Users },
      { label: 'Schedule', href: '/schedule', icon: Calendar },
      { label: 'Live', href: '/live', icon: Clock },
    ];

    return (
      <nav className="nav-brand-links">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.href}
              className="nav-brand-link"
            >
              <Icon size={16} />
              <span className="hidden sm:inline ml-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  };

  const renderSocialLinks = () => {
    if (!showSocialLinks) return null;

    const socialLinks = [
      { name: 'Facebook', url: social.facebook, icon: '📘' },
      { name: 'Twitter', url: social.twitter, icon: '🐦' },
      { name: 'Instagram', url: social.instagram, icon: '📷' },
      { name: 'YouTube', url: social.youtube, icon: '📺' },
      { name: 'Discord', url: social.discord, icon: '💬' },
      { name: 'LinkedIn', url: social.linkedin, icon: '💼' },
    ].filter(link => link.url);

    if (socialLinks.length === 0) return null;

    return (
      <div className="social-brand">
        {socialLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.name}
            title={link.name}
          >
            <span>{link.icon}</span>
          </a>
        ))}
      </div>
    );
  };

  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;

    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
        <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            {renderNavigation()}
            <div className="mt-6">
              {renderSocialLinks()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (headerStyle === 'minimal') {
    return (
      <header className={`header-brand header-brand-minimal ${className}`}>
        <div className="nav-brand">
          <div className="flex items-center justify-between w-full">
            {renderLogo()}
            <div className="flex items-center gap-4">
              {renderSocialLinks()}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
        {renderMobileMenu()}
      </header>
    );
  }

  if (headerStyle === 'hero') {
    return (
      <header className={`header-brand header-brand-hero ${className}`}>
        <div className="nav-brand">
          <div className="flex items-center justify-between w-full mb-8">
            {renderLogo()}
            <div className="flex items-center gap-4">
              {renderSocialLinks()}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-white hover:bg-opacity-20 rounded"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {tournamentName || 'Chess Tournament'}
            </h1>
            {branding.tagline && (
              <p className="text-xl md:text-2xl opacity-90 mb-8">
                {branding.tagline}
              </p>
            )}
            {showNavigation && (
              <div className="flex flex-wrap justify-center gap-4">
                {renderNavigation()}
              </div>
            )}
          </div>
        </div>
        {renderMobileMenu()}
      </header>
    );
  }

  if (headerStyle === 'floating') {
    return (
      <header className={`header-brand fixed top-4 left-4 right-4 z-40 rounded-lg shadow-lg ${className}`}>
        <div className="nav-brand">
          <div className="flex items-center justify-between w-full">
            {renderLogo()}
            <div className="flex items-center gap-4">
              {showNavigation && (
                <div className="hidden lg:flex">
                  {renderNavigation()}
                </div>
              )}
              {renderSocialLinks()}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
        {renderMobileMenu()}
      </header>
    );
  }

  // Default header style
  return (
    <header className={`header-brand ${className}`}>
      <div className="nav-brand">
        <div className="flex items-center justify-between w-full">
          {renderLogo()}
          <div className="flex items-center gap-4">
            {showNavigation && (
              <div className="hidden lg:flex">
                {renderNavigation()}
              </div>
            )}
            {renderSocialLinks()}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>
      {renderMobileMenu()}
    </header>
  );
};

export default BrandedHeader;
