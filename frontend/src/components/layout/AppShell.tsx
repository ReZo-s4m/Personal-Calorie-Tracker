'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button, cx } from '@/components/ui';
import type { User } from '@/lib/types';
import { NavIcon } from './nav-icons';

const DIARY = [
  { href: '/dashboard', name: 'Overview', label: 'Overview', icon: 'today' as const },
  { href: '/log', name: 'Add Meal', label: 'Add Meal', icon: 'log' as const },
  { href: '/entries', name: 'Food Log', label: 'Food Log', icon: 'entries' as const },
];

const NUTRITION = [
  { href: '/goals', name: 'Target', label: 'Target', icon: 'goals' as const },
  { href: '/weight', name: 'Weigh-in', label: 'Weigh-in', icon: 'weight' as const },
  { href: '/reports', name: 'Insights', label: 'Insights', icon: 'reports' as const },
];

const TOOLS = [
  { href: '/chat', name: 'Ask AI', label: 'Ask AI', icon: 'chat' as const },
  { href: '/import', name: 'Upload', label: 'Upload', icon: 'import' as const },
];

const MOBILE_TABS = [
  { href: '/dashboard', name: 'Overview', label: 'Home', icon: 'today' as const },
  { href: '/log', name: 'Add Meal', label: 'Add', icon: 'log' as const },
  { href: '/entries', name: 'Food Log', label: 'Log', icon: 'entries' as const },
  { href: '/weight', name: 'Weigh-in', label: 'Scale', icon: 'weight' as const },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  const initial = user.displayName.trim().slice(0, 1).toUpperCase() || '?';

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden bg-[var(--rail)] text-[var(--rail-text)] lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <BrandMark size={40} withName={false} />
            <span>
              <span className="block text-sm font-semibold tracking-wide">NutriAI</span>
              <span className="block text-[11px] font-medium text-[var(--rail-muted)]">Calorie tracker</span>
            </span>
          </Link>
        </div>

        <LayoutGroup>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5" aria-label="Main">
          <NavGroup title="Kitchen" items={DIARY} pathname={pathname} />
          <NavGroup title="Health" items={NUTRITION} pathname={pathname} />
          <NavGroup title="Help" items={TOOLS} pathname={pathname} />
        </nav>
        </LayoutGroup>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="flex items-center lg:invisible">
              <BrandMark size={28} withName={false} />
            </Link>
            <ProfileMenu user={user} initial={initial} onLogout={logout} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </main>

        <MobileDock
          pathname={pathname}
          moreOpen={moreOpen}
          onToggleMore={() => setMoreOpen((open) => !open)}
        />
        {moreOpen && (
          <MoreSheet
            pathname={pathname}
            onClose={() => setMoreOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function ProfileMenu({
  user,
  initial,
  onLogout,
}: {
  user: User;
  initial: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Open profile"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="grid size-10 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent shadow-[0_8px_18px_rgb(154_52_18/0.22)] transition-transform hover:scale-[1.03]"
      >
        {initial}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Profile"
          className="absolute right-0 top-[calc(100%+0.6rem)] z-40 w-72 overflow-hidden rounded-md border border-border bg-surface shadow-[0_18px_40px_rgb(15_23_42/0.16)]"
        >
          <div className="flex items-start gap-3 px-4 py-4">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.displayName}</p>
              <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <div className="border-t border-border px-3 py-3">
            <Button variant="secondary" className="w-full" onClick={onLogout}>
              Log out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: {
    href: string;
    name: string;
    label: string;
    icon: Parameters<typeof NavIcon>[0]['name'];
  }[];
  pathname: string;
}) {
  return (
    <div>
      <p className="px-3 pb-2 font-display text-sm italic text-[var(--rail-muted)]">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <NavItem key={item.href} {...item} active={isActivePath(pathname, item.href)} />
        ))}
      </div>
    </div>
  );
}

function NavItem({
  href,
  name,
  label,
  icon,
  active,
}: {
  href: string;
  name: string;
  label: string;
  icon: Parameters<typeof NavIcon>[0]['name'];
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={name}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
        active
          ? 'font-medium text-[var(--rail-text)]'
          : 'text-[var(--rail-muted)] hover:bg-white/[0.05] hover:text-[var(--rail-text)]',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-md bg-white/[0.08]"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span
        className={cx(
          'relative grid size-8 place-items-center rounded-sm',
          active ? 'bg-accent text-on-accent' : 'bg-white/[0.06]',
        )}
      >
        <NavIcon name={icon} />
      </span>
      <span className="relative">{label}</span>
    </Link>
  );
}

function MobileDock({
  pathname,
  moreOpen,
  onToggleMore,
}: {
  pathname: string;
  moreOpen: boolean;
  onToggleMore: () => void;
}) {
  const moreActive =
    moreOpen ||
    [...NUTRITION, ...TOOLS].some(
      (item) => item.href !== '/weight' && isActivePath(pathname, item.href),
    );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_40px_rgb(15_23_42/0.1)] backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      <div className="grid h-14 grid-cols-5">
        {MOBILE_TABS.map((item) => {
          const active = !moreOpen && isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.name}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex flex-col items-center justify-center gap-1 text-[10px] font-semibold leading-none tracking-wide',
                active ? 'bg-accent-soft text-accent' : 'text-muted',
              )}
            >
              <span className="grid size-5 place-items-center">
                <NavIcon name={item.icon} className="size-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="mobile-more"
          onClick={onToggleMore}
          className={cx(
            'flex flex-col items-center justify-center gap-1 text-[10px] font-semibold leading-none tracking-wide',
            moreActive ? 'bg-accent-soft text-accent' : 'text-muted',
          )}
        >
          <span className="grid size-5 place-items-center">
            <MoreIcon />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose: () => void;
}) {
  const extras = [...NUTRITION.filter((item) => item.href !== '/weight'), ...TOOLS];

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        id="mobile-more"
        className="absolute inset-x-0 bottom-0 border-t border-border bg-surface px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_44px_rgb(15_23_42/0.18)]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
        <p className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-subtle">More</p>
        <div className="mt-2 grid gap-1">
          {extras.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.name}
              aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 rounded-md px-3 py-3 text-sm',
                isActivePath(pathname, item.href) ? 'bg-accent-soft font-medium text-accent' : 'text-foreground',
              )}
            >
              <span className="grid size-9 place-items-center rounded-md bg-surface-raised">
                <NavIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

