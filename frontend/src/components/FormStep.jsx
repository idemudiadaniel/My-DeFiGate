import React from 'react';

const FormStep = ({ title, subtitle, children, onNext, onBack, nextLabel = 'Continue', backLabel = 'Back', canProceed = true, loading = false }) => {
  return (
    <div className="form-step">
      <div className="step-header">
        <h2 className="step-title">{title}</h2>
        {subtitle && <p className="step-subtitle">{subtitle}</p>}
      </div>

      <div className="step-content">
        {children}
      </div>

      <div className="step-actions">
        {onBack && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            disabled={loading}
          >
            {backLabel}
          </button>
        )}
        {onNext && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNext}
            disabled={!canProceed || loading}
          >
            {loading ? 'Processing...' : nextLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default FormStep;