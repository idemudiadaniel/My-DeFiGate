import React, { useState } from 'react';

function Wallet({ currentUser, createWallet }) {
  const [result, setResult] = useState(null);
  const [isError, setIsError] = useState(false);
  const wallet = currentUser?.wallet;

  const handleCreateWallet = async () => {
    const chainSelect = document.getElementById("walletChain");
    const chain = chainSelect ? chainSelect.value : "ethereum";
    const data = await createWallet(chain);
    if (data) {
      setResult(JSON.stringify(data, null, 2));
      setIsError(false);
    }
  };

  return (
    <div className="view active" id="view-wallet">
      <div className="page-header">
        <h1>Wallet</h1>
        <p className="subtitle">Create and manage your embedded wallet via Privy</p>
      </div>
      <div className="card">
        <h3>Create Embedded Wallet</h3>
        <p className="card-desc">Creates a new wallet linked to your account using Privy's server-side wallet infrastructure.</p>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="walletChain">Chain</label>
            <select id="walletChain">
              <option value="ethereum">Ethereum</option>
              <option value="solana">Solana</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCreateWallet} disabled={!currentUser}>
          Create Wallet
        </button>
        {result && (
          <pre className={`result ${isError ? 'error' : 'success'}`}>{result}</pre>
        )}
      </div>

      {wallet && (
        <div className="card">
          <h3>Your Wallet</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Wallet ID</span>
              <span className="info-value">{wallet.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Address</span>
              <span className="info-value info-mono">{wallet.address}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Chain</span>
              <span className="info-value">{wallet.chain}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wallet;