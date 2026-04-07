'use client';
import { useState } from 'react';
import { getUserFromToken, isAdmin } from '@/lib/auth';

export default function AuthDebugger() {
  const [show, setShow] = useState(false);
  
  if (process.env.NODE_ENV === 'production') return null;

  const user = getUserFromToken();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
      <button
        onClick={() => setShow(!show)}
        style={{
          background: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 48,
          height: 48,
          cursor: 'pointer',
          fontSize: '20px',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
        }}
        title="Auth Debugger"
      >
        🔍
      </button>

      {show && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          right: 0,
          background: '#1e1e2e',
          border: '1px solid #333',
          borderRadius: 12,
          padding: '1rem',
          minWidth: 300,
          maxWidth: 400,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          fontSize: '0.85rem',
          color: '#e0e0e0'
        }}>
          <div style={{ marginBottom: '0.75rem', fontWeight: 'bold', color: '#8b5cf6' }}>
            🔐 Auth Debug Info
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <strong>Token:</strong> {token ? '✅ Present' : '❌ Missing'}
            </div>

            {user ? (
              <>
                <div>
                  <strong>Email:</strong> {user.email}
                </div>
                <div>
                  <strong>Reg No:</strong> {user.registration_no}
                </div>
                <div>
                  <strong>Role:</strong> <span style={{ 
                    color: isAdmin() ? '#10b981' : '#ef4444',
                    fontWeight: 'bold'
                  }}>
                    {user.role}
                  </span>
                </div>
                <div>
                  <strong>Is Admin:</strong> {isAdmin() ? '✅ Yes' : '❌ No'}
                </div>
              </>
            ) : (
              <div style={{ color: '#ef4444' }}>
                ❌ Not logged in
              </div>
            )}

            {token && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #333' }}>
                <button
                  onClick={() => {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log('🔍 Full Token Payload:', payload);
                    alert('Check browser console for full token details');
                  }}
                  style={{
                    background: '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    width: '100%'
                  }}
                >
                  Log Token to Console
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
