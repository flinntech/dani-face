/**
 * Settings Page Component
 * Allows users to manage their API keys and other settings
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, Theme } from '../context/ThemeContext';
import {
  getUserServices,
  saveDrmApiKey,
  deleteDrmApiKey,
} from '../services/settingsService';
import '../styles/SettingsPage.css';

interface SettingsPageProps {
  onBack?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // DRM API Key state
  const [drmKeyId, setDrmKeyId] = useState('');
  const [drmKeySecret, setDrmKeySecret] = useState('');
  const [drmConfigured, setDrmConfigured] = useState(false);
  const [drmUpdatedAt, setDrmUpdatedAt] = useState<string | undefined>();

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDrmSecret, setShowDrmSecret] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const services = await getUserServices();

      if (services.services.drm) {
        setDrmConfigured(services.services.drm.configured);
        setDrmUpdatedAt(services.services.drm.updatedAt);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDrmKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!drmKeyId.trim() || !drmKeySecret.trim()) {
      setMessage({ type: 'error', text: 'Please enter both API Key ID and Secret' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const result = await saveDrmApiKey(drmKeyId.trim(), drmKeySecret.trim());

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setDrmKeyId('');
        setDrmKeySecret('');
        await loadSettings();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      console.error('Error saving DRM API key:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save DRM API credentials';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDrmKey = async () => {
    if (!window.confirm('Are you sure you want to delete your DRM API credentials?')) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const result = await deleteDrmApiKey();

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadSettings();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      console.error('Error deleting DRM API key:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete DRM API credentials';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <div className="loading">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <button className="back-button" onClick={handleBack}>
            ← Back to Chat
          </button>
          <h1>Settings</h1>
          <div className="user-info">
            <span>{user?.name}</span>
            <button className="logout-button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Appearance Section */}
        <div className="settings-section">
          <h2>Appearance</h2>
          <p className="section-description">
            Customize the visual theme of the application. Changes apply immediately.
          </p>

          <div className="api-key-card">
            <div className="card-header">
              <h3>Theme</h3>
            </div>

            <p className="card-description">
              Choose your preferred color theme for the application interface.
            </p>

            <div className="theme-selector">
              <label className="theme-option">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={theme === 'light'}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                />
                <span className="theme-option-content">
                  <strong>Light</strong>
                  <small>Clean and bright interface</small>
                </span>
              </label>

              <label className="theme-option">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={theme === 'dark'}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                />
                <span className="theme-option-content">
                  <strong>Dark</strong>
                  <small>Reduce eye strain in low light</small>
                </span>
              </label>

              <label className="theme-option">
                <input
                  type="radio"
                  name="theme"
                  value="auto"
                  checked={theme === 'auto'}
                  onChange={(e) => setTheme(e.target.value as Theme)}
                />
                <span className="theme-option-content">
                  <strong>Auto</strong>
                  <small>Match your system preference</small>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>API Keys</h2>
          <p className="section-description">
            Configure your API keys for external services to enable personalized access.
          </p>

          {/* DRM API Key Section */}
          <div className="api-key-card">
            <div className="card-header">
              <h3>Digi Remote Manager (DRM)</h3>
              <span className={`status-badge ${drmConfigured ? 'configured' : 'not-configured'}`}>
                {drmConfigured ? '✓ Configured' : 'Not Configured'}
              </span>
            </div>

            <p className="card-description">
              Enter your DRM API credentials to enable DANI to access your Digi Remote Manager account.
              Get your API keys from{' '}
              <a
                href="https://remotemanager.digi.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                DRM Profile → API Keys
              </a>
            </p>

            {drmConfigured && drmUpdatedAt && (
              <p className="last-updated">
                Last updated: {new Date(drmUpdatedAt).toLocaleString()}
              </p>
            )}

            <form onSubmit={handleSaveDrmKey} className="api-key-form">
              <div className="form-group">
                <label htmlFor="drmKeyId">API Key ID</label>
                <input
                  type="text"
                  id="drmKeyId"
                  value={drmKeyId}
                  onChange={(e) => setDrmKeyId(e.target.value)}
                  placeholder="Enter your DRM API Key ID"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="drmKeySecret">API Key Secret</label>
                <div className="password-input">
                  <input
                    type={showDrmSecret ? 'text' : 'password'}
                    id="drmKeySecret"
                    value={drmKeySecret}
                    onChange={(e) => setDrmKeySecret(e.target.value)}
                    placeholder="Enter your DRM API Key Secret"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowDrmSecret(!showDrmSecret)}
                    disabled={saving}
                  >
                    {showDrmSecret ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="save-button"
                  disabled={saving || (!drmKeyId.trim() && !drmKeySecret.trim())}
                >
                  {saving ? 'Saving...' : drmConfigured ? 'Update Credentials' : 'Save Credentials'}
                </button>

                {drmConfigured && (
                  <button
                    type="button"
                    className="delete-button"
                    onClick={handleDeleteDrmKey}
                    disabled={saving}
                  >
                    Delete Credentials
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
