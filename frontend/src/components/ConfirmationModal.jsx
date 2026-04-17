import React from 'react';

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  details = [],
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal confirmation-modal">
        <div className="modal-header">
          <h2>{title}</h2>
        </div>

        <div className="modal-body">
          <p className="confirmation-message">{message}</p>

          {details.length > 0 && (
            <div className="confirmation-details">
              {details.map((detail, index) => (
                <div key={index} className="detail-row">
                  <span className="detail-label">{detail.label}:</span>
                  <span className="detail-value">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`btn btn-${confirmVariant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;