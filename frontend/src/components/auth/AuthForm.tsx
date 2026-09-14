'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { BrandMark } from '@/components/brand/BrandMark';
import { Alert, Button, Field, Input } from '@/components/ui';

interface AuthFormProps {
  mode: 'login' | 'signup';
  passwordUpdated?: boolean;
}

export function AuthForm({ mode, passwordUpdated = false }: AuthFormProps) {
  const router = useRouter();
  const { login, signup, user, isLoading } = useAuth();
  const isSignup = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const fieldError = (field: string) =>
    error instanceof ApiError ? error.fieldError(field) : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isSignup) {
        await signup(email, password, displayName);
      } else {
        await login(email, password);
      }
      router.replace('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error('Something went wrong.'));
      setIsSubmitting(false);
    }
  }

  const bannerError =
    error && !(error instanceof ApiError && error.fieldErrors.length > 0) ? error.message : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#1a1614] px-4 py-10">
      <div className="mb-8">
        <Link href="/" aria-label="NutriAI">
          <BrandMark size={32} tone="paper" />
        </Link>
      </div>

      <section className="auth-light w-full max-w-[26rem] rounded-md bg-surface p-7 text-foreground shadow-[0_24px_60px_rgb(0_0_0/0.28)] sm:p-8">
        <p className="font-display text-base italic text-accent">
          {isSignup ? 'Sign up' : 'Sign in'}
        </p>
        <h1 className="mt-1 text-[1.85rem] font-medium tracking-tight">
          {isSignup ? 'Create your account' : 'Calorie Tracker'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {isSignup ? 'Create an account to start logging meals.' : 'Sign in to your account.'}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4">
          {passwordUpdated && !bannerError && (
            <Alert tone="info">Password updated. Sign in with the new one.</Alert>
          )}
          {bannerError && <Alert>{bannerError}</Alert>}

          {isSignup && (
            <Field label="Name" htmlFor="displayName" error={fieldError('displayName')}>
              <Input
                id="displayName"
                name="displayName"
                autoComplete="name"
                placeholder="Your name"
                value={displayName}
                hasError={Boolean(fieldError('displayName'))}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </Field>
          )}

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

          <Field
            label="Password"
            htmlFor="password"
            error={fieldError('password')}
            hint={isSignup ? 'At least 8 characters.' : undefined}
          >
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
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

          {!isSignup && (
            <p className="-mt-1 text-sm">
              <Link href="/forgot-password" className="font-medium text-accent hover:underline">
                Forgot password?
              </Link>
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-1 h-11 w-full">
            {isSignup ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted">
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <Link href={isSignup ? '/login' : '/signup'} className="font-medium text-accent hover:underline">
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </section>
    </main>
  );
}
