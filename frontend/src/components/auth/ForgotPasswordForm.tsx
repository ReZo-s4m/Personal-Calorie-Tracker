'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { BrandMark } from '@/components/brand/BrandMark';
import { Alert, Button, Field, Input } from '@/components/ui';

type Step = 'email' | 'otp' | 'password';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const fieldError = (field: string) =>
    error instanceof ApiError ? error.fieldError(field) : undefined;

  const bannerError =
    error && !(error instanceof ApiError && error.fieldErrors.length > 0) ? error.message : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      if (step === 'email') {
        await api.auth.forgotPassword({ email });
        setStep('otp');
        setInfo('If that email is registered, a 6-digit code is on its way. Check the inbox and spam folder.');
      } else if (step === 'otp') {
        await api.auth.verifyOtp({ email, code });
        setStep('password');
      } else {
        await api.auth.resetPassword({ email, code, password, confirmPassword });
        router.replace('/login?reset=1');
        return;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Something went wrong.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    setError(null);
    setInfo(null);
    setIsResending(true);

    try {
      await api.auth.forgotPassword({ email });
      setCode('');
      setInfo('A new code was sent. The previous one no longer works.');
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Something went wrong.'));
    } finally {
      setIsResending(false);
    }
  }

  const copy =
    step === 'email'
      ? {
          kicker: 'Reset',
          title: 'Forgot password',
          body: 'Enter the email on the account. If it is registered, we will send a 6-digit code.',
          submit: 'Send code',
        }
      : step === 'otp'
        ? {
            kicker: 'Reset',
            title: 'Enter the code',
            body: `Enter the 6-digit code sent to ${email}.`,
            submit: 'Verify code',
          }
        : {
            kicker: 'Reset',
            title: 'Choose a new password',
            body: 'Then sign in with it. This will not keep you logged in.',
            submit: 'Update password',
          };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#1a1614] px-4 py-10">
      <div className="mb-8">
        <Link href="/" aria-label="NutriAI">
          <BrandMark size={32} tone="paper" />
        </Link>
      </div>

      <section className="auth-light w-full max-w-[26rem] rounded-md bg-surface p-7 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.28)] sm:p-8">
        <p className="font-display text-base italic text-accent">{copy.kicker}</p>
        <h1 className="mt-1 text-[1.85rem] font-medium tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{copy.body}</p>

        <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
          {info && <Alert tone="info">{info}</Alert>}
          {bannerError && <Alert>{bannerError}</Alert>}

          {step === 'email' && (
            <Field label="Email" htmlFor="email" error={fieldError('email')}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                hasError={Boolean(fieldError('email'))}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          )}

          {step === 'otp' && (
            <Field label="Code" htmlFor="code" error={fieldError('code')} hint="6 digits.">
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={code}
                hasError={Boolean(fieldError('code'))}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </Field>
          )}

          {step === 'password' && (
            <>
              <Field
                label="New password"
                htmlFor="password"
                error={fieldError('password')}
                hint="At least 8 characters."
              >
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    hasError={Boolean(fieldError('password'))}
                    className="pr-16"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-subtle hover:text-foreground"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>

              <Field
                label="Re-enter password"
                htmlFor="confirmPassword"
                error={fieldError('confirmPassword')}
              >
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  hasError={Boolean(fieldError('confirmPassword'))}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>
            </>
          )}

          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={step === 'otp' && code.length !== 6}
            className="mt-1 h-11 w-full"
          >
            {copy.submit}
          </Button>
        </form>

        {step === 'otp' && (
          <p className="mt-4 text-sm text-muted">
            <button
              type="button"
              className="font-medium text-accent hover:underline disabled:opacity-60"
              disabled={isResending}
              onClick={() => void resendCode()}
            >
              {isResending ? 'Sending…' : 'Resend code'}
            </button>
            {' · '}
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
                setInfo(null);
              }}
            >
              Use a different email
            </button>
          </p>
        )}

        <p className="mt-6 text-sm text-muted">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
