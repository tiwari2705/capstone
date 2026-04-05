'use client';

interface CodolioStatsCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function CodolioStatsCard({ 
  title, 
  value, 
  icon,
  subtitle,
  trend 
}: CodolioStatsCardProps) {
  return (
    <div className="card hover:border-gray-700 transition-all">
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        {icon && (
          <button className="text-gray-400 hover:text-white transition-colors">
            <span className="text-xl">ⓘ</span>
          </button>
        )}
      </div>

      {/* Main value */}
      <div className="mb-2">
        <span className="text-5xl font-bold text-white">{value}</span>
      </div>

      {/* Subtitle or trend */}
      {subtitle && (
        <p className="text-gray-400 text-sm">{subtitle}</p>
      )}

      {trend && (
        <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}%</span>
          <span className="text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  );
}
