import cognitoService from './cognito.service.js';
import { AppError } from '../../../../shared/utils/errors.js';

/**
 * Decode JWT token payload
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const decodeJwt = (token) => {
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(normalized, 'base64').toString('utf8');
        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

/**
 * Build user object from JWT tokens
 * @param {Object} tokens - Token object with idToken and accessToken
 * @returns {Object} User object
 */
const buildUserFromTokens = (tokens) => {
    const idClaims = tokens.idToken ? decodeJwt(tokens.idToken) : null;
    const accessClaims = tokens.accessToken ? decodeJwt(tokens.accessToken) : null;
    const claims = idClaims || accessClaims || {};
    const groups = claims['cognito:groups'];
    return {
        username: claims['cognito:username'] || claims.username,
        sub: claims.sub,
        email: claims.email,
        groups: Array.isArray(groups) ? groups : groups ? [groups] : []
    };
};

/**
 * Sign up a new user
 * POST /api/auth/signup
 */
export const signUp = async (req, res) => {
    try {
        const { username, password, email } = req.validatedBody;
        const result = await cognitoService.signUp(username, password, email);
        res.status(201).json(result);
    } catch (error) {
        throw new AppError(error.message || 'Unable to register user', 400);
    }
};

/**
 * Confirm user sign up with verification code
 * POST /api/auth/confirm
 */
export const confirmSignUp = async (req, res) => {
    try {
        const { username, confirmationCode } = req.validatedBody;
        await cognitoService.confirmSignUp(username, confirmationCode);
        res.json({ message: 'Account confirmed' });
    } catch (error) {
        throw new AppError(error.message || 'Unable to confirm account', 400);
    }
};

/**
 * Resend confirmation code
 * POST /api/auth/resend
 */
export const resendConfirmationCode = async (req, res) => {
    try {
        const { username } = req.validatedBody;
        await cognitoService.resendConfirmationCode(username);
        res.json({ message: 'Verification code resent' });
    } catch (error) {
        throw new AppError(error.message || 'Unable to resend verification code', 400);
    }
};

/**
 * Sign in user
 * POST /api/auth/signin
 */
export const signIn = async (req, res) => {
    try {
        const { username, password } = req.validatedBody;
        const response = await cognitoService.signIn(username, password);

        if (response.challenge) {
            return res.status(200).json(response);
        }

        if (!response.tokens) {
            throw new AppError('Unable to authenticate user', 400);
        }

        const user = buildUserFromTokens(response.tokens);
        res.json({
            tokens: response.tokens,
            user
        });
    } catch (error) {
        throw new AppError(error.message || 'Authentication failed', 401);
    }
};

/**
 * Respond to authentication challenge
 * POST /api/auth/challenge
 */
export const respondToChallenge = async (req, res) => {
    try {
        const { session, challengeName, challengeResponses } = req.validatedBody;
        const response = await cognitoService.respondToChallenge({
            session,
            challengeName,
            challengeResponses
        });

        if (response.challenge) {
            return res.status(200).json(response);
        }

        if (!response.tokens) {
            throw new AppError('Unable to complete authentication challenge', 400);
        }

        const user = buildUserFromTokens(response.tokens);
        res.json({
            tokens: response.tokens,
            user
        });
    } catch (error) {
        throw new AppError(error.message || 'Challenge response failed', 400);
    }
};

/**
 * Refresh authentication tokens
 * POST /api/auth/refresh
 */
export const refreshSession = async (req, res) => {
    const { refreshToken, username } = req.validatedBody;
    if (!refreshToken || !username) {
        throw new AppError('Missing refresh token or username', 400);
    }
    try {
        const tokens = await cognitoService.refreshTokens({ refreshToken, username });
        const user = buildUserFromTokens(tokens);
        res.json({ tokens, user });
    } catch (error) {
        throw new AppError(error.message || 'Unable to refresh session', 400);
    }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
export const me = async (req, res) => {
    res.json({ user: req.user });
};
