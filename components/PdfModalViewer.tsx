
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { drawAnnotations, drawSpotlightAnnotation } from '../services/pdfAnnotationService';
import { CloseIcon } from './icons/CloseIcon';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { ZoomOutIcon } from './icons/ZoomOutIcon';
import { AppChangeLogItem, ChangeType, ConformedPageInfo, SelectionRect, ChangeStatus, RiskLevel } from '../types';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { Spinner } from './Spinner';
import { extractTextInRect } from '../services/pdfTextExtractor';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface Rect { x: number; y: number; width: number; height: number; }

interface PdfModalViewerPropsView {
    mode: 'view';
    isOpen: boolean;
    onClose: () => void;
    pageInfo: ConformedPageInfo;
    pdfDoc: any; 
    isConformed: boolean;
    originalDocProxy?: pdfjsLib.PDFDocumentProxy | null; 
    addendaDocs?: Map<string, pdfjsLib.PDFDocumentProxy>;
}

interface PdfModalViewerPropsLocate {
    mode: 'locate';
    isOpen: boolean;
    onClose: () => void;
    pdfDoc: any;
    onLocationSelected: (location: { pageNumber: number, rect: Rect, extractedText: string }) => void;
}

interface PdfModalViewerPropsSource {
    mode: 'source';
    isOpen: boolean;
    onClose: () => void;
    pdfDoc: any; 
    pageNumber: number;
    textToHighlight?: string;
    sourceOriginalDocument: 'specs' | 'drawings';
}

type PdfModalViewerProps = PdfModalViewerPropsView | PdfModalViewerPropsLocate | PdfModalViewerPropsSource;

