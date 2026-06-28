'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { Question } from '@/types';
import { 
  Database, Trash2, Edit2, Filter, Search, Plus, 
  ChevronDown, ChevronUp, Check, X, AlertCircle, RefreshCw, Loader2 
} from 'lucide-react';

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter states
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  // Edit Modal states
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  // Accordion lists
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadQuestions = async () => {
    try {
      api.initializeDB();
      const data = await api.getQuestions();
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this question? It will be removed from all quizzes.')) {
      try {
        await api.deleteQuestion(id);
        await loadQuestions();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEditClick = (q: Question) => {
    // Deep clone to avoid mutating local state before saving
    setEditingQuestion(JSON.parse(JSON.stringify(q)));
    setModalError('');
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    setModalError('');

    if (!editingQuestion.stem.trim()) {
      setModalError('Stem text cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      await api.updateQuestion(editingQuestion);
      setEditingQuestion(null);
      await loadQuestions();
    } catch (err) {
      setModalError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Inline edit handlers for modal
  const handleModalOptionText = (oIdx: number, val: string) => {
    if (!editingQuestion) return;
    const updatedOpts = editingQuestion.options.map((opt, idx) => 
      idx === oIdx ? { ...opt, text: val } : opt
    );
    setEditingQuestion({ ...editingQuestion, options: updatedOpts });
  };

  const handleModalOptionExplanation = (oIdx: number, val: string) => {
    if (!editingQuestion) return;
    const updatedOpts = editingQuestion.options.map((opt, idx) => 
      idx === oIdx ? { ...opt, explanationWrong: val } : opt
    );
    setEditingQuestion({ ...editingQuestion, options: updatedOpts });
  };

  const handleModalSelectCorrectOption = (oIdx: number) => {
    if (!editingQuestion) return;
    const correctOptionId = editingQuestion.options[oIdx].id;
    
    // Clear wrong explanation on the new correct choice
    const updatedOpts = editingQuestion.options.map((opt, idx) => 
      idx === oIdx ? { ...opt, explanationWrong: undefined } : opt
    );

    setEditingQuestion({
      ...editingQuestion,
      correctOptionId,
      options: updatedOpts
    });
  };

  // Get unique topics for filters
  const topics = Array.from(new Set(questions.map(q => q.topic))).filter(Boolean);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.stem.toLowerCase().includes(search.toLowerCase()) || 
                          q.topic.toLowerCase().includes(search.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    const matchesTopic = topicFilter === 'all' || q.topic === topicFilter;
    
    return matchesSearch && matchesDifficulty && matchesTopic;
  });

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-display text-gray-100">Questions Bank</h1>
        <p className="text-xs text-gray-500">Browse, filter, edit, or delete items within the medical exam database.</p>
      </div>

      {/* FILTER CONTROLS BAR */}
      <section className="glass-panel rounded-3xl p-5 border border-white/5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by keywords or topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-purple-950/20 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-gray-300 placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            {/* Topic Filter */}
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <select 
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="bg-[#16142e] border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none font-sans flex-1"
              >
                <option value="all">All Topics</option>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2 flex-1 md:flex-initial">
              <select 
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-[#16142e] border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none font-sans flex-1"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <button 
              onClick={loadQuestions}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-gray-200 transition-all shrink-0"
              title="Refresh bank"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

        </div>
      </section>

      {/* QUESTIONS ACCORDION LIST */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <span className="text-xs uppercase tracking-widest font-semibold text-gray-400">
            Active Questions ({filteredQuestions.length})
          </span>
        </div>

        {loading ? (
          <div className="glass-panel rounded-3xl p-12 flex justify-center items-center border border-white/5">
            <div className="h-8 w-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-gray-500 text-xs border border-white/5">
            No questions match the filter criteria.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const isExpanded = expandedId === q.id;
              return (
                <div 
                  key={q.id}
                  className="glass-panel rounded-3xl border border-white/5 overflow-hidden hover:border-white/10 transition-all"
                >
                  {/* Collapsible header */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="space-y-1.5 pr-4 truncate">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-[10px] font-bold font-mono text-purple-400">ID: {q.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                          q.difficulty === 'easy'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : q.difficulty === 'medium'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold">{q.topic}</span>
                      </div>
                      <p className="text-xs text-gray-300 font-medium leading-normal truncate max-w-lg">
                        {q.stem}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(q); }}
                        className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-indigo-400 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                        className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="p-6 border-t border-white/5 bg-white-[0.01] space-y-4 text-xs md:text-sm">
                      <p className="text-gray-200 leading-relaxed font-sans pb-3 border-b border-white/5">
                        <strong>Stem:</strong> {q.stem}
                      </p>

                      {/* Options listing */}
                      <div className="space-y-3">
                        {q.options.map(opt => {
                          const isCorrect = opt.id === q.correctOptionId;
                          return (
                            <div 
                              key={opt.id}
                              className={`p-3 rounded-xl border flex items-start gap-3 ${
                                isCorrect 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                                  : 'bg-white/5 border-white/5 text-gray-400'
                              }`}
                            >
                              <span className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isCorrect ? 'bg-emerald-400 text-gray-950' : 'bg-white/5 text-gray-400'
                              }`}>
                                {opt.label}
                              </span>
                              <div className="space-y-1">
                                <span className="text-gray-200 font-sans">{opt.text}</span>
                                {opt.explanationWrong && (
                                  <p className="text-[10px] italic text-gray-500">Reason Wrong: {opt.explanationWrong}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Rationale explanation */}
                      <div className="p-4 rounded-xl bg-purple-950/15 border border-purple-500/10 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Correct Rationale</span>
                        <p className="text-xs text-gray-300 leading-relaxed font-sans">{q.explanationCorrect}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FULL QUESTION EDITOR MODAL */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => !saving && setEditingQuestion(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden z-10 flex flex-col justify-between max-h-[90vh] bg-[#0b0918] animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
            
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/5">
              <span className="text-sm font-bold font-display text-gray-200">Edit Question ({editingQuestion.id})</span>
              <button 
                onClick={() => setEditingQuestion(null)}
                disabled={saving}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable form */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Stem */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Question Stem</label>
                <textarea 
                  rows={3}
                  value={editingQuestion.stem}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, stem: e.target.value })}
                  className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-200 focus:outline-none"
                />
              </div>

              {/* Options details */}
              <div className="space-y-4">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Configure Options</label>
                
                {editingQuestion.options.map((opt, oIdx) => {
                  const isCorrect = opt.id === editingQuestion.correctOptionId;
                  return (
                    <div key={opt.id} className="p-3.5 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleModalSelectCorrectOption(oIdx)}
                          className={`h-6 w-6 rounded-full border flex items-center justify-center text-xs font-bold font-mono transition-all ${
                            isCorrect 
                              ? 'bg-emerald-400 border-emerald-400 text-gray-950' 
                              : 'border-white/10 text-gray-500 hover:border-white/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                        <input 
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleModalOptionText(oIdx, e.target.value)}
                          className="flex-1 bg-purple-950/15 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-gray-200 focus:outline-none"
                        />
                      </div>

                      {/* Reason Wrong */}
                      {!isCorrect && (
                        <div className="pl-9 space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-red-400 font-semibold block">Reason Wrong:</span>
                          <input 
                            type="text"
                            value={opt.explanationWrong || ''}
                            onChange={(e) => handleModalOptionExplanation(oIdx, e.target.value)}
                            className="w-full bg-red-950/5 border border-white/5 text-gray-400 rounded-lg py-1 px-2.5 text-xs focus:outline-none"
                            placeholder="Explain why this option is wrong."
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Correct Explanation */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Correct Explanation</label>
                <textarea 
                  rows={2}
                  value={editingQuestion.explanationCorrect}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanationCorrect: e.target.value })}
                  className="w-full bg-emerald-950/5 border border-emerald-500/20 text-gray-300 rounded-xl py-2 px-3 text-xs focus:outline-none"
                />
              </div>

              {/* Topic & Difficulty overrides */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Topic</label>
                  <input 
                    type="text"
                    value={editingQuestion.topic}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })}
                    className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-gray-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Difficulty</label>
                  <select 
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                    className="w-full bg-[#16142e] border border-white/10 rounded-xl py-1.5 px-2 text-xs text-gray-300 focus:outline-none font-sans"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Actions footer */}
            <div className="p-4 bg-white/5 border-t border-white/5 flex gap-4">
              <button
                onClick={() => setEditingQuestion(null)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-white/5 text-xs text-gray-400 font-semibold hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-lg flex items-center justify-center"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
