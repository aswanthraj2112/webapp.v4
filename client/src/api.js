import { fetchAuthSession } from 'aws-amplify/auth';

const RAW_API_URL = import.meta.env.VITE_API_URL || '/api';

function trimTrailingSlashes(value) {
  if (!value) return '';
  let result = `${value}`.trim();
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

function normalizeBaseUrl(url) {
  if (!url) return '';
  const trimmed = trimTrailingSlashes(url);
  try {
    const parsed = new URL(trimmed);
    return `${parsed.origin}${parsed.pathname ? trimTrailingSlashes(parsed.pathname) : ''}`;
  } catch {
    return trimmed;
  }
}

const API_BASE_URL = normalizeBaseUrl(RAW_API_URL);

function buildRequestUrl(path = '') {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${sanitizedPath}`;
}

// Safe wrapper around fetchAuthSession that handles MFA edge cases
const safeFetchAuthSession = async () => {
  try {
    const session = await fetchAuthSession({ forceRefresh: false });
    return session;
  } catch (error) {
    console.warn('fetchAuthSession failed:', error.message);

    // Check for specific error patterns that indicate auth challenges
    const errorMessage = error.message || '';
    const isAuthChallenge = errorMessage.includes('challenge') ||
      errorMessage.includes('MFA') ||
      errorMessage.includes('authentication challenge') ||
      errorMessage.includes('NotAuthorizedException') ||
      errorMessage.includes('UserNotConfirmedException') ||
      errorMessage.includes('PasswordResetRequiredException') ||
      errorMessage.includes('No valid session available');

    if (isAuthChallenge) {
      console.debug('Auth challenge detected in API, not retrying fetchAuthSession');
      throw new Error('Session unavailable during authentication challenge');
    }

    // For other errors, try once with force refresh
    try {
      console.debug('Retrying fetchAuthSession with force refresh');
      const session = await fetchAuthSession({ forceRefresh: true });
      return session;
    } catch (secondError) {
      console.error('Both fetchAuthSession attempts failed:', secondError);
      throw secondError;
    }
  }
};

async function getAccessToken() {
  try {
    const session = await safeFetchAuthSession();

    console.debug('API token request:', {
      session: session ? 'exists' : 'null',
      tokens: session.tokens ? 'exists' : 'null',
      hasAccessToken: !!(session.tokens && session.tokens.accessToken),
      hasIdToken: !!(session.tokens && session.tokens.idToken),
      isSignedIn: session.credentials ? true : false
    });

    // Check if session and tokens are available
    if (!session || !session.tokens || !session.tokens.accessToken) {
      throw new Error('Access token not available - authentication may be incomplete');
    }

    return session.tokens.accessToken.toString();
  } catch (error) {
    // Only log actual errors, not authentication challenges
    if (!error.message.includes('authentication challenge') &&
      !error.message.includes('Session unavailable during authentication challenge')) {
      console.error('Error getting access token:', error);
    } else {
      console.debug('Access token unavailable due to authentication challenge:', error.message);
    }
    throw error;
  }
}

async function authorizedRequest(path, { method = 'GET', body, headers = {} } = {}) {
  try {
    const token = await getAccessToken();
    const requestHeaders = { ...headers, Authorization: `Bearer ${token}` };
    let requestBody;

    if (body instanceof FormData) {
      requestBody = body;
    } else if (body !== undefined && body !== null) {
      requestHeaders['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(buildRequestUrl(path), {
      method,
      headers: requestHeaders,
      body: requestBody
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || 'Request failed';
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    console.error('API request failed:', error);
    if (error.message.includes('authentication may be incomplete')) {
      throw new Error('Please complete the authentication process');
    }
    throw error;
  }
}

async function publicRequest(path, options) {
  const response = await fetch(buildRequestUrl(path), options);
  if (!response.ok) {
    throw new Error('Request failed');
  }
  return response.json();
}

const api = {
  getConfig: () => publicRequest('/config'),
  me: () => authorizedRequest('/auth/me'),
  initiateUpload: (payload) => authorizedRequest('/videos/presign', { method: 'POST', body: payload }),
  finalizeUpload: (payload) => authorizedRequest('/videos/finalize', { method: 'POST', body: payload }),
  listVideos: (page = 1, limit = 10) => authorizedRequest(`/videos?page=${page}&limit=${limit}`),
  getVideo: (id) => authorizedRequest(`/videos/${id}`),
  getStreamUrl: async (id, { variant = 'original', download = false } = {}) => {
    const params = new URLSearchParams({ variant });
    if (download) {
      params.set('download', '1');
    }
    const response = await authorizedRequest(`/videos/${id}/stream?${params.toString()}`);
    return response.url;
  },
  deleteVideo: (id) => authorizedRequest(`/videos/${id}`, { method: 'DELETE' }),

  // Transcoding endpoints
  startTranscoding: (id, resolution) => authorizedRequest(`/videos/${id}/transcode`, {
    method: 'POST',
    body: { resolution }
  }),
  getTranscodingStatus: (id) => authorizedRequest(`/videos/${id}/transcoding-status`),
  getAvailableResolutions: () => authorizedRequest('/videos/transcoding/resolutions'),

  listUsers: () => authorizedRequest('/admin/users'),
  deleteUser: (username) => authorizedRequest(`/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  listAllVideos: () => authorizedRequest('/admin/videos'),
  deleteAnyVideo: (videoId, userId) => authorizedRequest(`/admin/videos/${encodeURIComponent(videoId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
};

export default api;
