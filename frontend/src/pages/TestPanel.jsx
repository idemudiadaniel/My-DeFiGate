import React, { useEffect, useState } from 'react';

const TestPanel = ({ currentUser }) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [depositReference, setDepositReference] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch('/user/transactions', {
        headers: authHeaders,
      });
      const data = await response.json();
      if (data.ok) {
        setHistory(data.data.transactions || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Unable to load history' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadHistory();
    }
  }, [currentUser]);

  const handleDeposit = async () => {
    setMessage(null);
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid deposit amount.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/test/deposit', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount, reference: depositReference || `test-deposit-${Date.now()}` }),
      });
      const data = await response.json();
      if (data.ok) {
        setMessage({ type: 'success', text: data.message || 'Deposit created.' });
        setDepositAmount('');
        setDepositReference('');
        loadHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Deposit failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    setMessage(null);
    const amount = parseFloat(transferAmount);
    if (!recipientEmail) {
      setMessage({ type: 'error', text: 'Enter a recipient email.' });
      return;
    }
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid transfer amount.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/transfer', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          recipientEmail: recipientEmail.toLowerCase(),
          amount,
          chain: 'solana',
          requestReference: `test-transfer-${Date.now()}`,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setMessage({ type: 'success', text: data.data?.message || 'Transfer completed.' });
        setRecipientEmail('');
        setTransferAmount('');
        loadHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Transfer failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setMessage(null);
    const amount = parseFloat(withdrawAmount);
    if (!withdrawAddress) {
      setMessage({ type: 'error', text: 'Enter a Solana recipient address.' });
      return;
    }
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid withdrawal amount.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/transfer/withdraw', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount, toAddress: withdrawAddress, chain: 'solana' }),
      });
      const data = await response.json();
      if (data.ok) {
        setMessage({ type: 'success', text: data.data?.message || 'Withdrawal submitted.' });
        setWithdrawAmount('');
        setWithdrawAddress('');
        loadHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Withdrawal failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Test Panel</h1>
          <p>Please sign in to access the developer test tools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Solana Test Panel</h1>
        <p>Exercise deposits, transfers, and withdrawals in the Solana-only test environment.</p>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.text}
        </div>
      )}

      <div className="test-panel-grid">
        <section className="card">
          <h2>Deposit Test Funds</h2>
          <div className="form-group">
            <label>Amount (USDC)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="10"
              min="0.000001"
              step="0.000001"
            />
          </div>
          <div className="form-group">
            <label>Reference (optional)</label>
            <input
              type="text"
              value={depositReference}
              onChange={(e) => setDepositReference(e.target.value)}
              placeholder="deposit-test-123"
            />
          </div>
          <button className="btn btn-primary" onClick={handleDeposit} disabled={loading}>
            Create Deposit
          </button>
        </section>

        <section className="card">
          <h2>Transfer Between Users</h2>
          <div className="form-group">
            <label>Recipient email</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="form-group">
            <label>Amount (USDC)</label>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="1"
              min="0.000001"
              step="0.000001"
            />
          </div>
          <button className="btn btn-primary" onClick={handleTransfer} disabled={loading}>
            Send Transfer
          </button>
        </section>

        <section className="card">
          <h2>Withdraw to Solana</h2>
          <div className="form-group">
            <label>Solana Address</label>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              placeholder="Enter Solana address"
            />
          </div>
          <div className="form-group">
            <label>Amount (USDC)</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="1"
              min="0.000001"
              step="0.000001"
            />
          </div>
          <button className="btn btn-primary" onClick={handleWithdraw} disabled={loading}>
            Submit Withdrawal
          </button>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Recent Transactions</h2>
          <button className="btn btn-secondary btn-sm" onClick={loadHistory} disabled={loading}>
            Refresh
          </button>
        </div>
        <div className="transaction-list">
          {loading && <div>Loading history...</div>}
          {!loading && history.length === 0 && <div>No transactions yet.</div>}
          {!loading && history.length > 0 && (
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Hash</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.type}</td>
                    <td>{item.amount}</td>
                    <td>{item.status}</td>
                    <td>{item.reference || '-'}</td>
                    <td>{item.tx_hash || '-'}</td>
                    <td>{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default TestPanel;
