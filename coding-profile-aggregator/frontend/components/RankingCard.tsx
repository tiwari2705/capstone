'use client';
import Link from 'next/link';
import { Trophy, TrendingUp, Users, ExternalLink } from '@/components/icons';
import Tooltip from '@/components/Tooltip';

interface RankingData {
  overall: { rank: number; total: number };
  course: { rank: number; total: number; name: string };
  section: { rank: number; total: number; name: string };
}

interface RankingCardProps {
  rankings: RankingData;
}

function getTopPercentage(rank?: number | null, total?: number | null) {
  const validRank = typeof rank === 'number' && Number.isFinite(rank);
  const validTotal = typeof total === 'number' && Number.isFinite(total);

  if (!validRank || !validTotal || total! <= 0 || rank! <= 0 || rank! > total!) {
    return 'N/A';
  }

  const rawPercentage = (rank! / total!) * 100;
  if (rawPercentage <= 1) return 'Top 1%';
  const bucket = Math.min(100, Math.ceil(rawPercentage / 10) * 10);
  return `Top ${bucket}%`;
}

export default function RankingCard({ rankings }: RankingCardProps) {
  if (!rankings || !rankings.overall || !rankings.course || !rankings.section) {
    return null;
  }

  const overallTopPercentage   = getTopPercentage(rankings.overall.rank,  rankings.overall.total);
  const courseTopPercentage    = getTopPercentage(rankings.course.rank,   rankings.course.total);
  const sectionTopPercentage   = getTopPercentage(rankings.section.rank,  rankings.section.total);

  const items = [
    {
      icon: <TrendingUp size={13} style={{ color: '#3b82f6' }} />,
      iconBg: 'rgba(59,130,246,0.12)',
      label: 'Overall',
      rank: rankings.overall.rank,
      total: rankings.overall.total,
      pct: overallTopPercentage,
      pctColor: '#3b82f6',
      pctBg: 'rgba(59,130,246,0.10)',
      pctBorder: 'rgba(59,130,246,0.25)',
    },
    {
      icon: <Trophy size={13} style={{ color: '#10b981' }} />,
      iconBg: 'rgba(16,185,129,0.12)',
      label: rankings.course.name || 'Course',
      rank: rankings.course.rank,
      total: rankings.course.total,
      pct: courseTopPercentage,
      pctColor: '#10b981',
      pctBg: 'rgba(16,185,129,0.10)',
      pctBorder: 'rgba(16,185,129,0.25)',
    },
    {
      icon: <Users size={13} style={{ color: '#eab308' }} />,
      iconBg: 'rgba(234,179,8,0.12)',
      label: `Section ${rankings.section.name}`,
      rank: rankings.section.rank,
      total: rankings.section.total,
      pct: sectionTopPercentage,
      pctColor: '#eab308',
      pctBg: 'rgba(234,179,8,0.10)',
      pctBorder: 'rgba(234,179,8,0.25)',
    },
  ];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap',
      padding: '0.75rem 1rem',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px',
    }}>
      {/* Left label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        marginRight: '0.25rem',
        flexShrink: 0,
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '6px',
          background: 'linear-gradient(135deg,#ff6b00,#ff8c00)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Trophy size={13} style={{ color: '#fff' }} />
        </div>
        <span style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}>
          Your Rank
        </span>
        <Tooltip
          content="Your rank compared to other students based on total problems solved across all platforms"
          size={12}
        />
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      {/* Rank items */}
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '7px',
          flexShrink: 0,
        }}>
          {/* icon */}
          <div style={{
            width: 22,
            height: 22,
            borderRadius: '5px',
            background: item.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {item.icon}
          </div>

          {/* text */}
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1 }}>
              {item.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.15rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                #{item.rank}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                / {item.total}
              </span>
            </div>
          </div>

          {/* percentile pill */}
          <div style={{
            padding: '0.15rem 0.45rem',
            background: item.pctBg,
            border: `1px solid ${item.pctBorder}`,
            borderRadius: '4px',
            fontSize: '0.62rem',
            fontWeight: 700,
            color: item.pctColor,
            whiteSpace: 'nowrap',
          }}>
            {item.pct}
          </div>
        </div>
      ))}

      {/* Leaderboard link */}
      <Link
        href="/leaderboard"
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          transition: 'color 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        Leaderboard <ExternalLink size={12} />
      </Link>
    </div>
  );
}
