import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { Db } from './db.js';
import { decryptString, encryptString, verifyAcceptBlueSignature } from './crypto.js';
import { exchangeCodeForToken, getValidAccessToken, ghlApiRequest } from './ghl.js';
import { acceptBlueRequest, validateCredentials } from './acceptblue.js';
import { trxRequest, validateTrxCredentials } from './trx.js';
import { requireGhlInstallation } from './middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL');
}
const db = new Db(databaseUrl);

const app = express();
app.disable('x-powered-by');

// Capture raw body for webhook signature verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf;
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// ---- GHL OAuth ----
app.get('/auth/callback', async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '');
    if (!code) return res.status(200).send('OAuth callback ready');

    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    const redirectUri = process.env.GHL_REDIRECT_URI;
    const userType = process.env.GHL_USER_TYPE || 'Location';

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).send('Missing GHL env: GHL_CLIENT_ID/GHL_CLIENT_SECRET/GHL_REDIRECT_URI');
    }

    const token = await exchangeCodeForToken({
      code,
      clientId,
      clientSecret,
      redirectUri,
      userType,
    });

    const installKey = token.locationId || token.companyId || token.userId || `${Date.now()}`;

    await db.upsertGhlInstallation({
      installKey,
      companyId: token.companyId ?? null,
      locationId: token.locationId ?? null,
      userId: token.userId ?? null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      scope: token.scope ?? null,
    });

    const redirectBack = process.env.APP_POST_INSTALL_REDIRECT || 'http://localhost:5173/';
    const url = new URL(redirectBack);
    url.searchParams.set('installed', '1');
    if (token.locationId) url.searchParams.set('locationId', token.locationId);
    if (token.companyId) url.searchParams.set('companyId', token.companyId);

    return res.redirect(url.toString());
  } catch (e) {
    console.error('[AUTH CALLBACK ERROR]', e);
    return res.status(500).send(String(e));
  }
});

// GHL install webhook (optional but useful to capture locationId/companyId)
app.post('/webhooks/ghl', (req: Request, res: Response) => {
  // TODO: verify signature with GHL_SHARED_SECRET once we confirm header scheme.
  (async () => {
    const body = req.body as any;
    const key = String(body.locationId || body.companyId || `${Date.now()}`);

    await db.upsertGhlInstallation({
      installKey: key,
      companyId: body.companyId ?? null,
      locationId: body.locationId ?? null,
      userId: body.userId ?? null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      scope: null,
    });
  })()
    .then(() => res.json({ ok: true }))
    .catch((e) => res.status(500).json({ ok: false, error: String(e) }));
});

// ---- API auth: all /api/* routes require a valid GHL installation ----
app.use('/api', requireGhlInstallation(db));

// ---- Status: check which processors are connected for a location ----
app.get('/api/status', async (req: Request, res: Response) => {
  const locationId = req.query.locationId as string;
  const [abCreds, trxCreds] = await Promise.all([
    db.getAcceptBlueCreds(locationId),
    db.getTrxCreds(locationId),
  ]);
  return res.json({
    ok: true,
    locationId,
    acceptBlue: { connected: !!abCreds, updatedAt: abCreds?.updatedAt ?? null },
    trx: { connected: !!trxCreds, updatedAt: trxCreds?.updatedAt ?? null },
  });
});

