// Inline SVG icon components — replaces lucide-react which is incompatible
// with React 19 + Next.js 16 Turbopack (forwardRef objects break rendering)

import React from 'react';

export type IconProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
};

// Utility: wraps raw SVG path(s) in a standard icon shell
function Icon(
  { size = 24, className = '', style, color }: IconProps,
  children: React.ReactNode
) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color || 'currentColor'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
    >
      {children}
    </svg>
  );
}

export const Code2 = (p: IconProps) => Icon(p,
  <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>
);

export const Trophy = (p: IconProps) => Icon(p,
  <>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </>
);

export const BarChart3 = (p: IconProps) => Icon(p,
  <><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>
);

export const Shield = (p: IconProps) => Icon(p,
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
);

export const ArrowRight = (p: IconProps) => Icon(p,
  <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>
);

export const Zap = (p: IconProps) => Icon(p,
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
);

export const Target = (p: IconProps) => Icon(p,
  <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>
);

export const RefreshCw = (p: IconProps) => Icon(p,
  <>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </>
);

export const Loader2 = (p: IconProps) => Icon(p,
  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
);

export const Eye = (p: IconProps) => Icon(p,
  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
);

export const EyeOff = (p: IconProps) => Icon(p,
  <>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </>
);

export const CheckCircle = (p: IconProps) => Icon(p,
  <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
);

export const XCircle = (p: IconProps) => Icon(p,
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </>
);

export const Plus = (p: IconProps) => Icon(p,
  <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>
);

export const Copy = (p: IconProps) => Icon(p,
  <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>
);

export const Trash2 = (p: IconProps) => Icon(p,
  <>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </>
);

export const ExternalLink = (p: IconProps) => Icon(p,
  <>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </>
);

export const Medal = (p: IconProps) => Icon(p,
  <>
    <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
    <path d="M11 12 5.12 2.2" /><path d="m13 12 5.88-9.8" /><path d="M8 7h8" />
    <circle cx="12" cy="17" r="5" /><path d="M12 18v-2h-.5" />
  </>
);

export const Award = (p: IconProps) => Icon(p,
  <><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></>
);

export const Filter = (p: IconProps) => Icon(p,
  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
);

export const ChevronUp = (p: IconProps) => Icon(p,
  <polyline points="18 15 12 9 6 15" />
);

export const ChevronDown = (p: IconProps) => Icon(p,
  <polyline points="6 9 12 15 18 9" />
);

export const ArrowLeft = (p: IconProps) => Icon(p,
  <><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>
);

export const LayoutDashboard = (p: IconProps) => Icon(p,
  <>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </>
);

export const Link2 = (p: IconProps) => Icon(p,
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>
);

export const LogOut = (p: IconProps) => Icon(p,
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </>
);

export const User = (p: IconProps) => Icon(p,
  <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>
);

export const Menu = (p: IconProps) => Icon(p,
  <>
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </>
);

export const X = (p: IconProps) => Icon(p,
  <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
);

export const Share2 = (p: IconProps) => Icon(p,
  <>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </>
);

export const Search = (p: IconProps) => Icon(p,
  <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>
);

export const ArrowUpDown = (p: IconProps) => Icon(p,
  <>
    <path d="m21 16-4 4-4-4" /><path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" /><path d="M7 4v16" />
  </>
);

export const Info = (p: IconProps) => Icon(p,
  <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>
);

export const Code = (p: IconProps) => Icon(p,
  <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>
);

export const ShieldAlert = (p: IconProps) => Icon(p,
  <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>
);

export const TrendingUp = (p: IconProps) => Icon(p,
  <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>
);

export const Users = (p: IconProps) => Icon(p,
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);

export const Download = (p: IconProps) => Icon(p,
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>
);
