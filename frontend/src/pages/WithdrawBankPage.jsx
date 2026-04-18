import React, { useState } from 'react';
import { FormStep, ConfirmationModal, ProcessingScreen, SuccessScreen } from '../components';

const WithdrawBankPage = ({ currentUser, createOfframp, navigateTo }) => {
  const [currentStep, setCurrentStep] = useState('form');
  const [formData, setFormData] = useState({
    amount: '',
    token: 'ETH',
    phone: '',
    bankDetails: {
      accountNumber: '',
      accountName: '',
      bankName: ''
    }
  });
  const [transactionData, setTransactionData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFormSubmit = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!formData.phone) {
      alert('Please enter your phone number');
      return;
    }
    if (!formData.bankDetails.accountNumber || !formData.bankDetails.accountName || !formData.bankDetails.bankName) {
      alert('Please fill in all bank details');
      return;
    }
    setCurrentStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setCurrentStep('processing');

    try {
      const data = await createOfframp(parseFloat(formData.amount), formData.token, formData.phone);
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
      amount: '',
      token: 'ETH',
      phone: '',
      bankDetails: {
        accountNumber: '',
        accountName: '',
        bankName: ''
      }
    });
    setTransactionData(null);
  };

  if (currentStep === 'form') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Withdraw to Bank</h1>
          <p>Convert crypto to NGN and receive in your bank account</p>
        </div>

        <FormStep
          title="Enter Withdrawal Details"
          subtitle="Fill in the amount and your bank details"
          onNext={handleFormSubmit}
          nextLabel="Continue"
          canProceed={
            formData.amount &&
            formData.phone &&
            formData.bankDetails.accountNumber &&
            formData.bankDetails.accountName &&
            formData.bankDetails.bankName
          }
        >
          <div className="form-group">
            <label htmlFor="amount">Amount (Crypto)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.01"
              min="0.001"
              step="0.001"
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="token">Token</label>
            <select
              id="token"
              name="token"
              value={formData.token}
              onChange={handleInputChange}
            >
              <option value="ETH">ETH</option>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+234xxxxxxxxxx"
              required
            />
          </div>

          <div className="bank-details-section">
            <h3>Bank Details</h3>

            <div className="form-group">
              <label htmlFor="accountNumber">Account Number</label>
              <input
                type="text"
                id="accountNumber"
                name="bankDetails.accountNumber"
                value={formData.bankDetails.accountNumber}
                onChange={handleInputChange}
                placeholder="1234567890"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="accountName">Account Name</label>
              <input
                type="text"
                id="accountName"
                name="bankDetails.accountName"
                value={formData.bankDetails.accountName}
                onChange={handleInputChange}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bankName">Bank Name</label>
              <input
                type="text"
                id="bankName"
                name="bankDetails.bankName"
                value={formData.bankDetails.bankName}
                onChange={handleInputChange}
                placeholder="Access Bank"
                required
              />
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
        message="Please review your withdrawal details"
        details={[
          { label: 'Amount', value: `${formData.amount} ${formData.token}` },
          { label: 'Phone', value: formData.phone },
          { label: 'Bank Account', value: `${formData.bankDetails.accountName} - ${formData.bankDetails.accountNumber}` },
          { label: 'Bank', value: formData.bankDetails.bankName }
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
        message="Please wait while we process your withdrawal request..."
        onCancel={() => setCurrentStep('form')}
      />
    );
  }

  if (currentStep === 'success') {
    return (
      <SuccessScreen
        title="Withdrawal Initiated"
        message="Your withdrawal request has been created successfully"
        details={[
          { label: 'Amount', value: `${formData.amount} ${formData.token}` },
          { label: 'Status', value: 'Processing' }
        ]}
        transactionId={transactionData?.id}
        onDone={() => navigateTo('dashboard')}
        doneLabel="Back to Dashboard"
      />
    );
  }

  return null;
};

export default WithdrawBankPage;