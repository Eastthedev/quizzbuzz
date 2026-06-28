'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { Quiz, Attempt, EncouragementMessage } from '@/types';
import { 
  Flame, Calendar, ClipboardList, LogOut, Play, CalendarClock, 
  BookOpen, Star, RefreshCw, X, Award, ChevronRight, HelpCircle
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading, refreshUser } = useAuth();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [history, setHistory] = useState<(Attempt & { quizTitle: string; quizDifficulty: string })[]>([]);
  const [encouragement, setEncouragement] = useState<EncouragementMessage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      api.initializeDB();
      await refreshUser();
      const allQuizzes = await api.getQuizzes();
      const userAttempts = await api.getUserAttempts(user.id);
      
      setQuizzes(allQuizzes);
      setHistory(userAttempts);

      // Pick encouragement message based on the last attempt score
      let tier: 'celebrate' | 'good' | 'push' | 'comeback' = 'push';
      if (userAttempts.length > 0) {
        const lastScore = userAttempts[0].score;
        if (lastScore >= 85) tier = 'celebrate';
        else if (lastScore >= 65) tier = 'good';
        else if (lastScore >= 40) tier = 'push';
        else tier = 'comeback';
      }
      
      const msg = await api.getRandomEncouragement(tier);
      setEncouragement(msg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadDashboardData();
  }, [user?.id]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080710]">
        <div className="h-8 w-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate days remaining
  const daysRemaining = user.examDate && mounted
    ? Math.max(0, Math.ceil((new Date(user.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const handleStartTest = async (quizId: string) => {
    setStartingQuizId(quizId);
    try {
      const attempt = await api.startAttempt(quizId, user.id);
      router.push(`/quiz/${attempt.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setStartingQuizId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'easy':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Easy</span>;
      case 'medium':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">Medium</span>;
      case 'hard':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400">Hard</span>;
      case 'mixed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border border-purple-500/30 text-purple-300">
            Mixed
          </span>
        );
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 border border-gray-500/30 text-gray-400">{diff}</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans pb-12">
      {/* HEADER NAVBAR */}
      <header className="glass-panel border-x-0 border-t-0 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-400 shadow-md">
            🩺
          </div>
          <span className="text-xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-300">
            Future Dr. Prep
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-gray-200">{user.fullName}</p>
            <p className="text-xs text-gray-500">{user.examId}</p>
          </div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* ENCOURAGEMENT LAYER BANNER */}
        {encouragement && (
          <div className="glass-panel-glow rounded-3xl p-6 relative overflow-hidden border border-purple-500/20">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl font-serif select-none pointer-events-none">✨</div>
            <div className="flex items-start gap-4">
              <div className="text-3xl shrink-0">💡</div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest font-semibold text-purple-400">Encouragement Engine</span>
                <p className="text-gray-200 text-sm md:text-base italic leading-relaxed">
                  &ldquo;{encouragement.text}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* METRICS / STATS GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Streak Metric */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 relative overflow-hidden flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Current Streak</span>
              <span className="text-4xl font-extrabold font-display text-gray-100">{user.currentStreak} Days</span>
              <p className="text-xs text-gray-500">Longest Streak: {user.longestStreak} days</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/5 glow-pulse">
              <Flame className="h-8 w-8 fill-amber-500/20" />
            </div>
          </div>

          {/* Exam Date Countdown */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 relative overflow-hidden flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Exam Countdown</span>
              <span className="text-4xl font-extrabold font-display text-gray-100">
                {daysRemaining !== null ? `${daysRemaining} Days` : 'Set Date'}
              </span>
              <p className="text-xs text-gray-500">Target: {user.examDate || 'Not configured'}</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/5">
              <Calendar className="h-8 w-8" />
            </div>
          </div>

          {/* Average Mock Score */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 relative overflow-hidden flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Average CBT Score</span>
              <span className="text-4xl font-extrabold font-display text-gray-100">
                {history.length > 0 
                  ? `${Math.round(history.reduce((a, c) => a + c.score, 0) / history.length)}%` 
                  : '—'}
              </span>
              <p className="text-xs text-gray-500">From {history.length} completed mock attempts</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/5">
              <Award className="h-8 w-8" />
            </div>
          </div>
        </section>

        {/* STUDY TOOLS / CTA */}
        <section className="glass-panel rounded-3xl p-8 border border-white/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-purple-950/20 via-transparent to-indigo-950/15">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-gray-100">Ready to simulate an examination?</h2>
            <p className="text-sm text-gray-400 max-w-xl">
              Launch a timed CBT simulator session using authentic UNEC 3rd MBBS clinical questions in Pathology, Pharmacology, and Microbiology.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-purple-500/10 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 text-base"
          >
            <Play className="h-5 w-5 fill-white" />
            Start Mock Test
          </button>
        </section>

        {/* HISTORY & STATISTICS */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold font-display text-gray-200 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-purple-400" />
              Mock Attempt History
            </h2>
            <button 
              onClick={loadDashboardData}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="glass-panel rounded-3xl p-12 flex justify-center items-center border border-white/5">
              <div className="h-8 w-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-white/5 space-y-4">
              <div className="inline-flex p-4 rounded-full bg-white/5 text-gray-400">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-200">No mock tests completed yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Click the &ldquo;Start Mock Test&rdquo; button above to begin your first clinical exam simulation.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      <th className="py-4 px-6">Quiz Title</th>
                      <th className="py-4 px-6 text-center">Difficulty</th>
                      <th className="py-4 px-6 text-center">Correct Count</th>
                      <th className="py-4 px-6 text-center">Score</th>
                      <th className="py-4 px-6 text-center">Time Used</th>
                      <th className="py-4 px-6 text-center">Date</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                    {history.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-semibold text-gray-200 max-w-xs truncate">
                          {attempt.quizTitle}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {getDifficultyBadge(attempt.quizDifficulty)}
                        </td>
                        <td className="py-4 px-6 text-center text-xs text-gray-400">
                          {attempt.correctCount} / {attempt.totalQuestions}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`font-bold font-display text-base ${
                            attempt.score >= 85 
                              ? 'text-emerald-400' 
                              : attempt.score >= 65 
                                ? 'text-indigo-400' 
                                : attempt.score >= 40 
                                  ? 'text-amber-400' 
                                  : 'text-red-400'
                          }`}>
                            {attempt.score}%
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center text-xs text-gray-400">
                          {formatTime(attempt.timeUsedSeconds)}
                        </td>
                        <td className="py-4 px-6 text-center text-xs text-gray-400">
                          {mounted ? new Date(attempt.submittedAt!).toLocaleDateString(undefined, { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          }) : '—'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => router.push(`/quiz/${attempt.id}/review`)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            Review
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* QUIZ PICKER SELECTOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div 
            onClick={() => !startingQuizId && setIsModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="glass-panel w-full max-w-xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-bold font-display text-gray-200">Select Mock Quiz</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={startingQuizId !== null}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto">
              {quizzes.map((quiz) => (
                <div 
                  key={quiz.id}
                  className="p-4 rounded-2xl bg-purple-950/10 border border-white/5 hover:border-purple-500/35 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-gray-200 leading-tight">{quiz.title}</h4>
                      {getDifficultyBadge(quiz.difficulty)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
                        {quiz.questionCount} Questions
                      </span>
                      <span>•</span>
                      <span>{quiz.secondsPerQuestion}s limit/Q</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartTest(quiz.id)}
                    disabled={startingQuizId !== null}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
                  >
                    {startingQuizId === quiz.id ? (
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        Simulate
                        <Play className="h-3 w-3 fill-white" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white/5 text-[11px] text-gray-500 text-center border-t border-white/5">
              Warning: Starting a test sets the exam timers. Autocomplete runs if idle.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
