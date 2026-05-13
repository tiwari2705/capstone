'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Trophy, Medal, Code2, Filter, ChevronUp, ChevronDown, ArrowLeft } from '@/components/icons';
import api from '@/lib/api';
import { getToken } from '@/lib/auth';

type LeaderboardEntry = {
  rank:                number;
  id:                  number;
  name:                string;
  course:              string;
  section:             string;
  registration_no:              string;
  leetcode_problems:   number;
  codeforces_rating:   number;
  codeforces_problems: number;
  gfg_problems:        number;
  gfg_score:           number;
  total_problems:      number;
  score:               number;
  linked_platforms:    string[];
};

const platformColors: Record<string, string> = {
  leetcode:      'badge badge-warning',
  codeforces:    'badge badge-info',
  geeksforgeeks: 'badge badge-success',
};
const platformShort: Record<string, string> = {
  leetcode: 'LC', codeforces: 'CF', geeksforgeeks: 'GFG',
};

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={18} style={{ color: '#eab308' }} />;
  if (rank === 2) return <Medal  size={18} style={{ color: '#cbd5e1' }} />;
  if (rank === 3) return <Medal  size={18} style={{ color: '#b45309' }} />;
  return <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'monospace' }}>{rank}</span>;
}

export default function LeaderboardPage() {
  const [data,          setData]          = useState<LeaderboardEntry[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [sort,          setSort]          = useState('score');
  const [order,         setOrder]         = useState<'asc' | 'desc'>('desc');
  const [course,        setCourse]        = useState('');
  const [section,       setSection]       = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [mounted,       setMounted]       = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, order, limit: '100' });
      if (course)  params.set('course', course);
      if (section) params.set('section', section);
      const res = await api.get(`/leaderboard?${params}`);
      setData(res.data.leaderboard);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [sort, order, course, section]);

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    setIsLoggedIn(!!token);
    
    if (token) {
      api.get('/auth/me').then(r => setCurrentUserId(r.data.id)).catch(() => {});
    }
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const toggleSort = (col: string) => {
    if (sort === col) setOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSort(col); setOrder('desc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return null;
    return order === 'desc'
      ? <ChevronDown size={13} style={{ color: 'var(--accent-purple)' }} />
      : <ChevronUp   size={13} style={{ color: 'var(--accent-purple)' }} />;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ── Top Nav ── */}
      <nav className="topnav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Code2 size={16} color="#fff" />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, background: 'linear-gradient(135deg,#fff,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CodeQuest
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          {mounted && (
            isLoggedIn ? (
              <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
                <ArrowLeft size={15} /> Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login"  className="btn btn-ghost"    style={{ fontSize: '0.875rem' }}>Login</Link>
                <Link href="/signup" className="btn btn-primary"  style={{ fontSize: '0.875rem' }}>Sign Up</Link>
              </>
            )
          )}
        </div>
      </nav>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Trophy size={28} style={{ color: '#eab308' }} />
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Leaderboard</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Rankings based on combined coding activity across all platforms
          </p>
        </div>

        {/* Score formula */}
        <div className="glass-card" style={{ padding: '0.75rem 1.1rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Score formula:</strong>{' '}
          (LeetCode problems × 1) + (Codeforces rating × 0.1) + (GFG problems × 1) + (HackerRank problems × 1) + (CodeChef rating × 0.1)
        </div>

        {/* Filters */}
        <div className="glass-card" style={{ padding: '0.9rem 1.1rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Filter by course..."
            value={course}
            onChange={e => setCourse(e.target.value)}
            className="form-input"
            style={{ width: 180 }}
          />
          <input
            type="text"
            placeholder="Filter by section..."
            value={section}
            onChange={e => setSection(e.target.value)}
            className="form-input"
            style={{ width: 150 }}
          />
          {(course || section) && (
            <button onClick={() => { setCourse(''); setSection(''); }} className="btn btn-ghost" style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}>
              Clear
            </button>
          )}
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{data.length} users</span>
        </div>

        {/* Your Rank Banner - shown when logged in and user found */}
        {!loading && currentUserId && (() => {
          const me = data.find(e => e.id === currentUserId);
          if (!me) return null;
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              padding: '0.65rem 1rem',
              marginBottom: '1rem',
              background: 'rgba(139,92,246,0.07)',
              border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Trophy size={14} style={{ color: '#eab308' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Your Rank
                </span>
              </div>
              <div style={{ width: 1, height: 20, background: 'rgba(139,92,246,0.3)' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-purple)' }}>#{me.rank}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>out of {data.length}</span>
              </div>
              <div style={{ width: 1, height: 20, background: 'rgba(139,92,246,0.3)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{me.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{me.course} · Section {me.section}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{Number(me.score).toFixed(1)}</span>
              </div>
            </div>
          );
        })()}

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <div className="spinner" />
          </div>
        ) : data.length === 0 ? (
          <div className="glass-card empty-state">
            <p>No users found. Be the first to join!</p>
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>Rank</th>
                    <th>
                      <button onClick={() => toggleSort('name')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Name <SortIcon col="name" />
                      </button>
                    </th>
                    <th>Course / Section</th>
                    <th>
                      <button onClick={() => toggleSort('total_problems')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Problems <SortIcon col="total_problems" />
                      </button>
                    </th>
                    <th>LC / CF / GFG</th>
                    <th>
                      <button onClick={() => toggleSort('score')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Score <SortIcon col="score" />
                      </button>
                    </th>
                    <th>Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(entry => {
                    const isMe = currentUserId === entry.id;
                    return (
                      <tr
                        key={entry.id}
                        style={isMe ? { background: 'rgba(139,92,246,0.08)', borderLeft: '3px solid var(--accent-purple)' } : undefined}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}>
                            <RankCell rank={entry.rank} />
                          </div>
                        </td>
                        <td>
                          <p style={{ fontWeight: 600, color: isMe ? 'var(--accent-purple)' : '#fff', fontSize: '0.9rem' }}>
                            {entry.name}
                            {isMe && <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-purple)' }}>(you)</span>}
                          </p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{entry.registration_no}</p>
                        </td>
                        <td>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{entry.course || '—'}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{entry.section ? `Section ${entry.section}` : ''}</p>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#fff' }}>{entry.total_problems}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                            <span style={{ color: '#eab308', fontWeight: 600 }}>{entry.leetcode_problems}</span>
                            <span style={{ color: 'var(--border)' }}>/</span>
                            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{entry.codeforces_problems}</span>
                            <span style={{ color: 'var(--border)' }}>/</span>
                            <span style={{ color: '#34d399', fontWeight: 600 }}>{entry.gfg_problems}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: entry.rank <= 3 ? '#eab308' : '#fff' }}>
                            {Number(entry.score).toFixed(1)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {(entry.linked_platforms || []).map(p => (
                              <span key={p} className={platformColors[p] || 'badge'}>
                                {platformShort[p] || p}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
