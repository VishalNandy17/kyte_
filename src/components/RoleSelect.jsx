import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import useStore from '../store/useStore';
import { Briefcase, Code2, Loader2 } from 'lucide-react';

const roles = [
  {
    id: 'client',
    icon: Briefcase,
    title: "I'm a Client",
    subtitle: 'Post projects, set requirements, and pay on verified delivery.',
    gradient: 'linear-gradient(135deg, #66d3ff22 0%, #759aff22 100%)',
    border: '#66d3ff',
    dest: '/dashboard/client',
    accent: '#66d3ff',
  },
  {
    id: 'developer',
    icon: Code2,
    title: "I'm a Developer",
    subtitle: 'Browse projects, submit work, and get paid by AI-verified results.',
    gradient: 'linear-gradient(135deg, #4ade8022 0%, #22d3ee22 100%)',
    border: '#4ade80',
    dest: '/dashboard/developer',
    accent: '#4ade80',
  },
];

export default function RoleSelect() {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useStore();
  const [loading, setLoading] = useState(null); // id of role being saved
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (userProfile?.role) {
      const dest = userProfile.role === 'client' ? '/dashboard/client' : '/dashboard/developer';
      navigate(dest, { replace: true });
    }
  }, [userProfile, navigate]);

  const handleSelect = async (roleObj) => {
    setError('');
    setLoading(roleObj.id);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/signin');
      return;
    }

    const user = session.user;
    const profile = {
      id: user.id,
      role: roleObj.id,
      display_name: user.user_metadata?.full_name || user.email || 'Anonymous',
      wallet_address: null,
    };

    const { data, error: dbError } = await supabase
      .from('user_profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single();

    if (dbError) {
      setError(dbError.message || 'Failed to save role. Please try again.');
      setLoading(null);
      return;
    }

    setUserProfile(data);
    navigate(roleObj.dest, { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060912', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      {/* Background orbs */}
      <div className="signin-orb signin-orb-1" />
      <div className="signin-orb signin-orb-2" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{ maxWidth: 720, width: '100%', textAlign: 'center' }}
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem', background: 'rgba(102,211,255,0.05)', border: '1px solid rgba(102,211,255,0.15)', borderRadius: 999, marginBottom: '2rem' }}>
            <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#66d3ff', boxShadow: '0 0 12px #66d3ff' }} />
            <span style={{ fontSize: '0.75rem', color: '#66d3ff', letterSpacing: '0.15em', fontWeight: 800, textTransform: 'uppercase' }}>Protocol Entry Path</span>
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fff', marginBottom: '1.5rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Define Your <br />
            <span className="signin-gradient-text" style={{ filter: 'drop-shadow(0 0 20px rgba(102, 211, 255, 0.3))' }}>Presence.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '4rem', fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto 4rem', lineHeight: 1.6 }}>
            Select your primary objective on the KYTE network. This configuration calibrates your automated dashboard.
          </p>
        </motion.div>

        {/* Role Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          {roles.map((role, i) => {
            const Icon = role.icon;
            const isLoading = loading === role.id;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(role)}
                disabled={!!loading}
                className="dash-glass"
                style={{
                  padding: '3.5rem 2.5rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  outline: 'none',
                  opacity: (loading && !isLoading) ? 0.3 : 1,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
                }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${role.accent}44`,
                  display: 'grid', placeItems: 'center', marginBottom: '2rem',
                }}>
                  {isLoading
                    ? <Loader2 size={32} color={role.accent} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    : <Icon size={32} color={role.accent} />
                  }
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '0.01em' }}>
                  {role.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', lineHeight: 1.7 }}>
                  {role.subtitle}
                </p>
                <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: role.accent, fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {isLoading ? 'Syncing…' : 'Initialize Protocol'}
                  {!isLoading && <span style={{ transition: 'transform 0.3s' }}>→</span>}
                </div>
              </motion.button>
            );
          })}
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ color: '#f87171', fontSize: '0.9rem', marginTop: '1rem' }}>
            {error}
          </motion.p>
        )}

        {/* Sign out option */}
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate('/signin'); }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', cursor: 'pointer', marginTop: '1rem' }}
        >
          Sign out
        </button>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
