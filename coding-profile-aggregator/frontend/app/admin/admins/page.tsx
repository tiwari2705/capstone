'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { User, ShieldAlert } from '@/components/icons';

interface Admin {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export default function AdminsManagementPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // New admin form state
  const [adding, setAdding] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    checkRoleAndFetch();
  }, []);

  const checkRoleAndFetch = async () => {
    try {
      // First verify role explicitly just in case layout passed it through
      const { data: user } = await api.get('/auth/me');
      if (user.role !== 'superadmin') {
        toast.error('Only superadmins can access this page.');
        router.push('/admin');
        return;
      }
      setIsSuperAdmin(true);

      // Fetch admins
      const { data: adminsList } = await api.get('/admin/admins');
      setAdmins(adminsList);
    } catch (err: any) {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return toast.error('Fields required');
    setAdding(true);
    try {
      await api.post('/admin/create-admin', {
        username: newUsername,
        password: newPassword
      });
      toast.success('Admin created successfully!');
      setNewUsername('');
      setNewPassword('');
      // Refresh list
      checkRoleAndFetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Manage Admins</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>administrator controls for creating sub-admins.</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Col: Create Admin Form */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center border border-accent-purple/20">
                  <ShieldAlert size={20} className="text-accent-purple shadow-glow" />
                </div>
                <h2 className="section-title" style={{ margin: 0 }}>
                  <span className="section-title-bar" />
                  Add Admin
                </h2>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="form-input"
                    placeholder="admin_username"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={adding}
                    className="btn btn-primary w-full justify-center"
                  >
                    {adding ? 'Creating...' : '+ Create Admin Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Admin List */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="section-title" style={{ margin: 0 }}>
                  <span className="section-title-bar" />
                  Admin Registry
                </h2>
                <span className="badge badge-info">{admins.length} Admins</span>
              </div>

              <div className="space-y-3">
                {admins.length === 0 ? (
                  <div className="empty-state">
                    <p>No extra admins found.</p>
                  </div>
                ) : (
                  admins.map((adm) => (
                    <div key={adm.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl transition-all border border-white/5 hover:border-accent-purple/30 hover:bg-white/5 bg-surface/20 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${adm.role === 'superadmin' ? 'bg-grad-brand border-indigo-500/30' : 'bg-surface border-white/10'}`}>
                          <User size={18} className={adm.role === 'superadmin' ? 'text-white' : 'text-accent-blue'} />
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-accent-purple transition-colors">{adm.username}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest text-muted">Registry ID: #{adm.id.toString().padStart(4, '0')}</p>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 flex flex-col items-end gap-1">
                        <span className={`badge ${adm.role === 'superadmin' ? 'badge-info' : 'badge-purple'} scale-90 origin-right`}>
                          {adm.role === 'superadmin' ? 'admin' : 'Staff Admin'}
                        </span>
                        <p className="text-[10px] text-muted font-medium">Joined {new Date(adm.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
