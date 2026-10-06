import React, { useState, useEffect } from 'react';
import BottomNavBar from '../../components/BottomNavBar';
import { db } from '../../services/dbService';
import { loadWalletFromMySQL } from '../../services/mysqlService';
import { Wallet } from 'lucide-react';

export default function WalletTabScreen({ activeTab, setActiveTab, onBack }) {
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });

  const userProfile = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('cabsy_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  }, []);

  const userPhone = userProfile?.phone || '+91 72268 44108';

  useEffect(() => {
    const fetchWallet = async () => {
      // 1. Instant local read
      const localW = db.getCustomerWallet(userPhone);
      setWallet(localW);

      // 2. Fetch and reconcile from Hostinger Remote MySQL Database
      try {
        const reconciledW = await db.reconcileCustomerWallet(userPhone);
        if (reconciledW) {
          setWallet(reconciledW);
        }
      } catch (e) {}
    };

    fetchWallet();

    window.addEventListener('storage', fetchWallet);
    window.addEventListener('EMPERIAL CABS_wallet_updated', fetchWallet);
    window.addEventListener('EMPERIAL CABS_db_sync', fetchWallet);
    const interval = setInterval(fetchWallet, 12000);
    return () => {
      window.removeEventListener('storage', fetchWallet);
      window.removeEventListener('EMPERIAL CABS_wallet_updated', fetchWallet);
      window.removeEventListener('EMPERIAL CABS_db_sync', fetchWallet);
      clearInterval(interval);
    };
  }, [userPhone]);

  return (
    <div className="real-mobile-app" style={{ background: '#F8FAFC' }}>
      {/* Header */}
      <div className="white-header-nav" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        {onBack && <button className="header-back-arrow" onClick={onBack}>←</button>}
        <h2 className="white-header-title">My Wallet & Balance</h2>
      </div>

      <div className="app-scroll-content" style={{ padding: '20px 20px 100px 20px' }}>
        {/* Wallet Balance Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)', 
          borderRadius: '24px', 
          padding: '24px', 
          color: '#FFFFFF',
          boxShadow: '0 12px 28px rgba(52, 211, 153, 0.35)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.18, pointerEvents: 'none' }}>
            <Wallet size={96} color="#FFFFFF" />
          </div>
          <div style={{ fontSize: '12px', fontWeight: '800', opacity: 0.9, letterSpacing: '1px', textTransform: 'uppercase' }}>Available Taxi Wallet Balance</div>
          <div style={{ fontFamily: 'League Spartan', fontSize: '38px', fontWeight: '800', margin: '8px 0 0 0' }}>
            ₹{(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Recent Wallet Activity */}
        <h3 style={{ fontFamily: 'League Spartan', fontSize: '18px', color: '#0F172A', marginBottom: '12px', fontWeight: '800' }}>
          Recent Wallet Transactions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(!wallet?.transactions || wallet.transactions.length === 0) ? (
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', textOverflow: 'ellipsis', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              No transactions recorded yet. Completed trips, refunds & rewards will appear here.
            </div>
          ) : (
            // Deep Audit: Filter out duplicate or malformed transactions
            (() => {
              const seen = new Set();
              const cleanTxns = (wallet.transactions || []).filter(txn => {
                if (!txn || !txn.amount) return false;
                const key = `${txn.inquiryId || ''}_${txn.title}_${txn.amount}_${txn.date}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });

              if (cleanTxns.length === 0) {
                return (
                  <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No valid transactions recorded yet.
                  </div>
                );
              }

              return cleanTxns.map((txn, idx) => {
                const isCredit = txn?.type === 'credit';
                const isRefund = (txn?.title || '').toLowerCase().includes('refund') || (txn?.title || '').toLowerCase().includes('cancelled');
                
                return (
                  <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'Space Grotesk', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {txn?.title || 'Wallet Transaction'}
                        {isRefund && (
                          <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '10px', padding: '2px 6px', borderRadius: '6px', fontWeight: '800' }}>
                            REFUND
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{txn?.date || 'Today'}</div>
                    </div>
                    <div style={{ 
                      fontFamily: 'League Spartan', 
                      fontWeight: '800', 
                      fontSize: '16px', 
                      color: isCredit ? '#22C55E' : '#E11D48' 
                    }}>
                      {txn?.amount || '₹0'}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Bottom Navigation Toolbar */}
      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
