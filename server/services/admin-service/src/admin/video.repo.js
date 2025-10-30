let repoPromise;

async function loadRepo() {
    if (!repoPromise) {
        repoPromise = import('./video.repo.dynamo.js');
    }
    return repoPromise;
}

class VideoRepo {
    async getVideo(userId, videoId) {
        const repo = await loadRepo();
        return repo.getVideo(userId, videoId);
    }

    async deleteVideo(userId, videoId) {
        const repo = await loadRepo();
        return repo.deleteVideo(userId, videoId);
    }

    async listAllVideos(page, limit) {
        const repo = await loadRepo();
        return repo.listAllVideos(page, limit);
    }
}

export default new VideoRepo();
