

import React, { useState, useMemo } from 'react';
import { AICostAnalysisResult, AppChangeLogItem, CostImpactLevel } from '../types';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface CostImpactAnalysisViewProps {
    analysisResult: AICostAnalysisResult | null;
    analysisError: string | null;
    changeLog: AppChangeLogItem[];
    onSelectChange: (changeId: number) => void;
    onBack: () => void;
}

const MotionDiv = motion.div as any;

const levelStyles: Record<CostImpactLevel, { color: string, name: string }> = {
    [CostImpactLevel.HIGH]: { color: 'bg-red-100 text-red-800 border-red-200', name: 'High Impact' },
    [CostImpactLevel.MEDIUM]: { color: 'bg-amber-100 text-amber-800 border-amber-200', name: 'Medium Impact' },
    [CostImpactLevel.LOW]: { color: 'bg-sky-100 text-sky-800 border-sky-200', name: 'Low Impact' },
    [CostImpactLevel.NEGLIGIBLE]: { color: 'bg-slate-100 text-slate-800 border-slate-200', name: 'Negligible Impact' },
    [CostImpactLevel.INFORMATIONAL]: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', name: 'Informational' },
};

const ImpactGroup = ({ level, items, onSelectChange }: { level: CostImpactLevel, items: any[], onSelectChange: (id: number) => void }) => {
    const [isExpanded, setIsExpanded] = useState(level === CostImpactLevel.HIGH || level === CostImpactLevel.MEDIUM);
    const { color, name } = levelStyles[level];

    if (items.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <button onClick={() => setIsExpanded(!isExpanded)} className={`w-full flex justify-between items-center p-4 text-left ${isExpanded ? '' : 'rounded-b-xl'}`}>
                <div className="flex items-center gap-3">
                    <span className={`font-semibold px-3 py-1 rounded-full text-sm ${color}`}>{name}</span>
                    <span className="text-slate-600 font-medium">{items.length} Change{items.length > 1 ? 's' : ''}</span>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <MotionDiv
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-gray-200 divide-y divide-gray-200">
                            {items.map(item => (
                                <div key={item.change_id} onClick={() => onSelectChange(item.change_id)} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <p className="text-sm font-medium text-slate-800">{item.change.description}</p>
                                    <p className="mt-2 text-xs text-slate-600 pl-4 border-l-2 border-slate-300 italic">
                                        <span className="font-bold not-italic text-slate-700">Rationale:</span> {item.rationale}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};

const CostImpactAnalysisView = ({ analysisResult, analysisError, changeLog, onSelectChange, onBack }: CostImpactAnalysisViewProps) => {

    const enrichedItems = useMemo(() => {
        if (!analysisResult) return {};
        const changeMap = new Map(changeLog.map(c => [c.id, c]));
        const grouped: Record<CostImpactLevel, any[]> = {
            HIGH: [], MEDIUM: [], LOW: [], NEGLIGIBLE: [], INFORMATIONAL: []
        };
        analysisResult.cost_impact_items.forEach(item => {
            const change = changeMap.get(item.change_id);
            if (change) {
                grouped[item.cost_impact]?.push({ ...item, change });
            }
        });
        return grouped;
    }, [analysisResult, changeLog]);

    if (analysisError) {
        return (
            <div className="max-w-4xl mx-auto text-center py-10">
                <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
                    <h2 className="mt-4 text-xl font-bold text-red-900">Cost Analysis Failed</h2>
                    <p className="mt-2 text-sm text-red-800">{analysisError}</p>
                    <button onClick={onBack} className="mt-6 px-5 py-2 text-sm font-bold rounded-lg bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2 mx-auto">
                        <ChevronLeftIcon className="h-5 w-5" />
                        Back to Change List
                    </button>
                </div>
            </div>
        );
    }
    
    if (!analysisResult) {
         return <div className="text-center p-12">No analysis data available.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
             <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Cost Impact Analysis</h1>
                    <p className="mt-1 text-lg text-slate-600">
                        AI-powered financial insights for your project changes.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={onBack} className="px-5 py-2 text-sm font-bold rounded-lg shadow-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                        <ChevronLeftIcon className="h-5 w-5" />
                        Back to Change List
                    </button>
                </div>
            </div>

            <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-200/80 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
                    <SparklesIcon className="h-6 w-6 text-emerald-500" />
                    Overall Impact Summary
                </h2>
                <p className="mt-2 text-slate-700">{analysisResult.overall_impact_summary}</p>
            </div>
            
            <div className="mt-8 space-y-4">
                {(Object.keys(levelStyles) as CostImpactLevel[]).map(level => (
                    <ImpactGroup 
                        key={level}
                        level={level}
                        items={enrichedItems[level] || []}
                        onSelectChange={onSelectChange}
                    />
                ))}
            </div>
            
             <div className="mt-8 bg-sky-50 text-sky-800 p-4 rounded-xl border border-sky-200 flex items-start gap-3">
                <InformationCircleIcon className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold">Disclaimer</h4>
                    <p className="text-sm">This AI-generated analysis is for informational purposes and preliminary planning only. It is not a substitute for a formal estimate from qualified professionals. Always verify costs with your subcontractors and suppliers.</p>
                </div>
            </div>

        </div>
    )
};

export default CostImpactAnalysisView;