
import React, { useState } from 'react';
import { AppChangeLogItem, ChangeStatus, ChangeType, RiskLevel } from '../types';
import { PencilSquareIcon } from './icons/PencilSquareIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { DocumentSearchIcon } from './icons/DocumentSearchIcon';
import { motion, AnimatePresence } from 'framer-motion';
import TextDiffViewer from './TextDiffViewer';
import { DocumentAddIcon } from './icons/DocumentAddIcon';
import { DocumentDeleteIcon } from './icons/DocumentDeleteIcon';
import { DocumentReplaceIcon } from './icons/DocumentReplaceIcon';
import { TextPlusIcon } from './icons/TextPlusIcon';
import { TextMinusIcon } from './icons/TextMinusIcon';
import { TextReplaceIcon } from './icons/TextReplaceIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { ClipboardDocumentListCheckIcon } from './icons/ClipboardDocumentListCheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { generateSingleRFIDraft } from '../services/geminiService';
import { Spinner } from './Spinner';

interface ChangeListItemProps {
    change: AppChangeLogItem;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onStatusChange: (id: number, status: ChangeStatus) => void;
    onEditRequest: (change: AppChangeLogItem) => void;
    onHover: (change: AppChangeLogItem | null) => void;
    onStartLocating: (id: number) => void;
    onViewSource: (change: AppChangeLogItem) => void;
    onUpdateRFIDraft?: (id: number, draft: string) => void;
}

const MotionDiv = motion.div as any;

const riskStyles: Record<RiskLevel, { bg: string, text: string, shadow: string, label: string }> = {
    [RiskLevel.CRITICAL]: { bg: 'bg-red-600', text: 'text-white', shadow: 'shadow-[0_0_15px_rgba(220,38,38,0.5)]', label: 'CRITICAL' },
    [RiskLevel.HIGH]: { bg: 'bg-orange-500', text: 'text-white', shadow: 'shadow-[0_0_12px_rgba(249,115,22,0.4)]', label: 'HIGH RISK' },
    [RiskLevel.MEDIUM]: { bg: 'bg-amber-400', text: 'text-amber-950', shadow: '', label: 'MEDIUM' },
    [RiskLevel.LOW]: { bg: 'bg-emerald-500', text: 'text-white', shadow: '', label: 'LOW' },
    [RiskLevel.INFO]: { bg: 'bg-slate-400', text: 'text-white', shadow: '', label: 'INFO' },
};

const changeTypeIcons: Record<ChangeType, { icon: React.ElementType, color: string }> = {
    [ChangeType.PAGE_ADD]: { icon: DocumentAddIcon, color: 'text-blue-600' },
    [ChangeType.PAGE_DELETE]: { icon: DocumentDeleteIcon, color: 'text-rose-600' },
    [ChangeType.PAGE_REPLACE]: { icon: DocumentReplaceIcon, color: 'text-sky-600' },
    [ChangeType.TEXT_ADD]: { icon: TextPlusIcon, color: 'text-purple-600' },
    [ChangeType.TEXT_DELETE]: { icon: TextMinusIcon, color: 'text-orange-600' },
    [ChangeType.TEXT_REPLACE]: { icon: TextReplaceIcon, color: 'text-teal-600' },
    [ChangeType.GENERAL_NOTE]: { icon: DocumentTextIcon, color: 'text-slate-500' },
};

