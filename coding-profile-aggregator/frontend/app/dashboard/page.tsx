'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Share2, Info } from '@/components/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AwardsSection from '@/components/AwardsSection';
import ProblemsSolvedSection from '@/components/ProblemsSolvedSection';
import DSATopicAnalysis from '@/components/DSATopicAnalysis';
import TotalContestsCard from '@/components/TotalContestsCard';
import CompetitiveProgrammingCard from '@/components/CompetitiveProgrammingCard';
import ContestRankingsCard from '@/components/ContestRankingsCard';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import LanguageStatsSection from '@/components/LanguageStatsSection';
import Tooltip from '@/components/Tooltip';
import RankingCard from '@/components/RankingCard';

interface DashboardData {
  user: { name: string; email: string; course: string; section: string; registration_no: string };
  profiles: Array<{ platform: string; username: string; verified: boolean; profile_url?: string }>;
  stats: Record<string, {
    problems_solved: number; rating: number;
    easy_solved: number; medium_solved: number; hard_solved: number;
    submissions: number; last_updated: string;
    active_days?: number; badges?: number; rank?: string;
    extra_data?: any;
  }>;
  totalProblems: number;
  totalActiveDays: number;
  totalSubmissions: number;
  totalBadges: number;
  totalContests?: number;
  maxStreak: number;
  currentStreak: number;
  heatmapData: Array<{ date: string; count: number }>;
  allBadges?: Array<{ name: string; icon: string; platform: string; date?: string }>;
  contests?: Array<{ platform: string; count: number; rating: number; rank?: string; ranking?: number }>;
  contestRankings?: Record<string, { current: number; max: number; rank?: string | number }>;
  dsaTopics?: Array<{ name: string; count: number; color: string }>;
  recentContests?: Array<any>;
  rankings?: {
    overall: { rank: number; total: number };
    course: { rank: number; total: number; name: string };
    section: { rank: number; total: number; name: string };
  };
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

  // Use backend-calculated values
  const totalSubmissions = data.totalSubmissions || 0;
  const totalActiveDays = data.totalActiveDays || 0;
  const maxStreak = data.maxStreak || 0;
  const currentStreak = data.currentStreak || 0;
  const totalContests = data.totalContests || 0;

  // Check what data is available
  const hasContestData = totalContests > 0 && data.contests && data.contests.length > 0;
  const hasContestRankings = data.contestRankings && Object.keys(data.contestRankings).length > 0;
  const hasDSATopics = data.dsaTopics && data.dsaTopics.length > 0;
  const hasCompetitiveProgramming = (data.stats.codechef?.problems_solved || 0) + (data.stats.codeforces?.problems_solved || 0) > 0;
  const hasHeatmapData = data.heatmapData && data.heatmapData.length > 0;
  
  // Use badges from all platforms
  const allBadges = data.allBadges || [];

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%',
      paddingBottom: '4rem'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '2rem 0',
        marginBottom: '2rem'
      }}>
        <div style={{ 
          maxWidth: '1600px', 
          margin: '0 auto', 
          padding: '0 2rem',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '2rem', 
          flexWrap: 'wrap' 
        }}>
          <div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              color: '#fff', 
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              {data.user.name}
            </h1>
            <p style={{ 
              color: 'var(--text-muted)', 
              fontSize: '1rem', 
              display: 'flex', 
              gap: '0.75rem', 
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <span>{data.user.course}</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span>Section {data.user.section}</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span>{data.user.registration_no}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleShare} 
              className="btn btn-ghost"
              style={{ 
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              <Share2 size={18} /> Share
            </button>
            <button 
              onClick={handleRefresh} 
              disabled={refreshing} 
              className="btn btn-primary"
              style={{ 
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ 
        maxWidth: '1600px', 
        margin: '0 auto', 
        padding: '0 2rem',
        width: '100%'
      }}>

        {/* Rankings Card - Only show if rankings data exists */}
        {data.rankings && (
          <div style={{ marginBottom: '2.5rem' }}>
            <RankingCard rankings={data.rankings} />
          </div>
        )}

        {/* Top Stats Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem', 
          marginBottom: '2.5rem' 
        }}>
          {/* Total Questions */}
          <div className="glass-card" style={{ 
            padding: '2rem', 
            position: 'relative', 
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              right: 0, 
              width: '150px', 
              height: '150px',
              background: 'radial-gradient(circle, rgba(255, 107, 0, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <Tooltip 
                content="Total Questions are calculated using data from all platforms. Note that for AtCoder, no data is available." 
                size={18}
              />
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: 'var(--text-muted)', 
              marginBottom: '1rem', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Total Questions
            </div>
            <div style={{ 
              fontSize: '4rem', 
              fontWeight: 900, 
              color: 'white', 
              lineHeight: 1,
              background: 'linear-gradient(135deg, #fff 0%, #ff6b00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {data.totalProblems}
            </div>
          </div>

          {/* Total Active Days */}
          <div className="glass-card" style={{ 
            padding: '2rem', 
            position: 'relative', 
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              right: 0, 
              width: '150px', 
              height: '150px',
              background: 'radial-gradient(circle, rgba(57, 211, 83, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <Tooltip 
                content="Total Active Days shows the cumulative number of days you've been active across all coding platforms" 
                size={18}
              />
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: 'var(--text-muted)', 
              marginBottom: '1rem', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Total Active Days
            </div>
            <div style={{ 
              fontSize: '4rem', 
              fontWeight: 900, 
              color: 'white', 
              lineHeight: 1,
              background: 'linear-gradient(135deg, #fff 0%, #39d353 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {totalActiveDays}
            </div>
          </div>
        </div>

        {/* Activity Heatmap - Only show if data exists */}
        {hasHeatmapData && (
          <div style={{ marginBottom: '2.5rem' }}>
            <ActivityHeatmap 
              data={data.heatmapData}
              totalSubmissions={totalSubmissions}
              maxStreak={maxStreak}
              currentStreak={currentStreak}
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', 
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Total Contests - Only show if data exists */}
          {hasContestData && (
            <TotalContestsCard totalContests={totalContests} contests={data.contests!} />
          )}

          {/* Awards */}
          <AwardsSection badges={allBadges} />

          {/* Languages */}
          <LanguageStatsSection stats={data.stats} />

          {/* Problems Solved */}
          <ProblemsSolvedSection stats={data.stats} />

          {/* Competitive Programming - Only show if data exists */}
          {hasCompetitiveProgramming && (
            <CompetitiveProgrammingCard stats={data.stats} />
          )}

          {/* DSA Topic Analysis - Only show if data exists */}
          {hasDSATopics && (
            <DSATopicAnalysis topics={data.dsaTopics} />
          )}

          {/* Contest Rankings - Only show if data exists */}
          {hasContestRankings && (
            <ContestRankingsCard contestRankings={data.contestRankings!} />
          )}
        </div>

      </div>
    </div>
  );
}
