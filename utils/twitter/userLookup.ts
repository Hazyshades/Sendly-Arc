/**
 * Twitter/X user lookup for handle input preview (avatar + name).
 * Calls zk-sender Edge Function GET /zk-sender/twitter/user (api.twitterapi.io + DB cache).
 */

import { getApiUrl } from '../supabase/client';
import { publicAnonKey } from '../supabase/info';

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

function getTwitterLookupBaseUrl(): string {
  return (
    (import.meta.env.VITE_SUPABASE_ZKSEND_FUNCTION_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string | undefined) ||
    getApiUrl()
  );
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

  const base = getTwitterLookupBaseUrl().replace(/\/$/, '');
  const url = `${base}/zk-sender/twitter/user?username=${encodeURIComponent(normalized)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
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
