import React, { useState } from 'react';
import { signIn, signUp, confirmSignUp, resendSignUpCode, confirmSignIn } from 'aws-amplify/auth';

function Login({ onAuthenticated, notify }) {
  const [mode, setMode] = useState('signIn');
  const [form, setForm] = useState({ username: '', password: '', email: '', code: '', newPassword: '' });
  const [pendingUsername, setPendingUsername] = useState('');
  const [challengeUser, setChallengeUser] = useState(null);
  const [challengeType, setChallengeType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const resetForm = () => {
    setForm({ username: '', password: '', email: '', code: '', newPassword: '' });
    setChallengeUser(null);
    setChallengeType(null);
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
            notify('Please set up MFA using the Cognito hosted UI.', 'warning');
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
        <h2>Multi-factor setup required</h2>
        <p>
          Your account requires MFA configuration. Please complete the setup in the AWS Cognito hosted UI or
          contact the administrator for assistance.
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setMode('signIn');
            resetForm();
          }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
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
