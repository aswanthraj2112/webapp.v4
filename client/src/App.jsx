import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Hub } from 'aws-amplify/utils';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { jwtDecode } from 'jwt-decode';
import api from './api.js';
import NavBar from './components/NavBar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminPage from './pages/Admin.jsx';

export const ToastContext = createContext(() => { });

// Safe wrapper around fetchAuthSession that handles MFA edge cases
const safeFetchAuthSession = async () => {
  try {
    const session = await fetchAuthSession({ forceRefresh: false });
    return session;
  } catch (error) {
    console.warn('fetchAuthSession failed:', error.message);

    // Check for specific error patterns that indicate auth challenges
    const errorMessage = error.message || '';
    const isAuthChallenge = errorMessage.includes('challenge') ||
      errorMessage.includes('MFA') ||
      errorMessage.includes('authentication challenge') ||
      errorMessage.includes('NotAuthorizedException') ||
      errorMessage.includes('UserNotConfirmedException') ||
      errorMessage.includes('PasswordResetRequiredException') ||
      errorMessage.includes('No valid session available');

    if (isAuthChallenge) {
      console.debug('Auth challenge detected, not retrying fetchAuthSession');
      throw new Error('Session unavailable during authentication challenge');
    }

    // For other errors, return a safe empty session
    console.debug('Non-challenge auth error, returning empty session');
    return { tokens: null, credentials: null };
  }
};

