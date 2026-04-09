'use client';
import { Code2, Info } from '@/components/icons';

interface CompetitiveProgrammingProps {
  stats: Record<string, {
    problems_solved: number;
    rating: number;
  }>;
}

export default function CompetitiveProgrammingCard({ stats }: CompetitiveProgrammingProps) {
  const codechefProblems = stats.codechef?.problems_solved || 0;
  const codeforcesProblems = stats.codeforces?.problems_solved || 0;
  const total = codechefProblems + codeforcesProblems;

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Code2 size={20} style={{ color: 'var(--accent-green)' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Competitive Programming</h3>
        <div 
          style={{ cursor: 'help' }}
          title="Problems solved on competitive programming platforms (CodeChef and Codeforces)"
        >
          <Info size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: 1, marginBottom: '1.5rem' }}>
        {total}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#8b5cf6' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Codechef</span>
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{codechefProblems}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Codeforces</span>
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>{codeforcesProblems}</span>
        </div>
      </div>
    </div>
  );
}
