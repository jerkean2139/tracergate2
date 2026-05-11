const BASE = (import.meta as any).env?.VITE_API_BASE_URL
  ? String((import.meta as any).env.VITE_API_BASE_URL)
  : '';

function url(path: string): string {
  return BASE ? new URL(path, BASE).toString() : path;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const res = await fetch(url(path), {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json as T;
}

export function getLocationId(): string {
  return new URLSearchParams(window.location.search).get('locationId') || '';
}
