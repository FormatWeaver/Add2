
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { DocumentIcon } from './icons/DocumentIcon';
import { PdfFileIcon } from './icons/PdfFileIcon';
import { CloseIcon } from './icons/CloseIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { AppState, AppPhase, ProjectFile } from '../types';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { Spinner } from './Spinner';
import { PlusIcon } from './icons/PlusIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

const MotionDiv = motion.div as any;
const MotionImg = motion.img as any;

interface FileCardProps {
    file: File | ProjectFile | null;
    onRemove?: (e: React.MouseEvent) => void;
    isBlueprintReady?: boolean;
    key?: React.Key;
}

const FileCard: React.FC<FileCardProps> = ({ file, onRemove, isBlueprintReady }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

    useEffect(() => {
        if (!file || !(file instanceof File) || file.type !== 'application/pdf') {
            setIsLoading(false);
            setProgress(100);
            setThumbnailUrl(null);
            return;
        }

        let isCancelled = false;

        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
            renderTaskRef.current = null;
        }
        
        setIsLoading(true);
        setProgress(0);
        setThumbnailUrl(null);

        const generateThumbnail = async () => {
            let pdf: pdfjsLib.PDFDocumentProxy | undefined;
            try {
                const loadingTask = pdfjsLib.getDocument(await file.arrayBuffer());
                
                loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
                    if (isCancelled || !progressData.total) return;
                    setProgress(Math.min(100, (progressData.loaded / progressData.total) * 100));
                };

                pdf = await loadingTask.promise;
                if (isCancelled) return;

                const page = await pdf.getPage(1);
                if (isCancelled) return;

                const viewport = page.getViewport({ scale: 0.4 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const canvasContext = canvas.getContext('2d');
                if (!canvasContext) {
                    if (!isCancelled) setIsLoading(false);
                    return;
                }

                renderTaskRef.current = page.render({ canvas, canvasContext, viewport });
                await renderTaskRef.current.promise;
                renderTaskRef.current = null;

                if (!isCancelled) {
                    setThumbnailUrl(canvas.toDataURL());
                }
            } catch (err: any) {
                renderTaskRef.current = null;
                if (err.name !== 'RenderingCancelledException') {
                    console.error("Failed to generate PDF thumbnail:", err);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                    setProgress(100);
                }
                pdf?.destroy().catch(() => {});
            }
        };

        generateThumbnail();

        return () => {
            isCancelled = true;
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };
    }, [file]);

    if (!file) {
        return <div className="text-center text-slate-500 p-4 border border-dashed rounded-lg">File not available</div>;
    }

    return (
        <MotionDiv
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full flex flex-col items-center bg-white p-3 rounded-xl shadow-md border border-slate-200 text-center relative"
        >
             {isBlueprintReady && (
                <MotionDiv
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 250, damping: 20 }}
                    className="absolute -top-2 -left-2 z-20"
                    title="Blueprint file ready"
                >
                    <CheckCircleIcon className="h-7 w-7 text-brand-500 bg-white rounded-full shadow" />
                </MotionDiv>
            )}
            <div className="aspect-[3/4] w-full bg-slate-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-slate-200 relative">
                 <AnimatePresence mode="wait">
                    {(isLoading && !thumbnailUrl) ? (
                        <MotionDiv
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full h-full bg-slate-200 animate-pulse p-4"
                        >
                            <div className="space-y-2">
                                <div className="h-2.5 bg-slate-300 rounded w-3/4"></div>
                                <div className="h-2 bg-slate-300 rounded w-full"></div>
                                <div className="h-2 bg-slate-300 rounded w-5/6"></div>
                            </div>
                        </MotionDiv>
                    ) : thumbnailUrl ? (
                        <MotionImg 
                            key="thumbnail"
                            src={thumbnailUrl} 
                            alt={`Preview of ${file.name}`} 
                            className="w-full h-full object-cover" 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        />
                    ) : (
                        <MotionDiv key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <PdfFileIcon className="h-10 w-10 text-slate-400" />
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>
            <span className="text-sm font-semibold text-slate-800 truncate block w-full px-1" title={file.name}>
                {file.name}
            </span>
            <span className="text-xs text-slate-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3">
                <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
            {onRemove && (
                <button onClick={onRemove} className="absolute -top-2 -right-2 p-1 rounded-full bg-white hover:bg-slate-100 shadow-md border border-slate-200 transition-transform hover:scale-110" aria-label={`Remove ${file.name}`}>
                    <CloseIcon className="h-4 w-4 text-slate-600" />
                </button>
            )}
        </MotionDiv>
    );
};

