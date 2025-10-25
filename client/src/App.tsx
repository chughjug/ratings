import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TournamentProvider } from './contexts/TournamentContext';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { BrandingProvider } from './contexts/BrandingContext';
import Navbar from './components/Navbar';
import PWAStatus from './components/PWAStatus';
import pwaService from './services/pwaService';
import Dashboard from './pages/Dashboard';
import TournamentList from './pages/TournamentList';
import TournamentDetail from './pages/TournamentDetail';
import TournamentManager from './components/TournamentManager';
import CreateTournament from './pages/CreateTournament';
import PublicTournamentDisplay from './pages/PublicTournamentDisplay';
import BrandedPublicTournamentDisplay from './pages/BrandedPublicTournamentDisplay';
import PublicTournamentList from './pages/PublicTournamentList';
import PublicOrganizationPage from './pages/PublicOrganizationPage';
import PublicOrganizationTournament from './pages/PublicOrganizationTournament';
import OrganizationSearch from './pages/OrganizationSearch';
import OrganizationSettings from './pages/OrganizationSettings';
import OrganizationBrandingSettings from './pages/OrganizationBrandingSettings';
import Registration from './pages/Registration';
import SectionPairingPage from './pages/SectionPairingPage';
import UserProfile from './pages/UserProfile';
import LandingPage from './pages/LandingPage';
import PlayerPerformance from './components/PlayerPerformance';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/print.css';
import './styles/pairing-system.css';
import './styles/branding.css';

function App() {
  useEffect(() => {
    // Initialize PWA service
    pwaService.init();
  }, []);

  return (
    <AuthProvider>
      <TournamentProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            {/* PWA Status Component */}
            <div className="fixed bottom-4 right-4 z-50">
              <PWAStatus showDetails={false} />
            </div>
              <Routes>
                <Route path="/public/tournaments" element={<PublicTournamentList />} />
                <Route path="/public/tournaments/:id" element={<PublicTournamentDisplay />} />
                <Route path="/public/tournaments/:tournamentId/player/:playerId" element={<PlayerPerformance />} />
                <Route path="/tournaments/:tournamentId/player/:playerId" element={<PlayerPerformance />} />
                <Route path="/public/organizations" element={<OrganizationSearch />} />
                <Route path="/public/organizations/:slug" element={<PublicOrganizationPage />} />
                <Route path="/public/organizations/:slug/tournaments/:tournamentId" element={<PublicOrganizationTournament />} />
                <Route path="/register/:tournamentId" element={<Registration />} />
                <Route path="/*" element={
                  <OrganizationProvider>
                    <Routes>
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <>
                            <Navbar />
                            <main className="container mx-auto px-4 py-8">
                              <Dashboard />
                            </main>
                          </>
                        </ProtectedRoute>
                      } />
                      <Route 
                        path="/profile" 
                        element={
                          <ProtectedRoute>
                            <>
                              <Navbar />
                              <main className="container mx-auto px-4 py-8">
                                <UserProfile />
                              </main>
                            </>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/tournaments" 
                        element={
                          <ProtectedRoute>
                            <>
                              <Navbar />
                              <main className="container mx-auto px-4 py-8">
                                <TournamentList />
                              </main>
                            </>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/tournaments/new" 
                        element={
                          <ProtectedRoute>
                            <>
                              <Navbar />
                              <main className="container mx-auto px-4 py-8">
                                <CreateTournament />
                              </main>
                            </>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/tournaments/:tournamentId/pairings/:sectionName" 
                        element={
                          <ProtectedRoute>
                            <>
                              <Navbar />
                              <main className="container mx-auto px-4 py-8">
                                <SectionPairingPage />
                              </main>
                            </>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/tournaments/:id" 
                        element={
                          <ProtectedRoute>
                            <>
                              <Navbar />
                              <main className="container mx-auto px-4 py-8">
                                <TournamentDetail />
                              </main>
                            </>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/tournaments/:tournamentId/director" 
                        element={
                          <ProtectedRoute>
                            <>
                              <Navbar />
                              <main className="container mx-auto px-4 py-8">
                                <TournamentManager tournamentId={window.location.pathname.split('/')[2]} />
                              </main>
                            </>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/organizations/:id/settings" 
                        element={
                          <ProtectedRoute>
                            <OrganizationSettings />
                          </ProtectedRoute>
                        } 
                      />
                    </Routes>
                  </OrganizationProvider>
                } />
              </Routes>
            </div>
          </Router>
        </TournamentProvider>
      </AuthProvider>
  );
}

export default App;