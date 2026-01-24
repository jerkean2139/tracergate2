import fs from 'node:fs';
import path from 'node:path';

export interface DbShape {
  ghl: {
    installations: Record<
      string,
      {
        companyId?: string;
        locationId?: string;
        userId?: string;
        accessToken?: string;
        refreshToken?: string;
        tokenExpiresAt?: string;
        scope?: string;
        updatedAt: string;
      }
    >;
  };
  acceptBlue: {
    credsByLocationId: Record<
      string,
      {
        sourceKeyEnc: string;
        pinEnc: string;
        updatedAt: string;
      }
    >;
  };
  webhook: {
    acceptBlueProcessedEventIds: Record<string, true>;
  };
}

const defaultDb: DbShape = {
  ghl: { installations: {} },
  acceptBlue: { credsByLocationId: {} },
  webhook: { acceptBlueProcessedEventIds: {} },
};

export class JsonDb {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(defaultDb, null, 2), 'utf8');
    }
  }

  read(): DbShape {
    const raw = fs.readFileSync(this.filePath, 'utf8');
    return JSON.parse(raw) as DbShape;
  }

  write(next: DbShape): void {
    fs.writeFileSync(this.filePath, JSON.stringify(next, null, 2), 'utf8');
  }

  update(mutator: (db: DbShape) => void): DbShape {
    const db = this.read();
    mutator(db);
    this.write(db);
    return db;
  }
}
