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

  const loadVideos = async (nextPage = page) => {
    setLoading(true);
    try {
      const data = await api.listVideos(nextPage, limit);
      setVideos(data.items);
      setTotal(data.total);
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

  const handleSelect = async (video) => {
    try {
      const streamUrl = await api.getStreamUrl(video.id);
      setSelectedVideo({ ...video, streamUrl });
    } catch (error) {
      notify(error.message || 'Unable to generate stream URL', 'error');
    }
  };

  const handleDownload = async (video) => {
    try {
      const url = await api.getStreamUrl(video.id, { download: true });
      window.open(url, '_blank');
    } catch (error) {
      notify(error.message || 'Unable to download video', 'error');
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
        <p>Upload videos directly to Amazon S3 and stream them securely.</p>
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
      />
      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  );
}

export default Dashboard;
