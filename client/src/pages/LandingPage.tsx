import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, ArrowRight, LogIn, Check, 
  BarChart3, Lock, Bell, Globe, Zap, Sparkles, Star, TrendingUp, Shield, Gamepad2
} from 'lucide-react';
import PairCraftLogo from '../components/PairCraftLogo';
import AuthModal from '../components/AuthModal';

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center group">
              <div className="transform transition-transform group-hover:scale-105">
                <PairCraftLogo size="md" showText={true} />
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-neutral-700 hover:text-orange-700 text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-neutral-700 hover:text-orange-700 text-sm font-medium transition-colors">
                How It Works
              </a>
              <Link
                to="/public/tournaments"
                className="text-neutral-700 hover:text-orange-700 text-sm font-medium transition-colors"
              >
                Live Tournaments
              </Link>
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-orange-700 to-orange-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:from-orange-800 hover:to-orange-900 transition-all shadow-sm hover:shadow-lg"
              >
                <LogIn className="h-4 w-4" />
                <span>Get Started</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden bg-gradient-to-b from-white to-neutral-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium border border-orange-200">
                <Sparkles className="h-4 w-4" />
                <span>Trusted by 500+ Tournament Directors</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight">
                <span className="text-neutral-900">The Complete</span>
                <br />
                <span className="bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent" style={{ fontFamily: 'serif' }}>
                  Tournament Platform
                </span>
              </h1>
              
              <p className="text-xl text-neutral-600 leading-relaxed max-w-xl">
                Organize world-class chess tournaments with intelligent automation,
                real-time analytics, and everything you need to run successful tournaments.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="group bg-neutral-900 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-neutral-800 transition-all inline-flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  <LogIn className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  Start Running Tournaments
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                  to="/public/tournaments"
                  className="bg-white border-2 border-neutral-300 text-neutral-900 px-8 py-4 rounded-lg text-lg font-semibold hover:border-neutral-400 transition-all inline-flex items-center justify-center shadow-sm hover:shadow-md"
                >
                  View Live Demo
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-8 text-neutral-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                    <Check className="h-5 w-5 text-green-700" />
                  </div>
                  <span className="font-semibold">Free Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                    <Check className="h-5 w-5 text-green-700" />
                  </div>
                  <span className="font-semibold">No Credit Card</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center border border-green-200">
                    <Check className="h-5 w-5 text-green-700" />
                  </div>
                  <span className="font-semibold">5-Minute Setup</span>
                </div>
              </div>
            </div>
            
            {/* Live Tournament Card */}
            <div className="hidden lg:block relative">
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-neutral-200 hover:shadow-3xl transition-shadow">
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Live Tournament
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-2xl text-gray-900 mb-1">Spring Championship 2024</h3>
                    <p className="text-sm text-neutral-600">March 15-17, San Francisco</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-2xl font-bold text-neutral-900">Round 4</div>
                      <div className="text-xs text-neutral-600 mt-1">Current</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-2xl font-bold text-green-600">89%</div>
                      <div className="text-xs text-neutral-600 mt-1">Complete</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-2xl font-bold text-orange-800">$2.5K</div>
                      <div className="text-xs text-neutral-600 mt-1">Prize Fund</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-50 rounded-xl border border-orange-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                        P1
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Alexander Smith</div>
                        <div className="text-xs text-neutral-600">2450 FIDE</div>
                      </div>
                    </div>
                    <span className="text-neutral-500 font-medium">vs</span>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-right">Emma Johnson</div>
                        <div className="text-xs text-neutral-600 text-right">2410 FIDE</div>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                        P2
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-16 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <div className="text-xl font-bold text-neutral-900 mb-1">Zero Configuration</div>
              <div className="text-neutral-600 text-sm">Works out of the box</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🎯</div>
              <div className="text-xl font-bold text-neutral-900 mb-1">Perfect Accuracy</div>
              <div className="text-neutral-600 text-sm">USCF-approved algorithms</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🚀</div>
              <div className="text-xl font-bold text-neutral-900 mb-1">Lightning Fast</div>
              <div className="text-neutral-600 text-sm">Instant results</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🔒</div>
              <div className="text-xl font-bold text-neutral-900 mb-1">Always Secure</div>
              <div className="text-neutral-600 text-sm">Enterprise-grade security</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Everything You Need to Run Successful Tournaments
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Powerful tools designed specifically for chess tournament directors 
              to save time, eliminate errors, and provide exceptional player experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 border border-orange-200">
                <Trophy className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Automated Swiss Pairings
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Advanced algorithms for perfect Swiss system pairings with USCF compliance. 
                Automatic bye handling, color equalization, and top player protection.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
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

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 border border-green-200">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Comprehensive Player Management
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Import players from CSV, Google Forms, or manage manually. 
                Automatic USCF rating lookup, player profiles, and registration management.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
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

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 border border-orange-200">
                <BarChart3 className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Real-Time Standings & Analytics
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Live tournament standings with multiple tiebreaker systems. 
                Detailed analytics, performance tracking, and printable reports.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
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

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 border border-orange-200">
                <Bell className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Automated Email Notifications
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Send automated pairing announcements, results, and standings 
                to all players. White-label email support with custom branding.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
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

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mb-6 border border-neutral-200">
                <Globe className="h-6 w-6 text-neutral-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Public Tournament Pages
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Branded public pages for your organization. Embed tournaments 
                in your website with iframes. Professional player registration.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
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

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mb-6 border border-neutral-200">
                <Lock className="h-6 w-6 text-neutral-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Secure & Reliable
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Enterprise-grade security with automated backups, data encryption, 
                and GDPR compliance. Your tournament data is always safe.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
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
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-neutral-600">
              Running tournaments has never been easier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-700 to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Sign Up</h3>
              <p className="text-neutral-600">
                Create your account in seconds. No credit card required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-700 to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Create Tournament</h3>
              <p className="text-neutral-600">
                Set up your tournament, import players, and configure settings.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-700 to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Generate Pairings</h3>
              <p className="text-neutral-600">
                Click one button to generate perfect Swiss pairings automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-700 to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                4
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Run Tournament</h3>
              <p className="text-neutral-600">
                Record results, update standings, and let players follow along.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-neutral-900 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-neutral-800 transition-all inline-flex items-center shadow-lg hover:shadow-xl"
            >
              Get Started Now - It's Free
              <ArrowRight className="ml-3 h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Showcase Section */}
      <section className="py-24 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Tournament Directors Choose PairCraft
            </h2>
            <p className="text-xl text-neutral-300 max-w-3xl mx-auto">
              Cutting-edge features that make tournament management effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 hover:border-orange-600/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Swiss Pairings</h3>
              <p className="text-neutral-400">
                Advanced pairing algorithms with Burstein method, color balancing, and bye handling
              </p>
            </div>

            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 hover:border-orange-600/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Live Standings</h3>
              <p className="text-neutral-400">
                Real-time updates with Buchholz, Sonneborn-Berger, and Koya tiebreakers
              </p>
            </div>

            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 hover:border-orange-600/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Notifications</h3>
              <p className="text-neutral-400">
                Automated email alerts for pairings, results, and standings updates
              </p>
            </div>

            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 hover:border-orange-600/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Public Pages</h3>
              <p className="text-neutral-400">
                Embeddable tournament widgets and branded public registration
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-700/10 to-orange-500/10 backdrop-blur rounded-2xl p-12 text-center border border-orange-700/20">
            <h3 className="text-3xl font-bold mb-4">
              Get Started in Under 5 Minutes
            </h3>
            <p className="text-xl text-neutral-300 mb-8">
              Create your account and run your first tournament today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-white text-neutral-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-neutral-100 transition-all inline-flex items-center justify-center shadow-xl hover:shadow-2xl"
              >
                <LogIn className="mr-3 h-6 w-6" />
                Start Running Tournaments
                <ArrowRight className="ml-3 h-6 w-6" />
              </button>
              <Link
                to="/public/tournaments"
                className="bg-neutral-800 border-2 border-neutral-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:border-neutral-600 transition-all inline-flex items-center justify-center"
              >
                View Live Tournaments
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-950 text-white py-16 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <PairCraftLogo size="md" showText={true} />
              <p className="mt-4 text-neutral-400 max-w-md mb-6">
                The most powerful chess tournament management platform. 
                Built for directors who demand perfection.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-orange-600" />
                  <span className="text-neutral-300">Free Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-orange-600" />
                  <span className="text-neutral-300">Zero Setup Time</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Platform</h3>
              <ul className="space-y-3">
                <li><Link to="/public/tournaments" className="text-neutral-400 hover:text-orange-600 transition-colors flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Browse Tournaments
                </Link></li>
                <li><Link to="/public/organizations" className="text-neutral-400 hover:text-orange-600 transition-colors flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Find Organizations
                </Link></li>
                <li><Link to="/register" className="text-neutral-400 hover:text-orange-600 transition-colors flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Register as Player
                </Link></li>
                <li><Link to="/chess" className="text-neutral-400 hover:text-orange-600 transition-colors flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Play Chess Online
                </Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Power Features</h3>
              <ul className="space-y-3 text-neutral-400">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Burstein & Accelerated Pairings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>USCF Rating Integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Export to PDF & Print</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Team Tournament Support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Embeddable Widgets</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>White-Label Branding</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-neutral-500">&copy; 2024 PairCraft. All rights reserved.</p>
              <div className="flex items-center gap-6 text-neutral-500 text-sm">
                <span>Made for tournament directors</span>
              </div>
            </div>
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
