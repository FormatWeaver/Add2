import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pixelmatch from 'pixelmatch';
import { Spinner } from './Spinner';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, ArrowsRightLeftIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import { drawAnnotations, drawSpotlightAnnotation } from '../services/pdfAnnotationService';
import { AppChangeLogItem, ClickableArea, ChangeType, ConformedPageInfo } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// FIX: Cast motion component to `any` to resolve TypeScript typing issues with framer-motion props.
const MotionDiv = motion.div as any;

interface PdfViewerProps {
    title: string;
    pdfDoc: pdfjsLib.PDFDocumentProxy | null | undefined;
    pageNum: number | undefined;
    changesToAnnotate: AppChangeLogItem[];
    pan: { x: number; y: number; };
    setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number; }>>;
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    onCanvasClick: (changeId: number) => void;
    onSetClickableAreas: (areas: ClickableArea[]) => void;
    onShowInModal: () => void;
    selectedChangeId: number | null;
    hoveredChange: AppChangeLogItem | null;
    changeLog: AppChangeLogItem[];
    // Diff-related props
    isReplaceable?: boolean;
    originalDocForDiff?: pdfjsLib.PDFDocumentProxy | null;
    addendaDocsForDiff?: Map<string, pdfjsLib.PDFDocumentProxy>;
    conformedPageInfoForDiff?: ConformedPageInfo;
}

