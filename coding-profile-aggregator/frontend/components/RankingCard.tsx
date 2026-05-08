'use client';
import { Trophy, TrendingUp, Users } from '@/components/icons';
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
    return 'Top N/A';
  }

  const rawPercentage = (rank! / total!) * 100;

  if (rawPercentage <= 1) {
    return 'Top 1%';
  }

  const bucket = Math.min(100, Math.ceil(rawPercentage / 10) * 10);
  return `Top ${bucket}%`;
}

export default function RankingCard({ rankings }: RankingCardProps) {
  // Defensive checks for undefined rankings
  if (!rankings || !rankings.overall || !rankings.course || !rankings.section) {
    return null;
  }

  const overallTopPercentage = getTopPercentage(rankings.overall.rank, rankings.overall.total);
  const courseTopPercentage = getTopPercentage(rankings.course.rank, rankings.course.total);
  const sectionTopPercentage = getTopPercentage(rankings.section.rank, rankings.section.total);

  return (
    <div className="glass-card" style={{
      padding: '1.25rem',
      background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.05) 0%, rgba(255, 255, 255, 0.03) 100%)',
      border: '1px solid rgba(255, 107, 0, 0.2)',
      borderRadius: '16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        background: 'radial-gradient(circle, rgba(255, 107, 0, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ff6b00 0%, #ff8c00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)'
          }}>
            <Trophy size={18} style={{ color: 'white' }} />
          </div>
          <div>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: 800, 
              color: 'white',
              marginBottom: '0.1rem',
              letterSpacing: '-0.01em'
            }}>
              Your Rankings
            </h3>
            <p style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)',
              fontWeight: 500
            }}>
              Based on problems solved
            </p>
          </div>
        </div>
        <Tooltip 
          content="Your rank compared to other students based on total problems solved across all platforms" 
          size={14}
        />
      </div>

      {/* Rankings Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.85rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Overall Rank */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '0.85rem',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        className="ranking-card-item"
        >
          {/* Icon */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '7px',
            background: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.6rem'
          }}>
            <TrendingUp size={14} style={{ color: '#3b82f6' }} />
          </div>

          {/* Label */}
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            marginBottom: '0.35rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Overall
          </div>

          {/* Rank */}
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: 'white',
            lineHeight: 1,
            marginBottom: '0.35rem'
          }}>
            #{rankings.overall.rank}
          </div>

          {/* Total */}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem'
          }}>
            out of {rankings.overall.total}
          </div>

          {/* Percentile Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.55rem',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '5px',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#3b82f6'
          }}>
            <TrendingUp size={10} />
            {overallTopPercentage}
          </div>
        </div>

        {/* Course Rank */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '0.85rem',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        className="ranking-card-item"
        >
          {/* Icon */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '7px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.6rem'
          }}>
            <Trophy size={14} style={{ color: '#10b981' }} />
          </div>

          {/* Label */}
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            marginBottom: '0.35rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            In {rankings.course.name}
          </div>

          {/* Rank */}
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: 'white',
            lineHeight: 1,
            marginBottom: '0.35rem'
          }}>
            #{rankings.course.rank}
          </div>

          {/* Total */}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem'
          }}>
            out of {rankings.course.total}
          </div>

          {/* Percentile Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.55rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '5px',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#10b981'
          }}>
            <TrendingUp size={10} />
            {courseTopPercentage}
          </div>
        </div>

        {/* Section Rank */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '0.85rem',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
        className="ranking-card-item"
        >
          {/* Icon */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '7px',
            background: 'rgba(234, 179, 8, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.6rem'
          }}>
            <Users size={14} style={{ color: '#eab308' }} />
          </div>

          {/* Label */}
          <div style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            marginBottom: '0.35rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            In Section {rankings.section.name}
          </div>

          {/* Rank */}
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: 'white',
            lineHeight: 1,
            marginBottom: '0.35rem'
          }}>
            #{rankings.section.rank}
          </div>

          {/* Total */}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem'
          }}>
            out of {rankings.section.total}
          </div>

          {/* Percentile Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.55rem',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: '5px',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: '#eab308'
          }}>
            <TrendingUp size={10} />
            {sectionTopPercentage}
          </div>
        </div>
      </div>

      <style jsx>{`
        .ranking-card-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
