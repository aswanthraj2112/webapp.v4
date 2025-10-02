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

const buildUserFromSession = async () => {
  const session = await fetchAuthSession();
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
};

function App() {
  const [toast, setToast] = useState(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [configError, setConfigError] = useState(null);

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
        }
      }
    })();

    const listener = ({ payload }) => {
      if (payload.event === 'signOut') {
        setUser(null);
        setActivePage('dashboard');
      }
      if (payload.event === 'signIn') {
        buildUserFromSession().then((sessionUser) => {
          setUser(sessionUser);
          setActivePage('dashboard');
        }).catch(() => { });
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
      const sessionUser = await buildUserFromSession();
      setUser(sessionUser);
      setActivePage('dashboard');
      notify(`Welcome back, ${sessionUser.username}!`, 'success');
    } catch (error) {
      console.error('Failed to refresh session', error);
      notify('Unable to refresh session', 'error');
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
