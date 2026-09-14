import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcryptjs';
import { prisma } from '../../src/common/prisma.js';
import { PASSWORD, request, signup, startApi } from '../helpers.js';

describe('password reset HTTP', () => {
  let base = '';
  let close: () => Promise<void> = async () => undefined;

  before(async () => {
    const server = await startApi();
    base = server.base;
    close = server.close;
  });

  after(async () => {
    await close();
  });

  it('returns 200 for an unknown email and does not say so', async () => {
    const response = await request(base, '/auth/forgot-password', {
      method: 'POST',
      body: { email: 'nobody@example.com' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { ok: true });
  });

  it('rejects a wrong OTP with 401', async () => {
    const { email } = await signup(base, 'Reset Wrong');
    await request(base, '/auth/forgot-password', { method: 'POST', body: { email } });

    const response = await request(base, '/auth/verify-otp', {
      method: 'POST',
      body: { email, code: '000000' },
    });

    assert.equal(response.status, 401);
    assert.equal(response.data?.error?.message, 'Invalid or expired code.');
  });

  it('rejects an expired OTP with 401', async () => {
    const { email, user } = await signup(base, 'Reset Expired');
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash('424242', 12),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const response = await request(base, '/auth/verify-otp', {
      method: 'POST',
      body: { email, code: '424242' },
    });

    assert.equal(response.status, 401);
  });

  it('rejects a used OTP with 401', async () => {
    const { email, user } = await signup(base, 'Reset Used');
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash('424242', 12),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        consumedAt: new Date(),
      },
    });

    const response = await request(base, '/auth/verify-otp', {
      method: 'POST',
      body: { email, code: '424242' },
    });

    assert.equal(response.status, 401);
  });

  it('rejects mismatched confirmPassword with 400', async () => {
    const { email } = await signup(base, 'Reset Mismatch');

    const response = await request(base, '/auth/reset-password', {
      method: 'POST',
      body: {
        email,
        code: '424242',
        password: 'newsecret12',
        confirmPassword: 'different1',
      },
    });

    assert.equal(response.status, 400);
  });

  it('updates passwordHash so login works with the new password only', async () => {
    const { email, user } = await signup(base, 'Reset Success');
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        codeHash: await bcrypt.hash('424242', 12),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const verified = await request(base, '/auth/verify-otp', {
      method: 'POST',
      body: { email, code: '424242' },
    });
    assert.equal(verified.status, 200);
    assert.deepEqual(verified.data, { ok: true });

    const reset = await request(base, '/auth/reset-password', {
      method: 'POST',
      body: {
        email,
        code: '424242',
        password: 'newsecret12',
        confirmPassword: 'newsecret12',
      },
    });
    assert.equal(reset.status, 200);
    assert.deepEqual(reset.data, { ok: true });
    assert.equal(reset.data?.token, undefined);
    assert.equal(reset.data?.user, undefined);

    const withNew = await request(base, '/auth/login', {
      method: 'POST',
      body: { email, password: 'newsecret12' },
    });
    assert.equal(withNew.status, 200);
    assert.equal(typeof withNew.data?.token, 'string');

    const withOld = await request(base, '/auth/login', {
      method: 'POST',
      body: { email, password: PASSWORD },
    });
    assert.equal(withOld.status, 401);
  });
});
