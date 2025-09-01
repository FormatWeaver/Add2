


import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icons used in the animation ---
const DocumentIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const DocumentPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3h-6m-1.5-6H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.31-2.31L12.602 18l1.178-.398a3.375 3.375 0 002.31-2.31L16.5 14.25l.398 1.178a3.375 3.375 0 002.31 2.31l1.178.398-1.178.398a3.375 3.375 0 00-2.31 2.31z" />
    </svg>
);
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);

const STAGES = ['upload', 'processing', 'results'];
const STAGE_DURATION = 4500; // 4.5 seconds per stage

const stageAnimation = {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -10 },
};

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

const UploadStage = () => (
    <MotionDiv {...stageAnimation} transition={{ duration: 0.4, ease: 'easeInOut' }} className="w-full h-full flex flex-col items-center justify-center text-center p-4 md:p-8">
        <h3 className="font-bold text-slate-800 text-sm md:text-lg">1. Upload Documents</h3>
        <p className="text-xs md:text-sm text-slate-500 mt-1 mb-4">Securely add your tender and addenda files.</p>
        <div className="space-y-3 w-full max-w-xs">
            <MotionDiv initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 100 }} className="flex items-center gap-2 p-2 bg-white rounded-md shadow-sm border border-slate-200">
                <DocumentIcon className="h-6 w-6 text-slate-500 flex-shrink-0" />
                <span className="text-xs md:text-sm text-slate-700 truncate">Original_Tender.pdf</span>
            </MotionDiv>
            <MotionDiv initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 100 }} className="flex items-center gap-2 p-2 bg-white rounded-md shadow-sm border border-slate-200">
                <DocumentPlusIcon className="h-6 w-6 text-slate-500 flex-shrink-0" />
                <span className="text-xs md:text-sm text-slate-700 truncate">Addenda_01-03.pdf</span>
            </MotionDiv>
        </div>
    </MotionDiv>
);

const ProcessingStage = () => (
    <MotionDiv {...stageAnimation} transition={{ duration: 0.4, ease: 'easeInOut' }} className="w-full h-full flex flex-col items-center justify-center text-center p-4 md:p-8">
        <MotionDiv animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <SparklesIcon className="h-10 w-10 md:h-16 md:w-16 text-brand-500" />
        </MotionDiv>
        <h3 className="font-bold text-slate-800 text-sm md:text-lg mt-4">2. AI Performs Analysis</h3>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Identifying all page and text changes...</p>
        <div className="w-full max-w-xs bg-slate-200 rounded-full h-1.5 mt-4">
            <MotionDiv className="bg-brand-500 h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: STAGE_DURATION / 1000 - 0.5, ease: 'linear' }} />
        </div>
    </MotionDiv>
);

const ResultsStage = () => (
    <MotionDiv {...stageAnimation} transition={{ duration: 0.4, ease: 'easeInOut' }} className="w-full h-full flex flex-col items-start justify-start text-left p-4 md:p-6 overflow-hidden">
        <h3 className="font-bold text-slate-800 text-sm md:text-lg">3. Review & Download</h3>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5 mb-3">Approve changes and export your conformed set.</p>
        <div className="space-y-2 w-full">
            <MotionDiv initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-between items-center p-2 text-xs md:text-sm bg-brand-50 text-brand-800 rounded-md border border-brand-200">
                <span>REPLACE: Sheet A-101</span>
                <CheckCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-brand-600" />
            </MotionDiv>
            <MotionDiv initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex justify-between items-center p-2 text-xs md:text-sm bg-brand-50 text-brand-800 rounded-md border border-brand-200">
                <span>DELETE: Section 01 33 00 - Submittals</span>
                <CheckCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-brand-600" />
            </MotionDiv>
            <MotionDiv initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="flex justify-between items-center p-2 text-xs md:text-sm bg-brand-50 text-brand-800 rounded-md border border-brand-200">
                <span>ADD: New warranty clause in Section 01 78 00</span>
                <CheckCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-brand-600" />
            </MotionDiv>
            <MotionButton initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="!mt-4 w-full p-2 text-xs md:text-sm font-bold bg-brand-600 text-white rounded-lg shadow-md hover:bg-brand-700 transition-colors">
                Download Conformed PDF
            </MotionButton>
        </div>
    </MotionDiv>
);

export const AnimatedMockup = () => {
    const [stage, setStage] = useState(STAGES[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setStage(currentStage => {
                const currentIndex = STAGES.indexOf(currentStage);
                const nextIndex = (currentIndex + 1) % STAGES.length;
                return STAGES[nextIndex];
            });
        }, STAGE_DURATION);

        return () => clearInterval(interval);
    }, []);

    const renderStage = () => {
        switch (stage) {
            case 'upload':
                return <UploadStage key="upload" />;
            case 'processing':
                return <ProcessingStage key="processing" />;
            case 'results':
                return <ResultsStage key="results" />;
            default:
                return null;
        }
    };

    return (
        <div className="relative w-full max-w-xl mx-auto">
            {/* Laptop Frame */}
            <div className="relative mx-auto border-gray-800 bg-gray-800 border-[8px] rounded-t-xl h-[172px] max-w-[301px] md:h-[294px] md:max-w-[512px]">
                <div className="rounded-lg overflow-hidden h-[156px] md:h-[278px] bg-white">
                    {/* Animated Content */}
                    <div className="h-full w-full bg-slate-50 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {renderStage()}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            <div className="relative mx-auto bg-gray-900 rounded-b-xl rounded-t-sm h-[17px] max-w-[351px] md:h-[21px] md:max-w-[597px]">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl w-[56px] h-[5px] md:w-[96px] md:h-[8px] bg-gray-800"></div>
            </div>
        </div>
    );
};