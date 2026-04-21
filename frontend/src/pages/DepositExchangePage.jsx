import React, { useState } from 'react';
import { QRCode } from '../components';

const DepositExchangePage = ({ currentUser, navigateTo }) => {
  const [copied, setCopied] = useState(false);
  const wallet = currentUser?.wallet;

  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!wallet) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Deposit Crypto</h1>
          <p>Please create a wallet first</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigateTo('wallet')}>
          Create Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Deposit Crypto</h1>
        <p>Send crypto to your wallet address</p>
      </div>

      <div className="deposit-address-section">
        <div className="network-info">
          <span className="network-badge">{wallet.chain?.toUpperCase() || 'ETHEREUM'}</span>
        </div>

        <div className="qr-section">
          <QRCode value={wallet.address} size={200} />
        </div>

        <div className="address-section">
          <label>Wallet Address</label>
          <div className="address-container">
            <code className="wallet-address">{wallet.address}</code>
            <button
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={copyAddress}
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        <div className="deposit-instructions">
          <h3>Deposit Instructions</h3>
          <ul>
            <li>Send only {wallet.chain?.toUpperCase() || 'ETHEREUM'} network tokens to this address</li>
            <li>Ensure the network matches to avoid loss of funds</li>
            <li>Deposits are usually confirmed within a few minutes</li>
            <li>Minimum deposit amount may apply</li>
          </ul>
        </div>

        <div className="supported-tokens">
          <h3>Supported Tokens</h3>
          <div className="token-list">
            <span className="token-chip">ETH</span>
            <span className="token-chip">USDT</span>
            <span className="token-chip">USDC</span>
            <span className="token-chip">DAI</span>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={() => navigateTo('dashboard')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default DepositExchangePage;