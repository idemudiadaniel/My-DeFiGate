import React, { useState } from 'react';
import { FormStep, ConfirmationModal, ProcessingScreen, SuccessScreen } from '../components';

const WithdrawExchangePage = ({ currentUser, sendTokens, navigateTo }) => {
  const [currentStep, setCurrentStep] = useState('form');
  const wallet = currentUser?.wallet;
  const [formData, setFormData] = useState({
    recipientAddress: '',
    amount: '',
    network: wallet?.chain || 'ethereum',
    tokenAddress: '' // optional, for ERC-20 tokens
  });
  const [transactionData, setTransactionData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = () => {
    if (!formData.recipientAddress) {
      alert('Please enter recipient address');
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
      const data = await sendTokens(
        formData.recipientAddress,
        formData.tokenAddress || undefined,
        formData.amount
      );
      if (data) {
        setTransactionData(data);
        setCurrentStep('success');
      } else {
        setCurrentStep('form');
      }
    } catch (error) {
      setCurrentStep('form');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setCurrentStep('form');
    setFormData({
      recipientAddress: '',
      amount: '',
      network: wallet?.chain || 'ethereum',
      tokenAddress: ''
    });
    setTransactionData(null);
  };

  if (!wallet) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Withdraw Crypto</h1>
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
          <h1>Withdraw Crypto</h1>
          <p>Send crypto to external wallet or exchange</p>
        </div>

        <FormStep
          title="Enter Withdrawal Details"
          subtitle="Send crypto to any external address"
          onNext={handleFormSubmit}
          nextLabel="Continue"
          canProceed={formData.recipientAddress && formData.amount}
        >
          <div className="form-group">
            <label htmlFor="recipientAddress">Recipient Address</label>
            <input
              type="text"
              id="recipientAddress"
              name="recipientAddress"
              value={formData.recipientAddress}
              onChange={handleInputChange}
              placeholder="0x..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.01"
              min="0.000001"
              step="0.000001"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="network">Network</label>
            <select
              id="network"
              name="network"
              value={formData.network}
              onChange={handleInputChange}
            >
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="bsc">BSC</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tokenAddress">Token Contract (Optional)</label>
            <input
              type="text"
              id="tokenAddress"
              name="tokenAddress"
              value={formData.tokenAddress}
              onChange={handleInputChange}
              placeholder="Leave empty for ETH"
            />
            <small className="form-hint">Leave empty to send native token (ETH)</small>
          </div>

          <div className="withdrawal-warning">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Important:</strong> Double-check the recipient address and network.
              Transactions cannot be reversed.
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
        title="Confirm Withdrawal"
        message="Please review your withdrawal details carefully"
        details={[
          { label: 'Recipient', value: `${formData.recipientAddress.substring(0, 12)}...${formData.recipientAddress.substring(-8)}` },
          { label: 'Amount', value: formData.amount },
          { label: 'Network', value: formData.network.toUpperCase() },
          { label: 'Token', value: formData.tokenAddress ? 'ERC-20 Token' : 'ETH' }
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setCurrentStep('form')}
        confirmLabel="Confirm Withdrawal"
        loading={loading}
      />
    );
  }

  if (currentStep === 'processing') {
    return (
      <ProcessingScreen
        title="Processing Withdrawal"
        message="Please wait while we process your transaction..."
        onCancel={() => setCurrentStep('form')}
      />
    );
  }

  if (currentStep === 'success') {
    return (
      <SuccessScreen
        title="Withdrawal Successful"
        message="Your crypto has been sent successfully"
        details={[
          { label: 'Amount', value: formData.amount },
          { label: 'Network', value: formData.network.toUpperCase() },
          { label: 'Status', value: 'Completed' }
        ]}
        transactionId={transactionData?.txHash}
        onDone={() => navigateTo('dashboard')}
        doneLabel="Back to Dashboard"
      />
    );
  }

  return null;
};

export default WithdrawExchangePage;