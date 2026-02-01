
import React, { useState, useEffect } from 'react';
import { AppChangeLogItem, ChangeStatus, ConformingPlan, QAndAItem, ProjectFile } from '../types';
import { exportChangeLogAsPdf, exportConformedDocumentAsPdf, exportComparisonDocumentAsPdf, exportQandAAsPdf } from '../services/pdfGenerator';
import { DropdownButton } from './DropdownButton';
import { Spinner } from './Spinner';
import { ReviewAndApproveIcon, ArrowPathIcon, DocumentChartBarIcon, ArrowsRightLeftIcon, DocumentArrowDownIcon, WrenchScrewdriverIcon, CurrencyDollarIcon, ListBulletIcon, QuestionMarkCircleIcon, SparklesIcon, DocumentCheckIcon, CheckCircleIcon, DocumentPlusIcon, GlobeAltIcon, PencilSquareIcon, CheckIcon, ClockIcon } from './icons';
import { SaveStatus } from './ResultsView';
import * as pdfjsLib from 'pdfjs-dist';

interface ResultsHeaderProps {
    projectName: string;
    onUpdateProjectName: (name: string) => void;
    onStartOver: () => void;
    isAnalyzingCost: boolean;
    onViewCostReport: () => void;
    onViewTriageReport: () => void;
    onViewSummaryReport: () => void;
    onViewHistory: () => void;
    triageReport: any;
    activeView: 'specs' | 'drawings' | 'qa';
    onSetActiveView: (view: 'specs' | 'drawings' | 'qa') => void;
    changeLog: AppChangeLogItem[];
    qaLog: QAndAItem[];
    setChangeLog: React.Dispatch<React.SetStateAction<AppChangeLogItem[]>>;
    baseSpecsDoc: pdfjsLib.PDFDocumentProxy | null;
    baseDrawingsDoc: pdfjsLib.PDFDocumentProxy | null;
    conformedDocument: any[];
    activeBaseDocProxy: pdfjsLib.PDFDocumentProxy | null;
    addendaDocs: Map<string, pdfjsLib.PDFDocumentProxy>;
    isTriageLoading: boolean;
    onGenerateSummary: () => Promise<void>;
    isSummaryLoading: boolean;
    executiveSummary: string | null;
    onSaveProject: () => void;
    saveStatus: SaveStatus;
    onAddAddenda: () => void;
    addenda: ProjectFile[];
    isAnalyzingIncrementally: boolean;
    versionCount: number;
}

