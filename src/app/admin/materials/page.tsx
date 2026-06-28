'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import { Material } from '@/types';
import { 
  FileText, Upload, Plus, Eye, Sparkles, Trash2, 
  CheckCircle, Loader2, AlertCircle, X, Search, FileDown
} from 'lucide-react';

export default function AdminMaterialsPage() {
  const router = useRouter();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Upload Form states
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<Material['type']>('pdf');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Preview Drawer states
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadMaterials = async () => {
    try {
      api.initializeDB();
      const data = await api.getMaterials();
      setMaterials(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadMaterials();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    
    if (!uploadTitle.trim()) {
      setUploadError('Please specify a title for the material.');
      return;
    }

    setUploading(true);
    try {
      await api.uploadMaterial(uploadTitle.trim(), uploadType, uploadFile);
      setUploadTitle('');
      setUploadFile(null);
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await loadMaterials();
    } catch (err) {
      setUploadError('Failed to upload material.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this study material? Questions already generated will remain in the bank.')) {
      try {
        await api.deleteMaterial(id);
        if (previewMaterial?.id === id) {
          setPreviewMaterial(null);
        }
        await loadMaterials();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getStatusBadge = (status: Material['status']) => {
    switch (status) {
      case 'processed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold py-0.5 px-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
            <CheckCircle className="h-3 w-3" /> Processed
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold py-0.5 px-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold py-0.5 px-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full">
            <AlertCircle className="h-3 w-3" /> Failed
          </span>
        );
    }
  };

  const getFileIcon = (type: Material['type']) => {
    return <FileText className="h-6 w-6 text-indigo-400" />;
  };

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-display text-gray-100">Study Materials</h1>
        <p className="text-xs text-gray-500">Upload medical lectures, texts, and syllabus logs for AI parsing and question generation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Upload Panel (Left Column - 4 cols) */}
        <section className="lg:col-span-4 glass-panel rounded-3xl p-6 border border-white/5 shadow-xl relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
          
          <h2 className="text-sm font-bold font-display text-gray-200 mb-6 flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-400" />
            Upload Document
          </h2>

          {uploadError && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Material Title</label>
              <input 
                type="text" 
                placeholder="e.g. Pathology Lectures - Hematology"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-400/50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Format Type</label>
              <select 
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as any)}
                className="w-full bg-[#16142e] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-gray-300 focus:outline-none focus:border-indigo-400/50 font-sans"
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="docx">Word Document (.docx)</option>
                <option value="pptx">PowerPoint Presentation (.pptx)</option>
                <option value="image">Diagram / Clinical Image</option>
                <option value="text">Plain Text Notes (.txt)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Select Document File</label>
              <input 
                id="file-upload-input"
                type="file"
                accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-indigo-400/50"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Parse Document
                </>
              )}
            </button>
          </form>
        </section>

        {/* Materials Directory (Right Column - 8 cols) */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h2 className="text-sm font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <FileDown className="h-4 w-4 text-indigo-400" />
              Document Database
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-gray-300 placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="glass-panel rounded-3xl p-12 flex justify-center items-center border border-white/5">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-gray-500 text-xs border border-white/5">
              No files found in database.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((mat) => (
                <div 
                  key={mat.id}
                  className="glass-panel rounded-3xl p-5 border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[160px] hover:border-white/10 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                        {getFileIcon(mat.type)}
                      </div>
                      {getStatusBadge(mat.status)}
                    </div>
                    
                    <h3 className="font-semibold text-xs text-gray-200 line-clamp-2 leading-snug">
                      {mat.title}
                    </h3>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 text-[10px] text-gray-500">
                    <span>Uploaded: {mounted ? new Date(mat.uploadedAt).toLocaleDateString() : '—'}</span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(mat.id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete material"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => mat.status === 'processed' && setPreviewMaterial(mat)}
                        disabled={mat.status !== 'processed'}
                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-30"
                        title="Inspect content"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => mat.status === 'processed' && router.push(`/admin/generate?materialId=${mat.id}`)}
                        disabled={mat.status !== 'processed'}
                        className="p-1 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-30"
                        title="Generate questions"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* INSPECTION PREVIEW SLIDE-OUT DRAWER */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setPreviewMaterial(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <div className="glass-panel w-full max-w-lg h-full border-l border-white/10 shadow-2xl relative z-10 flex flex-col justify-between bg-[#0b0918] animate-in slide-in-from-right duration-300">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-bold text-sm text-gray-200">Material Preview</h3>
                </div>
                <button 
                  onClick={() => setPreviewMaterial(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Document Title</h4>
                  <p className="text-sm font-semibold text-gray-200 leading-snug">{previewMaterial.title}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    🔎 Extracted Summaries
                  </h4>
                  <p className="text-xs text-gray-300 bg-white/5 border border-white/5 rounded-2xl p-4 leading-relaxed font-sans">
                    {previewMaterial.extractedSummary || 'No summary generated yet.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                    📝 Full Transcription Notes
                  </h4>
                  <div className="text-xs text-gray-300 bg-white/5 border border-white/5 rounded-2xl p-4 leading-relaxed font-sans max-h-60 overflow-y-auto">
                    {previewMaterial.extractedText || 'No transcription extracted yet.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 bg-white/5 border-t border-white/5 flex gap-4">
              <button
                onClick={() => setPreviewMaterial(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/5 text-xs text-gray-400 font-semibold"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  const id = previewMaterial.id;
                  setPreviewMaterial(null);
                  router.push(`/admin/generate?materialId=${id}`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-lg flex items-center justify-center gap-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Questions
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
