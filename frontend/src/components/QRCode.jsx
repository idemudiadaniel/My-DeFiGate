import React from 'react';

const QRCode = ({ value, size = 200 }) => {
  // Simple QR code placeholder - in a real app you'd use a QR code library
  return (
    <div className="qr-code-container">
      <div
        className="qr-code-placeholder"
        style={{ width: size, height: size }}
        title={`QR Code for: ${value}`}
      >
        <div className="qr-pattern">
          {/* Simple QR-like pattern */}
          <div className="qr-corner top-left"></div>
          <div className="qr-corner top-right"></div>
          <div className="qr-corner bottom-left"></div>
          <div className="qr-center"></div>
        </div>
        <div className="qr-text">QR</div>
      </div>
      <p className="qr-note">Scan with your wallet app</p>
    </div>
  );
};

export default QRCode;