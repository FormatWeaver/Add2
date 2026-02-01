
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentIcon, DocumentPlusIcon, SparklesIcon, ChevronDownIcon, DocumentArrowDownIcon, ArrowsRightLeftIcon, DocumentChartBarIcon, CheckCircleIcon, ShieldCheckIcon, AlertTriangleIcon, UserCheckIcon, ListBulletIcon } from './icons';

interface HowItWorksPageProps {
    onGetStartedClick: () => void;
}

const MotionDiv = motion.div as any;

// --- DYNAMIC VISUAL COMPONENTS ---

const StepVisualUpload = () => (
    <div className="relative w-full aspect-video bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-xl overflow-hidden flex flex-col justify-center items-center">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <div className="relative flex items-center justify-center gap-4">
            <MotionDiv 
                animate={{ 
                    y: [0, -10, 0],
                    rotate: [-2, 2, -2]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-32 h-40 bg-white rounded-lg border border-slate-200 shadow-lg p-4 flex flex-col gap-2"
            >
                <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                <div className="h-2 w-full bg-slate-100 rounded"></div>
                <div className="h-2 w-5/6 bg-slate-100 rounded"></div>
                <div className="mt-auto h-8 w-8 bg-brand-50 rounded self-center flex items-center justify-center">
                    <DocumentIcon className="h-5 w-5 text-brand-500" />
                </div>
            </MotionDiv>

            <MotionDiv 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="z-10 bg-brand-600 p-4 rounded-full shadow-2xl border-4 border-white"
            >
                <SparklesIcon className="h-8 w-8 text-white" />
            </MotionDiv>

            <MotionDiv 
                animate={{ 
                    y: [0, 10, 0],
                    rotate: [2, -2, 2]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="w-32 h-40 bg-white rounded-lg border border-slate-200 shadow-lg p-4 flex flex-col gap-2"
            >
                <div className="h-2 w-full bg-slate-100 rounded"></div>
                <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                <div className="mt-auto h-8 w-8 bg-accent-50 rounded self-center flex items-center justify-center">
                    <DocumentIcon className="h-5 w-5 text-accent-500" />
                </div>
            </MotionDiv>
        </div>

        <MotionDiv 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center"
        >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-bold uppercase tracking-widest">
                <CheckCircleIcon className="h-4 w-4" /> Blueprint Indexed: 1,402 Data Points
            </div>
        </MotionDiv>
    </div>
);

const StepVisualAnalysis = () => (
    <div className="relative w-full aspect-video bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-center">
        <div className="absolute top-0 right-0 p-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-brand-500/10 text-brand-400 rounded-md border border-brand-500/20 text-[10px] font-bold uppercase">
                <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span> Context Engine Active
            </div>
        </div>

        <div className="grid grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
                <div className="h-12 w-full bg-slate-800 rounded-lg border border-slate-700 p-3 flex items-center gap-3">
                    <DocumentPlusIcon className="h-5 w-5 text-slate-500" />
                    <div className="h-2 w-1/2 bg-slate-600 rounded"></div>
                </div>
                <MotionDiv 
                    animate={{ x: [0, 20, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="p-3 bg-brand-600/20 border border-brand-500/40 rounded-lg text-brand-300 text-xs font-mono"
                >
                    SCANNING: "Section 08 71 00"
                </MotionDiv>
            </div>

            <div className="relative h-48 bg-slate-800/50 rounded-xl border border-slate-700 p-4 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent animate-scan"></div>
                <div className="space-y-2 opacity-20">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-2 w-full bg-slate-600 rounded"></div>
                    ))}
                </div>
                <MotionDiv 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="absolute inset-x-4 top-1/2 -translate-y-1/2 p-3 bg-slate-700 border border-brand-400/50 rounded shadow-xl"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 bg-brand-500 rounded-full"></div>
                        <div className="h-2 w-24 bg-brand-400 rounded"></div>
                    </div>
                    <div className="h-2 w-full bg-slate-500 rounded mb-1"></div>
                    <div className="h-2 w-3/4 bg-slate-500 rounded"></div>
                </MotionDiv>
            </div>
        </div>

        <style>{`
            @keyframes scan {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100%); }
            }
            .animate-scan {
                animation: scan 3s linear infinite;
            }
        `}</style>
    </div>
);

const StepVisualResults = () => (
    <div className="relative w-full aspect-video bg-white rounded-2xl p-6 border border-slate-200 shadow-xl overflow-hidden flex gap-4">
        <div className="w-1/3 flex flex-col gap-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Radar</h4>
            <MotionDiv 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="p-3 rounded-lg border border-red-100 bg-red-50 flex flex-col gap-2"
            >
                <div className="flex items-center gap-1.5 text-red-700">
                    <AlertTriangleIcon className="h-3 w-3" />
                    <span className="text-[10px] font-bold">CRITICAL IMPACT</span>
                </div>
                <div className="h-1.5 w-full bg-red-200 rounded"></div>
            </MotionDiv>
            <MotionDiv 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-lg border border-amber-100 bg-amber-50 flex flex-col gap-2"
            >
                <div className="flex items-center gap-1.5 text-amber-700">
                    <AlertTriangleIcon className="h-3 w-3" />
                    <span className="text-[10px] font-bold">MODERATE RISK</span>
                </div>
                <div className="h-1.5 w-full bg-amber-200 rounded"></div>
            </MotionDiv>
        </div>

        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="h-3 w-32 bg-slate-200 rounded"></div>
                <div className="h-6 w-16 bg-brand-600 rounded shadow-sm"></div>
            </div>
            <div className="flex-1 space-y-3 relative">
                <div className="h-2 w-full bg-slate-200 rounded"></div>
                <div className="h-2 w-full bg-slate-200 rounded"></div>
                <MotionDiv 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="p-3 bg-white border border-brand-200 rounded-lg shadow-sm"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-brand-600">CONFORMED CHANGE</span>
                        <CheckCircleIcon className="h-3 w-3 text-brand-500" />
                    </div>
                    <div className="h-1.5 w-full bg-brand-50 rounded mb-1"></div>
                    <div className="h-1.5 w-3/4 bg-brand-50 rounded"></div>
                </MotionDiv>
                <div className="h-2 w-5/6 bg-slate-200 rounded"></div>
            </div>
            
            <MotionDiv 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center"
            >
                <div className="flex items-center gap-1">
                    <UserCheckIcon className="h-3 w-3 text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Audit Ready</span>
                </div>
                <span className="text-[9px] text-slate-400">Ver. 2.4.0</span>
            </MotionDiv>
        </div>
    </div>
);

const FaqItem = ({ q, a }: { q: string; a: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 py-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left gap-4 transition-colors hover:text-brand-600"
            >
                <span className="font-semibold text-lg text-slate-800">{q}</span>
                <ChevronDownIcon className={`flex-shrink-0 h-6 w-6 text-slate-500 transition-transform transform ${isOpen ? 'rotate-180 text-brand-600' : ''}`} />
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
                    <p className="text-slate-600 leading-relaxed text-sm md:text-base">{a}</p>
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
            title: "Build the 'Single Source of Truth'",
            badge: "Intelligent Indexing",
            description: "Traditional AI re-reads your entire project for every question. AddendaConform is different. We pre-process your original tender set to build a 'Project Blueprint'—a high-fidelity digital index that enables surgical, context-aware analysis of any size project in seconds, not minutes.",
            visual: <StepVisualUpload />,
        },
        {
            step: 2,
            title: "Context-Aware Surgical Analysis",
            badge: "Multi-Document Reasoning",
            description: "Upload your addenda. Our AI instructions engine performs a targeted query against your Blueprint. It doesn't just look for text; it understands the discipline, the spec section, and the visual sheet hierarchy to pinpoint exactly where the 'old' meets the 'new'.",
            visual: <StepVisualAnalysis />,
        },
        {
            step: 3,
            title: "Enterprise Review & Governance",
            badge: "Risk & Compliance",
            description: "Review changes with peace of mind. Our system flags high-risk financial and legal changes automatically. Every approval is logged in a permanent audit trail, ensuring your final conformed document set is not just 'clean,' but fully defensible.",
            visual: <StepVisualResults />,
        },
    ];

    const enterpriseFeatures = [
        {
            icon: AlertTriangleIcon,
            title: "AI Risk Radar",
            description: "Automatically flags scope deletions or major spec changes that could lead to costly claims.",
        },
        {
            icon: ShieldCheckIcon,
            title: "Governance Audit Trail",
            description: "Every vetted change is timestamped and attributed to a user for accountability.",
        },
        {
            icon: ListBulletIcon,
            title: "Automated RFI Drafting",
            description: "If an addendum instruction is vague, the AI drafts a professional RFI for you instantly.",
        },
    ];

    const faqs = [
        {
            q: "How does this scale to 2,000+ page documents?",
            a: "Our architecture separates document parsing from reasoning. By indexing your documents into a Project Blueprint first, we can perform targeted queries that stay within the AI's high-context window, ensuring accuracy even on massive skyscraper projects."
        },
        {
            q: "Is my data used to train the models?",
            a: "Absolutely not. We utilize Enterprise-tier Gemini APIs with a 'Zero Training' policy. Your data is isolated, encrypted, and processed in a stateless environment. We never store your data beyond your session unless you choose to use our secure Cloud Storage."
        },
        {
            q: "What file formats are supported?",
            a: "Currently, we focus on PDF files, as they are the standard for Tender and Addenda issuance. Our system can handle both vector-based and high-quality scanned documents using multi-modal OCR."
        }
    ];

    return (
        <div className="bg-white">
            <header className="py-24 bg-slate-50 border-b border-slate-200 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #2563eb 1px, transparent 1px), linear-gradient(to bottom, #2563eb 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                 <div className="max-w-4xl mx-auto px-4 relative">
                    <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                        <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block">Enterprise Document Governance</span>
                        <h1 className="text-4xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            The Architecture of <span className="text-brand-600">Zero Error</span> Conforming.
                        </h1>
                        <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed">
                            We reimagined document management for the world's most complex projects. Faster than manual review, more accurate than standard AI, and built for team-wide accountability.
                        </p>
                    </MotionDiv>
                </div>
            </header>

            <section className="py-32">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="space-y-40">
                        {steps.map((s, index) => (
                            <MotionDiv
                                key={s.step} 
                                className={`relative grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-12 items-center ${index % 2 === 1 ? 'lg:direction-rtl' : ''}`}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                            >
                                <div className={index % 2 === 1 ? 'lg:order-last' : ''}>
                                    {s.visual}
                                </div>
                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600 text-white font-bold text-lg shadow-lg">
                                            {s.step}
                                        </div>
                                        <span className="text-xs font-black text-brand-600 uppercase tracking-widest">{s.badge}</span>
                                    </div>
                                    <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">{s.title}</h3>
                                    <p className="mt-6 text-lg text-slate-600 leading-relaxed">{s.description}</p>
                                </div>
                            </MotionDiv>
                        ))}
                    </div>
                </div>
            </section>
            
            <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%)' }}></div>
                 <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Enterprise Grade by Default.</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">Features built for the rigorous standards of multi-billion dollar construction firms.</p>
                     <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                        {enterpriseFeatures.map((feature, index) => (
                            <MotionDiv
                                key={feature.title}
                                className="group"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 transition-all group-hover:bg-brand-600 group-hover:scale-110">
                                    <feature.icon className="h-7 w-7 text-brand-400 group-hover:text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                            </MotionDiv>
                        ))}
                    </div>
                 </div>
            </section>
            
            <section className="py-32">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-center text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Expert Technical Support</h2>
                    <p className="text-center text-slate-500 mt-4 mb-16">Deep dive into our methodology and security standards.</p>
                    <div className="space-y-2">
                       {faqs.map((faq, index) => <FaqItem key={index} {...faq} />)}
                    </div>
                </div>
            </section>

            <section className="bg-slate-50 border-t border-slate-200">
                <div className="max-w-4xl mx-auto px-4 py-24 text-center">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Replace the manual grind with AI certainty.</h2>
                    <p className="mt-6 text-xl text-slate-600 mb-10">Join the waitlist for our direct Autodesk Revit integration.</p>
                     <button
                        onClick={onGetStartedClick}
                        className="px-10 py-5 bg-brand-600 text-white font-black uppercase tracking-widest rounded-xl shadow-2xl hover:bg-brand-700 transition-all hover:-translate-y-1 active:translate-y-0"
                    >
                        Conform Your First Document
                    </button>
                    <p className="mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">No credit card required • Secure beta access</p>
                </div>
            </section>
        </div>
    );
};
