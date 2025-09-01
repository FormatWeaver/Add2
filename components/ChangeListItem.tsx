import React from 'react';
import { AppChangeLogItem, ChangeStatus, ChangeType } from '../types';
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

interface ChangeListItemProps {
    change: AppChangeLogItem;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onStatusChange: (id: number, status: ChangeStatus) => void;
    onEditRequest: (change: AppChangeLogItem) => void;
    onHover: (change: AppChangeLogItem | null) => void;
    onStartLocating: (id: number) => void;
    onViewSource: (change: AppChangeLogItem) => void;
}

// FIX: Cast motion component to `any` to resolve TypeScript typing issues with framer-motion props.
const MotionDiv = motion.div as any;

const changeTypeIcons: Record<ChangeType, { icon: React.ElementType, color: string }> = {
    [ChangeType.PAGE_ADD]: { icon: DocumentAddIcon, color: 'text-blue-600' },
    [ChangeType.PAGE_DELETE]: { icon: DocumentDeleteIcon, color: 'text-rose-600' },
    [ChangeType.PAGE_REPLACE]: { icon: DocumentReplaceIcon, color: 'text-sky-600' },
    [ChangeType.TEXT_ADD]: { icon: TextPlusIcon, color: 'text-purple-600' },
    [ChangeType.TEXT_DELETE]: { icon: TextMinusIcon, color: 'text-orange-600' },
    [ChangeType.TEXT_REPLACE]: { icon: TextReplaceIcon, color: 'text-teal-600' },
    [ChangeType.GENERAL_NOTE]: { icon: DocumentTextIcon, color: 'text-slate-500' },
};

const getStatusStyles = (status: ChangeStatus, isUnlocated: boolean) => {
    if (isUnlocated) {
         return {
            borderColor: 'border-brand-500',
            bg: 'bg-white',
        };
    }
    switch (status) {
        case ChangeStatus.APPROVED:
            return {
                borderColor: 'border-emerald-500',
                bg: 'bg-emerald-50/60',
            };
        case ChangeStatus.REJECTED:
            return {
                borderColor: 'border-red-500',
                bg: 'bg-red-50/60',
            };
        case ChangeStatus.PENDING:
        default:
            return {
                borderColor: 'border-amber-500',
                bg: 'bg-white',
            };
    }
};

const formatChangeType = (type: ChangeType) => {
    return type.replace(/_/g, ' ');
};

export const ChangeListItem = ({ change, isSelected, onSelect, onStatusChange, onEditRequest, onHover, onStartLocating, onViewSource }: ChangeListItemProps) => {
    const isUnlocated = change.change_type.startsWith('TEXT_') && !change.original_page_number;
    const styles = getStatusStyles(change.status, isUnlocated);
    const containerClasses = `w-full rounded-lg border-l-4 transition-all duration-300 ${styles.borderColor} ${styles.bg} ${isSelected ? 'ring-2 ring-brand-400 shadow-lg' : 'border-gray-200 border-t border-b border-r shadow-sm hover:shadow-md'}`;
    const hasSource = change.source_page > 0;
    const isTextChange = change.change_type.startsWith('TEXT_');

    const { icon: Icon, color } = changeTypeIcons[change.change_type];
    const formattedType = formatChangeType(change.change_type);

    const handleApprove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStatusChange(change.id, ChangeStatus.APPROVED);
    };

    const handleReject = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStatusChange(change.id, ChangeStatus.REJECTED);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEditRequest(change);
    };
    
    const handleViewSourceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onViewSource(change);
    };

    return (
        <div 
            onMouseEnter={() => onHover(change)} 
            onMouseLeave={() => onHover(null)} 
            className={containerClasses}
        >
            <div onClick={() => onSelect(change.id)} className="p-3 cursor-pointer">
                <div className="flex justify-between items-start">
                    <div title={formattedType}>
                        <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                     <div className="flex items-center space-x-1">
                        {hasSource && (
                            <button 
                                onClick={handleViewSourceClick} 
                                className="p-1 rounded-full text-gray-400 hover:bg-gray-200/50 hover:text-gray-600 transition-colors" 
                                aria-label="View Source Instruction"
                                title="View source instruction in addendum"
                            >
                                <DocumentSearchIcon className="h-5 w-5"/>
                            </button>
                        )}
                        <button 
                            onClick={handleEditClick} 
                            className="p-1 rounded-full text-gray-400 hover:bg-gray-200/50 hover:text-gray-600 transition-colors" 
                            aria-label="Edit Change"
                            title="Edit change details"
                        >
                            <PencilSquareIcon className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-800 mt-2" title={change.description}>
                    {change.description}
                </p>
                <div className="mt-3 flex justify-between items-end">
                     <p className="text-xs text-gray-500 truncate pr-2" title={change.location_hint}>
                        <span className="font-semibold">{isUnlocated ? 'Location Needed' : (change.spec_section || 'Sheet')}:</span> {isUnlocated ? 'AI could not find a match' : (change.location_hint || 'N/A')}
                    </p>
                    
                    {isUnlocated ? (
                         <button
                            onClick={(e) => { e.stopPropagation(); onStartLocating(change.id); }}
                            className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-md text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                            title="Manually locate this change on the document"
                        >
                            <MapPinIcon className="h-4 w-4" />
                            Locate
                        </button>
                    ) : (
                        <div className="flex items-center space-x-2 flex-shrink-0">
                            {change.status === ChangeStatus.PENDING && (
                                <>
                                    <button onClick={handleReject} title="Reject Change" className="px-2 py-0.5 text-xs font-semibold rounded text-red-700 bg-red-100 hover:bg-red-200 border border-red-200 transition-colors">
                                        Reject
                                    </button>
                                    <button onClick={handleApprove} title="Approve Change" className="px-2 py-0.5 text-xs font-semibold rounded text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 transition-colors">
                                        Approve
                                    </button>
                                </>
                            )}
                            
                            {change.status !== ChangeStatus.PENDING && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onStatusChange(change.id, ChangeStatus.PENDING); }}
                                    className="px-2 py-1 text-xs font-semibold rounded bg-white/70 border border-slate-300 text-slate-600 hover:bg-white hover:text-slate-800 backdrop-blur-sm shadow-sm transition-colors"
                                    title="Undo status change"
                                >
                                    Undo
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {isSelected && isTextChange && (
                    <MotionDiv
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()} // Prevent click from bubbling up and closing the view
                    >
                        <TextDiffViewer
                            oldText={change.exact_text_to_find || ''}
                            newText={change.new_text_to_insert || ''}
                        />
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};