export const ChangeListItem = ({ change, isSelected, onSelect, onStatusChange, onEditRequest, onHover, onStartLocating, onViewSource, onUpdateRFIDraft }: ChangeListItemProps) => {
    const [showRfi, setShowRfi] = useState(false);
    const [isGeneratingRfi, setIsGeneratingRfi] = useState(false);
    
    const isUnlocated = change.change_type.startsWith('TEXT_') && !change.original_page_number;
    const isTextChange = change.change_type.startsWith('TEXT_');
    const { icon: Icon, color } = changeTypeIcons[change.change_type];
    const risk = riskStyles[change.risk_level];

    const isHighRisk = change.risk_level === RiskLevel.CRITICAL || change.risk_level === RiskLevel.HIGH;

    const handleGenerateRfi = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onUpdateRFIDraft) return;
        setIsGeneratingRfi(true);
        try {
            const draft = await generateSingleRFIDraft(change);
            onUpdateRFIDraft(change.id, draft);
            setShowRfi(true);
        } catch (err) {
            alert("RFI Engine timeout. Try again.");
        } finally { setIsGeneratingRfi(false); }
    };

    return (
        <MotionDiv 
            layout
            onMouseEnter={() => onHover(change)} onMouseLeave={() => onHover(null)} 
            className={`group relative w-full rounded-2xl border-2 transition-all duration-300 overflow-hidden ${isSelected ? 'border-brand-500 shadow-2xl scale-[1.03] z-20' : 'border-transparent shadow-sm hover:border-slate-300 hover:shadow-md'} ${change.status === ChangeStatus.APPROVED ? 'bg-emerald-50/20' : change.status === ChangeStatus.REJECTED ? 'bg-red-50/20' : 'bg-white'}`}
        >
            <div onClick={() => onSelect(change.id)} className="p-5 cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:scale-110 transition-transform ${color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${risk.bg} ${risk.text} ${risk.shadow} ${isHighRisk ? 'animate-pulse-subtle' : ''}`}>
                            {risk.label}
                        </span>
                    </div>
                     <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onViewSource(change); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><DocumentSearchIcon className="h-4.5 w-4.5"/></button>
                        <button onClick={(e) => { e.stopPropagation(); onEditRequest(change); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><PencilSquareIcon className="h-4.5 w-4.5"/></button>
                    </div>
                </div>

                <p className="text-xs font-bold text-slate-700 leading-relaxed line-clamp-3">
                    {change.description}
                </p>

                <div className="mt-5 flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {change.spec_section || 'Sheet'} {change.location_hint}
                        </p>
                        <p className="text-[9px] font-bold text-brand-600 mt-1.5 uppercase opacity-60">{change.addendum_name.substring(0, 15)}...</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isHighRisk && !change.suggested_rfi && (
                            <button onClick={handleGenerateRfi} disabled={isGeneratingRfi} className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all">
                                {isGeneratingRfi ? <Spinner colorClass="text-indigo-600 h-4 w-4" /> : <SparklesIcon className="h-4.5 w-4.5" />}
                            </button>
                        )}
                        {change.suggested_rfi && (
                             <button onClick={(e) => { e.stopPropagation(); setShowRfi(!showRfi); }} className={`px-2.5 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${showRfi ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>RFI</button>
                        )}
                        {isUnlocated ? (
                            <button onClick={(e) => { e.stopPropagation(); onStartLocating(change.id); }} className="px-4 py-2 text-[9px] font-black rounded-xl uppercase tracking-widest bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-100">Locate</button>
                        ) : (
                            <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                <button onClick={(e) => { e.stopPropagation(); onStatusChange(change.id, ChangeStatus.REJECTED); }} className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${change.status === ChangeStatus.REJECTED ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:bg-white hover:text-red-500'}`}>Reject</button>
                                <button onClick={(e) => { e.stopPropagation(); onStatusChange(change.id, ChangeStatus.APPROVED); }} className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${change.status === ChangeStatus.APPROVED ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-white hover:text-emerald-500'}`}>Verify</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isSelected && showRfi && change.suggested_rfi && (
                    <MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-indigo-900 text-indigo-100 p-5 font-mono text-[10px] leading-relaxed relative">
                        <div className="absolute top-3 right-3 flex gap-2">
                             <button onClick={() => navigator.clipboard.writeText(change.suggested_rfi!)} className="text-[8px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-2 py-1 rounded">Copy</button>
                        </div>
                        <p className="opacity-80 pt-2">{change.suggested_rfi}</p>
                    </MotionDiv>
                )}
                {isSelected && isTextChange && !showRfi && (
                    <MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <TextDiffViewer oldText={change.exact_text_to_find || ''} newText={change.new_text_to_insert || ''} />
                    </MotionDiv>
                )}
            </AnimatePresence>
        </MotionDiv>
    );
};
