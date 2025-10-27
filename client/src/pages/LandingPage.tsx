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
              <a href="#features" className="text-neutral-700 hover:text-neutral-900 text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-neutral-700 hover:text-neutral-900 text-sm font-medium transition-colors">
                How It Works
              </a>
              <a href="#testimonials" className="text-neutral-700 hover:text-neutral-900 text-sm font-medium transition-colors">
                Testimonials
              </a>
              <Link
                to="/public/tournaments"
                className="text-neutral-700 hover:text-neutral-900 text-sm font-medium transition-colors"
              >
                View Tournaments
              </Link>
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 bg-neutral-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-all shadow-sm hover:shadow-md"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
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
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium border border-amber-200">
                <Sparkles className="h-4 w-4" />
                <span>Trusted by 500+ Tournament Directors</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight">
                <span className="text-neutral-900">The Complete</span>
                <br />
                <span className="bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent" style={{ fontFamily: 'serif' }}>
                  Tournament Platform
                </span>
              </h1>
              
              <p className="text-xl text-neutral-600 leading-relaxed max-w-xl">
                Organize world-class chess tournaments with automated Swiss pairings, 
                real-time standings, and everything you need to run successful tournaments.
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
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
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
                      <div className="text-2xl font-bold text-amber-600">$2.5K</div>
                      <div className="text-xs text-neutral-600 mt-1">Prize Fund</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
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

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-2">
                500+
              </div>
              <div className="text-neutral-600 font-medium">Active Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-2">
                50K+
              </div>
              <div className="text-neutral-600 font-medium">Tournaments Managed</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-2">
                2M+
              </div>
              <div className="text-neutral-600 font-medium">Players Registered</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-2">
                99.9%
              </div>
              <div className="text-neutral-600 font-medium">Uptime Guarantee</div>
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
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Trophy className="h-6 w-6 text-blue-600" />
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
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
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
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6 text-purple-600" />
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
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Bell className="h-6 w-6 text-orange-600" />
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
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="h-6 w-6 text-indigo-600" />
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
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Lock className="h-6 w-6 text-red-600" />
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
              <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Sign Up</h3>
              <p className="text-neutral-600">
                Create your account in seconds. No credit card required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Create Tournament</h3>
              <p className="text-neutral-600">
                Set up your tournament, import players, and configure settings.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Generate Pairings</h3>
              <p className="text-neutral-600">
                Click one button to generate perfect Swiss pairings automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
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

      {/* CTA Section */}
      <section id="testimonials" className="py-24 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by Tournament Directors
            </h2>
            <p className="text-xl text-neutral-300 max-w-3xl mx-auto">
              Join hundreds of chess clubs and organizations using PairCraft 
              to run their tournaments every week.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 hover:border-neutral-600 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center text-white font-bold">
                  JD
                </div>
                <div className="ml-4">
                  <div className="font-bold">John Davis</div>
                  <div className="text-sm text-neutral-400">Chess Club Director</div>
                </div>
              </div>
              <p className="text-neutral-300 italic">
                "PairCraft has completely transformed how we run tournaments. 
                What used to take hours now takes minutes. Our players love 
                the real-time updates."
              </p>
            </div>

            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 hover:border-neutral-600 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center text-white font-bold">
                  SM
                </div>
                <div className="ml-4">
                  <div className="font-bold">Sarah Martinez</div>
                  <div className="text-sm text-neutral-400">Tournament Organizer</div>
                </div>
              </div>
              <p className="text-neutral-300 italic">
                "The Swiss pairing algorithm is flawless. I no longer worry 
                about pairing mistakes. Everything is automated and perfect 
                every time."
              </p>
            </div>

            <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 hover:border-neutral-600 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center text-white font-bold">
                  MR
                </div>
                <div className="ml-4">
                  <div className="font-bold">Michael Rodriguez</div>
                  <div className="text-sm text-neutral-400">Chess School Founder</div>
                </div>
              </div>
              <p className="text-neutral-300 italic">
                "The public tournament pages are a game-changer. Parents can 
                follow their kids' games in real-time. Highly recommended!"
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur rounded-2xl p-12 text-center border border-amber-500/20">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Transform Your Tournaments?
            </h3>
            <p className="text-xl text-neutral-300 mb-8">
              Join the tournament directors who have already made the switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-white text-neutral-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-neutral-100 transition-all inline-flex items-center justify-center shadow-xl hover:shadow-2xl"
              >
                <LogIn className="mr-3 h-6 w-6" />
                Start Running Tournaments Today
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
            <p className="mt-6 text-neutral-400 text-sm">
              ✓ Free forever • ✓ No credit card • ✓ Setup in 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-950 text-white py-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <PairCraftLogo size="md" showText={true} />
              <p className="mt-4 text-neutral-400 max-w-md">
                The complete platform for chess tournament directors. 
                Professional tournament management made simple.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-amber-500">Resources</h3>
              <ul className="space-y-2">
                <li><Link to="/public/tournaments" className="text-neutral-400 hover:text-amber-500 transition-colors">Tournaments</Link></li>
                <li><Link to="/public/organizations" className="text-neutral-400 hover:text-amber-500 transition-colors">Organizations</Link></li>
                <li><Link to="/register" className="text-neutral-400 hover:text-amber-500 transition-colors">Player Registration</Link></li>
                <li><Link to="/chess" className="text-neutral-400 hover:text-amber-500 transition-colors">Play Chess</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-amber-500">Features</h3>
              <ul className="space-y-2 text-neutral-400">
                <li>Swiss System Pairings</li>
                <li>Real-time Standings</li>
                <li>Player Management</li>
                <li>Email Notifications</li>
                <li>Public Tournament Pages</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 mt-8 pt-8 text-center">
            <p className="text-neutral-500">&copy; 2024 PairCraft. All rights reserved.</p>
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
