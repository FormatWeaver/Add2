
import React, { useState } from 'react';
// FIX: Replace missing FileMetadata type with ProjectFile
import { AppChangeLogItem, ChangeStatus, ConformingPlan, QAndAItem, ProjectFile } from '../types';
import { exportChangeLogAsPdf, exportConformedDocumentAsPdf, exportComparisonDocumentAsPdf, exportQandAAsPdf } from '../services/pdfGenerator';
import { DropdownButton } from './DropdownButton';
import { Spinner } from './Spinner';
import { ReviewAndApproveIcon, ArrowPathIcon, DocumentChartBarIcon, ArrowsRightLeftIcon, DocumentArrowDownIcon, WrenchScrewdriverIcon, CurrencyDollarIcon, ListBulletIcon, QuestionMarkCircleIcon, SparklesIcon, DocumentCheckIcon, CheckCircleIcon, DocumentPlusIcon } from './icons';
import { ResultsSubView, SaveStatus } from './ResultsView';
import * as pdfjsLib from 'pdfjs-dist';

interface ResultsHeaderProps {
    onStartOver: () => void;
    isAnalyzingCost: boolean;
    onViewCostReport: () => void;
    onViewTriageReport: () => void;
    onViewSummaryReport: () => void;
    triageReport: any; // Simplified
    activeView: 'specs' | 'drawings' | 'qa';
    onSetActiveView: (view: 'specs' | 'drawings' | 'qa') => void;
    changeLog: AppChangeLogItem[];
    qaLog: QAndAItem[];
    setChangeLog: React.Dispatch<React.SetStateAction<AppChangeLogItem[]>>;
    baseSpecsDoc: pdfjsLib.PDFDocumentProxy | null;
    baseDrawingsDoc: pdfjsLib.PDFDocumentProxy | null;
    conformedDocument: any[]; // Simplified
    activeBaseDocProxy: pdfjsLib.PDFDocumentProxy | null;
    addendaDocs: Map<string, pdfjsLib.PDFDocumentProxy>;
    isTriageLoading: boolean;
    onGenerateSummary: () => Promise<void>;
    isSummaryLoading: boolean;
    executiveSummary: string | null;
    onSaveProject: () => void;
    saveStatus: SaveStatus;
    onAddAddenda: () => void;
    // FIX: Replace missing FileMetadata type with ProjectFile
    addenda: ProjectFile[];
    isAnalyzingIncrementally: boolean;
}

const ResultsHeader = (props: ResultsHeaderProps) => {
    const { onStartOver, isAnalyzingCost, onViewCostReport, onViewTriageReport, onViewSummaryReport, triageReport, activeView, onSetActiveView, changeLog, qaLog, setChangeLog, baseSpecsDoc, baseDrawingsDoc, conformedDocument, activeBaseDocProxy, addendaDocs, isTriageLoading, onGenerateSummary, isSummaryLoading, executiveSummary, onSaveProject, saveStatus, onAddAddenda, addenda, isAnalyzingIncrementally } = props;

    const [isExporting, setIsExporting] = useState<string | null>(null);

    const handleExport = async (type: 'summary' | 'comparison' | 'conformed' | 'qa') => {
        setIsExporting(`${type}-${activeView}`);
        try {
            const baseDocTitle = activeView === 'drawings' ? 'Drawings' : 'Specs';
            const changesToExport = changeLog.filter(c => c.source_original_document === activeView);

            switch (type) {
                case 'conformed':
                    if (activeBaseDocProxy && conformedDocument) {
                       await exportConformedDocumentAsPdf(activeBaseDocProxy, addendaDocs, conformedDocument);
                    }
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
            console.error(`Error exporting ${type} PDF for ${activeView}:`, error);
            alert(`Failed to export ${type} document for ${activeView}. See console for details.`);
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
    
    const getSaveButtonContent = () => {
        switch (saveStatus) {
            case 'saving':
                return <><Spinner /> Saving...</>;
            case 'saved':
                return <><CheckCircleIcon className="h-5 w-5 text-emerald-500" /> Saved!</>;
            case 'idle':
            default:
                return <><DocumentCheckIcon className="h-5 w-5" /> Save Project</>;
        }
    };

    const allDisabled = isAnalyzingCost || isTriageLoading || isAnalyzingIncrementally || !!isExporting;

    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col gap-3 mb-2">
           <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5"><ReviewAndApproveIcon className="h-6 w-6 text-brand-600"/> Review & Approve</h2>
                <div className="flex items-center gap-2">
                     <button onClick={onAddAddenda} className={secondaryActionButtonStyle} title="Upload and analyze additional addenda" disabled={allDisabled}>
                        <DocumentPlusIcon className="h-5 w-5" /> <span>Add Addenda</span>
                    </button>
                    <button 
                        onClick={onSaveProject} 
                        className={`${secondaryActionButtonStyle} ${saveStatus === 'saved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : ''}`}
                        disabled={saveStatus !== 'idle' || allDisabled}
                    >
                        {getSaveButtonContent()}
                    </button>
                     <DropdownButton
                        label="Reports"
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

            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button onClick={() => onSetActiveView('specs')} disabled={!baseSpecsDoc} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'specs' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200/50 disabled:text-gray-400 disabled:hover:bg-transparent'}`}>Specifications</button>
                    <button onClick={() => onSetActiveView('drawings')} disabled={!baseDrawingsDoc} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'drawings' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200/50 disabled:text-gray-400 disabled:hover:bg-transparent'}`}>Drawings</button>
                    {qaLog && qaLog.length > 0 && (
                        <button onClick={() => onSetActiveView('qa')} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeView === 'qa' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}>Q&A</button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                     {activeView !== 'qa' && (
                        <button
                            onClick={onGenerateSummary}
                            disabled={isSummaryLoading || !!executiveSummary || allDisabled}
                            className={secondaryActionButtonStyle}
                        >
                            {isSummaryLoading ? (
                                <Spinner colorClass="text-brand-600" />
                            ) : (
                                <SparklesIcon className="h-5 w-5 text-brand-600" />
                            )}
                            <span>
                                {isSummaryLoading
                                    ? 'Generating...'
                                    : executiveSummary
                                    ? 'Summary Generated'
                                    : 'Generate AI Summary'}
                            </span>
                        </button>
                     )}
                </div>
            </div>
             {addenda && addenda.length > 0 && (
                <div className="border-t border-gray-200 pt-2 text-xs text-slate-500 font-medium overflow-hidden text-ellipsis whitespace-nowrap px-1">
                    <span className="font-semibold text-slate-600">Processed Addenda:</span> {addenda.map(a => a.name).join(', ')}
                </div>
            )}
        </div>
    );
};

export default ResultsHeader;
