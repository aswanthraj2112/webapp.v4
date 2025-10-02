import React, { useState, useRef, useEffect } from 'react';
import api from '../api.js';

function VideoPlayer({ video, onClose }) {
  const [selectedQuality, setSelectedQuality] = useState('original');
  const [currentStreamUrl, setCurrentStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Available quality options
  const qualityOptions = [
    { value: 'original', label: 'Original', available: true },
    { value: 'transcoded', label: video?.transcodedFilename ? 'HD' : '720p/1080p HD', available: !!video?.transcodedFilename }
  ].filter(option => option.available);

  useEffect(() => {
    if (video) {
      loadVideo(selectedQuality);
    }
  }, [video, selectedQuality]);

  const loadVideo = async (quality) => {
    if (!video) return;

    setLoading(true);
    setCurrentStreamUrl(''); // Clear previous URL
    try {
      console.log(`🎬 VideoPlayer: Loading ${quality} for video ${video.id}`);
      const url = await api.getStreamUrl(video.id, { variant: quality });
      console.log(`🎬 VideoPlayer: Got URL:`, url);

      // Validate URL
      if (!url || !url.startsWith('http')) {
        throw new Error('Invalid URL received from server');
      }

      setCurrentStreamUrl(url);
    } catch (error) {
      console.error('Failed to load video:', error);
      setCurrentStreamUrl(''); // Ensure URL is cleared on error
    } finally {
      setLoading(false);
    }
  }; const handleQualityChange = (newQuality) => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
    setSelectedQuality(newQuality);
  };

  const handleVideoLoaded = () => {
    if (videoRef.current && currentTime > 0) {
      videoRef.current.currentTime = currentTime;
    }
  };

  const handleDownloadCurrent = async () => {
    try {
      const url = await api.getStreamUrl(video.id, { variant: selectedQuality, download: true });
      const link = document.createElement('a');
      link.href = url;
      link.download = `${video.originalName}_${selectedQuality}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download video:', error);
    }
  };

  if (!video) {
    return null;
  }

  return (
    <div className="video-player-overlay">
      <div className="video-player-modal">
        <div className="video-player-header">
          <h3>{video.originalName}</h3>

          <div className="video-player-controls">
            {/* Quality selector */}
            <div className="quality-selector">
              <label>Quality:</label>
              <select
                value={selectedQuality}
                onChange={(e) => handleQualityChange(e.target.value)}
                disabled={loading}
              >
                {qualityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Download current quality */}
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDownloadCurrent}
              disabled={loading}
            >
              Download current
            </button>

            <button type="button" className="btn btn-danger" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="video-player-content">
          {loading ? (
            <div className="video-loading">
              <p>Loading video...</p>
            </div>
          ) : currentStreamUrl ? (
            <video
              ref={videoRef}
              controls
              src={currentStreamUrl}
              className="video-player-element"
              onLoadedData={handleVideoLoaded}
              autoPlay
            />
          ) : (
            <div className="video-error">
              <p>Failed to load video</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
