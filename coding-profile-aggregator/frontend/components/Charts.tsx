'use client';
// Recharts uses forwardRef which breaks React 19 + Turbopack when imported directly.
// Wrapping in a plain client component that only renders on the browser fixes it.
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';

type BarData = { platform: string; problems: number };
type RadarData = { subject: string; value: number };

export function ProblemsBarChart({ data }: { data: BarData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="platform" tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            background: '#111111',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#f3f4f6',
          }}
        />
        <Bar dataKey="problems" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PerformanceRadar({ data }: { data: RadarData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(107,114,128,0.3)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <Radar dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
