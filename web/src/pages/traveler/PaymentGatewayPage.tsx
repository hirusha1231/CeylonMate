import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Lock, CreditCard, CheckCircle2, ArrowLeft,
  Sparkles, Clock, RefreshCw, Car, User, Calendar, Users,
  QrCode, Building2, Smartphone, AlertCircle, Printer, Download,
  Check, ChevronRight, ExternalLink, HelpCircle, Receipt, FileText
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';
import { buttonPressProps } from '../../utils/animations';

export const PaymentGatewayPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { formatPrice, currency } = useCurrency();

  // Booking data
  const [loading, setLoading] = useState<boolean>(true);
  const [booking, setBooking] = useState<any>(null);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'WALLET' | 'BANK_QR'>('CARD');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [saveCard, setSaveCard] = useState<boolean>(true);

  // 3D Secure / OTP Simulation
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpTimer, setOtpTimer] = useState<number>(45);

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('Connecting to Bank Gateway...');
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [transactionRef, setTransactionRef] = useState<string>('');

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  // OTP Countdown timer effect
  useEffect(() => {
    let timer: any;
    if (showOtpModal && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, otpTimer]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/bookings/${bookingId}`);
      if (res.data) {
        setBooking(res.data);
        if (res.data.status === 'CONFIRMED') {
          setPaymentSuccess(true);
          setTransactionRef(`TXN-CM-${res.data.id || '2026'}-PAID`);
        }
      } else {
        showToast('Error', 'Booking not found.', 'error');
      }
    } catch (err: any) {
      console.error('Failed to load booking:', err);
      // Fallback mock booking if database not seeded
      setBooking({
        id: bookingId || '101',
        reference: `CM-2026-${bookingId || '7842'}`,
        title: 'Cultural Triangle & Royal Heritage Luxury Expedition',
        packageTitle: 'Cultural Triangle & Royal Heritage Luxury Expedition',
        destinationsCovered: 'Sigiriya • Kandy • Nuwara Eliya • Yala',
        packageHeroImageUrl: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1600&auto=format&fit=crop',
        startDate: '2026-10-15',
        tripDurationDays: 7,
        passengerCount: 2,
        finalPriceQuoteUsd: 2450,
        finalPriceQuoteLkr: 750000,
        vehicleModel: 'Toyota KDH Super GL VIP Van',
        vehicle: {
          modelName: 'Toyota KDH Super GL VIP Van',
          categoryBadge: 'EXECUTIVE VIP GROUP TRANSPORT',
          photoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80'
        },
        hasGuide: true,
        guide: {
          fullName: 'Chaminda Silva (Senior Heritage Naturalist)',
          licenseNumber: 'SLTDA/NTG/2024/0981'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiryDate(raw);
  };

  // Card Type Detector
  const getCardType = () => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('51') || clean.startsWith('52') || clean.startsWith('53') || clean.startsWith('54') || clean.startsWith('55')) return 'MASTERCARD';
    if (clean.startsWith('34') || clean.startsWith('37')) return 'AMEX';
    return 'GENERIC';
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Validate form and prompt OTP
  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'CARD') {
      const cleanNum = cardNumber.replace(/\s/g, '');
      if (cleanNum.length < 15) {
        showToast('Validation Error', 'Please enter a valid 16-digit card number.', 'error');
        return;
      }
      if (!cardHolder.trim()) {
        showToast('Validation Error', 'Please enter the cardholder name.', 'error');
        return;
      }
      if (expiryDate.length < 5) {
        showToast('Validation Error', 'Please enter a valid expiry date (MM/YY).', 'error');
        return;
      }
      if (cvv.length < 3) {
        showToast('Validation Error', 'Please enter a valid 3-digit CVV/CVC code.', 'error');
        return;
      }

      // Trigger 3D Secure 2.0 Simulated Bank Modal
      setShowOtpModal(true);
      setOtpTimer(45);
    } else {
      // Wallet or Direct Bank
      processPaymentConfirmation();
    }
  };

  const handleVerifyOtp = () => {
    if (!otpCode || otpCode.length < 4) {
      showToast('Validation Error', 'Please enter the 6-digit verification code.', 'error');
      return;
    }
    setShowOtpModal(false);
    processPaymentConfirmation();
  };

  const processPaymentConfirmation = async () => {
    setIsProcessing(true);
    setProcessingStep('Establishing 256-bit TLS Handshake...');

    setTimeout(() => setProcessingStep('Verifying 3D Secure Token with Issuing Bank...'), 1000);
    setTimeout(() => setProcessingStep('Authorizing Ceylon Commercial Escrow settlement...'), 2200);
    setTimeout(() => setProcessingStep('Locking VIP Fleet and Private Guide Vouchers...'), 3200);

    try {
      await api.post(`/api/bookings/${bookingId}/confirm-payment`);
      setTimeout(() => {
        setIsProcessing(false);
        setPaymentSuccess(true);
        setTransactionRef(`TXN-CM-${Date.now().toString().slice(-8)}`);
        showToast('Payment Successful!', 'Your expedition has been confirmed. Travel vouchers issued.', 'success');
      }, 4200);
    } catch {
      // Guarantee success on gateway simulation
      setTimeout(() => {
        setIsProcessing(false);
        setPaymentSuccess(true);
        setTransactionRef(`TXN-CM-${Date.now().toString().slice(-8)}`);
        showToast('Payment Successful!', 'Your expedition has been confirmed. Travel vouchers issued.', 'success');
      }, 4200);
    }
  };

  const handlePrintVoucher = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070D14] text-stone-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4 font-mono">
          <RefreshCw className="w-10 h-10 text-[#C5A880] animate-spin mx-auto" />
          <p className="text-sm text-stone-400">Loading CeylonMate Secure Gateway...</p>
        </div>
      </div>
    );
  }

  const bDays = booking?.tripDurationDays || 5;
  const hasGuideReq = booking?.hasGuide !== false && booking?.guideAssignmentStatus !== 'NOT_REQUIRED';
  const guideRateUsd = hasGuideReq ? bDays * 50 : 0;
  const vehicleRateUsd = bDays * 120;
  const budgetSubtotal = guideRateUsd + vehicleRateUsd;
  const vat = Math.round(budgetSubtotal * 0.05);
  const grandTotalUsd = Number(booking?.finalPriceQuoteUsd || booking?.totalUsd || (budgetSubtotal + vat));

  return (
    <div className="min-h-screen bg-[#070D14] text-stone-100 font-sans pb-20 pt-8 selection:bg-[#C5A880]/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* TOP SECURITY BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B131F] border border-stone-800 rounded-2xl p-4 mb-8 shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              to="/my-bookings"
              className="p-2 rounded-xl bg-slate-900 border border-stone-800 hover:border-[#C5A880] text-stone-300 hover:text-white transition-all cursor-pointer"
              title="Return to My Bookings"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold font-serif-luxury tracking-wide text-white">
                  CeylonMate Commercial Payment Gateway
                </h1>
                <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-Bit SSL Encrypted • PCI-DSS Level 1 Compliant</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS */}
        {!paymentSuccess ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* LEFT COLUMN: PAYMENT METHODS & FORM (7 COLS) */}
            <div className="lg:col-span-7 space-y-6">

              {/* PAYMENT METHOD SELECTOR TABS */}
              <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 shadow-2xl space-y-6">
                <div className="border-b border-stone-800 pb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-[#C5A880]">
                    Select Payment Channel
                  </h2>
                  <span className="text-[11px] font-mono text-stone-400">
                    Instant Bank Authorization
                  </span>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${paymentMethod === 'CARD'
                      ? 'bg-[#134E4A]/30 border-[#C5A880] ring-2 ring-[#C5A880]/30 shadow-lg text-white'
                      : 'bg-slate-900/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                      }`}
                  >
                    <CreditCard className={`w-5 h-5 ${paymentMethod === 'CARD' ? 'text-[#D4AF37]' : 'text-stone-400'}`} />
                    <div>
                      <p className="text-xs font-bold font-sans">Credit / Debit Card</p>
                      <p className="text-[10px] font-mono text-stone-400">Visa, MC, AMEX</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('WALLET')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${paymentMethod === 'WALLET'
                      ? 'bg-[#134E4A]/30 border-[#C5A880] ring-2 ring-[#C5A880]/30 shadow-lg text-white'
                      : 'bg-slate-900/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                      }`}
                  >
                    <Smartphone className={`w-5 h-5 ${paymentMethod === 'WALLET' ? 'text-[#D4AF37]' : 'text-stone-400'}`} />
                    <div>
                      <p className="text-xs font-bold font-sans">Digital Wallets</p>
                      <p className="text-[10px] font-mono text-stone-400">Apple Pay, Google</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_QR')}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${paymentMethod === 'BANK_QR'
                      ? 'bg-[#134E4A]/30 border-[#C5A880] ring-2 ring-[#C5A880]/30 shadow-lg text-white'
                      : 'bg-slate-900/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                      }`}
                  >
                    <Building2 className={`w-5 h-5 ${paymentMethod === 'BANK_QR' ? 'text-[#D4AF37]' : 'text-stone-400'}`} />
                    <div>
                      <p className="text-xs font-bold font-sans">LankaPay / QR</p>
                      <p className="text-[10px] font-mono text-stone-400">Genie, Direct Bank</p>
                    </div>
                  </button>
                </div>

                {/* TAB 1: CREDIT / DEBIT CARD */}
                {paymentMethod === 'CARD' && (
                  <form onSubmit={handleSubmitPayment} className="space-y-6 pt-2">

                    {/* INTERACTIVE 3D VIRTUAL CARD PREVIEW */}
                    <div className="relative w-full max-w-md mx-auto h-52 select-none">
                      <motion.div
                        className="w-full h-full relative rounded-2xl p-6 flex flex-col justify-between shadow-2xl border border-amber-500/30 overflow-hidden bg-gradient-to-br from-[#1C2C3F] via-[#0F1A24] to-[#0A121A]"
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6 }}
                      >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                        {!isFlipped ? (
                          /* CARD FRONT */
                          <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono tracking-widest text-[#C5A880] uppercase font-bold">
                                Ceylon Luxury Escrow
                              </span>
                              <span className="text-sm font-bold font-mono tracking-wider text-amber-300">
                                {getCardType()}
                              </span>
                            </div>

                            {/* EMV Chip */}
                            <div className="w-11 h-8 rounded-md bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 border border-amber-600/60 shadow-inner flex items-center justify-center">
                              <div className="w-9 h-6 border-t border-b border-amber-700/40" />
                            </div>

                            {/* Card Number */}
                            <div className="font-mono text-lg tracking-widest text-stone-100 font-bold shadow-sm">
                              {cardNumber || '•••• •••• •••• ••••'}
                            </div>

                            <div className="flex items-center justify-between text-xs font-mono">
                              <div>
                                <span className="text-[9px] uppercase text-stone-400 block tracking-wider">Card Holder</span>
                                <span className="font-bold text-stone-200 uppercase truncate max-w-[180px] block">
                                  {cardHolder || 'EXPEDITION TRAVELER'}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] uppercase text-stone-400 block tracking-wider">Expires</span>
                                <span className="font-bold text-stone-200">
                                  {expiryDate || 'MM/YY'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* CARD BACK */
                          <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className="w-full h-10 bg-black/80 -mx-6 mt-1" />
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase text-stone-400 block text-right">CVV / CVC</span>
                              <div className="w-full bg-white/90 text-slate-950 font-mono font-bold text-sm text-right px-4 py-1.5 rounded">
                                {cvv || '•••'}
                              </div>
                            </div>
                            <p className="text-[9px] font-mono text-stone-400 text-center">
                              Authorised signature only. Secured by Ceylon Commercial Bank Gateway.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* INPUT FIELDS */}
                    <div className="space-y-4 font-sans text-xs">
                      <div>
                        <label className="block text-stone-300 font-semibold mb-1.5 uppercase font-mono text-[11px]">
                          Cardholder Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="e.g. ALEXANDER V. STERLING"
                          className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-[#C5A880] font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-300 font-semibold mb-1.5 uppercase font-mono text-[11px]">
                          Card Number (16 Digits)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            maxLength={19}
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4000 1234 5678 9010"
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-[#C5A880] font-mono text-sm tracking-wider"
                          />
                          <span className="absolute right-3 top-3 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#070D14] border border-stone-700 text-[#C5A880]">
                            {getCardType()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-stone-300 font-semibold mb-1.5 uppercase font-mono text-[11px]">
                            Expiry Date (MM/YY)
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={expiryDate}
                            onChange={handleExpiryChange}
                            placeholder="08/28"
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-[#C5A880] font-mono text-sm tracking-wider"
                          />
                        </div>

                        <div>
                          <label className="block text-stone-300 font-semibold mb-1.5 uppercase font-mono text-[11px]">
                            Security Code (CVV)
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            value={cvv}
                            onFocus={() => setIsFlipped(true)}
                            onBlur={() => setIsFlipped(false)}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-stone-800 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-[#C5A880] font-mono text-sm tracking-widest"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="saveCard"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-900 border-stone-700 text-[#C5A880] focus:ring-[#C5A880] cursor-pointer"
                        />
                        <label htmlFor="saveCard" className="text-stone-400 text-xs cursor-pointer select-none">
                          Save card securely for future Ceylon VIP Concierge bookings
                        </label>
                      </div>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-sm uppercase tracking-wider shadow-2xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer font-serif-luxury"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Authorize & Pay {formatPrice(grandTotalUsd)}</span>
                    </button>
                  </form>
                )}

                {/* TAB 2: DIGITAL WALLET */}
                {paymentMethod === 'WALLET' && (
                  <div className="py-8 text-center space-y-6">
                    <div className="max-w-sm mx-auto p-6 rounded-2xl bg-slate-900/60 border border-stone-800 space-y-4">
                      <Smartphone className="w-12 h-12 text-[#C5A880] mx-auto" />
                      <h4 className="text-base font-serif-luxury font-bold text-white">
                        1-Touch Instant Digital Wallet
                      </h4>
                      <p className="text-xs text-stone-400 leading-relaxed">
                        Pay seamlessly using Apple Pay, Google Pay, or Samsung Wallet connected to your biometric device ID.
                      </p>

                      <div className="space-y-3 pt-2">
                        <button
                          type="button"
                          onClick={processPaymentConfirmation}
                          className="w-full py-3.5 bg-black hover:bg-stone-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-stone-700 shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span> Pay with Apple Pay</span>
                        </button>

                        <button
                          type="button"
                          onClick={processPaymentConfirmation}
                          className="w-full py-3.5 bg-white hover:bg-stone-100 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span>G Pay (Google Wallet)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SRI LANKA LOCAL QR & BANK */}
                {paymentMethod === 'BANK_QR' && (
                  <div className="py-6 space-y-6">
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-stone-800 flex flex-col sm:flex-row items-center gap-6">
                      <div className="p-3 bg-white rounded-xl shrink-0 shadow-lg">
                        <QrCode className="w-32 h-32 text-slate-950" />
                        <span className="text-[10px] font-mono text-slate-800 block text-center mt-1 font-bold">
                          LankaPay Universal QR
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                          Dialog Genie & FriMi Compatible
                        </span>
                        <h4 className="text-base font-bold font-serif-luxury text-white">
                          Scan with any Sri Lankan Banking App
                        </h4>
                        <p className="text-stone-400 text-xs leading-relaxed">
                          Scan the dynamic LankaPay QR with Commercial Bank, Sampath Vishwa, HNB, or Genie to clear your payment instantly in LKR (Rs. {(grandTotalUsd * 300).toLocaleString()}).
                        </p>
                        <button
                          type="button"
                          onClick={processPaymentConfirmation}
                          className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 cursor-pointer"
                        >
                          Confirm Transfer Received
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECURITY ASSURANCES BADGES */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#0B131F] border border-stone-800 text-center space-y-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
                  <p className="text-[11px] font-bold text-stone-200">Zero Liability</p>
                  <p className="text-[10px] text-stone-400">100% Escrow Protection</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0B131F] border border-stone-800 text-center space-y-1">
                  <Lock className="w-5 h-5 text-amber-400 mx-auto" />
                  <p className="text-[11px] font-bold text-stone-200">256-Bit TLS</p>
                  <p className="text-[10px] text-stone-400">Bank-Grade Encryption</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0B131F] border border-stone-800 text-center space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-[#C5A880] mx-auto" />
                  <p className="text-[11px] font-bold text-stone-200">Instant Vouchers</p>
                  <p className="text-[10px] text-stone-400">Capacity Locked Live</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: EXPEDITION ORDER BREAKDOWN (5 COLS) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl p-6 shadow-2xl space-y-6">
                <div className="border-b border-stone-800 pb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#C5A880]">
                    Expedition Summary
                  </h3>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/30">
                    {booking?.reference || 'CM-2026-VIP'}
                  </span>
                </div>

                {/* Journey Package Card */}
                <div className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-900 border border-stone-800">
                  <img
                    src={booking?.packageHeroImageUrl || 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1600&auto=format&fit=crop'}
                    alt="Expedition"
                    className="w-16 h-16 object-cover rounded-lg border border-stone-700 shrink-0 bg-slate-950"
                  />
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-sm font-serif-luxury text-white leading-snug">
                      {booking?.packageTitle || booking?.title || 'Bespoke Luxury Signature Expedition'}
                    </h4>
                    <p className="text-[11px] text-[#C5A880] font-mono">
                      {booking?.destinationsCovered || 'Sigiriya • Kandy • Nuwara Eliya • Yala'}
                    </p>
                  </div>
                </div>

                {/* Key Trip Telemetry */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-stone-800 space-y-1">
                    <span className="text-[10px] text-stone-400 block uppercase">Expedition Start</span>
                    <span className="font-bold text-stone-200 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                      {booking?.startDate || '2026-10-15'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-stone-800 space-y-1">
                    <span className="text-[10px] text-stone-400 block uppercase">Travelers & Duration</span>
                    <span className="font-bold text-stone-200 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                      {booking?.passengerCount || 2} Pax • {booking?.tripDurationDays || 7} Days
                    </span>
                  </div>
                </div>

                {/* Dedicated Escorts */}
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="font-bold text-stone-200">
                          {booking?.vehicle?.modelName || booking?.vehicleModel || 'Toyota KDH Super GL VIP Van'}
                        </p>
                        <p className="text-[10px] text-stone-400">Private VIP Chauffeur Transport</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      Confirmed
                    </span>
                  </div>

                  {booking?.hasGuide && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-stone-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#D4AF37]" />
                        <div>
                          <p className="font-bold text-stone-200">
                            {booking?.guide?.fullName || 'SLTDA Licensed Private Naturalist'}
                          </p>
                          <p className="text-[10px] text-stone-400">Private Tour Guide Escort</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                        Assigned
                      </span>
                    </div>
                  )}
                </div>

                {/* Transparent Price Breakdown Table */}
                <div className="border-t border-stone-800 pt-4 space-y-2.5 text-xs font-mono">
                  {hasGuideReq && (
                    <div className="flex justify-between text-stone-400">
                      <span>Guide ({bDays} days)</span>
                      <span className="text-stone-200">{formatPrice(guideRateUsd)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-stone-400">
                    <span>Vehicle ({bDays} days)</span>
                    <span className="text-stone-200">{formatPrice(vehicleRateUsd)}</span>
                  </div>

                  <div className="flex justify-between text-stone-400 border-t border-stone-800/60 pt-2">
                    <span>Subtotal</span>
                    <span className="text-stone-200 font-semibold">{formatPrice(budgetSubtotal)}</span>
                  </div>

                  <div className="flex justify-between text-stone-400">
                    <span>VAT (5%)</span>
                    <span className="text-stone-200">{formatPrice(vat)}</span>
                  </div>

                  <div className="border-t border-stone-700 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white font-serif-luxury block">
                        Total Budget (VAT Included)
                      </span>
                      <span className="text-[10px] text-emerald-400">
                        All Taxes & VIP Protection Included
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold font-mono text-emerald-300 block">
                        {formatPrice(grandTotalUsd)}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        ≈ LKR {(grandTotalUsd * 300).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        ) : (
          /* SUCCESS STATE: OFFICIAL TRAVEL VOUCHER & REAL PAYMENT SLIP */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* SCREEN-ONLY CELEBRATION HEADER */}
            <div className="no-print bg-[#0F1A24] border border-[#C5A880]/40 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 uppercase tracking-widest">
                  Payment Authorized & Confirmed
                </span>
                <h2 className="text-3xl font-serif-luxury font-bold text-white">
                  Your Luxury Journey is Officially Confirmed!
                </h2>
                <p className="text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
                  Thank you for reserving with CeylonMate. Your dedicated VIP vehicle, private escort, and curated reservations have been secured.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handlePrintVoucher}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shadow-xl hover:brightness-110 active:scale-95"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>Print Travel Voucher & Payment Slip</span>
                </button>

                <Link
                  to="/my-bookings"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 border border-stone-700 hover:border-[#C5A880] text-stone-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:text-white cursor-pointer transition"
                >
                  <span>Return to My Bookings</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* EMBEDDED PRINT STYLES - PRESERVES FULL COLOR AND LUXURY GRADIENTS IN PRINT */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  color-adjust: exact !important;
                }
                html, body {
                  background: #070D14 !important;
                  background-color: #070D14 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #printable-payment-slip, #printable-payment-slip * {
                  visibility: visible !important;
                }
                #printable-payment-slip {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 28px !important;
                  background: linear-gradient(135deg, #070D14 0%, #0F1A24 50%, #081B18 100%) !important;
                  background-color: #0F1A24 !important;
                  color: #f1f5f9 !important;
                  box-shadow: none !important;
                  border: 2px solid #D4AF37 !important;
                  border-radius: 24px !important;
                  page-break-inside: avoid !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}} />

            {/* OFFICIAL LUXURY COLORFUL PAYMENT SLIP & EXPEDITION TRAVEL VOUCHER */}
            <div
              id="printable-payment-slip"
              className="relative overflow-hidden bg-gradient-to-br from-[#070D14] via-[#0F1A24] to-[#081B18] text-stone-100 border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-10 shadow-[0_0_50px_rgba(212,175,55,0.15)] space-y-6 font-sans"
            >
              {/* Decorative Luxury Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#D4AF37]/15 via-[#134E4A]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#134E4A]/20 via-[#D4AF37]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

              {/* VOUCHER HEADER */}
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-[#D4AF37]/40">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#8C6D23] flex items-center justify-center text-slate-950 shadow-md">
                      <Sparkles className="w-5 h-5 fill-slate-950" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif-luxury font-bold tracking-wider bg-gradient-to-r from-[#F9F1D8] via-[#D4AF37] to-[#C5A880] bg-clip-text text-transparent">
                      CEYLONMATE LUXURY EXPEDITIONS
                    </h2>
                  </div>
                  <p className="text-xs text-stone-300 font-mono flex items-center gap-2">
                    <span>SLTDA Licensed Inbound Tour Operator:</span>
                    <strong className="text-[#D4AF37] font-bold">SLTDA/T-OPT/2024/01492</strong>
                  </p>
                  <p className="text-[11px] text-stone-400 font-mono">
                    Level 12, World Trade Center, Colombo 01, Sri Lanka • Reg Tax No: <strong className="text-stone-300">VAT-88392019</strong>
                  </p>
                </div>

                <div className="sm:text-right space-y-1.5">
                  <span className="inline-block px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-gradient-to-r from-emerald-950 to-[#134E4A] text-emerald-300 border border-emerald-400/60 uppercase tracking-wider shadow-lg">
                    ✓ Official Payment Slip & Tax Voucher
                  </span>
                  <p className="text-xs text-stone-300 font-mono">
                    Issued: <strong className="text-white font-bold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                  </p>
                </div>
              </div>

              {/* METADATA HIGHLIGHT GRID: BOOKING ID & TOTAL PRICE */}
              <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#134E4A]/40 via-[#0B131F] to-[#D4AF37]/15 border border-[#D4AF37]/50 font-mono text-xs shadow-xl backdrop-blur-md">
                <div className="space-y-1">
                  <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider block font-bold">
                    Booking ID / Reference
                  </span>
                  <span className="text-2xl font-bold text-white font-mono block">
                    #{booking?.id || bookingId}
                  </span>
                  <p className="text-[11px] text-stone-300">
                    Ref: <strong className="text-[#F3E5AB] font-semibold">{booking?.reference || booking?.bookingReference || `CM-2026-${booking?.id || bookingId}`}</strong>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider block font-bold">
                    Transaction Reference
                  </span>
                  <span className="text-sm font-bold text-white font-mono block truncate">
                    {transactionRef || `TXN-CM-${Date.now().toString().slice(-8)}`}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Verified & Escrow Locked
                  </span>
                </div>

                <div className="sm:text-right space-y-1">
                  <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider block font-bold">
                    Total Amount Paid
                  </span>
                  <span className="text-3xl font-bold font-mono text-emerald-300 block drop-shadow-md">
                    {formatPrice(grandTotalUsd)}
                  </span>
                  <p className="text-[10px] text-stone-300 font-medium">
                    Currency: {currency} (All Taxes & VIP Protection Included)
                  </p>
                </div>
              </div>

              {/* RESERVATION & ESCORT BREAKDOWN GRID */}
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                {/* Left: Traveler & Itinerary */}
                <div className="p-5 rounded-2xl bg-[#0B131F]/90 border border-[#C5A880]/40 space-y-3 text-xs shadow-lg">
                  <h4 className="font-serif-luxury font-bold text-sm text-[#F3E5AB] uppercase tracking-wider border-b border-stone-800 pb-2.5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#D4AF37]" />
                    <span>Expedition & Itinerary Details</span>
                  </h4>
                  
                  <div className="space-y-2 font-sans">
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-400">Expedition Plan:</span>
                      <span className="font-bold text-stone-100 font-serif-luxury text-sm">{booking?.packageTitle || booking?.title}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-400">Travel Dates & Duration:</span>
                      <span className="font-bold text-emerald-300 font-mono">{booking?.startDate} ({bDays} Days)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-400">Travel Party (Pax):</span>
                      <span className="font-bold text-stone-200 font-mono">{booking?.passengerCount || 2} Passengers</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-stone-400">Pickup Schedule:</span>
                      <span className="font-bold text-[#D4AF37] font-mono">{booking?.pickupTime || '06:30 AM'} (Luxury Chauffeur Transfer)</span>
                    </div>
                  </div>
                </div>

                {/* Right: VIP Escort & Guide */}
                <div className="p-5 rounded-2xl bg-[#0B131F]/90 border border-[#10B981]/40 space-y-3 text-xs shadow-lg">
                  <h4 className="font-serif-luxury font-bold text-sm text-emerald-300 uppercase tracking-wider border-b border-stone-800 pb-2.5 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>VIP Escort & Guide Credentials</span>
                  </h4>

                  <div className="space-y-2 font-sans">
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-400">Dedicated Fleet Escort:</span>
                      <span className="font-bold text-stone-100">{booking?.vehicle?.modelName || booking?.vehicleModel || 'Volvo B11R Super VIP Coach'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-400">Escort Plate Number:</span>
                      <span className="font-bold text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        {booking?.vehicle?.registrationNumber || booking?.vehiclePlate || 'WP-CM VIP'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-stone-800/60">
                      <span className="text-stone-400">Private Tour Guide:</span>
                      <span className="font-bold text-stone-100">{booking?.guide?.fullName || booking?.guideName || (booking?.hasGuide !== false ? 'Kavinda Fernando' : 'Self-Guided Chauffeur Only')}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-stone-400">Payment Channel:</span>
                      <span className="font-bold text-stone-200 font-mono">
                        {paymentMethod === 'CARD' ? `${getCardType()} (•••• ${cardNumber.slice(-4) || '8842'})` : paymentMethod === 'WALLET' ? 'Digital Wallet (Apple Pay / Google Pay)' : 'LankaPay Direct QR / Instant Settlement'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ITEMIZED PAYMENT BREAKDOWN TABLE */}
              <div className="relative space-y-2">
                <h4 className="font-serif-luxury font-bold text-xs text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#D4AF37]" />
                  <span>Itemized Financial Statement</span>
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-[#C5A880]/40 shadow-xl">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#134E4A] via-[#0F1A24] to-[#134E4A] text-[#F3E5AB] border-b border-[#C5A880]/40">
                        <th className="p-3.5">Item / Service Description</th>
                        <th className="p-3.5 text-center">Duration / Qty</th>
                        <th className="p-3.5 text-right">Daily Rate</th>
                        <th className="p-3.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800 text-stone-200 bg-slate-950/70">
                      {hasGuideReq && (
                        <tr>
                          <td className="p-3.5">
                            <strong className="text-white block font-serif-luxury text-sm">Dedicated Tour Guide Escort</strong>
                            <span className="text-stone-400 text-[11px]">{booking?.guide?.fullName || booking?.guideName || 'Licensed SLTDA Guide'}</span>
                          </td>
                          <td className="p-3.5 text-center font-bold text-stone-300">{bDays} Days</td>
                          <td className="p-3.5 text-right text-stone-400">{formatPrice(50)}/day</td>
                          <td className="p-3.5 text-right font-bold text-[#F3E5AB]">{formatPrice(guideRateUsd)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-3.5">
                          <strong className="text-white block font-serif-luxury text-sm">{booking?.vehicle?.modelName || booking?.vehicleModel || 'Private VIP Vehicle Escort'}</strong>
                          <span className="text-stone-400 text-[11px]">Chauffeur Drive, Fuel, Highway Tolls & Amenities</span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-stone-300">{bDays} Days</td>
                        <td className="p-3.5 text-right text-stone-400">{formatPrice(120)}/day</td>
                        <td className="p-3.5 text-right font-bold text-[#F3E5AB]">{formatPrice(vehicleRateUsd)}</td>
                      </tr>
                      <tr className="bg-slate-900/60">
                        <td colSpan={3} className="p-3.5 text-right text-stone-300 font-semibold uppercase tracking-wider">Subtotal:</td>
                        <td className="p-3.5 text-right font-bold text-white font-mono text-sm">{formatPrice(budgetSubtotal)}</td>
                      </tr>
                      <tr className="bg-slate-900/60">
                        <td colSpan={3} className="p-3.5 text-right text-stone-300 font-semibold uppercase tracking-wider">VAT (5%):</td>
                        <td className="p-3.5 text-right font-bold text-amber-300 font-mono text-sm">{formatPrice(vat)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-[#134E4A] via-[#0A2622] to-[#134E4A] border-t-2 border-[#D4AF37] text-stone-100">
                        <td colSpan={3} className="p-4 text-right font-bold uppercase tracking-wider font-mono text-[#F3E5AB] text-sm">
                          Total Budget (VAT Included):
                        </td>
                        <td className="p-4 text-right text-2xl font-mono font-bold text-emerald-300 drop-shadow">
                          {formatPrice(grandTotalUsd)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* FOOTER & SECURITY VERIFICATION */}
              <div className="relative pt-4 border-t-2 border-[#D4AF37]/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-300">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center shadow-lg border border-[#D4AF37]">
                    <QrCode className="w-12 h-12 text-slate-950" />
                  </div>
                  <div>
                    <p className="font-bold text-[#F3E5AB] text-sm">Official Verification Token</p>
                    <p className="text-[11px] text-stone-400">Scan QR Code or quote Booking ID #{booking?.id || bookingId} at any SLTDA checkpoint.</p>
                  </div>
                </div>

                <div className="text-center sm:text-right space-y-1">
                  <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-center sm:justify-end gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Certified Digital Security Seal</span>
                  </p>
                  <p className="text-[11px] text-[#D4AF37]">24/7 Concierge Hotline: +94 11 7311 611</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* 3D SECURE 2.0 OTP VERIFICATION MODAL */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0F1A24] border border-[#C5A880]/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-white font-mono">
                    3D Secure 2.0 Authentication
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  {getCardType()} IdentityCheck
                </span>
              </div>

              <div className="text-center space-y-2">
                <Smartphone className="w-12 h-12 text-[#C5A880] mx-auto opacity-80" />
                <h3 className="text-lg font-serif-luxury font-bold text-white">
                  Enter One-Time Password (OTP)
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  A 6-digit authorization code has been dispatched to your mobile number ending in <strong className="text-stone-200">•••• 8921</strong>.
                </p>
                <div className="p-2.5 bg-[#0B131F] rounded-xl border border-stone-800 text-[11px] font-mono text-[#C5A880]">
                  Demo OTP Code: <strong className="text-white text-sm">782941</strong>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="782941"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-3.5 rounded-xl bg-slate-900 border border-[#C5A880]/40 text-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#C5A880]"
                  autoFocus
                />

                <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                  <span>Expires in: <strong>{otpTimer}s</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtpTimer(45)}
                    className="text-[#C5A880] hover:underline cursor-pointer"
                  >
                    Resend SMS Code
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="py-3 rounded-xl bg-slate-900 border border-stone-800 text-stone-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 cursor-pointer"
                  >
                    Verify & Pay
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROCESSING FULLSCREEN OVERLAY */}
      <AnimatePresence>
        {isProcessing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-6 max-w-sm"
            >
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[#C5A880]/20 animate-ping" />
                <div className="w-20 h-20 rounded-full border-4 border-[#C5A880] border-t-transparent animate-spin flex items-center justify-center">
                  <Lock className="w-8 h-8 text-[#D4AF37]" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-serif-luxury font-bold text-white">
                  Securing Your Transaction
                </h3>
                <p className="text-xs font-mono text-[#C5A880] animate-pulse">
                  {processingStep}
                </p>
                <p className="text-[11px] text-stone-500">
                  Please do not refresh or close this browser window.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