const ResultsHeader = (props: ResultsHeaderProps) => {
    const { 
        projectName, onUpdateProjectName, onStartOver, isAnalyzingCost, 
        onViewCostReport, onViewTriageReport, onViewSummaryReport, triageReport, 
        activeView, onSetActiveView, changeLog, qaLog, setChangeLog, 
        baseSpecsDoc, baseDrawingsDoc, conformedDocument, activeBaseDocProxy, 
        addendaDocs, isTriageLoading, onGenerateSummary, isSummaryLoading, 
        executiveSummary, onSaveProject, saveStatus, onAddAddenda, addenda, 
        isAnalyzingIncrementally, onViewHistory, versionCount
    } = props;

    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(projectName);

    useEffect(() => {
        setTitleInput(projectName);
    }, [projectName]);

    const handleSaveTitle = () => {
        if (titleInput.trim() && titleInput !== projectName) {
            onUpdateProjectName(titleInput.trim());
        }
        setIsEditingTitle(false);
    };

    const handleExport = async (type: 'summary' | 'comparison' | 'conformed' | 'qa') => {
        setIsExporting(`${type}-${activeView}`);
        try {
            const baseDocTitle = activeView === 'drawings' ? 'Drawings' : 'Specs';
            const changesToExport = changeLog.filter(c => c.source_original_document === activeView);
            switch (type) {
                case 'conformed':
                    if (activeBaseDocProxy && conformedDocument) await exportConformedDocumentAsPdf(activeBaseDocProxy, addendaDocs, conformedDocument);
                    break;
                case 'summary':
                    exportChangeLogAsPdf(changesToExport, baseDocTitle);
                    break;
                case 'comparison':
                    exportComparisonDocumentAsPdf(changesToExport, baseDocTitle);
                    break;
                case 'qa':
                    exportQandAAsPdf(qaLog, "Project");
                    break;
            }
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            alert(`Failed to export ${type} document.`);
        } finally {
            setIsExporting(null);
        }
    };

    const actionButtonBaseStyle = "flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
    const primaryActionButtonStyle = `${actionButtonBaseStyle} bg-brand-600 text-white hover:bg-brand-700`;
    const secondaryActionButtonStyle = `${actionButtonBaseStyle} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`;

    const exportOptions = activeView === 'qa'
        ? [{ label: 'Q&A Report', icon: DocumentArrowDownIcon, onClick: () => handleExport('qa'), disabled: !!isExporting }]
        : [
            { label: 'Conformed Document', icon: DocumentArrowDownIcon, onClick: () => handleExport('conformed'), disabled: !!isExporting || conformedDocument.length === 0 },
            { label: 'Comparison (Redline)', icon: ArrowsRightLeftIcon, onClick: () => handleExport('comparison'), disabled: !!isExporting },
            { label: 'Change List Summary', icon: ListBulletIcon, onClick: () => handleExport('summary'), disabled: !!isExporting },
        ];


    const reportOptions = [
        { label: 'Full Summary Report', icon: DocumentChartBarIcon, onClick: onViewSummaryReport, disabled: isTriageLoading || isAnalyzingCost || isAnalyzingIncrementally },
        { label: 'Triage Dashboard', icon: WrenchScrewdriverIcon, onClick: onViewTriageReport, disabled: isTriageLoading || isAnalyzingCost || isAnalyzingIncrementally },
        { label: 'Cost Impact Analysis', icon: CurrencyDollarIcon, onClick: onViewCostReport, disabled: isTriageLoading || isAnalyzingCost || isAnalyzingIncrementally },
    ];
    
    const getSyncStatus = () => {
        if (saveStatus === 'saving') {
            return (
                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <Spinner colorClass="text-brand-500 h-3 w-3" />
                    Syncing...
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                <div className="h-4 w-4 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckIcon className="h-2.5 w-2.5" strokeWidth={5} />
                </div>
                SAVED TO CLOUD
            </div>
        );
    };

    const allDisabled = isAnalyzingCost || isTriageLoading || isAnalyzingIncrementally || !!isExporting;

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col gap-4 mb-4">
           <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 flex-1">
                    <div className="flex flex-col min-w-0 flex-1">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2 w-full max-w-2xl">
                                <input 
                                    autoFocus
                                    value={titleInput} 
                                    onChange={e => setTitleInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                                    onBlur={handleSaveTitle}
                                    className="px-4 py-2 border-2 border-brand-500 ring-4 ring-brand-50 rounded-xl focus:outline-none text-2xl font-black text-slate-900 bg-white w-full"
                                />
                                <button onClick={handleSaveTitle} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors flex-shrink-0"><CheckIcon className="h-6 w-6"/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 group cursor-pointer w-full max-w-2xl" onClick={() => setIsEditingTitle(true)}>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate leading-tight" title="Click to rename project">
                                    {projectName}
                                </h1>
                                <button className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all" title="Rename Project">
                                    <PencilSquareIcon className="h-5 w-5"/>
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                             <div className="flex items-center gap-1.5 bg-brand-50 text-brand-600 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border border-brand-100">
                                <CheckIcon className="h-2.5 w-2.5" strokeWidth={5} /> REVIEW & APPROVE
                             </div>
                             <div className="h-4 w-px bg-slate-200"></div>
                             {getSyncStatus()}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                     <button onClick={onViewHistory} className={secondaryActionButtonStyle} title="View Archive snapshots">
                        <ClockIcon className="h-5 w-5 text-slate-500" /> 
                        <span>History {versionCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded-full text-[10px] font-black">{versionCount}</span>}</span>
                    </button>
                     <button onClick={onAddAddenda} className={secondaryActionButtonStyle} title="Upload and analyze additional addenda" disabled={allDisabled}>
                        <DocumentPlusIcon className="h-5 w-5" /> <span>Add Addenda</span>
                    </button>
                     <DropdownButton
                        label="Intelligence"
                        options={reportOptions}
                        buttonStyle={secondaryActionButtonStyle}
                        disabled={allDisabled}
                        icon={DocumentChartBarIcon}
                    />
                    <DropdownButton
                        label={isExporting ? 'Exporting...' : 'Export'}
                        options={exportOptions}
                        buttonStyle={primaryActionButtonStyle}
                        disabled={allDisabled}
                        icon={isExporting ? () => <Spinner /> : DocumentArrowDownIcon}
                    />
                </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                <div className="flex items-center bg-gray-100 rounded-2xl p-1 shadow-inner">
                    <button onClick={() => onSetActiveView('specs')} disabled={!baseSpecsDoc} className={`px-6 py-2.5 text-sm font-black rounded-xl transition-all ${activeView === 'specs' ? 'bg-white text-brand-600 shadow-md' : 'text-gray-500 hover:bg-gray-200/50 disabled:opacity-30'}`}>SPECIFICATIONS</button>
                    <button onClick={() => onSetActiveView('drawings')} disabled={!baseDrawingsDoc} className={`px-6 py-2.5 text-sm font-black rounded-xl transition-all ${activeView === 'drawings' ? 'bg-white text-brand-600 shadow-md' : 'text-gray-500 hover:bg-gray-200/50 disabled:opacity-30'}`}>DRAWINGS</button>
                    {qaLog && qaLog.length > 0 && (
                        <button onClick={() => onSetActiveView('qa')} className={`px-6 py-2.5 text-sm font-black rounded-xl transition-all ${activeView === 'qa' ? 'bg-white text-brand-600 shadow-md' : 'text-gray-500 hover:bg-gray-200/50'}`}>Q&A</button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                     {activeView !== 'qa' && (
                        <button
                            onClick={onGenerateSummary}
                            disabled={isSummaryLoading || !!executiveSummary || allDisabled}
                            className={secondaryActionButtonStyle}
                        >
                            {isSummaryLoading ? <Spinner colorClass="text-brand-600" /> : <SparklesIcon className="h-5 w-5 text-brand-600" />}
                            <span>{isSummaryLoading ? 'Generating...' : (executiveSummary ? 'AI Summary Ready' : 'AI Summary')}</span>
                        </button>
                     )}
                </div>
            </div>
             {addenda && addenda.length > 0 && (
                <div className="border-t border-gray-100 mt-1 pt-3 pb-1 text-[11px] text-slate-500 font-bold uppercase tracking-tight flex items-center gap-2 px-1">
                    <span className="text-slate-400">Integrated Addenda:</span> 
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {addenda.map(a => (
                            <span key={a.name} className="px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg shrink-0 flex items-center gap-1.5">
                                <DocumentCheckIcon className="h-3 w-3 text-emerald-500" /> {a.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsHeader;
