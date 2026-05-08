'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Code2, Eye, EyeOff } from '@/components/icons';

interface AuthFormProps { mode: 'login' | 'signup'; }

const COURSES = [
  'B.Tech CSE',
  'B.Tech IT',
  'B.Tech ECE',
  'B.Tech EEE',
  'B.Tech Mechanical',
  'B.Tech Civil',
  'B.Tech Chemical',
  'BCA',
  'MCA',
  'M.Tech CSE',
  'M.Tech IT',
  'Other'
];

export default function AuthForm({ mode }: AuthFormProps) {
  const router   = useRouter();
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    registration_no: '', 
    course: '', 
    section: '',
    year_of_passing: ''
  });

  // Step 1: Send OTP for signup
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/send-signup-otp', {
        email: form.email,
        registration_no: form.registration_no
      });
      toast.success('OTP sent to your email!');
      setOtpSent(true);
    } catch (err) {
      const error = err as AxiosError<any>;
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete signup with OTP
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', {
        ...form,
        otp
      });
      
      setToken(res.data.token);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (err) {
      const error = err as AxiosError<any>;
      toast.error(error.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      setLoading(true);
      try {
        const res = await api.post('/auth/login', {
          registration_no: form.registration_no,
          password: form.password
        });
        
        if (res.data.requiresVerification) {
          toast.error('Please verify your email first');
          router.push(`/verify-email?email=${encodeURIComponent(res.data.email)}`);
          return;
        }
        
        setToken(res.data.token);
        toast.success('Welcome back!');
        router.push(res.data.user?.role === 'admin' ? '/admin' : '/dashboard');
      } catch (err) {
        const error = err as AxiosError<any>;
        if (!error.response) {
          toast.error(`Connection failed: ${error.message}`);
        } else {
          const errorData = error.response.data;
          if (errorData?.requiresVerification) {
            toast.error(errorData.error);
            router.push(`/verify-email?email=${encodeURIComponent(errorData.email)}`);
          } else {
            toast.error(errorData?.error || 'Login failed');
          }
        }
      } finally {
        setLoading(false);
      }
    } else if (!otpSent) {
      await handleSendOtp(e);
    } else {
      await handleSignup(e);
    }
  };

  const field = (name: keyof typeof form, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={type === 'password' ? (showPass ? 'text' : 'password') : type}
        value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        placeholder={placeholder}
        className="form-input"
        required={['name', 'email', 'password', 'registration_no'].includes(name) && mode === 'signup' ? true : ['registration_no', 'password'].includes(name)}
      />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Brand */}
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
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Start tracking your coding journey'}
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'signup' && !otpSent && (
              <>
                {field('name', 'Full Name', 'text', 'John Doe')}
                {field('registration_no', 'Registration Number', 'text', 'e.g. 21BCE1234')}
                {field('email', 'Email Address', 'email', 'you@example.com')}

                {/* Password with toggle */}
                <div>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••"
                      className="form-input"
                      style={{ paddingRight: '2.75rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                    >
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Course</label>
                    <select
                      value={form.course}
                      onChange={e => setForm(p => ({ ...p, course: e.target.value }))}
                      className="form-input"
                      required
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="" disabled>Select Course</option>
                      {COURSES.map(course => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>
                  {field('section', 'Section', 'text', 'A')}
                </div>

                <div>
                  <label className="form-label">Year of Passing</label>
                  <select
                    value={form.year_of_passing}
                    onChange={e => setForm(p => ({ ...p, year_of_passing: e.target.value }))}
                    className="form-input"
                    required
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="" disabled>Select Year</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {mode === 'signup' && otpSent && (
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px', padding: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ✓ Verification email sent to <strong>{form.email}</strong>
                </p>
                <div>
                  <label className="form-label">Enter OTP</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    maxLength={6}
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '1rem', letterSpacing: '0.1rem', fontWeight: 400 }}
                    required
                  />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>
                  OTP expires in 10 minutes
                </p>
              </div>
            )}

            {mode === 'login' && (
              <>
                {field('registration_no', 'Registration Number', 'text', 'e.g. 21BCE1234')}

                {/* Password with toggle */}
                <div>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••"
                      className="form-input"
                      style={{ paddingRight: '2.75rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                    >
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              {loading
                ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : null}
              {mode === 'login' ? 'Sign In' : (otpSent ? 'Create Account' : 'Send OTP')}
            </button>

            {mode === 'signup' && otpSent && (
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(''); }}
                className="btn btn-ghost"
                style={{ width: '100%' }}
              >
                ← Back to form
              </button>
            )}
          </form>

          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <Link href="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <Link href={mode === 'login' ? '/signup' : '/login'} style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  );
}