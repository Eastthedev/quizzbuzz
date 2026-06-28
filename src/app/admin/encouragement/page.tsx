'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import { EncouragementMessage, EncouragementTier } from '@/types';
import { 
  Heart, Plus, Trash2, Edit2, CheckCircle, XCircle, 
  AlertCircle, Loader2, Save, Undo, RefreshCw 
} from 'lucide-react';

export default function AdminEncouragementPage() {
  const [messages, setMessages] = useState<EncouragementMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // New message form states
  const [newText, setNewText] = useState('');
  const [newTier, setNewTier] = useState<EncouragementTier>('push');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  // Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTier, setEditTier] = useState<EncouragementTier>('push');
  const [editActive, setEditActive] = useState(true);

  const loadMessages = async () => {
    try {
      api.initializeDB();
      const data = await api.getEncouragementMessages();
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newText.trim()) {
      setFormError('Please enter message text.');
      return;
    }

    setCreating(true);
    try {
      await api.createEncouragementMessage(newText.trim(), newTier);
      setNewText('');
      await loadMessages();
    } catch (err) {
      setFormError('Failed to create message.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (msg: EncouragementMessage) => {
    setEditingId(msg.id);
    setEditText(msg.text);
    setEditTier(msg.tier);
    setEditActive(msg.active);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;

    try {
      await api.updateEncouragementMessage({
        id,
        text: editText.trim(),
        tier: editTier,
        active: editActive
      });
      setEditingId(null);
      await loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this encouragement message?')) {
      try {
        await api.deleteEncouragementMessage(id);
        await loadMessages();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleActive = async (msg: EncouragementMessage) => {
    try {
      await api.updateEncouragementMessage({
        ...msg,
        active: !msg.active
      });
      await loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const getTierBadge = (tier: EncouragementTier) => {
    switch (tier) {
      case 'celebrate':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Celebrate (&ge;85%)</span>;
      case 'good':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">Good (65-84%)</span>;
      case 'push':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">Push (40-64%)</span>;
      case 'comeback':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 border border-red-500/30 text-red-400">Comeback (&lt;40%)</span>;
    }
  };

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold font-display text-gray-100">Encouragement Engine CRM</h1>
        <p className="text-xs text-gray-500">Edit, add, or toggle the cheesy study guidelines and clinical prompts her partner creates.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Creator panel (Left Column - 4 cols) */}
        <section className="lg:col-span-4 glass-panel rounded-3xl p-6 border border-white/5 shadow-xl relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>

          <h2 className="text-sm font-bold font-display text-gray-200 mb-6 flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-400" />
            Add Message
          </h2>

          {formError && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Target Performance Tier</label>
              <select 
                value={newTier}
                onChange={(e) => setNewTier(e.target.value as any)}
                className="w-full bg-[#16142e] border border-white/10 rounded-xl py-2.5 px-2 text-xs text-gray-300 focus:outline-none font-sans"
              >
                <option value="celebrate">Celebrate Band (&ge;85%)</option>
                <option value="good">Good Band (65–84%)</option>
                <option value="push">Push Band (40–64%)</option>
                <option value="comeback">Comeback Band (&lt;40%)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Message Text</label>
              <textarea 
                rows={4}
                placeholder="Write an encouraging line. Keep it warm, personalized, and clinical..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-400/50"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Heart className="h-3.5 w-3.5 fill-white/10" />
                  Save Message
                </>
              )}
            </button>
          </form>
        </section>

        {/* Messaging Logs (Right Column - 8 cols) */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-sm font-bold font-display text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Heart className="h-4 w-4 text-indigo-400 fill-indigo-400/10" />
              Custom Lines Library ({messages.length})
            </h2>
            <button 
              onClick={loadMessages}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
              title="Refresh messages"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="glass-panel rounded-3xl p-12 flex justify-center border border-white/5">
              <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-gray-500 text-xs border border-white/5">
              No encouragement messages in bank.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isEditing = editingId === msg.id;
                return (
                  <div 
                    key={msg.id}
                    className="glass-panel rounded-3xl p-5 border border-white/5 hover:border-white/10 transition-all space-y-4"
                  >
                    
                    {/* Message Details */}
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Edit Tier</label>
                            <select 
                              value={editTier}
                              onChange={(e) => setEditTier(e.target.value as any)}
                              className="w-full bg-[#16142e] border border-white/10 rounded-xl py-1.5 px-2 text-xs text-gray-300 focus:outline-none font-sans"
                            >
                              <option value="celebrate">Celebrate Band (&ge;85%)</option>
                              <option value="good">Good Band (65–84%)</option>
                              <option value="push">Push Band (40–64%)</option>
                              <option value="comeback">Comeback Band (&lt;40%)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Status</label>
                            <div className="flex gap-2 bg-[#16142e] border border-white/10 rounded-xl p-1 text-xs">
                              <button
                                type="button"
                                onClick={() => setEditActive(true)}
                                className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all ${
                                  editActive ? 'bg-indigo-600 text-white' : 'text-gray-400'
                                }`}
                              >
                                Active
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditActive(false)}
                                className={`flex-1 py-1 px-2 rounded-lg font-semibold transition-all ${
                                  !editActive ? 'bg-indigo-600 text-white' : 'text-gray-400'
                                }`}
                              >
                                Inactive
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Edit Message</label>
                          <textarea 
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-purple-950/20 border border-white/10 rounded-xl py-2 px-3 text-xs text-gray-200 focus:outline-none"
                          />
                        </div>

                        <div className="flex gap-3 justify-end text-xs font-semibold">
                          <button
                            onClick={() => setEditingId(null)}
                            className="py-1.5 px-3 rounded-lg border border-white/5 text-gray-400 hover:text-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(msg.id)}
                            className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            {getTierBadge(msg.tier)}
                            <button
                              onClick={() => handleToggleActive(msg)}
                              className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                msg.active 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-white/5 border-white/5 text-gray-500'
                              }`}
                            >
                              {msg.active ? (
                                <>
                                  <CheckCircle className="h-2.5 w-2.5" /> Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-2.5 w-2.5" /> Paused
                                </>
                              )}
                            </button>
                          </div>
                          
                          <p className="text-xs text-gray-300 italic leading-relaxed font-sans">
                            &ldquo;{msg.text}&rdquo;
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2.5 shrink-0">
                          <button
                            onClick={() => handleEditClick(msg)}
                            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                            title="Edit message"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
