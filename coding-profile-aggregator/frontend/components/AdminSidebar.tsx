'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, User, BarChart3, Trophy, LogOut } from './icons';
import { removeToken } from '@/lib/auth';
import toast from 'react-hot-toast';

interface AdminSidebarProps {
  admin: {
    name?: string;
    username?: string;
    email?: string;
    role: string;
  };
}

export default function AdminSidebar({ admin }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: User },
    { name: 'Sections', href: '/admin/sections', icon: BarChart3 },
    { name: 'Courses', href: '/admin/courses', icon: BarChart3 },
    { name: 'Leaderboard', href: '/admin/leaderboard', icon: Trophy },
    { name: 'Language Filter', href: '/admin/language-filter', icon: BarChart3 },
  ];

  if (admin.role === 'superadmin') {
    navigation.push({ name: 'Manage Admins', href: '/admin/admins', icon: User });
  }

  const handleLogout = () => {
    removeToken();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <aside className="sidebar" style={{ zIndex: 10 }}>
      {/* Header */}
      <div className="sidebar-brand text-center" style={{ justifyContent: 'center', padding: '1rem' }}>
        <h1 className="sidebar-brand-text">Admin Panel</h1>
      </div>

      {/* Admin Info */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--grad-brand)', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
            <span className="text-white font-bold text-lg">
              {admin.name ? admin.name.charAt(0).toUpperCase() : (admin.username ? admin.username.charAt(0).toUpperCase() : 'A')}
            </span>
          </div>
        </div>
        <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{admin.name || admin.username}</p>
        <div className="mt-2 text-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${admin.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-orange-500/20 text-orange-500 border-orange-500/30'}`}>
            {admin.role === 'superadmin' ? 'admin' : 'Administrator'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
              <div className="sidebar-dot" />
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          className="sidebar-logout"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
