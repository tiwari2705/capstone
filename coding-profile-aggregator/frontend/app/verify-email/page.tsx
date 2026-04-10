"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Code2 } from '@/components/icons';

export default function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      toast.error('Email not provided');
      router.push('/signup');
    }
  }, [searchParams, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-email', { email, otp });
      setToken(res.data.token);
      toast.success('Email verified successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('OTP sent to your email');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Code2 size={18} color="#fff" />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg,#fff,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CodeQuest
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            Verify Your Email
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter the OTP sent to {email}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                maxLength={6}
                required
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center' }}>
                OTP expires in 10 minutes
              </p>
            </div>

            <button type="submit" disabled={loading || otp.length !== 6} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem' }}>
              {loading ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : 'Verify Email'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button
              onClick={handleResend}
              disabled={resending}
              style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
            >
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          <Link href="/login" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}