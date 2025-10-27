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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center group">
              <div className="transform transition-transform group-hover:scale-105">
                <PairCraftLogo size="md" showText={true} />
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-neutral-400 hover:text-white text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-neutral-400 hover:text-white text-sm font-medium transition-colors">
                How It Works
              </a>
              <a href="#testimonials" className="text-neutral-400 hover:text-white text-sm font-medium transition-colors">
                Testimonials
              </a>
              <Link
                to="/public/tournaments"
                className="text-neutral-400 hover:text-white text-sm font-medium transition-colors"
              >
                View Tournaments
              </Link>
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden bg-gradient-to-b from-purple-900 via-black to-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-purple-900/30 text-purple-300 px-4 py-2 rounded-full text-sm font-medium border border-purple-700/50">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Tournament Intelligence</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">From Pairing</span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent" style={{ fontFamily: 'serif' }}>
                  to Performance
                </span>
              </h1>
              
              <p className="text-xl text-neutral-400 leading-relaxed max-w-xl">
                AI-powered chess tournament management that analyzes, predicts, and optimizes. 
                Run perfect tournaments with intelligent automation.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="group bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all inline-flex items-center justify-center shadow-xl hover:shadow-2xl"
                >
                  <LogIn className="mr-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  Start Building with AI
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </button>
                <Link
                  to="/public/tournaments"
                  className="bg-white/10 border-2 border-white/20 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 hover:border-white/30 backdrop-blur-sm transition-all inline-flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  View Live Demo
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-8 text-neutral-400">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-900/30 rounded-full flex items-center justify-center border border-purple-700/50">
                    <Check className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="font-semibold">AI-Powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-900/30 rounded-full flex items-center justify-center border border-purple-700/50">
                    <Check className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="font-semibold">Real-Time Analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-900/30 rounded-full flex items-center justify-center border border-purple-700/50">
                    <Check className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="font-semibold">Enterprise Ready</span>
                </div>
              </div>
            </div>
            
            {/* Live Tournament Card */}
            <div className="hidden lg:block relative">
              <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-purple-900/50 hover:border-purple-800/50 transition-all">
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Live Tournament
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-2xl text-white mb-1">AI Championship 2024</h3>
                    <p className="text-sm text-neutral-400">March 15-17, San Francisco</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-purple-900/50">
                      <div className="text-2xl font-bold text-white">Round 4</div>
                      <div className="text-xs text-neutral-400 mt-1">Current</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-purple-900/50">
                      <div className="text-2xl font-bold text-purple-400">89%</div>
                      <div className="text-xs text-neutral-400 mt-1">Complete</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl border border-purple-900/50">
                      <div className="text-2xl font-bold text-purple-400">$2.5K</div>
                      <div className="text-xs text-neutral-400 mt-1">Prize Fund</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/20 to-purple-800/20 rounded-xl border border-purple-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                        P1
                      </div>
                      <div>
                        <div className="font-semibold text-white">Alexander Smith</div>
                        <div className="text-xs text-neutral-400">2450 FIDE</div>
                      </div>
                    </div>
                    <span className="text-neutral-500 font-medium">vs</span>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-white text-right">Emma Johnson</div>
                        <div className="text-xs text-neutral-400 text-right">2410 FIDE</div>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
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
      <section className="py-16 bg-black border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-2">
                500+
              </div>
              <div className="text-neutral-400 font-medium">Active Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-2">
                50K+
              </div>
              <div className="text-neutral-400 font-medium">Tournaments Managed</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-2">
                2M+
              </div>
              <div className="text-neutral-400 font-medium">Players Registered</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-2">
                99.9%
              </div>
              <div className="text-neutral-400 font-medium">Uptime Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              AI-Powered Tournament Intelligence
            </h2>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Advanced AI algorithms analyze, predict, and optimize every aspect of your tournaments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-purple-900/50 hover:border-purple-700/50 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 border border-purple-700/50">
                <Trophy className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                AI Pairing Engine
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Machine learning algorithms for perfect Swiss pairings. AI analyzes patterns,
                predicts outcomes, and optimizes matchups for maximum fairness.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Predictive pairing algorithms
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  AI-powered optimization
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Real-time adjustments
                </li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-purple-900/50 hover:border-purple-700/50 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 border border-purple-700/50">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                AI Player Insights
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                AI analyzes player performance patterns, predicts outcomes, and suggests optimal
                pairings. Intelligent player profiling and competitive analysis.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Performance prediction AI
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Smart player profiling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Competitive insights
                </li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-purple-900/50 hover:border-purple-700/50 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 border border-purple-700/50">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Real-Time AI Analytics
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                AI-powered analytics with predictive modeling, trend analysis, 
                and intelligent insights. Real-time dashboards for instant decisions.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Predictive modeling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Trend analysis
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Live AI insights
                </li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-purple-900/50 hover:border-purple-700/50 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 border border-purple-700/50">
                <Bell className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                AI-Powered Communications
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Intelligent notification system with AI-generated content,
                optimal timing, and personalized messaging for every player.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  AI-generated content
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Smart timing optimization
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Personalized messaging
                </li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-purple-900/50 hover:border-purple-700/50 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 border border-purple-700/50">
                <Globe className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Intelligent Public Pages
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                AI-optimized public tournament pages with dynamic content,
                personalized experiences, and intelligent player recommendations.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Dynamic AI content
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Personalization engine
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  Smart recommendations
                </li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-purple-900/50 hover:border-purple-700/50 hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 border border-purple-700/50">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Enterprise Security & AI Defense
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                AI-powered threat detection, encrypted data processing,
                and machine learning security to protect your tournaments.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  AI threat detection
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  ML-powered encryption
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400" />
                  99.9% uptime with AI monitoring
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Deploy AI Tournaments in Minutes
            </h2>
            <p className="text-xl text-neutral-400">
              Intelligent automation handles everything for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Sign Up</h3>
              <p className="text-neutral-400">
                Create your AI-powered account in seconds.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Setup</h3>
              <p className="text-neutral-400">
                AI automatically configures your tournament.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Pairings</h3>
              <p className="text-neutral-400">
                AI generates perfect pairings with predictive models.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                4
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Insights</h3>
              <p className="text-neutral-400">
                Get real-time AI analytics and predictions.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all inline-flex items-center shadow-xl hover:shadow-2xl"
            >
              Start Building with AI - It's Free
              <ArrowRight className="ml-3 h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="testimonials" className="py-24 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by AI-Powered Organizations
            </h2>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Leading chess organizations leverage our AI technology
              to deliver exceptional tournament experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-purple-900/50 hover:border-purple-700/50 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center text-white font-bold">
                  JD
                </div>
                <div className="ml-4">
                  <div className="font-bold text-white">John Davis</div>
                  <div className="text-sm text-neutral-400">Chess Club Director</div>
                </div>
              </div>
              <p className="text-neutral-400 italic">
                "The AI pairing predictions are incredibly accurate. Our tournaments 
                run flawlessly with intelligent automation handling everything."
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-purple-900/50 hover:border-purple-700/50 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center text-white font-bold">
                  SM
                </div>
                <div className="ml-4">
                  <div className="font-bold text-white">Sarah Martinez</div>
                  <div className="text-sm text-neutral-400">AI Tournament Organizer</div>
                </div>
              </div>
              <p className="text-neutral-400 italic">
                "The predictive analytics help us create perfectly balanced tournaments. 
                AI has revolutionized how we organize competitions."
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-purple-900/50 hover:border-purple-700/50 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center text-white font-bold">
                  MR
                </div>
                <div className="ml-4">
                  <div className="font-bold text-white">Michael Rodriguez</div>
                  <div className="text-sm text-neutral-400">Chess School Founder</div>
                </div>
              </div>
              <p className="text-neutral-400 italic">
                "Real-time AI insights give us an unfair advantage. Parents love 
                the intelligent player predictions. This is the future!"
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 backdrop-blur rounded-2xl p-12 text-center border border-purple-700/30">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Deploy AI Tournaments?
            </h3>
            <p className="text-xl text-neutral-400 mb-8">
              Join organizations using cutting-edge AI to dominate tournaments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all inline-flex items-center justify-center shadow-xl hover:shadow-2xl"
              >
                <LogIn className="mr-3 h-6 w-6" />
                Build with AI Today
                <ArrowRight className="ml-3 h-6 w-6" />
              </button>
              <Link
                to="/public/tournaments"
                className="bg-white/10 border-2 border-purple-700/50 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition-all inline-flex items-center justify-center"
              >
                View Live Tournaments
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </div>
            <p className="mt-6 text-neutral-500 text-sm">
              ✓ AI-Powered • ✓ Enterprise Ready • ✓ Deploy in 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <PairCraftLogo size="md" showText={true} />
              <p className="mt-4 text-neutral-400 max-w-md">
                AI-powered tournament intelligence. Professional chess tournament 
                management enhanced with machine learning.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-purple-400">Resources</h3>
              <ul className="space-y-2">
                <li><Link to="/public/tournaments" className="text-neutral-400 hover:text-purple-400 transition-colors">Tournaments</Link></li>
                <li><Link to="/public/organizations" className="text-neutral-400 hover:text-purple-400 transition-colors">Organizations</Link></li>
                <li><Link to="/register" className="text-neutral-400 hover:text-purple-400 transition-colors">Player Registration</Link></li>
                <li><Link to="/chess" className="text-neutral-400 hover:text-purple-400 transition-colors">Play Chess</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-purple-400">AI Features</h3>
              <ul className="space-y-2 text-neutral-400">
                <li>AI Pairing Engine</li>
                <li>Predictive Analytics</li>
                <li>Player Insights</li>
                <li>Smart Notifications</li>
                <li>AI Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-neutral-800 mt-8 pt-8 text-center">
            <p className="text-neutral-500">&copy; 2024 PairCraft AI. All rights reserved.</p>
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
