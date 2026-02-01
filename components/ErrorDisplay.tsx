
import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface ErrorDisplayProps {
    title: string;
    message: string;
    onReset?: () => void;
    onRetry?: () => void;
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
}

export const ErrorDisplay = ({ title, message, onReset, onRetry, secondaryAction }: ErrorDisplayProps) => {
    return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-slate-50">
            <div className="max-w-2xl w-full bg-white p-8 rounded-2xl border border-red-200 shadow-lg text-center animate-pop-in">
                <AlertTriangleIcon className="h-16 w-16 text-red-400 mx-auto" />
                <h2 className="mt-4 text-2xl font-extrabold text-slate-800">{title}</h2>
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100 text-left">
                    <p className="text-sm font-bold text-red-800 uppercase tracking-wide mb-1">Error Detail:</p>
                    <p className="text-slate-700 leading-relaxed">
                        {message}
                    </p>
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    {onRetry && (
                         <button
                            onClick={onRetry}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow"
                        >
                            <ArrowPathIcon className="h-4 w-4" /> Try Again
                        </button>
                    )}
                    
                    {secondaryAction && (
                        <button
                            onClick={secondaryAction.onClick}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-md text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                        >
                            {secondaryAction.label}
                        </button>
                    )}

                    {onReset && (
                        <button
                            onClick={onReset}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                        >
                            Start Over
                        </button>
                    )}
                </div>
                
                {secondaryAction && (
                    <p className="mt-6 text-xs text-slate-500 italic">
                        Bypassing is recommended if you are certain the documents belong to the same project and the AI is flagging a minor typo.
                    </p>
                )}
            </div>
        </div>
    );
};
