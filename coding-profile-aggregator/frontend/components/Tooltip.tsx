'use client';
import { useState, useRef, useEffect } from 'react';
import { Info } from '@/components/icons';

interface TooltipProps {
  content: string;
  size?: number;
}

export default function Tooltip({ content, size = 14 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Position above the icon, centered
      const left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      const top = triggerRect.top - tooltipRect.height - 12; // 12px gap
      
      setPosition({ top, left });
    }
  }, [isVisible]);

  return (
    <div
      ref={triggerRef}
      style={{ 
        position: 'relative',
        display: 'inline-flex',
        cursor: 'help'
      }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <Info size={size} style={{ color: 'var(--text-muted)' }} />
      
      {isVisible && (
        <>
          {/* Backdrop for better visibility */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 9998
            }}
          />
          
          {/* Tooltip */}
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: 9999,
              pointerEvents: 'none',
              animation: 'tooltipFadeIn 0.2s ease-out'
            }}
          >
            {/* Arrow */}
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid rgba(30, 35, 45, 0.98)',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              }}
            />
            
            {/* Tooltip content */}
            <div
              style={{
                background: 'rgba(30, 35, 45, 0.98)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '14px 18px',
                maxWidth: '320px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                color: 'rgba(255, 255, 255, 0.95)',
                fontWeight: 400,
                letterSpacing: '0.01em'
              }}
            >
              {content}
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
