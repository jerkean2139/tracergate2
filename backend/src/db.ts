import { Pool } from 'pg';

export interface GhlInstallationRow {
  installKey: string;
  companyId: string | null;
  locationId: string | null;
  userId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  scope: string | null;
  updatedAt: string;
}

export interface AcceptBlueCredRow {
  locationId: string;
  sourceKeyEnc: string;
  pinEnc: string;
  updatedAt: string;
}

export interface TrxCredRow {
  locationId: string;
  midEnc: string;
  apiTokenEnc: string;
  updatedAt: string;
}

export class Db {
  readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      create table if not exists ghl_installations (
        install_key text primary key,
        company_id text,
        location_id text,
        user_id text,
        access_token text,
        refresh_token text,
        token_expires_at timestamptz,
        scope text,
        updated_at timestamptz not null default now()
      );
    `);

    await this.pool.query(`
      create index if not exists idx_ghl_installations_location_id on ghl_installations(location_id);
    `);

    await this.pool.query(`
      create table if not exists acceptblue_creds (
        location_id text primary key,
        source_key_enc text not null,
        pin_enc text not null,
        updated_at timestamptz not null default now()
      );
    `);

    await this.pool.query(`
      create table if not exists acceptblue_webhook_events (
        event_id text primary key,
        received_at timestamptz not null default now()
      );
    `);

    await this.pool.query(`
      create table if not exists trx_creds (
        location_id text primary key,
        mid_enc text not null,
        api_token_enc text not null,
        updated_at timestamptz not null default now()
      );
    `);
  }

  async upsertGhlInstallation(row: Omit<GhlInstallationRow, 'updatedAt'>): Promise<void> {
    await this.pool.query(
      `
      insert into ghl_installations (
        install_key, company_id, location_id, user_id, access_token, refresh_token, token_expires_at, scope, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8, now()
      )
      on conflict (install_key) do update set
        company_id = excluded.company_id,
        location_id = excluded.location_id,
        user_id = excluded.user_id,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_expires_at = excluded.token_expires_at,
        scope = excluded.scope,
        updated_at = now();
      `,
      [
        row.installKey,
        row.companyId,
        row.locationId,
        row.userId,
        row.accessToken,
        row.refreshToken,
        row.tokenExpiresAt ? new Date(row.tokenExpiresAt) : null,
        row.scope,
      ]
    );
  }

  async getGhlInstallation(locationId: string): Promise<GhlInstallationRow | null> {
    const res = await this.pool.query(
      `select install_key as "installKey", company_id as "companyId", location_id as "locationId",
              user_id as "userId", access_token as "accessToken", refresh_token as "refreshToken",
              token_expires_at as "tokenExpiresAt", scope, updated_at as "updatedAt"
       from ghl_installations where location_id=$1`,
      [locationId]
    );
    return (res.rows[0] as GhlInstallationRow | undefined) ?? null;
  }

  async upsertAcceptBlueCreds(row: Omit<AcceptBlueCredRow, 'updatedAt'>): Promise<void> {
    await this.pool.query(
      `
      insert into acceptblue_creds (location_id, source_key_enc, pin_enc, updated_at)
      values ($1,$2,$3, now())
      on conflict (location_id) do update set
        source_key_enc = excluded.source_key_enc,
        pin_enc = excluded.pin_enc,
        updated_at = now();
      `,
      [row.locationId, row.sourceKeyEnc, row.pinEnc]
    );
  }

  async getAcceptBlueCreds(locationId: string): Promise<AcceptBlueCredRow | null> {
    const res = await this.pool.query(
      `select location_id as "locationId", source_key_enc as "sourceKeyEnc", pin_enc as "pinEnc", updated_at as "updatedAt" from acceptblue_creds where location_id=$1`,
      [locationId]
    );
    return (res.rows[0] as AcceptBlueCredRow | undefined) ?? null;
  }

  async upsertTrxCreds(row: Omit<TrxCredRow, 'updatedAt'>): Promise<void> {
    await this.pool.query(
      `
      insert into trx_creds (location_id, mid_enc, api_token_enc, updated_at)
      values ($1,$2,$3, now())
      on conflict (location_id) do update set
        mid_enc = excluded.mid_enc,
        api_token_enc = excluded.api_token_enc,
        updated_at = now();
      `,
      [row.locationId, row.midEnc, row.apiTokenEnc]
    );
  }

  async getTrxCreds(locationId: string): Promise<TrxCredRow | null> {
    const res = await this.pool.query(
      `select location_id as "locationId", mid_enc as "midEnc", api_token_enc as "apiTokenEnc", updated_at as "updatedAt" from trx_creds where location_id=$1`,
      [locationId]
    );
    return (res.rows[0] as TrxCredRow | undefined) ?? null;
  }

  async isAcceptBlueEventProcessed(eventId: string): Promise<boolean> {
    const res = await this.pool.query('select 1 from acceptblue_webhook_events where event_id=$1', [eventId]);
    return (res.rowCount ?? 0) > 0;
  }

  async markAcceptBlueEventProcessed(eventId: string): Promise<void> {
    await this.pool.query('insert into acceptblue_webhook_events (event_id) values ($1) on conflict do nothing', [eventId]);
  }
}
