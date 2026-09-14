import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { PasswordReset, PrismaClient, User } from '@prisma/client';
import type { IEmailLogic } from '../../common/email/IEmailLogic.js';
import { badRequest, conflict, notFound, unauthorized } from '../../common/errors.js';
import type { ITokenLogic } from '../../common/security/ITokenLogic.js';
import type { IAuthLogic } from './IAuthLogic.js';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  OkResponse,
  PublicUser,
  ResetPasswordRequest,
  SignupRequest,
  VerifyOtpRequest,
} from './models/auth.models.js';

const SALT_ROUNDS = 12;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_ERROR = 'Invalid or expired code.';
const OK: OkResponse = { ok: true };

/** A well-formed hash of the right cost, so a miss costs the same as a hit. */
const DUMMY_HASH = `$2a$${SALT_ROUNDS}$${'.'.repeat(53)}`;

export class AuthLogic implements IAuthLogic {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokens: ITokenLogic,
    private readonly email: IEmailLogic,
  ) {}

  async signup(request: SignupRequest): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: request.email } });

    if (existing) {
      throw conflict('An account with this email already exists.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: request.email,
        displayName: request.displayName,
        passwordHash: await bcrypt.hash(request.password, SALT_ROUNDS),
      },
    });

    return this.toAuthResponse(user);
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: request.email } });

    if (!user) {
      await bcrypt.compare(request.password, DUMMY_HASH);
      throw unauthorized('Incorrect email or password.');
    }

    const passwordMatches = await bcrypt.compare(request.password, user.passwordHash);

    if (!passwordMatches) {
      throw unauthorized('Incorrect email or password.');
    }

    return this.toAuthResponse(user);
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw notFound('User');
    }

    return this.toPublicUser(user);
  }

  async forgotPassword(request: ForgotPasswordRequest): Promise<OkResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: request.email } });
    const code = this.sixDigitCode();
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

    if (!user) {
      return OK;
    }

    const now = new Date();

    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: now },
    });

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      },
    });

    await this.email.sendPasswordResetCode(user.email, code);

    return OK;
  }

  async verifyOtp(request: VerifyOtpRequest): Promise<OkResponse> {
    await this.requireActiveReset(request.email, request.code);
    return OK;
  }

  async resetPassword(request: ResetPasswordRequest): Promise<OkResponse> {
    if (request.password !== request.confirmPassword) {
      throw badRequest('Passwords do not match.');
    }

    if (request.password.length < 8 || request.password.length > 128) {
      throw badRequest('Password must be between 8 and 128 characters.');
    }

    const { user, reset } = await this.requireActiveReset(request.email, request.code);
    const passwordHash = await bcrypt.hash(request.password, SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return OK;
  }

  private async requireActiveReset(
    email: string,
    code: string,
  ): Promise<{ user: User; reset: PasswordReset }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      await bcrypt.compare(code, DUMMY_HASH);
      throw unauthorized(OTP_ERROR);
    }

    const reset = await this.prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!reset) {
      await bcrypt.compare(code, DUMMY_HASH);
      throw unauthorized(OTP_ERROR);
    }

    const matches = await bcrypt.compare(code, reset.codeHash);

    if (!matches) {
      throw unauthorized(OTP_ERROR);
    }

    return { user, reset };
  }

  private sixDigitCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private toAuthResponse(user: User): AuthResponse {
    return {
      user: this.toPublicUser(user),
      token: this.tokens.sign({ userId: user.id, email: user.email }),
    };
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  }
}
