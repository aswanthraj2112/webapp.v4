import express from 'express';
import { z } from 'zod';
import authMiddleware from '../auth/auth.middleware.js';
import asyncHandler from '../utils/asyncHandler.js';
import config from '../config.js';
import { validateBody } from '../utils/validate.js';
import { listAllUsers, deleteUser, deleteAnyVideo, listAllVideos } from './admin.controller.js';

const router = express.Router();

const ensureAdmin = (req, res, next) => {
  const groups = req.user?.groups || [];
  if (!groups.includes(config.ADMIN_GROUP)) {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  return next();
}; const deleteSchema = z.object({
  username: z.string().min(1)
});

const deleteVideoSchema = z.object({
  userId: z.string().min(1)
});

router.use(authMiddleware, ensureAdmin);

// Debug endpoint to check JWT token contents
router.get('/debug-token', (req, res) => {
  res.json({
    user: req.user,
    groups: req.user?.groups,
    rawClaims: req.user?.raw
  });
});

router.get('/users', asyncHandler(listAllUsers));
router.delete('/users/:username', (req, res, next) => {
  const parse = deleteSchema.safeParse(req.params);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid username parameter' });
  }
  return asyncHandler(deleteUser)(req, res, next);
});
router.get('/videos', asyncHandler(listAllVideos));
router.delete('/videos/:videoId', validateBody(deleteVideoSchema), asyncHandler(deleteAnyVideo));

export default router;
