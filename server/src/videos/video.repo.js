let repoPromise;

async function loadRepo() {
  if (!repoPromise) {
    repoPromise = import('./video.repo.dynamo.js');
  }
  return repoPromise;
}

export async function createVideo(video) {
  const repo = await loadRepo();
  return repo.createVideo(video);
}

export async function getVideo(userId, videoId) {
  const repo = await loadRepo();
  return repo.getVideo(userId, videoId);
}

export async function listVideos(userId, page, limit) {
  const repo = await loadRepo();
  return repo.listVideos(userId, page, limit);
}

export async function updateVideo(userId, videoId, updates) {
  const repo = await loadRepo();
  return repo.updateVideo(userId, videoId, updates);
}

export async function deleteVideo(userId, videoId) {
  const repo = await loadRepo();
  return repo.deleteVideo(userId, videoId);
}
