/**
 * Twitter/X user lookup for handle input preview (avatar + name).
 * Calls zktls-service GET /api/twitter/user.
 */

export interface TwitterUserPreview {
  username: string;
  name: string;
  profile_image_url: string | null;
}

export interface TwitterUserLookupResult {
  success: true;
  data: TwitterUserPreview;
}

export interface TwitterUserLookupError {
  success: false;
  error: string;
  code: string;
}

export type TwitterUserLookupResponse = TwitterUserLookupResult | TwitterUserLookupError;

function getZkTlsApiUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  const envUrl =
    (import.meta.env.VITE_RECLAIM_API_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
  if (envUrl) return envUrl;
  return 'http://localhost:3001';
}

/**
 * Normalize handle: trim and remove leading @.
 */
export function normalizeTwitterHandle(handle: string): string {
  return handle.trim().replace(/^@/, '');
}

/**
 * Fetch Twitter user profile by username for preview.
 * Returns result with success/error for UI to show avatar, name, or error message.
 */
export async function fetchTwitterUserPreview(username: string): Promise<TwitterUserLookupResponse> {
  const normalized = normalizeTwitterHandle(username);
  if (!normalized) {
    return { success: false, error: 'Enter a username', code: 'MISSING_USERNAME' };
  }

  const base = getZkTlsApiUrl().replace(/\/$/, '');
  const url = `${base}/api/twitter/user?username=${encodeURIComponent(normalized)}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const body = await res.json().catch(() => ({}));

    if (res.ok && body.username) {
      return {
        success: true,
        data: {
          username: body.username,
          name: body.name ?? body.username,
          profile_image_url: body.profile_image_url ?? null,
        },
      };
    }

    if (res.status === 404 || body.code === 'USER_NOT_FOUND') {
      return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
    }
    if (res.status === 429 || body.code === 'RATE_LIMITED') {
      return { success: false, error: 'Too many requests', code: 'RATE_LIMITED' };
    }

    const message = typeof body.error === 'string' ? body.error : 'Request failed';
    return {
      success: false,
      error: message,
      code: body.code ?? 'REQUEST_FAILED',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return { success: false, error: message, code: 'NETWORK_ERROR' };
  }
}
