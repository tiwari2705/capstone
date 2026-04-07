'use client';
import { useState } from 'react';
import { getToken, getUserFromToken, isAdmin } from '@/lib/auth';
import api from '@/lib/api';

export default function TestAuthPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const token = getToken();
  const user = getUserFromToken();

  const testEndpoint = async (endpoint: string) => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.get(endpoint);
      setResult({ success: true, data });
    } catch (err: any) {
      setResult({ 
        success: false, 
        error: err.response?.data?.error || err.message,
        status: err.response?.status 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: 'white' }}>
          🔐 Authentication Test Page
        </h1>

        {/* Auth Status */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>
            Current Auth Status
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <strong>Token Present:</strong> {token ? '✅ Yes' : '❌ No'}
            </div>
            
            {user ? (
              <>
                <div>
                  <strong>Email:</strong> {user.email}
                </div>
                <div>
                  <strong>Registration No:</strong> {user.registration_no}
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
                ❌ Not logged in - Please <a href="/login" style={{ color: '#8b5cf6' }}>login first</a>
              </div>
            )}
          </div>
        </div>

        {/* Test Buttons */}
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>
            Test API Endpoints
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => testEndpoint('/auth/me')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start' }}
            >
              Test: GET /auth/me (Requires: Login)
            </button>
            
            <button
              onClick={() => testEndpoint('/admin/stats')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start' }}
            >
              Test: GET /admin/stats (Requires: Admin)
            </button>
            
            <button
              onClick={() => testEndpoint('/admin/users')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start' }}
            >
              Test: GET /admin/users (Requires: Admin)
            </button>
            
            <button
              onClick={() => testEndpoint('/dashboard/stats')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start' }}
            >
              Test: GET /dashboard/stats (Requires: Login)
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>
              Test Result
            </h2>
            
            <div style={{
              background: result.success ? '#10b98120' : '#ef444420',
              border: `1px solid ${result.success ? '#10b981' : '#ef4444'}`,
              borderRadius: 8,
              padding: '1rem',
              fontSize: '0.85rem',
              fontFamily: 'monospace'
            }}>
              {result.success ? (
                <>
                  <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    ✅ SUCCESS
                  </div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </>
              ) : (
                <>
                  <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    ❌ ERROR {result.status && `(${result.status})`}
                  </div>
                  <div style={{ color: '#ef4444' }}>
                    {result.error}
                  </div>
                  
                  {result.status === 403 && (
                    <div style={{ marginTop: '1rem', color: '#fbbf24' }}>
                      💡 Tip: 403 means you don't have permission. Make sure you're logged in as an admin.
                    </div>
                  )}
                  
                  {result.status === 401 && (
                    <div style={{ marginTop: '1rem', color: '#fbbf24' }}>
                      💡 Tip: 401 means you're not authenticated. Please login first.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>
            📚 How to Use
          </h2>
          
          <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <li>Login with admin credentials (ADMIN001 / admin123)</li>
            <li>Come back to this page</li>
            <li>Click the test buttons above</li>
            <li>Check if you get ✅ SUCCESS or ❌ ERROR</li>
            <li>If you get 403, you're not an admin</li>
            <li>If you get 401, you're not logged in</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
