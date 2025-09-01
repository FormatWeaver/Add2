import React from 'react';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface ErrorDisplayProps {
    title: string;
    message: string;
    onReset?: () => void;
    onRetry?: () => void;
}

export const ErrorDisplay = ({ title, message, onReset, onRetry }: ErrorDisplayProps) => {
    return (
        <div className="w-full h-full flex items-center justify-center p-4 bg-slate-50">
            <div className="max-w-2xl w-full bg-white p-8 rounded-2xl border border-red-200 shadow-lg text-center animate-pop-in">
                <AlertTriangleIcon className="h-16 w-16 text-red-400 mx-auto" />
                <h2 className="mt-4 text-2xl font-extrabold text-slate-800">{title}</h2>
                <p className="mt-2 text-slate-600">
                    {message}
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                    {onRetry && (
                         <button
                            onClick={onRetry}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow"
                        >
                            <ArrowPathIcon className="h-4 w-4" /> Try Again
                        </button>
                    )}
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                        >
                            Start Over
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
