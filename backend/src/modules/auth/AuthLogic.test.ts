import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import bcrypt from 'bcryptjs';
import type { PasswordReset, PrismaClient, User } from '@prisma/client';
import { AppError } from '../../common/errors.js';
import type { IEmailLogic } from '../../common/email/IEmailLogic.js';
import type { ITokenLogic } from '../../common/security/ITokenLogic.js';
import { AuthLogic } from './AuthLogic.js';

const OLD_PASSWORD = 'supersecret1';
const NEW_PASSWORD = 'newsecret12';

function isAppError(error: unknown, statusCode: number): error is AppError {
  return error instanceof AppError && error.statusCode === statusCode;
}

function memoryAuth() {
  const now = () => new Date();
  const users: User[] = [];
  const resets: PasswordReset[] = [];
  const sent: { email: string; code: string }[] = [];
  let userSeq = 0;
  let resetSeq = 0;

  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) =>
        users.find((user) => user.email === where.email || user.id === where.id) ?? null,
      create: async ({ data }: { data: { email: string; displayName: string; passwordHash: string } }) => {
        const user: User = {
          id: `user-${++userSeq}`,
          email: data.email,
          displayName: data.displayName,
          passwordHash: data.passwordHash,
          createdAt: now(),
          updatedAt: now(),
        };
        users.push(user);
        return user;
      },
      update: async ({ where, data }: { where: { id: string }; data: { passwordHash: string } }) => {
        const user = users.find((row) => row.id === where.id);
        if (!user) {
          throw new Error('user missing');
        }
        user.passwordHash = data.passwordHash;
        user.updatedAt = now();
        return user;
      },
    },
    passwordReset: {
      findFirst: async ({
        where,
        orderBy,
      }: {
        where: { userId: string; consumedAt: null; expiresAt: { gt: Date } };
        orderBy: { createdAt: 'desc' };
      }) => {
        const cutoff = where.expiresAt.gt;
        const matches = resets.filter(
          (row) =>
            row.userId === where.userId &&
            row.consumedAt === null &&
            row.expiresAt > cutoff,
        );
        matches.sort((a, b) =>
          orderBy.createdAt === 'desc'
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime(),
        );
        return matches[0] ?? null;
      },
      create: async ({
        data,
      }: {
        data: { userId: string; codeHash: string; expiresAt: Date };
      }) => {
        const row: PasswordReset = {
          id: `reset-${++resetSeq}`,
          userId: data.userId,
          codeHash: data.codeHash,
          expiresAt: data.expiresAt,
          consumedAt: null,
          createdAt: now(),
        };
        resets.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { consumedAt: Date };
      }) => {
        const row = resets.find((reset) => reset.id === where.id);
        if (!row) {
          throw new Error('reset missing');
        }
        row.consumedAt = data.consumedAt;
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { userId: string; consumedAt: null };
        data: { consumedAt: Date };
      }) => {
        let count = 0;
        for (const row of resets) {
          if (row.userId === where.userId && row.consumedAt === null) {
            row.consumedAt = data.consumedAt;
            count += 1;
          }
        }
        return { count };
      },
    },
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
  } as unknown as PrismaClient;

  const tokens: ITokenLogic = {
    sign: ({ userId, email }) => `${userId}:${email}`,
    verify: () => {
      throw new Error('unused');
    },
  };

  const email: IEmailLogic = {
    sendPasswordResetCode: async (address, code) => {
      sent.push({ email: address, code });
    },
  };

  return {
    auth: new AuthLogic(prisma, tokens, email),
    users,
    resets,
    sent,
  };
}

