'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatsCard from '@/components/admin/StatsCard';
import { User, CheckCircle, Code, BarChart3, RefreshCw } from '@/components/icons';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  totalVerifiedProfiles: number;
  totalProblemsSolved: number;
  platformUsage: Array<{
    platform: string;
    user_count: number;
    total_problems: number;
  }>;
  courseDistribution: Array<{
    course: string;
    count: number;
  }>;
  sectionDistribution: Array<{
    section: string;
    count: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await api.post('/admin/sync-stats');
      toast.success('Stats sync started! Refresh in a minute to see updated data.');
      setTimeout(() => { fetchStats(); setSyncing(false); }, 30000);
    } catch (err: any) {
      toast.error('Failed to trigger sync: ' + (err.response?.data?.error || err.message));
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 rounded w-64" style={{ background: 'var(--bg-input)' }}></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded glass-card"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 md:p-6 lg:p-8 min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Overview of all users and platform statistics</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: syncing ? 0.7 : 1 }}
          >
            <RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync Stats Now'}
          </button>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<User size={24} style={{ color: '#a78bfa' }} />}
            subtitle="Registered students"
            color="purple"
          />
          <StatsCard
            title="Verified Profiles"
            value={stats.totalVerifiedProfiles}
            icon={<CheckCircle size={24} style={{ color: '#eab308' }} />}
            subtitle="Connected platforms"
            color="yellow"
          />
          <StatsCard
            title="Problems Solved"
            value={stats.totalProblemsSolved}
            icon={<Code size={24} style={{ color: '#06b6d4' }} />}
            subtitle="Across all platforms"
            color="cyan"
          />
          <StatsCard
            title="Active Platforms"
            value={stats.platformUsage.length}
            icon={<BarChart3 size={24} style={{ color: '#60a5fa' }} />}
            subtitle="Integrated platforms"
            color="blue"
          />
        </div>

        {/* Platform & Course Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 border border-white/5 bg-surface/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title" style={{ margin: 0 }}>
                <span className="section-title-bar" />
                Platform Ecosystem
              </h2>
              <span className="badge badge-info">{stats.platformUsage.length} Active Platforms</span>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th className="text-right">Accounts Linked</th>
                    <th className="text-right">Total Solves</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.platformUsage.map((platform) => {
                    const pName = platform.platform.toLowerCase();
                    const isLeet = pName.includes('leet');
                    const isCF = pName.includes('codef');
                    const isGFG = pName.includes('geeks');
                    const isHR = pName.includes('hacker');

                    let pColor = 'var(--grad-brand)';
                    if (isLeet) pColor = 'linear-gradient(135deg, #ffa116 0%, #ff6a00 100%)';
                    if (isCF) pColor = 'linear-gradient(135deg, #1f8ee7 0%, #1764a3 100%)';
                    if (isGFG) pColor = 'linear-gradient(135deg, #2f8d46 0%, #1e5a2d 100%)';
                    if (isHR) pColor = 'linear-gradient(135deg, #2ec866 0%, #1b8a45 100%)';

                    return (
                      <tr key={platform.platform} className="group transition-colors">
                        <td>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg transition-transform group-hover:scale-110" style={{ background: pColor }}>
                              {platform.platform.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-bold capitalize text-base group-hover:text-accent-purple transition-colors">{platform.platform}</p>
                              <p className="text-[10px] uppercase font-black tracking-widest text-muted">Platform Integrations</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-white group-hover:text-accent-blue transition-colors">{platform.user_count}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest text-muted">Active Links</span>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-white group-hover:text-accent-green transition-colors">{platform.total_problems}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest text-muted">Solves Recorded</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card p-6 border border-white/5 bg-surface/10">
            <h2 className="section-title mb-6">
              <span className="section-title-bar" />
              Course Popularity
            </h2>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th className="text-right">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.courseDistribution.map((course) => {
                    const percentage = Math.round((course.count / stats.totalUsers) * 100);
                    return (
                      <tr key={course.course} className="group cursor-pointer transition-colors">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface/30 border border-white/10 flex items-center justify-center text-[10px] font-black text-accent-purple group-hover:bg-grad-brand group-hover:text-white transition-all shadow-sm">
                              {course.course.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm capitalize group-hover:text-accent-purple transition-colors">{course.course}</p>
                              <p className="text-[10px] uppercase tracking-tighter text-muted font-bold">Academic Program</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="flex flex-col items-end">
                              <div className="flex items-center gap-2">
                                  <span className="text-lg font-black text-white group-hover:text-accent-purple transition-colors">{percentage}%</span>
                                  <span className="text-[10px] text-muted font-bold">({course.count})</span>
                              </div>
                              <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mt-1 border border-white/5">
                                  <div className="h-full bg-grad-brand" style={{ width: `${percentage}%` }}></div>
                              </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section Distribution */}
        <div className="glass-card p-6 border border-white/5 bg-surface/10">
          <div className="flex items-center justify-between mb-6">
              <h2 className="section-title" style={{ margin: 0 }}>
                  <span className="section-title-bar" />
                  Section Insights
              </h2>
              <span className="badge badge-purple">{stats.sectionDistribution.length} Sections</span>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th className="hidden sm:table-cell">Occupancy Density</th>
                  <th className="text-right">Student Volume</th>
                </tr>
              </thead>
              <tbody>
                {stats.sectionDistribution.map((section) => {
                  const density = Math.min(100, (section.count / stats.totalUsers) * 100 * 5);
                  return (
                    <tr key={section.section} className="group transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent-purple/5 border border-accent-purple/20 flex items-center justify-center font-black text-white group-hover:bg-grad-brand group-hover:border-transparent transition-all shadow-glow-sm">
                            {section.section}
                          </div>
                          <div>
                              <p className="text-white font-bold text-sm group-hover:text-accent-purple transition-colors">Unit {section.section}</p>
                              <p className="text-[10px] uppercase font-bold text-muted tracking-tighter">Academic Group</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <div className="flex items-center gap-4 max-w-xs">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-grad-brand transition-all duration-1000" style={{ width: `${density}%` }}></div>
                          </div>
                          <span className="text-[10px] font-black text-muted">{Math.round(density)}%</span>
                        </div>
                      </td>
                      <td className="text-right">
                          <div className="flex flex-col items-end">
                              <span className="text-xl font-black text-white group-hover:text-accent-blue transition-colors">{section.count}</span>
                              <span className="text-[10px] uppercase font-black tracking-widest text-muted">Students</span>
                          </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
