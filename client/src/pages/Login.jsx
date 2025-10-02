import React, { useState } from 'react';
import { signIn, signUp, confirmSignUp, resendSignUpCode, confirmSignIn, setUpTOTP, verifyTOTPSetup } from 'aws-amplify/auth';

// MFA-enabled login component - Updated October 2025
function Login({ onAuthenticated, notify }) {
  const [mode, setMode] = useState('signIn');
  const [form, setForm] = useState({ username: '', password: '', email: '', code: '', newPassword: '' });
  const [pendingUsername, setPendingUsername] = useState('');
  const [challengeUser, setChallengeUser] = useState(null);
  const [challengeType, setChallengeType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [totpSetupUrl, setTotpSetupUrl] = useState(null);
  const [totpSetupDetails, setTotpSetupDetails] = useState(null);

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const resetForm = () => {
    setForm({ username: '', password: '', email: '', code: '', newPassword: '' });
    setChallengeUser(null);
    setChallengeType(null);
    setTotpSetupUrl(null);
    setTotpSetupDetails(null);
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    if (!form.username || !form.password) {
      notify('Username and password are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const user = await signIn({ username: form.username.trim(), password: form.password });
      if (user.challengeName) {
        setChallengeUser(user);
        switch (user.challengeName) {
          case 'SMS_MFA':
          case 'SOFTWARE_TOKEN_MFA':
          case 'CUSTOM_CHALLENGE':
            setChallengeType('mfa');
            notify('Enter the verification code to complete sign in.', 'info');
            break;
          case 'NEW_PASSWORD_REQUIRED':
            setChallengeType('newPassword');
            notify('A new password is required to continue.', 'info');
            break;
          case 'MFA_SETUP':
            setChallengeType('setupMfa');
            notify('MFA setup required. Follow the instructions to configure your authenticator app.', 'info');
            break;
          default:
            notify(`Unsupported challenge: ${user.challengeName}`, 'error');
        }
        return;
      }
      resetForm();
      await onAuthenticated();
    } catch (error) {
      notify(error.message || 'Unable to sign in', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    if (!form.username || !form.password || !form.email) {
      notify('Username, password, and email are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await signUp({
        username: form.username.trim(),
        password: form.password,
        options: {
          userAttributes: { email: form.email.trim() }
        }
      });
      notify('Registration successful! Check your email for the verification code.', 'success');
      setPendingUsername(form.username.trim());
      setMode('confirm');
      setForm((previous) => ({ ...previous, code: '' }));
    } catch (error) {
      notify(error.message || 'Unable to register', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    if (!pendingUsername || !form.code) {
      notify('Verification code is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await confirmSignUp({ username: pendingUsername, confirmationCode: form.code.trim() });
      notify('Account verified. You can now sign in.', 'success');
      setMode('signIn');
      resetForm();
    } catch (error) {
      notify(error.message || 'Unable to verify account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!pendingUsername) return;
    setSubmitting(true);
    try {
      await resendSignUpCode({ username: pendingUsername });
      notify('Verification code resent.', 'success');
    } catch (error) {
      notify(error.message || 'Unable to resend code', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitMfa = async (event) => {
    event.preventDefault();
    if (!challengeUser || !form.code) {
      notify('Enter the verification code to continue.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await confirmSignIn({ challengeResponse: form.code.trim() });
      resetForm();
      await onAuthenticated();
    } catch (error) {
      notify(error.message || 'Verification failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitNewPassword = async (event) => {
    event.preventDefault();
    if (!challengeUser || !form.newPassword) {
      notify('New password is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await confirmSignIn({ challengeResponse: form.newPassword });
      resetForm();
      await onAuthenticated();
    } catch (error) {
      notify(error.message || 'Unable to update password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupTotp = async () => {
    if (!challengeUser) return;
    setSubmitting(true);
    try {
      // The challengeUser from MFA_SETUP contains the session needed for setup
      // setUpTOTP should work with the challenge session context
      const totpSetupDetails = await setUpTOTP();

      // Generate the TOTP URI manually since we're in a challenge context
      const secretCode = totpSetupDetails.sharedSecret;
      const appName = 'VideoApp';
      const username = challengeUser.username || form.username;
      const issuer = encodeURIComponent(appName);
      const accountName = encodeURIComponent(`${issuer}:${username}`);
      const setupUri = `otpauth://totp/${accountName}?secret=${secretCode}&issuer=${issuer}`;

      setTotpSetupDetails({ secretCode, setupDetails: totpSetupDetails });
      setTotpSetupUrl(setupUri);
      notify('Scan the QR code with your authenticator app, then enter the verification code.', 'info');
    } catch (error) {
      console.error('TOTP setup error:', error);
      notify(error.message || 'Unable to set up TOTP. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTotpSetup = async (event) => {
    event.preventDefault();
    if (!form.code || !totpSetupDetails) {
      notify('Enter the verification code from your authenticator app', 'error');
      return;
    }
    setSubmitting(true);
    try {
      // Complete the TOTP setup verification
      await verifyTOTPSetup({ code: form.code.trim() });

      // After verification, continue with the auth challenge
      // Try to complete the sign-in process
      await confirmSignIn({ challengeResponse: 'SOFTWARE_TOKEN_MFA' });

      // If successful, authentication should be complete
      resetForm();
      await onAuthenticated();
    } catch (error) {
      console.error('TOTP verification error:', error);
      if (error.message.includes('Invalid code') || error.message.includes('Code mismatch')) {
        notify('Invalid verification code. Please check your authenticator app and try again.', 'error');
      } else if (error.message.includes('setup') && error.message.includes('complete')) {
        // Setup completed but need to sign in again
        notify('MFA setup complete! Please sign in again with your authenticator app.', 'success');
        setMode('signIn');
        resetForm();
      } else {
        notify(error.message || 'Verification failed. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'confirm') {
    return (
      <div className="auth-card">
        <h2>Verify your account</h2>
        <p>A code was sent to {pendingUsername}. Enter it below to activate your account.</p>
        <form onSubmit={handleConfirm}>
          <label htmlFor="code">Verification code</label>
          <input
            id="code"
            name="code"
            type="text"
            value={form.code}
            onChange={handleChange}
            maxLength={6}
            disabled={submitting}
          />
          <button type="submit" className="btn" disabled={submitting || !form.code}>
            {submitting ? 'Verifying…' : 'Confirm account'}
          </button>
        </form>
        <div className="auth-actions">
          <button type="button" className="btn-link" onClick={handleResend} disabled={submitting}>
            Resend code
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setMode('signIn');
              setPendingUsername('');
              resetForm();
            }}
            disabled={submitting}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (challengeType === 'mfa') {
    return (
      <div className="auth-card">
        <h2>Multi-factor authentication</h2>
        <form onSubmit={handleSubmitMfa}>
          <label htmlFor="code">Verification code</label>
          <input
            id="code"
            name="code"
            type="text"
            value={form.code}
            onChange={handleChange}
            disabled={submitting}
          />
          <button type="submit" className="btn" disabled={submitting || !form.code}>
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        <button type="button" className="btn-link" onClick={() => setMode('signIn')} disabled={submitting}>
          Cancel
        </button>
      </div>
    );
  }

  if (challengeType === 'newPassword') {
    return (
      <div className="auth-card">
        <h2>Set a new password</h2>
        <form onSubmit={handleSubmitNewPassword}>
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            disabled={submitting}
          />
          <button type="submit" className="btn" disabled={submitting || !form.newPassword}>
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    );
  }

  if (challengeType === 'setupMfa') {
    return (
      <div className="auth-card">
        <h2>Multi-factor authentication setup</h2>
        {!totpSetupUrl ? (
          <div>
            <p>
              Your account requires MFA setup. We'll configure TOTP (Time-based One-Time Password)
              using an authenticator app like Google Authenticator, Authy, Microsoft Authenticator, or similar.
            </p>
            <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '4px', border: '1px solid #d1ecf1' }}>
              <h4>Instructions:</h4>
              <ol>
                <li>Install an authenticator app on your phone if you don't have one</li>
                <li>Click "Set up authenticator app" below</li>
                <li>Scan the QR code or enter the setup key manually</li>
                <li>Enter the 6-digit code from your app to complete setup</li>
              </ol>
            </div>
            <button
              type="button"
              className="btn"
              onClick={handleSetupTotp}
              disabled={submitting}
            >
              {submitting ? 'Setting up...' : 'Set up authenticator app'}
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setMode('signIn');
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel and go back
            </button>
          </div>
        ) : (
          <div>
            <p><strong>Step 1:</strong> Scan this QR code with your authenticator app</p>
            <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ marginBottom: '15px' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpSetupUrl)}`}
                  alt="QR Code for TOTP Setup"
                  style={{ border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <details>
                <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                  Can't scan? Click to show manual setup key
                </summary>
                <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '4px', fontSize: '12px' }}>
                  <p><strong>Secret Key:</strong></p>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', padding: '5px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '3px', wordBreak: 'break-all' }}>
                    {totpSetupDetails.secretCode}
                  </div>
                  <p style={{ marginTop: '10px' }}><strong>Account Name:</strong> VideoApp:{challengeUser?.username || form.username}</p>
                  <p><strong>Issuer:</strong> VideoApp</p>
                </div>
              </details>
            </div>

            <p><strong>Step 2:</strong> Enter the 6-digit code from your authenticator app</p>
            <form onSubmit={handleConfirmTotpSetup}>
              <label htmlFor="code">Verification code</label>
              <input
                id="code"
                name="code"
                type="text"
                value={form.code}
                onChange={handleChange}
                placeholder="123456"
                maxLength={6}
                disabled={submitting}
                style={{ textAlign: 'center', fontSize: '18px', letterSpacing: '2px' }}
              />
              <button type="submit" className="btn" disabled={submitting || !form.code || form.code.length !== 6}>
                {submitting ? 'Verifying...' : 'Complete MFA setup'}
              </button>
            </form>
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setTotpSetupUrl(null);
                setTotpSetupDetails(null);
                setForm({ ...form, code: '' });
              }}
              disabled={submitting}
            >
              Back to setup instructions
            </button>
          </div>
        )}
      </div>
    );
  } return (
    <div className="auth-card">
      <h2>{mode === 'signIn' ? 'Sign in' : 'Create an account'}</h2>
      <form onSubmit={mode === 'signIn' ? handleSignIn : handleSignUp}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={form.username}
          onChange={handleChange}
          disabled={submitting}
        />
        {mode === 'signUp' && (
          <>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              disabled={submitting}
            />
          </>
        )}
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          value={form.password}
          onChange={handleChange}
          disabled={submitting}
        />
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Register'}
        </button>
      </form>
      <button
        type="button"
        className="btn-link"
        onClick={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
          resetForm();
        }}
        disabled={submitting}
      >
        {mode === 'signIn' ? 'Need an account? Register' : 'Already registered? Sign in'}
      </button>
    </div>
  );
}

export default Login;