const BlueprintFileChip = ({ file }: { file: File | ProjectFile | null }) => {
    if (!file) return null;
    return (
        <MotionDiv initial={{ opacity: 0, scale:0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 bg-brand-50 rounded-full py-1.5 px-4 border border-brand-200/80 shadow-sm">
            <PdfFileIcon className="h-5 w-5 text-brand-600" />
            <span className="text-sm font-semibold text-brand-800">{file.name}</span>
        </MotionDiv>
    );
};

interface DocumentUploaderProps {
  appState: AppState;
  stagedFiles: { baseDrawings: File | null; baseSpecs: File | null; };
  onStartIndexing: (baseDrawings: File | null, baseSpecs: File | null, projectName: string, directives?: string) => void;
  onAnalyzeAddenda: (addenda: File[]) => void;
  onReset: () => void;
}

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = ["Create Blueprint", "Analyze Addenda"];
    return (
      <div className="flex items-center justify-center gap-4 sm:gap-8 w-full max-w-lg mx-auto mb-8 sm:mb-12 flex-shrink-0">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isActive ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : isCompleted ? 'bg-white border-brand-600 text-brand-600' : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircleIcon className="w-6 h-6" /> : <span className="font-bold text-lg">{stepNumber}</span>}
                </div>
                <p className={`mt-2 text-sm font-semibold ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>{step}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mt-[-1.5rem] transition-colors duration-500 ${isCompleted ? 'bg-brand-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
};

const Dropzone = ({ getRootProps, getInputProps, isDragActive, title, description, icon: Icon, isBatch }: any) => (
    <MotionDiv
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        {...getRootProps()}
        className={`w-full h-full min-h-[250px] rounded-xl flex flex-col justify-center items-center border-2 border-dashed transition-all duration-300 cursor-pointer p-6 ${
            isDragActive ? 'border-brand-500 bg-brand-100/50' : 'bg-slate-50 border-slate-200 hover:border-brand-400'
        }`}
    >
        <input {...getInputProps()} />
        <MotionDiv
            animate={{ scale: isDragActive ? 1.15 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="relative"
        >
            <Icon className={`h-12 w-12 transition-colors duration-300 ${isDragActive ? 'text-brand-600' : 'text-slate-500'}`} />
            {isBatch && (
                <div className="absolute -top-1 -right-1 bg-brand-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-lg">Batch</div>
            )}
        </MotionDiv>
        <p className="font-bold text-slate-800 mt-4 text-center">{title}</p>
        <p className="text-sm text-slate-500 mt-1 text-center max-w-xs">{description}</p>
    </MotionDiv>
);

export default function DocumentUploader({ appState, stagedFiles, onStartIndexing, onAnalyzeAddenda, onReset }: DocumentUploaderProps) {
    const [stagedBaseDrawings, setStagedBaseDrawings] = useState<File | null>(null);
    const [stagedBaseSpecs, setStagedBaseSpecs] = useState<File | null>(null);
    const [stagedAddenda, setStagedAddenda] = useState<File[]>([]);
    const [projectName, setProjectName] = useState('');
    const [customDirectives, setCustomDirectives] = useState('');
    const actionAreaRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (!projectName && (stagedBaseSpecs || stagedBaseDrawings)) {
            const file = stagedBaseSpecs || stagedBaseDrawings;
            const derivedName = file?.name
                .replace(/\.pdf$/i, '')
                .replace(/[_-]/g, ' ')
                .replace(/(\b(tender|specs?|specifications?|drawings?|set|manual|project|final)\b)/ig, '')
                .replace(/\s+/g, ' ')
                .trim();
            setProjectName(derivedName || '');
        }
    }, [stagedBaseSpecs, stagedBaseDrawings, projectName]);

    // Auto-scroll logic: scroll to action button when files are added
    useEffect(() => {
        if (stagedBaseDrawings || stagedBaseSpecs || stagedAddenda.length > 0) {
            const timer = setTimeout(() => {
                actionAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [stagedBaseDrawings, stagedBaseSpecs, stagedAddenda.length]);

    const onDrawingsDrop = useCallback((acceptedFiles: File[]) => setStagedBaseDrawings(acceptedFiles[0] || null), []);
    const onSpecsDrop = useCallback((acceptedFiles: File[]) => setStagedBaseSpecs(acceptedFiles[0] || null), []);
    const onAddendumDrop = useCallback((acceptedFiles: File[]) => setStagedAddenda(prev => [...prev, ...acceptedFiles].filter((v,i,a)=>a.findIndex(t=>(t.name === v.name))===i)), []);

    const handleRemoveAddendum = (e: React.MouseEvent, fileToRemove: File) => {
        e.stopPropagation();
        setStagedAddenda(prev => prev.filter(f => f !== fileToRemove));
    };

    const isProjectSetup = appState.phase === AppPhase.PROJECT_SETUP || appState.phase === AppPhase.INDEXING_FAILED;
    const isAddendaUpload = appState.phase === AppPhase.ADDENDA_UPLOAD || appState.phase === AppPhase.ANALYSIS_FAILED;

    const { getRootProps: getDrawingsRootProps, getInputProps: getDrawingsInputProps, isDragActive: isDrawingsDragActive } = useDropzone({ onDrop: onDrawingsDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false, disabled: !isProjectSetup });
    const { getRootProps: getSpecsRootProps, getInputProps: getSpecsInputProps, isDragActive: isSpecsDragActive } = useDropzone({ onDrop: onSpecsDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false, disabled: !isProjectSetup });
    const { getRootProps: getAddendumRootProps, getInputProps: getAddendumInputProps, isDragActive: isAddendumDragActive } = useDropzone({ onDrop: onAddendumDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true, disabled: !isAddendaUpload });

    const hasSpecs = !!(stagedFiles.baseSpecs || appState.baseSpecs);
    const hasDrawings = !!(stagedFiles.baseDrawings || appState.baseDrawings);

    const renderBlueprintSlot = (
        file: File | null,
        onRemove: () => void,
        dropzoneProps: any,
        title: string,
        description: string
    ) => {
        if (file) {
            return <FileCard file={file} onRemove={(e) => { e.stopPropagation(); onRemove(); }} />;
        }
        return <Dropzone {...dropzoneProps} title={title} description={description} icon={DocumentIcon} />;
    };


    const setupView = (
        <MotionDiv key="setup" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, ease: 'easeInOut' }} className="w-full max-w-5xl pb-16">
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">Create a New Project</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500">Transform your base tender documents into an intelligent AI blueprint.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-5xl mx-auto mb-12">
                <div>
                    <label htmlFor="projectName" className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Project Title</label>
                    <input 
                        type="text" 
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g., Metrotown Tower B"
                        className="w-full px-6 py-4 text-xl font-bold border-2 border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none bg-slate-50/50"
                    />
                </div>
                <div>
                    <label htmlFor="directives" className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        Aegis Briefing Directives
                        <span className="bg-brand-100 text-brand-600 px-2 py-0.5 rounded text-[8px] tracking-widest uppercase">Expert</span>
                    </label>
                    <textarea 
                        id="directives"
                        value={customDirectives}
                        onChange={(e) => setCustomDirectives(e.target.value)}
                        placeholder="e.g., 'Specifically flag any structural steel substitutions' or 'Monitor changes to closing time.'"
                        className="w-full px-6 py-4 text-sm font-bold border-2 border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none bg-slate-50/50 h-[64px] resize-none"
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-[2fr_auto_2fr] gap-8 items-start">
                 <AnimatePresence mode="wait">
                    {renderBlueprintSlot(
                        stagedBaseSpecs,
                        () => setStagedBaseSpecs(null),
                        { getRootProps: getSpecsRootProps, getInputProps: getSpecsInputProps, isDragActive: isSpecsDragActive },
                        "Original Specs",
                        "Drop your Project Manual or Specifications (PDF)"
                    )}
                </AnimatePresence>
                 <div className="hidden md:flex justify-center items-center pt-24">
                    <PlusIcon className="w-8 h-8 text-slate-300" />
                </div>
                 <AnimatePresence mode="wait">
                    {renderBlueprintSlot(
                        stagedBaseDrawings,
                        () => setStagedBaseDrawings(null),
                        { getRootProps: getDrawingsRootProps, getInputProps: getDrawingsInputProps, isDragActive: isDrawingsDragActive },
                        "Original Drawings",
                        "Drop your Tender Set or Drawings (PDF)"
                    )}
                </AnimatePresence>
            </div>
            
            <div ref={actionAreaRef} className="mt-12 text-center flex flex-col items-center gap-4">
                 <button onClick={() => onStartIndexing(stagedBaseDrawings, stagedBaseSpecs, projectName, customDirectives)} disabled={(!stagedBaseDrawings && !stagedBaseSpecs) || !projectName.trim()} className="flex items-center gap-3 px-10 py-5 bg-brand-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-brand-500/20 hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-500/50 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-300 text-lg hover:-translate-y-1 active:translate-y-0">
                    <SparklesIcon className="h-6 w-6" /> Index Blueprint
                  </button>
            </div>
        </MotionDiv>
    );

    const addendaView = (
        <MotionDiv key="addenda" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, ease: 'easeInOut' }} className="w-full max-w-5xl pb-16">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    <CheckCircleIcon className="h-4 w-4" /> Blueprint Synchronized
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">Addenda Analysis</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500">Upload any addenda to surgically identify changes, or proceed to index just the base set.</p>
            </div>
            
            <div className="flex justify-center items-center flex-wrap gap-3 sm:gap-4 mb-10">
                <AnimatePresence>
                    {hasSpecs && <BlueprintFileChip file={stagedFiles.baseSpecs || appState.baseSpecs} />}
                    {hasDrawings && <BlueprintFileChip file={stagedFiles.baseDrawings || appState.baseDrawings} />}
                </AnimatePresence>
                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all hover:text-red-600"
                    title="Change base documents"
                >
                    <ArrowPathIcon className="h-4 w-4" /> Switch Files
                </button>
            </div>

            <div className="w-full max-w-3xl mx-auto min-h-[300px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {stagedAddenda.length === 1 ? (
                        <MotionDiv
                            key="single-file-view"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-sm"
                        >
                            <FileCard 
                                file={stagedAddenda[0]} 
                                onRemove={(e) => { e.stopPropagation(); setStagedAddenda([]); }}
                            />
                        </MotionDiv>
                    ) : (
                         <MotionDiv
                            key="dropzone-view"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full"
                         >
                            <Dropzone
                                getRootProps={getAddendumRootProps}
                                getInputProps={getAddendumInputProps}
                                isDragActive={isAddendumDragActive}
                                isBatch={stagedAddenda.length > 1}
                                title={stagedAddenda.length > 1 ? `Ready to Merge ${stagedAddenda.length} Files` : "Upload Addenda"}
                                description={stagedAddenda.length > 1 ? "Drop more files to add to this batch" : "Drop one or more addenda PDFs here to perform multi-document reasoning"}
                                icon={DocumentPlusIcon}
                            />
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>

            {stagedAddenda.length > 1 && (
                <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 w-full">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Staged for Integration ({stagedAddenda.length})</h3>
                        <button onClick={() => setStagedAddenda([])} className="text-xs font-bold text-slate-400 hover:text-red-500">Clear Batch</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        <AnimatePresence>
                            {stagedAddenda.map(file => (
                                <FileCard key={file.name + file.lastModified} file={file} onRemove={(e) => handleRemoveAddendum(e, file)} />
                            ))}
                        </AnimatePresence>
                    </div>
                </MotionDiv>
            )}

            <div ref={actionAreaRef} className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-6">
                {stagedAddenda.length === 0 ? (
                    <div className="flex flex-col items-center gap-4">
                        <button 
                            onClick={() => onAnalyzeAddenda([])} 
                            className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all text-lg group"
                        >
                            Index Base Set Only <ArrowRightIcon className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Proceeding without Addenda</p>
                    </div>
                ) : (
                    <button 
                        onClick={() => onAnalyzeAddenda(stagedAddenda)} 
                        className="flex items-center gap-3 px-12 py-6 bg-brand-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-brand-500/20 hover:bg-brand-700 transition-all text-lg hover:-translate-y-1 active:translate-y-0"
                    >
                        <SparklesIcon className="h-6 w-6" /> Analyze {stagedAddenda.length} Addenda
                    </button>
                )}
            </div>
        </MotionDiv>
    );

    return (
        <div className="w-full min-h-full flex flex-col items-center justify-start py-12 px-6 bg-white overflow-y-auto">
            <StepIndicator currentStep={isProjectSetup ? 1 : 2} />
             <AnimatePresence mode="wait">
                {isProjectSetup && setupView}
                {isAddendaUpload && addendaView}
             </AnimatePresence>
             <div className="mt-auto pt-16 flex items-center gap-6 opacity-40">
                <div className="flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Stateless Processing</span></div>
                <div className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">FIPS 140-2 Encrypted</span></div>
             </div>
        </div>
    );
}
