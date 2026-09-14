import type { Request, RequestHandler } from 'express';
import { unauthorized } from '../common/errors.js';
import type { ITokenLogic, TokenPayload } from '../common/security/ITokenLogic.js';

const BEARER_PREFIX = 'Bearer ';

/**
 * Builds the bearer-token filter. Wired once in the composition root and applied
 * where a router is mounted, the way a Spring security filter is configured
 * centrally rather than injected into each controller.
 */
export function createAuthenticate(tokens: ITokenLogic): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      next(unauthorized('Missing bearer token.'));
      return;
    }

    try {
      req.user = tokens.verify(header.slice(BEARER_PREFIX.length).trim());
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireUser(req: Request): TokenPayload {
  if (!req.user) {
    throw unauthorized('This route requires an authenticated user.');
  }
  return req.user;
}
