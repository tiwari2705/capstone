'use client';
import Link from 'next/link';
import { Code2, Trophy, BarChart3, Shield, ArrowRight, Zap } from '@/components/icons';

const features = [
  {
    icon: <Shield size={28} style={{ color: 'var(--accent-indigo)' }} />,
    title: 'Profile Verification',
    desc:  'Prove ownership of your coding profiles with a unique code system.',
  },
  {
    icon: <BarChart3 size={28} style={{ color: 'var(--accent-blue)' }} />,
    title: 'Unified Dashboard',
    desc:  'See all your stats — problems solved, ratings, and scores — in one view.',
  },
  {
    icon: <Trophy size={28} style={{ color: 'var(--accent-yellow)' }} />,
    title: 'Live Leaderboard',
    desc:  'Compete with peers. Filter by course and section. Rise through the ranks.',
  },
];

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ── Nav ── */}
      <nav className="topnav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Code2 size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, background: 'linear-gradient(135deg,#fff,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CodeQuest
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Link href="/login"  className="btn btn-ghost"   style={{ fontSize: '0.875rem' }}>Login</Link>
          <Link href="/signup" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>Get Started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: 'clamp(3rem,8vw,6rem) 1.5rem 4rem' }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.35rem 0.9rem', borderRadius: 999,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc', fontSize: '0.82rem', fontWeight: 600,
            marginBottom: '1.5rem',
          }}
        >
          <Zap size={13} /> Track all your coding profiles in one place
        </div>

        <h1 style={{ marginBottom: '1.25rem', lineHeight: 1.1 }}>
          <span style={{ background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            One Dashboard,
          </span>
          <br />
          <span style={{ color: '#fff' }}>All Your Code</span>
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(1rem,2vw,1.15rem)', maxWidth: 560, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Aggregate your LeetCode, Codeforces, GeeksforGeeks and HackerRank stats.
          Compete on the leaderboard. Showcase your skills.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
            Start Tracking <ArrowRight size={17} />
          </Link>
          <Link href="/leaderboard" className="btn btn-ghost" style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}>
            View Leaderboard <Trophy size={17} />
          </Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem 5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.25rem' }}>
        {features.map((f, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{ marginBottom: '1rem', width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {f.icon}
            </div>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '0.5rem' }}>{f.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Supported Platforms ── */}
      <section style={{ textAlign: 'center', padding: '0 1.5rem 5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>
          Supported Platforms
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'LeetCode',      color: '#eab308' },
            { label: 'Codeforces',    color: '#3b82f6' },
            { label: 'GeeksforGeeks', color: '#10b981' },
            { label: 'HackerRank',    color: '#10b981' },
          ].map(p => (
            <span
              key={p.label}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 999,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                color: p.color, fontWeight: 600, fontSize: '0.875rem',
              }}
            >
              {p.label}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
