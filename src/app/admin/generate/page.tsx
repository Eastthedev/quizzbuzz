'use strict';
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as api from '@/lib/api';
import { Material, Question, Option } from '@/types';
import { 
  Sparkles, Loader2, Save, FileText, Settings, 
  HelpCircle, ChevronDown, ChevronUp, AlertCircle, Check, Undo 
} from 'lucide-react';

function GeneratePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMaterialId = searchParams.get('materialId');

  // Database lists
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Form states
  const [selectedMatIds, setSelectedMatIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Question['difficulty'] | 'mixed'>('mixed');
  const [topicFocus, setTopicFocus] = useState<string>('');
  
  // Generation states
  const [generating, setGenerating] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<Omit<Question, 'id'>[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        api.initializeDB();
        const mats = await api.getMaterials();
        const processedMats = mats.filter(m => m.status === 'processed');
        setMaterials(processedMats);
        
        if (preselectedMaterialId) {
          const matched = processedMats.find(m => m.id === preselectedMaterialId);
          if (matched) {
            setSelectedMatIds([preselectedMaterialId]);
          }
        } else if (processedMats.length > 0) {
          setSelectedMatIds([processedMats[0].id]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMaterials(false);
      }
    }
    loadData();
  }, [preselectedMaterialId]);

  const handleToggleMaterial = (id: string) => {
    setSelectedMatIds(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaveSuccess(false);

    if (selectedMatIds.length === 0) {
      setFormError('Please select at least one source material.');
      return;
    }

    setGenerating(true);
    try {
      const topic = topicFocus.trim() || 'General Pathology';
      const results = await api.generateQuestionsFromMaterial(
        selectedMatIds,
        questionCount,
        difficulty,
        topic
      );
      setPreviewQuestions(results);
      setExpandedIndex(0);
    } catch (err) {
      setFormError('AI Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Inline editor handlers
  const handleEditStem = (qIdx: number, val: string) => {
    setPreviewQuestions(prev => prev.map((q, idx) => 
      idx === qIdx ? { ...q, stem: val } : q
    ));
  };

  const handleEditTopic = (qIdx: number, val: string) => {
    setPreviewQuestions(prev => prev.map((q, idx) => 
      idx === qIdx ? { ...q, topic: val } : q
    ));
  };

  const handleEditDifficulty = (qIdx: number, val: Question['difficulty']) => {
    setPreviewQuestions(prev => prev.map((q, idx) => 
      idx === qIdx ? { ...q, difficulty: val } : q
    ));
  };

  const handleEditExplanationCorrect = (qIdx: number, val: string) => {
    setPreviewQuestions(prev => prev.map((q, idx) => 
      idx === qIdx ? { ...q, explanationCorrect: val } : q
    ));
  };

  const handleEditOptionText = (qIdx: number, oIdx: number, val: string) => {
    setPreviewQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const updatedOpts = q.options.map((opt, oKey) => 
        oKey === oIdx ? { ...opt, text: val } : opt
      );
      return { ...q, options: updatedOpts };
    }));
  };

  const handleEditOptionExplanation = (qIdx: number, oIdx: number, val: string) => {
    setPreviewQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const updatedOpts = q.options.map((opt, oKey) => 
        oKey === oIdx ? { ...opt, explanationWrong: val } : opt
      );
      return { ...q, options: updatedOpts };
    }));
  };

  const handleSelectCorrectOptionIndex = (qIdx: number, oIdx: number) => {
    setPreviewQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const correctOptionId = q.options[oIdx].id;
      
      // Clean up explanationWrong on new correct option, and keep/add it for old ones
      const updatedOpts = q.options.map((opt, oKey) => {
        if (oKey === oIdx) {
          // New correct answer doesn't need wrong explanations
          return { ...opt, explanationWrong: undefined };
        } else {
          return { ...opt, explanationWrong: opt.explanationWrong || 'Alternative distractor explanation.' };
        }
      });

      return {
        ...q,
        correctOptionId,
        options: updatedOpts
      };
    }));
  };

  const handleSaveToBank = async () => {
    try {
      setGenerating(true);
      for (const q of previewQuestions) {
        await api.createQuestion(q);
      }
      setPreviewQuestions([]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-display text-gray-100">AI Questions Generator</h1>
        <p className="text-xs text-gray-500">Auto-generate clinical multiple-choice scenarios from study materials using multimodal AI settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Setup Form (5 cols) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-white/5 shadow-xl relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
            
            <h2 className="text-sm font-bold font-display text-gray-200 mb-6 flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-400" />
              Generator Settings
            </h2>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Select Materials */}
              <div className="space-y-2">
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Source Material(s)
                </label>
                {loadingMaterials ? (
                  <div className="py-4 flex justify-center">
                    <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                  </div>
                ) : materials.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-white/10 text-center text-xs text-gray-500 leading-normal">
                    No processed materials found. Upload files in Study Materials first.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {materials.map((mat) => {
                      const isChecked = selectedMatIds.includes(mat.id);
                      return (
                        <div 
                          key={mat.id}
                          onClick={() => handleToggleMaterial(mat.id)}
                          className={`p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center gap-3 ${
                            isChecked 
                              ? 'bg-indigo-500/10 border-indigo-500/35 text-indigo-300' 
                              : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate flex-1">{mat.title}</span>
                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-white/20'
                          }`}>
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Counts & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Question Count</label>
                  <input 
                    type="number"
                    min="1" max="15"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Difficulty Band</label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-[#16142e] border border-white/10 rounded-xl py-2 px-2 text-xs text-gray-300 focus:outline-none font-sans"
                  >
                    <option value="easy">Easy (Recall)</option>
                    <option value="medium">Medium (Clinical)</option>
                    <option value="hard">Hard (Multi-step)</option>
                    <option value="mixed">Mixed Split</option>
                  </select>
                </div>
              </div>

              {/* Topic Focus */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Topic Focus (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Parasitology malaria cycles, organophosphates"
                  value={topicFocus}
                  onChange={(e) => setTopicFocus(e.target.value)}
                  className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-400/50"
                />
              </div>

              <button
                type="submit"
                disabled={generating || materials.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI Generating Scenarios...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Questions
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Right Column - Results Preview Screen (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          {saveSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex gap-2 items-center">
              <Check className="h-5 w-5 shrink-0" />
              <span>Questions published successfully to Question Bank!</span>
            </div>
          )}

          {previewQuestions.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold font-display text-gray-400 uppercase tracking-widest">
                  Preview Generated Questions ({previewQuestions.length})
                </h3>
                <button
                  onClick={handleSaveToBank}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
                >
                  <Save className="h-3.5 w-3.5" />
                  Publish Set to Bank
                </button>
              </div>

              {/* Questions Loop */}
              <div className="space-y-4">
                {previewQuestions.map((q, idx) => {
                  const isExpanded = expandedIndex === idx;
                  return (
                    <div 
                      key={idx}
                      className="glass-panel rounded-3xl border border-white/5 overflow-hidden transition-all"
                    >
                      {/* Accordion Trigger */}
                      <div 
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="space-y-1 pr-4 truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold font-mono text-indigo-400">Q{idx + 1}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/5 border border-white/10 text-gray-400 uppercase">
                              {q.difficulty}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate">{q.topic}</span>
                          </div>
                          <p className="text-xs text-gray-300 truncate font-semibold leading-normal">
                            {q.stem}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-6 border-t border-white/5 bg-white-[0.01] space-y-5">
                          {/* Stem Edit */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Question Stem</label>
                            <textarea 
                              rows={3}
                              value={q.stem}
                              onChange={(e) => handleEditStem(idx, e.target.value)}
                              className="w-full bg-purple-950/10 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-400/50"
                            />
                          </div>

                          {/* Options Inline Edit */}
                          <div className="space-y-4">
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Options & Distractors Reasoning</label>
                            
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = opt.id === q.correctOptionId;
                              return (
                                <div key={opt.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                                  <div className="flex items-center gap-3">
                                    {/* Mark Correct trigger */}
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCorrectOptionIndex(idx, oIdx)}
                                      className={`h-6 w-6 rounded-full border flex items-center justify-center text-xs font-bold font-mono transition-all ${
                                        isCorrect 
                                          ? 'bg-emerald-400 border-emerald-400 text-gray-950' 
                                          : 'border-white/15 text-gray-500 hover:border-white/30'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>

                                    <input 
                                      type="text"
                                      value={opt.text}
                                      onChange={(e) => handleEditOptionText(idx, oIdx, e.target.value)}
                                      className="flex-1 bg-purple-950/10 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-gray-200 focus:outline-none focus:border-indigo-400/50"
                                      placeholder={`Option ${opt.label}`}
                                    />
                                  </div>

                                  {/* Wrong explanation editor */}
                                  {!isCorrect && (
                                    <div className="pl-9 space-y-1">
                                      <span className="text-[9px] uppercase tracking-wider text-red-400 font-semibold block">Reason Incorrect:</span>
                                      <input 
                                        type="text"
                                        value={opt.explanationWrong || ''}
                                        onChange={(e) => handleEditOptionExplanation(idx, oIdx, e.target.value)}
                                        className="w-full bg-red-950/5 border border-white/5 text-gray-400 rounded-lg py-1 px-2.5 text-xs focus:outline-none"
                                        placeholder={`Explain why Option ${opt.label} is clinically incorrect.`}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Correct explanation editor */}
                          <div className="space-y-1.5 pt-2">
                            <label className="block text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Correct Rationale explanation</label>
                            <textarea 
                              rows={2}
                              value={q.explanationCorrect}
                              onChange={(e) => handleEditExplanationCorrect(idx, e.target.value)}
                              className="w-full bg-emerald-950/5 border border-emerald-500/20 text-gray-300 rounded-xl py-2 px-3 text-xs focus:outline-none"
                              placeholder="Clinical guidelines explaining correct option choice."
                            />
                          </div>

                          {/* Topic and Difficulty Override */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Topic</label>
                              <input 
                                type="text"
                                value={q.topic}
                                onChange={(e) => handleEditTopic(idx, e.target.value)}
                                className="w-full bg-purple-950/10 border border-white/10 rounded-xl py-1.5 px-3 text-xs text-gray-200 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Difficulty</label>
                              <select 
                                value={q.difficulty}
                                onChange={(e) => handleEditDifficulty(idx, e.target.value as any)}
                                className="w-full bg-[#16142e] border border-white/10 rounded-xl py-1.5 px-2 text-xs text-gray-300 focus:outline-none font-sans"
                              >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center text-gray-500 text-xs border border-white/5 flex flex-col items-center justify-center space-y-3 min-h-[340px]">
              <HelpCircle className="h-8 w-8 text-gray-600 animate-pulse" />
              <div className="space-y-1">
                <p className="font-semibold text-gray-400">Preview Area Empty</p>
                <p className="max-w-xs mx-auto leading-normal">Configure source documents on the left and click &ldquo;Generate Questions&rdquo; to simulate results.</p>
              </div>
            </div>
          )}
        </section>

      </div>

    </div>
  );
}

export default function AdminGeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] justify-center items-center">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    }>
      <GeneratePageContent />
    </Suspense>
  );
}
