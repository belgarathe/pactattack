'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Coins, Menu, UserRound, X, ShoppingCart } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useCoins } from '@/hooks/useCoins';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/collection', label: 'My Collection' },
  { href: '/battles', label: 'Battles' },
  { href: '/sales', label: 'Sales History' },
  { href: '/purchase', label: 'Purchase Coins' },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useUser();
  const { balance, refreshBalance } = useCoins();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Refresh balance and cart count on mount and when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const abortController = new AbortController();
    
    refreshBalance();
    
    // Load cart count
    fetch('/api/cart', { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch cart');
        return res.json();
      })
      .then((data) => {
        if (!abortController.signal.aborted && data.success && data.data?.itemCount) {
          setCartCount(data.data.itemCount);
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch cart:', error);
        }
      });
    
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur">
      <div className="container flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 text-xl font-bold">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            PA
          </div>
          <div>
            PactAttack
            <p className="text-xs font-medium text-muted">Open. Collect. Dominate.</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold text-muted transition',
                pathname?.startsWith(link.href) && 'bg-primary/20 text-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold text-muted transition',
                pathname?.startsWith('/admin') && 'bg-primary/20 text-foreground'
              )}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {isAuthenticated && (
            <>
              {/* Cart Icon */}
              <Link
                href="/cart"
                className="relative flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10 transition"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
              {/* Always visible coins display */}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Coins className="h-4 w-4 text-warning flex-shrink-0" />
                <span className="hidden text-xs font-semibold text-muted sm:inline">Coins</span>
                <span className="text-base font-bold text-warning sm:text-lg">{balance}</span>
              </div>
            </>
          )}
          {isAuthenticated ? (
            <div className="relative">
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold">
                  <UserRound className="h-4 w-4" />
                  {user?.name ?? user?.email}
                </summary>
                <div className="absolute right-0 mt-3 w-48 rounded-2xl border border-white/10 bg-surface/95 p-2 shadow-lg">
                  <Link
                    href="/dashboard"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/settings"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="mt-2 w-full rounded-lg bg-danger/10 px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger/20"
                  >
                    Logout
                  </button>
                </div>
              </details>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          )}
          <button
            type="button"
            className="md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-white/5 bg-background/95 px-6 py-4 md:hidden">
          {/* Mobile Coins Display */}
          {isAuthenticated && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-warning" />
                <span className="text-sm font-semibold text-muted">Coins</span>
              </div>
              <span className="text-xl font-bold text-warning">{balance}</span>
            </div>
          )}
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-semibold text-muted',
                  pathname?.startsWith(link.href) && 'bg-primary/20 text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-semibold text-muted',
                  pathname?.startsWith('/admin') && 'bg-primary/20 text-foreground'
                )}
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="mt-4 flex gap-3">
            {isAuthenticated ? (
              <>
                <Button asChild className="flex-1" variant="ghost">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button className="flex-1" onClick={() => signOut({ callbackUrl: '/' })}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="flex-1">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/register">Create Account</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

