
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentIcon } from './icons/DocumentIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { DocumentChartBarIcon } from './icons/DocumentChartBarIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface HowItWorksPageProps {
    onGetStartedClick: () => void;
}

const MotionDiv = motion.div as any;

// --- NEW VISUAL COMPONENTS FOR EACH STEP ---

const StepVisualUpload = () => (
    <div className="relative w-full aspect-square lg:aspect-[4/3] bg-slate-100 rounded-2xl p-6 border-2 border-slate-200/80 shadow-inner overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#dbeafe_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <MotionDiv initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="relative z-10 h-24 bg-white rounded-lg border border-slate-300 border-dashed flex items-center justify-center shadow-sm">
            <DocumentIcon className="h-8 w-8 text-slate-400" />
            <p className="ml-3 font-semibold text-slate-600">Original_Drawings.pdf</p>
        </MotionDiv>
        <MotionDiv initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }} className="relative z-10 mt-4 h-24 bg-white rounded-lg border border-slate-300 border-dashed flex items-center justify-center shadow-sm">
            <DocumentIcon className="h-8 w-8 text-slate-400" />
            <p className="ml-3 font-semibold text-slate-600">Original_Specs.pdf</p>
        </MotionDiv>
        <MotionDiv initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} className="relative z-10 mt-4 h-14 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
            Create Project Blueprint
        </MotionDiv>
    </div>
);

const StepVisualAnalysis = () => (
     <div className="relative w-full aspect-square lg:aspect-[4/3] bg-slate-800 rounded-2xl p-6 border-2 border-slate-700 shadow-inner overflow-hidden flex flex-col justify-center items-center">
        <SparklesIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 text-brand-400 opacity-5" />
        
        <MotionDiv initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }} className="relative z-10 h-16 w-full max-w-sm mx-auto bg-white rounded-lg border border-slate-300 flex items-center justify-center shadow-sm">
            <DocumentPlusIcon className="h-8 w-8 text-slate-400" />
            <p className="ml-3 font-semibold text-slate-600">Addendum_05.pdf</p>
        </MotionDiv>
        
         <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="relative z-10 font-mono text-left bg-black/40 p-4 rounded-lg backdrop-blur-sm border border-slate-600 mt-6">
            <p className="text-brand-300 text-xs">{"{"}</p>
            <p className="text-brand-300 text-xs pl-4">"<span className="text-sky-300">query</span>": "<span className="text-amber-300">Find 'Section 08 80 00'</span>",</p>
            <p className="text-brand-300 text-xs pl-4">"<span className="text-sky-300">action</span>": "<span className="text-amber-300">REPLACE_WITH_NEW_TEXT</span>",</p>
            <p className="text-brand-300 text-xs pl-4">"<span className="text-sky-300">status</span>": "<span className="text-purple-300">SUCCESS</span>"</p>
            <p className="text-brand-300 text-xs">{"}"}</p>
        </MotionDiv>
    </div>
);

const StepVisualResults = () => (
     <div className="relative w-full aspect-square lg:aspect-[4/3] bg-slate-100 rounded-2xl p-6 border-2 border-slate-200/80 shadow-inner">
         <MotionDiv initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} transition={{ delay: 0.2 }} className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-bold text-slate-800 text-sm">Review Changes</h4>
            <div className="mt-2 space-y-2">
                <div className="p-2 rounded bg-brand-50 text-xs font-medium text-brand-800 flex justify-between items-center border border-brand-200">
                    <span>REPLACE: Section 09 68 00...</span>
                    <CheckCircleIcon className="h-5 w-5 text-brand-600" />
                </div>
                 <div className="p-2 rounded bg-red-50 text-xs font-medium text-red-800 flex justify-between items-center border border-red-200">
                    <span>DELETE: Section 08 71 00...</span>
                    <CheckCircleIcon className="h-5 w-5 text-red-600" />
                </div>
                 <div className="p-2 rounded bg-amber-50 text-xs font-medium text-amber-800 flex justify-between items-center border border-amber-200">
                    <span>ADD: New detail on sheet A-501...</span>
                </div>
            </div>
        </MotionDiv>
        <MotionDiv initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} transition={{ delay: 0.4 }} className="mt-4 h-12 w-full bg-brand-600 rounded-md text-white font-bold text-sm flex items-center justify-center shadow-lg hover:bg-brand-700 transition">
            Download Conformed PDF
        </MotionDiv>
    </div>
);

// Comment: Added key to FaqItemProps to fix line 238 error.
interface FaqItemProps {
    q: string;
    a: string;
    key?: React.Key;
}

