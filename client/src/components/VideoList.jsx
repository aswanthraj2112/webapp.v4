import React, { useState, useEffect } from 'react';
import api from '../api.js';

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

function VideoList({ videos, loading, page, limit, total, onPageChange, onSelect, onDownload, onDelete, onTranscode }) {
  const [transcodingVideos, setTranscodingVideos] = useState(new Set());
  const [thumbnailUrls, setThumbnailUrls] = useState({});

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Load thumbnail URLs with authentication
  useEffect(() => {
    const loadThumbnails = async () => {
      const newThumbnailUrls = {};
      for (const video of videos) {
        if (video.thumbPath && !thumbnailUrls[video.id]) {
          try {
            const url = await api.getStreamUrl(video.id, { variant: 'thumbnail' });
            newThumbnailUrls[video.id] = url;
          } catch (error) {
            console.error(`Failed to load thumbnail for ${video.id}:`, error);
          }
        }
      }
      if (Object.keys(newThumbnailUrls).length > 0) {
        setThumbnailUrls(prev => ({ ...prev, ...newThumbnailUrls }));
      }
    };
    loadThumbnails();
  }, [videos, thumbnailUrls]);

  const goToPage = (nextPage) => {
    if (nextPage >= 1 && nextPage <= totalPages) {
      onPageChange(nextPage);
    }
  };

  const handleTranscode = async (video, resolution) => {
    setTranscodingVideos(prev => new Set([...prev, video.id]));
    try {
      await onTranscode(video, resolution);
    } finally {
      setTranscodingVideos(prev => {
        const updated = new Set(prev);
        updated.delete(video.id);
        return updated;
      });
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
            {/* Video thumbnail */}
            <div className="video-thumbnail">
              {video.thumbPath && thumbnailUrls[video.id] ? (
                <img
                  src={thumbnailUrls[video.id]}
                  alt={video.originalName}
                  className="thumbnail-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              {(!video.thumbPath || !thumbnailUrls[video.id]) && (
                <div className="thumbnail-placeholder">
                  <span>📹</span>
                </div>
              )}
              <div className="duration-overlay">
                {formatDuration(video.durationSec)}
              </div>
            </div>

            <div className="video-info">
              <h3 title={video.originalName}>{video.originalName}</h3>
              <p>Status: <span className={`status status-${video.status}`}>{video.status}</span></p>
              {video.status === 'transcoding' && video.transcodingProgress && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${video.transcodingProgress}%` }}></div>
                  <span className="progress-text">{video.transcodingProgress}%</span>
                </div>
              )}
              {video.transcodedFilename && (
                <p className="transcoded-indicator">✅ Transcoded version available</p>
              )}
              <div className="video-meta">
                <span>Size: {formatBytes(video.sizeBytes)}</span>
                <span>Uploaded: {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>

            <div className="video-actions">
              <button type="button" className="btn btn-primary" onClick={() => onSelect(video)}>
                Play
              </button>

              {video.transcodedFilename && (
                <button type="button" className="btn btn-secondary" onClick={() => onSelect(video, 'transcoded')}>
                  Play HD
                </button>
              )}

              {/* Enhanced download options */}
              <div className="download-options">
                <button type="button" className="btn btn-outline" onClick={() => onDownload(video, 'original')}>
                  Download original
                </button>
                {video.transcodedFilename && (
                  <button type="button" className="btn btn-outline" onClick={() => onDownload(video, 'transcoded')}>
                    Download 720p
                  </button>
                )}
              </div>

              {/* Enhanced transcoding options */}
              {video.status !== 'transcoding' && !video.transcodedFilename && (
                <div className="transcode-section">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleTranscode(video, '720p')}
                    disabled={transcodingVideos.has(video.id)}
                  >
                    {transcodingVideos.has(video.id) ? 'Transcoding...' : 'Transcode 720p'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleTranscode(video, '1080p')}
                    disabled={transcodingVideos.has(video.id)}
                  >
                    {transcodingVideos.has(video.id) ? 'Transcoding...' : 'Transcode 1080p'}
                  </button>
                </div>
              )}

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
