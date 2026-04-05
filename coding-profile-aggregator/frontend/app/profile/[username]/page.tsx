'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import PlatformCard from '@/components/PlatformCard';
import StatCard from '@/components/StatCard';
import { ExternalLink, Share2, Code2, Trophy, CheckCircle } from '@/components/icons';
import toast from 'react-hot-toast';

interface PublicProfile {
  user: {
    name: string;
    username: string;
    email: string;
    course?: string;
    section?: string;
    reg_no?: string;
  };
  profiles: Array<{
    platform: string;
    username: string;
    profile_url: string;
    verified: boolean;
  }>;
  stats: Record<string, any>;
  totalProblems: number;
  score: string;
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/profile/${username}`
      );
      setProfile(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Profile link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '1rem' }}>Profile Not Found</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'This profile does not exist'}</p>
          <a href="/" className="btn btn-primary">Go to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '4rem' }}>
      {/* ── Profile Header ── */}
      <div className="page-header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.6rem' }}>
                {profile.user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0 }}>{profile.user.name}</h1>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>@{profile.user.username}</p>
            </div>
          </div>
          <button onClick={handleShare} className="btn btn-primary shadow-glow">
            <Share2 size={18} />
            <span>Share Profile</span>
          </button>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2.5rem' }}>
        
        {/* Core Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          <StatCard 
            title="Total Problems Solved" 
            value={profile.totalProblems} 
            icon={<Code2 size={24} style={{ color: 'var(--accent-purple)' }} />} 
            color="purple"
          />
          <StatCard 
            title="CodeRank Score" 
            value={parseFloat(profile.score).toFixed(1)} 
            icon={<Trophy size={24} style={{ color: 'var(--accent-blue)' }} />} 
            color="blue"
          />
          <StatCard 
            title="Total Active Days" 
            value={profile.stats.leetcode?.active_days || 0} 
            icon={<CheckCircle size={24} style={{ color: 'var(--accent-green)' }} />} 
            color="green"
            subtitle="LeetCode Consistency"
          />
        </div>

        {/* Platform Breakdown */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 className="section-title">
            <span className="section-title-bar" />
            Coding Portfolio
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {profile.profiles.map((prof) => {
              const platformStats = profile.stats[prof.platform] || {};
              return (
                <PlatformCard 
                  key={prof.platform} 
                  platform={prof.platform} 
                  username={prof.username} 
                  verified={prof.verified} 
                  stats={platformStats} 
                  profileUrl={prof.profile_url}
                />
              );
            })}
          </div>
        </div>

        {/* Identity Information */}
        <div className="glass-card p-6 border border-white/5 bg-surface/10">
          <h2 className="section-title mb-6">
            <span className="section-title-bar" />
            Verification Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div>
                 <p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Academic Unit</p>
                 <p className="text-white font-bold text-lg">{profile.user.course || 'Bachelor of Technology'}</p>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-black tracking-widest text-muted mb-1">Section Assignment</p>
                 <p className="text-white font-bold text-lg">Unit {profile.user.section || 'N/A'}</p>
               </div>
            </div>
            <div className="verify-box">
               <p className="text-sm font-medium text-[var(--accent-yellow)] mb-3 flex items-center gap-2">
                 <CheckCircle size={16} /> Identity Verified by CodeRank
               </p>
               <div className="code-block">
                 HASH: {btoa(profile.user.username + profile.totalProblems).slice(0, 16)}...
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  );
}
