import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import useStore from '../store/useStore';

/**
 * ProtectedRoute — guards a route by Supabase session + optional role.
 * Props:
 *   children  — what to render if authorized
 *   role      — 'client' | 'developer' | undefined (any role is fine)
 */
export default function ProtectedRoute({ children, role }) {
  const { userProfile, setUserProfile } = useStore();
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'no-session' | 'no-role' | 'wrong-role'

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (mounted) setStatus('no-session');
        return;
      }

      // Fetch profile from DB
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profile) {
        if (mounted) setStatus('no-role');
        return;
      }

      setUserProfile(profile);

      if (role && profile.role !== role) {
        if (mounted) setStatus('wrong-role');
        return;
      }

      if (mounted) setStatus('ok');
    }

    check();
    return () => { mounted = false; };
  }, [role, setUserProfile]);

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: '#060912', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          <div className="signin-spinner" style={{ width: 48, height: 48, margin: '0 auto 1rem' }} />
          <p>Verifying session…</p>
        </div>
      </div>
    );
  }

  if (status === 'no-session') return <Navigate to="/signin" replace />;
  if (status === 'no-role')   return <Navigate to="/select-role" replace />;
  if (status === 'wrong-role') {
    const dest = userProfile?.role === 'client' ? '/dashboard/client' : '/dashboard/developer';
    return <Navigate to={dest} replace />;
  }

  return children;
}
