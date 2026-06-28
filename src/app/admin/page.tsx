'use strict';
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAdmin) {
        router.push('/admin/dashboard');
      } else {
        router.push('/admin/login');
      }
    }
  }, [isAdmin, loading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#080710]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-500 font-mono">Redirecting to administrator portal...</p>
      </div>
    </div>
  );
}