// ---- Accept Blue ----
app.post('/api/acceptblue/connect', async (req: Request, res: Response) => {
  const { locationId, sourceKey, pin } = req.body as {
    locationId: string;
    sourceKey: string;
    pin: string;
  };

  if (!locationId || !sourceKey || !pin) {
    return res.status(400).json({ ok: false, error: 'locationId, sourceKey, pin required' });
  }

  const baseUrl = process.env.ACCEPTBLUE_BASE_URL || 'https://api.sandbox.accept.blue/api/v2/';

  try {
    await validateCredentials({ baseUrl, sourceKey, pin });

    await db.upsertAcceptBlueCreds({
      locationId,
      sourceKeyEnc: encryptString(sourceKey),
      pinEnc: encryptString(pin),
    });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
});

app.post('/api/acceptblue/charge', async (req: Request, res: Response) => {
  const { locationId, payload } = req.body as { locationId: string; payload: unknown };
  if (!locationId || !payload) return res.status(400).json({ ok: false, error: 'locationId and payload required' });

  const baseUrl = process.env.ACCEPTBLUE_BASE_URL || 'https://api.sandbox.accept.blue/api/v2/';
  const creds = await db.getAcceptBlueCreds(locationId);
  if (!creds) return res.status(404).json({ ok: false, error: 'No Accept Blue credentials stored for locationId' });

  try {
    const sourceKey = decryptString(creds.sourceKeyEnc);
    const pin = decryptString(creds.pinEnc);
    const result = await acceptBlueRequest({
      baseUrl,
      sourceKey,
      pin,
      method: 'POST',
      path: '/transactions/charge',
      body: payload,
    });
    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
});

app.post('/api/acceptblue/refund', async (req: Request, res: Response) => {
  const { locationId, payload } = req.body as { locationId: string; payload: unknown };
  if (!locationId || !payload) return res.status(400).json({ ok: false, error: 'locationId and payload required' });

  const baseUrl = process.env.ACCEPTBLUE_BASE_URL || 'https://api.sandbox.accept.blue/api/v2/';
  const creds = await db.getAcceptBlueCreds(locationId);
  if (!creds) return res.status(404).json({ ok: false, error: 'No Accept Blue credentials stored for locationId' });

  try {
    const sourceKey = decryptString(creds.sourceKeyEnc);
    const pin = decryptString(creds.pinEnc);
    const result = await acceptBlueRequest({
      baseUrl,
      sourceKey,
      pin,
      method: 'POST',
      path: '/transactions/refund',
      body: payload,
    });
    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
});

app.post('/webhooks/acceptblue', (req: Request, res: Response) => {
  const signatureKey = process.env.ACCEPTBLUE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) return res.status(500).send('Missing ACCEPTBLUE_WEBHOOK_SIGNATURE_KEY');

  const rawBody = (req as any).rawBody as Buffer | undefined;
  const signatureHeader = req.header('X-Signature') || undefined;

  if (!rawBody) return res.status(400).send('Missing raw body');

  const ok = verifyAcceptBlueSignature({ signatureHeader, signatureKey, rawBody });
  if (!ok) return res.status(401).send('Invalid signature');

  const body = req.body as any;
  const eventId = String(body?.id || '');
  if (!eventId) return res.status(400).send('Missing event id');

  (async () => {
    const already = await db.isAcceptBlueEventProcessed(eventId);
    if (already) return res.status(200).json({ ok: true, deduped: true });
    await db.markAcceptBlueEventProcessed(eventId);

    // Bridge: push payment event into GHL as a contact note
    const locationId = String(body?.metadata?.locationId || body?.locationId || '');
    const contactId = String(body?.metadata?.contactId || body?.contactId || '');

    if (locationId && contactId) {
      try {
        const installation = await db.getGhlInstallation(locationId);
        if (installation) {
          const accessToken = await getValidAccessToken(db, installation);
          const txnType = String(body?.type || body?.transaction_type || 'payment');
          const amount = body?.amount ?? body?.transaction?.amount ?? '?';
          const status = body?.status ?? body?.transaction?.status ?? 'unknown';

          await ghlApiRequest({
            accessToken,
            method: 'POST',
            path: `/contacts/${contactId}/notes`,
            body: {
              body: `[TracerGate] ${txnType} — $${amount} — ${status} (event: ${eventId})`,
            },
          });
        }
      } catch (bridgeErr) {
        console.error('[BRIDGE ERROR] Failed to push payment event to GHL:', bridgeErr);
        // Don't fail the webhook — we already recorded the event
      }
    }

    return res.status(200).json({ ok: true });
  })().catch((e) => res.status(500).json({ ok: false, error: String(e) }));
});

// ---- TRX ----
app.post('/api/trx/connect', async (req: Request, res: Response) => {
  const { locationId, mid, apiToken } = req.body as {
    locationId: string;
    mid: string;
    apiToken: string;
  };

  if (!locationId || !mid || !apiToken) {
    return res.status(400).json({ ok: false, error: 'locationId, mid, apiToken required' });
  }

  const baseUrl = process.env.TRX_BASE_URL || 'https://api.trxservices.com/api/v1/';

  try {
    await validateTrxCredentials({ baseUrl, mid, apiToken });

    await db.upsertTrxCreds({
      locationId,
      midEnc: encryptString(mid),
      apiTokenEnc: encryptString(apiToken),
    });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
});

app.post('/api/trx/charge', async (req: Request, res: Response) => {
  const { locationId, payload } = req.body as { locationId: string; payload: unknown };
  if (!locationId || !payload) return res.status(400).json({ ok: false, error: 'locationId and payload required' });

  const baseUrl = process.env.TRX_BASE_URL || 'https://api.trxservices.com/api/v1/';
  const creds = await db.getTrxCreds(locationId);
  if (!creds) return res.status(404).json({ ok: false, error: 'No TRX credentials stored for locationId' });

  try {
    const mid = decryptString(creds.midEnc);
    const apiToken = decryptString(creds.apiTokenEnc);
    const result = await trxRequest({
      baseUrl,
      mid,
      apiToken,
      method: 'POST',
      path: '/transactions/charge',
      body: payload,
    });
    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
});

app.post('/api/trx/refund', async (req: Request, res: Response) => {
  const { locationId, payload } = req.body as { locationId: string; payload: unknown };
  if (!locationId || !payload) return res.status(400).json({ ok: false, error: 'locationId and payload required' });

  const baseUrl = process.env.TRX_BASE_URL || 'https://api.trxservices.com/api/v1/';
  const creds = await db.getTrxCreds(locationId);
  if (!creds) return res.status(404).json({ ok: false, error: 'No TRX credentials stored for locationId' });

  try {
    const mid = decryptString(creds.midEnc);
    const apiToken = decryptString(creds.apiTokenEnc);
    const result = await trxRequest({
      baseUrl,
      mid,
      apiToken,
      method: 'POST',
      path: '/transactions/refund',
      body: payload,
    });
    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
});

// Serve frontend static files
const clientDir = path.resolve(__dirname, 'client');
app.use(express.static(clientDir));
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

async function main(): Promise<void> {
  await db.init();
  app.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
