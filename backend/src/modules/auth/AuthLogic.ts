import bcrypt from 'bcryptjs';
import type { PrismaClient, User } from '@prisma/client';
import { conflict, notFound, unauthorized } from '../../common/errors.js';
import type { ITokenLogic } from '../../common/security/ITokenLogic.js';
import type { IAuthLogic } from './IAuthLogic.js';
import type {
  AuthResponse,
  LoginRequest,
  PublicUser,
  SignupRequest,
} from './models/auth.models.js';

const SALT_ROUNDS = 12;

/** A well-formed hash of the right cost, so a miss costs the same as a hit. */
const DUMMY_HASH = `$2a$${SALT_ROUNDS}$${'.'.repeat(53)}`;

export class AuthLogic implements IAuthLogic {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokens: ITokenLogic,
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
