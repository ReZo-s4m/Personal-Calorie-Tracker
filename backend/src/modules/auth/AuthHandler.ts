import { Router, type Request, type RequestHandler, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { requireUser } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { handleValidation, validatedBody } from '../../middleware/validate.js';
import type { IAuthLogic } from './IAuthLogic.js';
import type { LoginRequest, SignupRequest } from './models/auth.models.js';
import { loginRules, signupRules } from './auth.rules.js';

export class AuthHandler {
  constructor(
    private readonly authLogic: IAuthLogic,
    private readonly authenticate: RequestHandler,
  ) {}

  routes(): Router {
    const router = Router();
    const attemptLimit = rateLimit({ name: 'auth', max: 20, windowMs: 60_000 });

    router.post('/signup', attemptLimit, signupRules, handleValidation, asyncHandler(this.signup));
    router.post('/login', attemptLimit, loginRules, handleValidation, asyncHandler(this.login));
    router.get('/me', this.authenticate, asyncHandler(this.me));

    return router;
  }

  private signup = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.authLogic.signup(validatedBody<SignupRequest>(req)));
  };

  private login = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.authLogic.login(validatedBody<LoginRequest>(req)));
  };

  private me = async (req: Request, res: Response): Promise<void> => {
    res.json({ user: await this.authLogic.getProfile(requireUser(req).userId) });
  };
}
