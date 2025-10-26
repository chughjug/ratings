import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, Shield, ArrowRight, LogIn, Check, 
  BarChart3, Lock, Bell, Globe
} from 'lucide-react';
import PairCraftLogo from '../components/PairCraftLogo';
import AuthModal from '../components/AuthModal';

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center group">
              <div className="transform transition-transform group-hover:scale-105">
                <PairCraftLogo size="md" showText={true} />
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <a href="#features" className="text-gray-700 hover:text-blue-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-gray-100">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-gray-100">
                How It Works
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-gray-100">
                Testimonials
              </a>
              <Link
                to="/public/tournaments"
                className="text-gray-700 hover:text-blue-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-gray-100"
              >
                View Tournaments
              </Link>
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                The Complete Platform for
                <span className="text-blue-300"> Tournament Directors</span>
              </h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Organize world-class chess tournaments with automated Swiss pairings, 
                real-time standings, player management, and everything you need to run 
                successful tournaments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-all inline-flex items-center justify-center shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  <LogIn className="mr-3 h-6 w-6" />
                  Start Running Tournaments Today
                  <ArrowRight className="ml-3 h-5 w-5" />
                </button>
                <Link
                  to="/public/tournaments"
                  className="bg-blue-800 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-900 transition-all inline-flex items-center justify-center border-2 border-blue-300"
                >
                  View Live Demo
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-blue-100">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-300" />
                  <span>Free to Get Started</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-300" />
                  <span>No Credit Card Required</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg p-6 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-lg">Spring Open 2024</h3>
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Live
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-3xl font-bold text-blue-600">156</div>
                      <div className="text-sm text-gray-600">Players</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">Round 4</div>
                      <div className="text-sm text-gray-600">Active</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-purple-600">89%</div>
                      <div className="text-sm text-gray-600">Complete</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-gray-900">P1</span>
                    <span className="text-gray-600">vs</span>
                    <span className="font-semibold text-gray-900">P2</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                      Board 1
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-gray-900">P3</span>
                    <span className="text-gray-600">vs</span>
                    <span className="font-semibold text-gray-900">P4</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                      Board 2
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-semibold text-gray-900">P5</span>
                    <span className="text-gray-600">vs</span>
                    <span className="font-semibold text-gray-900">P6</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                      Board 3
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Successful Tournaments
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful tools designed specifically for chess tournament directors 
              to save time, eliminate errors, and provide exceptional player experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-blue-50 rounded-xl p-8 border border-blue-100 hover:shadow-xl transition-all">
              <div className="bg-blue-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Automated Swiss Pairings
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Advanced algorithms for perfect Swiss system pairings with USCF compliance. 
                Automatic bye handling, color equalization, and top player protection.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Burstein pairing algorithm
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Quad tournament support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Team Swiss format
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-green-50 rounded-xl p-8 border border-green-100 hover:shadow-xl transition-all">
              <div className="bg-green-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Comprehensive Player Management
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Import players from CSV, Google Forms, or manage manually. 
                Automatic USCF rating lookup, player profiles, and registration management.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  CSV & Google Forms import
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  USCF rating lookup
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Player analytics & stats
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-purple-50 rounded-xl p-8 border border-purple-100 hover:shadow-xl transition-all">
              <div className="bg-purple-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Real-Time Standings & Analytics
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Live tournament standings with multiple tiebreaker systems. 
                Detailed analytics, performance tracking, and printable reports.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Live score updates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Multiple tiebreakers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Export to PDF
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-orange-50 rounded-xl p-8 border border-orange-100 hover:shadow-xl transition-all">
              <div className="bg-orange-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <Bell className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Automated Email Notifications
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Send automated pairing announcements, results, and standings 
                to all players. White-label email support with custom branding.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Custom email templates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Webhook integration
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Bulk notifications
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="bg-indigo-50 rounded-xl p-8 border border-indigo-100 hover:shadow-xl transition-all">
              <div className="bg-indigo-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Public Tournament Pages
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Branded public pages for your organization. Embed tournaments 
                in your website with iframes. Professional player registration.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Custom branding
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Embedded tournament widgets
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Public registration
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="bg-red-50 rounded-xl p-8 border border-red-100 hover:shadow-xl transition-all">
              <div className="bg-red-600 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Secure & Reliable
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Enterprise-grade security with automated backups, data encryption, 
                and GDPR compliance. Your tournament data is always safe.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Automatic backups
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  SSL encryption
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  99.9% uptime guarantee
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-gray-600">
              Running tournaments has never been easier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sign Up</h3>
              <p className="text-gray-600">
                Create your account in seconds. No credit card required.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create Tournament</h3>
              <p className="text-gray-600">
                Set up your tournament, import players, and configure settings.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Generate Pairings</h3>
              <p className="text-gray-600">
                Click one button to generate perfect Swiss pairings automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Run Tournament</h3>
              <p className="text-gray-600">
                Record results, update standings, and let players follow along.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all inline-flex items-center shadow-xl"
            >
              Get Started Now - It's Free
              <ArrowRight className="ml-3 h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6">
              Trusted by Tournament Directors
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Join hundreds of chess clubs and organizations using PairCraft 
              to run their tournaments every week.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  JD
                </div>
                <div className="ml-4">
                  <div className="font-bold">John Davis</div>
                  <div className="text-sm text-blue-200">Chess Club Director</div>
                </div>
              </div>
              <p className="text-blue-50 italic">
                "PairCraft has completely transformed how we run tournaments. 
                What used to take hours now takes minutes. Our players love 
                the real-time updates."
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  SM
                </div>
                <div className="ml-4">
                  <div className="font-bold">Sarah Martinez</div>
                  <div className="text-sm text-blue-200">Tournament Organizer</div>
                </div>
              </div>
              <p className="text-blue-50 italic">
                "The Swiss pairing algorithm is flawless. I no longer worry 
                about pairing mistakes. Everything is automated and perfect 
                every time."
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  MR
                </div>
                <div className="ml-4">
                  <div className="font-bold">Michael Rodriguez</div>
                  <div className="text-sm text-blue-200">Chess School Founder</div>
                </div>
              </div>
              <p className="text-blue-50 italic">
                "The public tournament pages are a game-changer. Parents can 
                follow their kids' games in real-time. Highly recommended!"
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-center border border-white/20">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Transform Your Tournaments?
            </h3>
            <p className="text-xl text-blue-100 mb-8">
              Join the tournament directors who have already made the switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-all inline-flex items-center justify-center shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <LogIn className="mr-3 h-6 w-6" />
                Start Running Tournaments Today
                <ArrowRight className="ml-3 h-6 w-6" />
              </button>
              <Link
                to="/public/tournaments"
                className="bg-blue-800 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-900 transition-all inline-flex items-center justify-center border-2 border-blue-300"
              >
                View Live Tournaments
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </div>
            <p className="mt-6 text-blue-200 text-sm">
              ✓ Free forever • ✓ No credit card • ✓ Setup in 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <PairCraftLogo size="md" showText={true} />
              <p className="mt-4 text-gray-400 max-w-md">
                The complete platform for chess tournament directors. 
                Professional tournament management made simple.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link to="/public/tournaments" className="text-gray-400 hover:text-white transition-colors">Tournaments</Link></li>
                <li><Link to="/public/organizations" className="text-gray-400 hover:text-white transition-colors">Organizations</Link></li>
                <li><Link to="/register" className="text-gray-400 hover:text-white transition-colors">Player Registration</Link></li>
                <li><Link to="/chess" className="text-gray-400 hover:text-white transition-colors">Play Chess</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Swiss System Pairings</li>
                <li>Real-time Standings</li>
                <li>Player Management</li>
                <li>Email Notifications</li>
                <li>Public Tournament Pages</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">&copy; 2024 PairCraft. All rights reserved.</p>
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
