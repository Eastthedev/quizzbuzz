'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { 
  Stethoscope, Clock, ShieldCheck, ArrowRight, ArrowLeft, Calendar, Hourglass 
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [step, setStep] = useState(1);
  const [examDate, setExamDate] = useState('2026-11-15');
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.examDate) {
      setExamDate(user.examDate);
    }
  }, [user, router]);

  useEffect(() => {
    if (examDate) {
      const diff = new Date(examDate).getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      setDaysRemaining(days > 0 ? days : 0);
    }
  }, [examDate]);

  if (!user) return null;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save exam date in API
      await api.updateOnboardingExamDate(user.id, examDate);
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Background radial gradients */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="w-full max-w-2xl">
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-8 px-4">
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">
            Step {step} of 3
          </span>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step 
                    ? 'w-8 bg-purple-400' 
                    : s < step 
                      ? 'w-3 bg-purple-600/60' 
                      : 'w-3 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Content Box */}
        <div className="glass-panel rounded-3xl p-8 md:p-10 border border-white/5 shadow-2xl relative min-h-[420px] flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>

          {/* STEP 1: WELCOME & COUNTDOWN CONFIG */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/15 border border-purple-500/30 rounded-2xl text-purple-400">
                  <Stethoscope className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold font-display text-gray-100">
                    Welcome, Future Dr. {user.fullName.split(' ')[0]}!
                  </h1>
                  <p className="text-sm text-gray-400">Let&apos;s get you fully prepared to conquer the 3rd MBBS exam.</p>
                </div>
              </div>

              <blockquote className="p-4 rounded-2xl bg-purple-950/20 border-l-4 border-purple-400 text-gray-300 text-sm italic font-sans leading-relaxed">
                &ldquo;Pathology, Pharmacology, and Microbiology are the pillars of clinical diagnostics. You aren&apos;t just studying to pass a test; you are studying for your future patients. We believe in you!&rdquo;
              </blockquote>

              <div className="space-y-4 pt-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Target Exam Date
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative w-full sm:w-auto shrink-0">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <input 
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="bg-purple-950/20 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-gray-200 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 w-full font-sans"
                    />
                  </div>
                  {daysRemaining !== null && (
                    <div className="text-sm text-gray-300">
                      <span className="font-semibold text-purple-300 text-xl font-display">{daysRemaining}</span> days until your exam. Every day counts!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DUAL TIMER LOGIC EXPLAINER */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl text-indigo-400">
                  <Clock className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold font-display text-gray-100">
                    Understanding the CBT Timers
                  </h2>
                  <p className="text-sm text-gray-400">Our simulator mimics the dynamic pressure of real professional examinations.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mb-2 font-display">
                    <Hourglass className="h-4 w-4" />
                    Per-Question Countdown
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Each question has an individual 80s countdown. If this hits 0 with no answer selected, the test will automatically mark it unanswered and move to the next question.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/20 transition-all">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-2 font-display">
                    <Clock className="h-4 w-4" />
                    Overall Time Pool Saving
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    The overall timer starts with a bulk pool (e.g. 10 questions = 800s). If you answer a question early (say in 20s), only those 20s are deducted from the main pool. The unused 60s remain in the pool for harder questions!
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                <strong>Crucial Note:</strong> If the overall pool hits 0, the exam auto-submits immediately. You can flag questions for review and jump between them using the sidebar palette.
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM & PROCEED */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold font-display text-gray-100">
                    Ready to Begin?
                  </h2>
                  <p className="text-sm text-gray-400">Your study materials have been parsed by admin and are loaded in the questions bank.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed">
                  Your customized dashboard is ready. There, you can:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-xs text-gray-400 leading-relaxed">
                  <li>Monitor your test streaks (consecutive study days).</li>
                  <li>Initiate mock tests under realistic examiner rules.</li>
                  <li>Review comprehensive diagnostic reports explaining why incorrect distractors are wrong.</li>
                  <li>Read study guides parsed and uploaded by your examiners.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs">
                ✨ <strong>Encouragement Engine Active:</strong> A motivational line tailored to your performance will cheer you on after every mock trial.
              </div>
            </div>
          )}

          {/* Actions Nav bar */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
            <button
              onClick={handleBack}
              disabled={step === 1 || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
