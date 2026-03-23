"use client"
import React, { useState, useEffect } from 'react'
import { Link, useNavigate as useRouter } from 'react-router-dom';
import { connectWallet, reconnectWallet, disconnectWallet } from '../services/wallet'
import useStore from '../store/useStore'
import { issueKyteToken } from '../services/kyteApi'
import { supabase } from '../supabaseClient'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { walletAddress, setWalletAddress, setJwtToken, logout } = useStore()
  const [googleUser, setGoogleUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setGoogleUser(user)
    })
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    
    // Auto reconnect
    reconnectWallet().then(address => {
        if (address) setWalletAddress(address)
    })

    return () => window.removeEventListener('scroll', onScroll)
  }, [setWalletAddress])

  const handleConnect = async () => {
    if (walletAddress) {
        await disconnectWallet()
        logout()
    } else {
        const address = await connectWallet()
        if (address) {
            setWalletAddress(address)
            try {
                const token = await issueKyteToken(address)
                setJwtToken(token)
            } catch (e) {
                console.error("Auth failed", e)
            }
        }
    }
  }

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="wavenet-logo" style={{ gap: '0.6rem' }}>
          <div style={{ width: 32, height: 32, background: 'var(--gradient-hero)', borderRadius: 8, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.8rem' }}>K</div>
          <span className="logo-wave" style={{ letterSpacing: '0.15em' }}>KYTE</span>
        </Link>

        {/* Center Nav Links */}
        <ul className="navbar-links">
          {['NETWORK', 'PROTOCOL', 'BUILD', 'GOVERNANCE', 'DOCS'].map(link => (
            <li key={link}>
              <a href={`/#${link.toLowerCase()}`}>{link}</a>
            </li>
          ))}
          {walletAddress && (
            <li>
              <Link to="/dashboard" style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.1em' }}>DASHBOARD</Link>
            </li>
          )}
        </ul>

        {/* Wallet / Sign In Button */}
        <div className="navbar-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={handleConnect} className="btn-signin" style={{ fontSize: '0.75rem', padding: '0.6rem 1.25rem', border: '1px solid rgba(102, 211, 255, 0.3)', background: 'rgba(102, 211, 255, 0.05)' }}>
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "CONNECT PROTOCOL"}
            </button>
            
            {googleUser ? (
              <Link to="/settings" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                {googleUser.user_metadata?.avatar_url || googleUser.user_metadata?.picture ? (
                  <img src={googleUser.user_metadata.avatar_url || googleUser.user_metadata.picture} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ color: '#fff', fontSize: '0.7rem' }}>{googleUser.email?.[0].toUpperCase()}</div>
                )}
              </Link>
            ) : !walletAddress && (
                <Link to="/signin" className="dash-header-btn" style={{ fontSize: '0.8rem' }}>SIGN IN</Link>
            )}
        </div>
      </div>
    </nav>
  )
}
