import React, { useState, useRef, useEffect } from 'react';

function VideoPlayer({ video, onClose }) {
  const [selectedQuality, setSelectedQuality] = useState('original');
  const [currentStreamUrl, setCurrentStreamUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Available quality options
  const qualityOptions = [
    { value: 'original', label: 'Original', available: true },
    { value: 'transcoded', label: '720p HD', available: !!video?.transcodedFilename }
  ].filter(option => option.available);

  useEffect(() => {
    if (video) {
      loadVideo(selectedQuality);
    }
  }, [video, selectedQuality]);

  const loadVideo = async (quality) => {
    if (!video) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/videos/${video.id}/stream?variant=${quality}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentStreamUrl(data.url);
      }
    } catch (error) {
      console.error('Failed to load video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQualityChange = (newQuality) => {
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

  const handleDownloadCurrent = () => {
    if (currentStreamUrl) {
      const link = document.createElement('a');
      link.href = currentStreamUrl;
      link.download = `${video.originalName}_${selectedQuality}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
              disabled={!currentStreamUrl || loading}
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
