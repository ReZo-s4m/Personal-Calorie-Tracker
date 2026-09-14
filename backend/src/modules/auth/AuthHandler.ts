import { Router, type Request, type RequestHandler, type Response } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { requireUser } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { handleValidation, validatedBody } from '../../middleware/validate.js';
import type { IAuthLogic } from './IAuthLogic.js';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  SignupRequest,
  VerifyOtpRequest,
} from './models/auth.models.js';
import {
  forgotPasswordRules,
  loginRules,
  resetPasswordRules,
  signupRules,
  verifyOtpRules,
} from './auth.rules.js';

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
    router.post(
      '/forgot-password',
      attemptLimit,
      forgotPasswordRules,
      handleValidation,
      asyncHandler(this.forgotPassword),
    );
    router.post(
      '/verify-otp',
      attemptLimit,
      verifyOtpRules,
      handleValidation,
      asyncHandler(this.verifyOtp),
    );
    router.post(
      '/reset-password',
      attemptLimit,
      resetPasswordRules,
      handleValidation,
      asyncHandler(this.resetPassword),
    );
    router.get('/me', this.authenticate, asyncHandler(this.me));

    return router;
  }

  private signup = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.authLogic.signup(validatedBody<SignupRequest>(req)));
  };

  private login = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.authLogic.login(validatedBody<LoginRequest>(req)));
  };

  private forgotPassword = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.authLogic.forgotPassword(validatedBody<ForgotPasswordRequest>(req)));
  };

  private verifyOtp = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.authLogic.verifyOtp(validatedBody<VerifyOtpRequest>(req)));
  };

  private resetPassword = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.authLogic.resetPassword(validatedBody<ResetPasswordRequest>(req)));
  };

  private me = async (req: Request, res: Response): Promise<void> => {
    res.json({ user: await this.authLogic.getProfile(requireUser(req).userId) });
  };
}
