import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import useStore from '../store/useStore';
import { User, Wallet, Shield, Save, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WalletBalance from './WalletBalance';

export default function Settings() {
  const navigate = useNavigate();
  const { userProfile, walletAddress, setUserProfile, logout } = useStore();
  const [googleUser, setGoogleUser] = useState(null);
  const [form, setForm] = useState({
    display_name: userProfile?.display_name || '',
    wallet_address: userProfile?.wallet_address || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setGoogleUser(user);
        // If display name is empty, pre-fill from Google
        if (!form.display_name) {
          setForm(prev => ({ ...prev, display_name: user.user_metadata?.full_name || '' }));
        }
      }
    });
  }, []);

  useEffect(() => {
    if (userProfile) {
      setForm({
        display_name: userProfile.display_name || '',
        wallet_address: userProfile.wallet_address || '',
      });
    }
  }, [userProfile]);

  const syncCurrentWallet = () => {
     if (walletAddress) {
       setForm(prev => ({ ...prev, wallet_address: walletAddress }));
       setMessage('Session wallet synced to form.');
     }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(form)
        .eq('id', userProfile.id)
        .select()
        .single();

      if (error) throw error;
      setUserProfile(data);
      setMessage('Settings updated successfully!');
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/signin');
  };

  const dashboardPath = userProfile?.role === 'client' ? '/dashboard/client' : '/dashboard/developer';

  return (
    <div style={{ minHeight: '100vh', background: '#060912', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
          <button 
            onClick={() => navigate(dashboardPath)}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.75rem', color: '#fff', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            Account <span style={{ color: '#66d3ff' }}>Settings</span>
          </h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Profile Section */}
          <div className="dash-glass" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(102, 211, 255, 0.1)', border: '1px solid rgba(102, 211, 255, 0.2)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                {(userProfile?.avatar_url || googleUser?.user_metadata?.avatar_url || googleUser?.user_metadata?.picture) ? (
                  <img src={userProfile?.avatar_url || googleUser?.user_metadata?.avatar_url || googleUser?.user_metadata?.picture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} color="#66d3ff" />
                )}
              </div>
              <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>Profile Information</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Display Name</label>
                <input 
                  type="text"
                  className="dash-search-input"
                  style={{ width: '100%', margin: 0 }}
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Google Identity</label>
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Shield size={14} color="#66d3ff" />
                  {userProfile?.email || googleUser?.email || 'authenticated@protocol.node'}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'rgba(102, 211, 255, 0.4)', marginTop: '0.5rem' }}>Identity secured via OAuth Protocol.</p>
              </div>
            </div>
          </div>

          {/* Wallet Section */}
          <div className="dash-glass" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <Wallet size={24} color="#4ade80" />
              <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>Web3 Port</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Algorand Wallet Address</label>
                  {walletAddress && walletAddress !== form.wallet_address && (
                    <button 
                      onClick={syncCurrentWallet}
                      style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 6, cursor: 'pointer' }}
                    >
                      SYNC SESSION WALLET
                    </button>
                  )}
                </div>
                <input 
                  type="text"
                  className="dash-search-input"
                  style={{ width: '100%', margin: 0, fontSize: '0.85rem' }}
                  placeholder="3IMQ..."
                  value={form.wallet_address}
                  onChange={(e) => setForm({ ...form, wallet_address: e.target.value })}
                />
              </div>

              <WalletBalance address={form.wallet_address || walletAddress} />

              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                Your wallet is used for project submission and bounty claims. Ensure it matches your connected Pera Wallet.
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid #f87171', color: '#f87171', padding: '0.75rem 1.5rem', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            <LogOut size={18} /> Logout Session
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {message && <span style={{ color: message.includes('Error') ? '#f87171' : '#4ade80', fontSize: '0.9rem' }}>{message}</span>}
            <button 
              className="btn-primary"
              onClick={handleSave}
              disabled={loading}
              style={{ padding: '0.75rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <Save size={18} /> {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
