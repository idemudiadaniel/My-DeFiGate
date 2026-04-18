import React from 'react';

const Toast = ({ message, type = 'info' }) => {
  return (
    <div className={`toast ${type}`}>
      {type === 'success' && '✓ '}
      {type === 'error' && '✕ '}
      {type === 'warning' && '⚠ '}
      {type === 'info' && 'ℹ '}
      {message}
    </div>
  );
};

export default Toast;
