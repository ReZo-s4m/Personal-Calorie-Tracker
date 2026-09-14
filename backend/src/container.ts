import { config } from './config/index.js';
import { prisma } from './common/prisma.js';
import type { ITokenLogic } from './common/security/ITokenLogic.js';
import { JwtTokenLogic } from './common/security/JwtTokenLogic.js';
import { createAuthenticate } from './middleware/auth.js';
import { AuthHandler } from './modules/auth/AuthHandler.js';
import { AuthLogic } from './modules/auth/AuthLogic.js';
import type { IAuthLogic } from './modules/auth/IAuthLogic.js';

export const tokenLogic: ITokenLogic = new JwtTokenLogic(config.jwt);
export const authenticate = createAuthenticate(tokenLogic);
export const authLogic: IAuthLogic = new AuthLogic(prisma, tokenLogic);
export const authHandler = new AuthHandler(authLogic, authenticate);
