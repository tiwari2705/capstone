import { CheckCircle, XCircle, ExternalLink } from '@/components/icons';

interface PlatformStats {
  problems_solved?: number;
  rating?:          number;
  easy_solved?:     number;
  medium_solved?:   number;
  hard_solved?:     number;
  submissions?:     number;
  score?:           number;
  last_updated?:    string;
}

interface PlatformCardProps {
  platform:    string;
  username?:   string;
  verified?:   boolean;
  stats?:      PlatformStats;
  profileUrl?: string;
}

const platformConfig: Record<string, { color: string; label: string; url: (u: string) => string }> = {
  leetcode:      { color: '#eab308', label: 'LeetCode',      url: u => `https://leetcode.com/${u}` },
  codeforces:    { color: '#3b82f6', label: 'Codeforces',    url: u => `https://codeforces.com/profile/${u}` },
  geeksforgeeks: { color: '#10b981', label: 'GeeksforGeeks', url: u => `https://www.geeksforgeeks.org/user/${u}` },
  hackerrank:    { color: '#10b981', label: 'HackerRank',    url: u => `https://www.hackerrank.com/profile/${u}` },
};

export default function PlatformCard({ platform, username, verified, stats, profileUrl }: PlatformCardProps) {
  const cfg = platformConfig[platform] || { color: '#9ca3af', label: platform, url: () => '#' };
  const url = profileUrl || (username ? cfg.url(username) : null);

  return (
    <div className={`platform-card platform-card-${platform}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: cfg.color, lineHeight: 1 }}>
              {cfg.label}
            </h3>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-muted)', display: 'flex' }}
                title="View on platform"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
          {username && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>@{username}</p>
          )}
        </div>

        {verified !== undefined && (
          <div style={{ flexShrink: 0 }}>
            {verified
              ? <CheckCircle size={18} style={{ color: 'var(--accent-green)' }} />
              : <XCircle size={18} style={{ color: 'var(--accent-red)' }} />
            }
          </div>
        )}
      </div>

      {/* Stats */}
      {stats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {stats.problems_solved !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Problems Solved</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{stats.problems_solved}</span>
            </div>
          )}
          {stats.rating !== undefined && stats.rating > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Rating</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{stats.rating}</span>
            </div>
          )}

          {/* LeetCode difficulty breakdown */}
          {platform === 'leetcode' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '0.5rem',
                marginTop: '0.5rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border)',
              }}
            >
              {([
                ['Easy', stats.easy_solved,   '#10b981'],
                ['Med',  stats.medium_solved,  '#f97316'],
                ['Hard', stats.hard_solved,    '#ef4444'],
              ] as [string, number | undefined, string][]).map(([lbl, val, clr]) => (
                <div key={lbl} className="difficulty-chip">
                  <span className="difficulty-chip-label" style={{ color: clr }}>{lbl}</span>
                  <span className="difficulty-chip-value">{val ?? 0}</span>
                </div>
              ))}
            </div>
          )}

          {stats.last_updated && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              Updated {new Date(stats.last_updated).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No stats available yet</p>
      )}
    </div>
  );
}
