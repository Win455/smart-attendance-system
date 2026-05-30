import React, { useState } from 'react';
import { ShieldCheck, User, LogIn, Key, Sparkles, School } from 'lucide-react';
import { DbUser } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: DbUser, token: string) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Teacher' | 'Student'>('Student');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-fill mock credentials for demonstration flow
  const handlePrefill = (preset: 'admin' | 'teacher' | 'student') => {
    if (preset === 'admin') {
      setEmail('vance@academy.edu');
      setFullName('Dr. Elizabeth Vance');
      setRole('Admin');
    } else if (preset === 'teacher') {
      setEmail('rostova@academy.edu');
      setFullName('Dr. Elena Rostova');
      setRole('Teacher');
    } else {
      setEmail('alex.mercer@student.edu');
      setFullName('Alex Mercer');
      setRole('Student');
    }
    setPassword('demopass123');
    setIsLogin(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please fill in all security fields.');
      setLoading(false);
      return;
    }

    if (!isLogin && !fullName) {
      setErrorMessage('Full name is required for registration.');
      setLoading(false);
      return;
    }

    if (!isLogin && password.length < 8) {
      setErrorMessage('Security constraint: Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password }
        : { fullName, email, password, role };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server validation failed.');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error connecting to Express API.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // Prompt values
      const googleMockMail = email || 'guest.student@gmail.com';
      const googleMockName = fullName || 'Guest Student';
      
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleMockMail,
          fullName: googleMockName,
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Authenticator failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth_container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-white shadow-xs px-2.5 py-1.5 rounded-md border border-slate-100">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        SANDBOX SERVER PORT: 3000
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-150">
            <School className="h-6 w-6" id="academy_identity" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 font-sans">
          Smart Attendance System
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Digital QR roll tracking, real-time analytics, and secure administrative dashboards.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-md rounded-xl sm:px-10 border border-slate-100">
          
          {/* Quick Demo Pre-Fill Fast Switcher */}
          <div className="mb-6 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/60">
            <div className="text-xs font-semibold text-indigo-800 mb-2 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Demo Direct Sandbox Access:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button 
                id="prefill_admin"
                onClick={() => handlePrefill('admin')}
                type="button" 
                className="text-xs font-medium py-1 px-2.5 rounded bg-white hover:bg-slate-100 text-slate-700 transition border border-slate-200 shadow-3xs"
              >
                🔑 Admin
              </button>
              <button 
                id="prefill_teacher"
                onClick={() => handlePrefill('teacher')}
                type="button" 
                className="text-xs font-medium py-1 px-2.5 rounded bg-white hover:bg-slate-100 text-slate-700 transition border border-slate-200 shadow-3xs"
              >
                📝 Teacher
              </button>
              <button 
                id="prefill_student"
                onClick={() => handlePrefill('student')}
                type="button" 
                className="text-xs font-medium py-1 px-2.5 rounded bg-white hover:bg-slate-100 text-slate-700 transition border border-slate-200 shadow-3xs"
              >
                🎓 Student
              </button>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative rounded-md shadow-3xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <input
                    id="reg_full_name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="E.g. Elena Rostova"
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Institutional Email Address
              </label>
              <div className="relative rounded-md shadow-3xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-sm font-semibold text-slate-400">@</span>
                </div>
                <input
                  id="auth_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@academy.edu"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Account Password
              </label>
              <div className="relative rounded-md shadow-3xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  id="auth_password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  System Role Authorization
                </label>
                <select
                  id="reg_role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="block w-full py-2 px-3 border border-slate-300 bg-white rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-3xs"
                >
                  <option value="Student">Student Access</option>
                  <option value="Teacher">Teacher Access</option>
                </select>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-md bg-rose-50 p-3.5 border border-rose-200">
                <div className="text-xs font-medium text-rose-800">
                  ⚠️ Error: {errorMessage}
                </div>
              </div>
            )}

            <button
              id="submit_auth"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 tracking-wide shadow-sm hover:shadow-md transition active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Verifying..." : isLogin ? "Secure Login" : "Complete Registration"}
            </button>
          </form>

          <div className="mt-5">
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-slate-500">Or continue with third-party verification</span>
            </div>
            <button
              id="google_oauth_bypass"
              onClick={handleGoogleLogin}
              type="button"
              className="mt-3.5 w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 opacity-90 transition active:scale-98 shadow-3xs"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#ea4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.414 0-6.19-2.77-6.19-6.19s2.776-6.19 6.19-6.19c1.625 0 3.038.625 4.113 1.643l3.018-3.018C18.966 2.76 15.823 1.5 12.24 1.5c-5.8 0-10.5 4.7-10.5 10.5s4.7 10.5 10.5 10.5c6.012 0 10.74-4.237 10.74-10.74 0-.482-.045-.94-.125-1.383l-10.615-.091z" />
              </svg>
              Sign in with Google API
            </button>
          </div>

          <div className="mt-6 text-center text-xs">
            <button
              id="toggle_auth_mode"
              onClick={() => setIsLogin(!isLogin)}
              className="font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 focus:outline-hidden"
            >
              {isLogin ? "Need a student or teacher profile? Register now" : "Already have an institutional profile? Log in"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
