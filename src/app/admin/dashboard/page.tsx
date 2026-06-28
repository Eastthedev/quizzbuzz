'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { User } from '@/types';
import { 
  FileText, Database, Users, CalendarClock, ChevronRight, 
  Search, ClipboardList, TrendingUp, Award, RefreshCw, X, HelpCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserStats extends User {
  attemptCount: number;
  averageScore: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{
    totalMaterials: number;
    totalQuestions: number;
    users: UserStats[];
  } | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [userAttempts, setUserAttempts] = useState<(any)[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      api.initializeDB();
      const data = await api.getAdminDashboardStats();
      setStats(data);
      
      // Auto select first user if exists
      if (data.users.length > 0) {
        handleSelectUser(data.users[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadStats();
  }, []);

  const handleSelectUser = async (user: UserStats) => {
    setSelectedUser(user);
    setAttemptsLoading(true);
    try {
      const attempts = await api.getUserAttempts(user.id);
      setUserAttempts(attempts);
    } catch (err) {
      console.error(err);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'easy':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Easy</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">Medium</span>;
      case 'hard':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 border border-red-500/30 text-red-400">Hard</span>;
      case 'mixed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">Mixed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/10 border border-gray-500/30 text-gray-400">{diff}</span>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading || !stats) {
    return (
      <div className="flex h-[80vh] justify-center items-center">
        <div className="h-8 w-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      
      {/* Page Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-100">Management Overview</h1>
          <p className="text-xs text-gray-500">Monitor curriculum size and review student progress metrics.</p>
        </div>
        <button 
          onClick={loadStats}
          className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-gray-200 transition-all"
          title="Refresh stats"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* METRIC PANELS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Question Bank</span>
            <span className="text-3xl font-extrabold font-display text-gray-100">{stats.totalQuestions} Questions</span>
            <p className="text-xs text-gray-500">Active medical case questions</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Database className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Study Materials</span>
            <span className="text-3xl font-extrabold font-display text-gray-100">{stats.totalMaterials} Files</span>
            <p className="text-xs text-gray-500">PDFs, slide files, text documents</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Total Students</span>
            <span className="text-3xl font-extrabold font-display text-gray-100">{stats.users.length} Active</span>
            <p className="text-xs text-gray-500">Linked student prep profiles</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </section>

      {/* TWO COLUMN INTERACTIVE METRIC AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Student Directory (Left Column - 4 cols) */}
        <section className="lg:col-span-4 space-y-4">
          <h2 className="text-sm font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" />
            Students Directory
          </h2>

          <div className="space-y-3.5">
            {stats.users.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full text-left p-4 rounded-3xl border transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-indigo-500/15 border-indigo-400/50 shadow-md'
                      : 'bg-purple-950/10 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-1 truncate pr-2">
                    <h4 className="font-semibold text-sm text-gray-200 group-hover:text-indigo-300 transition-colors">
                      {user.fullName}
                    </h4>
                    <p className="text-[10px] text-gray-500 truncate">{user.examId}</p>
                    <div className="flex gap-2 items-center pt-1.5 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5">🔥 {user.currentStreak}d</span>
                      <span>•</span>
                      <span>Avg: {user.averageScore}%</span>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-gray-500 shrink-0 group-hover:text-indigo-400 transition-all ${
                    isSelected ? 'translate-x-1 text-indigo-400' : ''
                  }`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Attempts reports drilldown (Right Column - 8 cols) */}
        <section className="lg:col-span-8 space-y-4">
          {selectedUser ? (
            <div className="glass-panel rounded-3xl border border-white/5 p-6 space-y-6 shadow-xl relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>

              {/* Student Overview Header */}
              <div className="flex justify-between items-start pb-4 border-b border-white/5 flex-wrap gap-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Diagnostic Report</span>
                  <h3 className="text-lg font-bold font-display text-gray-200">{selectedUser.fullName}</h3>
                  <p className="text-xs text-gray-500">Exam Target: {selectedUser.examDate || 'Not configured'}</p>
                </div>
                
                <div className="flex gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Total Attempts</span>
                    <span className="text-lg font-extrabold text-gray-200">{selectedUser.attemptCount}</span>
                  </div>
                  <div className="text-right border-l border-white/5 pl-4">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Grade Average</span>
                    <span className={`text-lg font-extrabold ${
                      selectedUser.averageScore >= 85
                        ? 'text-emerald-400'
                        : selectedUser.averageScore >= 65
                          ? 'text-indigo-400'
                          : selectedUser.averageScore >= 40
                            ? 'text-amber-400'
                            : 'text-red-400'
                    }`}>{selectedUser.averageScore}%</span>
                  </div>
                </div>
              </div>

              {/* Attempts list */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Simulation Logs</h4>

                {attemptsLoading ? (
                  <div className="py-12 flex justify-center items-center">
                    <div className="h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : userAttempts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500">
                    No simulation records completed by this student.
                  </div>
                ) : (
                  <div className="overflow-hidden border border-white/5 rounded-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/5 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">Quiz Title</th>
                            <th className="py-3 px-4 text-center">Difficulty</th>
                            <th className="py-3 px-4 text-center">Score</th>
                            <th className="py-3 px-4 text-center">Time Spent</th>
                            <th className="py-3 px-4 text-center">Date</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                          {userAttempts.map((attempt) => (
                            <tr key={attempt.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4 font-semibold text-gray-200 truncate max-w-[180px]">
                                {attempt.quizTitle}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {getDifficultyBadge(attempt.quizDifficulty)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`font-bold ${
                                  attempt.score >= 85
                                    ? 'text-emerald-400'
                                    : attempt.score >= 65
                                      ? 'text-indigo-400'
                                      : attempt.score >= 40
                                        ? 'text-amber-400'
                                        : 'text-red-400'
                                }`}>{attempt.score}%</span>
                              </td>
                              <td className="py-3 px-4 text-center text-gray-500">
                                {formatTime(attempt.timeUsedSeconds)}
                              </td>
                              <td className="py-3 px-4 text-center text-gray-500">
                                {mounted ? new Date(attempt.submittedAt).toLocaleDateString(undefined, {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                }) : '—'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => router.push(`/quiz/${attempt.id}/review`)}
                                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-white/5 p-12 text-center text-gray-500 text-xs">
              Select a student to load diagnostics.
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
