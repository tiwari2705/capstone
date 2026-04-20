'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Fix #7 — 'checking' prevents any dashboard content from rendering
  // until we've confirmed the token is valid AND not expired.
  // Without this flag, protected content flashes briefly before the redirect fires.
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Decode the JWT payload and check the exp claim.
    // This validates both token existence AND expiry client-side,
    // so expired tokens redirect immediately rather than causing a 401 cascade.
    const isValidToken = (): boolean => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return false;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // exp is in seconds, Date.now() is in ms
        return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
      } catch {
        return false;
      }
    };

    if (!isValidToken()) {
      router.replace('/login');
    } else {
      setChecking(false);
    }
  }, [router]);

  // Render nothing while checking — prevents the protected dashboard from
  // flashing during the brief window before the redirect fires.
  if (checking) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="page-content">
        {children}
      </main>
    </div>
  );
}
