'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { Quiz, Attempt, Question, AttemptAnswer } from '@/types';
import { 
  ArrowLeft, CheckCircle2, XCircle, HelpCircle, 
  BookOpen, ChevronLeft, LayoutDashboard 
} from 'lucide-react';

export default function QuizReviewPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    attempt: Attempt;
    quiz: Quiz;
    questions: Question[];
    answers: AttemptAnswer[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadReview() {
      try {
        api.initializeDB();
        const reviewData = await api.getAttemptResults(attemptId);
        setData(reviewData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        router.push('/dashboard');
      }
    }

    if (!authLoading) {
      loadReview();
    }
  }, [user, authLoading, attemptId, router]);

  if (loading || !data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080710]">
        <div className="h-8 w-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const { attempt, quiz, questions, answers } = data;

  // Filter questions based on selected tab
  const filteredQuestions = questions.filter((q) => {
    const ans = answers.find(a => a.questionId === q.id);
    if (activeTab === 'correct') {
      return ans?.selectedOptionId && ans.isCorrect;
    }
    if (activeTab === 'incorrect') {
      return ans?.selectedOptionId && !ans.isCorrect;
    }
    if (activeTab === 'unanswered') {
      return !ans?.selectedOptionId;
    }
    return true; // all
  });

  return (
    <div className="min-h-screen flex flex-col font-sans pb-16 bg-[#080710] text-gray-100">
      
      {/* Navigation Header */}
      <header className="glass-panel border-x-0 border-t-0 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/quiz/${attemptId}/result`)}
            className="p-2 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-gray-200 transition-all"
            title="Back to Result"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold font-display text-gray-200 truncate max-w-xs md:max-w-md">
              Review: {quiz.title}
            </h1>
            <p className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">
              Score: {attempt.score}%
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600/20 text-purple-300 font-semibold text-xs transition-all"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </button>
      </header>

      {/* Main Review Section */}
      <main className="max-w-4xl w-full mx-auto px-4 md:px-6 py-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/5">
          {[
            { id: 'all', label: 'All Questions', count: questions.length },
            { id: 'correct', label: 'Correct', count: attempt.correctCount, color: 'text-emerald-400' },
            { id: 'incorrect', label: 'Incorrect', count: attempt.wrongCount, color: 'text-red-400' },
            { id: 'unanswered', label: 'Unanswered', count: attempt.unansweredCount, color: 'text-gray-400' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold font-display transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-white' : tab.color}>{tab.label}</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-black/20 text-[10px]">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Diagnostic Review Cards */}
        {filteredQuestions.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-white/5 text-gray-500 text-xs">
            No questions in this criteria category.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredQuestions.map((q, qIndex) => {
              const ans = answers.find(a => a.questionId === q.id);
              const isUnanswered = !ans?.selectedOptionId;
              const isCorrect = ans?.isCorrect || false;

              // Find overall absolute index in original quiz
              const originalIndex = questions.findIndex(orig => orig.id === q.id) + 1;

              return (
                <div 
                  key={q.id} 
                  className={`glass-panel rounded-3xl p-6 md:p-8 border relative overflow-hidden transition-all ${
                    isUnanswered 
                      ? 'border-gray-500/20'
                      : isCorrect 
                        ? 'border-emerald-500/20 bg-emerald-950/5'
                        : 'border-red-500/20 bg-red-950/5'
                  }`}
                >
                  {/* Glowing header indicators */}
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest font-mono">
                      Question {originalIndex}
                    </span>

                    {/* Result Pill */}
                    {isUnanswered ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold py-1 px-2.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                        <HelpCircle className="h-3 w-3" /> Unanswered
                      </span>
                    ) : isCorrect ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold py-1 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold py-1 px-2.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
                        <XCircle className="h-3 w-3" /> Incorrect
                      </span>
                    )}
                  </div>

                  {/* Question Stem */}
                  <div className="space-y-4 mb-6">
                    <h3 className="text-gray-200 leading-relaxed text-sm md:text-base font-medium font-sans">
                      {q.stem}
                    </h3>
                    {q.imageUrl && (
                      <div className="max-w-md rounded-2xl overflow-hidden border border-white/10 my-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={q.imageUrl} alt="Case Illustration" className="w-full h-auto object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Options List */}
                  <div className="space-y-3.5 mb-6">
                    {q.options.map((opt) => {
                      const isCorrectOption = opt.id === q.correctOptionId;
                      const isUserSelected = ans?.selectedOptionId === opt.id;

                      let borderClass = 'border-white/5 bg-purple-950/5';
                      let labelClass = 'bg-white/5 text-gray-400 border-white/10';

                      if (isCorrectOption) {
                        borderClass = 'border-emerald-500/35 bg-emerald-950/20 text-emerald-200';
                        labelClass = 'bg-emerald-400 text-gray-950 border-emerald-400';
                      } else if (isUserSelected && !isCorrectOption) {
                        borderClass = 'border-red-500/35 bg-red-950/20 text-red-200';
                        labelClass = 'bg-red-400 text-white border-red-400';
                      }

                      return (
                        <div key={opt.id} className="space-y-2">
                          <div className={`p-4 rounded-2xl border flex items-start gap-4 text-xs md:text-sm ${borderClass}`}>
                            <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${labelClass}`}>
                              {opt.label}
                            </span>
                            <div className="space-y-2 flex-1 leading-relaxed text-gray-200">
                              <span>{opt.text}</span>
                              {opt.imageUrl && (
                                <div className="max-w-xs rounded-xl overflow-hidden border border-white/10 mt-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={opt.imageUrl} alt={`Illustration Option ${opt.label}`} className="w-full h-auto object-cover" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Wrong option diagnostic feedback */}
                          {opt.explanationWrong && (isUserSelected || isCorrectOption) && (
                            <div className="pl-14 text-xs text-gray-400 leading-relaxed italic flex gap-1.5">
                              <span className="text-red-400/80 shrink-0 font-semibold uppercase tracking-widest text-[9px] mt-0.5">Note:</span>
                              <span>{opt.explanationWrong}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Core Diagnostic Explanation Box */}
                  <div className="p-4 rounded-2xl bg-purple-950/10 border border-purple-500/10 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-purple-400 font-semibold font-display uppercase tracking-wider text-[10px]">
                      <BookOpen className="h-3.5 w-3.5" />
                      Clinical Rationale (Correct Choice)
                    </div>
                    <p className="text-gray-300 leading-relaxed font-sans">
                      {q.explanationCorrect}
                    </p>
                  </div>

                  {/* Optional pacing analysis */}
                  {ans && (
                    <div className="mt-4 text-[10px] text-gray-500 text-right">
                      Time spent on this clinical decision: <span className="font-semibold text-gray-400">{ans.timeSpentSeconds} seconds</span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
