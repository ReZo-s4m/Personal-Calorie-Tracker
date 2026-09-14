import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AppConfig } from '../../config/index.js';
import { unauthorized } from '../errors.js';
import type { ITokenLogic, TokenPayload } from './ITokenLogic.js';

type JwtConfig = AppConfig['jwt'];

export class JwtTokenLogic implements ITokenLogic {
  constructor(private readonly config: JwtConfig) {}

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.expiresIn as SignOptions['expiresIn'],
    });
  }

  verify(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.config.secret);

      if (typeof decoded === 'string' || !decoded.userId || !decoded.email) {
        throw unauthorized('Malformed authentication token.');
      }

      return { userId: decoded.userId as string, email: decoded.email as string };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw unauthorized('Your session has expired. Please sign in again.');
      }
      throw unauthorized('Invalid authentication token.');
    }
  }
}
