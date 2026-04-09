'use client';
import { Code2, Info } from '@/components/icons';

interface ProblemsSolvedProps {
  stats: Record<string, {
    problems_solved: number;
    easy_solved?: number;
    medium_solved?: number;
    hard_solved?: number;
  }>;
}

export default function ProblemsSolvedSection({ stats }: ProblemsSolvedProps) {
  // Calculate totals
  const leetcodeEasy = stats.leetcode?.easy_solved || 0;
  const leetcodeMedium = stats.leetcode?.medium_solved || 0;
  const leetcodeHard = stats.leetcode?.hard_solved || 0;
  const leetcodeTotal = leetcodeEasy + leetcodeMedium + leetcodeHard;

  // Calculate percentages for donut chart
  const easyPercent = leetcodeTotal > 0 ? (leetcodeEasy / leetcodeTotal) * 100 : 0;
  const mediumPercent = leetcodeTotal > 0 ? (leetcodeMedium / leetcodeTotal) * 100 : 0;
  const hardPercent = leetcodeTotal > 0 ? (leetcodeHard / leetcodeTotal) * 100 : 0;

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Code2 size={20} style={{ color: 'var(--accent-purple)' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Problems by Difficulty</h3>
        <div 
          style={{ cursor: 'help' }}
          title="LeetCode problems categorized by difficulty level (Easy, Medium, Hard)"
        >
          <Info size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Donut Chart for DSA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="20"
            />
            {/* Easy segment (green) */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeDasharray={`${(easyPercent / 100) * 314} 314`}
              strokeDashoffset="0"
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
            {/* Medium segment (yellow) */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#eab308"
              strokeWidth="20"
              strokeDasharray={`${(mediumPercent / 100) * 314} 314`}
              strokeDashoffset={`-${(easyPercent / 100) * 314}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
            {/* Hard segment (red) */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeDasharray={`${(hardPercent / 100) * 314} 314`}
              strokeDashoffset={`-${((easyPercent + mediumPercent) / 100) * 314}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
              {leetcodeTotal}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Total
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Easy</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{leetcodeEasy}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#eab308' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Medium</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{leetcodeMedium}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hard</span>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{leetcodeHard}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
