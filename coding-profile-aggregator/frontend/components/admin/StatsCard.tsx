'use client';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'purple' | 'blue' | 'orange' | 'cyan' | 'green' | 'yellow';
}

const colorMap: Record<string, string> = {
  purple: 'stat-card-purple',
  blue:   'stat-card-blue',
  orange: 'stat-card-orange',
  cyan:   'stat-card-cyan',
  green:  'stat-card-green',
  yellow: 'stat-card-yellow',
};

const glowMap: Record<string, string> = {
  purple: 'rgba(139, 92, 246, 0.25)',
  blue:   'rgba(59, 130, 246, 0.25)',
  orange: 'rgba(249, 115, 22, 0.25)',
  cyan:   'rgba(6, 182, 212, 0.25)',
  green:  'rgba(16, 185, 129, 0.25)',
  yellow: 'rgba(234, 179, 8, 0.25)',
};

export default function StatsCard({ title, value, icon, subtitle, trend, color = 'blue' }: StatsCardProps) {
  const glow = glowMap[color] || glowMap.blue;
  return (
    <div 
      className={`stat-card ${colorMap[color] || 'stat-card-blue'}`}
      style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 16px ${glow}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div className="stat-card-icon">{icon}</div>
        {trend && (
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: trend.isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{title}</div>
      {subtitle && <div className="stat-card-sub">{subtitle}</div>}
    </div>
  );
}
