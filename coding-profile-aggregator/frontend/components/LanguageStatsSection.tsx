'use client';
import { Code2, Info } from '@/components/icons';

interface LanguageStatsProps {
  stats: Record<string, {
    problems_solved: number;
    extra_data?: {
      languageData?: Array<{ name: string; count: number }>;
    };
  }>;
}

// Language colors mapping
const languageColors: Record<string, string> = {
  'C++': '#00599C',
  'Java': '#f89820',
  'Python': '#3776ab',
  'Python3': '#3776ab',
  'JavaScript': '#f7df1e',
  'TypeScript': '#3178c6',
  'C': '#555555',
  'C#': '#239120',
  'Go': '#00ADD8',
  'Ruby': '#CC342D',
  'Swift': '#FA7343',
  'Kotlin': '#7F52FF',
  'Rust': '#000000',
  'PHP': '#777BB4',
  'Scala': '#DC322F',
  'SQL': '#e38c00',
  'MySQL': '#4479A1',
  'MS SQL Server': '#CC2927',
  'Oracle': '#F80000',
  'PostgreSQL': '#336791',
  'Bash': '#4EAA25',
  'Dart': '#0175C2',
  'Elixir': '#6e4a7e',
  'Erlang': '#A90533',
  'Racket': '#22228f',
};

export default function LanguageStatsSection({ stats }: LanguageStatsProps) {
  // Get language data from LeetCode
  const leetcodeExtra = stats.leetcode?.extra_data || {};
  const languageData = leetcodeExtra.languageData || [];

  // If no language data, show a message
  if (languageData.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Code2 size={20} style={{ color: 'var(--accent-purple)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Languages</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
          No language data available yet. Solve some problems on LeetCode!
        </p>
      </div>
    );
  }

  // Calculate total for percentages
  const total = languageData.reduce((sum, lang) => sum + lang.count, 0);

  // Get top 6 languages
  const topLanguages = languageData.slice(0, 6);

  // Calculate percentages for donut chart
  const segments = topLanguages.map((lang, index) => {
    const percent = (lang.count / total) * 100;
    const color = languageColors[lang.name] || `hsl(${index * 60}, 70%, 50%)`;
    return { ...lang, percent, color };
  });

  // Calculate stroke offsets for donut segments
  let cumulativeOffset = 0;
  const segmentsWithOffsets = segments.map(seg => {
    const dashArray = (seg.percent / 100) * 314;
    const dashOffset = -cumulativeOffset;
    cumulativeOffset += dashArray;
    return { ...seg, dashArray, dashOffset };
  });

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Code2 size={20} style={{ color: 'var(--accent-purple)' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Languages</h3>
        <div title="Problems solved by programming language">
          <Info size={14} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
        </div>
      </div>

      {/* Donut Chart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="20"
            />
            {/* Language segments */}
            {segmentsWithOffsets.map((seg, index) => (
              <circle
                key={index}
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={seg.color}
                strokeWidth="20"
                strokeDasharray={`${seg.dashArray} 314`}
                strokeDashoffset={seg.dashOffset}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 0.5s' }}
              />
            ))}
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
              {total}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Total
            </span>
          </div>
        </div>

        {/* Language list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
          {topLanguages.map((lang, index) => {
            const color = languageColors[lang.name] || `hsl(${index * 60}, 70%, 50%)`;
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <span style={{ 
                    fontSize: '0.9rem', 
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {lang.name}
                  </span>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {lang.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Show more languages if available */}
      {languageData.length > 6 && (
        <div style={{ 
          marginTop: '1rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          +{languageData.length - 6} more {languageData.length - 6 === 1 ? 'language' : 'languages'}
        </div>
      )}
    </div>
  );
}
