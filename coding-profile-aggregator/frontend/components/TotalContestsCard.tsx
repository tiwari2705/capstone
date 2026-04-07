'use client';
import { Trophy } from '@/components/icons';

interface Contest {
  platform: string;
  count: number;
  rating: number;
  rank?: string;
  ranking?: number;
  date?: string;
  name?: string;
}

interface TotalContestsCardProps {
  totalContests: number;
  contests: Contest[];
}

export default function TotalContestsCard({ totalContests, contests }: TotalContestsCardProps) {
  const platformColors: Record<string, string> = {
    leetcode: '#fbbf24',
    codeforces: '#3b82f6',
    codechef: '#8b5cf6',
  };

  const platformNames: Record<string, string> = {
    leetcode: 'LeetCode',
    codeforces: 'CodeForces',
    codechef: 'CodeChef',
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Trophy size={20} style={{ color: 'var(--accent-yellow)' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Total Contests</h3>
      </div>

      <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: '1.5rem' }}>
        {totalContests}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {contests.map((contest) => (
          <div key={contest.platform} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: 12, 
                height: 12, 
                borderRadius: 3, 
                background: platformColors[contest.platform] || '#6b7280' 
              }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {platformNames[contest.platform] || contest.platform}
              </span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
              {contest.count || 0}
            </span>
          </div>
        ))}
      </div>

      {contests.length > 0 && contests[0].rating && (
        <div style={{ 
          marginTop: '1rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          Latest: {contests[0].name || 'Recent Contest'} • Rank: {contests[0].ranking || 'N/A'}
        </div>
      )}
    </div>
  );
}
