import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Plus, Home, User, LogOut, LogIn, Gamepad2 } from 'lucide-react';
import PairCraftLogo from './PairCraftLogo';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-8">
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center group">
              <div className="transform transition-transform group-hover:scale-105">
                <PairCraftLogo size="md" showText={true} />
              </div>
            </Link>
            
            <div className="hidden md:flex space-x-1">
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive('/dashboard') 
                    ? 'bg-gradient-to-r from-orange-700 to-orange-800 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-orange-800'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              
              <Link
                to="/tournaments"
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive('/tournaments') 
                    ? 'bg-gradient-to-r from-orange-700 to-orange-800 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-orange-800'
                }`}
              >
                <Trophy className="h-4 w-4" />
                <span>Tournaments</span>
              </Link>
              
              <Link
                to="/chess"
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive('/chess') 
                    ? 'bg-gradient-to-r from-orange-700 to-orange-800 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-orange-800'
                }`}
              >
                <Gamepad2 className="h-4 w-4" />
                <span>Play Chess</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive('/profile') 
                      ? 'bg-gradient-to-r from-orange-700 to-orange-800 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-orange-800'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>{user?.firstName || user?.username || 'Account'}</span>
                </Link>
                
                <Link
                  to="/tournaments/new"
                  className="flex items-center space-x-2 bg-gradient-to-r from-orange-700 to-orange-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-orange-800 hover:to-orange-900 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Tournament</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-orange-700 to-orange-800 text-white rounded-lg text-sm font-semibold hover:from-orange-800 hover:to-orange-900 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <LogIn className="h-4 w-4" />
                <span>Login / Sign Up</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </nav>
  );
};

export default Navbar;
