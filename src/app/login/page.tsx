'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Stethoscope, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAdmin, loginUser, loading } = useAuth();
  
  const [examId, setExamId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    } else if (isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [user, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!examId.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await loginUser(examId.trim(), password);
      if (success) {
        // Check if onboarding needs to be shown (simulated: first login if examDate is not set)
        // We will read it from what is returned
        const checkUser = JSON.parse(localStorage.getItem('cbt_current_user') || '{}');
        if (!checkUser.examDate) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError('Incorrect Exam ID or Password. Try again, Dr.!');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-height-screen min-h-screen flex-col items-center justify-center p-4">
      {/* Decorative glowing background blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-4 shadow-lg shadow-purple-500/5 glow-pulse">
            <Stethoscope className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-purple-100 to-indigo-300">
            CBT Exam Prep
          </h1>
          <p className="mt-2 text-sm text-gray-400 font-sans">
            Ready to crush the 3rd MBBS? Let&apos;s get you exam-ready.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
          
          <h2 className="text-xl font-semibold text-gray-200 mb-6 font-display">Student Portal</h2>
          
          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Exam / Student ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. unec/mbbs/2026/042 or 'student'"
                  value={examId}
                  onChange={(e) => setExamId(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 rounded-2xl bg-purple-950/20 border border-white/10 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all font-sans text-sm"
                  disabled={loading || isSubmitting}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  placeholder="Enter your password (e.g. 'password')"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 rounded-2xl bg-purple-950/20 border border-white/10 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all font-sans text-sm"
                  disabled={loading || isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Enter Dashboard
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info for easy testing */}
        <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Quick credentials: Use Student ID <code className="text-purple-300">student</code> & Password <code className="text-purple-300">password</code>.
            <br />
            For Admin, access the admin panel via <a href="/admin/login" className="text-indigo-400 hover:underline">Admin Login</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
