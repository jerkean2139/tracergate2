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
  const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      grant_type: 'authorization_code',
      code: opts.code,
      user_type: opts.userType,
      redirect_uri: opts.redirectUri,
    }),
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
