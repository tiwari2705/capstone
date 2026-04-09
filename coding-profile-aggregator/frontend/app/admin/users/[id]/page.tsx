'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import PlatformCard from '@/components/PlatformCard';
import StatCard from '@/components/StatCard';
import RankingCard from '@/components/RankingCard';
import { ArrowLeft, ExternalLink, Code2, Trophy, CheckCircle, Target } from '@/components/icons';
import toast from 'react-hot-toast';

interface UserProfile {
  user: {
    id: number;
    name: string;
    email: string;
    username?: string;
    registration_no?: string;
    course?: string;
    section?: string;
    role: string;
    created_at: string;
  };
  profiles: Array<{
    id: number;
    platform: string;
    username: string;
    profile_url: string;
    verified: boolean;
  }>;
  stats: Record<string, any>;
  totalProblems: number;
  score: string;
  rankings?: {
    overall: { rank: number; total: number };
    course: { rank: number; total: number; name: string };
    section: { rank: number; total: number; name: string };
  };
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [params.id]);

  const fetchUserProfile = async () => {
    try {
      const { data } = await api.get(`/admin/users/${params.id}`);
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-[#0B0F19] min-h-screen">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-8 bg-[#0B0F19] min-h-screen">
        <p className="text-gray-400">User not found</p>
      </div>
    );
  }

  const { user, profiles, stats, totalProblems, score, rankings } = profile;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* ── Top Bar ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Back to Fleet</span>
        </button>
        <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/profile/${user.username || user.registration_no || user.email}`)}
              className="btn btn-primary"
            >
              <ExternalLink size={16} />
              View Dashboard
            </button>
            <span className="text-[10px] uppercase font-black tracking-widest text-muted">Viewing Mode</span>
            <span className="badge badge-purple">Student Audit</span>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2rem' }}>
        {/* User Identity Header */}
        <div className="glass-card p-6 md:p-8 mb-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-grad-brand opacity-[0.03] blur-3xl -mr-20 -mt-20 rounded-full group-hover:opacity-[0.07] transition-opacity"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            <div className="w-24 h-24 rounded-2xl bg-grad-brand flex items-center justify-center shadow-glow flex-shrink-0">
               <span className="text-white font-black text-4xl">
                 {user.name.charAt(0).toUpperCase()}
               </span>
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
               <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                 <h1 className="text-3xl font-black text-white truncate">{user.name}</h1>
                 <span className="badge badge-info self-center md:self-auto">{user.role}</span>
               </div>
               
               <p className="text-lg text-muted mb-6 flex items-center justify-center md:justify-start gap-2">
                 <span className="font-medium text-white/70">{user.email}</span>
                 <span className="w-1 h-1 rounded-full bg-white/20"></span>
                 <span>ID: #{user.id.toString().padStart(4, '0')}</span>
               </p>

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-6 border-t border-white/5">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-1">Registration</p>
                    <p className="text-white font-bold">{user.registration_no || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-1">Username</p>
                    <p className="text-white font-bold">@{user.username || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-1">Program</p>
                    <p className="text-white font-bold">{user.course || 'Bachelor of Technology'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted mb-1">Section</p>
                    <p className="text-white font-bold">{user.section || 'General'}</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Rankings Card - Only show if rankings data exists */}
        {rankings && (
          <div style={{ marginBottom: '2.5rem' }}>
            <RankingCard rankings={rankings} />
          </div>
        )}

        {/* Audit Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            title="Total Problems"
            value={totalProblems}
            icon={<Code2 size={24} style={{ color: 'var(--accent-purple)' }} />}
            color="purple"
          />
          <StatCard
            title="CodeRank Score"
            value={parseFloat(score).toFixed(1)}
            icon={<Trophy size={24} style={{ color: 'var(--accent-blue)' }} />}
            color="blue"
          />
          <StatCard
            title="Total Active Days"
            value={stats.leetcode?.active_days || 0}
            icon={<Target size={24} style={{ color: 'var(--accent-yellow)' }} />}
            color="yellow"
            subtitle="Consistency Audit"
          />
          <StatCard
            title="Verified Links"
            value={profiles.filter(p => p.verified).length}
            icon={<CheckCircle size={24} style={{ color: 'var(--accent-green)' }} />}
            color="green"
            subtitle={`${profiles.length} total integrations`}
          />
        </div>

        {/* Section Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">
            <span className="section-title-bar" />
            Integrations & Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {['leetcode', 'codeforces', 'geeksforgeeks', 'hackerrank', 'codechef'].map(platform => {
              const p = profiles.find(pr => pr.platform === platform);
              const pStats = stats[platform] || {};
              return (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  username={p?.username}
                  verified={p?.verified}
                  stats={pStats}
                  profileUrl={p?.profile_url}
                />
              );
            })}
          </div>
        </div>

        {/* Integration Map Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
               Audit Integration Map
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source Platform</th>
                  <th>Identity / Handle</th>
                  <th>Integrity Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="group transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface/30 flex items-center justify-center font-black text-xs text-white">
                           {p.platform.charAt(0).toUpperCase()}
                        </div>
                        <span className="capitalize font-bold text-white group-hover:text-accent-purple transition-colors">{p.platform}</span>
                      </div>
                    </td>
                    <td>
                       <span className="text-muted font-medium">@{p.username}</span>
                    </td>
                    <td>
                       {p.verified ? (
                         <span className="badge badge-success">Verified Hash</span>
                       ) : (
                         <span className="badge badge-error">Pending Sync</span>
                       )}
                    </td>
                    <td className="text-right">
                       <a
                          href={p.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost py-1.5 px-3 h-auto text-xs"
                        >
                          Verify Link <ExternalLink size={12} />
                        </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
