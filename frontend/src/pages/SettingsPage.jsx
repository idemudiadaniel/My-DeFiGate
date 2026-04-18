import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

const SettingsPage = ({ currentUser, navigateTo, toggleAuth }) => {
  const { isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false
  });

  const handleNotificationChange = (type) => {
    setNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleChangeEmail = async () => {
    const newEmail = prompt('Enter new email address:');
    if (!newEmail) return;
    try {
      const response = await fetch('/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await response.json();
      if (data.ok) {
        alert('Email updated successfully');
        // Update currentUser if needed
      } else {
        alert(data.error || 'Failed to update email');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleChangePassword = async () => {
    const currentPassword = prompt('Enter current password:');
    if (!currentPassword) return;
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;
    try {
      const response = await fetch('/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (data.ok) {
        alert('Password changed successfully');
      } else {
        alert(data.error || 'Failed to change password');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await fetch('/user/enable-2fa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      const data = await response.json();
      if (data.ok) {
        alert('2FA enabled successfully');
      } else {
        alert(data.error || 'Failed to enable 2FA');
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleUpdateProfile = async (field) => {
    const value = prompt(`Enter new ${field}:`);
    if (value === null) return;
    const body = {};
    body[field] = value;
    try {
      const response = await fetch('/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.ok) {
        alert(`${field} updated successfully`);
        // Update currentUser
      } else {
        alert(data.error || `Failed to update ${field}`);
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      toggleAuth();
      navigateTo('dashboard');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="settings-section">
        <h2>Profile</h2>
        <div className="settings-group">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Full Name</div>
              <div className="setting-value">{currentUser?.name || 'Not set'}</div>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Email</div>
              <div className="setting-value">{currentUser?.email}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleChangeEmail}>Change</button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Wallet Address</div>
              <div className="setting-value">{currentUser?.walletAddress || 'Not connected'}</div>
            </div>
            <button className="btn btn-secondary btn-sm">Manage</button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Phone</div>
              <div className="setting-value">{currentUser?.phone || 'Not added'}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateProfile('phone')}>Update</button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Company</div>
              <div className="setting-value">{currentUser?.company || 'Not added'}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateProfile('company')}>Update</button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Account Status</div>
              <div className="setting-value status-active">Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="settings-section">
        <h2>Security</h2>
        <div className="settings-group">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Password</div>
              <div className="setting-value">••••••••</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleChangePassword}>Change</button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Two-Factor Authentication</div>
              <div className="setting-value">Not enabled</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleEnable2FA}>Enable</button>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="settings-section">
        <h2>Notifications</h2>
        <div className="settings-group">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Email Notifications</div>
              <div className="setting-description">Receive transaction updates via email</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={() => handleNotificationChange('email')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Push Notifications</div>
              <div className="setting-description">Receive notifications in your browser</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={() => handleNotificationChange('push')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">SMS Notifications</div>
              <div className="setting-description">Receive important alerts via SMS</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications.sms}
                onChange={() => handleNotificationChange('sms')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="settings-section">
        <h2>Appearance</h2>
        <div className="settings-group">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Theme</div>
              <div className="setting-value">{isDark ? 'Dark' : 'Light'}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={toggleTheme}>
              Switch to {isDark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>

      {/* Linked Accounts Section */}
      <div className="settings-section">
        <h2>Linked Accounts</h2>
        <div className="settings-group">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Bank Accounts</div>
              <div className="setting-value">2 accounts linked</div>
            </div>
            <button className="btn btn-secondary btn-sm">Manage</button>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">External Wallets</div>
              <div className="setting-value">1 wallet connected</div>
            </div>
            <button className="btn btn-secondary btn-sm">Manage</button>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="settings-section">
        <h2>Support</h2>
        <div className="settings-group">
          <button className="btn btn-secondary full-width">
            Contact Support
          </button>
          <button className="btn btn-secondary full-width">
            Help Center
          </button>
          <button className="btn btn-secondary full-width">
            Privacy Policy
          </button>
          <button className="btn btn-secondary full-width">
            Terms of Service
          </button>
        </div>
      </div>

      {/* Logout Section */}
      <div className="settings-section">
        <div className="settings-group">
          <button
            className="btn btn-danger full-width"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;