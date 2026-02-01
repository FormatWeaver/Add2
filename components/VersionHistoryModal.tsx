
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectVersion } from '../types';
import { CloseIcon, ClockIcon, CheckCircleIcon, ArrowPathIcon, TrashIcon } from './icons';

interface VersionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    versions: ProjectVersion[];
    onRestore: (version: ProjectVersion) => void;
    onCreate: (label: string) => void;
    onDelete: (id: string) => void;
}

const MotionDiv = motion.div as any;

export const VersionHistoryModal = ({ isOpen, onClose, versions, onRestore, onCreate, onDelete }: VersionHistoryModalProps) => {
    const [newLabel, setNewLabel] = useState('');
    const [confirmRestore, setConfirmRestore] = useState<ProjectVersion | null>(null);

    const sortedVersions = [...versions].sort((a, b) => b.timestamp - a.timestamp);

    const handleCreate = () => {
        if (!newLabel.trim()) return;
        onCreate(newLabel.trim());
        setNewLabel('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <MotionDiv
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                            <ClockIcon className="h-6 w-6 text-brand-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Timeline Archive</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Version Control & Snapshots</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="h-6 w-6 text-slate-500"/></button>
                </div>

                <div className="p-8 flex-grow overflow-y-auto space-y-8">
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Capture Current State</label>
                        <div className="flex gap-3">
                            <input 
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                placeholder="e.g., Post-Addendum 3 Clean Baseline"
                                className="flex-1 px-5 py-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-800 focus:border-brand-500 outline-none transition-all"
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            />
                            <button 
                                onClick={handleCreate}
                                disabled={!newLabel.trim()}
                                className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-brand-600 transition-all disabled:opacity-30"
                            >
                                Snapshot
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Historical Instances ({versions.length})</h3>
                        {sortedVersions.length > 0 ? (
                            <div className="space-y-3">
                                {sortedVersions.map(v => (
                                    <div key={v.id} className="group relative flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-brand-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-brand-50 rounded-full flex items-center justify-center">
                                                <CheckCircleIcon className="h-5 w-5 text-brand-500" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm">{v.label}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {new Date(v.timestamp).toLocaleString()} • {v.changeLogSnapshot.length} Vector Points
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setConfirmRestore(v)}
                                                className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1"
                                            >
                                                <ArrowPathIcon className="h-3 w-3" /> Restore
                                            </button>
                                            <button 
                                                onClick={() => onDelete(v.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <ClockIcon className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No snapshots archived yet</p>
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {confirmRestore && (
                        <MotionDiv 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                            className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-[210] flex items-center justify-center p-8 text-center"
                        >
                            <div className="max-w-sm">
                                <div className="h-16 w-16 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                    <ArrowPathIcon className="h-8 w-8 text-emerald-400 animate-spin-slow" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Restore Snapshot?</h3>
                                <p className="mt-4 text-slate-400 text-sm leading-relaxed">
                                    You are about to overwrite the current conformed set with <span className="text-white font-bold">"{confirmRestore.label}"</span>. This action cannot be undone.
                                </p>
                                <div className="mt-8 flex gap-3">
                                    <button onClick={() => setConfirmRestore(null)} className="flex-1 py-4 bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/20">Cancel</button>
                                    <button 
                                        onClick={() => { onRestore(confirmRestore); setConfirmRestore(null); onClose(); }} 
                                        className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-500"
                                    >
                                        Execute Restore
                                    </button>
                                </div>
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>

                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Archive Engine v1.0 • Immutable Audit Record</p>
                </div>
            </MotionDiv>
            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};
