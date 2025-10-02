import { fetchAuthSession } from 'aws-amplify/auth';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'https://n11817143-videoapp.cab432.com/api';

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

async function getAccessToken() {
  const session = await fetchAuthSession();
  return session.tokens.accessToken.toString();
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
  getConfig: () => publicRequest('/api/config'),
  me: () => authorizedRequest('/api/auth/me'),
  initiateUpload: (payload) => authorizedRequest('/api/videos/presign', { method: 'POST', body: payload }),
  finalizeUpload: (payload) => authorizedRequest('/api/videos/finalize', { method: 'POST', body: payload }),
  listVideos: (page = 1, limit = 10) => authorizedRequest(`/api/videos?page=${page}&limit=${limit}`),
  getVideo: (id) => authorizedRequest(`/api/videos/${id}`),
  getStreamUrl: async (id, { variant = 'original', download = false } = {}) => {
    const params = new URLSearchParams({ variant });
    if (download) {
      params.set('download', '1');
    }
    const response = await authorizedRequest(`/api/videos/${id}/stream?${params.toString()}`);
    return response.url;
  },
  deleteVideo: (id) => authorizedRequest(`/api/videos/${id}`, { method: 'DELETE' }),

  // Transcoding endpoints
  startTranscoding: (id, resolution) => authorizedRequest(`/api/videos/${id}/transcode`, {
    method: 'POST',
    body: { resolution }
  }),
  getTranscodingStatus: (id) => authorizedRequest(`/api/videos/${id}/transcoding-status`),
  getAvailableResolutions: () => authorizedRequest('/api/videos/transcoding/resolutions'),

  listUsers: () => authorizedRequest('/api/admin/users'),
  deleteUser: (username) => authorizedRequest(`/api/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' })
};

export default api;
