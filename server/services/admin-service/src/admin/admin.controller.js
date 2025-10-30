import cognitoService from './cognito.service.js';
import videoService from './video.service.js';

/**
 * List all users in Cognito
 * GET /api/admin/users
 */
export const listAllUsers = async (req, res) => {
    const users = await cognitoService.listUsers();
    res.json({ users });
};

/**
 * Delete a user from Cognito
 * DELETE /api/admin/users/:username
 */
export const deleteUser = async (req, res) => {
    const { username } = req.params;
    await cognitoService.deleteUser(username);
    res.status(204).send();
};

/**
 * List all videos (admin view)
 * GET /api/admin/videos
 */
export const listAllVideos = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const videos = await videoService.fetchAllVideos({ page, limit });
    res.json(videos);
};

/**
 * Delete any user's video (admin action)
 * DELETE /api/admin/videos/:videoId
 */
export const deleteAnyVideo = async (req, res) => {
    const { videoId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required in request body' });
    }

    await videoService.removeVideoAsAdmin({ userId, videoId });
    res.status(204).send();
};
