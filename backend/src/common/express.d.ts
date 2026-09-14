import type { TokenPayload } from '../common/security/ITokenLogic.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export {};
