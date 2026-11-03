import axios from 'axios';

/**
 * One axios instance for the whole app.
 *  - Same-origin: in dev Vite proxies /api to Express; in production Express
 *    serves both. `withCredentials` sends the httpOnly login cookie.
 *  - Responses are unwrapped from { success, data, message } by `unwrap()`.
 *  - Errors are normalised into ApiError (message + status + per-field errors).
 */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 20000,
});

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {}, network = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors; // { field_name: 'message' }, for form validation
    this.network = network;
  }
}

/** Human-readable message from anything thrown. */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err instanceof ApiError || err instanceof Error ? err.message || fallback : fallback;
}

let onUnauthorized = null;
/** AuthContext registers a callback so an expired session sends the user to login. */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function toApiError(err) {
  if (err.response) {
    let body = err.response.data;
    // CSV downloads use responseType 'blob', so a JSON error arrives as a Blob.
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      try {
        body = JSON.parse(await body.text());
      } catch {
        body = null;
      }
    }
    const fieldErrors = {};
    for (const item of body?.errors || []) {
      if (item.field && !fieldErrors[item.field]) fieldErrors[item.field] = item.message;
    }
    const fallback =
      err.response.status >= 500
        ? 'The server had a problem. Please try again in a moment.'
        : 'The request could not be completed.';
    return new ApiError(body?.message || fallback, {
      status: err.response.status,
      fieldErrors,
    });
  }
  if (err.code === 'ECONNABORTED') {
    return new ApiError('The request took too long. Check your connection and try again.', {
      network: true,
    });
  }
  return new ApiError(
    'Cannot reach the server. If you just opened the app, give it a few seconds to wake up and retry.',
    { network: true },
  );
}

client.interceptors.response.use(
  (response) => response,
  async (err) => {
    const apiError = await toApiError(err);
    const url = err.config?.url || '';
    // A 401 anywhere except the login/register/me calls means the session ended.
    if (apiError.status === 401 && !url.startsWith('/auth/')) onUnauthorized?.();
    throw apiError;
  },
);

/** Await an axios call and return just the `data` field of the API envelope. */
export const unwrap = async (promise) => (await promise).data.data;

export default client;
