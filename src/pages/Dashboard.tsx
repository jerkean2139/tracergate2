import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { apiFetch, getLocationId } from '../lib/api';

interface StatusResponse {
  ok: boolean;
  locationId: string;
  acceptBlue: { connected: boolean; updatedAt: string | null };
  trx: { connected: boolean; updatedAt: string | null };
}

export default function Dashboard() {
  const locationId = getLocationId();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!locationId) {
      setLoading(false);
      return;
    }

    apiFetch<StatusResponse>(`/api/status?locationId=${locationId}`)
      .then(setStatus)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [locationId]);

  if (!locationId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-bg-card rounded-lg p-8 border border-olive/10 text-center">
          <AlertCircle className="w-12 h-12 text-olive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Missing Location ID</h1>
          <p className="text-text-secondary">
            This app should be launched from within Go High Level so the URL includes{' '}
            <code className="bg-charcoal px-2 py-0.5 rounded text-sm">?locationId=...</code>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-olive animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-bg-card rounded-lg p-8 border border-red-500/20 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Connection Error</h1>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  const processors = [
    { name: 'Accept Blue', key: 'acceptBlue' as const, data: status?.acceptBlue },
    { name: 'TRX Services', key: 'trx' as const, data: status?.trx },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-text-secondary mb-8">
        Location: <code className="bg-charcoal-light px-2 py-0.5 rounded text-sm">{locationId}</code>
      </p>

      <div className="grid gap-4">
        {processors.map((p) => (
          <div
            key={p.key}
            className="bg-bg-card rounded-lg p-6 border border-olive/10 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-olive" />
              <div>
                <h2 className="font-semibold">{p.name}</h2>
                {p.data?.connected && p.data.updatedAt && (
                  <p className="text-xs text-text-secondary">
                    Connected {new Date(p.data.updatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {p.data?.connected ? (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <CheckCircle className="w-4 h-4" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-text-secondary">
                  <XCircle className="w-4 h-4" /> Not connected
                </span>
              )}
              <Link
                to={`/processors?locationId=${locationId}`}
                className="px-3 py-1.5 text-sm bg-olive/20 hover:bg-olive/30 rounded-md transition-colors"
              >
                {p.data?.connected ? 'Manage' : 'Connect'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
