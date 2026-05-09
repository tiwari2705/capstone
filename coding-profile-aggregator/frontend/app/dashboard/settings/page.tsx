'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { removeToken } from '@/lib/auth';
import { ShieldAlert, Trash2, CheckCircle, User } from '@/components/icons';

const COURSES = [
  'B.Tech CSE', 'B.Tech IT', 'B.Tech ECE', 'B.Tech EEE', 
  'B.Tech Mechanical', 'B.Tech Civil', 'B.Tech Chemical', 
  'BCA', 'MCA', 'M.Tech CSE', 'M.Tech IT', 'Other'
];

export default function SettingsPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [form, setForm] = useState({ name: '', course: '', section: '', email: '', registration_no: '' });
  
  // Deletion state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setForm({
          name: res.data.name || '',
          course: res.data.course || '',
          section: res.data.section || '',
          email: res.data.email || '',
          registration_no: res.data.registration_no || ''
        });
      } catch (err) {
        toast.error('Failed to load profile details');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/me', {
        name: form.name,
        course: form.course,
        section: form.section
      });
      toast.success('Profile updated successfully!');
    } catch (err) {
      const error = err as AxiosError<any>;
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!confirm('Are you sure you want to request account deletion? This action is irreversible.')) return;
    
    setDeleting(true);
    try {
      await api.post('/auth/send-delete-otp');
      toast.success('Deletion OTP sent to your email!');
      setOtpSent(true);
    } catch (err) {
      const error = err as AxiosError<any>;
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.delete('/auth/me', { data: { otp } });
      toast.success('Account deleted successfully. We are sorry to see you go!');
      removeToken();
      router.push('/login');
    } catch (err) {
      const error = err as AxiosError<any>;
      toast.error(error.response?.data?.error || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <User size={28} color="var(--accent-purple)" /> Profile Settings
      </h1>

      {/* Edit Details Section */}
      <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={20} color="var(--accent-green)" /> Edit Profile Details
        </h2>
        
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="form-input"
                required
              />
            </div>
            
            <div>
              <label className="form-label">Email Address (Read-only)</label>
              <input type="email" value={form.email} disabled className="form-input" style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>

            <div>
              <label className="form-label">Registration Number (Read-only)</label>
              <input type="text" value={form.registration_no} disabled className="form-input" style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>

            <div>
              <label className="form-label">Course</label>
              <select
                value={form.course}
                onChange={e => setForm(p => ({ ...p, course: e.target.value }))}
                className="form-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="" disabled>Select Course</option>
                {COURSES.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Section</label>
              <input
                type="text"
                value={form.section}
                onChange={e => setForm(p => ({ ...p, section: e.target.value }))}
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ minWidth: '150px', justifyContent: 'center' }}>
              {saving ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={20} /> Danger Zone
        </h2>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Deleting your account is a permanent action. All your coding profiles, daily submissions, stats, and personal data will be irrevocably erased from our servers.
        </p>

        {!otpSent ? (
          <button 
            onClick={handleRequestDeletion} 
            disabled={deleting}
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: deleting ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {deleting ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Trash2 size={18} />}
            Request Account Deletion
          </button>
        ) : (
          <form onSubmit={handleConfirmDeletion} style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 500 }}>
              ✓ An OTP has been sent to your email to confirm deletion.
            </p>
            <div style={{ marginBottom: '1rem', maxWidth: '300px' }}>
              <label className="form-label">Enter Deletion OTP</label>
              <input
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                maxLength={6}
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.2rem' }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="submit" 
                disabled={deleting || otp.length !== 6}
                className="btn"
                style={{ 
                  background: '#ef4444', 
                  color: '#fff', 
                  border: 'none',
                  flex: 1,
                  opacity: (deleting || otp.length !== 6) ? 0.7 : 1
                }}
              >
                {deleting ? 'Deleting...' : 'Confirm Deletion'}
              </button>
              <button 
                type="button" 
                onClick={() => { setOtpSent(false); setOtp(''); }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
