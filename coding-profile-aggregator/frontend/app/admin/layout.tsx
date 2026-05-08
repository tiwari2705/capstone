'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const token = getToken();
      if (!token) {
        toast.error('Please login to access admin panel');
        router.push('/login');
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        
        if (data.role !== 'admin') {
          toast.error('Admin access required');
          router.push('/dashboard');
          return;
        }

        setAdmin(data);
      } catch (err: any) {
        console.error('Admin check error:', err);
        toast.error('Failed to verify admin access');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-muted)' }}>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <AdminSidebar admin={admin} />
      <main className="page-content">
        {children}
      </main>
    </div>
  );
}
