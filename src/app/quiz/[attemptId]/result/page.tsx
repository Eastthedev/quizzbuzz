'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { Quiz, Attempt, EncouragementMessage } from '@/types';
import { 
  Award, CheckCircle2, XCircle, HelpCircle, Clock, 
  BookOpen, LayoutDashboard, ArrowRight 
} from 'lucide-react';

export default function QuizResultPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    attempt: Attempt;
    quiz: Quiz;
    encouragement: EncouragementMessage;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadResult() {
      try {
        api.initializeDB();
        const data = await api.getAttemptResults(attemptId);
        setResult(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        router.push('/dashboard');
      }
    }

    if (!authLoading) {
      loadResult();
    }
  }, [user, authLoading, attemptId, router]);

  if (loading || !result) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080710]">
        <div className="h-8 w-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { attempt, quiz, encouragement } = result;

  const totalSecondsAllocated = attempt.totalQuestions * quiz.secondsPerQuestion;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Score tier color profiles
  let scoreColor = 'text-red-400';
  let badgeColor = 'bg-red-500/10 border-red-500/20 text-red-400';
  let bannerEmoji = '💪';
  
  if (attempt.score >= 85) {
    scoreColor = 'text-emerald-400';
    badgeColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    bannerEmoji = '🎉';
  } else if (attempt.score >= 65) {
    scoreColor = 'text-indigo-400';
    badgeColor = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
    bannerEmoji = '⭐';
  } else if (attempt.score >= 40) {
    scoreColor = 'text-amber-400';
    badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    bannerEmoji = '📚';
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Glowing background details */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="w-full max-w-2xl space-y-6">
        
        {/* ENCOURAGEMENT CARD */}
        <div className="glass-panel-glow rounded-3xl p-6 border border-purple-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl select-none pointer-events-none">
            {bannerEmoji}
          </div>
          <div className="flex items-start gap-4">
            <div className="text-3xl shrink-0">💬</div>
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest font-semibold text-purple-400">Dr. Encouragement Core</span>
              <p className="text-gray-200 text-sm md:text-base italic leading-relaxed font-sans">
                &ldquo;{encouragement.text}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* RESULTS CARD */}
        <div className="glass-panel rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>

          <div className="text-center pb-6 border-b border-white/5">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold mb-3 ${badgeColor}`}>
              Attempt Report
            </span>
            <h1 className="text-xl md:text-2xl font-bold font-display text-gray-200 truncate">
              {quiz.title}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 items-center justify-center">
            
            {/* Score Ring Display */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="absolute -rotate-90 w-full h-full">
                  <circle 
                    cx="64" cy="64" r="56"
                    className="stroke-white/5 fill-none"
                    strokeWidth="8"
                  />
                  <circle 
                    cx="64" cy="64" r="56"
                    className={`fill-none transition-all duration-1000 ${
                      attempt.score >= 85 
                        ? 'stroke-emerald-400' 
                        : attempt.score >= 65 
                          ? 'stroke-indigo-400' 
                          : attempt.score >= 40 
                            ? 'stroke-amber-400' 
                            : 'stroke-red-400'
                    }`}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={(2 * Math.PI * 56) - (attempt.score / 100) * (2 * Math.PI * 56)}
                  />
                </svg>
                <div className="text-center z-10">
                  <span className={`text-3xl font-extrabold font-display ${scoreColor}`}>
                    {attempt.score}%
                  </span>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Score</p>
                </div>
              </div>
            </div>

            {/* Metrics Checklist details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Correct</p>
                    <p className="text-sm font-bold text-gray-200">{attempt.correctCount}</p>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Incorrect</p>
                    <p className="text-sm font-bold text-gray-200">{attempt.wrongCount}</p>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Unanswered</p>
                    <p className="text-sm font-bold text-gray-200">{attempt.unansweredCount}</p>
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-purple-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Time Spent</p>
                    <p className="text-sm font-bold text-gray-200">{formatTime(attempt.timeUsedSeconds)}</p>
                  </div>
                </div>

              </div>

              {/* Time utilization detail bar */}
              <div className="pt-2">
                <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">
                  <span>Pacing Analytics</span>
                  <span>{Math.round((attempt.timeUsedSeconds / totalSecondsAllocated) * 100)}% of pool used</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-purple-500/80 rounded-full" 
                    style={{ width: `${Math.min(100, (attempt.timeUsedSeconds / totalSecondsAllocated) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-6 border-t border-white/5">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-3 px-4 rounded-2xl border border-white/5 hover:bg-white/5 text-gray-300 hover:text-white transition-all font-semibold text-sm flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push(`/quiz/${attemptId}/review`)}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white transition-all font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25"
            >
              <BookOpen className="h-4 w-4" />
              Review Answers
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