const PdfViewer = (props: PdfViewerProps) => {
    const { title, pdfDoc, pageNum, changesToAnnotate, pan, setPan, zoom, setZoom, onCanvasClick, onSetClickableAreas, onShowInModal, selectedChangeId, hoveredChange, changeLog, isReplaceable, originalDocForDiff, addendaDocsForDiff, conformedPageInfoForDiff } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);

    const [isViewInitialized, setIsViewInitialized] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const [renderScale, setRenderScale] = useState(1.0);
    const [isHoveringArea, setIsHoveringArea] = useState(false);
    
    const [isDiffVisible, setIsDiffVisible] = useState(false);
    const [isDiffLoading, setIsDiffLoading] = useState(false);
    const diffCanvasRef = useRef<HTMLCanvasElement>(null);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning) return;
        e.preventDefault();
        setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    };

    const handleMouseUp = () => setIsPanning(false);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }
        e.preventDefault();
        const container = e.currentTarget;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomFactor = 1.2;
        const newZoom = e.deltaY > 0 ? zoom / zoomFactor : zoom * zoomFactor;
        const clampedZoom = Math.max(0.2, Math.min(newZoom, 10));
        const oldImageX = (mouseX - pan.x) / zoom;
        const oldImageY = (mouseY - pan.y) / zoom;
        const newPanX = mouseX - oldImageX * clampedZoom;
        const newPanY = mouseY - oldImageY * clampedZoom;
        setZoom(clampedZoom);
        setPan({ x: newPanX, y: newPanY });
    };

    const handleRefocus = useCallback(() => {
        if (zoom > 1.05) {
            setRenderScale(prev => prev * zoom);
            setPan({ x: 0, y: 0 });
            setZoom(1);
        }
    }, [zoom, setPan, setZoom]);

    useEffect(() => {
        let isCancelled = false;
        
        const render = async () => {
            if (renderTaskRef.current) renderTaskRef.current.cancel();

            const canvas = canvasRef.current;
            const container = containerRef.current;
            const viewPortHost = container?.querySelector<HTMLDivElement>('.pdf-viewport-host');

            if (!canvas || !container || !pdfDoc || !pageNum || !viewPortHost) {
                if(canvas) canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);
                if(viewPortHost) viewPortHost.style.aspectRatio = '';
                return;
            }

            let page: pdfjsLib.PDFPageProxy | null = null;
            try {
                page = await pdfDoc.getPage(pageNum);
                if (isCancelled) return;
    
                const unscaledViewport = page.getViewport({ scale: 1 });
                viewPortHost.style.aspectRatio = `${unscaledViewport.width} / ${unscaledViewport.height}`;
                const scale = (container.clientWidth / unscaledViewport.width) * renderScale;
                const viewport = page.getViewport({ scale });
                
                canvas.height = viewport.height;
                canvas.width = viewport.width;
    
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
    
                const renderContext = { canvas, canvasContext: ctx, viewport };
                const task = page.render(renderContext);
                renderTaskRef.current = task;
                await task.promise;
                renderTaskRef.current = null;
                if (isCancelled) return;
    
                const changeToSpotlight = changeLog.find(c => c.id === selectedChangeId || c.id === hoveredChange?.id);
    
                let areas: ClickableArea[] = [];
                if (changesToAnnotate.length > 0) {
                   areas = await drawAnnotations(ctx, page, viewport, changesToAnnotate);
                   onSetClickableAreas(areas);
                }
                
                if (changeToSpotlight) {
                    await drawSpotlightAnnotation(ctx, page, viewport, changeToSpotlight);
                }
            } catch (e: any) {
                renderTaskRef.current = null;
                if (e.name !== 'RenderingCancelledException') console.error(`Could not render page ${pageNum}`, e);
            } finally {
                if (page) page.cleanup();
            }
        };

        setIsViewInitialized(false);
        if (zoom !== 1 || pan.x !== 0 || pan.y !== 0 || renderScale !== 1) {
            const wasRefocused = renderScale !== 1;
            if (!wasRefocused) {
                setPan({ x: 0, y: 0 });
                setZoom(1);
            }
            setRenderScale(1.0);
        }
        setIsDiffVisible(false);

        render().then(() => {
            if (!isCancelled) setIsViewInitialized(true);
        });

        return () => { isCancelled = true; if (renderTaskRef.current) renderTaskRef.current.cancel(); };
    }, [pageNum, pdfDoc, changesToAnnotate, changeLog, selectedChangeId, hoveredChange, renderScale, onSetClickableAreas]);
    
    const handleToggleDiff = useCallback(async () => {
        if (isDiffVisible) {
            setIsDiffVisible(false);
            return;
        }

        if (!isReplaceable || !conformedPageInfoForDiff || !originalDocForDiff) return;
        const addendumDoc = addendaDocsForDiff?.get(conformedPageInfoForDiff.map.addendum_name!);
        if (!addendumDoc) return;

        setIsDiffLoading(true);
        try {
            const originalPageNum = conformedPageInfoForDiff.map.original_page_for_comparison!;
            const newPageNum = conformedPageInfoForDiff.map.source_page_number;
            const originalPage = await originalDocForDiff.getPage(originalPageNum);
            const newPage = await addendumDoc.getPage(newPageNum);
            const RENDER_SCALE = 2;
            const originalViewport = originalPage.getViewport({ scale: RENDER_SCALE });
            const newViewport = newPage.getViewport({ scale: RENDER_SCALE });
            const width = Math.max(originalViewport.width, newViewport.width);
            const height = Math.max(originalViewport.height, newViewport.height);
            const canvas1 = document.createElement('canvas'); canvas1.width = width; canvas1.height = height;
            const ctx1 = canvas1.getContext('2d', { willReadFrequently: true })!;
            const canvas2 = document.createElement('canvas'); canvas2.width = width; canvas2.height = height;
            const ctx2 = canvas2.getContext('2d', { willReadFrequently: true })!;
            await Promise.all([
                originalPage.render({ canvas: canvas1, canvasContext: ctx1, viewport: originalPage.getViewport({ scale: RENDER_SCALE }) }).promise,
                newPage.render({ canvas: canvas2, canvasContext: ctx2, viewport: newPage.getViewport({ scale: RENDER_SCALE }) }).promise,
            ]);
            originalPage.cleanup(); newPage.cleanup();
            const imgData1 = ctx1.getImageData(0, 0, width, height);
            const imgData2 = ctx2.getImageData(0, 0, width, height);
            const diffCanvas = diffCanvasRef.current;
            if (!diffCanvas) throw new Error("Diff canvas not found");
            diffCanvas.width = width; diffCanvas.height = height;
            const diffCtx = diffCanvas.getContext('2d')!;
            const diffImageData = diffCtx.createImageData(width, height);
            pixelmatch(imgData1.data, imgData2.data, diffImageData.data, width, height, { threshold: 0.1, includeAA: true });
            diffCtx.putImageData(diffImageData, 0, 0);
            setIsDiffVisible(true);
        } catch (error) {
            console.error("Failed to generate visual diff:", error);
            setIsDiffVisible(false);
        } finally {
            setIsDiffLoading(false);
        }
    }, [isDiffVisible, isReplaceable, conformedPageInfoForDiff, originalDocForDiff, addendaDocsForDiff]);

    return (
        <div ref={containerRef} className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-2 px-1">
                <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
                <div className="flex items-center gap-1">
                    {isReplaceable && (
                        <button onClick={handleToggleDiff} disabled={isDiffLoading} title="Show visual differences"
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${isDiffVisible ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
                            {isDiffLoading ? <Spinner colorClass="text-gray-700" /> : <ArrowsRightLeftIcon className="h-4 w-4" />}
                            <span>{isDiffLoading ? 'Comparing...' : (isDiffVisible ? 'Hide Diff' : 'Visual Diff')}</span>
                        </button>
                    )}
                     <button onClick={() => setZoom(z => Math.max(0.2, z / 1.2))} title="Zoom Out (Ctrl+Scroll)" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50" disabled={zoom <= 0.2}>
                        <ZoomOutIcon className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-semibold text-gray-500 w-12 text-center tabular-nums">
                        {(zoom * 100).toFixed(0)}%
                    </span>
                    <button onClick={() => setZoom(z => Math.min(10, z * 1.2))} title="Zoom In (Ctrl+Scroll)" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50" disabled={zoom >= 10}>
                        <ZoomInIcon className="h-4 w-4" />
                    </button>
                    <button onClick={handleRefocus} disabled={zoom <= 1.05} title="Refocus for clarity" className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ArrowPathIcon className="h-4 w-4"/>
                    </button>
                    <button onClick={onShowInModal} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600" disabled={!pageNum}>
                        <ArrowTopRightOnSquareIcon className="h-4 w-4"/>
                    </button>
                </div>
            </div>
            <div onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} className={`pdf-viewport-host flex-grow relative bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent`}>
                <div className="absolute inset-0" onClick={() => onCanvasClick(0)} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left', cursor: isPanning ? 'grabbing' : (isHoveringArea ? 'pointer' : 'grab') }}>
                  <canvas ref={canvasRef} className={`transition-opacity duration-300 ${isViewInitialized ? 'opacity-100' : 'opacity-0'}`} />
                  <canvas ref={diffCanvasRef} className={`absolute top-0 left-0 pointer-events-none transition-opacity duration-300 ${isDiffVisible ? 'opacity-70' : 'opacity-0'}`} />
                </div>
                <AnimatePresence>
                    {!isViewInitialized && (
                        <MotionDiv
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0"
                        >
                            <div className="w-full h-full bg-slate-200 animate-pulse rounded-lg p-6">
                                {/* Faint lines to mimic document structure */}
                                <div className="h-5 bg-slate-300 rounded w-2/3 mb-6"></div>
                                <div className="space-y-3">
                                    <div className="h-3 bg-slate-300 rounded w-full"></div>
                                    <div className="h-3 bg-slate-300 rounded w-5/6"></div>
                                    <div className="h-3 bg-slate-300 rounded w-full"></div>
                                    <div className="h-3 bg-slate-300 rounded w-3/4"></div>
                                </div>
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default PdfViewer;
