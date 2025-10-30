import express from 'express';
import { z } from 'zod';
import asyncHandler from '../../../shared/utils/asyncHandler.js';
import { validateBody } from '../../../shared/utils/validate.js';
import { authenticate } from '../../../shared/auth/middleware.js';
import {
    signUp,
    signIn,
    respondToChallenge,
    refreshSession,
    me,
    confirmSignUp,
    resendConfirmationCode
} from './auth.controller.js';

const router = express.Router();

// Validation schemas
const signUpSchema = z.object({
    username: z.string().min(3).max(128),
    password: z.string().min(8).max(256),
    email: z.string().email()
});

const signInSchema = z.object({
    username: z.string().min(3).max(128),
    password: z.string().min(8).max(256)
});

const confirmationSchema = z.object({
    username: z.string().min(3).max(32),
    confirmationCode: z.string().min(6).max(6)
});

const usernameSchema = z.object({
    username: z.string().min(3).max(128)
});

const challengeSchema = z.object({
    session: z.string(),
    challengeName: z.string(),
    challengeResponses: z.record(z.string(), z.string())
});

const refreshSchema = z.object({
    username: z.string().min(3).max(128),
    refreshToken: z.string().min(10)
});

// Routes
router.post('/signup', validateBody(signUpSchema), asyncHandler(signUp));
router.post('/signin', validateBody(signInSchema), asyncHandler(signIn));
router.post('/challenge', validateBody(challengeSchema), asyncHandler(respondToChallenge));
router.post('/refresh', validateBody(refreshSchema), asyncHandler(refreshSession));
router.post('/confirm', validateBody(confirmationSchema), asyncHandler(confirmSignUp));
router.post('/resend', validateBody(usernameSchema), asyncHandler(resendConfirmationCode));
router.get('/me', authenticate, asyncHandler(me));

export default router;
