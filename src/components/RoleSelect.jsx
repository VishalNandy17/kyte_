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
  const { setUserProfile } = useStore();
  const [loading, setLoading] = useState(null); // id of role being saved
  const [error, setError] = useState('');

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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(102,211,255,0.08)', border: '1px solid rgba(102,211,255,0.2)', borderRadius: 999, marginBottom: '2rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#66d3ff', boxShadow: '0 0 6px #66d3ff' }} />
            <span style={{ fontSize: '0.8rem', color: '#66d3ff', letterSpacing: '0.08em' }}>Welcome to Optivus Kyte</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', marginBottom: '1rem', lineHeight: 1.2 }}>
            How will you use<br />
            <span style={{ background: 'linear-gradient(90deg,#66d3ff,#759aff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kyte?</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '3rem', fontSize: '1.05rem' }}>
            Choose your role to access the right dashboard. You can update this later.
          </p>
        </motion.div>

        {/* Role Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {roles.map((role, i) => {
            const Icon = role.icon;
            const isLoading = loading === role.id;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(role)}
                disabled={!!loading}
                style={{
                  background: role.gradient,
                  border: `1px solid ${role.border}44`,
                  borderRadius: 20,
                  padding: '2.5rem 2rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  opacity: (loading && !isLoading) ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: `${role.accent}22`,
                  border: `1px solid ${role.accent}44`,
                  display: 'grid', placeItems: 'center', marginBottom: '1.5rem',
                }}>
                  {isLoading
                    ? <Loader2 size={24} color={role.accent} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Icon size={24} color={role.accent} />
                  }
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {role.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {role.subtitle}
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: role.accent, fontSize: '0.85rem', fontWeight: 600 }}>
                  {isLoading ? 'Saving…' : 'Get Started →'}
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
