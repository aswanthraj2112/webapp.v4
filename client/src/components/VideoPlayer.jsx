import React from 'react';

function VideoPlayer({ video, onClose }) {
  if (!video?.streamUrl) {
    return null;
  }

  return (
    <div className="video-player">
      <div className="video-player-header">
        <h3>{video.originalName}</h3>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
      <video controls src={video.streamUrl} className="video-player-element" />
    </div>
  );
}

export default VideoPlayer;