const FaqItem = ({ q, a }: FaqItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 py-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left gap-4"
            >
                <span className="font-semibold text-lg text-slate-800">{q}</span>
                <ChevronDownIcon className={`flex-shrink-0 h-6 w-6 text-slate-500 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
            {isOpen && (
                <MotionDiv
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                >
                    <p className="text-slate-600 leading-relaxed">{a}</p>
                </MotionDiv>
            )}
            </AnimatePresence>
        </div>
    )
};


export const HowItWorksPage = ({ onGetStartedClick }: HowItWorksPageProps) => {
    const steps = [
        {
            step: 1,
            title: "Create Your Project Blueprint",
            description: "Begin by uploading your original tender set (both specifications and drawings). Our proprietary Intelligent Indexing Engine pre-processes the entire document set, creating a highly-optimized, searchable 'Project Blueprint' that our AI can instantly query.",
            visual: <StepVisualUpload />,
        },
        {
            step: 2,
            title: "Context-Aware Addenda Analysis",
            description: "Now, upload your addendum. Instead of re-reading the entire project, our AI uses the instructions in the addendum to perform a surgical query on the Project Blueprint, instantly finding the exact content to be changed.",
            visual: <StepVisualAnalysis />,
        },
        {
            step: 3,
            title: "Review, Approve, and Integrate",
            description: "In the interactive results view, you are in full control. Quickly approve or reject the AI's findings. With one click, the system generates your final, perfectly conformed documents.",
            visual: <StepVisualResults />,
        },
    ];

    const outputs = [
        {
            icon: DocumentArrowDownIcon,
            title: "Conformed Set (Clean)",
            description: "A single, pristine PDF with all changes seamlessly integrated. Your official source of truth for bidding.",
        },
        {
            icon: ArrowsRightLeftIcon,
            title: "Comparison Version",
            description: "A redlined PDF showing every deletion and addition. Perfect for internal reviews and team handovers.",
        },
        {
            icon: DocumentChartBarIcon,
            title: "Summary of Changes",
            description: "A simple, clear report listing every change. The fastest way to get pricing updates from your subs.",
        },
    ];

    const faqs = [
        {
            q: "Is my data secure?",
            a: "Yes. All documents are encrypted in transit and at rest. We do not share your data, and files are automatically deleted from our servers after 24 hours. Your confidentiality is our top priority."
        },
        {
            q: "What if my addendum has handwritten notes?",
            a: "Currently, our AI works best with machine-readable text (typed text). For best results, we recommend transcribing any critical handwritten notes or using a separate mark-up tool to add them to the conformed document after processing."
        },
        {
            q: "Can it handle multiple addenda at once?",
            a: "Yes. For best results and to maintain the correct order of changes, we recommend combining your addenda into a single, chronological PDF before uploading."
        }
    ];

    return (
        <div className="bg-white">
            <header className="py-20 bg-slate-50 text-center">
                 <div className="max-w-4xl mx-auto px-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
                        How Our 'Project Blueprint' Architecture Works
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-slate-600">
                        We solved the 'big file' problem by indexing your project first. This makes our analysis faster, more accurate, and infinitely more scalable than any other solution.
                    </p>
                </div>
            </header>

            <section className="py-24">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="relative">
                        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200" aria-hidden="true"></div>
                        <div className="space-y-24">
                            {steps.map((s, index) => (
                                <MotionDiv
                                    key={s.step} 
                                    className="relative grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-10 items-center"
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ duration: 0.6, delay: 0.1 }}
                                >
                                    <div className={index % 2 === 1 ? 'lg:order-last' : ''}>
                                        {s.visual}
                                    </div>
                                    <div className="relative pl-20">
                                        <div className="absolute left-0 top-0 flex items-center justify-center w-12 h-12 rounded-full bg-brand-600 text-white font-bold text-xl shadow-lg border-4 border-white">
                                            {s.step}
                                        </div>
                                        <h3 className="text-3xl font-bold text-slate-800">{s.title}</h3>
                                        <p className="mt-4 text-lg text-slate-600 leading-relaxed">{s.description}</p>
                                    </div>
                                </MotionDiv>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            
            <section className="py-24 bg-slate-50">
                 <div className="max-w-6xl mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Powerful Outputs for a Flawless Workflow</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">Go beyond a simple 'clean' set. We provide the tools you need to communicate changes clearly to your entire project team.</p>
                     <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        {outputs.map((output, index) => (
                            <MotionDiv
                                key={output.title}
                                className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200/80 hover:-translate-y-2 transition-transform duration-300"
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.5 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <output.icon className="h-10 w-10 text-brand-600" />
                                <h3 className="mt-4 text-xl font-bold text-slate-800">{output.title}</h3>
                                <p className="mt-2 text-slate-600">{output.description}</p>
                            </MotionDiv>
                        ))}
                    </div>
                 </div>
            </section>
            
            <section className="py-24">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-center text-3xl md:text-4xl font-bold text-slate-900">Frequently Asked Questions</h2>
                    <div className="mt-12">
                       {faqs.map((faq, index) => <FaqItem key={index} {...faq} />)}
                    </div>
                </div>
            </section>

            <section className="bg-slate-50">
                <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                    <h2 className="text-3xl font-extrabold text-slate-900">Ready to eliminate manual conforming forever?</h2>
                    <p className="mt-4 text-lg text-slate-600">Join the beta and see the difference on your next bid.</p>
                     <button
                        onClick={onGetStartedClick}
                        className="mt-8 px-10 py-4 bg-brand-600 text-white font-semibold rounded-lg shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 text-lg animate-pulse-subtle"
                    >
                        Conform Your First Document
                    </button>
                </div>
            </section>
        </div>
    );
};
