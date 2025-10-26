import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, Shield, ArrowRight, LogIn, Check, 
  BarChart3, Lock, Bell, Globe, Zap, Sparkles, Star, TrendingUp
} from 'lucide-react';
import PairCraftLogo from '../components/PairCraftLogo';
import AuthModal from '../components/AuthModal';

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50">
      {/* Header */}
      <header className="bg-white/95 shadow-lg border-b border-stone-200 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center group">
              <div className="transform transition-transform group-hover:scale-105">
                <PairCraftLogo size="md" showText={true} />
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              <a href="#features" className="text-stone-700 hover:text-amber-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-amber-50">
                Features
              </a>
              <a href="#how-it-works" className="text-stone-700 hover:text-amber-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-amber-50">
                How It Works
              </a>
              <a href="#testimonials" className="text-stone-700 hover:text-amber-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-amber-50">
                Testimonials
              </a>
              <Link
                to="/public/tournaments"
                className="text-stone-700 hover:text-amber-600 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:bg-amber-50"
              >
                View Tournaments
              </Link>
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:from-amber-700 hover:to-orange-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 backdrop-blur border border-amber-500/20 rounded-full px-4 py-2 text-amber-300 text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Trusted by 500+ Tournament Directors</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="text-white">The Complete</span>
                <br />
                <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                  Tournament Platform
                </span>
              </h1>
              
              <p className="text-xl text-stone-300 leading-relaxed max-w-lg">
                Organize world-class chess tournaments with automated Swiss pairings, 
                real-time standings, and everything you need to run successful tournaments.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="group bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition-all inline-flex items-center justify-center shadow-2xl hover:shadow-3xl transform hover:scale-105"
                >
                  <LogIn className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  Start Running Tournaments
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                  to="/public/tournaments"
                  className="bg-white/10 backdrop-blur border-2 border-white/20 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all inline-flex items-center justify-center"
                >
                  View Live Demo
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-8 text-stone-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">Free Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">No Credit Card</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">5-Minute Setup</span>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block relative">
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-transform duration-300">
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Live Tournament
                </div>
                
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 mb-6 border border-amber-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-gray-900 text-xl">Spring Championship 2024</h3>
                      <p className="text-sm text-stone-600">March 15-17, San Francisco</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-amber-700">156</div>
                      <div className="text-xs text-stone-600">Players</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border border-amber-100">
                      <div className="text-xl font-bold text-amber-700">Round 4</div>
                      <div className="text-xs text-stone-600 mt-1">Current</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-amber-100">
                      <div className="text-xl font-bold text-green-600">89%</div>
                      <div className="text-xs text-stone-600 mt-1">Complete</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-amber-100">
                      <div className="text-xl font-bold text-orange-600">$2.5K</div>
                      <div className="text-xs text-stone-600 mt-1">Prize Fund</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        P1
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Alexander Smith</div>
                        <div className="text-xs text-stone-600">2450 FIDE</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-stone-600 text-sm">vs</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-right">Emma Johnson</div>
                        <div className="text-xs text-stone-600 text-right">2410 FIDE</div>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        P2
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold">
                      Board 1
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                    <span className="font-semibold text-gray-900">Player 3</span>
                    <span className="text-stone-600">vs</span>
                    <span className="font-semibold text-gray-900">Player 4</span>
                    <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-semibold">
                      Board 2
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                    <span className="font-semibold text-gray-900">Player 5</span>
                    <span className="text-stone-600">vs</span>
                    <span className="font-semibold text-gray-900">Player 6</span>
                    <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-semibold">
                      Board 3
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                500+
              </div>
              <div className="text-stone-600 font-medium">Active Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                50K+
              </div>
              <div className="text-stone-600 font-medium">Tournaments Managed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                2M+
              </div>
              <div className="text-stone-600 font-medium">Players Registered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
                99.9%
              </div>
              <div className="text-stone-600 font-medium">Uptime Guarantee</div>
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
      <section id="how-it-works" className="py-20 bg-gradient-to-b from-stone-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-stone-600">
              Running tournaments has never been easier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-600 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sign Up</h3>
              <p className="text-stone-600">
                Create your account in seconds. No credit card required.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-600 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create Tournament</h3>
              <p className="text-stone-600">
                Set up your tournament, import players, and configure settings.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-600 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Generate Pairings</h3>
              <p className="text-stone-600">
                Click one button to generate perfect Swiss pairings automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-amber-600 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Run Tournament</h3>
              <p className="text-stone-600">
                Record results, update standings, and let players follow along.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition-all inline-flex items-center shadow-xl"
            >
              Get Started Now - It's Free
              <ArrowRight className="ml-3 h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="testimonials" className="py-20 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6">
              Trusted by Tournament Directors
            </h2>
            <p className="text-xl text-stone-300 max-w-3xl mx-auto">
              Join hundreds of chess clubs and organizations using PairCraft 
              to run their tournaments every week.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                  JD
                </div>
                <div className="ml-4">
                  <div className="font-bold">John Davis</div>
                  <div className="text-sm text-stone-400">Chess Club Director</div>
                </div>
              </div>
              <p className="text-stone-200 italic">
                "PairCraft has completely transformed how we run tournaments. 
                What used to take hours now takes minutes. Our players love 
                the real-time updates."
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                  SM
                </div>
                <div className="ml-4">
                  <div className="font-bold">Sarah Martinez</div>
                  <div className="text-sm text-stone-400">Tournament Organizer</div>
                </div>
              </div>
              <p className="text-stone-200 italic">
                "The Swiss pairing algorithm is flawless. I no longer worry 
                about pairing mistakes. Everything is automated and perfect 
                every time."
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                  MR
                </div>
                <div className="ml-4">
                  <div className="font-bold">Michael Rodriguez</div>
                  <div className="text-sm text-stone-400">Chess School Founder</div>
                </div>
              </div>
              <p className="text-stone-200 italic">
                "The public tournament pages are a game-changer. Parents can 
                follow their kids' games in real-time. Highly recommended!"
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur rounded-2xl p-8 text-center border border-amber-500/30">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Transform Your Tournaments?
            </h3>
            <p className="text-xl text-stone-300 mb-8">
              Join the tournament directors who have already made the switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition-all inline-flex items-center justify-center shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <LogIn className="mr-3 h-6 w-6" />
                Start Running Tournaments Today
                <ArrowRight className="ml-3 h-6 w-6" />
              </button>
              <Link
                to="/public/tournaments"
                className="bg-white/10 border-2 border-white/30 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition-all inline-flex items-center justify-center"
              >
                View Live Tournaments
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </div>
            <p className="mt-6 text-stone-400 text-sm">
              ✓ Free forever • ✓ No credit card • ✓ Setup in 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white py-12 border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <PairCraftLogo size="md" showText={true} />
              <p className="mt-4 text-stone-400 max-w-md">
                The complete platform for chess tournament directors. 
                Professional tournament management made simple.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-amber-500">Resources</h3>
              <ul className="space-y-2">
                <li><Link to="/public/tournaments" className="text-stone-400 hover:text-amber-400 transition-colors">Tournaments</Link></li>
                <li><Link to="/public/organizations" className="text-stone-400 hover:text-amber-400 transition-colors">Organizations</Link></li>
                <li><Link to="/register" className="text-stone-400 hover:text-amber-400 transition-colors">Player Registration</Link></li>
                <li><Link to="/chess" className="text-stone-400 hover:text-amber-400 transition-colors">Play Chess</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-amber-500">Features</h3>
              <ul className="space-y-2 text-stone-400">
                <li>Swiss System Pairings</li>
                <li>Real-time Standings</li>
                <li>Player Management</li>
                <li>Email Notifications</li>
                <li>Public Tournament Pages</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 mt-8 pt-8 text-center">
            <p className="text-stone-500">&copy; 2024 PairCraft. All rights reserved.</p>
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
