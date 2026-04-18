import React, { useState } from 'react';

function DashboardRefactored({ currentUser, currentWallet, navigateTo }) {
  const [copied, setCopied] = useState(false);
  const [expandedAction, setExpandedAction] = useState(null);

  const copyAddress = () => {
    if (currentWallet?.address) {
      navigator.clipboard.writeText(currentWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleAction = (actionId) => {
    setExpandedAction(expandedAction === actionId ? null : actionId);
  };

  const primaryActions = [
    {
      id: 'deposit',
      label: 'Deposit Funds',
      icon: '⬇️',
      color: 'primary',
      subOptions: [
        { label: 'From Bank', action: () => navigateTo('deposit-bank') },
        { label: 'From Exchange', action: () => navigateTo('deposit-exchange') },
        { label: 'From Wallet', action: () => navigateTo('deposit-exchange') }
      ]
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: '↗️',
      color: 'success',
      subOptions: [
        { label: 'To Defigate User', action: () => navigateTo('transfer-internal') }
      ]
    },
    {
      id: 'withdraw',
      label: 'Withdraw Funds',
      icon: '⬆️',
      color: 'accent',
      subOptions: [
        { label: 'To Bank', action: () => navigateTo('withdraw-bank') },
        { label: 'To Exchange', action: () => navigateTo('withdraw-exchange') },
        { label: 'To Wallet', action: () => navigateTo('withdraw-exchange') }
      ]
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Network/Chain Label */}
      {currentWallet && (
        <div className="network-label">
          <span className="network-badge">{currentWallet.chain?.toUpperCase() || 'ETHEREUM'}</span>
        </div>
      )}

      {/* Balance Section */}
      <div className="balance-section">
        <div className="balance-label">Total Balance</div>
        <div className="balance-amount">$0.00</div>
        <div className="balance-sublabel">Connected & Ready</div>
      </div>

      {/* Wallet Address Section */}
      {currentWallet && (
        <div className="wallet-section">
          <div className="wallet-label">Wallet Address</div>
          <div className="wallet-address-container">
            <code className="wallet-address">{currentWallet.address?.substring(0, 12)}...{currentWallet.address?.substring(-10)}</code>
            <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyAddress}>
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="primary-actions-row">
        {primaryActions.map((action) => (
          <div key={action.id} className="primary-action-container">
            <button
              className={`primary-action-btn primary-action-btn-${action.color}`}
              onClick={() => toggleAction(action.id)}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{action.label}</span>
              <span className="expand-icon">{expandedAction === action.id ? '▲' : '▼'}</span>
            </button>
            {expandedAction === action.id && (
              <div className="sub-options">
                {action.subOptions.map((option, index) => (
                  <button
                    key={index}
                    className="sub-option-btn"
                    onClick={option.action}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User Status */}
      {currentUser && (
        <div className="user-status">
          <div className="status-item">
            <span className="status-label">Account</span>
            <span className="status-value">{currentUser?.email || 'Not logged in'}</span>
          </div>
          {currentWallet && (
            <div className="status-item">
              <span className="status-label">Wallet</span>
              <span className="status-value">{currentWallet.chain || 'Ethereum'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardRefactored;