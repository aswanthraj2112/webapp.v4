import express from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../../../shared/auth/middleware.js';
import asyncHandler from '../../../../shared/utils/asyncHandler.js';
import { validateBody } from '../../../../shared/utils/validate.js';
import { listAllUsers, deleteUser, deleteAnyVideo, listAllVideos } from './admin.controller.js';

const router = express.Router();

// Validation schemas
const deleteVideoSchema = z.object({
    userId: z.string().min(1)
});

// Apply authentication and admin authorization to all routes
router.use(authenticate, requireAdmin);

// Debug endpoint to check JWT token contents
router.get('/debug-token', (req, res) => {
    res.json({
        user: req.user,
        groups: req.user?.groups,
        isAdmin: req.user?.groups?.includes('admin')
    });
});

// User management
router.get('/users', asyncHandler(listAllUsers));
router.delete('/users/:username', asyncHandler(deleteUser));

// Video management
router.get('/videos', asyncHandler(listAllVideos));
router.delete('/videos/:videoId', validateBody(deleteVideoSchema), asyncHandler(deleteAnyVideo));

export default router;
