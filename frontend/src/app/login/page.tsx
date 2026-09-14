import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Sign in · Calorie Tracker' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return <AuthForm mode="login" passwordUpdated={reset === '1'} />;
}
