import React, { useEffect, useState } from 'react';
import api from '../api.js';

function AdminPage({ notify }) {
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

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

  const loadVideos = async () => {
    setLoading(true);
    try {
      const result = await api.listAllVideos();
      setVideos(result.items || []);
    } catch (error) {
      notify(error.message || 'Failed to load videos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'videos') {
      loadVideos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleDeleteUser = async (username) => {
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

  const handleDeleteVideo = async (video) => {
    if (!window.confirm(`Delete video "${video.originalName}" by ${video.ownerId}?`)) {
      return;
    }
    try {
      await api.deleteAnyVideo(video.videoId, video.ownerId);
      notify('Video deleted', 'info');
      await loadVideos();
    } catch (error) {
      notify(error.message || 'Failed to delete video', 'error');
    }
  };

  return (
    <div className="admin-page">
      <header className="section-header">
        <h2>Administration</h2>
        <div className="admin-tabs">
          <button
            type="button"
            className={`btn ${activeTab === 'users' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'videos' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            Videos
          </button>
        </div>
        <button
          type="button"
          className="btn"
          onClick={activeTab === 'users' ? loadUsers : loadVideos}
          disabled={loading}
        >
          Refresh
        </button>
      </header>

      {activeTab === 'users' && (
        <div className="admin-section">
          <h3>User Management</h3>
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
                        <button type="button" className="btn btn-danger" onClick={() => handleDeleteUser(user.username)}>
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
      )}

      {activeTab === 'videos' && (
        <div className="admin-section">
          <h3>Video Management</h3>
          {loading ? (
            <p>Loading videos…</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={`${video.ownerId}-${video.videoId}`}>
                    <td>{video.originalName || video.title}</td>
                    <td>{video.ownerId}</td>
                    <td>{video.status}</td>
                    <td>{new Date(video.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button type="button" className="btn btn-danger" onClick={() => handleDeleteVideo(video)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
