interface StatCardProps {
  title:     string;
  value:     string | number;
  subtitle?: string;
  icon:      React.ReactNode;
  color?:    'purple' | 'blue' | 'orange' | 'cyan' | 'green' | 'yellow';
  trend?:    { value: number; isPositive: boolean };
}

const colorMap: Record<string, string> = {
  purple: 'stat-card-purple',
  blue:   'stat-card-blue',
  orange: 'stat-card-orange',
  cyan:   'stat-card-cyan',
  green:  'stat-card-green',
  yellow: 'stat-card-yellow',
};

export default function StatCard({
  title, value, subtitle, icon, color = 'purple', trend,
}: StatCardProps) {
  return (
    <div className={`stat-card ${colorMap[color] || 'stat-card-purple'}`}>
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
