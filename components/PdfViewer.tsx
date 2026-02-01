
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pixelmatch from 'pixelmatch';
import { Spinner } from './Spinner';
import { ArrowPathIcon, ArrowTopRightOnSquareIcon, ArrowsRightLeftIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import { drawAnnotations, drawSpotlightAnnotation } from '../services/pdfAnnotationService';
import { AppChangeLogItem, ClickableArea, ChangeType, ConformedPageInfo } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

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
    forcedScale?: number;
    isReplaceable?: boolean;
    originalDocForDiff?: pdfjsLib.PDFDocumentProxy | null;
    addendaDocsForDiff?: Map<string, pdfjsLib.PDFDocumentProxy>;
    conformedPageInfoForDiff?: ConformedPageInfo;
    hideToolbar?: boolean;
}

const PdfViewer = (props: PdfViewerProps) => {
    const { 
        title, pdfDoc, pageNum, changesToAnnotate, pan, setPan, zoom, setZoom, 
        onCanvasClick, onSetClickableAreas, onShowInModal, selectedChangeId, 
        hoveredChange, changeLog, forcedScale, isReplaceable, originalDocForDiff, 
        addendaDocsForDiff, conformedPageInfoForDiff, hideToolbar 
    } = props;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);

    const [isViewInitialized, setIsViewInitialized] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const [isDiffVisible, setIsDiffVisible] = useState(false);
    const [isDiffLoading, setIsDiffLoading] = useState(false);
    const [diffOpacity, setDiffOpacity] = useState(0.85);
    const diffCanvasRef = useRef<HTMLCanvasElement>(null);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning) return;
        setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    };

    const handleMouseUp = () => setIsPanning(false);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const container = e.currentTarget;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomFactor = 1.15;
        const newZoom = e.deltaY > 0 ? zoom / zoomFactor : zoom * zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 15));
        const oldImageX = (mouseX - pan.x) / zoom;
        const oldImageY = (mouseY - pan.y) / zoom;
        const newPanX = mouseX - oldImageX * clampedZoom;
        const newPanY = mouseY - oldImageY * clampedZoom;
        setZoom(clampedZoom);
        setPan({ x: newPanX, y: newPanY });
    };

    useEffect(() => {
        let isCancelled = false;
        const render = async () => {
            if (renderTaskRef.current) renderTaskRef.current.cancel();
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container || !pdfDoc || !pageNum) return;

            let page: pdfjsLib.PDFPageProxy | null = null;
            try {
                page = await pdfDoc.getPage(pageNum);
                if (isCancelled) return;
                const unscaledViewport = page.getViewport({ scale: 1 });
                const scale = forcedScale || (container.clientWidth / unscaledViewport.width);
                const viewport = page.getViewport({ scale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) return;
                renderTaskRef.current = page.render({ canvas, canvasContext: ctx, viewport });
                await renderTaskRef.current.promise;
                if (isCancelled) return;

                if (changesToAnnotate.length > 0) {
                   const areas = await drawAnnotations(ctx, page, viewport, changesToAnnotate);
                   onSetClickableAreas(areas);
                }
                const spotlight = changeLog.find(c => c.id === selectedChangeId || c.id === hoveredChange?.id);
                if (spotlight) await drawSpotlightAnnotation(ctx, page, viewport, spotlight);
            } catch (e: any) {
                if (e.name !== 'RenderingCancelledException') console.error(e);
            } finally { if (page) page.cleanup(); }
        };

        setIsViewInitialized(false);
        setIsDiffVisible(false);
        render().then(() => { if (!isCancelled) setIsViewInitialized(true); });
        return () => { isCancelled = true; renderTaskRef.current?.cancel(); };
    }, [pageNum, pdfDoc, changesToAnnotate, changeLog, selectedChangeId, hoveredChange, forcedScale]);
    
    const handleToggleDiff = useCallback(async () => {
        if (isDiffVisible) { setIsDiffVisible(false); return; }
        if (!isReplaceable || !conformedPageInfoForDiff || !originalDocForDiff) return;
        const addendumDoc = addendaDocsForDiff?.get(conformedPageInfoForDiff.map.addendum_name!);
        if (!addendumDoc) return;

        setIsDiffLoading(true);
        try {
            const originalPage = await originalDocForDiff.getPage(conformedPageInfoForDiff.map.original_page_for_comparison!);
            const newPage = await addendumDoc.getPage(conformedPageInfoForDiff.map.source_page_number);
            
            // Render at high scale for surgical pixel matching
            const RENDER_SCALE = 1.5; 
            const v1 = originalPage.getViewport({ scale: RENDER_SCALE });
            const v2 = newPage.getViewport({ scale: RENDER_SCALE });
            
            const width = Math.round(Math.max(v1.width, v2.width));
            const height = Math.round(Math.max(v1.height, v2.height));
            
            const c1 = document.createElement('canvas'); c1.width = width; c1.height = height;
            const ctx1 = c1.getContext('2d', { willReadFrequently: true })!;
            const c2 = document.createElement('canvas'); c2.width = width; c2.height = height;
            const ctx2 = c2.getContext('2d', { willReadFrequently: true })!;
            
            ctx1.fillStyle = 'white'; ctx1.fillRect(0,0,width,height);
            ctx2.fillStyle = 'white'; ctx2.fillRect(0,0,width,height);

            await Promise.all([
                originalPage.render({ canvas: c1, canvasContext: ctx1, viewport: originalPage.getViewport({ scale: RENDER_SCALE }) }).promise,
                newPage.render({ canvas: c2, canvasContext: ctx2, viewport: newPage.getViewport({ scale: RENDER_SCALE }) }).promise,
            ]);
            
            const diffCanvas = diffCanvasRef.current;
            if (!diffCanvas) return;
            diffCanvas.width = width; diffCanvas.height = height;
            const diffCtx = diffCanvas.getContext('2d')!;
            const diffImg = diffCtx.createImageData(width, height);
            
            pixelmatch(ctx1.getImageData(0,0,width,height).data, ctx2.getImageData(0,0,width,height).data, diffImg.data, width, height, { 
                threshold: 0.1, 
                includeAA: true,
                diffColor: [239, 68, 68, 255] // Red alert heatmap
            });
            
            diffCtx.putImageData(diffImg, 0, 0);
            setIsDiffVisible(true);
            originalPage.cleanup(); newPage.cleanup();
        } catch (error) {
            console.error("Delta Engine Fault:", error);
        } finally { setIsDiffLoading(false); }
    }, [isDiffVisible, isReplaceable, conformedPageInfoForDiff, originalDocForDiff, addendaDocsForDiff]);

    return (
        <div ref={containerRef} className="h-full bg-slate-100 rounded-3xl border border-slate-200/60 shadow-lg flex flex-col overflow-hidden">
            {!hideToolbar && (
                <div className="flex justify-between items-center bg-white/80 backdrop-blur-md px-6 py-3 border-b border-slate-200/60 z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">{title}</h3>
                            {pageNum && <p className="text-[9px] font-bold text-slate-400">Sheet Sequence: {pageNum}</p>}
                        </div>
                        {isDiffVisible && (
                             <div className="flex items-center gap-3 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 shadow-inner">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Diff Opacity</span>
                                <input 
                                    type="range" min="0" max="1" step="0.01" 
                                    value={diffOpacity} 
                                    onChange={(e) => setDiffOpacity(parseFloat(e.target.value))}
                                    className="w-24 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-red-500"
                                />
                             </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {isReplaceable && (
                            <button onClick={handleToggleDiff} disabled={isDiffLoading}
                                className={`flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border-2 transition-all ${isDiffVisible ? 'bg-red-500 text-white border-red-400 shadow-xl shadow-red-100' : 'bg-white text-slate-600 border-slate-100 hover:border-brand-300 hover:text-brand-600 hover:shadow-md'}`}>
                                {isDiffLoading ? <Spinner colorClass="text-brand-500 h-3 w-3" /> : <ArrowsRightLeftIcon className="h-4 w-4" />}
                                <span>{isDiffLoading ? 'Rendering...' : (isDiffVisible ? 'Exit Analysis' : 'Delta Analysis')}</span>
                            </button>
                        )}
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <button onClick={() => setZoom(z => Math.max(0.1, z / 1.15))} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"><ZoomOutIcon className="h-5 w-5" /></button>
                        <span className="text-[10px] font-black text-slate-400 w-12 text-center tabular-nums">{(zoom * 100).toFixed(0)}%</span>
                        <button onClick={() => setZoom(z => Math.min(15, z * 1.15))} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"><ZoomInIcon className="h-5 w-5" /></button>
                        <button onClick={() => {setPan({x:0,y:0}); setZoom(1);}} title="Reset View" className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"><ArrowPathIcon className="h-5 w-5"/></button>
                        <button onClick={onShowInModal} title="Fullscreen Lens" className="p-2 rounded-xl bg-slate-900 text-white hover:bg-brand-600 transition-all shadow-lg ml-2"><ArrowTopRightOnSquareIcon className="h-4 w-4"/></button>
                    </div>
                </div>
            )}
            <div 
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} 
                className={`flex-grow relative bg-[#0f172a] overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-500 ${isDiffVisible ? 'bg-slate-900' : 'bg-slate-100'}`}
                style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            >
                <div className="absolute inset-0 flex items-start justify-center" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}>
                    <div className="relative shadow-2xl transition-all duration-700">
                        <canvas ref={canvasRef} className={`transition-opacity duration-500 ${isViewInitialized ? 'opacity-100' : 'opacity-0'} block bg-white`} />
                        <canvas 
                            ref={diffCanvasRef} 
                            style={{ opacity: diffOpacity }}
                            className={`absolute top-0 left-0 pointer-events-none transition-opacity duration-500 ${isDiffVisible ? 'block' : 'hidden'} block`} 
                        />
                        {isDiffVisible && (
                            <div className="absolute -top-3 -left-3 bg-red-600 text-white text-[8px] font-black px-4 py-1 rounded-full shadow-2xl uppercase tracking-[0.2em] animate-pulse border-2 border-white z-20">
                                Vector Drift Active
                            </div>
                        )}
                    </div>
                </div>
                {!isViewInitialized && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-md z-30">
                        <Spinner colorClass="text-brand-500 scale-[1.5]" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PdfViewer;
