import type { Db, GhlInstallationRow } from './db.js';

export interface GhlTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope?: string;
  refreshTokenId?: string;
  userType?: string;
  companyId?: string;
  locationId?: string;
  userId?: string;
  isBulkInstallation?: boolean;
}

export async function exchangeCodeForToken(opts: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  userType: string;
}): Promise<GhlTokenResponse> {
  const form = new URLSearchParams();
  form.set('client_id', opts.clientId);
  form.set('client_secret', opts.clientSecret);
  form.set('grant_type', 'authorization_code');
  form.set('code', opts.code);
  form.set('user_type', opts.userType);
  form.set('redirect_uri', opts.redirectUri);

  console.log('[GHL] Token exchange request:', {
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    user_type: opts.userType,
    code: opts.code.slice(0, 8) + '...',
  });

  const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GHL token exchange failed: ${res.status} ${res.statusText} ${txt}`);
  }

  return (await res.json()) as GhlTokenResponse;
}

export async function refreshAccessToken(opts: {
  refreshToken: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  userType: string;
}): Promise<GhlTokenResponse> {
  const form = new URLSearchParams();
  form.set('client_id', opts.clientId);
  form.set('client_secret', opts.clientSecret);
  form.set('grant_type', 'refresh_token');
  form.set('refresh_token', opts.refreshToken);
  form.set('user_type', opts.userType);
  form.set('redirect_uri', opts.redirectUri);

  const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GHL refresh failed: ${res.status} ${res.statusText} ${txt}`);
  }

  return (await res.json()) as GhlTokenResponse;
}

// Refresh buffer: refresh 5 minutes before actual expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Returns a valid GHL access token for the given installation.
 * Auto-refreshes if the token is expired or about to expire.
 */
export async function getValidAccessToken(
  db: Db,
  installation: GhlInstallationRow,
): Promise<string> {
  if (!installation.accessToken || !installation.refreshToken) {
    throw new Error(`GHL installation ${installation.installKey} has no tokens — re-auth required`);
  }

  const expiresAt = installation.tokenExpiresAt
    ? new Date(installation.tokenExpiresAt).getTime()
    : 0;
  const needsRefresh = Date.now() >= expiresAt - REFRESH_BUFFER_MS;

  if (!needsRefresh) {
    return installation.accessToken;
  }

  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = process.env.GHL_REDIRECT_URI;
  const userType = process.env.GHL_USER_TYPE || 'Location';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing GHL env for token refresh');
  }

  console.log(`[GHL] Refreshing token for installation ${installation.installKey}`);

  const token = await refreshAccessToken({
    refreshToken: installation.refreshToken,
    clientId,
    clientSecret,
    redirectUri,
    userType,
  });

  await db.upsertGhlInstallation({
    installKey: installation.installKey,
    companyId: installation.companyId,
    locationId: installation.locationId,
    userId: installation.userId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    scope: token.scope ?? installation.scope,
  });

  return token.access_token;
}

/**
 * Make an authenticated request to the GHL API.
 */
export async function ghlApiRequest<T>(opts: {
  accessToken: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
}): Promise<T> {
  const url = `https://services.leadconnectorhq.com${opts.path}`;

  const res = await fetch(url, {
    method: opts.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.accessToken}`,
      Version: '2021-07-28',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GHL API ${opts.method} ${opts.path} failed: ${res.status} ${txt}`);
  }

  return (await res.json()) as T;
}
