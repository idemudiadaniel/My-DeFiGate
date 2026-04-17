import React from 'react';

const SuccessScreen = ({
  title,
  message,
  details = [],
  transactionId = null,
  onDone,
  doneLabel = 'Done',
  icon = '✓'
}) => {
  return (
    <div className="success-screen">
      <div className="success-content">
        <div className="success-icon">
          {icon}
        </div>

        <h2 className="success-title">{title}</h2>
        <p className="success-message">{message}</p>

        {details.length > 0 && (
          <div className="success-details">
            {details.map((detail, index) => (
              <div key={index} className="detail-row">
                <span className="detail-label">{detail.label}:</span>
                <span className="detail-value">{detail.value}</span>
              </div>
            ))}
          </div>
        )}

        {transactionId && (
          <div className="transaction-id">
            <span className="id-label">Transaction ID:</span>
            <code className="id-value">{transactionId}</code>
          </div>
        )}

        <button
          className="btn btn-primary success-done-btn"
          onClick={onDone}
        >
          {doneLabel}
        </button>
      </div>
    </div>
  );
};

export default SuccessScreen;