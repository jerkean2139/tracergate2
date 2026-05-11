import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, Settings2, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch, getLocationId } from '../lib/api';

interface ProcessorConfig {
  mid: string;
  apiToken: string;
  isConnected: boolean;
}

interface StatusResponse {
  ok: boolean;
  acceptBlue: { connected: boolean };
  trx: { connected: boolean };
}

export default function Processors() {
  const locationId = getLocationId();
  const [loading, setLoading] = useState(true);

  const [acceptBlue, setAcceptBlue] = useState<ProcessorConfig>({
    mid: '',
    apiToken: '',
    isConnected: false,
  });

  const [trx, setTrx] = useState<ProcessorConfig>({
    mid: '',
    apiToken: '',
    isConnected: false,
  });

  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!locationId) {
      setLoading(false);
      return;
    }

    apiFetch<StatusResponse>(`/api/status?locationId=${locationId}`)
      .then((s) => {
        if (s.acceptBlue.connected) setAcceptBlue((p) => ({ ...p, isConnected: true }));
        if (s.trx.connected) setTrx((p) => ({ ...p, isConnected: true }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locationId]);

  const handleConnect = async (processor: 'acceptBlue' | 'trx') => {
    if (!locationId) {
      setError('Missing locationId. Install the app via GHL so the URL includes ?locationId=...');
      return;
    }

    setConnecting(processor);
    setError('');

    try {
      if (processor === 'acceptBlue') {
        await apiFetch('/api/acceptblue/connect', {
          method: 'POST',
          body: JSON.stringify({
            locationId,
            sourceKey: acceptBlue.mid,
            pin: acceptBlue.apiToken,
          }),
        });
        setAcceptBlue((p) => ({ ...p, isConnected: true }));
      } else {
        await apiFetch('/api/trx/connect', {
          method: 'POST',
          body: JSON.stringify({
            locationId,
            mid: trx.mid,
            apiToken: trx.apiToken,
          }),
        });
        setTrx((p) => ({ ...p, isConnected: true }));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(null);
    }
  };

  if (!locationId) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-bg-card rounded-lg p-8 border border-olive/10 text-center">
          <AlertCircle className="w-12 h-12 text-olive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Missing Location ID</h1>
          <p className="text-text-secondary">
            This app should be launched from within Go High Level.
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Payment Processors</h1>
      <p className="text-text-secondary mb-6">
        Connect your payment processors to enable transactions through Go High Level.
      </p>

      {error && (
        <div className="bg-charcoal border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 shrink-0" />
            <p className="text-sm text-text-secondary">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-charcoal border-l-4 border-olive p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-olive mr-2 mt-0.5 shrink-0" />
          <p className="text-sm text-text-secondary">
            Your API tokens and credentials are securely encrypted with AES-256-GCM before storage.
          </p>
        </div>
      </div>

      <ProcessorCard
        title="Accept Blue"
        processor="acceptBlue"
        config={acceptBlue}
        connecting={connecting === 'acceptBlue'}
        labels={{ mid: 'Source Key', apiToken: 'PIN' }}
        placeholders={{ mid: 'Enter your Accept Blue Source Key', apiToken: 'Enter your 4-digit PIN' }}
        onChange={(field, value) => setAcceptBlue((p) => ({ ...p, [field]: value }))}
        onConnect={() => handleConnect('acceptBlue')}
      />

      <ProcessorCard
        title="TRX Services"
        processor="trx"
        config={trx}
        connecting={connecting === 'trx'}
        labels={{ mid: 'Merchant ID (MID)', apiToken: 'API Token' }}
        placeholders={{ mid: 'Enter your Merchant ID', apiToken: 'Enter your API Token' }}
        onChange={(field, value) => setTrx((p) => ({ ...p, [field]: value }))}
        onConnect={() => handleConnect('trx')}
      />
    </div>
  );
}

function ProcessorCard({
  title,
  config,
  connecting,
  labels,
  placeholders,
  onChange,
  onConnect,
}: {
  title: string;
  processor: string;
  config: ProcessorConfig;
  connecting: boolean;
  labels: { mid: string; apiToken: string };
  placeholders: { mid: string; apiToken: string };
  onChange: (field: 'mid' | 'apiToken', value: string) => void;
  onConnect: () => void;
}) {
  return (
    <div className="bg-bg-card rounded-lg shadow-lg p-6 mb-6 border border-olive/10 hover:border-olive/20 transition-colors">
      <div className="flex items-center mb-4">
        <CreditCard className="w-6 h-6 text-olive mr-2" />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      {config.isConnected ? (
        <div className="flex items-center gap-2 text-green-400 py-4">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Connected</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {labels.mid}
            </label>
            <input
              type="text"
              value={config.mid}
              onChange={(e) => onChange('mid', e.target.value)}
              className="w-full px-4 py-2 border border-charcoal-light rounded-md focus:ring-2 focus:ring-olive/30 focus:border-transparent bg-bg-input text-text-primary placeholder-text-secondary/50"
              placeholder={placeholders.mid}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              {labels.apiToken}
            </label>
            <input
              type="password"
              value={config.apiToken}
              onChange={(e) => onChange('apiToken', e.target.value)}
              className="w-full px-4 py-2 border border-charcoal-light rounded-md focus:ring-2 focus:ring-olive/30 focus:border-transparent bg-bg-input text-text-primary placeholder-text-secondary/50"
              placeholder={placeholders.apiToken}
            />
          </div>

          <button
            onClick={onConnect}
            disabled={!config.mid || !config.apiToken || connecting}
            className={`
              w-full py-3 px-4 rounded-md text-text-primary font-medium transition-all duration-200
              ${
                !config.mid || !config.apiToken || connecting
                  ? 'bg-charcoal-light cursor-not-allowed'
                  : 'bg-gradient-to-br from-olive-light to-olive hover:from-olive hover:to-olive-dark active:scale-[0.98] shadow-[0_4px_0_0_rgba(74,74,43,0.8)] active:shadow-none active:translate-y-1'
              }
            `}
          >
            <div className="flex items-center justify-center">
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Settings2 className="w-5 h-5 mr-2" />
                  Connect
                </>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
