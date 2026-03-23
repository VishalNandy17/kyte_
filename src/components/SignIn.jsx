"use client"
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Link, useNavigate as useRouter } from "react-router-dom";
import { Shield } from 'lucide-react';
import useStore from '../store/useStore';
import { connectWallet } from '../services/wallet';
import { issueKyteToken } from '../services/kyteApi';

export default function SignIn() {
  const router = useRouter();
  const { setWalletAddress, setJwtToken } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // After authentication, check if user has a role saved in Supabase
  const navigateByRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!profile?.role) {
      router('/select-role');
    } else if (profile.role === 'client') {
      router('/dashboard/client');
    } else {
      router('/dashboard/developer');
    }
  };

  const handlePeraConnect = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const address = await connectWallet();
      if (address) {
        setWalletAddress(address);
        setErrorMessage("Please check your Pera Wallet app to approve the signature...");
        try {
          const token = await issueKyteToken(address);
          setJwtToken(token);
          await navigateByRole();
        } catch (e) {
          console.error("Auth failed", e);
          setErrorMessage(e.message || "Failed to issue session token. Check backend.");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        setErrorMessage("Wallet connection was cancelled or failed.");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Wallet connection failed.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/signin?provider=google`
      }
    });
    if (error) {
      console.error('Error signing in:', error.message);
      setErrorMessage(error.message || 'Unable to sign in. Please try again.');
      setIsLoading(false);
    }
    // Navigation happens via the useEffect below after OAuth redirect
  };

  // Handle OAuth redirect back — check session + navigate
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        await navigateByRole();
      }
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cursor glow tracking
  useEffect(() => {
    const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="signin-page">
      {/* Dynamic cursor glow */}
      <div
        className="signin-cursor-glow"
        style={{
          left: mousePos.x,
          top: mousePos.y,
        }}
      />

      {/* Ambient background orbs */}
      <div className="signin-orb signin-orb-1" />
      <div className="signin-orb signin-orb-2" />
      <div className="signin-orb signin-orb-3" />

      {/* Dot grid overlay */}
      <div className="signin-dot-grid" />

      {/* Split layout */}
      <div className="signin-layout">

        {/* ── Left Panel ── */}
        <motion.div
          className="signin-left"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Brand */}
          <div className="signin-brand">
            <div className="signin-brand-mark">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="url(#hexGrad)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 6V18" stroke="url(#hexGrad)" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 10L12 14L16 10" stroke="url(#hexGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="hexGrad" x1="4" y1="4" x2="20" y2="20">
                    <stop stopColor="#66d3ff" />
                    <stop offset="1" stopColor="#759aff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="signin-brand-name" style={{ letterSpacing: '0.1em', fontWeight: 900, textTransform: 'uppercase' }}>
              <span>KYTE</span>
              <span className="signin-brand-accent" style={{ opacity: 0.5, marginLeft: '0.5rem', fontWeight: 400 }}>PROTOCOL</span>
            </span>
          </div>

          {/* Headline */}
          <div className="signin-left-content">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <p className="signin-eyebrow" style={{ color: '#66d3ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem' }}>Decentralized Talent Protocol</p>
              <h1 className="signin-hero-title" style={{ fontSize: '3.5rem', lineHeight: 1.1, fontWeight: 900, marginBottom: '1.5rem' }}>
                Engineering <br />
                <span className="signin-gradient-text">the future of work.</span>
              </h1>
              <p className="signin-hero-sub" style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', maxWidth: '480px' }}>
                Secure, AI-audited freelance infrastructure. Transparent bidding, smart escrows, and real-time collaboration.
              </p>
            </motion.div>

            {/* Feature pills */}
            <motion.div
              className="signin-features"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
            >
              {[
                { icon: '🛡️', label: 'AI Code Audit' },
                { icon: '📜', label: 'Smart Escrows' },
                { icon: '⚡', label: 'Bounty Market' },
              ].map((f, i) => (
                <div key={i} className="signin-feature-pill" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.6rem 1.2rem', borderRadius: '1rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Floating stat cards */}
            <motion.div
              className="signin-stats-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              {[
                { num: '$2.4M', lbl: 'Total Valued Locked' },
                { num: '850+', lbl: 'Verified Nodes' },
                { num: '99.9%', lbl: 'Audit Accuracy' },
              ].map((s, i) => (
                <div key={i} className="signin-stat-chip" style={{ borderLeft: '2px solid rgba(102, 211, 255, 0.2)', paddingLeft: '1.5rem' }}>
                  <span className="signin-stat-num" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{s.num}</span>
                  <span className="signin-stat-lbl" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.lbl}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* ── Right Panel (Card) ── */}
        <div className="signin-right" style={{ display: 'grid', placeItems: 'center' }}>
          <motion.div
            className="dash-glass"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            style={{ padding: '3rem', maxWidth: '440px', width: '100%', borderRadius: '2rem', boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}
          >
            {/* Back button */}
            <button
              className="signin-back-btn"
              onClick={() => router('/')}
              aria-label="Back to home"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.5rem 1rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Exit</span>
            </button>

            {/* Card Header */}
            <div className="signin-card-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div className="signin-card-icon" style={{ width: 64, height: 64, background: 'rgba(102, 211, 255, 0.05)', borderRadius: '1.25rem', border: '1px solid rgba(102, 211, 255, 0.1)', display: 'grid', placeItems: 'center', margin: '0 auto 1.5rem' }}>
                <Shield size={32} color="#66d3ff" />
              </div>
              <h2 className="signin-card-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Initialize Session</h2>
              <p className="signin-card-subtitle" style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)' }}>Access the KYTE Network Gate</p>
            </div>

            {/* Divider */}
            <div className="signin-divider">
              <span>Continue with</span>
            </div>

            {/* Pera Wallet Button */}
            <motion.button
              className="btn-primary"
              onClick={handlePeraConnect}
              disabled={isLoading}
              style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)', color: '#000', fontWeight: 600 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Shield size={18} />
              <span>Connect Pera Wallet</span>
            </motion.button>

            {/* Google Button */}
            <motion.button
              className="signin-google-btn"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    className="signin-spinner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                ) : (
                  <motion.div
                    key="content"
                    className="signin-google-btn-inner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <svg className="signin-google-icon" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {errorMessage ? (
              <p className="signin-error-message" role="alert">{errorMessage}</p>
            ) : null}

            {/* Security note */}
            <div className="signin-security-note">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5L2 4V8.5C2 11.8 4.6 14.9 8 15.5C11.4 14.9 14 11.8 14 8.5V4L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Secured with OAuth 2.0 &amp; end-to-end encryption</span>
            </div>

            {/* Terms */}
            <p className="signin-terms">
              By continuing, you agree to our{' '}
              <a href="#" className="signin-link">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="signin-link">Privacy Policy</a>.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};


