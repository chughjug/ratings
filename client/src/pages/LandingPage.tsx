import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, Shield, ArrowRight, LogIn } from 'lucide-react';
import PairCraftLogo from '../components/PairCraftLogo';
import AuthModal from '../components/AuthModal';

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <PairCraftLogo size="md" showText={true} />
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/public/tournaments"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                View Tournaments
              </Link>
              <Link
                to="/public/organizations"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Find Organizations
              </Link>
              <Link
                to="/register"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Register for Tournament
              </Link>
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Professional Chess Tournament
            <span className="text-blue-600"> Management</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Organize, manage, and run chess tournaments with ease. From Swiss system pairings 
            to real-time standings, we've got everything you need for successful tournaments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/public/tournaments"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center justify-center"
            >
              Browse Tournaments
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/public/organizations"
              className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-700 transition-colors inline-flex items-center justify-center"
            >
              Find Organizations
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors border-2 border-blue-600 inline-flex items-center justify-center"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In / Sign Up
            </button>
            <Link
              to="/register"
              className="bg-gray-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-700 transition-colors inline-flex items-center justify-center"
            >
              Register for Tournament
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need for Chess Tournaments
            </h2>
            <p className="text-xl text-gray-600">
              Powerful tools designed specifically for chess tournament directors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Swiss System Pairings</h3>
              <p className="text-gray-600">
                Automated Swiss system pairings with USCF compliance and advanced algorithms
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Player Management</h3>
              <p className="text-gray-600">
                Easy player registration, rating lookup, and comprehensive player profiles
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Standings</h3>
              <p className="text-gray-600">
                Live tournament standings with multiple tiebreaker systems and live updates
              </p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Enterprise-grade security with data backup and reliable tournament management
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Organize Your Next Tournament?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of tournament directors who trust our platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/public/tournaments"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
            >
              View Live Tournaments
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/public/organizations"
              className="bg-green-500 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-600 transition-colors inline-flex items-center justify-center"
            >
              Find Organizations
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-800 transition-colors border-2 border-white inline-flex items-center justify-center"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In / Sign Up
            </button>
            <Link
              to="/register"
              className="bg-transparent text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-white hover:text-blue-600 transition-colors border-2 border-white inline-flex items-center justify-center"
            >
              Register for Tournament
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <PairCraftLogo size="md" showText={true} />
              <p className="mt-4 text-gray-400">
                Professional chess tournament management made simple.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/public/tournaments" className="text-gray-400 hover:text-white">Tournaments</Link></li>
                <li><Link to="/public/organizations" className="text-gray-400 hover:text-white">Organizations</Link></li>
                <li><Link to="/register" className="text-gray-400 hover:text-white">Register</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Swiss System Pairings</li>
                <li>Real-time Standings</li>
                <li>Player Management</li>
                <li>Tournament Analytics</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PairCraft. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default LandingPage;
