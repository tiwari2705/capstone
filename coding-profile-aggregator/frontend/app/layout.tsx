import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title:       'CodeQuest — Coding Profile Aggregator',
  description: 'Track and compare your coding profiles across LeetCode, Codeforces, and GeeksforGeeks in one unified dashboard.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(22,26,42,0.98)',
              color:      '#f3f4f6',
              border:     '1px solid rgba(139,92,246,0.3)',
              backdropFilter: 'blur(12px)',
              borderRadius:   '10px',
              fontSize:       '0.875rem',
            },
            success: { iconTheme: { primary: '#8b5cf6', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
