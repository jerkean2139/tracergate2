function basicAuthHeader(sourceKey: string, pin: string): string {
  const token = Buffer.from(`${sourceKey}:${pin}`).toString('base64');
  return `Basic ${token}`;
}

export async function acceptBlueRequest<T>(opts: {
  baseUrl: string;
  sourceKey: string;
  pin: string;
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
}): Promise<T> {
  const url = new URL(opts.path.replace(/^\//, ''), opts.baseUrl.endsWith('/') ? opts.baseUrl : `${opts.baseUrl}/`).toString();

  const res = await fetch(url, {
    method: opts.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuthHeader(opts.sourceKey, opts.pin),
      'User-Agent': 'tracer-gate-backend/0.0.0',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Accept Blue request failed: ${res.status} ${res.statusText} ${txt}`);
  }

  return (await res.json()) as T;
}

export async function validateCredentials(opts: {
  baseUrl: string;
  sourceKey: string;
  pin: string;
}): Promise<unknown> {
  // Lightweight auth check: list customers (first page)
  return acceptBlueRequest({
    baseUrl: opts.baseUrl,
    sourceKey: opts.sourceKey,
    pin: opts.pin,
    method: 'GET',
    path: '/customers?limit=1',
  });
}
