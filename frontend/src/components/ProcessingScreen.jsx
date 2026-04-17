import React from 'react';

const ProcessingScreen = ({ title, message, progress = null, onCancel = null }) => {
  return (
    <div className="processing-screen">
      <div className="processing-content">
        <div className="processing-icon">
          <div className="spinner"></div>
        </div>

        <h2 className="processing-title">{title}</h2>
        <p className="processing-message">{message}</p>

        {progress && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        )}

        {onCancel && (
          <button
            className="btn btn-secondary cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ProcessingScreen;