
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { AppChangeLogItem, ConformedPageInfo, TriageReportData, AICostAnalysisResult, QAndAItem, ProjectFile, AppPhase, AppState, ClickableArea } from '../types';
import { Spinner } from './Spinner';
import ExecutiveSummary from './ExecutiveSummary';
import InteractiveTriageReport from './InteractiveTriageReport';
import CostImpactAnalysisView from './CostImpactAnalysisView';
import ExecutiveSummaryReport from './ExecutiveSummaryReport';
import ResultsHeader from './ResultsHeader';
import PdfViewer from './PdfViewer';
import { CloseIcon, DocumentIcon, ChevronLeftIcon, ChevronRightIcon, DocumentChartBarIcon, SparklesIcon, DocumentPlusIcon, ZoomInIcon, ZoomOutIcon, ArrowPathIcon, ArrowsRightLeftIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useConformedDocument } from '../hooks/useConformedDocument';
import ProcessingView from './ProcessingView';
import { ErrorDisplay } from './ErrorDisplay';
import QandAView from './QandAView';
import { useDropzone } from 'react-dropzone';

type ViewMode = 'specs' | 'drawings' | 'qa';
export type ResultsSubView = 'list' | 'triage' | 'cost' | 'summary';
export type SaveStatus = 'saving' | 'saved';

const MotionDiv = motion.div as any;

interface PageCardProps {
    pageInfo: ConformedPageInfo;
    baseDocProxy: pdfjsLib.PDFDocumentProxy | null;
    addendaDocs: Map<string, pdfjsLib.PDFDocumentProxy>;
    onClick: () => void;
}

const PageCard: React.FC<PageCardProps> = ({ pageInfo, baseDocProxy, addendaDocs, onClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;
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
            
            let page: pdfjsLib.PDFPageProxy | null = null;
            try {
                page = await docProxy.getPage(map.source_page_number);
                if (isCancelled || !canvasRef.current) return;
                
                const TARGET_WIDTH = 300;
                const unscaledViewport = page.getViewport({ scale: 1 });
                const scale = TARGET_WIDTH / unscaledViewport.width;
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const renderContext = { canvas, canvasContext: ctx, viewport };
                renderTaskRef.current = page.render(renderContext);

                await renderTaskRef.current.promise;
                renderTaskRef.current = null;
            } catch (error: any) {
                renderTaskRef.current = null;
            } finally {
                if (page && !page.destroyed) page.cleanup();
                if (!isCancelled) setIsLoading(false);
            }
        };
        
        renderThumbnail();
        return () => { isCancelled = true; renderTaskRef.current?.cancel(); };
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
            {banner && <div className={`absolute top-0 right-0 text-center text-white text-[10px] font-bold py-1 px-3 ${banner.style} rounded-bl-lg`}>{banner.text}</div>}
            <div className="p-2 bg-white border-t border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-600">Page {pageInfo.conformedPageNumber}</p>
            </div>
        </MotionDiv>
    );
};

