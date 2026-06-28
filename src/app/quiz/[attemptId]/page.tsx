'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { Quiz, Question, Attempt, AttemptAnswer } from '@/types';
import { 
  Clock, Flag, AlertTriangle, ChevronLeft, ChevronRight, 
  CheckCircle, Columns, X, RefreshCw 
} from 'lucide-react';

export default function ActiveQuizPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const { user, loading: authLoading } = useAuth();

  // Data states
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Navigation & Interactive states
  const [currIndex, setCurrIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({}); // questionId -> selectedOptionId
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({}); // questionId -> boolean
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Timer states (drift-corrected)
  const [overallPool, setOverallPool] = useState<number>(0); // committed pool seconds remaining
  const [qElapsed, setQElapsed] = useState<number>(0); // active elapsed seconds on current question
  const [secondsPerQuestion, setSecondsPerQuestion] = useState<number>(80);

  // Timer refs for drift correction
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(0);
  const accumQuestionTimeRef = useRef<Record<string, number>>({}); // questionId -> accumulated seconds spent

  // Loading Attempt details
  useEffect(() => {
    async function loadAttemptData() {
      if (!user) return;
      try {
        api.initializeDB();
        const attData = await api.getAttempt(attemptId);
        if (!attData) {
          router.push('/dashboard');
          return;
        }

        // If already submitted, redirect to result
        if (attData.submittedAt) {
          router.push(`/quiz/${attemptId}/result`);
          return;
        }

        const quizData = await api.getQuiz(attData.quizId);
        if (!quizData) {
          router.push('/dashboard');
          return;
        }

        const loadedQuestions = attData.questions || [];
        setAttempt(attData);
        setQuiz(quizData);
        setQuestions(loadedQuestions);
        setSecondsPerQuestion(quizData.secondsPerQuestion || 80);

        // Resume state if exists
        const answersStore = localStorage.getItem('cbt_answers_store');
        if (answersStore) {
          const store = JSON.parse(answersStore);
          const attemptAnswers: AttemptAnswer[] = store[attemptId] || [];
          
          const answersMap: Record<string, string> = {};
          const timeSpentMap: Record<string, number> = {};
          
          attemptAnswers.forEach(ans => {
            if (ans.selectedOptionId) {
              answersMap[ans.questionId] = ans.selectedOptionId;
            }
            timeSpentMap[ans.questionId] = ans.timeSpentSeconds || 0;
          });

          setSelectedAnswers(answersMap);
          accumQuestionTimeRef.current = timeSpentMap;
        }

        // Load overall time pool remaining from saved state
        const remainingPool = attData.overallTimeRemainingAtSave ?? (loadedQuestions.length * quizData.secondsPerQuestion);
        setOverallPool(remainingPool);

        // Initialize question clock variables
        questionStartTimeRef.current = Date.now();
        setQElapsed(0);

        setLoading(false);
      } catch (err) {
        console.error(err);
        router.push('/dashboard');
      }
    }
    
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadAttemptData();
      }
    }
  }, [user, authLoading, attemptId, router]);

  // Main Timer loop
  useEffect(() => {
    if (loading || !attempt) return;

    questionStartTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - questionStartTimeRef.current) / 1000);
      setQElapsed(elapsed);

      // Total time spent on this question includes previous visits
      const currentQuestionId = questions[currIndex]?.id;
      const prevSpent = accumQuestionTimeRef.current[currentQuestionId] || 0;
      const totalQuestionSpent = elapsed + prevSpent;

      // 1. Check if overall pool is depleted
      const displayedOverallRemaining = overallPool - elapsed;
      if (displayedOverallRemaining <= 0) {
        clearInterval(timerIntervalRef.current!);
        handleAutoSubmit();
        return;
      }

      // 2. Check if current question timer has expired
      if (elapsed >= secondsPerQuestion) {
        // Auto-advance
        handleQuestionTimeOut();
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [loading, currIndex, overallPool, secondsPerQuestion]);

  // Periodic Auto-save (heartbeat)
  useEffect(() => {
    if (loading || !attempt) return;

    const heartbeatInterval = setInterval(() => {
      const answersList = questions.map(q => {
        const spent = (accumQuestionTimeRef.current[q.id] || 0) + (q.id === questions[currIndex]?.id ? qElapsed : 0);
        return {
          questionId: q.id,
          selectedOptionId: selectedAnswers[q.id] || undefined,
          timeSpentSeconds: spent
        };
      });

      const currentQTimeSpent = qElapsed;
      const remainingOverall = Math.max(0, overallPool - currentQTimeSpent);
      const totalUsed = questions.reduce((acc, q) => acc + (accumQuestionTimeRef.current[q.id] || 0), 0) + currentQTimeSpent;

      api.saveAttemptHeartbeat(attemptId, {
        overallTimeRemaining: remainingOverall,
        timeUsedSeconds: totalUsed,
        answers: answersList
      });
    }, 5000);

    return () => clearInterval(heartbeatInterval);
  }, [loading, currIndex, qElapsed, selectedAnswers, overallPool, questions]);

  if (loading || !attempt) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080710]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 font-sans">Loading simulation state...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currIndex];

  // Helper to commit time spent on current question when leaving it
  const commitCurrentQuestionTime = () => {
    const qId = currentQuestion.id;
    accumQuestionTimeRef.current[qId] = (accumQuestionTimeRef.current[qId] || 0) + qElapsed;
    
    // Deduct from overall pool
    setOverallPool(prev => Math.max(0, prev - qElapsed));
    setQElapsed(0);
    questionStartTimeRef.current = Date.now();
  };

  const handleNext = () => {
    if (currIndex < questions.length - 1) {
      commitCurrentQuestionTime();
      setCurrIndex(currIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currIndex > 0) {
      commitCurrentQuestionTime();
      setCurrIndex(currIndex - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    commitCurrentQuestionTime();
    setCurrIndex(index);
  };

  const handleSelectOption = (optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionId
    }));
  };

  const toggleFlag = () => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id]
    }));
  };

  const handleQuestionTimeOut = () => {
    // 1. Commit full secondsPerQuestion spent on this question
    const qId = currentQuestion.id;
    accumQuestionTimeRef.current[qId] = (accumQuestionTimeRef.current[qId] || 0) + secondsPerQuestion;
    setOverallPool(prev => Math.max(0, prev - secondsPerQuestion));
    setQElapsed(0);

    // 2. If it's the last question, open submit modal. Otherwise, advance.
    if (currIndex < questions.length - 1) {
      setCurrIndex(currIndex + 1);
    } else {
      setIsSubmitModalOpen(true);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      // Commit final time
      const finalQId = currentQuestion.id;
      accumQuestionTimeRef.current[finalQId] = (accumQuestionTimeRef.current[finalQId] || 0) + qElapsed;

      const answersPayload = questions.map(q => {
        return {
          questionId: q.id,
          selectedOptionId: selectedAnswers[q.id] || undefined,
          timeSpentSeconds: accumQuestionTimeRef.current[q.id] || 0
        };
      });

      await api.submitAttempt(attemptId, answersPayload);
      router.push(`/quiz/${attemptId}/result`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    setSubmitting(true);
    try {
      // Auto-submit whatever answers are saved so far
      const finalQId = currentQuestion.id;
      accumQuestionTimeRef.current[finalQId] = (accumQuestionTimeRef.current[finalQId] || 0) + qElapsed;

      const answersPayload = questions.map(q => ({
        questionId: q.id,
        selectedOptionId: selectedAnswers[q.id] || undefined,
        timeSpentSeconds: accumQuestionTimeRef.current[q.id] || 0
      }));

      await api.submitAttempt(attemptId, answersPayload);
      router.push(`/quiz/${attemptId}/result`);
    } catch (err) {
      console.error(err);
    }
  };

  // Compute displayed timers
  const displayedQuestionRemaining = Math.max(0, secondsPerQuestion - qElapsed);
  const displayedOverallRemaining = Math.max(0, overallPool - qElapsed);
  const isOverallWarning = displayedOverallRemaining < 60;

  // Unanswered count for the modal checklist
  const unansweredCount = questions.filter(q => !selectedAnswers[q.id]).length;

  // SVG circular properties for question timer
  const svgRadius = 24;
  const svgCircumference = 2 * Math.PI * svgRadius;
  const svgStrokeDashoffset = svgCircumference - (displayedQuestionRemaining / secondsPerQuestion) * svgCircumference;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#080710] text-gray-100">
      
      {/* ACTIVE TEST HEADER BAR */}
      <header className="glass-panel border-x-0 border-t-0 py-4 px-6 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-md uppercase tracking-wider">
            MBBS CBT
          </span>
          <h2 className="text-sm font-bold font-display text-gray-300 hidden sm:block truncate max-w-xs md:max-w-md">
            {quiz?.title}
          </h2>
        </div>

        {/* Timers Container */}
        <div className="flex items-center gap-6">
          {/* Question Level Timer */}
          <div className="flex items-center gap-2">
            <div className="relative h-10 w-10 flex items-center justify-center">
              <svg className="absolute -rotate-90 w-full h-full">
                <circle 
                  cx="20" cy="20" r={svgRadius}
                  className="stroke-white/10 fill-none"
                  strokeWidth="2.5"
                />
                <circle 
                  cx="20" cy="20" r={svgRadius}
                  className="stroke-purple-400 fill-none transition-all duration-1000 ease-linear"
                  strokeWidth="2.5"
                  strokeDasharray={svgCircumference}
                  strokeDashoffset={svgStrokeDashoffset}
                />
              </svg>
              <span className="text-[10px] font-bold font-mono text-purple-300">
                {displayedQuestionRemaining}s
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold hidden md:inline">Q-Clock</span>
          </div>

          {/* Overall Timer */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
            isOverallWarning 
              ? 'bg-red-500/15 border-red-500/40 text-red-400 warning-pulse' 
              : 'bg-white/5 border-white/5 text-gray-200'
          }`}>
            <Clock className={`h-4 w-4 ${isOverallWarning ? 'animate-pulse' : 'text-purple-400'}`} />
            <span className="text-sm font-bold font-mono">
              {formatTimer(displayedOverallRemaining)}
            </span>
          </div>
        </div>
      </header>

      {/* CORE LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6 overflow-hidden">
        
        {/* QUESTION PANEL (Left Side) */}
        <main className="flex-1 flex flex-col justify-between glass-panel rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl relative min-h-[480px]">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
          
          <div>
            {/* Top Navigation metadata */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">
                Question {currIndex + 1} of {questions.length}
              </span>
              
              <button
                onClick={toggleFlag}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  flaggedQuestions[currentQuestion.id]
                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-400'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Flag className={`h-3.5 w-3.5 ${flaggedQuestions[currentQuestion.id] ? 'fill-amber-500/20' : ''}`} />
                {flaggedQuestions[currentQuestion.id] ? 'Flagged' : 'Flag'}
              </button>
            </div>

            {/* Question Stem */}
            <div className="space-y-4">
              <h3 className="text-base md:text-lg text-gray-200 font-sans leading-relaxed font-medium">
                {currentQuestion.stem}
              </h3>
              
              {/* Optional Question Image */}
              {currentQuestion.imageUrl && (
                <div className="max-w-md rounded-2xl overflow-hidden border border-white/10 my-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentQuestion.imageUrl} alt="Clinical Case Illustration" className="w-full h-auto object-cover" />
                </div>
              )}
            </div>

            {/* Options List */}
            <div className="mt-8 space-y-3.5">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 option-card ${
                      isSelected
                        ? 'bg-purple-500/10 border-purple-400 text-purple-200 shadow-md shadow-purple-500/5'
                        : 'bg-purple-950/10 border-white/5 text-gray-300'
                    }`}
                  >
                    <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold font-display border transition-colors ${
                      isSelected
                        ? 'bg-purple-400 text-gray-950 border-purple-400'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                      {opt.label}
                    </span>
                    <div className="space-y-2 flex-1">
                      <span className="text-sm md:text-base leading-relaxed">{opt.text}</span>
                      {opt.imageUrl && (
                        <div className="max-w-xs rounded-xl overflow-hidden border border-white/10 mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={opt.imageUrl} alt={`Illustration Option ${opt.label}`} className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5 gap-4">
            <button
              onClick={handlePrev}
              disabled={currIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/5 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            {currIndex < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-all"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg transition-all"
              >
                Submit Exam
                <CheckCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </main>

        {/* SIDEBAR QUESTION PALETTE GRID */}
        <aside className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="glass-panel rounded-3xl p-5 border border-white/5 shadow-xl relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent"></div>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase tracking-widest font-semibold text-gray-400">Questions Palette</span>
              <Columns className="h-4 w-4 text-purple-400" />
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isCurrent = idx === currIndex;
                const isAnswered = !!selectedAnswers[q.id];
                const isFlagged = flaggedQuestions[q.id];

                let buttonClass = 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10';
                if (isCurrent) {
                  buttonClass = 'border-purple-400 bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/30';
                } else if (isFlagged) {
                  buttonClass = 'border-amber-500/30 bg-amber-500/10 text-amber-400';
                } else if (isAnswered) {
                  buttonClass = 'border-purple-500/30 bg-purple-950/20 text-purple-300';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`h-10 rounded-xl border flex items-center justify-center text-xs font-bold font-mono transition-all relative ${buttonClass}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend guide */}
            <div className="flex gap-4 justify-between mt-6 pt-4 border-t border-white/5 text-[10px] text-gray-500 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                Answered
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Flagged
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/10 border border-white/20"></span>
                Untouched
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* FINAL SUBMIT CONFIRMATION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => !submitting && setIsSubmitModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="glass-panel w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden z-10 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>

            <div className="text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-gray-200">Submit Simulation?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                You are about to submit your CBT mock test answers. Once submitted, your clinical score and explanations review will lock.
              </p>
            </div>

            {/* Checklist */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-gray-300 space-y-2">
              <div className="flex justify-between items-center">
                <span>Total Questions:</span>
                <span className="font-semibold text-gray-200">{questions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Completed Answers:</span>
                <span className="font-semibold text-purple-300">{questions.length - unansweredCount}</span>
              </div>
              {unansweredCount > 0 ? (
                <div className="flex justify-between items-center text-amber-400">
                  <span>Unanswered Remaining:</span>
                  <span className="font-bold">{unansweredCount}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Unanswered Remaining:</span>
                  <span className="font-bold">0 (Nice!)</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-sm text-gray-400 hover:text-gray-200 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold shadow-lg transition-all"
              >
                {submitting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : (
                  'Yes, Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
