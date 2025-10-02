import React, { useEffect, useState } from 'react';
import api from '../api.js';
import Uploader from '../components/Uploader.jsx';
import VideoList from '../components/VideoList.jsx';
import VideoPlayer from '../components/VideoPlayer.jsx';

async function getVideoDuration(file) {
  return new Promise((resolve) => {
    const element = document.createElement('video');
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      const duration = element.duration;
      URL.revokeObjectURL(element.src);
      resolve(Number.isFinite(duration) ? duration : null);
    };
    element.onerror = () => {
      URL.revokeObjectURL(element.src);
      resolve(null);
    };
    element.src = URL.createObjectURL(file);
  });
}

function Dashboard({ user, notify }) {
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [transcodingVideos, setTranscodingVideos] = useState(new Set());

  const loadVideos = async (nextPage = page) => {
    setLoading(true);
    try {
      const data = await api.listVideos(nextPage, limit);
      setVideos(data.items);
      setTotal(data.total);

      // Initialize transcodingVideos set with any videos that are currently transcoding
      const currentTranscodingVideos = data.items
        .filter(video => video.status === 'transcoding')
        .map(video => video.id);

      if (currentTranscodingVideos.length > 0) {
        setTranscodingVideos(new Set(currentTranscodingVideos));
      } else {
        setTranscodingVideos(new Set());
      }
    } catch (error) {
      notify(error.message || 'Failed to load videos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Polling for transcoding videos only when needed
  useEffect(() => {
    // Only start polling if there are videos being transcoded
    if (transcodingVideos.size === 0) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        // Only reload videos when there are transcoding videos to check
        const data = await api.listVideos(page, limit);
        setVideos(data.items);
        setTotal(data.total);

        // Check transcoding status for specific videos
        if (transcodingVideos.size > 0) {
          const updatedVideos = [...data.items];
          let hasChanges = false;

          for (const videoId of transcodingVideos) {
            try {
              const status = await api.getTranscodingStatus(videoId);
              const videoIndex = updatedVideos.findIndex(v => v.id === videoId);

              if (videoIndex !== -1) {
                updatedVideos[videoIndex] = {
                  ...updatedVideos[videoIndex],
                  status: status.status,
                  transcodingProgress: status.transcodingProgress,
                  transcodedFilename: status.hasTranscodedVersion ? 'transcoded' : null,
                  thumbPath: status.hasThumbnail ? 'thumb' : null
                };
                hasChanges = true;

                // Remove from transcoding set if completed
                if (status.status !== 'transcoding') {
                  setTranscodingVideos(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(videoId);
                    return newSet;
                  });

                  if (status.status === 'transcoded') {
                    notify(`Video transcoding completed!`, 'success');
                  } else if (status.status === 'failed') {
                    notify(`Video transcoding failed`, 'error');
                  }
                }
              }
            } catch (error) {
              console.error('Failed to get transcoding status:', error);
            }
          }

          if (hasChanges) {
            setVideos(updatedVideos);
          }
        }
      } catch (error) {
        console.error('Failed to refresh videos:', error);
      }
    }, 5000); // Poll every 5 seconds only when there are transcoding videos

    return () => clearInterval(interval);
  }, [transcodingVideos, page, limit, notify]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const duration = await getVideoDuration(file);
      const session = await api.initiateUpload({ fileName: file.name, contentType: file.type || 'application/octet-stream' });
      await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      await api.finalizeUpload({
        videoId: session.videoId,
        originalName: file.name,
        s3Key: session.s3Key,
        sizeBytes: file.size,
        durationSeconds: duration ?? undefined,
        contentType: file.type || 'application/octet-stream'
      });
      notify(`Uploaded ${file.name}`, 'success');
      setPage(1);
      await loadVideos(1);
    } catch (error) {
      console.error(error);
      notify(error.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = async (video, variant = 'original') => {
    try {
      // Just set the selected video, let VideoPlayer handle stream loading
      setSelectedVideo({ ...video, selectedVariant: variant });
    } catch (error) {
      notify(error.message || 'Unable to select video', 'error');
    }
  };

  const handleDownload = async (video, variant = 'original') => {
    try {
      const url = await api.getStreamUrl(video.id, { download: true, variant });
      const link = document.createElement('a');
      link.href = url;
      link.download = `${video.originalName}_${variant}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      notify(error.message || 'Unable to download video', 'error');
    }
  };

  const handleTranscode = async (video, resolution) => {
    try {
      await api.startTranscoding(video.id, resolution);
      notify(`Transcoding to ${resolution} started for ${video.originalName}`, 'success');

      // Add to transcoding videos set for polling
      setTranscodingVideos(prev => new Set([...prev, video.id]));

      // Update video status immediately in the UI
      setVideos(prevVideos =>
        prevVideos.map(v =>
          v.id === video.id
            ? { ...v, status: 'transcoding', transcodingProgress: 0 }
            : v
        )
      );
    } catch (error) {
      notify(error.message || 'Failed to start transcoding', 'error');
    }
  };

  const handleDelete = async (video) => {
    if (!window.confirm(`Delete ${video.originalName}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteVideo(video.id);
      notify('Video deleted', 'info');
      if (selectedVideo?.id === video.id) {
        setSelectedVideo(null);
      }
      await loadVideos(page);
    } catch (error) {
      notify(error.message || 'Failed to delete video', 'error');
    }
  };

  return (
    <div className="dashboard">
      <section className="welcome">
        <h1>Hello, {user.username}!</h1>
        <p>Upload videos to Convert to 720p kick off a Conversion and stream directly from the browser.</p>
      </section>
      <Uploader onUpload={handleUpload} uploading={uploading} />
      <VideoList
        videos={videos}
        loading={loading}
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onSelect={handleSelect}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onTranscode={handleTranscode}
      />
      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  );
}

export default Dashboard;
