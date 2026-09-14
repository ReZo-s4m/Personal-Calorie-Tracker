import { config } from './config/index.js';
import { SystemClock, type IClock } from './common/clock.js';
import { prisma } from './common/prisma.js';
import type { ITokenLogic } from './common/security/ITokenLogic.js';
import { JwtTokenLogic } from './common/security/JwtTokenLogic.js';
import { createAuthenticate } from './middleware/auth.js';
import { AuthHandler } from './modules/auth/AuthHandler.js';
import { AuthLogic } from './modules/auth/AuthLogic.js';
import type { IAuthLogic } from './modules/auth/IAuthLogic.js';
import { EntriesHandler } from './modules/entries/EntriesHandler.js';
import { EntriesLogic } from './modules/entries/EntriesLogic.js';
import type { IEntriesLogic } from './modules/entries/IEntriesLogic.js';

export const clock: IClock = new SystemClock();
export const tokenLogic: ITokenLogic = new JwtTokenLogic(config.jwt);
export const authenticate = createAuthenticate(tokenLogic);

export const authLogic: IAuthLogic = new AuthLogic(prisma, tokenLogic);
export const entriesLogic: IEntriesLogic = new EntriesLogic(prisma, clock);

export const authHandler = new AuthHandler(authLogic, authenticate);
export const entriesHandler = new EntriesHandler(entriesLogic);
