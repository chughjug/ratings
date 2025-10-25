import React from 'react';
import { useBranding } from '../contexts/BrandingContext';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  Linkedin,
  MessageCircle,
  Video,
  Music
} from 'lucide-react';

interface BrandedFooterProps {
  organizationName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  website?: string;
  className?: string;
}

const BrandedFooter: React.FC<BrandedFooterProps> = ({
  organizationName,
  contactEmail,
  contactPhone,
  address,
  website,
  className = '',
}) => {
  const { state } = useBranding();
  const {
    branding,
    content,
    social,
  } = state;

  const orgName = organizationName || branding.headerText || 'Chess Tournament';
  const orgEmail = contactEmail || branding.contactEmail;
  const orgPhone = contactPhone || branding.contactPhone;
  const orgAddress = address || branding.address;
  const orgWebsite = website || branding.website;

  const socialLinks = [
    { name: 'Facebook', url: social.facebook, icon: Facebook },
    { name: 'Twitter', url: social.twitter, icon: Twitter },
    { name: 'Instagram', url: social.instagram, icon: Instagram },
    { name: 'YouTube', url: social.youtube, icon: Youtube },
    { name: 'LinkedIn', url: social.linkedin, icon: Linkedin },
    { name: 'Discord', url: social.discord, icon: Discord },
    { name: 'Twitch', url: social.twitch, icon: Twitch },
    { name: 'TikTok', url: social.tiktok, icon: Tiktok },
  ].filter(link => link.url);

  const currentYear = new Date().getFullYear();

  return (
    <footer className={`footer-brand ${className}`}>
      <div className="footer-brand-content">
        {/* Organization Info */}
        <div className="footer-brand-section">
          <h3>{orgName}</h3>
          {branding.tagline && (
            <p className="mb-4">{branding.tagline}</p>
          )}
          {content.aboutSection && (
            <p className="mb-4">{content.aboutSection}</p>
          )}
          {socialLinks.length > 0 && (
            <div className="social-brand">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.name}
                    title={link.name}
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="footer-brand-section">
          <h3>Quick Links</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/tournaments" className="hover:text-blue-600 transition-colors">
                Tournaments
              </Link>
            </li>
            <li>
              <Link to="/players" className="hover:text-blue-600 transition-colors">
                Players
              </Link>
            </li>
            <li>
              <Link to="/schedule" className="hover:text-blue-600 transition-colors">
                Schedule
              </Link>
            </li>
            <li>
              <Link to="/live" className="hover:text-blue-600 transition-colors">
                Live Games
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-blue-600 transition-colors">
                About
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="footer-brand-section">
          <h3>Contact</h3>
          <div className="space-y-2">
            {orgEmail && (
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                <a 
                  href={`mailto:${orgEmail}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {orgEmail}
                </a>
              </div>
            )}
            {orgPhone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-500" />
                <a 
                  href={`tel:${orgPhone}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {orgPhone}
                </a>
              </div>
            )}
            {orgAddress && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-500" />
                <span>{orgAddress}</span>
              </div>
            )}
            {orgWebsite && (
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-500" />
                <a 
                  href={orgWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  {orgWebsite}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Additional Content */}
        {content.customFooter && (
          <div className="footer-brand-section">
            <div 
              dangerouslySetInnerHTML={{ __html: content.customFooter }}
              className="prose prose-sm max-w-none"
            />
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 mt-8 pt-6">
        <div className="max-w-1200 mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              © {currentYear} {orgName}. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-blue-600 transition-colors">
                Terms of Service
              </Link>
              <Link to="/cookies" className="hover:text-blue-600 transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default BrandedFooter;
