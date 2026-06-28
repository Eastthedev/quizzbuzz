'use strict';
'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { 
  LayoutDashboard, FileText, Database, ShieldAlert, Sparkles,
  ClipboardList, Heart, LogOut, Loader2, Menu
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, loading, logout } = useAuth();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!loading && !isAdmin && !isLoginPage) {
      router.push('/admin/login');
    }
  }, [isAdmin, loading, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !isAdmin) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080710]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-xs text-gray-500 font-mono">Authenticating credentials...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Study Materials', path: '/admin/materials', icon: FileText },
    { label: 'AI Generator', path: '/admin/generate', icon: Sparkles },
    { label: 'Questions Bank', path: '/admin/questions', icon: Database },
    { label: 'Assemble Quizzes', path: '/admin/quizzes', icon: ClipboardList },
    { label: 'Encouragement CRM', path: '/admin/encouragement', icon: Heart },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#080710] font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#0f0d1e]/85 backdrop-blur-md border-r border-white/5 flex flex-col justify-between shrink-0 sticky top-0 h-auto md:h-screen z-40">
        <div>
          {/* Logo panel */}
          <div className="p-6 border-b border-white/5 flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-md">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span className="text-base font-bold font-display text-gray-200 uppercase tracking-wider">
              CBT Manager
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold font-display transition-all ${
                    isActive
                      ? 'bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 shadow-md shadow-indigo-500/5'
                      : 'text-gray-400 border border-transparent hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User bottom panel */}
        <div className="p-4 border-t border-white/5 flex flex-col gap-2">
          <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Active Role</p>
            <p className="text-xs font-bold text-gray-300">Administrator</p>
          </div>
          
          <button
            onClick={() => { logout(); router.push('/admin/login'); }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold font-display text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ADMIN CONTENT WRAPPER */}
      <div className="flex-1 overflow-y-auto max-h-screen px-4 md:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
