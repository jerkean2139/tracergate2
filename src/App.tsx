import React, { useState } from 'react';
import { Settings2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface ProcessorConfig {
  mid: string;
  apiToken: string;
  isConnected: boolean;
}

function App() {
  const [acceptBlue, setAcceptBlue] = useState<ProcessorConfig>({
    mid: '',
    apiToken: '',
    isConnected: false
  });
  
  const [trx, setTrx] = useState<ProcessorConfig>({
    mid: '',
    apiToken: '',
    isConnected: false
  });

  const handleConnect = (processor: 'acceptBlue' | 'trx') => {
    if (processor === 'acceptBlue') {
      setAcceptBlue(prev => ({ ...prev, isConnected: true }));
    } else {
      setTrx(prev => ({ ...prev, isConnected: true }));
    }
  };

  const ProcessorCard = ({ 
    title, 
    processor, 
    config, 
    onChange 
  }: { 
    title: string;
    processor: 'acceptBlue' | 'trx';
    config: ProcessorConfig;
    onChange: (field: 'mid' | 'apiToken', value: string) => void;
  }) => (
    <div className="bg-bg-card rounded-lg shadow-lg p-6 mb-6 border border-olive/10 hover:border-olive/20 transition-colors">
      <div className="flex items-center mb-4">
        <CreditCard className="w-6 h-6 text-olive mr-2" />
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Merchant ID (MID)
          </label>
          <input
            type="text"
            value={config.mid}
            onChange={(e) => onChange('mid', e.target.value)}
            className="w-full px-4 py-2 border border-charcoal-light rounded-md focus:ring-2 focus:ring-olive/30 focus:border-transparent bg-bg-input text-text-primary placeholder-text-secondary/50"
            placeholder="Enter your Merchant ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            API Token
          </label>
          <input
            type="password"
            value={config.apiToken}
            onChange={(e) => onChange('apiToken', e.target.value)}
            className="w-full px-4 py-2 border border-charcoal-light rounded-md focus:ring-2 focus:ring-olive/30 focus:border-transparent bg-bg-input text-text-primary placeholder-text-secondary/50"
            placeholder="Enter your API Token"
          />
        </div>
        
        <button
          onClick={() => handleConnect(processor)}
          disabled={!config.mid || !config.apiToken || config.isConnected}
          className={`
            relative w-full py-3 px-4 rounded-md text-text-primary font-medium
            transition-all duration-200 overflow-hidden
            ${config.isConnected
              ? 'bg-gradient-to-br from-olive/60 to-olive/40 cursor-not-allowed shadow-inner'
              : !config.mid || !config.apiToken
                ? 'bg-charcoal-light cursor-not-allowed'
                : `
                    bg-gradient-to-br from-olive-light to-olive
                    hover:from-olive hover:to-olive-dark
                    active:scale-[0.98]
                    shadow-[0_4px_0_0_rgba(74,74,43,0.8)]
                    active:shadow-[0_0_0_0_rgba(74,74,43,0.8)]
                    active:translate-y-1
                    after:absolute after:inset-0 after:bg-gradient-to-t
                    after:from-black/10 after:to-transparent
                  `
            }
          `}
        >
          {config.isConnected ? (
            <div className="flex items-center justify-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Connected
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Settings2 className="w-5 h-5 mr-2" />
              Connect
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-charcoal text-text-primary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Logo Container */}
          <div className="bg-bg-card rounded-lg shadow-lg p-8 mb-8 flex items-center justify-center">
            <div className="w-48 h-16 bg-charcoal rounded flex items-center justify-center border-2 border-dashed border-olive/20">
              <Settings2 className="w-8 h-8 text-olive" />
              <span className="ml-2 text-text-primary font-semibold">Zen Gate Logo</span>
            </div>
          </div>

          <div className="bg-bg-card rounded-lg shadow-lg p-8 mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Payment Gateway Integration
            </h1>
            <p className="text-text-secondary mb-6">
              Connect your Go High Level marketplace app with payment processors
            </p>
            
            <div className="bg-charcoal border-l-4 border-olive p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-olive mr-2 mt-0.5" />
                <p className="text-sm text-text-secondary">
                  Your API tokens and Merchant IDs are securely encrypted and stored. Make sure you have the correct credentials before connecting.
                </p>
              </div>
            </div>
          </div>

          <ProcessorCard
            title="Accept Blue Integration"
            processor="acceptBlue"
            config={acceptBlue}
            onChange={(field, value) => 
              setAcceptBlue(prev => ({ ...prev, [field]: value }))
            }
          />

          <ProcessorCard
            title="TRX Integration"
            processor="trx"
            config={trx}
            onChange={(field, value) => 
              setTrx(prev => ({ ...prev, [field]: value }))
            }
          />
        </div>
      </div>
    </div>
  );
}

export default App;