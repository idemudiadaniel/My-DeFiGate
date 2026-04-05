import { useState, useEffect } from 'react'
import './App.css'

const API = '';

function App() {
  const [currentUser, setCurrentUser] = useState(null); // { id, email }
  const [currentWallet, setCurrentWallet] = useState(null); // { id, address, chain_type }
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [currentView, setCurrentView] = useState("dashboard");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online', 'offline', 'checking'

  // Toast function
  const toast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Backend status check
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Navigation
  const navigateTo = (viewName) => {
    setCurrentView(viewName);
  };

  // Auth functions
  const toggleAuth = () => {
    if (currentUser) {
      setCurrentUser(null);
      setCurrentWallet(null);
      toast("Signed out", "info");
    } else {
      setAuthModalOpen(true);
    }
  };

  const closeModal = () => {
    setAuthModalOpen(false);
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === "signin" ? "signup" : "signin");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    const endpoint = authMode === "signin" ? "/user/signin" : "/user/signup";

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.ok) {
        toast(data.error || "Auth failed", "error");
        return;
      }

      setCurrentUser(data.user);
      setAuthModalOpen(false);
      toast(`Welcome${authMode === "signup" ? "! Account created" : " back"}, ${data.user.email}`, "success");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  // Wallet functions
  const createWallet = async (chain = "ethereum") => {
    if (!currentUser) {
      toast("Please sign in first", "error");
      setAuthModalOpen(true);
      return;
    }

    try {
      const res = await fetch(`${API}/wallet/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          chainType: chain,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        toast("Wallet creation failed", "error");
        return;
      }

      setCurrentWallet(data.data);
      toast("Wallet created!", "success");
      return data.data;
    } catch (err) {
      toast(err.message, "error");
    }
  };

  // On-ramp function
  const createOnramp = async (amount, channel) => {
    if (!currentUser) {
      toast("Please sign in first", "error");
      setAuthModalOpen(true);
      return;
    }

    if (!amount || amount < 100) {
      toast("Minimum amount is 100 NGN", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/ramp/onramp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          amountNGN: amount,
          currency: "NGN",
          channel,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        toast("On-ramp request failed", "error");
        return;
      }

      toast("On-ramp request created!", "success");
      return data.data;
    } catch (err) {
      toast(err.message, "error");
    }
  };

  // Off-ramp function
  const createOfframp = async (amount, token, phone) => {
    if (!currentUser) {
      toast("Please sign in first", "error");
      setAuthModalOpen(true);
      return;
    }

    if (!amount || amount <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    if (!phone) {
      toast("Enter a phone number", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/ramp/offramp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          amount,
          token,
          phone,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        toast("Off-ramp request failed", "error");
        return;
      }

      toast("Off-ramp request created!", "success");
      return data.data;
    } catch (err) {
      toast(err.message, "error");
    }
  };

  // Send tokens function
  const sendTokens = async (toAddress, tokenAddress, amount) => {
    if (!currentUser) {
      toast("Please sign in first", "error");
      setAuthModalOpen(true);
      return;
    }
    if (!currentWallet) {
      toast("Create a wallet first", "error");
      setCurrentView("wallet");
      return;
    }

    if (!toAddress) {
      toast("Enter a recipient address", "error");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/wallet/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: currentWallet.id,
          toAddress,
          tokenAddress: tokenAddress || undefined,
          amount: parseFloat(amount),
          chain: currentWallet.chain,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        toast("Transaction failed", "error");
        return;
      }

      toast("Transaction submitted!", "success");
      return data.tx;
    } catch (err) {
      toast(err.message, "error");
    }
  };

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="logo-icon">&#9670;</span> DeFiGate
        </div>
        <div className="nav-links">
          <a href="#" className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => navigateTo('dashboard')}>Dashboard</a>
          <a href="#" className={`nav-link ${currentView === 'wallet' ? 'active' : ''}`} onClick={() => navigateTo('wallet')}>Wallet</a>
          <a href="#" className={`nav-link ${currentView === 'ramp' ? 'active' : ''}`} onClick={() => navigateTo('ramp')}>On/Off Ramp</a>
          <a href="#" className={`nav-link ${currentView === 'send' ? 'active' : ''}`} onClick={() => navigateTo('send')}>Send Tokens</a>
        </div>
        <div className="nav-actions">
          <div className={`backend-status ${backendStatus}`}>
            <span className="status-dot"></span>
            Backend: {backendStatus}
          </div>
          {currentUser && <span className="user-badge">{currentUser.email}</span>}
          <button id="authBtn" className={`btn ${currentUser ? 'btn-danger' : 'btn-primary'}`} onClick={toggleAuth}>
            {currentUser ? 'Sign Out' : 'Sign In'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {currentView === 'dashboard' && <Dashboard currentUser={currentUser} currentWallet={currentWallet} navigateTo={navigateTo} />}
        {currentView === 'wallet' && <Wallet currentUser={currentUser} currentWallet={currentWallet} createWallet={createWallet} />}
        {currentView === 'ramp' && <Ramp currentUser={currentUser} createOnramp={createOnramp} createOfframp={createOfframp} />}
        {currentView === 'send' && <Send currentUser={currentUser} currentWallet={currentWallet} sendTokens={sendTokens} />}
      </main>

      {/* Auth Modal */}
      {authModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{authMode === "signin" ? "Sign In" : "Sign Up"}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" required />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" required />
              </div>
              <button type="submit" className="btn btn-primary">
                {authMode === "signin" ? "Sign In" : "Sign Up"}
              </button>
            </form>
            <div className="modal-footer">
              <span>{authMode === "signin" ? "Don't have an account?" : "Already have an account?"}</span>
              <button className="link-btn" onClick={switchAuthMode}>
                {authMode === "signin" ? "Sign Up" : "Sign In"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toastItem => (
          <div key={toastItem.id} className={`toast ${toastItem.type}`}>
            {toastItem.message}
          </div>
        ))}
      </div>
    </div>
  )
}

// Dashboard Component
function Dashboard({ currentUser, currentWallet, navigateTo }) {
  return (
    <div className="view active" id="view-dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Your DeFi gateway to African markets</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Wallet Status</div>
          <div className="stat-value" style={{ color: currentWallet ? 'var(--success)' : 'inherit' }}>
            {currentWallet ? "Active" : "No Wallet"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Wallet Address</div>
          <div className="stat-value stat-mono">{currentWallet ? currentWallet.address : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chain</div>
          <div className="stat-value">{currentWallet ? currentWallet.chain : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Account</div>
          <div className="stat-value">{currentUser ? currentUser.email : "Not signed in"}</div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-card" onClick={() => navigateTo('wallet')}>
            <span className="action-icon">&#128179;</span>
            <span className="action-label">Create Wallet</span>
          </button>
          <button className="action-card" onClick={() => navigateTo('ramp')}>
            <span className="action-icon">&#128176;</span>
            <span className="action-label">Buy Crypto</span>
          </button>
          <button className="action-card" onClick={() => navigateTo('send')}>
            <span className="action-icon">&#128640;</span>
            <span className="action-label">Send Tokens</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Wallet Component
function Wallet({ currentUser, currentWallet, createWallet }) {
  const [result, setResult] = useState(null);
  const [isError, setIsError] = useState(false);

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

      {currentWallet && (
        <div className="card">
          <h3>Your Wallet</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Wallet ID</span>
              <span className="info-value">{currentWallet.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Address</span>
              <span className="info-value info-mono">{currentWallet.address}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Chain</span>
              <span className="info-value">{currentWallet.chain}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ramp Component
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
                <input type="number" id="onrampAmount" name="amount" placeholder="e.g. 5000" min="100" required />
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
                <input type="number" id="offrampAmount" name="amount" placeholder="e.g. 10" step="0.01" min="0.01" required />
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

// Send Component
function Send({ currentUser, currentWallet, sendTokens }) {
  const [result, setResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    const toAddress = e.target.toAddress.value;
    const tokenAddress = e.target.tokenAddress.value;
    const amount = e.target.amount.value;
    const data = await sendTokens(toAddress, tokenAddress, amount);
    if (data) setResult(JSON.stringify(data, null, 2));
  };

  return (
    <div className="view active" id="view-send">
      <div className="page-header">
        <h1>Send Tokens</h1>
        <p className="subtitle">Transfer tokens to any address on supported chains</p>
      </div>
      <div className="card">
        <form onSubmit={handleSend}>
          <div className="form-group">
            <label htmlFor="sendToAddress">Recipient Address</label>
            <input type="text" id="sendToAddress" name="toAddress" placeholder="0x..." required />
          </div>
          <div className="form-group">
            <label htmlFor="sendTokenAddress">Token Contract Address</label>
            <input type="text" id="sendTokenAddress" name="tokenAddress" placeholder="0x... (leave empty for native token)" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sendAmount">Amount</label>
              <input type="number" id="sendAmount" name="amount" placeholder="0.00" step="0.0001" min="0" required />
            </div>
            <div className="form-group">
              <label>Chain</label>
              <div className="info-value">{currentWallet ? currentWallet.chain : "No wallet"}</div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!currentUser || !currentWallet}>Send</button>
        </form>
        {result && <pre className="result success">{result}</pre>}
      </div>
    </div>
  );
}

export default App