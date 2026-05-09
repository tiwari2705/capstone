'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Link2, LogOut, Code2, Trophy, User } from './icons';
import { removeToken } from '@/lib/auth';
import toast from 'react-hot-toast';

const navItems = [
  { name: 'Dashboard',        href: '/dashboard',          icon: LayoutDashboard },
  { name: 'Manage Platforms', href: '/dashboard/profiles', icon: Link2 },
  { name: 'Leaderboard',      href: '/leaderboard',        icon: Trophy },
  { name: 'Settings',         href: '/dashboard/settings', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = () => {
    removeToken();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Code2 size={20} color="#fff" />
        </div>
        <span className="sidebar-brand-text">CodeQuest</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-link${isActive ? ' active' : ''}`}
            >
              <item.icon
                size={18}
                style={{ color: isActive ? '#a78bfa' : undefined, flexShrink: 0 }}
              />
              <span>{item.name}</span>
              <span className="sidebar-dot" />
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="sidebar-logout">
          <LogOut size={18} style={{ flexShrink: 0 }} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
