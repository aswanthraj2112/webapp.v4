import cognitoService from '../auth/cognito.service.js';
import { removeVideoAsAdmin, fetchVideoMetadata, fetchAllVideos } from '../videos/video.service.js';

export const listAllUsers = async (req, res) => {
  const users = await cognitoService.listUsers();
  res.json({ users });
};

export const deleteUser = async (req, res) => {
  const { username } = req.params;
  await cognitoService.deleteUser(username);
  res.status(204).send();
};

export const listAllVideos = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const videos = await fetchAllVideos({ page, limit });
  res.json(videos);
};

export const deleteAnyVideo = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required in request body' });
  }

  await removeVideoAsAdmin({ userId, videoId });
  res.status(204).send();
};
