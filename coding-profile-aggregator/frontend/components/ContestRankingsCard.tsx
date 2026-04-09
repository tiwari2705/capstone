'use client';
import Tooltip from '@/components/Tooltip';

interface ContestRankingsProps {
  contestRankings: Record<string, { current: number; max: number; rank?: string | number }>;
}

export default function ContestRankingsCard({ contestRankings }: ContestRankingsProps) {
  const platforms = [
    { 
      key: 'leetcode', 
      name: 'LEETCODE', 
      color: '#ffa116',
      icon: (
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.15 }}>
          <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" fill="currentColor"/>
        </svg>
      )
    },
    { 
      key: 'codeforces', 
      name: 'CODEFORCES', 
      color: '#10b981',
      rankLabel: true
    },
    { 
      key: 'codechef', 
      name: 'CODECHEF', 
      color: '#8b5cf6',
      rankLabel: true
    },
  ];

  const availablePlatforms = platforms.filter(p => contestRankings[p.key]);

  if (availablePlatforms.length === 0) {
    return null;
  }

  return (
    <div className="glass-card" style={{ 
      padding: '1.5rem',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '2.5rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-purple)' }}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
          </svg>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Contest Rankings</h3>
        </div>
        <Tooltip 
          content="Your current and maximum contest ratings across different competitive programming platforms" 
          size={14}
        />
      </div>

      {/* Platforms */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem',
        position: 'relative',
        zIndex: 1
      }}>
        {availablePlatforms.map((platform) => {
          const ranking = contestRankings[platform.key];
          const current = Math.round(ranking.current || 0);
          const max = Math.round(ranking.max || 0);
          
          return (
            <div key={platform.key} style={{ position: 'relative' }}>
              {/* Background Icon */}
              {platform.icon && (
                <div style={{
                  position: 'absolute',
                  left: -20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: platform.color,
                  pointerEvents: 'none'
                }}>
                  {platform.icon}
                </div>
              )}

              {/* Platform Name */}
              <div style={{ 
                fontSize: '0.95rem', 
                fontWeight: 800, 
                color: 'rgba(255, 255, 255, 0.4)',
                letterSpacing: '0.1em',
                marginBottom: '1rem',
                textTransform: 'uppercase'
              }}>
                {platform.name}
              </div>

              {/* Rating Display */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                {/* Rank Badge (for Codeforces) */}
                {platform.rankLabel && ranking.rank && (
                  <div style={{
                    padding: '0.75rem 1.5rem',
                    background: `linear-gradient(135deg, ${platform.color}20 0%, ${platform.color}10 100%)`,
                    border: `2px solid ${platform.color}40`,
                    borderRadius: '12px',
                    minWidth: '140px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      color: platform.color,
                      textTransform: 'capitalize',
                      letterSpacing: '0.02em'
                    }}>
                      {ranking.rank}
                    </div>
                  </div>
                )}

                {/* Current Rating */}
                <div>
                  <div style={{ 
                    fontSize: '3.5rem', 
                    fontWeight: 900, 
                    color: 'white',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                    textShadow: `0 0 30px ${platform.color}40`
                  }}>
                    {current}
                  </div>
                  <div style={{ 
                    fontSize: '0.9rem', 
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontWeight: 600
                  }}>
                    (max: <span style={{ color: platform.color, fontWeight: 700 }}>{max}</span>)
                  </div>
                </div>
              </div>

              {/* Divider (except for last item) */}
              {platform.key !== availablePlatforms[availablePlatforms.length - 1].key && (
                <div style={{
                  position: 'absolute',
                  bottom: '-1rem',
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
