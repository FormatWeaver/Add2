import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// FIX: Replace missing FileMetadata type with ProjectFile
import { AppChangeLogItem, ConformedPageInfo, TriageReportData, AICostAnalysisResult, QAndAItem, ProjectFile } from '../types';
import { Spinner } from './Spinner';
import ExecutiveSummary from './ExecutiveSummary';
import InteractiveTriageReport from './InteractiveTriageReport';
import CostImpactAnalysisView from './CostImpactAnalysisView';
import ExecutiveSummaryReport from './ExecutiveSummaryReport';
import ResultsHeader from './ResultsHeader';
import PdfViewer from './PdfViewer';
import { CloseIcon, DocumentIcon, ChevronLeftIcon, ChevronRightIcon, DocumentChartBarIcon, SparklesIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useConformedDocument } from '../hooks/useConformedDocument';
import ProcessingView from './ProcessingView';
import { ErrorDisplay } from './ErrorDisplay';
import QandAView from './QandAView';

type ViewMode = 'specs' | 'drawings' | 'qa';
export type ResultsSubView = 'list' | 'triage' | 'cost' | 'summary';
export type SaveStatus = 'idle' | 'saving' | 'saved';

// FIX: Cast motion component to any to resolve TypeScript typing issues with framer-motion props.
const MotionDiv = motion.div as any;

interface PageCardProps {
    pageInfo: ConformedPageInfo;
    baseDocProxy: pdfjsLib.PDFDocumentProxy | null;
    addendaDocs: Map<string, pdfjsLib.PDFDocumentProxy>;
    onClick: () => void;
}

