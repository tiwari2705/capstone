'use client';
import { useState, useRef } from 'react';

interface HeatmapData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  totalSubmissions: number;
  maxStreak: number;
  currentStreak: number;
}

export default function ActivityHeatmap({ data, totalSubmissions, maxStreak, currentStreak }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create a map for quick lookup
  const dataMap = new Map(data.map(d => [d.date, d.count]));

  // Generate last 365 days
  const generateLast365Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = dataMap.get(dateStr) || 0;
      days.push({ date: dateStr, count, dayOfWeek: date.getDay() });
    }
    
    return days;
  };

  const days = generateLast365Days();

  // Group by weeks
  const weeks: Array<Array<{ date: string; count: number; dayOfWeek: number }>> = [];
  let currentWeek: Array<{ date: string; count: number; dayOfWeek: number }> = [];
  
  // Pad the first week if it doesn't start on Sunday
  const firstDayOfWeek = days[0].dayOfWeek;
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: '', count: 0, dayOfWeek: i });
  }

  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Add remaining days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', count: 0, dayOfWeek: currentWeek.length });
    }
    weeks.push(currentWeek);
  }

  // LeetCode color scheme - exact shades
  const getColor = (count: number) => {
    if (count === 0) return '#161b22'; // Dark gray (no activity)
    if (count === 1) return '#0e4429'; // Dark green
    if (count <= 3) return '#006d32'; // Medium-dark green
    if (count <= 6) return '#26a641'; // Medium green
    return '#39d353'; // Bright green (high activity)
  };

  // Get month labels
  const getMonthLabels = () => {
    const labels: Array<{ month: string; weekIndex: number }> = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDayWithDate = week.find(d => d.date);
      if (firstDayWithDate) {
        const date = new Date(firstDayWithDate.date);
        const month = date.getMonth();
        
        if (month !== lastMonth && weekIndex > 0) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          labels.push({ month: monthNames[month], weekIndex });
          lastMonth = month;
        }
      }
    });

    return labels;
  };

  const monthLabels = getMonthLabels();

  const handleMouseEnter = (day: { date: string; count: number }, event: React.MouseEvent) => {
    if (day.date) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        // Position tooltip relative to the container, near the cell
        const x = rect.left - containerRect.left + rect.width / 2;
        const y = rect.top - containerRect.top;
        
        setHoveredCell({
          date: day.date,
          count: day.count,
          x,
          y
        });
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="glass-card" style={{ 
      padding: '2rem', 
      gridColumn: 'span 2', 
      minWidth: 0, 
      position: 'relative',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px'
    }} ref={containerRef}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between', 
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800, 
            color: 'white', 
            marginBottom: '0.5rem',
            letterSpacing: '-0.01em'
          }}>
            Activity Heatmap
          </h3>
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-muted)',
            fontWeight: 500
          }}>
            Last 365 days
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '2.5rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600
            }}>
              Submissions
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              color: 'white',
              lineHeight: 1
            }}>
              {totalSubmissions}
            </div>
          </div>
          
          <div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600
            }}>
              Max Streak
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              color: '#39d353',
              lineHeight: 1
            }}>
              {maxStreak}
            </div>
          </div>
          
          <div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600
            }}>
              Current Streak
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              color: currentStreak > 0 ? '#39d353' : 'var(--text-muted)',
              lineHeight: 1
            }}>
              {currentStreak}
            </div>
          </div>
        </div>
      </div>

      {/* Month labels */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.5rem', paddingLeft: '30px' }}>
        {monthLabels.map((label, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${30 + label.weekIndex * 18}px`,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            {label.month}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '0.75rem', paddingTop: '1.5rem' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginRight: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
            <div
              key={day}
              style={{
                height: 14,
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                opacity: idx % 2 === 0 ? 1 : 0 // Show only Sun, Tue, Thu, Sat
              }}
            >
              {idx % 2 === 0 ? day : ''}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 14 }}>
            {week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                style={{
                  width: 14,
                  height: 14,
                  background: day.date ? getColor(day.count) : 'transparent',
                  borderRadius: 3,
                  cursor: day.date ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  border: day.date && day.count > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                }}
                onMouseEnter={(e) => handleMouseEnter(day, e)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>Less</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2, 4, 7].map((count) => (
            <div
              key={count}
              style={{
                width: 14,
                height: 14,
                background: getColor(count),
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Tooltip - positioned near the cell */}
      {hoveredCell && (
        <div
          style={{
            position: 'absolute',
            left: hoveredCell.x,
            top: hoveredCell.y - 10,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(0, 0, 0, 0.95)',
            color: 'white',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ marginBottom: '0.25rem' }}>
            <span style={{ color: hoveredCell.count > 0 ? '#39d353' : '#6b7280' }}>
              {hoveredCell.count} {hoveredCell.count === 1 ? 'submission' : 'submissions'}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
            {formatDate(hoveredCell.date)}
          </div>
        </div>
      )}
    </div>
  );
}
