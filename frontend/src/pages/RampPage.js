import React, { useState } from 'react';

const RampPage = ({ user, onShowToast }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'card',
    currency: 'USD',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      onShowToast('Please sign in first', 'error');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch('/api/ramp/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          amount: formData.amount,
          paymentMethod: formData.paymentMethod,
          currency: formData.currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        onShowToast(errorData.message || 'Ramp request failed', 'error');
        setLoading(false);
        return;
      }

      const data = await response.json();
      onShowToast('Ramp request created! Redirecting...', 'success');
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (error) {
      console.error('Ramp error:', error);
      onShowToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <h2 style={{
          marginBottom: '24px',
          fontSize: '24px',
          fontWeight: 600,
        }}>
          Buy Crypto
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="100.00"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="paymentMethod">Payment Method</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
            >
              <option value="card">Credit/Debit Card</option>
              <option value="bank">Bank Transfer</option>
              <option value="apple_pay">Apple Pay</option>
              <option value="google_pay">Google Pay</option>
            </select>
          </div>

          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            marginBottom: '16px',
          }}>
            ⓘ Funds will be deposited to: <br />
            <span style={{
              color: 'var(--text)',
              fontWeight: 500,
              marginTop: '4px',
              display: 'block',
              wordBreak: 'break-all',
            }}>
              {user.walletAddress}
            </span>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RampPage;
