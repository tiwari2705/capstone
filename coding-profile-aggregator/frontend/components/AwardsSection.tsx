'use client';
import { useState } from 'react';
import { Award, ChevronDown, Info } from '@/components/icons';

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  earned: boolean;
  date?: string;
}

interface AwardsSectionProps {
  badges?: Array<{ name: string; icon: string; platform?: string; date?: string }>;
}

const DEFAULT_BADGES: Badge[] = [
  { id: 'sql', name: 'SQL', icon: '🗄️', color: '#f59e0b', earned: false },
  { id: 'cpp', name: 'C++', icon: '⚡', color: '#3b82f6', earned: false },
  { id: 'python', name: 'Python', icon: '🐍', color: '#8b5cf6', earned: false },
  { id: 'java', name: 'Java', icon: '☕', color: '#ef4444', earned: false },
  { id: 'js', name: 'JavaScript', icon: '⚡', color: '#eab308', earned: false },
  { id: 'react', name: 'React', icon: '⚛️', color: '#06b6d4', earned: false },
];

// Platform colors
const PLATFORM_COLORS: Record<string, string> = {
  leetcode: '#fbbf24',
  codeforces: '#3b82f6',
  geeksforgeeks: '#10b981',
  gfg: '#10b981',
  hackerrank: '#10b981',
  codechef: '#8b5cf6',
};

export default function AwardsSection({ badges }: AwardsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Convert real badges to display format
  let displayBadges: Badge[] = DEFAULT_BADGES;
  
  if (badges && badges.length > 0) {
    displayBadges = badges.map((badge, idx) => {
      const platform = badge.platform || 'leetcode';
      const color = PLATFORM_COLORS[platform] || '#3b82f6';
      
      return {
        id: `badge-${platform}-${idx}`,
        name: badge.name,
        icon: badge.icon, // This is the URL from platform or emoji
        color: color,
        earned: true,
        date: badge.date
      };
    });
    
    // Add some locked badges for visual balance
    const unearnedCount = Math.max(0, 8 - displayBadges.length);
    for (let i = 0; i < unearnedCount; i++) {
      displayBadges.push({
        id: `unearned-${i}`,
        name: `Badge ${i + 1}`,
        icon: '🔒',
        color: '#6b7280',
        earned: false
      });
    }
  }

  const earnedCount = displayBadges.filter(b => b.earned).length;
  const visibleBadges = showAll ? displayBadges : displayBadges.slice(0, 8);

  const handleImageError = (badgeId: string) => {
    setImageErrors(prev => new Set(prev).add(badgeId));
  };

  const isImageUrl = (icon: string) => {
    return icon.startsWith('http://') || icon.startsWith('https://');
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} style={{ color: 'var(--accent-yellow)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Awards</h3>
          <div 
            style={{ cursor: 'help' }}
            title="Badges and achievements earned from coding platforms (LeetCode, Codeforces, GeeksforGeeks, HackerRank)"
          >
            <Info size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
        <span style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-muted)',
          background: 'rgba(139, 92, 246, 0.1)',
          padding: '0.25rem 0.75rem',
          borderRadius: 12,
          fontWeight: 600
        }}>
          {earnedCount}
        </span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {visibleBadges.map(badge => {
          const showImage = badge.earned && isImageUrl(badge.icon) && !imageErrors.has(badge.id);
          
          return (
            <div
              key={badge.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: badge.earned ? 1 : 0.3,
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              title={badge.earned ? `${badge.name}${badge.date ? ` - ${new Date(badge.date).toLocaleDateString()}` : ''}` : `${badge.name} - Locked`}
            >
              <div style={{
                width: 70,
                height: 70,
                borderRadius: '16px',
                background: badge.earned 
                  ? `linear-gradient(135deg, ${badge.color}20, ${badge.color}10)`
                  : 'rgba(255,255,255,0.05)',
                border: `2px solid ${badge.earned ? badge.color + '40' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: showImage ? '0' : '2rem',
                position: 'relative',
                overflow: 'hidden',
                padding: showImage ? '0.5rem' : '0'
              }}>
                {badge.earned && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(circle at 30% 30%, ${badge.color}15, transparent)`,
                    animation: 'pulse 2s ease-in-out infinite',
                    zIndex: 0
                  }} />
                )}
                
                {showImage ? (
                  <img 
                    src={badge.icon}
                    alt={badge.name}
                    onError={() => handleImageError(badge.id)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      position: 'relative',
                      zIndex: 1
                    }}
                  />
                ) : (
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {badge.icon.startsWith('http') ? '🏆' : badge.icon}
                  </span>
                )}
              </div>
              <span style={{ 
                fontSize: '0.75rem', 
                color: badge.earned ? 'white' : 'var(--text-muted)',
                fontWeight: badge.earned ? 600 : 400,
                textAlign: 'center',
                maxWidth: '90px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {badge.name}
              </span>
            </div>
          );
        })}
      </div>

      {displayBadges.length > 8 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: 8,
            color: 'var(--accent-purple)',
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
