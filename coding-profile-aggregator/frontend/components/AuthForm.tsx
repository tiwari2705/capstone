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
  const [form, setForm] = useState({ name: '', email: '', password: '', registration_no: '', course: '', section: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
      // For login, send the registration_no field as the identifier
      const payload  = mode === 'login' 
        ? { registration_no: form.registration_no, password: form.password } 
        : form;
      const res      = await api.post(endpoint, payload);
      
      // Handle signup with email verification
      if (mode === 'signup' && res.data.requiresVerification) {
        toast.success('Account created! Please check your email for OTP.');
        router.push(`/verify-email?email=${encodeURIComponent(res.data.email)}`);
        return;
      }
      
      // Handle login with unverified email
      if (mode === 'login' && res.data.requiresVerification) {
        toast.error('Please verify your email first');
        router.push(`/verify-email?email=${encodeURIComponent(res.data.email)}`);
        return;
      }
      
      setToken(res.data.token);
      const userRole = res.data.user?.role || 'user';
      toast.success(userRole === 'admin'
        ? (mode === 'login' ? 'Welcome back, Admin!' : 'Admin account created!')
        : (mode === 'login' ? 'Welcome back!'        : 'Account created!'));
      router.push(userRole === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const error = err as AxiosError<any>;
      if (!error.response) {
        toast.error('Cannot connect to server. Please ensure the backend is running.');
      } else {
        const errorData = err.response.data;
        if (errorData?.requiresVerification) {
          toast.error(errorData.error);
          router.push(`/verify-email?email=${encodeURIComponent(errorData.email)}`);
        } else {
          toast.error(errorData?.error || 'Authentication failed');
        }
      }
    } finally {
      setLoading(false);
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
            {mode === 'signup' && field('name', 'Full Name', 'text', 'John Doe')}
            
            {mode === 'login' 
              ? field('registration_no', 'Registration Number', 'text', 'e.g. 21BCE1234') 
              : field('registration_no', 'Registration Number', 'text', 'e.g. 21BCE1234')}

            {mode === 'signup' && field('email', 'Email Address', 'email', 'you@example.com')}

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

            {mode === 'signup' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Course Dropdown */}
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
            )}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              {loading
                ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : null}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
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
