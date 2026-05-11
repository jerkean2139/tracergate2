function basicAuthHeader(mid: string, apiToken: string): string {
  const token = Buffer.from(`${mid}:${apiToken}`).toString('base64');
  return `Basic ${token}`;
}

export async function trxRequest<T>(opts: {
  baseUrl: string;
  mid: string;
  apiToken: string;
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
}): Promise<T> {
  const url = new URL(
    opts.path.replace(/^\//, ''),
    opts.baseUrl.endsWith('/') ? opts.baseUrl : `${opts.baseUrl}/`,
  ).toString();

  const res = await fetch(url, {
    method: opts.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuthHeader(opts.mid, opts.apiToken),
      'User-Agent': 'tracer-gate-backend/0.0.0',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`TRX request failed: ${res.status} ${res.statusText} ${txt}`);
  }

  return (await res.json()) as T;
}

export async function validateTrxCredentials(opts: {
  baseUrl: string;
  mid: string;
  apiToken: string;
}): Promise<unknown> {
  return trxRequest({
    baseUrl: opts.baseUrl,
    mid: opts.mid,
    apiToken: opts.apiToken,
    method: 'GET',
    path: '/merchants/self',
  });
}
