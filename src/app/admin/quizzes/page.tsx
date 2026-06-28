'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { Quiz, Question } from '@/types';
import { 
  ClipboardList, Plus, Trash2, HelpCircle, Settings, Check, 
  Search, ArrowRight, Star, Shuffle, Eye, X, Loader2, AlertCircle 
} from 'lucide-react';

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // New Quiz Form states
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Quiz['difficulty']>('mixed');
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(80);
  
  // Selection method: 'manual' | 'auto'
  const [method, setMethod] = useState<'manual' | 'auto'>('manual');
  
  // Manual selection states
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-pull states
  const [autoCount, setAutoCount] = useState(5);
  const [autoTopic, setAutoTopic] = useState('all');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      api.initializeDB();
      const allQuizzes = await api.getQuizzes();
      const allQuestions = await api.getQuestions();
      setQuizzes(allQuizzes);
      setQuestions(allQuestions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
    );
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Please enter a quiz title.');
      return;
    }

    let finalQuestionIds: string[] = [];

    if (method === 'manual') {
      if (selectedQuestionIds.length === 0) {
        setFormError('Please select at least one question.');
        return;
      }
      finalQuestionIds = [...selectedQuestionIds];
    } else {
      // Auto-assembly logic
      let pool = [...questions];
      
      // Filter by topic if specified
      if (autoTopic !== 'all') {
        pool = pool.filter(q => q.topic === autoTopic);
      }

      // Filter by difficulty if specific, or pull split for mixed
      if (difficulty !== 'mixed') {
        pool = pool.filter(q => q.difficulty === difficulty);
      } else {
        // Mixed: Try to split evenly between easy, medium, and hard
        const easy = pool.filter(q => q.difficulty === 'easy');
        const medium = pool.filter(q => q.difficulty === 'medium');
        const hard = pool.filter(q => q.difficulty === 'hard');
        
        const splitCount = Math.ceil(autoCount / 3);
        const selectedEasy = easy.slice(0, splitCount);
        const selectedMedium = medium.slice(0, splitCount);
        const selectedHard = hard.slice(0, autoCount - selectedEasy.length - selectedMedium.length);
        
        pool = [...selectedEasy, ...selectedMedium, ...selectedHard];
      }

      // Slice to requested count
      const sliced = pool.slice(0, autoCount);
      if (sliced.length === 0) {
        setFormError('No matching questions found in bank for these criteria.');
        return;
      }

      finalQuestionIds = sliced.map(q => q.id);
    }

    setSaving(true);
    try {
      await api.createQuiz({
        title: title.trim(),
        difficulty,
        secondsPerQuestion,
        questionCount: finalQuestionIds.length,
        questionIds: finalQuestionIds
      });

      // Clear Form
      setTitle('');
      setSelectedQuestionIds([]);
      setSecondsPerQuestion(80);
      setMethod('manual');
      
      await loadData();
    } catch (err) {
      setFormError('Failed to assemble quiz.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (confirm('Are you sure you want to delete this quiz? Student attempts history for this quiz will remain active.')) {
      try {
        await api.deleteQuiz(id);
        await loadData();
      } catch (err) {
        console.error(err);
      }
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

  // Get unique topics for dropdown
  const topics = Array.from(new Set(questions.map(q => q.topic))).filter(Boolean);

  const filteredQuestions = questions.filter(q => 
    q.stem.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-display text-gray-100">Assemble Quizzes</h1>
        <p className="text-xs text-gray-500">Create new examinations by selecting questions manually or configuring auto-pull parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Active Quizzes List (Left Column - 5 cols) */}
        <section className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-400" />
            Active Quizzes ({quizzes.length})
          </h2>

          {loading ? (
            <div className="glass-panel rounded-3xl p-12 flex justify-center border border-white/5">
              <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
            </div>
          ) : quizzes.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-gray-500 text-xs border border-white/5">
              No quizzes assembled.
            </div>
          ) : (
            <div className="space-y-3.5">
              {quizzes.map((quiz) => (
                <div 
                  key={quiz.id}
                  className="glass-panel rounded-3xl p-5 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between"
                >
                  <div className="space-y-2 truncate pr-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-gray-200 truncate">{quiz.title}</h4>
                      {getDifficultyBadge(quiz.difficulty)}
                    </div>
                    <div className="flex gap-4 text-[10px] text-gray-500">
                      <span>{quiz.questionCount} Qs</span>
                      <span>•</span>
                      <span>Limit: {quiz.secondsPerQuestion}s/Q</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="p-2 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Creator Form (Right Column - 7 cols) */}
        <section className="lg:col-span-7 glass-panel rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
          
          <h2 className="text-sm font-bold font-display text-gray-200 mb-6 flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-400" />
            Assemble New Exam
          </h2>

          {formError && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateQuiz} className="space-y-6">
            
            {/* Title & Timing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Quiz Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Pharmacology Mock Quiz 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Timer Limit Override (Seconds per Q)</label>
                <input 
                  type="number"
                  min="30" max="300"
                  value={secondsPerQuestion}
                  onChange={(e) => setSecondsPerQuestion(Math.max(30, parseInt(e.target.value) || 80))}
                  className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Difficulty Badge */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Difficulty Profile</label>
                <select 
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full bg-[#16142e] border border-white/10 rounded-xl py-2 px-2 text-xs text-gray-300 focus:outline-none font-sans"
                >
                  <option value="easy">Easy (Definitions)</option>
                  <option value="medium">Medium (Clinical)</option>
                  <option value="hard">Hard (Advanced Cases)</option>
                  <option value="mixed">Mixed Split</option>
                </select>
              </div>

              {/* Selection Method Toggle */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Questions Pull Mode</label>
                <div className="flex gap-2 bg-[#16142e] border border-white/10 rounded-xl p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setMethod('manual')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all ${
                      method === 'manual' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Manual Select
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('auto')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all ${
                      method === 'auto' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Auto Assemble
                  </button>
                </div>
              </div>
            </div>

            {/* CONDITIONAL BOX: MANUAL SELECTION */}
            {method === 'manual' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Select Questions from Bank ({selectedQuestionIds.length} Selected)
                  </label>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#16142e] border border-white/10 rounded-lg py-1 pl-7 pr-2 text-[10px] text-gray-300 placeholder-gray-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border border-white/5 rounded-2xl max-h-48 overflow-y-auto divide-y divide-white/5 bg-purple-950/5">
                  {filteredQuestions.map((q) => {
                    const isChecked = selectedQuestionIds.includes(q.id);
                    return (
                      <div 
                        key={q.id}
                        onClick={() => handleToggleQuestionSelection(q.id)}
                        className={`p-3 text-xs cursor-pointer transition-all flex items-start gap-3 hover:bg-white/5 ${
                          isChecked ? 'bg-indigo-500/10' : ''
                        }`}
                      >
                        <div className={`h-4 w-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-white/20'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <p className="text-gray-300 line-clamp-1 leading-normal font-sans">{q.stem}</p>
                          <div className="flex gap-2 text-[9px] text-gray-500 font-semibold">
                            <span className="uppercase text-indigo-400">{q.difficulty}</span>
                            <span>•</span>
                            <span>{q.topic}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CONDITIONAL BOX: AUTO SELECTION */}
            {method === 'auto' && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Question Count</label>
                    <input 
                      type="number"
                      min="1" max="50"
                      value={autoCount}
                      onChange={(e) => setAutoCount(Math.max(1, parseInt(e.target.value) || 5))}
                      className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-gray-200 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Focus Topic</label>
                    <select 
                      value={autoTopic}
                      onChange={(e) => setAutoTopic(e.target.value)}
                      className="w-full bg-[#16142e] border border-white/10 rounded-xl py-1.5 px-2 text-xs text-gray-300 focus:outline-none font-sans"
                    >
                      <option value="all">Any/All Topics</option>
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 text-indigo-300 text-[10px] leading-relaxed">
                  💡 <strong>System Assembly Rule:</strong> The engine queries the Question Bank matching the Topic focus and selected Difficulty. For &ldquo;Mixed&rdquo; quizzes, the algorithm splits the quota evenly between Easy, Medium, and Hard pools.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Shuffle className="h-4 w-4" />
                  Assemble & Publish Quiz
                </>
              )}
            </button>

          </form>
        </section>

      </div>

    </div>
  );
}
