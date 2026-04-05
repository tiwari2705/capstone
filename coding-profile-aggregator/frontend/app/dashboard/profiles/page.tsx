'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type Profile = {
  id:                number;
  platform:          string;
  username:          string;
  verified:          boolean;
  verification_code: string;
  created_at:        string;
};

const platformLabels: Record<string, { label: string; color: string; url: (u: string) => string }> = {
  leetcode:      { label: 'LeetCode',      color: '#eab308', url: u => `https://leetcode.com/${u}` },
  codeforces:    { label: 'Codeforces',    color: '#3b82f6', url: u => `https://codeforces.com/profile/${u}` },
  geeksforgeeks: { label: 'GeeksforGeeks', color: '#10b981', url: u => `https://www.geeksforgeeks.org/user/${u}` },
  hackerrank:    { label: 'HackerRank',    color: '#10b981', url: u => `https://www.hackerrank.com/profile/${u}` },
};

export default function ProfilesPage() {
  const [profiles,  setProfiles]  = useState<Profile[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ platform: 'leetcode', username: '' });
  const [submitting,setSubmitting]= useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [refreshing,setRefreshing]= useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [editing,   setEditing]   = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');

  const fetchProfiles = async () => {
    try {
      const res = await api.get('/profiles/user-profiles');
      setProfiles(res.data);
    } catch {
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchProfiles(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/profiles/add-profile', form);
      toast.success(res.data.message || 'Profile added!');
      setShowForm(false);
      setForm({ platform: 'leetcode', username: '' });
      fetchProfiles();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (platform: string) => {
    setVerifying(platform);
    try {
      const res = await api.post('/profiles/verify-profile', { platform });
      toast.success(res.data.message || 'Profile verified!');
      fetchProfiles();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const handleRefresh = async (platform: string) => {
    setRefreshing(platform);
    try {
      await api.post('/profiles/refresh-stats', { platform });
      toast.success('Stats refreshed!');
    } catch {
      toast.error('Failed to refresh stats');
    } finally {
      setRefreshing(null);
    }
  };

  const handleDelete = async (platform: string) => {
    if (!confirm(`Delete your ${platformLabels[platform]?.label} profile? This will remove all stats.`)) return;
    setDeleting(platform);
    try {
      await api.delete('/profiles/delete-profile', { data: { platform } });
      toast.success('Profile deleted');
      fetchProfiles();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleEditSave = async (platform: string) => {
    if (!editUsername.trim()) return toast.error('Username cannot be empty');
    try {
      const res = await api.patch('/profiles/update-username', { platform, username: editUsername });
      toast.success(res.data.message || 'Username updated!');
      setEditing(null);
      fetchProfiles();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const addedPlatforms    = profiles.map(p => p.platform);
  const availablePlatforms = ['leetcode', 'codeforces', 'geeksforgeeks', 'hackerrank'].filter(p => !addedPlatforms.includes(p));

  const handleShowForm = () => {
    if (availablePlatforms.length > 0) setForm({ platform: availablePlatforms[0], username: '' });
    setShowForm(true);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ padding: '1.75rem', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>My Profiles</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Connect and verify your coding platform profiles</p>
        </div>
        {availablePlatforms.length > 0 && (
          <button onClick={handleShowForm} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            + Add Profile
          </button>
        )}
      </div>

      {/* ── Add Form ── */}
      {showForm && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Add New Profile</h2>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={form.platform}
              onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
              className="form-input"
              style={{ width: 'auto', paddingRight: '2rem' }}
            >
              {availablePlatforms.map(p => (
                <option key={p} value={p}>{platformLabels[p]?.label || p}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Your username on that platform"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              required
              className="form-input"
              style={{ flex: 1, minWidth: 200 }}
            />
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? '...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* ── Profiles list ── */}
      {profiles.length === 0 ? (
        <div className="glass-card empty-state">
          <p>No profiles added yet</p>
          <small>Add your LeetCode, Codeforces, or GeeksforGeeks profile to get started</small>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {profiles.map(profile => {
            const cfg       = platformLabels[profile.platform];
            const isEditing = editing === profile.platform;

            return (
              <div key={profile.id} className="glass-card" style={{ padding: '1.25rem' }}>
                {/* Profile header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    {/* Platform name + verified badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: cfg?.color || '#9ca3af' }}>
                        {cfg?.label || profile.platform}
                      </span>
                      {profile.verified ? (
                        <span className="badge badge-success">✓ Verified</span>
                      ) : (
                        <span className="badge badge-error">✗ Unverified</span>
                      )}
                    </div>

                    {/* Username / edit row */}
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={e => setEditUsername(e.target.value)}
                          className="form-input"
                          style={{ maxWidth: 240 }}
                          placeholder="New username"
                        />
                        <button onClick={() => handleEditSave(profile.platform)} className="btn btn-success" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>Save</button>
                        <button onClick={() => { setEditing(null); setEditUsername(''); }} className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>@{profile.username}</span>
                        <a
                          href={cfg?.url(profile.username)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
                        >🔗</a>
                        {!profile.verified && (
                          <button
                            onClick={() => { setEditing(profile.platform); setEditUsername(profile.username); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-purple)', fontSize: '0.8rem', textDecoration: 'underline' }}
                          >
                            Edit username
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right-side buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {!profile.verified && (
                      <button
                        onClick={() => handleVerify(profile.platform)}
                        disabled={verifying === profile.platform}
                        className="btn btn-success"
                        style={{ fontSize: '0.82rem' }}
                      >
                        {verifying === profile.platform ? 'Verifying...' : '✓ Verify'}
                      </button>
                    )}
                    {profile.verified && (
                      <button
                        onClick={() => handleRefresh(profile.platform)}
                        disabled={refreshing === profile.platform}
                        className="btn btn-ghost"
                        style={{ fontSize: '0.82rem' }}
                      >
                        {refreshing === profile.platform ? 'Refreshing...' : '↻ Refresh'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(profile.platform)}
                      disabled={deleting === profile.platform}
                      className="btn btn-danger"
                      style={{ fontSize: '0.82rem' }}
                    >
                      {deleting === profile.platform ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>

                {/* Verification code box */}
                {!profile.verified && (
                  <div className="verify-box">
                    <p style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                      Verification Required
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      Add this code to your{' '}
                      <span style={{ color: cfg?.color, fontWeight: 600 }}>{cfg?.label}</span>{' '}
                      {profile.platform === 'hackerrank'
                        ? <>profile <strong style={{ color: 'var(--text-primary)' }}>About</strong> section (Edit Profile → About), then click Verify:</>
                        : profile.platform === 'codeforces'
                          ? <>profile <strong style={{ color: 'var(--text-primary)' }}>Organization</strong> field, then click Verify:</>
                          : <>profile bio/about section, then click Verify:</>
                      }
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="code-block" style={{ flex: 1 }}>
                        {profile.verification_code}
                      </div>
                      <button
                        onClick={() => copyCode(profile.verification_code)}
                        className="btn btn-ghost"
                        style={{ flexShrink: 0, padding: '0.5rem 0.75rem' }}
                        title="Copy code"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── How it works ── */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '0.85rem', fontSize: '0.95rem' }}>
          How Verification Works
        </h3>
        <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {[
            'Add your profile with your platform username',
            'Copy the unique verification code shown',
            'Paste it in your profile bio/about section on that platform',
            'Click "Verify" — we\'ll check your profile and confirm ownership',
            'Once verified, your stats will be fetched automatically every 6 hours',
            'Made a mistake? Click "Edit username" or "Delete" to fix it',
          ].map((step, i) => (
            <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
