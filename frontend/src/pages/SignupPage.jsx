import React, { useState } from 'react';

const SignupPage = ({ onAuthenticated, onShowToast, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    walletAddress: '',
    phone: '',
    company: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.email || !formData.password || !formData.walletAddress) {
      onShowToast('Please fill in all required fields.', 'error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/user/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          walletAddress: formData.walletAddress,
          phone: formData.phone,
          company: formData.company,
        }),
      });

      const responseData = await response.json();
      if (!response.ok || !responseData?.data?.user) {
        onShowToast(responseData.error || responseData.message || 'Signup failed', 'error');
        setLoading(false);
        return;
      }

      const { user, token, wallet } = responseData.data;
      onAuthenticated({
        ...user,
        name: formData.name,
        walletAddress: wallet?.address || formData.walletAddress,
        phone: formData.phone,
        company: formData.company,
        token,
      });
      setLoading(false);
    } catch (error) {
      console.error('Signup page error:', error);
      onShowToast('Network error. Please try again.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-large">
        <div className="auth-card-header">
          <h1>Create your DeFiGate profile</h1>
          <p>Enter your profile information once and access it later from Settings.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              autoComplete="name"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="walletAddress">Wallet Address</label>
            <input
              id="walletAddress"
              name="walletAddress"
              type="text"
              value={formData.walletAddress}
              onChange={handleInputChange}
              placeholder="0x..."
              autoComplete="off"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+234 800 000 0000"
              autoComplete="tel"
            />
          </div>

          <div className="form-row">
            <label htmlFor="company">Company / Organization</label>
            <input
              id="company"
              name="company"
              type="text"
              value={formData.company}
              onChange={handleInputChange}
              placeholder="DeFiGate Ltd"
              autoComplete="organization"
            />
          </div>

          <button type="submit" className="btn btn-primary full-width" disabled={loading}>
            {loading ? 'Creating profile...' : 'Create profile'}
          </button>
        </form>

        <div className="auth-page-footer">
          <p>
            Already have an account?{' '}
            <button type="button" className="link-btn" onClick={onCancel}>
              Sign in instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
