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

// Re-introducing the simple checklist from before the "Live Log" feature.
const checklistItems = [
  "Parsing addendum documents...",
  "Cross-referencing project blueprint...",
  "Identifying page & text changes...",
  "Generating initial triage report...",
];

const flyingDocuments = [
    { x: -200, y: -100, rotate: -45, delay: 0, color: 'text-brand-300' },
    { x: 200, y: -80, rotate: 30, delay: 2.5, color: 'text-accent-300' },
    { x: -180, y: 120, rotate: 20, delay: 5, color: 'text-brand-400' },
    { x: 150, y: 100, rotate: -20, delay: 7.5, color: 'text-accent-400' },
    { x: -50, y: -150, rotate: 10, delay: 10, color: 'text-brand-200' },
    { x: 80, y: 150, rotate: -10, delay: 12.5, color: 'text-accent-200' },
    { x: 220, y: 50, rotate: 45, delay: 15, color: 'text-brand-300' },
    { x: -220, y: 20, rotate: -30, delay: 17.5, color: 'text-accent-300' },
    { x: 0, y: -180, rotate: 0, delay: 20, color: 'text-brand-400' },
    { x: 200, y: 140, rotate: -50, delay: 22.5, color: 'text-accent-400' },
    { x: -150, y: -130, rotate: 60, delay: 25, color: 'text-brand-200' },
    { x: 100, y: -160, rotate: -5, delay: 27.5, color: 'text-accent-200' },
];

// FIX: Cast motion components to `any` to resolve TypeScript typing issues with framer-motion props.
const MotionDiv = motion.div as any;
// FIX: Cast motion components to `any` to resolve TypeScript typing issues with framer-motion props.
const MotionP = motion.p as any;


export default function ProcessingView({ headline, subline, showDetails = true }: ProcessingViewProps) {
  const [progress, setProgress] = useState(0);
  const [completedChecks, setCompletedChecks] = useState<number>(0);
  const [showFinalizingMessage, setShowFinalizingMessage] = useState(false);

  useEffect(() => {
    if (!showDetails) return;

    // Animate the progress bar smoothly to 95% over a realistic time period
    const progressTimer = setTimeout(() => setProgress(95), 100);

    // Animate checklist items appearing
    const checkTimer = setInterval(() => {
        setCompletedChecks(prev => {
            if (prev < checklistItems.length) {
                return prev + 1;
            }
            clearInterval(checkTimer);
            return prev;
        });
    }, 2000); // Stagger the checkmarks

    // Show the "finalizing" message after the checklist animations
    const finalizingTimer = setTimeout(() => {
        setShowFinalizingMessage(true);
    }, (checklistItems.length * 2000) + 500);

    return () => {
      clearTimeout(progressTimer);
      clearInterval(checkTimer);
      clearTimeout(finalizingTimer);
    };
  }, [showDetails]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 bg-white">
        <div className="max-w-2xl w-full h-full mx-auto flex flex-col items-center text-center justify-around">
            
            <div className="relative w-full h-48 mx-auto flex items-center justify-center">
                {/* Central processing core */}
                <MotionDiv
                    className="absolute w-16 h-16 bg-brand-500/20 rounded-full"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                        duration: 3,
                        ease: "easeInOut",
                        repeat: Infinity,
                    }}
                />
                <div className="absolute w-8 h-8 bg-brand-500/50 rounded-full" />

                {/* Flying documents dissolving into the core */}
                {flyingDocuments.map((doc, i) => (
                    <MotionDiv
                        key={i}
                        className="absolute"
                        initial={{ x: doc.x, y: doc.y, rotate: doc.rotate, scale: 1, opacity: 1 }}
                        animate={{ x: 0, y: 0, rotate: 0, scale: 0, opacity: 0 }}
                        transition={{ duration: 2, ease: 'easeIn', delay: doc.delay }}
                    >
                        <DocumentIcon className={`h-16 w-16 ${doc.color}`} />
                    </MotionDiv>
                ))}

                {/* Shockwave effect on merge */}
                <MotionDiv
                    className="absolute w-24 h-24 rounded-full border-4 border-brand-400"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 2, 2], opacity: [1, 0, 0] }}
                    transition={{
                        delay: 34,
                        duration: 1,
                        ease: "easeOut",
                    }}
                />

                {/* The final, single document that appears */}
                <MotionDiv
                    className="absolute"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                        delay: 34,
                        type: 'spring',
                        stiffness: 260,
                        damping: 15,
                    }}
                >
                    <DocumentIcon className="h-32 w-32 text-brand-600" />
                </MotionDiv>
                
                {/* The checkmark that stamps the final document */}
                <MotionDiv
                    className="absolute"
                    initial={{ scale: 0, opacity: 0, rotate: -90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{
                        delay: 34.5,
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
                className="w-full"
            >
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                    {headline}
                </h1>
                <p className="mt-3 max-w-xl mx-auto text-lg text-slate-600">
                    {subline}
                </p>
            </MotionDiv>

            {showDetails ? (
                <>
                    <div className="w-full">
                        <div className="space-y-4 text-left max-w-md mx-auto">
                            {checklistItems.map((item, index) => (
                                 <AnimatePresence key={index}>
                                    {completedChecks > index && (
                                        <MotionDiv
                                            className="flex items-center gap-3"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.4 }}
                                        >
                                            <CheckCircleIcon className="h-6 w-6 text-brand-500" />
                                            <span className="font-medium text-slate-700">{item}</span>
                                        </MotionDiv>
                                    )}
                                </AnimatePresence>
                            ))}
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2.5 mt-8 max-w-lg mx-auto">
                            <div 
                                className="bg-brand-500 h-2.5 rounded-full transition-all ease-out" 
                                style={{ width: `${progress}%`, transitionDuration: '40s' }}
                            ></div>
                        </div>

                         <div className="mt-4 text-center h-6">
                            <AnimatePresence>
                                {showFinalizingMessage && (
                                    <MotionP 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }} 
                                        className="font-semibold text-brand-600 animate-pulse text-sm"
                                    >
                                        Finalizing documents...
                                    </MotionP>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        {proTips.map((tip, index) => {
                            const TipIcon = tip.icon;
                            return (
                                <div key={index} className="bg-accent-50 border border-accent-200 p-4 w-full text-left rounded-lg flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <TipIcon className="h-6 w-6 text-accent-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-accent-800">{tip.title}</p>
                                        <p className="text-sm text-accent-700">{tip.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <Spinner colorClass="text-brand-500" />
            )}
        </div>
    </div>
  );
}