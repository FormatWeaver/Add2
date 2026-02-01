
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
    pdfDoc: any; // The addendum pdf doc
    pageNumber: number;
    textToHighlight?: string;
    sourceOriginalDocument: 'specs' | 'drawings';
}


type PdfModalViewerProps = PdfModalViewerPropsView | PdfModalViewerPropsLocate | PdfModalViewerPropsSource;


const PdfModalViewer = (props: PdfModalViewerProps) => {
    const { isOpen, onClose, pdfDoc } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const [isRendering, setIsRendering] = useState(true);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const [isViewInitialized, setIsViewInitialized] = useState(false);

    // --- Pan, Zoom, and Refocus State ---
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const [renderScale, setRenderScale] = useState(1.0);
    // --- End Pan, Zoom, and Refocus State ---

    const [currentPageForLocator, setCurrentPageForLocator] = useState(1);
    const [isSelecting, setIsSelecting] = useState(false);
    const selectionStart = useRef({ x: 0, y: 0 });
    const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ rect: Rect, extractedText: string } | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const pageNumToRender = useMemo(() => {
        if (props.mode === 'view') {
            const { isConformed, pageInfo } = props;
            return isConformed 
                ? pageInfo.map.source_page_number
                : pageInfo.map.original_page_for_comparison || pageInfo.map.source_page_number;
        }
        if (props.mode === 'source') {
            return props.pageNumber;
        }
        return currentPageForLocator;
    }, [props, currentPageForLocator]);

    const modalTitle = useMemo(() => {
        if (props.mode === 'locate') return 'Select Area on Page';
        if (props.mode === 'source') return 'Source Instruction in Addendum';
        return 'Page Viewer';
    }, [props.mode]);

    const handleRefocus = useCallback(() => {
        if (zoom > 1.05) {
            setRenderScale(prev => prev * zoom);
            setPan({ x: 0, y: 0 });
            setZoom(1);
        }
    }, [zoom]);

    useEffect(() => {
        if (!isOpen) {
            setIsViewInitialized(false);
            return;
        }
    
        let isCancelled = false;
        setIsRendering(true);
        setIsViewInitialized(false);
        setRenderScale(1.0);
    
        const render = async () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            const canvas = canvasRef.current;
            const container = viewerContainerRef.current;
            if (!canvas || !container || !pdfDoc || container.clientWidth === 0) { 
                setIsRendering(false); 
                return; 
            }
            const ctx = canvas.getContext('2d')!;
            
            let page: pdfjsLib.PDFPageProxy | null = null;
            try {
                page = await pdfDoc.getPage(pageNumToRender);
                if (isCancelled) return;
    
                const unscaledViewport = page.getViewport({ scale: 1 });
                const scale = (container.clientWidth / unscaledViewport.width) * 0.9 * renderScale;
                const viewport = page.getViewport({ scale: scale });
    
                canvas.height = viewport.height;
                canvas.width = viewport.width;
    
                setPan({ x: 0, y: 0 });
                setZoom(1);
    
                const task = page.render({ canvas, canvasContext: ctx, viewport });
                renderTaskRef.current = task;
                await task.promise;
                renderTaskRef.current = null;
                
                if (isCancelled) return;
    
                if (props.mode === 'view' && props.isConformed) {
                    await drawAnnotations(ctx, page, viewport, props.pageInfo.approvedTextChanges);
                } else if (props.mode === 'source' && props.textToHighlight) {
                     // Comment: Added risk_level and audit_trail to satisfy AppChangeLogItem interface requirements in mock object fix.
                     const mockChangeForHighlighting: AppChangeLogItem = {
                        id: -1, status: ChangeStatus.PENDING, addendum_name: '', change_type: ChangeType.GENERAL_NOTE, 
                        description: '', source_page: props.pageNumber, location_hint: props.textToHighlight,
                        source_original_document: props.sourceOriginalDocument,
                        risk_level: RiskLevel.INFO,
                        audit_trail: []
                    };
                    await drawSpotlightAnnotation(ctx, page, viewport, mockChangeForHighlighting);
                }
            } catch (err: any) {
                renderTaskRef.current = null;
                if (err.name !== 'RenderingCancelledException') {
                    console.error("PDF modal rendering failed:", err);
                }
            } finally {
                if (page) {
                    page.cleanup();
                }
                if (!isCancelled) {
                    setIsRendering(false);
                    setIsViewInitialized(true);
                }
            }
        };

        const timer = setTimeout(render, 50);

        return () => { 
            isCancelled = true; 
            clearTimeout(timer);
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }
        };
    }, [isOpen, pdfDoc, pageNumToRender, props, renderScale]);
    
    useEffect(() => {
        if (props.mode === 'locate' && isOpen) setCurrentPageForLocator(1);
    }, [props.mode, isOpen]);
    
    // --- Pan and Zoom Handlers for Modal ---
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (props.mode === 'locate') {
             if (confirmModal) return;
             e.preventDefault();
             setIsSelecting(true);
             const rect = canvasRef.current!.getBoundingClientRect();
             const startX = (e.clientX - rect.left - pan.x) / zoom;
             const startY = (e.clientY - rect.top - pan.y) / zoom;
             selectionStart.current = { x: startX, y: startY };
             setSelectionRect(null);
        } else {
            e.preventDefault();
            setIsPanning(true);
            panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        }
    };
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isPanning) {
            e.preventDefault();
            setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
        } else if (isSelecting && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const endX = (e.clientX - rect.left - pan.x) / zoom;
            const endY = (e.clientY - rect.top - pan.y) / zoom;
            const startX = selectionStart.current.x;
            const startY = selectionStart.current.y;
            setSelectionRect({
                x: Math.min(startX, endX), y: Math.min(startY, endY),
                width: Math.abs(endX - startX), height: Math.abs(endY - startY),
            });
        }
    };
    const handleMouseUp = async () => {
        setIsPanning(false);
        if (isSelecting) {
            setIsSelecting(false);
            if (!selectionRect || !canvasRef.current || props.mode !== 'locate') return;
            if (selectionRect.width < 5 || selectionRect.height < 5) { setSelectionRect(null); return; }
            
            setIsExtracting(true);
            try {
                const page = await pdfDoc.getPage(pageNumToRender);
                const extractionViewport = page.getViewport({ scale: 1 });
                const canvasSpaceRect = {
                    x: selectionRect.x, y: selectionRect.y,
                    width: selectionRect.width, height: selectionRect.height
                };
                const extractedText = await extractTextInRect(page, canvasSpaceRect, extractionViewport);
                setConfirmModal({ rect: selectionRect, extractedText });
            } catch (error) {
                console.error("Error extracting text:", error);
                alert("Could not extract text from this selection.");
                setSelectionRect(null);
            } finally {
                 setIsExtracting(false);
            }
        }
    };
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }
        e.preventDefault();
        const container = viewerContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomFactor = 1.2;
        const newZoom = e.deltaY > 0 ? zoom / zoomFactor : zoom * zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 10));
        const oldImageX = (mouseX - pan.x) / zoom;
        const oldImageY = (mouseY - pan.y) / zoom;
        const newPanX = mouseX - oldImageX * clampedZoom;
        const newPanY = mouseY - oldImageY * clampedZoom;
        setZoom(clampedZoom);
        setPan({ x: newPanX, y: newPanY });
    };
    // --- End Pan and Zoom Handlers ---
    
    const handleConfirmSelection = () => {
        if (!confirmModal || props.mode !== 'locate') return;
        props.onLocationSelected({ pageNumber: pageNumToRender, rect: confirmModal.rect, extractedText: confirmModal.extractedText });
        resetLocatorState();
    };
    
    const resetLocatorState = () => {
        setSelectionRect(null);
        setConfirmModal(null);
        onClose();
    };

    if (!isOpen) return null;
        
    const cursorClass = props.mode === 'locate' ? 'cursor-crosshair' : (isPanning ? 'cursor-grabbing' : 'cursor-grab');

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 animate-pop-in">
            <div className="absolute top-0 w-full px-4 py-2 bg-slate-900/50 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                     <span className="text-white font-semibold text-sm">{modalTitle}</span>
                     {props.mode === 'locate' && (
                        <>
                             <button onClick={() => setCurrentPageForLocator(p => Math.max(1, p-1))} disabled={currentPageForLocator <= 1} className="p-2 text-white hover:bg-white/20 rounded-full disabled:opacity-50">
                                <ChevronLeftIcon className="h-6 w-6"/>
                            </button>
                            <span className="text-white font-semibold w-20 text-center">Page {currentPageForLocator} / {pdfDoc.numPages}</span>
                            <button onClick={() => setCurrentPageForLocator(p => Math.min(pdfDoc.numPages, p+1))} disabled={currentPageForLocator >= pdfDoc.numPages} className="p-2 text-white hover:bg-white/20 rounded-full disabled:opacity-50">
                                <ChevronRightIcon className="h-6 w-6"/>
                            </button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleRefocus} disabled={zoom <= 1.05} title="Refocus for clarity" className="p-2 text-white hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><ArrowPathIcon className="h-6 w-6"/></button>
                    <button onClick={() => setZoom(z => z / 1.2)} className="p-2 text-white hover:bg-white/20 rounded-full"><ZoomOutIcon className="h-6 w-6"/></button>
                    <span className="text-white font-semibold w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoom(z => z * 1.2)} className="p-2 text-white hover:bg-white/20 rounded-full"><ZoomInIcon className="h-6 w-6"/></button>
                    <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-full"><CloseIcon className="h-7 w-7"/></button>
                </div>
            </div>
            
            <div
                ref={viewerContainerRef}
                className="w-full h-full overflow-hidden flex items-center justify-center pt-12"
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
            >
                 {isRendering && <Spinner colorClass="text-white" />}
                 <div className={`relative ${cursorClass}`}>
                    <div 
                        className={`transition-opacity duration-300 ${isViewInitialized ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            transformOrigin: 'top left'
                        }}
                    >
                        <canvas ref={canvasRef} className="shadow-2xl" />
                        {selectionRect && (
                            <div 
                                className="absolute border-2 border-dashed border-sky-400 bg-sky-400/20 pointer-events-none"
                                style={{ 
                                    left: selectionRect.x, top: selectionRect.y, 
                                    width: selectionRect.width, height: selectionRect.height,
                                }}
                            />
                        )}
                    </div>
                 </div>
            </div>
             {(isExtracting || confirmModal) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    {isExtracting ? <Spinner colorClass="text-white"/> : (
                        <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 text-left animate-pop-in">
                            <h3 className="font-bold text-lg text-slate-800">Confirm Selection</h3>
                            <p className="text-sm text-slate-600 mt-2">Does the following text match your selection?</p>
                            <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-md max-h-40 overflow-y-auto">
                                <p className="text-sm text-slate-700 font-mono">{confirmModal?.extractedText || "No text could be extracted."}</p>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => { setSelectionRect(null); setConfirmModal(null); }} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition">Cancel</button>
                                <button onClick={handleConfirmSelection} disabled={!confirmModal?.extractedText} className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition disabled:bg-slate-400">Confirm Location</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PdfModalViewer;
