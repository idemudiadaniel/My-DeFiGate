import React, { useState, useEffect } from 'react';

const HistoryPage = ({ currentUser, navigateTo }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Mock data - in real app, this would fetch from API
    const mockTransactions = [
      {
        id: 'tx_001',
        type: 'deposit',
        amount: '1000 NGN',
        cryptoAmount: '0.05 ETH',
        status: 'completed',
        timestamp: '2024-01-15T10:30:00Z',
        description: 'Bank deposit via Kotani'
      },
      {
        id: 'tx_002',
        type: 'withdraw',
        amount: '0.02 ETH',
        fiatAmount: '70 NGN',
        status: 'completed',
        timestamp: '2024-01-14T15:45:00Z',
        description: 'Withdrawal to bank account'
      },
      {
        id: 'tx_003',
        type: 'transfer',
        amount: '0.01 ETH',
        status: 'completed',
        timestamp: '2024-01-13T09:20:00Z',
        description: 'Transfer to user@example.com'
      },
      {
        id: 'tx_004',
        type: 'deposit',
        amount: '500 NGN',
        cryptoAmount: '0.025 ETH',
        status: 'pending',
        timestamp: '2024-01-12T14:10:00Z',
        description: 'Bank deposit via Kotani'
      }
    ];

    setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit': return '⬇️';
      case 'withdraw': return '⬆️';
      case 'transfer': return '↗️';
      default: return '📄';
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Transaction History</h1>
          <p>Loading your transactions...</p>
        </div>
        <div className="loading-spinner">⟳</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Transaction History</h1>
        <p>Your complete transaction history</p>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-tab ${filter === 'deposit' ? 'active' : ''}`}
            onClick={() => setFilter('deposit')}
          >
            Deposits
          </button>
          <button
            className={`filter-tab ${filter === 'withdraw' ? 'active' : ''}`}
            onClick={() => setFilter('withdraw')}
          >
            Withdrawals
          </button>
          <button
            className={`filter-tab ${filter === 'transfer' ? 'active' : ''}`}
            onClick={() => setFilter('transfer')}
          >
            Transfers
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="transactions-list">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No transactions found</h3>
            <p>You haven't made any transactions yet.</p>
          </div>
        ) : (
          filteredTransactions.map(transaction => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-icon">
                {getTypeIcon(transaction.type)}
              </div>

              <div className="transaction-info">
                <div className="transaction-description">
                  {transaction.description}
                </div>
                <div className="transaction-meta">
                  <span className="transaction-date">
                    {formatDate(transaction.timestamp)}
                  </span>
                  <span className={`transaction-status status-${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>
              </div>

              <div className="transaction-amount">
                <div className="amount-primary">
                  {transaction.cryptoAmount || transaction.amount}
                </div>
                {transaction.fiatAmount && (
                  <div className="amount-secondary">
                    {transaction.fiatAmount}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredTransactions.length > 0 && (
        <div className="load-more">
          <button className="btn btn-secondary">
            Load More Transactions
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;