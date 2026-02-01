
import React, { useState, useEffect } from 'react';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, DocumentIcon, CheckIcon } from './icons';
import { Spinner } from './Spinner';

interface ProcessingViewProps {
    headline: string;
    subline: string;
    showDetails?: boolean;
    items?: string[];
    onForceReset?: () => void;
}

const proTips = [
  {
    icon: LightbulbIcon,
    title: "Pro Tip",
    text: "For best results, combine multiple addenda into a single, chronological PDF before uploading. This ensures changes are applied in the correct sequence.",
  },
  {
    icon: SparklesIcon,
    title: "Did You Know?",
    text: "Our AI can identify and replace entire paragraphs, not just single lines. Just ensure the addendum instruction is clear!",
  }
];

const defaultChecklistItems = [
  "Parsing addendum documents...",
  "Cross-referencing project blueprint...",
  "Identifying page & text changes...",
  "Generating initial triage report...",
];

const flyingDocuments = [
    { x: -200, y: -100, rotate: -45, delay: 0.1, color: 'text-brand-300' },
    { x: 200, y: -80, rotate: 30, delay: 0.3, color: 'text-accent-300' },
    { x: -180, y: 120, rotate: 20, delay: 0.5, color: 'text-brand-400' },
    { x: 150, y: 100, rotate: -20, delay: 0.7, color: 'text-accent-400' },
    { x: -50, y: -150, rotate: 10, delay: 0.9, color: 'text-brand-200' },
    { x: 80, y: 150, rotate: -10, delay: 1.1, color: 'text-accent-200' },
    { x: 220, y: 50, rotate: 45, delay: 1.3, color: 'text-brand-300' },
    { x: -220, y: 20, rotate: -30, delay: 1.5, color: 'text-accent-300' },
    { x: 0, y: -180, rotate: 0, delay: 1.7, color: 'text-brand-400' },
    { x: 200, y: 140, rotate: -50, delay: 1.9, color: 'text-accent-400' },
    { x: -150, y: -130, rotate: 60, delay: 2.1, color: 'text-brand-200' },
    { x: 100, y: -160, rotate: -5, delay: 2.3, color: 'text-accent-200' },
];

const MotionDiv = motion.div as any;
const MotionP = motion.p as any;

export default function ProcessingView({ headline, subline, showDetails = true, items = defaultChecklistItems, onForceReset }: ProcessingViewProps) {
  const [progress, setProgress] = useState(0);
  const [completedChecks, setCompletedChecks] = useState<number>(0);
  const [showFinalizingMessage, setShowFinalizingMessage] = useState(false);

  useEffect(() => {
    setCompletedChecks(0);
    setProgress(0);
    setShowFinalizingMessage(false);

    if (!showDetails) return;

    const progressTimer = setTimeout(() => setProgress(95), 100);

    const checkInterval = 1200;
    const checkTimer = setInterval(() => {
        setCompletedChecks(prev => {
            if (prev < items.length) {
                return prev + 1;
            }
            clearInterval(checkTimer);
            return prev;
        });
    }, checkInterval);

    const finalizingTimer = setTimeout(() => {
        setShowFinalizingMessage(true);
    }, (items.length * checkInterval) + 300);
    
    return () => {
      clearTimeout(progressTimer);
      clearInterval(checkTimer);
      clearTimeout(finalizingTimer);
    };
  }, [showDetails, items, headline]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 bg-white overflow-y-auto">
        <div className="max-w-2xl w-full h-full mx-auto flex flex-col items-center text-center justify-around py-8">
            
            <div className="relative w-full h-48 mx-auto flex items-center justify-center flex-shrink-0">
                <MotionDiv
                    className="absolute w-16 h-16 bg-brand-500/20 rounded-full"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                        duration: 2,
                        ease: "easeInOut",
                        repeat: Infinity,
                    }}
                />
                <div className="absolute w-8 h-8 bg-brand-500/50 rounded-full" />

                {flyingDocuments.map((doc, i) => (
                    <MotionDiv
                        key={i}
                        className="absolute"
                        initial={{ x: doc.x, y: doc.y, rotate: doc.rotate, scale: 1, opacity: 1 }}
                        animate={{ x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 }}
                        transition={{ duration: 1.2, ease: 'easeIn', delay: doc.delay }}
                    >
                        <DocumentIcon className={`h-16 w-16 ${doc.color}`} />
                    </MotionDiv>
                ))}

                <MotionDiv
                    className="absolute w-24 h-24 rounded-full border-4 border-brand-400"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 2.5, 2.5], opacity: [1, 0, 0] }}
                    transition={{
                        delay: 2.8,
                        duration: 0.8,
                        ease: "easeOut",
                    }}
                />

                <MotionDiv
                    className="absolute"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                        delay: 2.8,
                        type: 'spring',
                        stiffness: 260,
                        damping: 15,
                    }}
                >
                    <DocumentIcon className="h-32 w-32 text-brand-600" />
                </MotionDiv>
                
                <MotionDiv
                    className="absolute"
                    initial={{ scale: 0, opacity: 0, rotate: -90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{
                        delay: 3.2,
                        type: 'spring',
                        stiffness: 300,
                        damping: 15,
                    }}
                >
                    <CheckIcon className="h-16 w-16 text-white" style={{ strokeWidth: 5 }}/>
                </MotionDiv>
            </div>

            <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full flex-shrink-0"
            >
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {headline}
                </h1>
                <p className="mt-3 max-w-xl mx-auto text-lg text-slate-600">
                    {subline}
                </p>
            </MotionDiv>

            {showDetails ? (
                <>
                    <div className="w-full mt-4">
                        <div className="space-y-3 text-left max-w-md mx-auto">
                            {items.map((item, index) => (
                                 <AnimatePresence key={index} mode="wait">
                                    {completedChecks > index && (
                                        <MotionDiv
                                            className="flex items-center gap-3"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <CheckCircleIcon className="h-6 w-6 text-brand-500" />
                                            <span className="font-medium text-slate-700">{item}</span>
                                        </MotionDiv>
                                    )}
                                </AnimatePresence>
                            ))}
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2 mt-8 max-w-lg mx-auto">
                            <div 
                                className="bg-brand-500 h-2 rounded-full transition-all ease-out" 
                                style={{ width: `${progress}%`, transitionDuration: '15s' }}
                            ></div>
                        </div>

                         <div className="mt-4 text-center h-20">
                            <AnimatePresence mode="wait">
                                {showFinalizingMessage && (
                                    <MotionP 
                                        key="finalizing"
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        className="font-semibold text-brand-600 animate-pulse text-sm"
                                    >
                                        Finalizing results...
                                    </MotionP>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-6">
                        {proTips.map((tip, index) => {
                            const TipIcon = tip.icon;
                            return (
                                <div key={index} className="bg-accent-50 border border-accent-200 p-4 w-full text-left rounded-lg flex items-start space-x-4 shadow-sm">
                                    <div className="flex-shrink-0">
                                        <TipIcon className="h-6 w-6 text-accent-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-accent-800 text-sm">{tip.title}</p>
                                        <p className="text-xs text-accent-700 mt-1 leading-relaxed">{tip.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="mt-8">
                    <Spinner colorClass="text-brand-500" />
                </div>
            )}
        </div>
    </div>
  );
}
