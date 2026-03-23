import React, { useState, useEffect } from 'react';
import { getAlgodClient } from '../services/wallet';
import { Wallet } from 'lucide-react';

export default function WalletBalance({ address }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const client = getAlgodClient();
      const accountInfo = await client.account_info(address).do();
      setBalance(accountInfo.amount / 1_000_000); // Convert microalgos to ALGO
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [address]);

  if (!address) return null;

  return (
    <div className="dash-glass" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(102, 211, 255, 0.1)', display: 'grid', placeItems: 'center' }}>
        <Wallet size={20} color="#66d3ff" />
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
          TestNet Balance
        </p>
        <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
          {loading && balance === null ? '...' : `${balance?.toFixed(2) || '0.00'} ALGO`}
        </p>
      </div>
      <button 
        onClick={fetchBalance}
        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#66d3ff', cursor: 'pointer', fontSize: '0.8rem' }}
        title="Refresh Balance"
      >
        Refresh
      </button>
    </div>
  );
}
