import React, { useEffect, useState } from 'react';
import api from '../api.js';

function AdminPage({ notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await api.listUsers();
      setUsers(result.users);
    } catch (error) {
      notify(error.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (username) => {
    if (!window.confirm(`Delete user ${username}?`)) {
      return;
    }
    try {
      await api.deleteUser(username);
      notify('User deleted', 'info');
      await loadUsers();
    } catch (error) {
      notify(error.message || 'Failed to delete user', 'error');
    }
  };

  return (
    <div className="admin-page">
      <header className="section-header">
        <h2>User management</h2>
        <button type="button" className="btn" onClick={loadUsers} disabled={loading}>
          Refresh
        </button>
      </header>
      {loading ? (
        <p>Loading users…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
              <th>Groups</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const email = user.attributes?.email || '—';
              const groups = user.attributes?.['cognito:groups'];
              const groupList = Array.isArray(groups) ? groups.join(', ') : groups || '—';
              return (
                <tr key={user.username}>
                  <td>{user.username}</td>
                  <td>{email}</td>
                  <td>{user.status}</td>
                  <td>{groupList}</td>
                  <td>
                    <button type="button" className="btn btn-danger" onClick={() => handleDelete(user.username)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminPage;
