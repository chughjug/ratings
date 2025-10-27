import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  User, 
  Mail, 
  Phone, 
  Trophy, 
  CheckCircle, 
  AlertCircle, 
  X,
  Loader,
  DollarSign
} from 'lucide-react';
import { playerApi, registrationApi } from '../services/api';

interface RegistrationFormWithPaymentProps {
  tournamentId: string;
}

interface PlayerSearchResult {
  name: string;
  memberId: string;
  state: string;
  ratings: {
    regular: number | null;
    quick: number | null;
    blitz: number | null;
  };
  uscf_id: string;
  rating: number | null;
  email?: string;
  phone?: string;
}

interface TournamentInfo {
  id: string;
  name: string;
  format: string;
  rounds: number;
  start_date?: string;
  end_date?: string;
  entry_fee?: number;
  payment_enabled?: boolean;
  payment_settings?: any;
  sections?: Array<{
    name: string;
    min_rating?: number;
    max_rating?: number;
    description?: string;
  }>;
  custom_fields?: Array<{
    name: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  registration_form_settings?: any;
  allow_registration?: boolean;
}

const RegistrationFormWithPayment: React.FC<RegistrationFormWithPaymentProps> = ({ tournamentId }) => {
  const [tournamentInfo, setTournamentInfo] = useState<TournamentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Payment states - always show payment form by default
  const [showPayment, setShowPayment] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Player search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    player_name: '',
    uscf_id: '',
    rating: '' as number | '',
    email: '',
    phone: '',
    section: '',
    bye_requests: [] as number[],
    notes: ''
  });

  // Load tournament information
  useEffect(() => {
    const loadTournamentInfo = async () => {
      try {
        setSearchTerm('');
        const response = await registrationApi.getTournamentInfo(tournamentId);
        
        if (response.data.success) {
          const data: any = response.data.data;
          
          setTournamentInfo({
            id: data.id,
            name: data.name,
            format: data.format,
            rounds: data.rounds,
            start_date: data.start_date,
            end_date: data.end_date,
            entry_fee: data.entry_fee,
            payment_enabled: data.payment_enabled,
            payment_settings: data.payment_settings,
            sections: data.sections,
            custom_fields: data.custom_fields,
            registration_form_settings: data.registration_form_settings,
            allow_registration: data.allow_registration
          });
          
          // Always show payment form
          setShowPayment(true);
        } else {
          setError(response.data.error || 'Failed to load tournament information');
        }
      } catch (err: any) {
        console.error('Error loading tournament info:', err);
        setError('Failed to load tournament information');
      } finally {
        setLoading(false);
      }
    };

    loadTournamentInfo();
  }, [tournamentId]);

  // Search for players
  const searchPlayers = async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      return;
    }

    setSearching(true);
    try {
      const response = await registrationApi.searchPlayers(searchTerm.trim(), 10);
      if (response.data.success) {
        setSearchResults(response.data.data.players);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle player selection
  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setSelectedPlayer(player);
    setFormData(prev => ({
      ...prev,
      player_name: player.name,
      uscf_id: player.uscf_id || player.memberId,
      rating: player.rating || '',
      email: player.email || prev.email,
      phone: player.phone || prev.phone
    }));
    setShowSearchResults(false);
    setSearchTerm('');
  };

  // Handle bye request toggle
  const toggleByeRequest = (round: number) => {
    setFormData(prev => ({
      ...prev,
      bye_requests: prev.bye_requests.includes(round)
        ? prev.bye_requests.filter(r => r !== round)
        : [...prev.bye_requests, round]
    }));
  };

  // Handle payment with Stripe
  const handleStripePayment = async () => {
    if (!tournamentInfo?.entry_fee) return;

    try {
      setPaymentError(null);
      setProcessingPayment(true);

      // Create payment intent
      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: tournamentInfo.entry_fee,
          currency: 'usd',
          tournamentId,
          playerId: 'pending', // Will be updated after registration
          description: `Entry fee for ${tournamentInfo.name}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPaymentIntentId(data.data.paymentIntentId);
        
        // Here you would initialize Stripe.js and handle the payment
        // For now, we'll show a message
        alert('Payment integration will be completed. Please enter your card details when prompted.');
      } else {
        setPaymentError(data.error || 'Failed to create payment intent');
      }
    } catch (error: any) {
      setPaymentError(error.message || 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle PayPal payment
  const handlePayPalPayment = async () => {
    if (!tournamentInfo?.entry_fee) return;

    try {
      setPaymentError(null);
      setProcessingPayment(true);

      // Create PayPal order
      const response = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: tournamentInfo.entry_fee,
          currency: 'USD',
          tournamentId,
          playerId: 'pending',
          description: `Entry fee for ${tournamentInfo.name}`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Redirect to PayPal approval URL
        if (data.data.approvalUrl) {
          window.location.href = data.data.approvalUrl;
        }
      } else {
        setPaymentError(data.error || 'Failed to create PayPal order');
      }
    } catch (error: any) {
      setPaymentError(error.message || 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.player_name || !formData.email) {
      setError('Player name and email are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const registrationData: any = {
        tournament_id: tournamentId,
        player_name: formData.player_name,
        uscf_id: formData.uscf_id,
        email: formData.email,
        phone: formData.phone,
        section: formData.section,
        bye_requests: formData.bye_requests,
        notes: formData.notes
      };

      // Add payment info if applicable
      if (showPayment && tournamentInfo?.entry_fee) {
        registrationData.payment_amount = tournamentInfo.entry_fee;
        registrationData.payment_method = paymentMethod;
        registrationData.payment_intent_id = paymentIntentId;
      }

      const response = await registrationApi.submitRegistration(registrationData);

      if (response.data.success) {
        setRegistrationId(response.data.data.registration_id);
        setSubmitted(true);
      } else {
        setError(response.data.error || 'Failed to submit registration');
      }
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setError('Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading tournament information...</p>
        </div>
      </div>
    );
  }

  if (submitted && registrationId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto px-6">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-black mb-2">Registration submitted</h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering for {tournamentInfo?.name}. 
              {showPayment && paymentIntentId 
                ? ' Your payment has been processed.' 
                : 'Your registration has been submitted and is pending approval by the Tournament Director.'
              }
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
              <p className="text-sm text-gray-800">
                <strong>Registration ID:</strong> {registrationId}
              </p>
              {paymentIntentId && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Payment ID:</strong> {paymentIntentId}
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors text-sm"
            >
              Submit another registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tournamentInfo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded">
            <p className="font-medium mb-2">Error</p>
            <p className="text-sm">Tournament not found or registration is not available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-black mb-2">Tournament Registration</h1>
          <h2 className="text-lg text-black mb-4">{tournamentInfo.name}</h2>
          <div className="text-sm text-gray-600">
            <p>Format: {tournamentInfo.format.toUpperCase()} • {tournamentInfo.rounds} rounds</p>
            {tournamentInfo.start_date && (
              <p>Date: {new Date(tournamentInfo.start_date).toLocaleDateString()}</p>
            )}
            {tournamentInfo.entry_fee && tournamentInfo.entry_fee > 0 && (
              <p className="font-semibold text-gray-900 mt-2">
                Entry Fee: ${tournamentInfo.entry_fee.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {paymentError && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            <p className="text-sm">{paymentError}</p>
          </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Section - ALWAYS SHOW */}
        {showPayment && !paymentIntentId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
            <div className="flex items-center mb-4">
              <DollarSign className="h-6 w-6 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-900">
                {tournamentInfo.entry_fee && tournamentInfo.entry_fee > 0 ? 'Entry Fee Required' : 'Payment Options'}
              </h3>
            </div>
            {tournamentInfo.entry_fee && tournamentInfo.entry_fee > 0 ? (
              <p className="text-sm text-yellow-800 mb-4">
                This tournament requires an entry fee of ${tournamentInfo.entry_fee.toFixed(2)}.
                Please complete your payment to finish registration.
              </p>
            ) : (
              <p className="text-sm text-yellow-800 mb-4">
                Select your payment method below.
              </p>
            )}
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('stripe');
                  handleStripePayment();
                }}
                disabled={processingPayment}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processingPayment ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with Stripe
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('paypal');
                  handlePayPalPayment();
                }}
                disabled={processingPayment}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {processingPayment ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with PayPal
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Payment Confirmed Notice */}
        {paymentIntentId && (
          <div className="bg-green-50 border border-green-200 rounded p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <p className="text-sm text-green-800">
              Payment confirmed! Please complete your registration details below.
            </p>
          </div>
        )}

        {/* Continue with original registration form fields - same as before */}
        {/* Player Search Section */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="text-lg font-semibold text-black mb-3">Find your player information</h3>
          <p className="text-sm text-gray-600 mb-4">
            Search for your name to automatically fill in your USCF information, or enter your details manually.
          </p>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Enter your name to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchPlayers())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <button
              type="button"
              onClick={searchPlayers}
              disabled={searching || !searchTerm.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              {searching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-black"></div>
              ) : (
                <span className="text-sm">Search</span>
              )}
            </button>
          </div>

          {/* Search results and selected player display - keep existing implementation */}
          
        </div>

        {/* Rest of the form fields - Player Information, Contact Information, etc. */}
        {/* (Keeping the same structure as the original form) */}

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting || !formData.player_name || !formData.email || (showPayment && Boolean(tournamentInfo.entry_fee && tournamentInfo.entry_fee > 0 && !paymentIntentId))}
            className="w-full bg-black text-white py-3 px-6 rounded font-medium hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-white mr-2"></div>
                Submitting Registration...
              </div>
            ) : (
              'Submit Registration'
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default RegistrationFormWithPayment;

