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

// Extend Window interface for payment SDKs
declare global {
  interface Window {
    paypal?: any;
    Stripe?: any;
  }
}

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
    id?: string;
    label?: string;
    name?: string;  // For backward compatibility
    type: string;
    required: boolean;
    options?: string[];
    placeholder?: string;
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
  
  // Payment states - shopping cart style
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [stripe, setStripe] = useState<any>(null);
  const [paypalButtons, setPaypalButtons] = useState<any>(null);

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
    notes: '',
    custom_fields: {} as Record<string, any>
  });

  // Load tournament information
  useEffect(() => {
    const loadTournamentInfo = async () => {
      try {
        setSearchTerm('');
        const response = await registrationApi.getTournamentInfo(tournamentId);
        
        if (response.data.success) {
          const data: any = response.data.data;
          
          console.log('Tournament data received:', data);
          console.log('Entry fee from API:', data.entry_fee);
          console.log('Payment settings from API:', data.payment_settings);
          console.log('Full API response data:', JSON.stringify(data, null, 2));
          
          // Check if payment_settings exists and has values
          if (data.payment_settings) {
            console.log('Payment method:', data.payment_settings.payment_method);
            console.log('PayPal Client ID exists:', !!data.payment_settings.paypal_client_id);
            console.log('PayPal Client ID value:', data.payment_settings.paypal_client_id ? data.payment_settings.paypal_client_id.substring(0, 20) + '...' : 'EMPTY');
            console.log('Stripe Publishable Key exists:', !!data.payment_settings.stripe_publishable_key);
            console.log('Stripe Publishable Key value:', data.payment_settings.stripe_publishable_key ? data.payment_settings.stripe_publishable_key.substring(0, 20) + '...' : 'EMPTY');
          } else {
            console.warn('⚠️ payment_settings object is missing or empty!');
          }
          
          // Determine entry fee - use API value, fallback to $10 for testing
          let entryFee = data.entry_fee;
          if (!entryFee || entryFee === 0) {
            entryFee = 10; // Default to $10 for testing
            console.log('No entry fee found, defaulting to $10');
          }
          
          setTournamentInfo({
            id: data.id,
            name: data.name,
            format: data.format,
            rounds: data.rounds,
            start_date: data.start_date,
            end_date: data.end_date,
            entry_fee: entryFee,
            payment_enabled: true, // Always show payment if entry_fee > 0
            payment_settings: data.payment_settings || {},
            sections: data.sections,
            custom_fields: data.custom_fields,
            registration_form_settings: data.registration_form_settings,
            allow_registration: data.allow_registration
          });
          
          // Initialize payment SDKs if needed

          // Load PayPal SDK if credentials exist
          if (data.payment_settings?.paypal_client_id && data.payment_settings.paypal_client_id.trim() !== '') {
            console.log('✅ Loading PayPal SDK with Client ID:', data.payment_settings.paypal_client_id.substring(0, 20) + '...');
            loadPayPalSDK(data.payment_settings.paypal_client_id);
          } else {
            console.warn('⚠️ No PayPal Client ID found or it is empty. payment_settings:', data.payment_settings);
          }

          // Load Stripe SDK if credentials exist
          if (data.payment_settings?.stripe_publishable_key && data.payment_settings.stripe_publishable_key.trim() !== '') {
            console.log('✅ Loading Stripe SDK with Publishable Key:', data.payment_settings.stripe_publishable_key.substring(0, 20) + '...');
            loadStripeSDK(data.payment_settings.stripe_publishable_key);
          } else {
            console.warn('⚠️ No Stripe Publishable Key found or it is empty');
          }
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

  // Re-initialize payment buttons when checkout is shown
  useEffect(() => {
    if (showCheckout && tournamentInfo) {
      // Small delay to ensure container exists in DOM
      const timer = setTimeout(() => {
        // Initialize PayPal if credentials exist
        if (tournamentInfo.payment_settings?.paypal_client_id && tournamentInfo.payment_settings.paypal_client_id.trim() !== '') {
          console.log('🔄 Re-initializing PayPal button for checkout');
          initializePayPalButton(tournamentInfo.payment_settings.paypal_client_id);
        }
        
        // Initialize Stripe if credentials exist
        if (tournamentInfo.payment_settings?.stripe_publishable_key && tournamentInfo.payment_settings.stripe_publishable_key.trim() !== '') {
          console.log('🔄 Re-initializing Stripe for checkout');
          initializeStripeElements(tournamentInfo.payment_settings.stripe_publishable_key);
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [showCheckout, tournamentInfo]);

  const loadPayPalSDK = (clientId: string) => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
    
    // If SDK is already loaded, just initialize the button
    if (existingScript && window.paypal) {
      console.log('✅ PayPal SDK already loaded');
      initializePayPalButton(clientId);
      return;
    }

    // Remove old script if exists
    if (existingScript) {
      existingScript.remove();
    }

    console.log('📥 Loading PayPal SDK with Client ID:', clientId.substring(0, 20) + '...');

    // Load PayPal SDK EXACTLY like the HTML demo
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('✅ PayPal SDK loaded successfully');
      initializePayPalButton(clientId);
    };

    script.onerror = () => {
      console.error('❌ Failed to load PayPal SDK');
      setPaymentError('Failed to load PayPal payment system');
    };

    document.head.appendChild(script);
  };

  const loadStripeSDK = (publishableKey: string) => {
    // Remove old script if exists
    const oldScript = document.getElementById('stripe-sdk');
    if (oldScript) {
      oldScript.remove();
    }

    // Load Stripe.js
    const script = document.createElement('script');
    script.id = 'stripe-sdk';
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    
    script.onload = () => {
      console.log('Stripe SDK loaded');
      initializeStripeElements(publishableKey);
    };

    script.onerror = () => {
      console.error('Failed to load Stripe SDK');
    };

    document.body.appendChild(script);
  };

  const initializePayPalButton = (clientId: string) => {
    const container = document.getElementById('paypal-button-container');
    if (!container) {
      console.error('PayPal button container not found');
      return;
    }
    
    container.innerHTML = '';
    
    if (!window.paypal) {
      console.error('PayPal SDK not loaded');
      return;
    }

    console.log('Creating PayPal button...');
    
    // Use paypal.Buttons directly like the HTML demo
    window.paypal.Buttons({
      style: {
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 55
      },
      createOrder: async (data: any, actions: any) => {
        console.log('Creating PayPal order...');
        try {
          const response = await fetch('/api/payments/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: tournamentInfo?.entry_fee || 0,
              currency: 'USD',
              tournamentId,
              playerId: 'pending',
              description: `Entry fee for ${tournamentInfo?.name}`
            })
          });

          const result = await response.json();
          
          if (result.success && result.data.orderId) {
            return result.data.orderId;
          } else {
            throw new Error(result.error || 'Failed to create order');
          }
        } catch (error: any) {
          console.error('Error creating order:', error);
          setPaymentError(error.message || 'Failed to create payment order');
          throw error;
        }
      },
      onApprove: async (data: any, actions: any) => {
        console.log('PayPal payment approved');
        try {
          const details = await actions.order.capture();
          console.log('Payment captured:', details);
          
          setPaymentMethod('paypal');
          setPaymentIntentId(details.id);
          setPaymentError(null);
          setError(null);
        } catch (error: any) {
          console.error('Error capturing payment:', error);
          setPaymentError(error.message || 'Failed to capture payment');
        }
      },
      onError: (err: any) => {
        console.error('PayPal Error:', err);
        setPaymentError('Payment failed');
      },
      onCancel: (data: any) => {
        console.log('Payment cancelled');
        setPaymentError('Payment cancelled');
      }
    }).render('#paypal-button-container');
  };

  const initializeStripeElements = async (publishableKey: string) => {
    console.log('🎯 Initializing Stripe Elements with key:', publishableKey.substring(0, 20) + '...');
    
    if (!window.Stripe) {
      console.error('❌ Stripe SDK not available');
      setPaymentError('Stripe payment system failed to load. Please refresh the page.');
      return;
    }

    try {
      const stripe = window.Stripe(publishableKey);
      setStripe(stripe);
      console.log('✅ Stripe instance created');

      // We'll create the payment intent when user clicks "Pay with Stripe"
      // This avoids creating intents that might never be used
      
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      setPaymentError('Failed to initialize Stripe payment system');
    }
  };

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

  // Handle payment with Stripe - redirects to Stripe Checkout
  const handleStripePayment = async () => {
    if (!tournamentInfo?.entry_fee) {
      setPaymentError('Entry fee is not set');
      return;
    }

    try {
      setPaymentError(null);
      setProcessingPayment(true);
      console.log('💳 Starting Stripe checkout redirect...');

      // Create checkout session
      const response = await fetch('/api/payments/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: tournamentInfo.entry_fee,
          currency: 'usd',
          tournamentId,
          playerId: 'pending',
          description: `Entry fee for ${tournamentInfo.name}`,
          successUrl: `${window.location.origin}/registration/${tournamentId}?success=true&method=stripe`,
          cancelUrl: `${window.location.origin}/registration/${tournamentId}?canceled=true`
        })
      });

      const data = await response.json();
      console.log('Stripe checkout response:', data);
      
      if (data.success && data.data.checkoutUrl) {
        // Open Stripe Checkout in a new tab
        window.open(data.data.checkoutUrl, '_blank', 'noopener,noreferrer');
      } else {
        setPaymentError(data.error || 'Failed to create checkout session');
        setProcessingPayment(false);
      }
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      setPaymentError(error.message || 'Payment failed');
      setProcessingPayment(false);
    }
  };

  // Handle PayPal payment - redirects to PayPal hosted checkout
  const handlePayPalPayment = async () => {
    if (!tournamentInfo?.entry_fee) {
      setPaymentError('Entry fee is not set');
      return;
    }

    try {
      setPaymentError(null);
      setProcessingPayment(true);
      console.log('🅿️ Starting PayPal checkout redirect...');

      // Create PayPal checkout
      const response = await fetch('/api/payments/paypal/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: tournamentInfo.entry_fee,
          currency: 'USD',
          tournamentId,
          playerId: 'pending',
          description: `Entry fee for ${tournamentInfo.name}`,
          successUrl: `${window.location.origin}/registration/${tournamentId}?success=true&method=paypal`,
          cancelUrl: `${window.location.origin}/registration/${tournamentId}?canceled=true`
        })
      });

      const data = await response.json();
      console.log('PayPal checkout response:', data);
      
      if (data.success && data.data.checkoutUrl) {
        // Open PayPal hosted checkout in a new tab
        window.open(data.data.checkoutUrl, '_blank', 'noopener,noreferrer');
      } else {
        setPaymentError(data.error || 'Failed to create PayPal checkout');
        setProcessingPayment(false);
      }
    } catch (error: any) {
      console.error('PayPal payment error:', error);
      setPaymentError(error.message || 'Payment failed');
      setProcessingPayment(false);
    }
  };

  // Handle form submission - show checkout
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.player_name || !formData.email) {
      setError('Player name and email are required');
      return;
    }

    // Show checkout interface instead of submitting immediately
    setShowCheckout(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Complete checkout (with or without payment)
  const handleCheckout = async () => {
    const entryFee = tournamentInfo?.entry_fee || 0;
    
    // If there's an entry fee, require payment
    if (entryFee > 0 && !paymentIntentId) {
      setError('Please complete payment to proceed');
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
        notes: formData.notes,
        custom_fields: formData.custom_fields
      };

      // Add payment info if applicable
      if (entryFee > 0) {
        registrationData.payment_amount = entryFee;
        registrationData.payment_method = paymentMethod;
        registrationData.payment_intent_id = paymentIntentId;
      }

      console.log('Submitting registration with data:', registrationData);
      
      const response = await registrationApi.submitRegistration(registrationData);
      console.log('Registration response:', response);

      if (response.data.success) {
        setRegistrationId(response.data.data.registration_id);
        setSubmitted(true);
      } else {
        setError(response.data.error || 'Failed to submit registration');
      }
    } catch (err: any) {
      console.error('Registration submission error:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || err.message || 'Failed to submit registration');
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
              {paymentIntentId 
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
        {/* Shopping Cart Checkout Summary */}
        {showCheckout && (
          <div className="bg-white border-2 border-black rounded-lg p-6 sticky top-4 z-10">
            <div className="flex items-center mb-4">
              <Trophy className="h-6 w-6 text-black mr-2" />
              <h3 className="text-lg font-bold text-black">Checkout</h3>
            </div>

            {/* Payment Error Display */}
            {(error || paymentError) && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                <p className="text-sm font-medium">{error || paymentError}</p>
              </div>
            )}
            
            {/* Order Summary */}
            <div className="border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Tournament Entry</span>
                <span className="text-sm font-semibold text-black">
                  {tournamentInfo?.entry_fee && tournamentInfo.entry_fee > 0 
                    ? `$${tournamentInfo.entry_fee.toFixed(2)}` 
                    : 'Free'}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-2xl">
                  {tournamentInfo?.entry_fee && tournamentInfo.entry_fee > 0 
                    ? `$${tournamentInfo.entry_fee.toFixed(2)}` 
                    : '$0.00'}
                </span>
              </div>
            </div>

            {/* Payment Options or Free Checkout */}
            {tournamentInfo?.entry_fee && tournamentInfo.entry_fee > 0 ? (
              <div>
                {/* Payment Confirmed Notice */}
                {paymentIntentId ? (
                  <div className="bg-green-50 border border-green-200 rounded p-4 flex items-center mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <p className="text-sm text-green-800 flex-1">
                      Payment confirmed! ({paymentMethod?.toUpperCase()})
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">Select payment method:</p>
                    <div className="space-y-3">
                      {/* PayPal Button */}
                      {tournamentInfo?.payment_settings?.paypal_client_id && (
                        <div id="paypal-button-container"></div>
                      )}
                      
                      {!tournamentInfo?.payment_settings?.paypal_client_id && !tournamentInfo?.payment_settings?.stripe_publishable_key && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="text-sm text-yellow-800 font-semibold mb-2">
                            ⚠️ Payment System Not Configured
                          </div>
                          <div className="text-xs text-yellow-700 space-y-1">
                            <p>The tournament requires payment, but payment credentials are not set up.</p>
                            <p className="mt-2 font-medium">Please contact the tournament organizer.</p>
                          </div>
                        </div>
                      )}
                      
                      {paymentError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-3">
                          <div className="text-sm text-red-800 font-semibold mb-2 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Payment System Error
                          </div>
                          <div className="text-xs text-red-700">
                            {paymentError}
                          </div>
                        </div>
                      )}
                      
                      {/* Payment Methods */}
                      {tournamentInfo?.payment_settings?.stripe_publishable_key && (
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-2">Pay with Card</p>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod('stripe');
                              handleStripePayment();
                            }}
                            disabled={processingPayment}
                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                          >
                            {processingPayment ? (
                              <>
                                <Loader className="h-5 w-5 animate-spin mr-2" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-5 w-5 mr-2" />
                                Pay with Stripe
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      
                      {tournamentInfo?.payment_settings?.paypal_client_id && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Pay with PayPal</p>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod('paypal');
                              handlePayPalPayment();
                            }}
                            disabled={processingPayment}
                            className="w-full flex items-center justify-center px-4 py-3 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50 font-medium"
                          >
                            {processingPayment ? (
                              <>
                                <Loader className="h-5 w-5 animate-spin mr-2" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <span className="mr-2">🅿️</span>
                                Pay with PayPal
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center py-2">
                No payment required for this tournament
              </p>
            )}

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || Boolean(tournamentInfo?.entry_fee && tournamentInfo.entry_fee > 0 && !paymentIntentId)}
              className="w-full mt-4 bg-black text-white py-3 px-6 rounded font-bold hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-white mr-2"></div>
                  Completing Registration...
                </div>
              ) : tournamentInfo?.entry_fee && tournamentInfo.entry_fee > 0 ? (
                paymentIntentId ? 'Complete Registration' : 'Pay to Complete'
              ) : (
                'Complete Registration'
              )}
            </button>
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

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded bg-white max-h-48 overflow-y-auto">
              {searchResults.map((player, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      player_name: player.name,
                      uscf_id: player.uscf_id || player.memberId || '',
                      rating: player.rating ? Number(player.rating) : '',
                      email: player.email || prev.email,
                      phone: player.phone || prev.phone
                    }));
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-black">{player.name}</div>
                  <div className="text-sm text-gray-600">
                    USCF ID: {player.uscf_id || player.memberId || 'N/A'} • 
                    {player.state && ` ${player.state} •`}
                    {player.rating && ` Rating: ${player.rating}`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected Player Display */}
          {formData.player_name && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800 text-sm">Selected Player:</p>
                  <p className="text-sm text-green-700">
                    {formData.player_name}
                    {formData.uscf_id && ` • USCF ID: ${formData.uscf_id}`}
                    {formData.rating && ` • Rating: ${formData.rating}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, player_name: '', uscf_id: '', rating: '' }))}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
        </div>

        {/* Player Information */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Player Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Player Name *
              </label>
              <input
                type="text"
                required
                value={formData.player_name}
                onChange={(e) => setFormData(prev => ({ ...prev, player_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                US Chess ID
              </label>
              <input
                type="text"
                value={formData.uscf_id}
                onChange={(e) => setFormData(prev => ({ ...prev, uscf_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Enter your USCF ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <input
                type="number"
                value={formData.rating || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value ? parseInt(e.target.value) : '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Enter your rating"
                min="0"
                max="3000"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Playing Section */}
        {tournamentInfo.sections && tournamentInfo.sections.length > 0 && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h3 className="text-lg font-semibold text-black mb-3">Playing Section</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select your preferred section. The Tournament Director reserves the right to adjust section assignments.
            </p>
            
            <select
              value={formData.section}
              onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="">- select one -</option>
              {tournamentInfo.sections.map((section, index) => (
                <option key={index} value={section.name}>
                  {section.name}
                  {section.min_rating && section.max_rating && 
                    ` (${section.min_rating} - ${section.max_rating})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bye Requests */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <h3 className="text-lg font-semibold text-black mb-3">Request BYE(s)</h3>
          <p className="text-sm text-gray-600 mb-4">
            A "bye" is a request to skip a round. Do not select a bye if you intend to be present for all games.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Array.from({ length: tournamentInfo.rounds }, (_, i) => i + 1).map((round) => (
              <label key={round} className="flex items-center space-x-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.bye_requests.includes(round)}
                  onChange={() => {
                    setFormData(prev => ({
                      ...prev,
                      bye_requests: prev.bye_requests.includes(round)
                        ? prev.bye_requests.filter(r => r !== round)
                        : [...prev.bye_requests, round]
                    }));
                  }}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm font-medium">Rd. {round}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Fields */}
        {tournamentInfo.custom_fields && tournamentInfo.custom_fields.length > 0 && (
          <div className="bg-white border border-gray-200 rounded p-6">
            <h3 className="text-lg font-semibold text-black mb-4">Additional Information</h3>
            
            <div className="space-y-4">
              {tournamentInfo.custom_fields.map((field, index) => {
                // Use label as the field identifier (or fallback to label for key)
                const fieldKey = field.label || field.name || `field_${index}`;
                const fieldLabel = field.label || field.name || '';
                
                return (
                  <div key={field.id || index}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fieldLabel} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        value={formData.custom_fields[fieldKey] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          custom_fields: { ...prev.custom_fields, [fieldKey]: e.target.value }
                        }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                        placeholder={field.placeholder || `Enter ${fieldLabel.toLowerCase()}`}
                      />
                    ) : field.type === 'select' && field.options ? (
                      <select
                        required={field.required}
                        value={formData.custom_fields[fieldKey] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          custom_fields: { ...prev.custom_fields, [fieldKey]: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                      >
                        <option value="">- select -</option>
                        {field.options.map((option, optIndex) => (
                          <option key={optIndex} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.custom_fields[fieldKey] || false}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            custom_fields: { ...prev.custom_fields, [fieldKey]: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm text-gray-700">I agree</span>
                      </label>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        required={field.required}
                        value={formData.custom_fields[fieldKey] || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          custom_fields: { ...prev.custom_fields, [fieldKey]: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                        placeholder={field.placeholder || `Enter ${fieldLabel.toLowerCase()}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional Notes */}
        <div className="bg-white border border-gray-200 rounded p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
            placeholder="Any additional information or special requests..."
          />
        </div>

        {/* Continue to Checkout Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting || !formData.player_name || !formData.email}
            className="w-full bg-black text-white py-3 px-6 rounded font-bold hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {showCheckout ? (
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                View Cart Above
              </div>
            ) : (
              <>
                <Trophy className="h-5 w-5 inline mr-2" />
                Review & Checkout
              </>
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default RegistrationFormWithPayment;

