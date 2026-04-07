'use client';
import { TrendingUp } from '@/components/icons';

interface ContestRankingsProps {
  contestRankings: Record<string, { current: number; max: number; rank?: string | number }>;
}

export default function ContestRankingsCard({ contestRankings }: ContestRankingsProps) {
  const platforms = [
    { key: 'leetcode', name: 'LEETCODE', color: '#fbbf24' },
    { key: 'codeforces', name: 'CODEFORCES', color: '#3b82f6' },
    { key: 'codechef', name: 'CODECHEF', color: '#8b5cf6' },
  ];

  const availablePlatforms = platforms.filter(p => contestRankings[p.key]);

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <TrendingUp size={20} style={{ color: 'var(--accent-blue)' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Contest Rankings</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {availablePlatforms.map((platform) => {
          const ranking = contestRankings[platform.key];
          return (
            <div key={platform.key}>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                color: platform.color,
                letterSpacing: '0.05em',
                marginBottom: '0.5rem'
              }}>
                {platform.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
                  {ranking.current || 0}
                </span>
                {ranking.rank && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {ranking.rank}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                max: <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{ranking.max || 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      {availablePlatforms.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem 1rem',
          color: 'var(--text-muted)',
          fontSize: '0.9rem'
        }}>
          No contest rankings available yet
        </div>
      )}
    </div>
  );
}
