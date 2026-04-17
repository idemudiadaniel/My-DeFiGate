import React, { useState } from 'react';
import { FormStep, ConfirmationModal, ProcessingScreen, SuccessScreen } from '../components';

const DepositBankPage = ({ currentUser, createOnramp, navigateTo }) => {
  const [currentStep, setCurrentStep] = useState('form');
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'bank_transfer'
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
    if (!formData.amount || parseFloat(formData.amount) < 100) {
      alert('Minimum amount is 100 NGN');
      return;
    }
    setCurrentStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setCurrentStep('processing');

    try {
      const data = await createOnramp(parseFloat(formData.amount), formData.paymentMethod);
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
    setFormData({ amount: '', paymentMethod: 'bank_transfer' });
    setTransactionData(null);
  };

  if (currentStep === 'form') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Deposit from Bank</h1>
          <p>Convert NGN to crypto via bank transfer</p>
        </div>

        <FormStep
          title="Enter Amount"
          subtitle="Minimum deposit: 100 NGN"
          onNext={handleFormSubmit}
          nextLabel="Continue"
          canProceed={formData.amount && parseFloat(formData.amount) >= 100}
        >
          <div className="form-group">
            <label htmlFor="amount">Amount (NGN)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="100"
              min="100"
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
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Debit Card</option>
            </select>
          </div>
        </FormStep>
      </div>
    );
  }

  if (currentStep === 'confirm') {
    return (
      <ConfirmationModal
        isOpen={true}
        title="Confirm Deposit"
        message="Please review your deposit details"
        details={[
          { label: 'Amount', value: `${formData.amount} NGN` },
          { label: 'Payment Method', value: formData.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Debit Card' },
          { label: 'Recipient', value: currentUser?.email || 'Your wallet' }
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setCurrentStep('form')}
        confirmLabel="Confirm Deposit"
        loading={loading}
      />
    );
  }

  if (currentStep === 'processing') {
    return (
      <ProcessingScreen
        title="Processing Deposit"
        message="Please wait while we process your deposit request..."
        onCancel={() => setCurrentStep('form')}
      />
    );
  }

  if (currentStep === 'success') {
    return (
      <SuccessScreen
        title="Deposit Initiated"
        message="Your deposit request has been created successfully"
        details={[
          { label: 'Amount', value: `${formData.amount} NGN` },
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

export default DepositBankPage;