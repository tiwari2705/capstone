'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Code2, Trophy, Target, RefreshCw, Loader2, Share2, BarChart3 } from '@/components/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import StatCard from '@/components/StatCard';
import PlatformCard from '@/components/PlatformCard';

const ProblemsBarChart = dynamic(
  () => import('@/components/Charts').then(m => m.ProblemsBarChart),
  { ssr: false, loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading chart...</div> }
);
const PerformanceRadar = dynamic(
  () => import('@/components/Charts').then(m => m.PerformanceRadar),
  { ssr: false, loading: () => <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading chart...</div> }
);

interface DashboardData {
  user: { name: string; email: string; course: string; section: string; registration_no: string };
  profiles: Array<{ platform: string; username: string; verified: boolean; profile_url?: string }>;
  stats: Record<string, {
    problems_solved: number; rating: number;
    easy_solved: number; medium_solved: number; hard_solved: number;
    submissions: number; last_updated: string;
  }>;
  totalProblems: number;
  score: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/profiles/refresh-stats', {});
      await fetchDashboard();
      toast.success('Stats refreshed!');
    } catch {
      toast.error('Failed to refresh stats');
    } finally {
      setRefreshing(false);
    }
  };

  const handleShare = () => {
    const identifier = data?.user.email || data?.user.registration_no;
    navigator.clipboard.writeText(`${window.location.origin}/profile/${identifier}`);
    toast.success('Profile link copied!');
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );

  if (!data) return null;

  const barData = [
    { platform: 'LeetCode', problems: data.stats.leetcode?.problems_solved || 0 },
    { platform: 'Codeforces', problems: data.stats.codeforces?.problems_solved || 0 },
    { platform: 'GFG', problems: data.stats.geeksforgeeks?.problems_solved || 0 },
  ];
  const radarData = [
    { subject: 'Solved', value: Math.min((data.totalProblems / 500) * 100, 100) },
    { subject: 'Rating', value: Math.min(((data.stats.codeforces?.rating || 0) / 2000) * 100, 100) },
    { subject: 'Consistency', value: 85 },
    { subject: 'Speed', value: 70 },
    { subject: 'Accuracy', value: 90 },
  ];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
              Welcome back, {data.user.name.split(' ')[0]}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>{data.user.course}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>Section {data.user.section}</span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span>{data.user.registration_no}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button onClick={handleShare} className="btn btn-ghost">
              <Share2 size={16} /> Share Profile
            </button>
            <button onClick={handleRefresh} disabled={refreshing} className="btn btn-primary">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh Stats'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="container" style={{ paddingTop: '2rem' }}>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            title="Total Problems"
            value={data.totalProblems}
            icon={<Code2 size={24} style={{ color: 'var(--accent-purple)' }} />}
            color="purple"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="CodeRank Score"
            value={data.score.toFixed(1)}
            icon={<Trophy size={24} style={{ color: 'var(--accent-blue)' }} />}
            color="blue"
          />
          <StatCard
            title="Total Active Days"
            value={data.stats.leetcode?.active_days || 0}
            icon={<Target size={24} style={{ color: 'var(--accent-yellow)' }} />}
            color="yellow"
            subtitle="LeetCode Consistency"
          />
          <StatCard
            title="Max Rating"
            value={data.stats.codeforces?.rating || 0}
            icon={<BarChart3 size={24} style={{ color: 'var(--accent-cyan)' }} />}
            color="cyan"
            subtitle="Codeforces Profile"
          />
        </div>

        {/* Platform Ecosystem */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">
            <span className="section-title-bar" />
            Platform Ecosystem
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['leetcode', 'codeforces', 'geeksforgeeks', 'hackerrank'].map(platform => {
              const profile = data.profiles.find(p => p.platform === platform);
              return (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  username={profile?.username}
                  verified={profile?.verified}
                  stats={data.stats[platform]}
                  profileUrl={profile?.profile_url}
                />
              );
            })}
          </div>
        </div>

        {/* Distribution Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="section-title">
              <span className="section-title-bar" />
              Problem Distribution
            </h3>
            <ProblemsBarChart data={barData} />
          </div>
          <div className="glass-card p-6">
            <h3 className="section-title">
              <span className="section-title-bar" />
              Performance Radar
            </h3>
            <PerformanceRadar data={radarData} />
          </div>
        </div>

      </div>
    </div>

  );
}
