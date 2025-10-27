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
        <div className="absolute inset-0 bg-grid-neutral-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        
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
            
            <div className="hidden lg:block relative">
              <div className="relative transform hover:scale-[1.02] transition-transform duration-300 bg-white rounded-2xl shadow-2xl p-8 border border-neutral-200">
                <div className="absolute -top-6 -right-6 text-white px-4 py-2 text-sm font-bold shadow-2xl flex items-center gap-2"
                     style={{ 
                       background: 'linear-gradient(135deg, #2d5016, #1a5c1a)',
                       border: '3px double #d4af37',
                       boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
                     }}>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ boxShadow: '0 0 8px #d4af37' }}></div>
                  Live Tournament
                </div>
                
                <div className="mb-6 p-6" style={{ background: 'rgba(139, 69, 19, 0.2)', border: '3px double #8b4513' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-3xl mb-2" style={{ color: '#3d2415', fontFamily: 'serif' }}>Spring Championship 2024</h3>
                      <p className="text-sm text-stone-700 font-semibold">March 15-17, San Francisco</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-amber-900 font-serif">156</div>
                      <div className="text-xs text-stone-700 font-semibold">Players</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 font-bold" style={{ background: '#f4e4bc', border: '2px solid #8b4513' }}>
                      <div className="text-xl text-amber-900 font-serif">Round 4</div>
                      <div className="text-xs text-stone-700 mt-1">Current</div>
                    </div>
                    <div className="text-center p-3 font-bold" style={{ background: '#f4e4bc', border: '2px solid #8b4513' }}>
                      <div className="text-xl text-amber-900 font-serif">89%</div>
                      <div className="text-xs text-stone-700 mt-1">Complete</div>
                    </div>
                    <div className="text-center p-3 font-bold" style={{ background: '#f4e4bc', border: '2px solid #8b4513' }}>
                      <div className="text-xl text-amber-900 font-serif">$2.5K</div>
                      <div className="text-xs text-stone-700 mt-1">Prize Fund</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 font-semibold" style={{ background: 'rgba(139, 69, 19, 0.2)', border: '2px solid #8b4513' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center text-white font-bold text-sm"
                           style={{ background: 'linear-gradient(135deg, #8b4513, #a0522d)', border: '2px solid #d4af37' }}>
                        P1
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 font-serif">Alexander Smith</div>
                        <div className="text-xs text-stone-700">2450 FIDE</div>
                      </div>
                    </div>
                    <div className="text-center text-stone-600 font-bold">vs</div>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-bold text-gray-900 text-right font-serif">Emma Johnson</div>
                        <div className="text-xs text-stone-700 text-right">2410 FIDE</div>
                      </div>
                      <div className="w-10 h-10 flex items-center justify-center text-white font-bold text-sm"
                           style={{ background: 'linear-gradient(135deg, #2d5016, #1a5c1a)', border: '2px solid #d4af37' }}>
                        P2
                      </div>
                    </div>
                    <div className="text-white px-3 py-1.5 text-sm font-bold"
                         style={{ background: 'linear-gradient(135deg, #8b4513, #a0522d)', border: '2px solid #d4af37' }}>
                      Board 1
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4" style={{ background: 'rgba(139, 69, 19, 0.1)', border: '2px solid #8b4513' }}>
                    <span className="font-bold text-gray-900 font-serif">Player 3</span>
                    <span className="text-stone-600 font-bold">vs</span>
                    <span className="font-bold text-gray-900 font-serif">Player 4</span>
                    <span className="px-3 py-1.5 text-sm font-bold text-amber-900"
                          style={{ background: '#f4e4bc', border: '2px solid #8b4513' }}>
                      Board 2
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4" style={{ background: 'rgba(139, 69, 19, 0.1)', border: '2px solid #8b4513' }}>
                    <span className="font-bold text-gray-900 font-serif">Player 5</span>
                    <span className="text-stone-600 font-bold">vs</span>
                    <span className="font-bold text-gray-900 font-serif">Player 6</span>
                    <span className="px-3 py-1.5 text-sm font-bold text-amber-900"
                          style={{ background: '#f4e4bc', border: '2px solid #8b4513' }}>
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
      <section className="py-12" style={{ background: 'rgba(139, 69, 19, 0.1)', borderTop: '3px double #c9a961', borderBottom: '3px double #c9a961' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2 font-serif" style={{ color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                500+
              </div>
              <div className="text-amber-300 font-bold">Active Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2 font-serif" style={{ color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                50K+
              </div>
              <div className="text-amber-300 font-bold">Tournaments Managed</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2 font-serif" style={{ color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                2M+
              </div>
              <div className="text-amber-300 font-bold">Players Registered</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2 font-serif" style={{ color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                99.9%
              </div>
              <div className="text-amber-300 font-bold">Uptime Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20" style={{ background: 'linear-gradient(to bottom, #2d1b13, #1a0f0a)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 font-serif" style={{ color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              Everything You Need to Run Successful Tournaments
            </h2>
            <p className="text-xl text-amber-300/90 max-w-3xl mx-auto" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              Powerful tools designed specifically for chess tournament directors 
              to save time, eliminate errors, and provide exceptional player experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 transition-all hover:scale-105" style={{ 
              background: 'linear-gradient(135deg, #f4e4bc, #e8d5b7)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="w-14 h-14 flex items-center justify-center mb-6" style={{ 
                background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                border: '3px solid #d4af37',
                boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
              }}>
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif" style={{ color: '#3d2415' }}>
                Automated Swiss Pairings
              </h3>
              <p className="leading-relaxed text-stone-800" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>
                Advanced algorithms for perfect Swiss system pairings with USCF compliance. 
                Automatic bye handling, color equalization, and top player protection.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Burstein pairing algorithm
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Quad tournament support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Team Swiss format
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="p-8 transition-all hover:scale-105" style={{ 
              background: 'linear-gradient(135deg, #f4e4bc, #e8d5b7)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="w-14 h-14 flex items-center justify-center mb-6" style={{ 
                background: 'linear-gradient(135deg, #2d5016, #1a5c1a)',
                border: '3px solid #d4af37',
                boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
              }}>
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif" style={{ color: '#3d2415' }}>
                Comprehensive Player Management
              </h3>
              <p className="leading-relaxed text-stone-800" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>
                Import players from CSV, Google Forms, or manage manually. 
                Automatic USCF rating lookup, player profiles, and registration management.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  CSV & Google Forms import
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  USCF rating lookup
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Player analytics & stats
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="p-8 transition-all hover:scale-105" style={{ 
              background: 'linear-gradient(135deg, #f4e4bc, #e8d5b7)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="w-14 h-14 flex items-center justify-center mb-6" style={{ 
                background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                border: '3px solid #d4af37',
                boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
              }}>
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif" style={{ color: '#3d2415' }}>
                Real-Time Standings & Analytics
              </h3>
              <p className="leading-relaxed text-stone-800" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>
                Live tournament standings with multiple tiebreaker systems. 
                Detailed analytics, performance tracking, and printable reports.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Live score updates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Multiple tiebreakers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Export to PDF
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="p-8 transition-all hover:scale-105" style={{ 
              background: 'linear-gradient(135deg, #f4e4bc, #e8d5b7)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="w-14 h-14 flex items-center justify-center mb-6" style={{ 
                background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                border: '3px solid #d4af37',
                boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
              }}>
                <Bell className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif" style={{ color: '#3d2415' }}>
                Automated Email Notifications
              </h3>
              <p className="leading-relaxed text-stone-800" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>
                Send automated pairing announcements, results, and standings 
                to all players. White-label email support with custom branding.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Custom email templates
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Webhook integration
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Bulk notifications
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="p-8 transition-all hover:scale-105" style={{ 
              background: 'linear-gradient(135deg, #f4e4bc, #e8d5b7)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="w-14 h-14 flex items-center justify-center mb-6" style={{ 
                background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                border: '3px solid #d4af37',
                boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
              }}>
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif" style={{ color: '#3d2415' }}>
                Public Tournament Pages
              </h3>
              <p className="leading-relaxed text-stone-800" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>
                Branded public pages for your organization. Embed tournaments 
                in your website with iframes. Professional player registration.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Custom branding
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Embedded tournament widgets
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Public registration
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="p-8 transition-all hover:scale-105" style={{ 
              background: 'linear-gradient(135deg, #f4e4bc, #e8d5b7)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="w-14 h-14 flex items-center justify-center mb-6" style={{ 
                background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                border: '3px solid #d4af37',
                boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
              }}>
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif" style={{ color: '#3d2415' }}>
                Secure & Reliable
              </h3>
              <p className="leading-relaxed text-stone-800" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.3)' }}>
                Enterprise-grade security with automated backups, data encryption, 
                and GDPR compliance. Your tournament data is always safe.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-stone-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  Automatic backups
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  SSL encryption
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" style={{ color: '#2d5016' }} />
                  99.9% uptime guarantee
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20" style={{ background: 'linear-gradient(to bottom, #1a0f0a, #2d1b13)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 font-serif" style={{ color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              Get Started in Minutes
            </h2>
            <p className="text-xl text-amber-300/90" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              Running tournaments has never been easier
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-2xl"
                   style={{ 
                     background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                     border: '4px solid #d4af37',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
                   }}>
                1
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif text-amber-300">Sign Up</h3>
              <p className="text-amber-300/80" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                Create your account in seconds. No credit card required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-2xl"
                   style={{ 
                     background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                     border: '4px solid #d4af37',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
                   }}>
                2
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif text-amber-300">Create Tournament</h3>
              <p className="text-amber-300/80" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                Set up your tournament, import players, and configure settings.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-2xl"
                   style={{ 
                     background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                     border: '4px solid #d4af37',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
                   }}>
                3
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif text-amber-300">Generate Pairings</h3>
              <p className="text-amber-300/80" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                Click one button to generate perfect Swiss pairings automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-2xl"
                   style={{ 
                     background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                     border: '4px solid #d4af37',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
                   }}>
                4
              </div>
              <h3 className="text-xl font-bold mb-3 font-serif text-amber-300">Run Tournament</h3>
              <p className="text-amber-300/80" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                Record results, update standings, and let players follow along.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-white px-8 py-4 text-lg font-bold transition-all inline-flex items-center shadow-xl transform hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                border: '3px double #d4af37',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
              }}
            >
              Get Started Now - It's Free
              <ArrowRight className="ml-3 h-6 w-6" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="testimonials" className="py-20 text-white" style={{ background: 'radial-gradient(ellipse at center, #2d1b13 0%, #1a0f0a 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6 font-serif" style={{ color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              Trusted by Tournament Directors
            </h2>
            <p className="text-xl text-amber-300/90 max-w-3xl mx-auto" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              Join hundreds of chess clubs and organizations using PairCraft 
              to run their tournaments every week.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="p-6" style={{ 
              background: 'rgba(139, 69, 19, 0.3)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center text-white font-bold" style={{ 
                  background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                  border: '3px solid #d4af37',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
                }}>
                  JD
                </div>
                <div className="ml-4">
                  <div className="font-bold font-serif text-amber-200">John Davis</div>
                  <div className="text-sm text-amber-300/70">Chess Club Director</div>
                </div>
              </div>
              <p className="text-amber-200 italic" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                "PairCraft has completely transformed how we run tournaments. 
                What used to take hours now takes minutes. Our players love 
                the real-time updates."
              </p>
            </div>

            <div className="p-6" style={{ 
              background: 'rgba(139, 69, 19, 0.3)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center text-white font-bold" style={{ 
                  background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                  border: '3px solid #d4af37',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
                }}>
                  SM
                </div>
                <div className="ml-4">
                  <div className="font-bold font-serif text-amber-200">Sarah Martinez</div>
                  <div className="text-sm text-amber-300/70">Tournament Organizer</div>
                </div>
              </div>
              <p className="text-amber-200 italic" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                "The Swiss pairing algorithm is flawless. I no longer worry 
                about pairing mistakes. Everything is automated and perfect 
                every time."
              </p>
            </div>

            <div className="p-6" style={{ 
              background: 'rgba(139, 69, 19, 0.3)',
              border: '4px solid #8b4513',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.2), 0 8px 16px rgba(0,0,0,0.6)',
              clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
            }}>
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center text-white font-bold" style={{ 
                  background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                  border: '3px solid #d4af37',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
                }}>
                  MR
                </div>
                <div className="ml-4">
                  <div className="font-bold font-serif text-amber-200">Michael Rodriguez</div>
                  <div className="text-sm text-amber-300/70">Chess School Founder</div>
                </div>
              </div>
              <p className="text-amber-200 italic" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                "The public tournament pages are a game-changer. Parents can 
                follow their kids' games in real-time. Highly recommended!"
              </p>
            </div>
          </div>

          <div className="p-8 text-center" style={{ 
            background: 'rgba(139, 69, 19, 0.2)',
            border: '6px double #d4af37',
            boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.3), 0 8px 16px rgba(0,0,0,0.6)',
            clipPath: 'polygon(2% 0%, 98% 0%, 100% 2%, 100% 98%, 98% 100%, 2% 100%, 0% 98%, 0% 2%)'
          }}>
            <h3 className="text-3xl font-bold mb-4 font-serif" style={{ color: '#d4af37', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              Ready to Transform Your Tournaments?
            </h3>
            <p className="text-xl text-amber-300/90 mb-8" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              Join the tournament directors who have already made the switch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-white px-8 py-4 text-lg font-bold transition-all inline-flex items-center justify-center shadow-xl transform hover:scale-105"
                style={{ 
                  background: 'linear-gradient(135deg, #8b4513, #a0522d)',
                  border: '3px double #d4af37',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.6)'
                }}
              >
                <LogIn className="mr-3 h-6 w-6" />
                Start Running Tournaments Today
                <ArrowRight className="ml-3 h-6 w-6" />
              </button>
              <Link
                to="/public/tournaments"
                className="text-amber-200 px-8 py-4 text-lg font-bold transition-all inline-flex items-center justify-center border-2"
                style={{ 
                  background: 'rgba(139, 69, 19, 0.3)',
                  borderColor: '#d4af37',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                }}
              >
                View Live Tournaments
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </div>
            <p className="mt-6 text-amber-300/80 text-sm font-semibold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              ✓ Free forever • ✓ No credit card • ✓ Setup in 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-12" style={{ 
        background: 'linear-gradient(to bottom, #1a0f0a, #0a0503)',
        borderTop: '3px double #c9a961'
      }}>
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
              <h3 className="text-lg font-semibold mb-4 font-serif" style={{ color: '#d4af37', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Resources</h3>
              <ul className="space-y-2">
                <li><Link to="/public/tournaments" className="text-amber-300/70 hover:text-amber-200 transition-colors font-semibold">Tournaments</Link></li>
                <li><Link to="/public/organizations" className="text-amber-300/70 hover:text-amber-200 transition-colors font-semibold">Organizations</Link></li>
                <li><Link to="/register" className="text-amber-300/70 hover:text-amber-200 transition-colors font-semibold">Player Registration</Link></li>
                <li><Link to="/chess" className="text-amber-300/70 hover:text-amber-200 transition-colors font-semibold">Play Chess</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 font-serif" style={{ color: '#d4af37', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Features</h3>
              <ul className="space-y-2 text-amber-300/70 font-semibold">
                <li>Swiss System Pairings</li>
                <li>Real-time Standings</li>
                <li>Player Management</li>
                <li>Email Notifications</li>
                <li>Public Tournament Pages</li>
              </ul>
            </div>
          </div>
          <div className="border-t-2 mt-8 pt-8 text-center" style={{ borderColor: '#c9a961' }}>
            <p className="text-amber-300/70 font-semibold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>&copy; 2024 PairCraft. All rights reserved.</p>
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

