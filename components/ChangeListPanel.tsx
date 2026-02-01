
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AppChangeLogItem, ChangeStatus, AICostAnalysisResult, ChangeType } from '../types';
import { ChangeListItem } from './ChangeListItem';
// Comment: Added CheckCircleIcon to fix the "Cannot find name 'CheckCircleIcon'" error on line 184.
import { ListBulletIcon, ChevronLeftIcon, MagnifyingGlassIcon, PlusCircleIcon, XCircleIcon, ChevronDownIcon, ClipboardDocumentListCheckIcon, ClipboardDocumentListXIcon, CheckCircleIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

type GroupByOption = 'discipline' | 'sheet' | 'addendum' | 'none';
const statusNames = {
    [ChangeStatus.PENDING]: 'Pending',
    [ChangeStatus.APPROVED]: 'Approved',
    [ChangeStatus.REJECTED]: 'Rejected',
    'ALL': 'All'
};

interface FilterButtonProps {
    status: 'ALL' | ChangeStatus;
    current: 'ALL' | ChangeStatus;
    setStatus: (s: any) => void;
    count: number;
    key?: React.Key;
}

const FilterButton: React.FC<FilterButtonProps> = ({ status, current, setStatus, count }) => {
    const isActive = status === current;
    const baseStyle = "px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200";
    const activeStyle = "bg-white text-brand-600 shadow-sm";
    const inactiveStyle = "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700";
    
    return (
        <button onClick={() => setStatus(status)} className={`${baseStyle} ${isActive ? activeStyle : inactiveStyle}`}>
           {statusNames[status]} <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
        </button>
    );
};

const GroupingButton = ({ option, current, setGroupBy, label }: { option: GroupByOption, current: GroupByOption, setGroupBy: (o: GroupByOption) => void, label: string }) => {
    const isActive = option === current;
    const baseStyle = "px-3 py-1 text-xs font-semibold rounded-md transition-colors";
    const activeStyle = "bg-white text-brand-700 shadow-sm";
    const inactiveStyle = "text-slate-500 hover:bg-slate-200/70";
    return (
        <button onClick={() => setGroupBy(option)} className={`${baseStyle} ${isActive ? activeStyle : inactiveStyle}`}>
            {label}
        </button>
    );
};

interface ChangeListPanelProps {
    changeLog: AppChangeLogItem[];
    setChangeLog: React.Dispatch<React.SetStateAction<AppChangeLogItem[]>>;
    activeView: 'specs' | 'drawings';
    selectedChangeId: number | null;
    onSelectChange: (id: number) => void;
    onSetHoveredChange: (change: AppChangeLogItem | null) => void;
    onStartLocating: (id: number) => void;
    onViewSource: (change: AppChangeLogItem) => void;
    onEditRequest: (change: AppChangeLogItem) => void;
    onSetIsAddModalOpen: (isOpen: boolean) => void;
    costAnalysisResult: AICostAnalysisResult | null;
    onViewTriageReport: () => void;
}

const ChangeListPanel = (props: ChangeListPanelProps) => {
    const { changeLog, setChangeLog, activeView, selectedChangeId, onSelectChange, onSetHoveredChange, onStartLocating, onViewSource, onEditRequest, onSetIsAddModalOpen, costAnalysisResult, onViewTriageReport } = props;
    
    const [statusFilter, setStatusFilter] = useState<'ALL' | ChangeStatus>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [groupBy, setGroupBy] = useState<GroupByOption>('discipline');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    
    const changeListRef = useRef<HTMLDivElement>(null);
    
    const fullChangeLogForView = useMemo(() => {
        return changeLog.filter(c => c.source_original_document === activeView);
    }, [changeLog, activeView]);

    const counts = useMemo(() => ({
        ALL: fullChangeLogForView.length,
        [ChangeStatus.PENDING]: fullChangeLogForView.filter(c => c.status === ChangeStatus.PENDING).length,
        [ChangeStatus.APPROVED]: fullChangeLogForView.filter(c => c.status === ChangeStatus.APPROVED).length,
        [ChangeStatus.REJECTED]: fullChangeLogForView.filter(c => c.status === ChangeStatus.REJECTED).length,
    }), [fullChangeLogForView]);

    const filteredChangeLog = useMemo(() => {
        let log = fullChangeLogForView;
        
        if (statusFilter !== 'ALL') {
            log = log.filter(c => c.status === statusFilter);
        }
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            log = log.filter(c =>
                c.description.toLowerCase().includes(lowercasedTerm) ||
                (c.location_hint && c.location_hint.toLowerCase().includes(lowercasedTerm)) ||
                (c.spec_section && c.spec_section.toLowerCase().includes(lowercasedTerm)) ||
                (c.discipline && c.discipline.toLowerCase().includes(lowercasedTerm))
            );
        }
        return log;
    }, [fullChangeLogForView, statusFilter, searchTerm, costAnalysisResult]);
    
    const groupedAndSortedChanges = useMemo(() => {
        if (groupBy === 'none') return null;
        const getGroupKey = (change: AppChangeLogItem): string => {
            switch (groupBy) {
                case 'discipline': return change.discipline || 'General';
                case 'addendum': return change.addendum_name || 'Unknown Addendum';
                case 'sheet': return change.spec_section || change.location_hint?.split('(')[0].trim() || 'General';
                default: return 'All Changes';
            }
        };
        const groups = new Map<string, AppChangeLogItem[]>();
        filteredChangeLog.forEach(change => {
            const key = getGroupKey(change);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(change);
        });
        return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [groupBy, filteredChangeLog]);

    useEffect(() => {
        if (!selectedChangeId || !changeListRef.current) return;
        const selectedElement = changeListRef.current.querySelector(`[data-change-id="${selectedChangeId}"]`);
        if (selectedElement) {
            selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            const newExpanded = new Set(expandedGroups);
            let found = false;
            groupedAndSortedChanges?.forEach(([groupKey, changesInGroup]) => {
                if (changesInGroup.some(c => c.id === selectedChangeId)) {
                    newExpanded.add(groupKey);
                    found = true;
                }
            });
            if (found) {
                setExpandedGroups(newExpanded);
            }
        }
    }, [selectedChangeId, groupedAndSortedChanges, expandedGroups]);

    const handleStatusChange = (id: number, status: ChangeStatus) => {
        setChangeLog(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    };

    const handleUpdateRFIDraft = (id: number, draft: string) => {
        setChangeLog(prev => prev.map(c => c.id === id ? { ...c, suggested_rfi: draft } : c));
    };

    const handleBulkStatusChange = (ids: number[], status: ChangeStatus) => {
        const idSet = new Set(ids);
        setChangeLog(prev => prev.map(c => idSet.has(c.id) ? { ...c, status } : c));
    };

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
    };

    const handleApproveAllFiltered = () => {
        if (confirm(`Verify all ${filteredChangeLog.length} filtered items?`)) {
            handleBulkStatusChange(filteredChangeLog.map(c => c.id), ChangeStatus.APPROVED);
        }
    };

    return (
        <div className="w-full md:w-5/12 xl:w-4/12 bg-white rounded-2xl border border-gray-200/80 shadow-sm flex flex-col">
            <div className="p-4 border-b border-gray-200 space-y-3">
                 <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <ListBulletIcon className="h-6 w-6"/> Changes ({fullChangeLogForView.length})
                    </h2>
                    {filteredChangeLog.length > 1 && (
                        <button 
                            onClick={handleApproveAllFiltered}
                            className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                            Verify All Filtered
                        </button>
                    )}
                </div>
                 <div className="p-1 bg-slate-100 rounded-lg flex items-center justify-between">
                    {(['ALL', ChangeStatus.PENDING, ChangeStatus.APPROVED, ChangeStatus.REJECTED] as const).map(s => 
                        <FilterButton key={s} status={s} current={statusFilter} setStatus={setStatusFilter} count={counts[s]}/>
                    )}
                </div>
                <div className="relative">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
                    <input type="text" placeholder="Search changes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-brand-500 focus:border-brand-500" />
                </div>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <span className="text-xs font-semibold text-gray-500 pl-2">Group:</span>
                        <GroupingButton option='discipline' current={groupBy} setGroupBy={setGroupBy} label="Discipline" />
                        <GroupingButton option='sheet' current={groupBy} setGroupBy={setGroupBy} label="Sheet" />
                        <GroupingButton option='addendum' current={groupBy} setGroupBy={setGroupBy} label="Addenda" />
                        <GroupingButton option='none' current={groupBy} setGroupBy={setGroupBy} label="None" />
                    </div>
                    <button onClick={() => onSetIsAddModalOpen(true)} className="flex items-center gap-1.5 px-2.5 py-2 text-sm font-semibold rounded-md text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200/80 transition-colors">
                        <PlusCircleIcon className="h-5 w-5" /> Add
                    </button>
                </div>
            </div>
            
            <div ref={changeListRef} className="flex-grow overflow-y-auto p-2">
                <div className="space-y-2">
                   <AnimatePresence>
                    {groupBy === 'none' ? (
                        filteredChangeLog.map(change => (
                            <MotionDiv key={change.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} data-change-id={change.id}>
                                <ChangeListItem change={change} isSelected={selectedChangeId === change.id} onSelect={onSelectChange} onStatusChange={handleStatusChange} onUpdateRFIDraft={handleUpdateRFIDraft} onEditRequest={onEditRequest} onHover={onSetHoveredChange} onStartLocating={onStartLocating} onViewSource={onViewSource} />
                            </MotionDiv>
                        ))
                    ) : (
                         groupedAndSortedChanges?.map(([groupKey, changesInGroup]) => (
                           <MotionDiv key={groupKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} className="bg-white rounded-lg border border-gray-200/70 overflow-hidden">
                               <button onClick={() => toggleGroup(groupKey)} className="w-full flex justify-between items-center text-left p-2.5 bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                                    <h3 className="font-semibold text-gray-700 text-sm truncate pr-4">{groupKey} <span className="text-gray-400 font-normal">({changesInGroup.length})</span></h3>
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleBulkStatusChange(changesInGroup.map(c => c.id), ChangeStatus.REJECTED); }} title="Reject Group" className="p-1 rounded-full text-red-500 hover:bg-red-100"><ClipboardDocumentListXIcon className="h-4 w-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleBulkStatusChange(changesInGroup.map(c => c.id), ChangeStatus.APPROVED); }} title="Approve Group" className="p-1 rounded-full text-emerald-500 hover:bg-emerald-100"><ClipboardDocumentListCheckIcon className="h-4 w-4"/></button>
                                        <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${expandedGroups.has(groupKey) ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                {expandedGroups.has(groupKey) && (
                                    <div className="border-t border-gray-200/80 p-2 space-y-2 bg-white">
                                        {changesInGroup.map(change => (
                                             <div key={change.id} data-change-id={change.id}>
                                                <ChangeListItem change={change} isSelected={selectedChangeId === change.id} onSelect={onSelectChange} onStatusChange={handleStatusChange} onUpdateRFIDraft={handleUpdateRFIDraft} onEditRequest={onEditRequest} onHover={onSetHoveredChange} onStartLocating={onStartLocating} onViewSource={onViewSource} />
                                             </div>
                                        ))}
                                    </div>
                                )}
                           </MotionDiv>
                         ))
                    )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ChangeListPanel;