const buildUserFromSession = async (retryCount = 0, skipRetry = false) => {
  try {
    const session = await safeFetchAuthSession();

    console.debug('Session state:', {
      session: session ? 'exists' : 'null',
      tokens: session && session.tokens ? 'exists' : 'null',
      hasIdToken: !!(session && session.tokens && session.tokens.idToken),
      hasAccessToken: !!(session && session.tokens && session.tokens.accessToken),
      hasRefreshToken: !!(session && session.tokens && session.tokens.refreshToken),
      isSignedIn: !!(session && session.credentials),
      retryCount,
      skipRetry
    });

    // Check if session exists and has tokens
    if (!session || !session.tokens) {
      // Only retry once and only for non-challenge errors
      if (retryCount === 0 && !skipRetry) {
        console.debug('Session or tokens missing, retrying after short delay...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return buildUserFromSession(1, true); // Skip further retries
      }
      throw new Error('No valid session available');
    }

    // Check if tokens are available (they may not be during MFA challenges)
    if (!session.tokens.idToken || !session.tokens.accessToken) {
      // Don't retry for missing tokens as this usually indicates an auth challenge
      throw new Error('Session tokens not available - authentication may be incomplete');
    }

    const idToken = session.tokens.idToken.toString();
    const accessToken = session.tokens.accessToken.toString();
    const payload = jwtDecode(idToken);
    const groups = payload['cognito:groups'];
    return {
      username: payload['cognito:username'] || payload.username,
      email: payload.email,
      sub: payload.sub,
      groups: Array.isArray(groups) ? groups : groups ? [groups] : [],
      idToken,
      accessToken,
      refreshToken: session.tokens.refreshToken?.toString()
    };
  } catch (error) {
    // Only log actual errors, not authentication challenges
    if (!error.message.includes('authentication challenge') &&
      !error.message.includes('Session unavailable during authentication challenge')) {
      console.error('Error in buildUserFromSession:', error);
    } else {
      console.debug('Session unavailable due to authentication challenge:', error.message);
    }
    throw error;
  }
};

function App() {
  const [toast, setToast] = useState(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [configError, setConfigError] = useState(null);
  const [inMfaChallenge, setInMfaChallenge] = useState(false);

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      if (event.reason && event.reason.message) {
        const message = event.reason.message;
        // Suppress authentication-related errors to prevent console spam
        if (message.includes('idToken') ||
          message.includes('authentication may be incomplete') ||
          message.includes('Session tokens not available') ||
          message.includes('No valid session available') ||
          message.includes('authentication challenge') ||
          message.includes('Session unavailable during authentication challenge') ||
          message.includes('MFA') ||
          message.includes('challenge')) {
          console.debug('Suppressed authentication-related error:', message);
          event.preventDefault(); // Prevent the error from being logged to console
          return;
        }
      }
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const configResponse = await api.getConfig();
        if (cancelled) return;
        const { cognito } = configResponse;
        if (!cognito?.clientId) {
          throw new Error('Cognito configuration missing.');
        }
        Amplify.configure({
          Auth: {
            Cognito: {
              region: cognito.region,
              userPoolId: cognito.userPoolId,
              userPoolClientId: cognito.clientId,
              loginWith: {
                username: true,
                email: false
              }
            }
          }
        });
        setAuthConfigured(true);
      } catch (error) {
        console.error('Failed to initialise configuration', error);
        if (!cancelled) {
          setConfigError(error.message);
          notify('Failed to load configuration. Please try again later.', 'error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  useEffect(() => {
    if (!authConfigured) {
      return;
    }
    let cancelled = false;
    setLoadingUser(true);
    (async () => {
      try {
        const sessionUser = await buildUserFromSession();
        if (!cancelled) {
          setUser(sessionUser);
        }
      } catch (error) {
        console.error('Initial session load failed:', error);
        if (!cancelled) {
          setUser(null);
        }
        // Don't show error notifications for initial load failures
        // as they might be normal (user not signed in, MFA pending, etc.)
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
        }
      }
    })();

    const listener = ({ payload }) => {
      console.debug('Auth event received:', payload.event);

      if (payload.event === 'signOut') {
        setUser(null);
        setActivePage('dashboard');
      }
      if (payload.event === 'signIn') {
        // Don't immediately try to build session - there might be pending MFA
        // Add a delay and more robust checking
        setTimeout(async () => {
          try {
            const sessionUser = await buildUserFromSession();
            setUser(sessionUser);
            setActivePage('dashboard');
            console.debug('Successfully built user session after sign-in event');
          } catch (error) {
            console.debug('Sign-in session build failed (may be normal during MFA):', error.message);
            // If session building fails, it might be because MFA is still pending
            // Don't show error to user, just stay in current state
            // The user will be prompted to complete authentication as needed
          }
        }, 2000); // 2 second delay to allow MFA completion
      }
      if (payload.event === 'signIn_failure') {
        console.debug('Sign-in failed');
      }
      if (payload.event === 'signUp') {
        console.debug('Sign-up event received');
      }
    };

    const unsubscribe = Hub.listen('auth', listener);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authConfigured]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      notify('Signed out', 'info');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const handleAuthenticated = async () => {
    try {
      // Add a delay before trying to build session to ensure authentication is complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      const sessionUser = await buildUserFromSession(0, false);
      setUser(sessionUser);
      setActivePage('dashboard');
      notify(`Welcome back, ${sessionUser.username}!`, 'success');
    } catch (error) {
      console.debug('Failed to refresh session after authentication:', error.message);

      // Check if this is an authentication challenge error
      if (error.message.includes('authentication may be incomplete') ||
        error.message.includes('Session unavailable during authentication challenge') ||
        error.message.includes('No valid session available')) {
        console.debug('Authentication appears incomplete, user may need to complete MFA or other challenges');
        notify('Please complete the sign-in process', 'warning');
      } else {
        console.error('Unexpected error during session refresh:', error);
        notify('Unable to refresh session. Please try signing in again.', 'error');
      }
    }
  };

  const canManageUsers = user?.groups?.includes('admins') || user?.groups?.includes('Administrators');

  const toastValue = useMemo(() => notify, [notify]);

  let mainContent;
  if (configError) {
    mainContent = (
      <div className="auth-card">
        <h2>Configuration error</h2>
        <p>{configError}</p>
      </div>
    );
  } else if (!authConfigured || loadingUser) {
    mainContent = (
      <div className="auth-card">
        <h2>Loading…</h2>
        <p>Preparing secure session…</p>
      </div>
    );
  } else if (!user) {
    mainContent = (
      <Login onAuthenticated={handleAuthenticated} notify={notify} />
    );
  } else if (activePage === 'admin' && canManageUsers) {
    mainContent = <AdminPage notify={notify} />;
  } else {
    mainContent = <Dashboard user={user} notify={notify} />;
  }

  return (
    <ToastContext.Provider value={toastValue}>
      <div className="app">
        <NavBar
          user={user}
          canManageUsers={canManageUsers}
          activePage={activePage}
          onNavigate={setActivePage}
          onLogout={handleSignOut}
        />
        <main className="container">
          {mainContent}
        </main>
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export default App;
