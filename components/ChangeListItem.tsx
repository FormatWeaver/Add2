
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

const riskStyles: Record<RiskLevel, { bg: string, text: string, label: string }> = {
    [RiskLevel.CRITICAL]: { bg: 'bg-red-600', text: 'text-white', label: 'CRITICAL RISK' },
    [RiskLevel.HIGH]: { bg: 'bg-orange-500', text: 'text-white', label: 'HIGH RISK' },
    [RiskLevel.MEDIUM]: { bg: 'bg-amber-400', text: 'text-amber-900', label: 'MEDIUM RISK' },
    [RiskLevel.LOW]: { bg: 'bg-emerald-500', text: 'text-white', label: 'LOW RISK' },
    [RiskLevel.INFO]: { bg: 'bg-slate-500', text: 'text-white', label: 'INFORMATIONAL' },
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

    const isOverdue = change.due_date && change.due_date < Date.now() && change.status === ChangeStatus.PENDING;
    const isHighRisk = change.risk_level === RiskLevel.CRITICAL || change.risk_level === RiskLevel.HIGH;
    const hasRfi = !!change.suggested_rfi;

    const handleGenerateRfi = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onUpdateRFIDraft) return;
        
        setIsGeneratingRfi(true);
        try {
            const draft = await generateSingleRFIDraft(change);
            onUpdateRFIDraft(change.id, draft);
            setShowRfi(true);
        } catch (err) {
            console.error("Failed to generate RFI:", err);
            alert("RFI generation failed. Please try again.");
        } finally {
            setIsGeneratingRfi(false);
        }
    };

    const containerClasses = `group w-full rounded-xl border-l-4 transition-all duration-300 ${isSelected ? 'ring-2 ring-brand-500 shadow-xl z-10 scale-[1.02]' : 'border-gray-200 border-t border-b border-r shadow-sm hover:shadow-md'} ${change.status === ChangeStatus.APPROVED ? 'bg-emerald-50/40 border-emerald-500' : change.status === ChangeStatus.REJECTED ? 'bg-red-50/40 border-red-500' : 'bg-white border-slate-300'}`;

    return (
        <div onMouseEnter={() => onHover(change)} onMouseLeave={() => onHover(null)} className={containerClasses}>
            <div onClick={() => onSelect(change.id)} className="p-4 cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <Icon className={`h-6 w-6 ${color}`} />
                        <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>
                            {risk.label}
                        </span>
                        {change.discipline && (
                            <span className="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {change.discipline}
                            </span>
                        )}
                        {isOverdue && (
                            <span className="text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                <AlertTriangleIcon className="h-3 w-3" /> Overdue
                            </span>
                        )}
                    </div>
                     <div className="flex items-center space-x-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        {change.source_page > 0 && <button onClick={(e) => { e.stopPropagation(); onViewSource(change); }} className="p-1 rounded-full hover:bg-slate-200" title="Source Doc"><DocumentSearchIcon className="h-5 w-5"/></button>}
                        <button onClick={(e) => { e.stopPropagation(); onEditRequest(change); }} className="p-1 rounded-full hover:bg-slate-200" title="Edit"><PencilSquareIcon className="h-5 w-5"/></button>
                    </div>
                </div>

                <p className="text-sm font-semibold text-slate-800 leading-snug">
                    {change.description}
                </p>

                {change.risk_rationale && isSelected && (
                    <div className="mt-3 p-3 bg-brand-50 rounded-lg border border-brand-100 flex gap-2">
                        <AlertTriangleIcon className="h-5 w-5 text-brand-600 flex-shrink-0" />
                        <p className="text-xs text-brand-900 leading-relaxed italic"><span className="font-bold not-italic">AI Risk Radar:</span> {change.risk_rationale}</p>
                    </div>
                )}

                <div className="mt-4 flex justify-between items-center">
                     <div className="flex flex-col gap-1">
                        <p className="text-[11px] text-slate-500 font-medium">
                            {change.spec_section || 'Sheet'} {change.location_hint}
                        </p>
                        {change.due_date && (
                             <div className={`flex items-center gap-1 text-[10px] font-bold ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>
                                <CalendarDaysIcon className="h-3 w-3" />
                                <span>Due: {new Date(change.due_date).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {hasRfi ? (
                            <button onClick={(e) => { e.stopPropagation(); setShowRfi(!showRfi); }} className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider transition-colors ${showRfi ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>RFI Draft</button>
                        ) : isHighRisk && (
                            <button 
                                onClick={handleGenerateRfi} 
                                disabled={isGeneratingRfi}
                                className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm disabled:bg-slate-400"
                            >
                                {isGeneratingRfi ? <Spinner colorClass="text-white h-3 w-3" /> : <SparklesIcon className="h-3 w-3" />}
                                {isGeneratingRfi ? 'Generating...' : 'Generate RFI'}
                            </button>
                        )}
                        {isUnlocated ? (
                            <button onClick={(e) => { e.stopPropagation(); onStartLocating(change.id); }} className="px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider bg-brand-600 text-white hover:bg-brand-700">Locate Match</button>
                        ) : (
                            <div className="flex gap-1.5">
                                <button onClick={(e) => { e.stopPropagation(); onStatusChange(change.id, ChangeStatus.REJECTED); }} className={`p-1 rounded ${change.status === ChangeStatus.REJECTED ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>Reject</button>
                                <button onClick={(e) => { e.stopPropagation(); onStatusChange(change.id, ChangeStatus.APPROVED); }} className={`p-1 px-3 rounded text-[10px] font-bold uppercase tracking-wider ${change.status === ChangeStatus.APPROVED ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}>Approve</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isSelected && showRfi && change.suggested_rfi && (
                    <MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-indigo-50 border-t border-indigo-100 p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">AI Generated RFI Draft</span>
                            <button onClick={() => { navigator.clipboard.writeText(change.suggested_rfi!); }} className="text-[10px] font-bold text-indigo-600 hover:underline">Copy Draft</button>
                        </div>
                        <p className="text-xs text-indigo-900 font-mono leading-relaxed whitespace-pre-wrap">{change.suggested_rfi}</p>
                    </MotionDiv>
                )}
                {isSelected && isTextChange && !showRfi && (
                    <MotionDiv initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <TextDiffViewer oldText={change.exact_text_to_find || ''} newText={change.new_text_to_insert || ''} />
                    </MotionDiv>
                )}
            </AnimatePresence>
            
            {change.audit_trail.length > 0 && isSelected && (
                <div className="px-4 pb-3 border-t border-slate-100 pt-2 flex items-center justify-between opacity-50">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Vetted by {change.audit_trail[change.audit_trail.length-1].userName}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(change.audit_trail[change.audit_trail.length-1].timestamp).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    );
};
