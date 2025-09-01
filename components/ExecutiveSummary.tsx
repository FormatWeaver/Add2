



import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { Spinner } from './Spinner';

interface ExecutiveSummaryProps {
    summary: string | null;
    error: string | null;
    isLoading: boolean;
}

const ExecutiveSummary = ({ summary, error, isLoading }: ExecutiveSummaryProps) => {

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center gap-3 text-slate-500">
                    <Spinner colorClass="text-slate-500" />
                    <span className="text-sm font-medium">AI Co-pilot is writing your summary...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-start gap-3 text-red-700">
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold">Could not generate summary</p>
                        <p className="text-xs">{error}</p>
                    </div>
                </div>
            );
        }

        if (summary) {
            // Parse summary text which uses '*' for bullet points
            const bullets = summary
                .split('*')
                .map(item => item.trim())
                .filter(item => item.length > 0);

            return (
                <ul className="space-y-2">
                    {bullets.map((bullet, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <SparklesIcon className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-700 text-sm">{bullet}</span>
                        </li>
                    ))}
                </ul>
            );
        }
        
        return null; // Should not be rendered in this state based on parent logic
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm min-h-[140px] flex flex-col justify-center">
            <h3 className="text-base font-semibold text-gray-600 tracking-wide uppercase mb-3">
                AI Executive Summary
            </h3>
            {renderContent()}
        </div>
    );
};

export default ExecutiveSummary;