import React, { useState } from 'react';
import { FormStep, ConfirmationModal, ProcessingScreen, SuccessScreen } from '../components';

const TransferInternalPage = ({ currentUser, sendTokens, navigateTo }) => {
  const [currentStep, setCurrentStep] = useState('form');
  const wallet = currentUser?.wallet;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    note: ''
  });
  const [transactionData, setTransactionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Mock search - in real app, this would call an API
      const mockResults = [
        { id: 1, email: 'user1@example.com', username: 'user1' },
        { id: 2, email: 'user2@example.com', username: 'user2' },
      ].filter(user =>
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(mockResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery(user.email);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = () => {
    if (!selectedUser) {
      alert('Please select a recipient');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setCurrentStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setCurrentStep('processing');

    try {
      // Mock internal transfer - in real app, this would call a different API
      const mockTransaction = {
        id: 'tx_' + Date.now(),
        amount: formData.amount,
        recipient: selectedUser.email,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      setTransactionData(mockTransaction);
      setCurrentStep('success');
    } catch (error) {
      setCurrentStep('form');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('form');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setFormData({ amount: '', note: '' });
    setTransactionData(null);
  };

  if (!wallet) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Transfer</h1>
          <p>Please create a wallet first</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigateTo('wallet')}>
          Create Wallet
        </button>
      </div>
    );
  }

  if (currentStep === 'form') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Transfer to User</h1>
          <p>Send crypto to another Defigate user instantly</p>
        </div>

        <FormStep
          title="Transfer Details"
          subtitle="Find a user and enter the amount to transfer"
          onNext={handleFormSubmit}
          nextLabel="Continue"
          canProceed={selectedUser && formData.amount}
        >
          <div className="form-group">
            <label htmlFor="recipient">Recipient</label>
            <div className="search-container">
              <input
                type="text"
                id="recipient"
                value={searchQuery}
                onChange={handleSearchInput}
                placeholder="Search by email or username"
                autoComplete="off"
              />
              {searching && <div className="search-spinner">⟳</div>}
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="search-result-item"
                    onClick={() => selectUser(user)}
                  >
                    <div className="user-info">
                      <div className="user-email">{user.email}</div>
                      <div className="user-username">@{user.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="selected-user">
                <span className="selected-label">Selected:</span>
                <span className="selected-email">{selectedUser.email}</span>
                <button
                  type="button"
                  className="clear-selection"
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchQuery('');
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (ETH)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.01"
              min="0.000001"
              step="0.000001"
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="note">Note (Optional)</label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              placeholder="Add a note for the recipient"
              rows="3"
            />
          </div>

          <div className="transfer-info">
            <div className="info-item">
              <span className="info-icon">⚡</span>
              <span>Instant transfer between Defigate users</span>
            </div>
            <div className="info-item">
              <span className="info-icon">🔒</span>
              <span>Secure and private</span>
            </div>
            <div className="info-item">
              <span className="info-icon">💰</span>
              <span>No fees for internal transfers</span>
            </div>
          </div>
        </FormStep>
      </div>
    );
  }

  if (currentStep === 'confirm') {
    return (
      <ConfirmationModal
        isOpen={true}
        title="Confirm Transfer"
        message="Please review your transfer details"
        details={[
          { label: 'Recipient', value: selectedUser.email },
          { label: 'Amount', value: `${formData.amount} ETH` },
          { label: 'Network', value: 'Internal Transfer' },
          { label: 'Fee', value: 'Free' }
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setCurrentStep('form')}
        confirmLabel="Send Transfer"
        loading={loading}
      />
    );
  }

  if (currentStep === 'processing') {
    return (
      <ProcessingScreen
        title="Processing Transfer"
        message="Sending your transfer securely..."
        onCancel={() => setCurrentStep('form')}
      />
    );
  }

  if (currentStep === 'success') {
    return (
      <SuccessScreen
        title="Transfer Successful"
        message={`Successfully sent ${formData.amount} ETH to ${selectedUser.email}`}
        details={[
          { label: 'Amount', value: `${formData.amount} ETH` },
          { label: 'Recipient', value: selectedUser.email },
          { label: 'Status', value: 'Completed' }
        ]}
        transactionId={transactionData?.id}
        onDone={() => navigateTo('dashboard')}
        doneLabel="Back to Dashboard"
      />
    );
  }

  return null;
};

export default TransferInternalPage;