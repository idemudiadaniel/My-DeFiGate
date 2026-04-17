import React, { useState, useEffect } from 'react';

const Dashboard = ({ user, onShowToast }) => {
  const [balance, setBalance] = useState('0.00');
  const [balanceUSD, setBalanceUSD] = useState('0.00');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch(`/api/wallet/balance?address=${user.walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }

      const data = await response.json();
      setBalance(parseFloat(data.balance).toFixed(4));
      setBalanceUSD(parseFloat(data.balanceUSD).toFixed(2));
    } catch (error) {
      console.error('Balance fetch error:', error);
      onShowToast('Failed to fetch balance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/transfer/history?address=${user.walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Transactions fetch error:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(user.walletAddress);
      onShowToast('Wallet address copied!', 'success');
    } catch (error) {
      onShowToast('Failed to copy address', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="network-label">
        <span className="network-badge">Ethereum Sepolia Testnet</span>
      </div>

      <div className="balance-section">
        <div className="balance-label">Total Balance</div>
        <div className="balance-amount">{balance}</div>
        <div className="balance-sublabel">${balanceUSD} USD</div>
      </div>

      <div className="wallet-section">
        <div className="wallet-label">Wallet Address</div>
        <div className="wallet-address-container">
          <div className="wallet-address">
            {user.walletAddress}
          </div>
          <button
            className="copy-btn"
            onClick={copyToClipboard}
            title="Copy address"
          >
            📋
          </button>
        </div>
      </div>

      <div className="actions-grid">
        <button className="action-btn action-btn-success">
          <span className="action-icon">📤</span>
          <span className="action-label">Send</span>
        </button>
        <button className="action-btn action-btn-accent">
          <span className="action-icon">📥</span>
          <span className="action-label">Receive</span>
        </button>
        <button className="action-btn action-btn-secondary">
          <span className="action-icon">💳</span>
          <span className="action-label">Buy Crypto</span>
        </button>
        <button className="action-btn action-btn-secondary">
          <span className="action-icon">⚙️</span>
          <span className="action-label">Settings</span>
        </button>
      </div>

      {transactions.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{
            marginBottom: '16px',
            fontSize: '16px',
            fontWeight: 600,
          }}>
            Recent Transactions
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {transactions.slice(0, 5).map((tx, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {tx.type === 'sent' ? '📤 Sent' : '📥 Received'}
                  </div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                  }}>
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  textAlign: 'right',
                  color: tx.type === 'sent' ? 'var(--danger)' : 'var(--success)',
                }}>
                  {tx.type === 'sent' ? '-' : '+'}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
