import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Users, Calendar, ArrowRight, LogIn, Check, 
  BarChart3, Bell, Globe, Zap, Sparkles, Star, TrendingUp, Shield, 
  Search, MapPin, Clock, Award, Activity, Gamepad2, Lock
} from 'lucide-react';
import PairCraftLogo from '../components/PairCraftLogo';
import AuthModal from '../components/AuthModal';

const PublicUserLandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header with Glass Effect */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-indigo-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center group">
              <div className="transform transition-transform group-hover:scale-105">
                <PairCraftLogo size="md" showText={true} textColor="text-indigo-900" knightGlow="bg-gradient-to-r from-indigo-600 to-purple-600" />
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/public/tournaments"
                className="text-neutral-700 hover:text-indigo-600 text-sm font-medium transition-colors"
              >
                Find Tournaments
              </Link>
              <Link
                to="/public/organizations"
                className="text-neutral-700 hover:text-indigo-600 text-sm font-medium transition-colors"
              >
                Browse Organizations
              </Link>
              <Link
                to="/"
                className="text-neutral-700 hover:text-indigo-600 text-sm font-medium transition-colors"
              >
                For Directors
              </Link>
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Purple Gradient */}
      <section className="relative py-32 overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8 text-white">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium border border-white/30 text-white">
                <Gamepad2 className="h-4 w-4" />
                <span>Join Thousands of Chess Players</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-extrabold leading-tight tracking-tight">
                Find Your Next
                <br />
                <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Chess Tournament
                </span>
              </h1>
              
              <p className="text-xl text-blue-100 leading-relaxed max-w-xl font-medium">
                Discover and register for chess tournaments near you. From local clubs to 
                international competitions, find your perfect match.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/public/tournaments"
                  className="group bg-white text-indigo-700 px-8 py-4 rounded-xl text-lg font-bold hover:bg-blue-50 transition-all inline-flex items-center justify-center shadow-2xl hover:shadow-3xl transform hover:scale-105"
                >
                  <Search className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  Browse Tournaments
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/public/organizations"
                  className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-white/20 transition-all inline-flex items-center justify-center"
                >
                  Explore Organizations
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-8 text-white">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold">Free to Join</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold">Live Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <span className="font-bold">Easy Registration</span>
                </div>
              </div>
            </div>
            
            {/* Tournament Card Preview */}
            <div className="hidden lg:block relative">
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-white/20 hover:shadow-3xl transition-all transform hover:scale-105">
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                  Live Now
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-2xl text-gray-900 mb-1">Bay Area Open 2024</h3>
                    <p className="text-sm text-neutral-600">San Francisco, CA • March 2024</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-2xl font-bold text-neutral-900">24</div>
                      <div className="text-xs text-neutral-600 mt-1">Players</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-2xl font-bold text-green-600">Round 5</div>
                      <div className="text-xs text-neutral-600 mt-1">Active</div>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-2xl font-bold text-orange-800">$1,500</div>
                      <div className="text-xs text-neutral-600 mt-1">Prize Pool</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-50 rounded-xl border border-orange-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                        W
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Michael Chen</div>
                        <div className="text-xs text-neutral-600">2350 FIDE</div>
                      </div>
                    </div>
                    <span className="text-neutral-500 font-medium">vs</span>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-gray-900 text-right">Sarah Wu</div>
                        <div className="text-xs text-neutral-600 text-right">2280 FIDE</div>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                        B
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
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-xl font-bold text-neutral-900 mb-1">Easy Search</div>
              <div className="text-neutral-600 text-sm">Find by location, rating, date</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📝</div>
              <div className="text-xl font-bold text-neutral-900 mb-1">One-Click Registration</div>
              <div className="text-neutral-600 text-sm">Register instantly online</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-xl font-bold text-neutral-900 mb-1">Live Standings</div>
              <div className="text-neutral-600 text-sm">Track your progress in real-time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-xl font-bold text-neutral-900 mb-1">Rated Events</div>
              <div className="text-neutral-600 text-sm">USCF & FIDE rated tournaments</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              Everything You Need to Play
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              From local club tournaments to international competitions, 
              everything you need is in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 border border-orange-200">
                <Search className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Find the Perfect Tournament
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Search tournaments by location, rating range, format, and dates. 
                Filter by USCF/FIDE rating, time controls, and prize funds.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Advanced search filters
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Calendar view
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Location-based results
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 border border-green-200">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Register in Seconds
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Quick and easy registration with automatic USCF rating lookup. 
                No forms to fill out - just select your section and pay.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  One-click registration
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Auto USCF rating lookup
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Secure payment processing
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 border border-orange-200">
                <BarChart3 className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Track Your Progress
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Live standings and pairings updated in real-time. 
                View your opponents, colors, and tournament progress.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Live pairing updates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Real-time standings
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Personal player profile
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 border border-orange-200">
                <Bell className="h-6 w-6 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Stay Informed
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Get automatic notifications about your pairings, 
                results, and important tournament announcements.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Email notifications
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Pairing alerts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Results updates
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mb-6 border border-neutral-200">
                <Globe className="h-6 w-6 text-neutral-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Discover Organizations
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Follow your favorite clubs and organizations. 
                Get notified about new tournaments from organizers you trust.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Organization pages
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Tournament calendars
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Social media links
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 border border-neutral-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mb-6 border border-neutral-200">
                <Lock className="h-6 w-6 text-neutral-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">
                Safe & Secure
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Your data is protected with enterprise-grade security. 
                Secure payment processing and GDPR compliant.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  SSL encryption
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Secure payments
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Privacy protected
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
              How It Works
            </h2>
            <p className="text-xl text-neutral-600">
              From discovery to checkmate, it's that simple
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-700 to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Browse</h3>
              <p className="text-neutral-600">
                Search tournaments by location, date, or format. Use our 
                advanced filters to find exactly what you're looking for.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-700 to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Register</h3>
              <p className="text-neutral-600">
                Select your section and complete registration. We'll automatically 
                fetch your USCF rating and process payment securely.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-700 to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Receive Pairings</h3>
              <p className="text-neutral-600">
                Get notified when pairings are released. View your opponent, 
                color assignment, and board number instantly.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-700 to-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                4
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Compete</h3>
              <p className="text-neutral-600">
                Play your games and see results update live. Track your 
                standing and rating progress throughout the tournament.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/public/tournaments"
              className="bg-neutral-900 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-neutral-800 transition-all inline-flex items-center shadow-lg hover:shadow-xl"
            >
              Browse All Tournaments
              <ArrowRight className="ml-3 h-6 w-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Play?
            </h2>
            <p className="text-xl text-neutral-300 max-w-3xl mx-auto">
              Join thousands of players competing in tournaments across the country
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-700/10 to-orange-500/10 backdrop-blur rounded-2xl p-12 text-center border border-orange-700/20">
            <h3 className="text-3xl font-bold mb-4">
              Find Your Next Tournament Today
            </h3>
            <p className="text-xl text-neutral-300 mb-8">
              Browse upcoming tournaments and find the perfect competition for your skill level
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/public/tournaments"
                className="bg-white text-neutral-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-neutral-100 transition-all inline-flex items-center justify-center shadow-xl hover:shadow-2xl"
              >
                <Search className="mr-3 h-6 w-6" />
                Browse Tournaments
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
              <Link
                to="/public/organizations"
                className="bg-neutral-800 border-2 border-neutral-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:border-neutral-600 transition-all inline-flex items-center justify-center"
              >
                Find Organizations
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
              <div className="inline-block p-3 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-white/20 shadow-lg">
                <PairCraftLogo size="md" showText={true} textColor="text-white" knightGlow="bg-white" />
              </div>
              <p className="mt-4 text-neutral-400 max-w-md mb-6">
                Your gateway to chess tournaments. Discover, register, and compete 
                in tournaments organized by clubs and organizations nationwide.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-orange-600" />
                  <span className="text-neutral-300">Free Registration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-orange-600" />
                  <span className="text-neutral-300">Live Updates</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">For Players</h3>
              <ul className="space-y-3">
                <li><Link to="/public/tournaments" className="text-neutral-400 hover:text-orange-600 transition-colors flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Browse Tournaments
                </Link></li>
                <li><Link to="/public/organizations" className="text-neutral-400 hover:text-orange-600 transition-colors flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Find Organizations
                </Link></li>
                <li><button onClick={() => setShowAuthModal(true)} className="text-neutral-400 hover:text-orange-600 transition-colors flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Sign In
                </button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Tournament Features</h3>
              <ul className="space-y-3 text-neutral-400">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>USCF & FIDE Rated Events</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Live Pairings & Standings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Email Notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Player Profiles</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span>Secure Payments</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-neutral-500">&copy; 2024 PairCraft. All rights reserved.</p>
              <div className="flex items-center gap-6 text-neutral-500 text-sm">
                <span>Made for chess players</span>
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

export default PublicUserLandingPage;