const PdfModalViewer = (props: PdfModalViewerProps) => {
    const { isOpen, onClose, pdfDoc } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasRefLeft = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const renderTaskRefLeft = useRef<any>(null);
    const [isRendering, setIsRendering] = useState(true);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const [isViewInitialized, setIsViewInitialized] = useState(false);

    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(0.95); 
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const [renderScale, setRenderScale] = useState(1.0);

    const [currentPageForLocator, setCurrentPageForLocator] = useState(1);
    const [isSelecting, setIsSelecting] = useState(false);
    const selectionStart = useRef({ x: 0, y: 0 });
    const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ rect: Rect, extractedText: string } | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const isSideBySide = props.mode === 'view' && !!props.originalDocProxy;

    const pageNumToRender = useMemo(() => {
        if (props.mode === 'view') return props.pageInfo.map.source_page_number;
        if (props.mode === 'source') return props.pageNumber;
        return currentPageForLocator;
    }, [props, currentPageForLocator]);

    const pageNumToRenderLeft = useMemo(() => {
        if (props.mode === 'view' && props.originalDocProxy) {
            return props.pageInfo.map.original_page_for_comparison || props.pageInfo.map.source_page_number;
        }
        return null;
    }, [props]);

    const modalTitle = useMemo(() => {
        if (props.mode === 'locate') return 'Coordinate Extraction';
        if (props.mode === 'source') return 'Instruction Source';
        if (isSideBySide) return 'Architectural Delta Lens';
        return 'Project Insight';
    }, [props.mode, isSideBySide]);

    const handleRefocus = useCallback(() => {
        setPan({ x: 0, y: 0 });
        setZoom(0.95);
        setRenderScale(1.0);
    }, []);

    const renderPage = async (doc: any, pageNum: number, canvas: HTMLCanvasElement, renderTaskRef: React.MutableRefObject<any>, isLeft: boolean) => {
        if (!canvas || !doc) return;
        if (renderTaskRef.current) renderTaskRef.current.cancel();

        const container = viewerContainerRef.current;
        if (!container || container.clientWidth === 0) return;
        
        const ctx = canvas.getContext('2d', { alpha: false })!;
        let page: pdfjsLib.PDFPageProxy | null = null;
        try {
            page = await doc.getPage(pageNum);
            const unscaledViewport = page.getViewport({ scale: 1 });
            
            // Maximize usage of vertical and horizontal space
            const padding = 120;
            const availableWidth = isSideBySide ? (container.clientWidth - padding) / 2 : container.clientWidth - padding;
            const availableHeight = container.clientHeight - padding;
            
            const scaleWidth = availableWidth / unscaledViewport.width;
            const scaleHeight = availableHeight / unscaledViewport.height;
            const scale = Math.min(scaleWidth, scaleHeight) * renderScale;
            
            const viewport = page.getViewport({ scale });

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const task = page.render({ canvas, canvasContext: ctx, viewport, intent: 'display' });
            renderTaskRef.current = task;
            await task.promise;
            renderTaskRef.current = null;

            if (props.mode === 'view' && !isLeft && props.isConformed) {
                await drawAnnotations(ctx, page, viewport, props.pageInfo.approvedTextChanges);
            } else if (props.mode === 'source' && props.textToHighlight) {
                const mockChange: AppChangeLogItem = {
                    id: -1, status: ChangeStatus.PENDING, addendum_name: '', change_type: ChangeType.GENERAL_NOTE, 
                    description: '', source_page: props.pageNumber, location_hint: props.textToHighlight,
                    source_original_document: props.sourceOriginalDocument, risk_level: RiskLevel.INFO, audit_trail: []
                };
                await drawSpotlightAnnotation(ctx, page, viewport, mockChange);
            }
        } catch (err: any) {
            renderTaskRef.current = null;
            if (err.name !== 'RenderingCancelledException') console.error("PDF engine fault:", err);
        } finally {
            if (page) page.cleanup();
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setIsViewInitialized(false);
            return;
        }

        let isCancelled = false;
        setIsRendering(true);
        setIsViewInitialized(false);

        const renderAll = async () => {
            if (isSideBySide && props.mode === 'view' && props.originalDocProxy) {
                await Promise.all([
                    renderPage(props.originalDocProxy, pageNumToRenderLeft!, canvasRefLeft.current!, renderTaskRefLeft, true),
                    renderPage(props.pdfDoc, pageNumToRender, canvasRef.current!, renderTaskRef, false)
                ]);
            } else {
                await renderPage(props.pdfDoc, pageNumToRender, canvasRef.current!, renderTaskRef, false);
            }

            if (!isCancelled) {
                setIsRendering(false);
                setIsViewInitialized(true);
            }
        };

        const timer = setTimeout(renderAll, 150);
        return () => { isCancelled = true; clearTimeout(timer); };
    }, [isOpen, pdfDoc, pageNumToRender, props, renderScale]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (props.mode === 'locate') {
            if (confirmModal) return;
            setIsSelecting(true);
            const rect = canvasRef.current!.getBoundingClientRect();
            selectionStart.current = { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
            setSelectionRect(null);
        } else {
            setIsPanning(true);
            panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
        } else if (isSelecting && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const endX = (e.clientX - rect.left - pan.x) / zoom;
            const endY = (e.clientY - rect.top - pan.y) / zoom;
            setSelectionRect({
                x: Math.min(selectionStart.current.x, endX),
                y: Math.min(selectionStart.current.y, endY),
                width: Math.abs(endX - selectionStart.current.x),
                height: Math.abs(endY - selectionStart.current.y),
            });
        }
    };

    const handleMouseUp = async () => {
        setIsPanning(false);
        if (isSelecting) {
            setIsSelecting(false);
            if (!selectionRect || props.mode !== 'locate') return;
            setIsExtracting(true);
            const page = await pdfDoc.getPage(pageNumToRender);
            const extractedText = await extractTextInRect(page, selectionRect, page.getViewport({ scale: 1 }));
            setConfirmModal({ rect: selectionRect, extractedText });
            setIsExtracting(false);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const factor = 1.1;
        const newZoom = e.deltaY > 0 ? zoom / factor : zoom * factor;
        setZoom(Math.max(0.1, Math.min(newZoom, 10)));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#0f172a] z-[200] flex flex-col animate-pop-in overflow-hidden font-sans">
            {/* Studio Header: Blueprint Themed */}
            <div className="w-full px-8 py-4 bg-[#1e293b] border-b border-slate-700/50 flex items-center justify-between z-[210] shrink-0 shadow-2xl">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-brand-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                        <span className="text-slate-100 font-black text-[11px] uppercase tracking-[0.25em]">{modalTitle}</span>
                    </div>
                    {props.mode === 'locate' && (
                        <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl p-1 border border-slate-700">
                            <button onClick={() => setCurrentPageForLocator(p => Math.max(1, p-1))} className="p-1.5 text-white hover:bg-slate-700 rounded-lg transition-all"><ChevronLeftIcon className="h-4 w-4"/></button>
                            <span className="text-white text-[10px] font-black px-3 uppercase tracking-widest">P. {currentPageForLocator}</span>
                            <button onClick={() => setCurrentPageForLocator(p => Math.min(pdfDoc.numPages, p+1))} className="p-1.5 text-white hover:bg-slate-700 rounded-lg transition-all"><ChevronRightIcon className="h-4 w-4"/></button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700">
                        <button onClick={handleRefocus} title="Reset View" className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"><ArrowPathIcon className="h-4 w-4"/></button>
                        <div className="h-4 w-px bg-slate-700 mx-1"></div>
                        <button onClick={() => setZoom(z => z / 1.15)} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"><ZoomOutIcon className="h-4 w-4"/></button>
                        <span className="text-white font-black text-[10px] w-12 text-center tabular-nums tracking-tighter">{(zoom * 100).toFixed(0)}%</span>
                        <button onClick={() => setZoom(z => z * 1.15)} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"><ZoomInIcon className="h-4 w-4"/></button>
                    </div>
                    <button onClick={onClose} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 shadow-lg">
                        <CloseIcon className="h-5 w-5"/>
                    </button>
                </div>
            </div>
            
            {/* Full-Bleed Studio Viewport */}
            <div
                ref={viewerContainerRef}
                className="flex-grow overflow-hidden relative flex items-center justify-center p-4 bg-[#0f172a]"
                style={{ backgroundImage: 'radial-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
            >
                {isRendering && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-sm">
                        <Spinner colorClass="text-brand-400 scale-[1.5]" />
                    </div>
                )}
                
                <div 
                    className={`flex items-start justify-center gap-6 transition-all duration-700 ${isViewInitialized ? 'opacity-100' : 'opacity-0 scale-98'}`}
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}
                >
                    {isSideBySide && (
                        <div className="relative">
                            <div className="absolute -top-10 left-0 flex items-center gap-2 px-4 py-1.5 bg-red-600/90 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-t-xl border-t border-x border-red-500/50 shadow-xl backdrop-blur-md">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                Original Reference
                            </div>
                            <canvas ref={canvasRefLeft} className="shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-sm bg-white" />
                        </div>
                    )}
                    <div className="relative">
                         <div className="absolute -top-10 left-0 flex items-center gap-2 px-4 py-1.5 bg-brand-600/90 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-t-xl border-t border-x border-brand-500/50 shadow-xl backdrop-blur-md">
                             <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                             {props.mode === 'view' ? 'Conformed Output' : 'Target Buffer'}
                         </div>
                        <canvas ref={canvasRef} className="shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-sm bg-white" />
                        {selectionRect && (
                            <div className="absolute border-2 border-dashed border-brand-400 bg-brand-400/10 pointer-events-none"
                                style={{ left: selectionRect.x, top: selectionRect.y, width: selectionRect.width, height: selectionRect.height }}
                            />
                        )}
                    </div>
                </div>

                {/* Floating Bottom Legend */}
                {props.mode === 'view' && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-full flex items-center gap-10 shadow-2xl z-[220]">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-8 bg-red-500/20 border border-red-500/50 rounded shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Base State</span>
                        </div>
                        <div className="h-4 w-px bg-slate-700"></div>
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-8 bg-brand-500/20 border border-brand-500/50 rounded shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Integrated Changes</span>
                        </div>
                    </div>
                )}
            </div>

            {confirmModal && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl z-[230] flex items-center justify-center p-8">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-xl w-full overflow-hidden animate-pop-in border border-slate-200">
                        <div className="p-10">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Validate Vectors</h3>
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl max-h-64 overflow-y-auto">
                                <p className="text-sm text-slate-700 font-mono leading-relaxed">{confirmModal.extractedText}</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                            <button onClick={() => setConfirmModal(null)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900">Discard</button>
                            <button onClick={() => { props.mode === 'locate' && props.onLocationSelected({ pageNumber: pageNumToRender, rect: confirmModal.rect, extractedText: confirmModal.extractedText }); setConfirmModal(null); onClose(); }} 
                                className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-brand-600 transition-all">Accept Telemetry</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfModalViewer;
