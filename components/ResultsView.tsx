
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { AppChangeLogItem, ConformedPageInfo, TriageReportData, AICostAnalysisResult, QAndAItem, ProjectFile, AppPhase, AppState, ClickableArea, ChatMessage, ProjectVersion } from '../types';
import { Spinner } from './Spinner';
import ExecutiveSummary from './ExecutiveSummary';
import InteractiveTriageReport from './InteractiveTriageReport';
import CostImpactAnalysisView from './CostImpactAnalysisView';
import ExecutiveSummaryReport from './ExecutiveSummaryReport';
import ResultsHeader from './ResultsHeader';
import PdfModalViewer from './PdfModalViewer';
import { VersionHistoryModal } from './VersionHistoryModal';
import { CloseIcon, DocumentIcon, ChevronLeftIcon, ChevronRightIcon, DocumentChartBarIcon, SparklesIcon, DocumentPlusIcon, ZoomInIcon, ZoomOutIcon, ArrowPathIcon, ArrowsRightLeftIcon, BotMessageSquareIcon, PaperAirplaneIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useConformedDocument } from '../hooks/useConformedDocument';
import ProcessingView from './ProcessingView';
import { ErrorDisplay } from './ErrorDisplay';
import QandAView from './QandAView';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from "@google/genai";

type ViewMode = 'specs' | 'drawings' | 'qa';
export type ResultsSubView = 'list' | 'triage' | 'cost' | 'summary';
export type SaveStatus = 'saving' | 'saved';

const MotionDiv = motion.div as any;

