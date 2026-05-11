import type { Request, Response, NextFunction } from 'express';
import type { Db } from './db.js';

/**
 * Middleware that verifies /api/* requests come from an installed GHL location.
 * Checks that the locationId in the request body has a valid ghl_installations row.
 * Webhooks and auth routes are exempt — they have their own verification.
 */
export function requireGhlInstallation(db: Db) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const locationId =
      (req.body as any)?.locationId ||
      (req.query.locationId as string | undefined);

    if (!locationId) {
      res.status(401).json({ ok: false, error: 'Missing locationId' });
      return;
    }

    const installation = await db.getGhlInstallation(locationId);
    if (!installation) {
      res.status(403).json({ ok: false, error: 'No GHL installation found for this location' });
      return;
    }

    // Attach installation to request for downstream use
    (req as any).ghlInstallation = installation;
    next();
  };
}
