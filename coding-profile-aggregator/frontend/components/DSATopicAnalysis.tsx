'use client';
import { useState } from 'react';
import { BarChart3, ChevronDown, Info } from '@/components/icons';

interface Topic {
  name: string;
  count: number;
  color: string;
}

interface DSATopicAnalysisProps {
  topics?: Topic[];
}

const DEFAULT_TOPICS: Topic[] = [
  { name: 'Arrays', count: 121, color: '#3b82f6' },
  { name: 'String', count: 51, color: '#3b82f6' },
  { name: 'Math', count: 49, color: '#3b82f6' },
  { name: 'HashMap and Set', count: 37, color: '#3b82f6' },
  { name: 'Sorting', count: 36, color: '#3b82f6' },
  { name: 'Dynamic Programming', count: 24, color: '#3b82f6' },
  { name: 'Binary Search', count: 22, color: '#3b82f6' },
  { name: 'Two Pointers', count: 22, color: '#3b82f6' },
  { name: 'Bit Manipulation', count: 22, color: '#3b82f6' },
  { name: 'Simulation', count: 22, color: '#3b82f6' },
  { name: 'Greedy', count: 18, color: '#3b82f6' },
  { name: 'Stack', count: 16, color: '#3b82f6' },
  { name: 'Tree', count: 14, color: '#3b82f6' },
  { name: 'Graph', count: 12, color: '#3b82f6' },
];

export default function DSATopicAnalysis({ topics }: DSATopicAnalysisProps) {
  const [showAll, setShowAll] = useState(false);
  const DSA_TOPICS = topics && topics.length > 0 ? topics : DEFAULT_TOPICS;
  const maxCount = Math.max(...DSA_TOPICS.map(t => t.count));
  const displayTopics = showAll ? DSA_TOPICS : DSA_TOPICS.slice(0, 10);

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={20} style={{ color: 'var(--accent-blue)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>DSA Topic Analysis</h3>
          <div 
            style={{ cursor: 'help' }}
            title="Data Structures and Algorithms topics based on LeetCode problems solved. Shows your strongest areas."
          >
            <Info size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
        <div title="Based on LeetCode problems">
          <Info size={16} style={{ color: 'var(--text-muted)', cursor: 'help' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {displayTopics.map((topic, index) => {
          const percentage = (topic.count / maxCount) * 100;
          
          return (
            <div key={topic.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Topic name */}
              <div style={{ 
                minWidth: 140, 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)',
                textAlign: 'right'
              }}>
                {topic.name}
              </div>

              {/* Progress bar */}
              <div style={{ 
                flex: 1, 
                height: 24, 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: 6,
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${topic.color}, ${topic.color}cc)`,
                  borderRadius: 6,
                  transition: 'width 0.5s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '0.5rem'
                }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}>
                    {topic.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {DSA_TOPICS.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            width: '100%',
            padding: '0.5rem',
            marginTop: '1rem',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 8,
            color: 'var(--accent-blue)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          {showAll ? 'Show Less' : 'Show More'}
          <ChevronDown size={16} style={{ 
            transform: showAll ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s'
          }} />
        </button>
      )}
    </div>
  );
}
