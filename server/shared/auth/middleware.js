import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';

let accessTokenVerifier;
let idTokenVerifier;

/**
 * Initialize JWT verifiers with configuration
 * Must be called after config is loaded
 * @param {Object} config - Configuration object with COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID
 */
export function initializeVerifiers(config) {
    if (!config.COGNITO_USER_POOL_ID) {
        throw new Error('COGNITO_USER_POOL_ID is required to initialize JWT verifiers');
    }

    accessTokenVerifier = CognitoJwtVerifier.create({
        userPoolId: config.COGNITO_USER_POOL_ID,
        tokenUse: 'access',
        clientId: config.COGNITO_CLIENT_ID || undefined
    });

    idTokenVerifier = CognitoJwtVerifier.create({
        userPoolId: config.COGNITO_USER_POOL_ID,
        tokenUse: 'id',
        clientId: config.COGNITO_CLIENT_ID || undefined
    });

    console.log('✅ JWT verifiers initialized');
}

const getAccessTokenVerifier = () => {
    if (!accessTokenVerifier) {
        throw new Error('JWT verifiers not initialized. Call initializeVerifiers() first.');
    }
    return accessTokenVerifier;
};

const getIdTokenVerifier = () => {
    if (!idTokenVerifier) {
        throw new Error('JWT verifiers not initialized. Call initializeVerifiers() first.');
    }
    return idTokenVerifier;
};

/**
 * Verify JWT token with fallback from access to ID token
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} Decoded token payload
 */
async function verifyWithFallback(token) {
    try {
        const payload = await getAccessTokenVerifier().verify(token);
        return { ...payload, tokenUse: 'access' };
    } catch (accessError) {
        try {
            const payload = await getIdTokenVerifier().verify(token);
            return { ...payload, tokenUse: 'id' };
        } catch {
            throw accessError;
        }
    }
}

/**
 * Authentication middleware - verifies JWT tokens
 * Attaches user object to req.user
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;

    console.log(`🔐 AUTH: ${req.method} ${req.url}, hasToken=${!!token}`);

    if (!token) {
        console.log(`🔐 AUTH FAILED: Missing token for ${req.method} ${req.url}`);
        return next(new AuthenticationError('Missing authentication token'));
    }

    try {
        const claims = await verifyWithFallback(token);
        const groups = Array.isArray(claims['cognito:groups'])
            ? claims['cognito:groups']
            : claims['cognito:groups']
                ? [claims['cognito:groups']]
                : [];

        req.user = {
            sub: claims.sub,
            username: claims.username || claims['cognito:username'],
            email: claims.email,
            groups,
            tokenUse: claims.tokenUse,
            raw: claims
        };

        console.log(`🔐 AUTH SUCCESS: userId=${claims.sub}, username=${claims.username}`);
        return next();
    } catch (error) {
        console.log(`🔐 AUTH ERROR: ${error.message} for ${req.method} ${req.url}`);
        return next(new AuthenticationError('Invalid or expired token'));
    }
};

/**
 * Authorization middleware - requires admin group membership
 * Must be used after authenticate middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
    }

    const isAdmin = req.user.groups?.includes('admin');

    if (!isAdmin) {
        console.log(`🔐 AUTHZ FAILED: User ${req.user.username} attempted admin action`);
        return next(new AuthorizationError('Admin access required'));
    }

    console.log(`🔐 AUTHZ SUCCESS: Admin user ${req.user.username}`);
    return next();
};

/**
 * Optional authentication middleware - attaches user if token present
 * Does not fail if token is missing
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;

    if (!token) {
        return next();
    }

    try {
        const claims = await verifyWithFallback(token);
        const groups = Array.isArray(claims['cognito:groups'])
            ? claims['cognito:groups']
            : claims['cognito:groups']
                ? [claims['cognito:groups']]
                : [];

        req.user = {
            sub: claims.sub,
            username: claims.username || claims['cognito:username'],
            email: claims.email,
            groups,
            tokenUse: claims.tokenUse,
            raw: claims
        };

        console.log(`🔐 OPTIONAL AUTH: User ${claims.username} authenticated`);
    } catch (error) {
        console.log(`🔐 OPTIONAL AUTH: Invalid token, continuing without user`);
    }

    return next();
};

export default authenticate;
