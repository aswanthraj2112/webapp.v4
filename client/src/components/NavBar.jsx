import React from 'react';

function NavBar({ user, canManageUsers, activePage, onNavigate, onLogout }) {
  return (
    <header className="navbar">
      <div className="navbar-brand">Video Transcoder</div>
      <nav className="navbar-nav">
        {user && (
          <>
            <button
              type="button"
              className={`link ${activePage === 'dashboard' ? 'active' : ''}`}
              onClick={() => onNavigate('dashboard')}
            >
              Dashboard
            </button>
            {canManageUsers && (
              <button
                type="button"
                className={`link ${activePage === 'admin' ? 'active' : ''}`}
                onClick={() => onNavigate('admin')}
              >
                Admin
              </button>
            )}
          </>
        )}
      </nav>
      <div className="navbar-actions">
        {user ? (
          <>
            <span className="navbar-user">
              Signed in as <strong>{user.username}</strong>
            </span>
            <button type="button" className="btn" onClick={onLogout}>
              Sign out
            </button>
          </>
        ) : (
          <span className="navbar-user">Welcome!</span>
        )}
      </div>
    </header>
  );
}

export default NavBar;