const SidebarChat = ({ isOpen, onClose, changeLog, projectName }: { isOpen: boolean, onClose: () => void, changeLog: AppChangeLogItem[], projectName: string }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '1', role: 'model', text: `**Aegis Analyst** online. Initializing project telemetry for **${projectName}**. I have verified the conformed set integrity. How shall we proceed?`, timestamp: Date.now() }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Project: ${projectName}. Context: We have ${changeLog.length} conformed changes. User Question: ${input}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { systemInstruction: "You are 'Aegis Analyst', an elite construction documentation intelligence. Answer with extreme technical precision and professional authority." }
            });
            const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: response.text || "I encountered a synchronization error in the data stream.", timestamp: Date.now() };
            setMessages(prev => [...prev, modelMsg]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <MotionDiv
                    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 right-0 h-full w-full max-w-md bg-white/95 backdrop-blur-2xl border-l border-slate-200 z-[200] shadow-2xl flex flex-col"
                >
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg border border-slate-800">
                                <BotMessageSquareIcon className="h-6 w-6 text-brand-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Aegis Analyst</h3>
                                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-tight">Status: Intelligence Core Active</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="h-6 w-6 text-slate-400"/></button>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 p-4 rounded-3xl rounded-tl-none flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                        <div className="relative">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Consult Aegis..."
                                className="w-full pl-6 pr-14 py-4 bg-white border-2 border-slate-100 rounded-[2rem] text-sm font-bold focus:border-brand-500 outline-none transition-all shadow-inner"
                            />
                            <button 
                                onClick={handleSendMessage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-brand-600 transition-all shadow-lg"
                            >
                                <PaperAirplaneIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </MotionDiv>
            )}
        </AnimatePresence>
    );
};

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
                
                const TARGET_WIDTH = 400; 
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
            ? { text: 'REPLACED', style: 'bg-sky-600' }
            : { text: 'ADDED', style: 'bg-indigo-600' };
    } else if (pageInfo.approvedTextChanges.length > 0) {
        banner = { text: 'MODIFIED', style: 'bg-emerald-600' };
    }

    return (
        <MotionDiv
            onClick={onClick}
            className="group relative aspect-[8.5/11] bg-white rounded-2xl shadow-sm hover:shadow-2xl hover:ring-4 hover:ring-brand-500/20 transition-all duration-500 cursor-pointer flex flex-col overflow-hidden border border-slate-200"
            layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        >
            <div className="flex-grow flex items-center justify-center bg-slate-50 overflow-hidden relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
                        <Spinner colorClass="text-slate-300" />
                    </div>
                )}
                <canvas ref={canvasRef} className={`transition-opacity duration-700 block max-w-full max-h-full ${isLoading ? 'opacity-0' : 'opacity-100'}`} />
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-500"></div>
            </div>
            {banner && <div className={`absolute top-0 right-0 text-center text-white text-[9px] font-black py-1.5 px-4 ${banner.style} rounded-bl-2xl shadow-xl z-10 uppercase tracking-[0.2em]`}>{banner.text}</div>}
            <div className="p-3 bg-white border-t border-slate-100 text-center relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {pageInfo.conformedPageNumber}</p>
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[140] flex items-center justify-center p-4">
            <MotionDiv initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Expand Project Intel</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="h-6 w-6 text-slate-500"/></button>
                </div>
                
                <div className="p-10 overflow-y-auto space-y-8">
                    <div {...getRootProps()} className={`border-4 border-dashed rounded-[2rem] p-16 text-center transition-all cursor-pointer ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-100 hover:border-brand-300 bg-slate-50/50'}`}>
                        <input {...getInputProps()} />
                        <div className="bg-white h-20 w-20 rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6">
                            <DocumentPlusIcon className="h-10 w-10 text-brand-600" />
                        </div>
                        <p className="text-slate-800 font-black uppercase tracking-widest text-sm">Drop Supplemental Files</p>
                        <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest opacity-60 italic">AI will automatically reconcile new instructions</p>
                    </div>

                    {stagedFiles.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ready for Injection ({stagedFiles.length})</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {stagedFiles.map(file => (
                                    <div key={file.name} className="flex items-center justify-between p-4 bg-white border-2 border-slate-50 rounded-2xl shadow-sm">
                                        <span className="text-sm font-bold text-slate-800 truncate pr-4">{file.name}</span>
                                        <button onClick={() => setStagedFiles(prev => prev.filter(f => f !== file))} className="p-1.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><CloseIcon className="h-4 w-4"/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-100 transition-all">Cancel</button>
                    <button onClick={handleAnalyze} disabled={stagedFiles.length === 0} className="px-10 py-4 text-xs font-black uppercase tracking-widest text-white bg-brand-600 rounded-2xl hover:bg-brand-700 shadow-2xl shadow-brand-500/20 transition-all disabled:opacity-30 disabled:shadow-none">
                        Execute Merge
                    </button>
                </div>
            </MotionDiv>
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
    versions?: ProjectVersion[];
    updateProjectState: (updater: (prev: AppState) => AppState) => void;
}

export default function ResultsView(props: ResultsViewProps) {
    const { 
        projectName, onUpdateProjectName, changeLog, qaLog, setChangeLog, 
        baseDrawingsDoc, baseSpecsDoc, addendaDocs, 
        baseDrawingsPageCount, baseSpecsPageCount, 
        onStartOver,
        triageReport, addenda, executiveSummary, summaryError, 
        isSummaryLoading, onGenerateSummary,
        costAnalysisResult, costAnalysisError, onGenerateCostImpact,
        onGenerateTriageReport, isTriageLoading, triageError,
        onAnalyzeAdditionalAddenda, isAnalyzingIncrementally,
        isSaving, versions = [], updateProjectState
    } = props;

    const [activeView, setActiveView] = useState<ViewMode>(() => {
        if (changeLog.some(c => c.source_original_document === 'drawings') || baseDrawingsDoc) return 'drawings';
        if (baseSpecsDoc) return 'specs';
        return 'qa';
    });
    
    const [viewMode, setViewMode] = useState<ResultsSubView>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedPageForModal, setSelectedPageForModal] = useState<ConformedPageInfo | null>(null);
    
    const ITEMS_PER_PAGE = 30;

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

    const handleCreateVersion = (label: string) => {
        updateProjectState(prev => {
            const newVersion: ProjectVersion = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                label,
                changeLogSnapshot: [...prev.changeLog],
                qaLogSnapshot: [...prev.qaLog],
                createdBy: prev.currentUser?.name || 'Unknown'
            };
            return {
                ...prev,
                versions: [...(prev.versions || []), newVersion]
            };
        });
    };

    const handleRestoreVersion = (v: ProjectVersion) => {
        updateProjectState(prev => ({
            ...prev,
            changeLog: [...v.changeLogSnapshot],
            qaLog: [...v.qaLogSnapshot]
        }));
    };

    const handleDeleteVersion = (id: string) => {
        updateProjectState(prev => ({
            ...prev,
            versions: (prev.versions || []).filter(v => v.id !== id)
        }));
    };

    const renderContent = () => {
        const addendumNames = addenda.map(a => a.name).join(', ');
        switch(viewMode) {
            case 'triage':
                if (isTriageLoading) return <ProcessingView headline="Calibrating Intelligence HUD..." subline="Mapping conformed data points..." />;
                if (triageError) return <ErrorDisplay title="Intelligence Drop" message={triageError} onReset={() => setViewMode('list')} />;
                return triageReport ? <InteractiveTriageReport report={triageReport} addendumName={addendumNames} changeLog={changeLog.filter(c => c.source_original_document === activeView)} onSelectFilter={() => setViewMode('list')} onBackToList={() => setViewMode('list')} /> : null;
            case 'cost':
                return <CostImpactAnalysisView analysisResult={costAnalysisResult} analysisError={costAnalysisError} changeLog={changeLog} onSelectChange={() => setViewMode('list')} onBack={() => setViewMode('list')} />;
            case 'summary':
                return <ExecutiveSummaryReport triageReport={triageReport} executiveSummary={executiveSummary} costAnalysisResult={costAnalysisResult} onBack={() => setViewMode('list')} />;
            case 'list':
            default:
                return (
                    <div className="flex flex-col h-full max-w-[1600px] mx-auto">
                        <AddAddendaModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAnalyze={onAnalyzeAdditionalAddenda} />
                        <VersionHistoryModal 
                            isOpen={isHistoryModalOpen} 
                            onClose={() => setIsHistoryModalOpen(false)} 
                            versions={versions} 
                            onRestore={handleRestoreVersion} 
                            onCreate={handleCreateVersion}
                            onDelete={handleDeleteVersion}
                        />
                        
                        <div className="pb-8">
                            <ResultsHeader 
                                projectName={projectName}
                                onUpdateProjectName={onUpdateProjectName}
                                onStartOver={onStartOver}
                                isAnalyzingCost={false}
                                onViewCostReport={handleViewCostReport}
                                onViewTriageReport={handleViewTriageReport}
                                onViewSummaryReport={() => setViewMode('summary')}
                                onViewHistory={() => setIsHistoryModalOpen(true)}
                                triageReport={triageReport}
                                activeView={activeView}
                                onSetActiveView={v => { setActiveView(v); setCurrentPage(1); }}
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
                                versionCount={versions.length}
                            />
                        </div>
                        
                        <div className="flex flex-col space-y-8">
                           <AnimatePresence>
                               {(isSummaryLoading || executiveSummary || summaryError) && (
                                    <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                        <ExecutiveSummary summary={executiveSummary} error={summaryError} isLoading={isSummaryLoading} />
                                    </MotionDiv>
                               )}
                           </AnimatePresence>
                           
                           <div className="p-8 sm:p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-50 rounded-full blur-[100px] opacity-20 -mr-48 -mt-48"></div>
                                <AnimatePresence>
                                    {isAnalyzingIncrementally && (
                                        <MotionDiv className="absolute inset-0 bg-white/90 backdrop-blur-md z-40 rounded-[3rem] flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <ProcessingView headline="Aegis Reasoning..." subline="Recalibrating project telemetry with new addenda data..." />
                                        </MotionDiv>
                                    )}
                                </AnimatePresence>

                                {activeView === 'qa' ? (
                                    <QandAView qaLog={qaLog} />
                                ) : conformedDocument.length > 0 ? (
                                    <>
                                        <div className="flex justify-between items-center mb-8 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-1.5 bg-brand-600 rounded-full"></div>
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Conformed {activeDocTitle}</h3>
                                            </div>
                                            {totalPages > 1 && (
                                                <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] bg-brand-50 px-4 py-2 rounded-full border border-brand-100">
                                                    Page Group {currentPage} / {totalPages}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
                                            <AnimatePresence mode="popLayout">
                                                {paginatedDocument.map(pageInfo => (
                                                    <PageCard 
                                                        key={`${activeView}-${pageInfo.conformedPageNumber}`} 
                                                        pageInfo={pageInfo} 
                                                        baseDocProxy={activeBaseDocProxy} 
                                                        addendaDocs={addendaDocs} 
                                                        onClick={() => setSelectedPageForModal(pageInfo)} 
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-center gap-8 mt-16 pb-4">
                                                <button 
                                                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                                    disabled={currentPage === 1} 
                                                    className="flex items-center justify-center w-14 h-14 rounded-3xl bg-white border-2 border-slate-100 text-slate-400 hover:border-brand-500 hover:text-brand-600 disabled:opacity-20 transition-all shadow-sm hover:shadow-xl active:scale-90"
                                                >
                                                    <ChevronLeftIcon className="h-7 w-7" />
                                                </button>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xl font-black text-slate-900 tabular-nums">{currentPage}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OF {totalPages}</span>
                                                </div>
                                                <button 
                                                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                                                    disabled={currentPage === totalPages} 
                                                    className="flex items-center justify-center w-14 h-14 rounded-3xl bg-white border-2 border-slate-100 text-slate-400 hover:border-brand-500 hover:text-brand-600 disabled:opacity-20 transition-all shadow-sm hover:shadow-xl active:scale-90"
                                                >
                                                    <ChevronRightIcon className="h-7 w-7" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-80 text-center">
                                        <div className="bg-slate-50 p-6 rounded-[2.5rem] mb-6 shadow-inner">
                                            <DocumentIcon className="h-16 w-16 text-slate-200" />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">INDEX EMPTY</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">No data structure found for this category</p>
                                    </div>
                                )}
                           </div>
                        </div>

                        {selectedPageForModal && (
                            <PdfModalViewer
                                mode="view"
                                isOpen={!!selectedPageForModal}
                                onClose={() => setSelectedPageForModal(null)}
                                pageInfo={selectedPageForModal}
                                pdfDoc={selectedPageForModal.map.source_document === 'addendum' ? addendaDocs.get(selectedPageForModal.map.addendum_name!) : activeBaseDocProxy}
                                isConformed={true}
                                originalDocProxy={activeBaseDocProxy}
                                addendaDocs={addendaDocs}
                            />
                        )}
                    </div>
                );
        }
    };
    
    return (
        <div className="min-h-full py-8 px-6 bg-slate-50/50 relative">
            {renderContent()}
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="fixed bottom-10 right-10 h-16 w-16 bg-slate-900 text-white rounded-[2rem] shadow-2xl flex items-center justify-center hover:bg-brand-600 hover:scale-110 transition-all z-[150] active:scale-95 group border-4 border-white"
            >
                <BotMessageSquareIcon className="h-8 w-8 text-brand-400" />
                <div className="absolute right-full mr-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                    Consult Aegis Analyst
                </div>
            </button>
            <SidebarChat 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                changeLog={changeLog} 
                projectName={projectName} 
            />
        </div>
    );
}
