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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
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
      <section className="relative py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-40 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-40 w-96 h-96 bg-gradient-to-tl from-white/10 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 text-white text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Trusted by 500+ Tournament Directors</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="text-white">The Complete</span>
                <br />
                <span className="bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent">
                  Tournament Platform
                </span>
              </h1>
              
              <p className="text-xl text-blue-100 leading-relaxed max-w-lg">
                Organize world-class chess tournaments with automated Swiss pairings, 
                real-time standings, and everything you need to run successful tournaments.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="group bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-all inline-flex items-center justify-center shadow-2xl hover:shadow-3xl transform hover:scale-105"
                >
                  <LogIn className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  Start Running Tournaments
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                  to="/public/tournaments"
                  className="bg-white/10 backdrop-blur border-2 border-white/30 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all inline-flex items-center justify-center"
                >
                  View Live Demo
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-8 text-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">Free Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">No Credit Card</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">5-Minute Setup</span>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block relative">
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-transform duration-300">
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Live Tournament
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-gray-900 text-xl">Spring Championship 2024</h3>
                      <p className="text-sm text-gray-600">March 15-17, San Francisco</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">156</div>
                      <div className="text-xs text-gray-600">Players</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-blue-600">Round 4</div>
                      <div className="text-xs text-gray-600 mt-1">Current</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-green-600">89%</div>
                      <div className="text-xs text-gray-600 mt-1">Complete</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-purple-600">$2.5K</div>
                      <div className="text-xs text-gray-600 mt-1">Prize Fund</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        P1
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Alexander Smith</div>
                        <div className="text-xs text-gray-600">2450 FIDE</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 text-sm">vs</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-right">Emma Johnson</div>
                        <div className="text-xs text-gray-600 text-right">2410 FIDE</div>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        P2
                      </div>
                    </div>
                    <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold">
                      Board 1
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-gray-900">Player 3</span>
                    <span className="text-gray-600">vs</span>
                    <span className="font-semibold text-gray-900">Player 4</span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold">
                      Board 2
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="font-semibold text-gray-900">Player 5</span>
                    <span className="text-gray-600">vs</span>
                    <span className="font-semibold text-gray-900">Player 6</span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-semibold">
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
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                500+
              </div>
              <div className="text-gray-600 font-medium">Active Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                50K+
              </div>
              <div className="text-gray-600 font-medium">Tournaments Managed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                2M+
              </div>
              <div className="text-gray-600 font-medium">Players Registered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                99.9%
              </div>
              <div className="text-gray-600 font-medium">Uptime Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 text-blue-600 text-sm font-semibold mb-6">
              <Zap className="h-4 w-4" />
              <span>Powerful Features</span>
            </div>
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to Run
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Successful Tournaments
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Powerful tools designed specifically for chess tournament directors 
              to save time, eliminate errors, and provide exceptional player experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-blue-300 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Automated Swiss Pairings
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Advanced algorithms for perfect Swiss system pairings with USCF compliance. 
                Automatic bye handling, color equalization, and top player protection.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Burstein pairing algorithm</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Quad tournament support</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Team Swiss format</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-green-300 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Player Management
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Import players from CSV, Google Forms, or manage manually. 
                Automatic USCF rating lookup, player profiles, and registration management.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>CSV & Google Forms import</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>USCF rating lookup</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Player analytics & stats</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-purple-300 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Real-Time Analytics
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Live tournament standings with multiple tiebreaker systems. 
                Detailed analytics, performance tracking, and printable reports.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Live score updates</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Multiple tiebreakers</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Export to PDF</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-orange-300 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Bell className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Email Notifications
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Send automated pairing announcements, results, and standings 
                to all players. White-label email support with custom branding.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Custom email templates</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Webhook integration</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Bulk notifications</span>
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-indigo-300 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Public Pages
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Branded public pages for your organization. Embed tournaments 
                in your website with iframes. Professional player registration.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Custom branding</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Embedded widgets</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Public registration</span>
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="group bg-white rounded-2xl p-8 border border-gray-200 hover:border-gray-300 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="bg-gradient-to-br from-gray-600 to-gray-800 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Secure & Reliable
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Enterprise-grade security with automated backups, data encryption, 
                and GDPR compliance. Your tournament data is always safe.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Automatic backups</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>SSL encryption</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>99.9% uptime</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-gray-900 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 text-white text-sm font-semibold mb-6">
              <TrendingUp className="h-4 w-4" />
              <span>Simple Process</span>
            </div>
            <h2 className="text-5xl font-bold mb-6">
              Get Started in
              <br />
              <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
                Minutes
              </span>
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Running tournaments has never been easier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
            <div className="relative text-center group">
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform z-10">
                1
              </div>
              <div className="absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-blue-500 to-transparent hidden md:block"></div>
              <h3 className="text-xl font-bold mb-3">Sign Up</h3>
              <p className="text-blue-200 leading-relaxed">
                Create your account in seconds. No credit card required.
              </p>
            </div>

            <div className="relative text-center group">
              <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform z-10">
                2
              </div>
              <div className="absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-green-500 to-transparent hidden md:block"></div>
              <h3 className="text-xl font-bold mb-3">Create Tournament</h3>
              <p className="text-blue-200 leading-relaxed">
                Set up your tournament, import players, and configure settings.
              </p>
            </div>

            <div className="relative text-center group">
              <div className="relative bg-gradient-to-br from-purple-500 to-pink-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform z-10">
                3
              </div>
              <div className="absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-purple-500 to-transparent hidden md:block"></div>
              <h3 className="text-xl font-bold mb-3">Generate Pairings</h3>
              <p className="text-blue-200 leading-relaxed">
                Click one button to generate perfect Swiss pairings automatically.
              </p>
            </div>

            <div className="relative text-center group">
              <div className="relative bg-gradient-to-br from-orange-500 to-red-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform z-10">
                4
              </div>
              <h3 className="text-xl font-bold mb-3">Run Tournament</h3>
              <p className="text-blue-200 leading-relaxed">
                Record results, update standings, and let players follow along.
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-white text-blue-600 px-10 py-5 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-all inline-flex items-center shadow-2xl hover:shadow-3xl transform hover:scale-105"
            >
              Get Started Now - It's Free
              <ArrowRight className="ml-3 h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="testimonials" className="py-24 bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-2 text-white text-sm font-semibold mb-6">
              <Star className="h-4 w-4" />
              <span>Trusted by 500+ Directors</span>
            </div>
            <h2 className="text-5xl font-bold mb-6">
              Trusted by Tournament Directors
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Join hundreds of chess clubs and organizations using PairCraft 
              to run their tournaments every week.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="group bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 hover:border-white/40 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                  JD
                </div>
                <div className="ml-4">
                  <div className="font-bold text-lg">John Davis</div>
                  <div className="text-sm text-blue-200">Chess Club Director</div>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-blue-50 leading-relaxed italic">
                "PairCraft has completely transformed how we run tournaments. 
                What used to take hours now takes minutes. Our players love 
                the real-time updates."
              </p>
            </div>

            <div className="group bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 hover:border-white/40 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                  SM
                </div>
                <div className="ml-4">
                  <div className="font-bold text-lg">Sarah Martinez</div>
                  <div className="text-sm text-blue-200">Tournament Organizer</div>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-blue-50 leading-relaxed italic">
                "The Swiss pairing algorithm is flawless. I no longer worry 
                about pairing mistakes. Everything is automated and perfect 
                every time."
              </p>
            </div>

            <div className="group bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20 hover:border-white/40 hover:shadow-2xl transition-all transform hover:-translate-y-2">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg">
                  MR
                </div>
                <div className="ml-4">
                  <div className="font-bold text-lg">Michael Rodriguez</div>
                  <div className="text-sm text-blue-200">Chess School Founder</div>
                </div>
              </div>
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-blue-50 leading-relaxed italic">
                "The public tournament pages are a game-changer. Parents can 
                follow their kids' games in real-time. Highly recommended!"
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur rounded-3xl p-12 text-center border border-white/30 shadow-2xl">
            <h3 className="text-4xl font-bold mb-4">
              Ready to Transform Your Tournaments?
            </h3>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join the tournament directors who have already made the switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={() => setShowAuthModal(true)}
                className="group bg-white text-blue-600 px-10 py-5 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-all inline-flex items-center justify-center shadow-2xl hover:shadow-3xl transform hover:scale-105"
              >
                <LogIn className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                Start Running Tournaments Today
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                to="/public/tournaments"
                className="bg-white/10 backdrop-blur border-2 border-white/30 text-white px-10 py-5 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all inline-flex items-center justify-center"
              >
                View Live Tournaments
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-blue-100">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                <span className="font-medium">Free forever</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                <span className="font-medium">No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-400" />
                <span className="font-medium">Setup in 5 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-16 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="mb-4">
                <PairCraftLogo size="lg" showText={true} />
              </div>
              <p className="text-gray-400 max-w-md leading-relaxed mb-6">
                The complete platform for chess tournament directors. 
                Professional tournament management made simple.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center hover:scale-110 transition-transform cursor-pointer shadow-lg">
                  <Bell className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Resources</h3>
              <ul className="space-y-3">
                <li><Link to="/public/tournaments" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 hover:translate-x-1 transform transition-all">
                  <ArrowRight className="h-4 w-4" />
                  Tournaments
                </Link></li>
                <li><Link to="/public/organizations" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 hover:translate-x-1 transform transition-all">
                  <ArrowRight className="h-4 w-4" />
                  Organizations
                </Link></li>
                <li><Link to="/register" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 hover:translate-x-1 transform transition-all">
                  <ArrowRight className="h-4 w-4" />
                  Player Registration
                </Link></li>
                <li><Link to="/chess" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 hover:translate-x-1 transform transition-all">
                  <ArrowRight className="h-4 w-4" />
                  Play Chess
                </Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Features</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Swiss System Pairings
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Real-time Standings
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Player Management
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Email Notifications
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Public Tournament Pages
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400">
                &copy; 2024 PairCraft. All rights reserved.
              </p>
              <div className="flex items-center gap-6 text-gray-400 text-sm">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Contact Us</a>
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
