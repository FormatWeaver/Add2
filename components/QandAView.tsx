
import React, { useState } from 'react';
import { QAndAItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, QuestionMarkCircleIcon } from './icons';

// Comment: Added key to AccordionItemProps to fix line 66 error.
interface AccordionItemProps {
    item: QAndAItem;
    key?: React.Key;
}

const AccordionItem = ({ item }: AccordionItemProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left p-4 hover:bg-slate-50 transition-colors"
                aria-expanded={isOpen}
            >
                <span className="font-semibold text-slate-800 flex-1 pr-4">{item.question}</span>
                <div className="flex items-center gap-4">
                    {item.discipline && (
                         <span className="hidden sm:inline-block text-xs font-bold text-sky-700 bg-sky-100 px-2 py-1 rounded-full">{item.discipline}</span>
                    )}
                    <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 border-t border-gray-200 bg-slate-50/50">
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                            <div className="mt-4 text-xs text-slate-500 font-medium">
                                Source: {item.source_addendum_file}
                                {item.spec_section && ` | Spec Section: ${item.spec_section}`}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const QandAView = ({ qaLog }: QandAViewProps) => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <QuestionMarkCircleIcon className="h-12 w-12 mx-auto text-brand-500" />
                <h2 className="mt-4 text-2xl font-bold text-slate-900">Questions & Answers</h2>
                <p className="mt-1 text-base text-slate-600">
                    The following clarifications were identified in the addenda documents.
                </p>
            </div>
            <div className="space-y-4">
                {qaLog.map((item) => (
                    <AccordionItem key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
};

interface QandAViewProps {
    qaLog: QAndAItem[];
}

export default QandAView;