const PageCard = ({ pageInfo, baseDocProxy, addendaDocs, onClick }: PageCardProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        // Immediately cancel any previous render task to prevent race conditions.
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
            renderTaskRef.current = null;
        }

        const renderThumbnail = async () => {
            setIsLoading(true);
            const map = pageInfo.map;
            let docProxy = baseDocProxy;
            if (map.source_document === 'addendum') {
                docProxy = addendaDocs.get(map.addendum_name!);
            }
            
            if (!docProxy || !canvasRef.current) {
                setIsLoading(false);
                return;
            }
            
            if (map.source_page_number < 1 || map.source_page_number > docProxy.numPages) {
                console.error(
                    `Invalid page request for thumbnail: Page ${map.source_page_number} is out of bounds for document ${map.addendum_name || 'base doc'} which has ${docProxy.numPages} pages.`,
                    { pageInfo }
                );
                setIsLoading(false);
                return;
            }
            
            let page: pdfjsLib.PDFPageProxy | null = null;
            try {
                page = await docProxy.getPage(map.source_page_number);
                if (isCancelled || !canvasRef.current) {
                    return;
                }
                
                const TARGET_WIDTH = 300; // Render at a consistent, crisp resolution
                const unscaledViewport = page.getViewport({ scale: 1 });
                const scale = TARGET_WIDTH / unscaledViewport.width;
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Clear the canvas before rendering to prevent artifacts from previous renders.
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // FIX: The `page.render` method in this project's `pdfjs-dist` setup requires
                // the `canvas` property in its parameters. Added it to resolve the type error.
                const renderContext = { canvas, canvasContext: ctx, viewport };
                renderTaskRef.current = page.render(renderContext);

                await renderTaskRef.current.promise;
                renderTaskRef.current = null; // Clear ref on successful completion
            } catch (error: any) {
                renderTaskRef.current = null; // Clear ref on error
                // Avoid logging errors for intentional cancellations
                if (error.name !== 'RenderingCancelledException') {
                    console.error("Failed to render thumbnail for page", pageInfo.conformedPageNumber, error);
                }
            } finally {
                // Ensure page resources are always freed to prevent memory leaks
                if (page && !page.destroyed) {
                    page.cleanup();
                }
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };
        
        renderThumbnail();

        return () => { 
            isCancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };
    }, [pageInfo, baseDocProxy, addendaDocs]);

    let banner = null;
    if (pageInfo.map.source_document === 'addendum') {
        banner = pageInfo.map.original_page_for_comparison 
            ? { text: 'REPLACED', style: 'bg-sky-500' }
            : { text: 'ADDED', style: 'bg-blue-500' };
    } else if (pageInfo.approvedTextChanges.length > 0) {
        banner = { text: 'MODIFIED', style: 'bg-teal-500' };
    }

    return (
        <MotionDiv
            onClick={onClick}
            className="group relative aspect-[8.5/11] bg-white rounded-lg shadow-md hover:shadow-xl hover:ring-2 hover:ring-brand-500 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden border border-slate-200"
            layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        >
            <div className="flex-grow flex items-center justify-center bg-slate-50 overflow-hidden">
                {isLoading && <Spinner colorClass="text-slate-400" />}
                <canvas ref={canvasRef} className={`transition-opacity duration-300 block max-w-full max-h-full ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
            </div>

            {banner && (
                <div className={`absolute top-0 right-0 text-center text-white text-[10px] font-bold py-1 px-3 ${banner.style} rounded-bl-lg`}>
                    {banner.text}
                </div>
            )}
            
            <div className="p-2 bg-white border-t border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-600">Page {pageInfo.conformedPageNumber}</p>
            </div>
        </MotionDiv>
    );
};

interface PageDetailModalProps {
    pageInfo: ConformedPageInfo;
    baseDocProxy: pdfjsLib.PDFDocumentProxy | null;
    addendaDocs: Map<string, pdfjsLib.PDFDocumentProxy>;
    onClose: () => void;
}

const PageDetailModal = ({ pageInfo, baseDocProxy, addendaDocs, onClose }: PageDetailModalProps) => {
    let leftDoc: pdfjsLib.PDFDocumentProxy | null | undefined, leftPageNum, leftTitle = 'Original';
    let rightDoc: pdfjsLib.PDFDocumentProxy | null | undefined, rightPageNum, rightTitle = 'Conformed', rightChanges: AppChangeLogItem[] = [];
    
    const { map, approvedTextChanges } = pageInfo;
    
    if (map.source_document === 'original') {
        rightDoc = baseDocProxy;
        rightPageNum = map.source_page_number;
        rightChanges = approvedTextChanges;
        if (approvedTextChanges.length > 0) {
            leftDoc = baseDocProxy;
            leftPageNum = map.source_page_number;
        } else {
            leftDoc = null;
        }
    } else {
        rightDoc = addendaDocs.get(map.addendum_name!);
        rightPageNum = map.source_page_number;
        if (map.original_page_for_comparison) {
            leftDoc = baseDocProxy;
            leftPageNum = map.original_page_for_comparison;
            leftTitle = 'Original (Replaced)';
            rightTitle = 'New Page (from Addendum)';
        } else {
            leftDoc = null;
            rightTitle = 'New Page (from Addendum)';
        }
    }
    
    const [pan, setPan] = useState({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    
    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 animate-pop-in">
            <div className="absolute top-0 w-full px-4 py-2 bg-slate-900/50 flex items-center justify-between z-10">
                <span className="text-white font-semibold text-sm">Page {pageInfo.conformedPageNumber} Details</span>
                <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-full"><CloseIcon className="h-7 w-7"/></button>
            </div>
            <div className="w-full h-full pt-12 flex items-stretch justify-center gap-6">
                {leftDoc && (
                    <div className="w-1/2 h-full">
                        <PdfViewer title={leftTitle} pdfDoc={leftDoc} pageNum={leftPageNum} changesToAnnotate={[]} pan={pan} setPan={setPan} zoom={zoom} setZoom={setZoom} onCanvasClick={() => {}} onSetClickableAreas={() => {}} onShowInModal={() => {}} selectedChangeId={null} hoveredChange={null} changeLog={[]}/>
                    </div>
                )}
                <div className={leftDoc ? "w-1/2 h-full" : "w-full max-w-5xl h-full"}>
                    <PdfViewer title={rightTitle} pdfDoc={rightDoc} pageNum={rightPageNum} changesToAnnotate={rightChanges} pan={pan} setPan={setPan} zoom={zoom} setZoom={setZoom} onCanvasClick={() => {}} onSetClickableAreas={() => {}} onShowInModal={() => {}} selectedChangeId={null} hoveredChange={null} changeLog={[]}/>
                </div>
            </div>
        </div>
    );
};


interface ResultsViewProps {
    changeLog: AppChangeLogItem[];
    qaLog: QAndAItem[];
    setChangeLog: React.Dispatch<React.SetStateAction<AppChangeLogItem[]>>;
    baseDrawingsDoc: pdfjsLib.PDFDocumentProxy | null;
    baseSpecsDoc: pdfjsLib.PDFDocumentProxy | null;
    addendaDocs: Map<string, pdfjsLib.PDFDocumentProxy>;
    baseDrawingsPageCount: number;
    baseSpecsPageCount: number;
    onStartOver: () => void;
    onCreateChange: (newChange: Omit<AppChangeLogItem, 'id' | 'status' | 'addendum_name'>) => void;
    triageReport: TriageReportData | null;
    // FIX: Replace missing FileMetadata type with ProjectFile
    addenda: ProjectFile[];
    executiveSummary: string | null;
    summaryError: string | null;
    isSummaryLoading: boolean;
    onGenerateSummary: () => Promise<void>;
    costAnalysisResult: AICostAnalysisResult | null;
    costAnalysisError: string | null;
    onGenerateCostImpact: () => Promise<void>;
    onGenerateTriageReport: () => Promise<void>;
    isTriageLoading: boolean;
    triageError: string | null;
    onAnalyzeAdditionalAddenda: (files: File[]) => void;
    isAnalyzingIncrementally: boolean;
}

export default function ResultsView({ 
    changeLog, qaLog, setChangeLog, 
    baseDrawingsDoc, baseSpecsDoc, addendaDocs, 
    baseDrawingsPageCount, baseSpecsPageCount, 
    onStartOver,
    triageReport, addenda, executiveSummary, summaryError, 
    isSummaryLoading, onGenerateSummary,
    costAnalysisResult, costAnalysisError, onGenerateCostImpact,
    onGenerateTriageReport, isTriageLoading, triageError,
    onAnalyzeAdditionalAddenda, isAnalyzingIncrementally
}: ResultsViewProps) {
    const [activeView, setActiveView] = useState<ViewMode>(() => {
        const hasDrawingChanges = changeLog.some(c => c.source_original_document === 'drawings');
        if (hasDrawingChanges || baseDrawingsDoc) return 'drawings';
        if (baseSpecsDoc) return 'specs';
        if (qaLog && qaLog.length > 0) return 'qa';
        return 'specs';
    });
    
    const [viewMode, setViewMode] = useState<ResultsSubView>('list');
    const [isAnalyzingCost, setIsAnalyzingCost] = useState(false);
    const [detailedPage, setDetailedPage] = useState<ConformedPageInfo | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const addendaInputRef = useRef<HTMLInputElement>(null);
    const ITEMS_PER_PAGE = 28; // 4 rows of 7 thumbnails

    const drawingsConformingPlan = useConformedDocument(
        changeLog.filter(c => c.source_original_document === 'drawings'), baseDrawingsPageCount, 'drawings'
    );
    const specsConformingPlan = useConformedDocument(
        changeLog.filter(c => c.source_original_document === 'specs'), baseSpecsPageCount, 'specs'
    );

    const conformedDocument = activeView === 'specs' ? specsConformingPlan : drawingsConformingPlan;
    const activeBaseDocProxy = activeView === 'specs' ? baseSpecsDoc : baseDrawingsDoc;
    const activeDocTitle = activeView === 'specs' ? 'Specifications' : 'Drawings';

    useEffect(() => {
        setCurrentPage(1);
    }, [activeView]);

    const totalPages = useMemo(() => Math.ceil(conformedDocument.length / ITEMS_PER_PAGE), [conformedDocument, ITEMS_PER_PAGE]);
    const paginatedDocument = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return conformedDocument.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [conformedDocument, currentPage, ITEMS_PER_PAGE]);

    const handleViewCostReport = async () => {
        if (!costAnalysisResult) {
            setIsAnalyzingCost(true);
            await onGenerateCostImpact();
            setIsAnalyzingCost(false);
        }
        setViewMode('cost');
    };
    
    const handleViewTriageReport = async () => {
        if (!triageReport) { // Check if report doesn't exist yet
            await onGenerateTriageReport();
        }
        setViewMode('triage');
    };

    const handleSelectChangeFromReport = () => {
        setViewMode('list');
    };

    const handleSaveProject = () => {
        setSaveStatus('saving');
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        }, 500);
    };

    const handleTriggerAddendaUpload = () => {
        addendaInputRef.current?.click();
    };

    const handleNewAddendaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            onAnalyzeAdditionalAddenda(files);
        }
        // Reset the input value to allow uploading the same file again
        if (e.target) {
            e.target.value = '';
        }
    };

    const renderContent = () => {
        const addendumNames = addenda.map(a => a.name).join(', ');
        switch(viewMode) {
            case 'triage':
                if (isTriageLoading) {
                    return <ProcessingView headline="Generating Triage Report..." subline="Our AI is preparing your high-level summary. This shouldn't take long." />;
                }
                if (triageError) {
                    return <ErrorDisplay title="Triage Report Error" message={triageError} onReset={() => setViewMode('list')} />;
                }
                return triageReport ? <InteractiveTriageReport report={triageReport} addendumName={addendumNames} changeLog={changeLog.filter(c => c.source_original_document === activeView)} onSelectFilter={() => setViewMode('list')} onBackToList={() => setViewMode('list')} /> : (
                     <div className="flex flex-col h-full items-center justify-center text-center p-8">
                        <DocumentChartBarIcon className="h-16 w-16 mx-auto text-slate-300" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-700">Triage Report Not Generated</h3>
                        <p className="mt-1 text-sm text-slate-500 max-w-sm">The AI Triage Report provides a high-level summary of changes. Generate it to get an instant overview.</p>
                        <button onClick={handleViewTriageReport} className="mt-6 flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm">
                            <SparklesIcon className="h-5 w-5" />
                            Generate Triage Report
                        </button>
                    </div>
                );
            case 'cost':
                return <CostImpactAnalysisView analysisResult={costAnalysisResult} analysisError={costAnalysisError} changeLog={changeLog} onSelectChange={handleSelectChangeFromReport} onBack={() => setViewMode('list')} />;
            case 'summary':
                return <ExecutiveSummaryReport triageReport={triageReport} executiveSummary={executiveSummary} costAnalysisResult={costAnalysisResult} onBack={() => setViewMode('list')} />;
            case 'list':
            default:
                return (
                    <div className="flex flex-col h-full">
                        {detailedPage && (
                             <PageDetailModal
                                pageInfo={detailedPage}
                                baseDocProxy={activeBaseDocProxy}
                                addendaDocs={addendaDocs}
                                onClose={() => setDetailedPage(null)}
                            />
                        )}
                        <input
                            type="file"
                            ref={addendaInputRef}
                            onChange={handleNewAddendaFiles}
                            multiple
                            accept="application/pdf"
                            style={{ display: 'none' }}
                        />
                        <ResultsHeader 
                            onStartOver={onStartOver}
                            isAnalyzingCost={isAnalyzingCost}
                            onViewCostReport={handleViewCostReport}
                            onViewTriageReport={handleViewTriageReport}
                            onViewSummaryReport={() => setViewMode('summary')}
                            triageReport={triageReport}
                            activeView={activeView}
                            onSetActiveView={setActiveView}
                            setChangeLog={setChangeLog}
                            changeLog={changeLog}
                            qaLog={qaLog}
                            baseSpecsDoc={baseSpecsDoc}
                            baseDrawingsDoc={baseDrawingsDoc}
                            conformedDocument={conformedDocument}
                            activeBaseDocProxy={activeBaseDocProxy}
                            addendaDocs={addendaDocs}
                            isTriageLoading={isTriageLoading}
                            onGenerateSummary={onGenerateSummary}
                            isSummaryLoading={isSummaryLoading}
                            executiveSummary={executiveSummary}
                            onSaveProject={handleSaveProject}
                            saveStatus={saveStatus}
                            onAddAddenda={handleTriggerAddendaUpload}
                            addenda={addenda}
                            isAnalyzingIncrementally={isAnalyzingIncrementally}
                        />

                        <div className="mt-6">
                           {(isSummaryLoading || executiveSummary || summaryError) && (
                                <ExecutiveSummary 
                                    summary={executiveSummary} 
                                    error={summaryError} 
                                    isLoading={isSummaryLoading}
                                />
                            )}
                        </div>
                        
                        <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-slate-50 mt-4 relative">
                            <AnimatePresence>
                                {isAnalyzingIncrementally && (
                                    <MotionDiv 
                                        className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <ProcessingView headline="Analyzing New Addenda..." subline="Merging findings into your current project." />
                                    </MotionDiv>
                                )}
                            </AnimatePresence>
                             {activeView === 'qa' ? (
                                <QandAView qaLog={qaLog} />
                             ) : conformedDocument.length > 0 ? (
                                <>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-slate-800">Conformed {activeDocTitle}</h3>
                                        {totalPages > 1 && (
                                            <span className="text-sm font-medium text-slate-600 tabular-nums">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-6">
                                        {paginatedDocument.map(pageInfo => (
                                            <PageCard 
                                                key={`${activeView}-${pageInfo.conformedPageNumber}`} 
                                                pageInfo={pageInfo}
                                                baseDocProxy={activeBaseDocProxy}
                                                addendaDocs={addendaDocs}
                                                onClick={() => setDetailedPage(pageInfo)}
                                            />
                                        ))}
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-6 mt-8">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                aria-label="Previous page"
                                            >
                                                <ChevronLeftIcon className="h-5 w-5" />
                                            </button>
                                            <span className="text-sm font-semibold text-slate-700 tabular-nums">
                                                Page {currentPage} <span className="font-normal text-slate-500">of {totalPages}</span>
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                aria-label="Next page"
                                            >
                                                <ChevronRightIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-slate-500">
                                         <DocumentIcon className="h-16 w-16 mx-auto text-slate-300" />
                                         <h3 className="mt-2 text-lg font-semibold">No Document to Display</h3>
                                         <p className="mt-1 text-sm">The conformed document is empty.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    };
    
    return <div className="h-full">{renderContent()}</div>;
}