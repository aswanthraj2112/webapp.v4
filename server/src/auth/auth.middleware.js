import { CognitoJwtVerifier } from 'aws-jwt-verify';
import config from '../config.js';
import { AuthenticationError } from '../utils/errors.js';

let accessTokenVerifier;
let idTokenVerifier;

const getAccessTokenVerifier = () => {
  if (!accessTokenVerifier) {
    accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: config.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: config.COGNITO_CLIENT_ID || undefined
    });
  }
  return accessTokenVerifier;
};

const getIdTokenVerifier = () => {
  if (!idTokenVerifier) {
    idTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: config.COGNITO_USER_POOL_ID,
      tokenUse: 'id',
      clientId: config.COGNITO_CLIENT_ID || undefined
    });
  }
  return idTokenVerifier;
};

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

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
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

    return next();
  } catch (error) {
    return next(new AuthenticationError('Invalid or expired token'));
  }
};

export default authMiddleware;
