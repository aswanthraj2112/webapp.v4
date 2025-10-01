import React from 'react';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return 'Unknown';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
  if (h > 0) {
    parts.unshift(h.toString());
  }
  return parts.join(':');
};

function VideoList({ videos, loading, page, limit, total, onPageChange, onSelect, onDownload, onDelete }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const goToPage = (nextPage) => {
    if (nextPage >= 1 && nextPage <= totalPages) {
      onPageChange(nextPage);
    }
  };

  if (loading) {
    return (
      <section className="video-list">
        <p>Loading videos…</p>
      </section>
    );
  }

  if (!loading && videos.length === 0) {
    return (
      <section className="video-list">
        <p>No uploads yet. Drop a file above to get started!</p>
      </section>
    );
  }

  return (
    <section className="video-list">
      <header className="section-header">
        <h2>Your videos</h2>
        <div className="pagination">
          <button type="button" className="btn" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button type="button" className="btn" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </div>
      </header>
      <ul className="video-grid">
        {videos.map((video) => (
          <li key={video.id} className="video-card">
            <div className="video-info">
              <h3 title={video.originalName}>{video.originalName}</h3>
              <p>Duration: {formatDuration(video.durationSec)}</p>
              <p>Size: {formatBytes(video.sizeBytes)}</p>
              <p>Status: <span className={`status status-${video.status}`}>{video.status}</span></p>
              <p>Uploaded: {video.createdAt ? new Date(video.createdAt).toLocaleString() : 'Unknown'}</p>
            </div>
            <div className="video-actions">
              <button type="button" className="btn" onClick={() => onSelect(video)}>
                Play
              </button>
              <button type="button" className="btn" onClick={() => onDownload(video)}>
                Download
              </button>
              <button type="button" className="btn btn-danger" onClick={() => onDelete(video)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default VideoList;