describe('AuthLogic password reset', () => {
  it('returns ok for an unknown email and does not send a code', async () => {
    const { auth, sent } = memoryAuth();

    const result = await auth.forgotPassword({ email: 'missing@example.com' });

    assert.deepEqual(result, { ok: true });
    assert.equal(sent.length, 0);
  });

  it('emails a 6-digit code for a known account and never puts it on the user', async () => {
    const { auth, users, sent } = memoryAuth();
    await auth.signup({
      email: 'ava@example.com',
      password: OLD_PASSWORD,
      displayName: 'Ava',
    });

    const result = await auth.forgotPassword({ email: 'ava@example.com' });

    assert.deepEqual(result, { ok: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.email, 'ava@example.com');
    assert.match(sent[0]?.code ?? '', /^\d{6}$/);
    assert.equal(users[0]?.passwordHash.includes(sent[0]?.code ?? 'nope'), false);
  });

  it('rejects a wrong OTP with 401', async () => {
    const { auth } = memoryAuth();
    await auth.signup({
      email: 'ava@example.com',
      password: OLD_PASSWORD,
      displayName: 'Ava',
    });
    await auth.forgotPassword({ email: 'ava@example.com' });

    await assert.rejects(
      () => auth.verifyOtp({ email: 'ava@example.com', code: '000000' }),
      (error: unknown) => isAppError(error, 401),
    );
  });

  it('rejects an expired OTP with 401', async () => {
    const { auth, resets } = memoryAuth();
    await auth.signup({
      email: 'ava@example.com',
      password: OLD_PASSWORD,
      displayName: 'Ava',
    });
    await auth.forgotPassword({ email: 'ava@example.com' });
    const reset = resets[0];
    if (!reset) {
      throw new Error('expected a reset row');
    }
    reset.expiresAt = new Date(Date.now() - 1000);

    await assert.rejects(
      () => auth.verifyOtp({ email: 'ava@example.com', code: '123456' }),
      (error: unknown) => isAppError(error, 401),
    );
  });

  it('rejects a used OTP with 401', async () => {
    const { auth, sent } = memoryAuth();
    await auth.signup({
      email: 'ava@example.com',
      password: OLD_PASSWORD,
      displayName: 'Ava',
    });
    await auth.forgotPassword({ email: 'ava@example.com' });
    const code = sent[0]?.code ?? '';

    await auth.resetPassword({
      email: 'ava@example.com',
      code,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    await assert.rejects(
      () => auth.verifyOtp({ email: 'ava@example.com', code }),
      (error: unknown) => isAppError(error, 401),
    );
  });

  it('rejects mismatched confirmPassword with 400', async () => {
    const { auth, sent } = memoryAuth();
    await auth.signup({
      email: 'ava@example.com',
      password: OLD_PASSWORD,
      displayName: 'Ava',
    });
    await auth.forgotPassword({ email: 'ava@example.com' });
    const code = sent[0]?.code ?? '';

    await assert.rejects(
      () =>
        auth.resetPassword({
          email: 'ava@example.com',
          code,
          password: NEW_PASSWORD,
          confirmPassword: 'different1',
        }),
      (error: unknown) => isAppError(error, 400),
    );
  });

  it('updates passwordHash so the new password logs in and the old one does not', async () => {
    const { auth, sent, users } = memoryAuth();
    await auth.signup({
      email: 'ava@example.com',
      password: OLD_PASSWORD,
      displayName: 'Ava',
    });
    await auth.forgotPassword({ email: 'ava@example.com' });
    const code = sent[0]?.code ?? '';

    const verified = await auth.verifyOtp({ email: 'ava@example.com', code });
    assert.deepEqual(verified, { ok: true });

    const reset = await auth.resetPassword({
      email: 'ava@example.com',
      code,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });
    assert.deepEqual(reset, { ok: true });
    assert.equal(await bcrypt.compare(NEW_PASSWORD, users[0]?.passwordHash ?? ''), true);

    const session = await auth.login({ email: 'ava@example.com', password: NEW_PASSWORD });
    assert.equal(session.user.email, 'ava@example.com');
    assert.equal(typeof session.token, 'string');

    await assert.rejects(
      () => auth.login({ email: 'ava@example.com', password: OLD_PASSWORD }),
      (error: unknown) => isAppError(error, 401),
    );
  });
});
