import React, { useState } from 'react';

function Ramp({ currentUser, createOnramp, createOfframp }) {
  const [activeTab, setActiveTab] = useState('onramp');
  const [onrampResult, setOnrampResult] = useState(null);
  const [offrampResult, setOfframpResult] = useState(null);

  const handleOnramp = async (e) => {
    e.preventDefault();
    const amount = parseFloat(e.target.amount.value);
    const channel = e.target.channel.value;
    const data = await createOnramp(amount, channel);
    if (data) setOnrampResult(JSON.stringify(data, null, 2));
  };

  const handleOfframp = async (e) => {
    e.preventDefault();
    const amount = parseFloat(e.target.amount.value);
    const token = e.target.token.value;
    const phone = e.target.phone.value;
    const data = await createOfframp(amount, token, phone);
    if (data) setOfframpResult(JSON.stringify(data, null, 2));
  };

  return (
    <div className="view active" id="view-ramp">
      <div className="page-header">
        <h1>On/Off Ramp</h1>
        <p className="subtitle">Convert between fiat (NGN) and crypto via Kotani Pay</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'onramp' ? 'active' : ''}`} onClick={() => setActiveTab('onramp')}>
          Buy Crypto (On-Ramp)
        </button>
        <button className={`tab ${activeTab === 'offramp' ? 'active' : ''}`} onClick={() => setActiveTab('offramp')}>
          Sell Crypto (Off-Ramp)
        </button>
      </div>

      {activeTab === 'onramp' && (
        <div className="tab-content active" id="tab-onramp">
          <div className="card">
            <h3>Deposit NGN &rarr; Crypto</h3>
            <p className="card-desc">Deposit Nigerian Naira via bank transfer or mobile money and receive crypto in your wallet.</p>
            <form onSubmit={handleOnramp}>
              <div className="form-group">
                <label htmlFor="onrampAmount">Amount (NGN)</label>
                <input type="number" id="onrampAmount" name="amount" placeholder="e.g. 5000" min="100" autoComplete="off" required />
              </div>
              <div className="form-group">
                <label htmlFor="onrampChannel">Payment Channel</label>
                <select id="onrampChannel" name="channel">
                  <option value="bank_checkout">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={!currentUser}>Deposit</button>
            </form>
            {onrampResult && <pre className="result success">{onrampResult}</pre>}
          </div>
        </div>
      )}

      {activeTab === 'offramp' && (
        <div className="tab-content active" id="tab-offramp">
          <div className="card">
            <h3>Withdraw Crypto &rarr; NGN</h3>
            <p className="card-desc">Convert your crypto to NGN and withdraw to your bank account or mobile money.</p>
            <form onSubmit={handleOfframp}>
              <div className="form-group">
                <label htmlFor="offrampAmount">Amount (Crypto)</label>
                <input type="number" id="offrampAmount" name="amount" placeholder="e.g. 10" step="0.01" min="0.01" autoComplete="off" required />
              </div>
              <div className="form-group">
                <label htmlFor="offrampToken">Token</label>
                <select id="offrampToken" name="token">
                  <option value="cUSD">cUSD</option>
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="offrampPhone">Phone Number</label>
                <input type="tel" id="offrampPhone" name="phone" placeholder="+234..." required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={!currentUser}>Withdraw</button>
            </form>
            {offrampResult && <pre className="result success">{offrampResult}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}

export default Ramp;