const AddAddendaModal = ({ isOpen, onClose, onAnalyze }: { isOpen: boolean, onClose: () => void, onAnalyze: (files: File[]) => void }) => {
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setStagedFiles(prev => [...prev, ...acceptedFiles].filter((v,i,a)=>a.findIndex(t=>(t.name === v.name))===i));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] } });

    const handleAnalyze = () => {
        onAnalyze(stagedFiles);
        setStagedFiles([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">Add More Addenda</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="h-6 w-6 text-slate-500"/></button>
                </div>
                
                <div className="p-8 overflow-y-auto space-y-6">
                    <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-400 bg-slate-50'}`}>
                        <input {...getInputProps()} />
                        <DocumentPlusIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-700 font-semibold">Drop new addenda here</p>
                        <p className="text-slate-500 text-sm mt-1">Surgically update your project blueprint</p>
                    </div>

                    {stagedFiles.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Selected Files</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {stagedFiles.map(file => (
                                    <div key={file.name} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                        <span className="text-sm font-semibold text-slate-700 truncate pr-4">{file.name}</span>
                                        <button onClick={() => setStagedFiles(prev => prev.filter(f => f !== file))} className="text-slate-400 hover:text-red-500 transition-colors"><CloseIcon className="h-4 w-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                    <button onClick={handleAnalyze} disabled={stagedFiles.length === 0} className="px-8 py-2.5 text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-md transition-all disabled:bg-slate-300">
                        Analyze & Merge Changes
                    </button>
                </div>
            </MotionDiv>
        </div>
    );
};

interface PageDetailModalProps {
    pageInfo: ConformedPageInfo;
    baseDocProxy: pdfjsLib.PDFDocumentProxy | null;
    addendaDocs: Map<string, pdfjsLib.PDFDocumentProxy>;
    onClose: () => void;
}

const PageDetailModal = ({ pageInfo, baseDocProxy, addendaDocs, onClose }: PageDetailModalProps) => {
    let leftDoc: pdfjsLib.PDFDocumentProxy | null = null, leftPageNum, leftTitle = 'Original (Blueprint)';
    let rightDoc: pdfjsLib.PDFDocumentProxy | null = null, rightPageNum, rightTitle = 'Conformed', rightChanges: AppChangeLogItem[] = [];
    const { map, approvedTextChanges } = pageInfo;
    
    if (map.source_document === 'original') {
        rightDoc = baseDocProxy;
        rightPageNum = map.source_page_number;
        rightChanges = approvedTextChanges;
        if (approvedTextChanges.length > 0) {
            leftDoc = baseDocProxy;
            leftPageNum = map.source_page_number;
        }
    } else {
        rightDoc = addendaDocs.get(map.addendum_name!) || null;
        rightPageNum = map.source_page_number;
        if (map.original_page_for_comparison) {
            leftDoc = baseDocProxy;
            leftPageNum = map.original_page_for_comparison;
            leftTitle = 'Original (Replaced)';
        }
        rightTitle = 'New Page (Addendum)';
    }
    
    const [pan, setPan] = useState({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    const [sharedScale, setSharedScale] = useState<number | undefined>(undefined);
    const workbenchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculateSharedScale = async () => {
            if (!workbenchRef.current) return;
            const containerWidth = workbenchRef.current.clientWidth / (leftDoc ? 2 : 1);
            
            try {
                const rightPage = await rightDoc?.getPage(rightPageNum);
                const rightWidth = rightPage?.getViewport({ scale: 1 }).width || 0;
                
                let maxUnscaledWidth = rightWidth;
                if (leftDoc && leftPageNum) {
                    const leftPage = await leftDoc.getPage(leftPageNum);
                    const leftWidth = leftPage.getViewport({ scale: 1 }).width;
                    maxUnscaledWidth = Math.max(rightWidth, leftWidth);
                }

                if (maxUnscaledWidth > 0) {
                    const effectiveScale = (containerWidth - 60) / maxUnscaledWidth;
                    setSharedScale(effectiveScale);
                }
            } catch (e) {
                console.error("Shared scale calculation failed", e);
            }
        };
        calculateSharedScale();
    }, [leftDoc, rightDoc, leftPageNum, rightPageNum]);
    
    return (
        <div className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 animate-pop-in">
            <div className="w-full max-w-[1920px] flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-white font-black text-lg tracking-tight">Comparison Workbench</span>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Page {pageInfo.conformedPageNumber} Analysis</span>
                    </div>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
                        <button onClick={() => setZoom(z => z / 1.1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all"><ZoomOutIcon className="h-4 w-4"/></button>
                        <span className="text-xs font-black text-slate-300 w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                        <button onClick={() => setZoom(z => z * 1.1)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all"><ZoomInIcon className="h-4 w-4"/></button>
                        <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} title="Reset Zoom" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all"><ArrowPathIcon className="h-4 w-4"/></button>
                    </div>
                </div>
                <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all bg-slate-900 border border-slate-800 shadow-xl"><CloseIcon className="h-6 w-6"/></button>
            </div>

            <div ref={workbenchRef} className="w-full flex-grow flex items-stretch justify-center gap-6 overflow-hidden">
                {leftDoc && (
                    <MotionDiv initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1 min-w-0">
                        <PdfViewer 
                            title={leftTitle} 
                            pdfDoc={leftDoc} 
                            pageNum={leftPageNum} 
                            changesToAnnotate={[]} 
                            pan={pan} setPan={setPan} zoom={zoom} setZoom={setZoom} 
                            onCanvasClick={() => {}} onSetClickableAreas={() => {}} onShowInModal={() => {}} 
                            selectedChangeId={null} hoveredChange={null} changeLog={[]}
                            forcedScale={sharedScale}
                            hideToolbar={true}
                        />
                    </MotionDiv>
                )}
                
                {leftDoc && (
                    <div className="flex flex-col items-center justify-center gap-4 opacity-50 px-2">
                        <div className="w-0.5 h-full bg-gradient-to-b from-transparent via-slate-800 to-transparent"></div>
                        <div className="bg-slate-900 border border-slate-800 p-2 rounded-full shadow-2xl">
                           <ArrowsRightLeftIcon className="h-5 w-5 text-brand-500" />
                        </div>
                        <div className="w-0.5 h-full bg-gradient-to-b from-transparent via-slate-800 to-transparent"></div>
                    </div>
                )}

                <MotionDiv initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1 min-w-0">
                    <PdfViewer 
                        title={rightTitle} 
                        pdfDoc={rightDoc} 
                        pageNum={rightPageNum} 
                        changesToAnnotate={rightChanges} 
                        pan={pan} setPan={setPan} zoom={zoom} setZoom={setZoom} 
                        onCanvasClick={() => {}} onSetClickableAreas={() => {}} onShowInModal={() => {}} 
                        selectedChangeId={null} hoveredChange={null} changeLog={[]}
                        forcedScale={sharedScale}
                        hideToolbar={true}
                        isReplaceable={map.source_document === 'addendum' && !!map.original_page_for_comparison}
                        originalDocForDiff={baseDocProxy}
                        addendaDocsForDiff={addendaDocs}
                        conformedPageInfoForDiff={pageInfo}
                    />
                </MotionDiv>
            </div>

            <div className="w-full max-w-4xl mt-6 px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                        <SparklesIcon className="h-4 w-4 text-brand-500" />
                    </div>
                    <p className="text-xs text-slate-300">
                        {approvedTextChanges.length > 0 
                          ? `${approvedTextChanges.length} approved text changes applied to this view.`
                          : map.source_document === 'addendum' 
                            ? `Displaying new page from ${map.addendum_name}.`
                            : 'No specific text changes identified on this page.'
                        }
                    </p>
                </div>
                <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500"></span> ADDED</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> REMOVED</div>
                </div>
            </div>
        </div>
    );
};

interface ResultsViewProps {
    projectName: string;
    onUpdateProjectName: (name: string) => void;
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
    isSaving: boolean;
}

export default function ResultsView({ 
    projectName, onUpdateProjectName, changeLog, qaLog, setChangeLog, 
    baseDrawingsDoc, baseSpecsDoc, addendaDocs, 
    baseDrawingsPageCount, baseSpecsPageCount, 
    onStartOver,
    triageReport, addenda, executiveSummary, summaryError, 
    isSummaryLoading, onGenerateSummary,
    costAnalysisResult, costAnalysisError, onGenerateCostImpact,
    onGenerateTriageReport, isTriageLoading, triageError,
    onAnalyzeAdditionalAddenda, isAnalyzingIncrementally,
    isSaving
}: ResultsViewProps) {
    const [activeView, setActiveView] = useState<ViewMode>(() => {
        if (changeLog.some(c => c.source_original_document === 'drawings') || baseDrawingsDoc) return 'drawings';
        if (baseSpecsDoc) return 'specs';
        return 'qa';
    });
    
    const [viewMode, setViewMode] = useState<ResultsSubView>('list');
    const [detailedPage, setDetailedPage] = useState<ConformedPageInfo | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const ITEMS_PER_PAGE = 28;

    const drawingsConformingPlan = useConformedDocument(changeLog.filter(c => c.source_original_document === 'drawings'), baseDrawingsPageCount, 'drawings');
    const specsConformingPlan = useConformedDocument(changeLog.filter(c => c.source_original_document === 'specs'), baseSpecsPageCount, 'specs');

    const conformedDocument = activeView === 'specs' ? specsConformingPlan : drawingsConformingPlan;
    const activeBaseDocProxy = activeView === 'specs' ? baseSpecsDoc : baseDrawingsDoc;
    const activeDocTitle = activeView === 'specs' ? 'Specifications' : 'Drawings';

    useEffect(() => { setCurrentPage(1); }, [activeView]);

    const totalPages = useMemo(() => Math.ceil(conformedDocument.length / ITEMS_PER_PAGE), [conformedDocument]);
    const paginatedDocument = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return conformedDocument.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [conformedDocument, currentPage]);

    const handleViewCostReport = async () => {
        if (!costAnalysisResult) await onGenerateCostImpact();
        setViewMode('cost');
    };
    
    const handleViewTriageReport = async () => {
        if (!triageReport) await onGenerateTriageReport();
        setViewMode('triage');
    };

    const renderContent = () => {
        const addendumNames = addenda.map(a => a.name).join(', ');
        switch(viewMode) {
            case 'triage':
                if (isTriageLoading) return <ProcessingView headline="Generating Triage Report..." subline="Preparing AI summary..." />;
                if (triageError) return <ErrorDisplay title="Triage Error" message={triageError} onReset={() => setViewMode('list')} />;
                return triageReport ? <InteractiveTriageReport report={triageReport} addendumName={addendumNames} changeLog={changeLog.filter(c => c.source_original_document === activeView)} onSelectFilter={() => setViewMode('list')} onBackToList={() => setViewMode('list')} /> : null;
            case 'cost':
                return <CostImpactAnalysisView analysisResult={costAnalysisResult} analysisError={costAnalysisError} changeLog={changeLog} onSelectChange={() => setViewMode('list')} onBack={() => setViewMode('list')} />;
            case 'summary':
                return <ExecutiveSummaryReport triageReport={triageReport} executiveSummary={executiveSummary} costAnalysisResult={costAnalysisResult} onBack={() => setViewMode('list')} />;
            case 'list':
            default:
                return (
                    <div className="flex flex-col h-full container mx-auto">
                        <AnimatePresence>
                            {detailedPage && <PageDetailModal pageInfo={detailedPage} baseDocProxy={activeBaseDocProxy} addendaDocs={addendaDocs} onClose={() => setDetailedPage(null)} />}
                        </AnimatePresence>
                        <AddAddendaModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAnalyze={onAnalyzeAdditionalAddenda} />
                        
                        <ResultsHeader 
                            projectName={projectName}
                            onUpdateProjectName={onUpdateProjectName}
                            onStartOver={onStartOver}
                            isAnalyzingCost={false}
                            onViewCostReport={handleViewCostReport}
                            onViewTriageReport={handleViewTriageReport}
                            onViewSummaryReport={() => setViewMode('summary')}
                            triageReport={triageReport}
                            activeView={activeView}
                            onSetActiveView={onSetActiveView => { setActiveView(onSetActiveView); setCurrentPage(1); }}
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
                            onSaveProject={() => {}} 
                            saveStatus={isSaving ? 'saving' : 'saved'}
                            onAddAddenda={() => setIsAddModalOpen(true)}
                            addenda={addenda}
                            isAnalyzingIncrementally={isAnalyzingIncrementally}
                        />
                        <div className="mt-6 flex flex-col space-y-6">
                           {(isSummaryLoading || executiveSummary || summaryError) && <ExecutiveSummary summary={executiveSummary} error={summaryError} isLoading={isSummaryLoading} />}
                            <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm relative">
                                <AnimatePresence>{isAnalyzingIncrementally && <MotionDiv className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 rounded-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ProcessingView headline="Merging Addenda..." subline="Syncing results..." /></MotionDiv>}</AnimatePresence>
                                 {activeView === 'qa' ? <QandAView qaLog={qaLog} /> : conformedDocument.length > 0 ? (
                                    <>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold text-slate-800">Conformed {activeDocTitle}</h3>
                                            {totalPages > 1 && <span className="text-sm font-medium text-slate-600 tabular-nums">Page {currentPage} of {totalPages}</span>}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-6">
                                            {paginatedDocument.map(pageInfo => <PageCard key={`${activeView}-${pageInfo.conformedPageNumber}`} pageInfo={pageInfo} baseDocProxy={activeBaseDocProxy} addendaDocs={addendaDocs} onClick={() => setDetailedPage(pageInfo)} />)}
                                        </div>
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-center gap-6 mt-8">
                                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeftIcon className="h-5 w-5" /></button>
                                                <span className="text-sm font-semibold text-slate-700 tabular-nums">Page {currentPage} <span className="font-normal text-slate-500">of {totalPages}</span></span>
                                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRightIcon className="h-5 w-5" /></button>
                                            </div>
                                        )}
                                    </>
                                ) : <div className="flex items-center justify-center h-64 text-center text-slate-500"><DocumentIcon className="h-16 w-16 mx-auto text-slate-300" /><h3 className="mt-2 text-lg font-semibold">No Document to Display</h3></div>}
                            </div>
                        </div>
                    </div>
                );
        }
    };
    
    return <div className="min-h-full py-6 px-4">{renderContent()}</div>;
}
