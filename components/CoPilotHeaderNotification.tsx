



import React from 'react';
import { VerificationIssue } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { FlagIcon } from './icons/FlagIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { Spinner } from './Spinner';

interface CoPilotHeaderNotificationProps {
    issues: VerificationIssue[] | null;
    isOpen: boolean;
    onToggle: () => void;
    activeIssue: VerificationIssue | null;
    onSelectIssue: (issue: VerificationIssue | null) => void;
    verificationError: string | null;
}

const CoPilotHeaderNotification = ({ issues, isOpen, onToggle, activeIssue, onSelectIssue, verificationError }: CoPilotHeaderNotificationProps) => {

    const handleIssueClick = (issue: VerificationIssue) => {
        onSelectIssue(activeIssue === issue ? null : issue);
    };

    const getSummary = () => {
        if (verificationError) {
            return (
                <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Verification Failed</span>
                </div>
            );
        }
        if (issues === null) {
            return (
                <div className="flex items-center gap-2">
                    <Spinner colorClass="text-gray-500" />
                    <span className="text-sm font-medium text-gray-500">Verifying...</span>
                </div>
            );
        }
        if (issues.length === 0) {
            return (
                <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-brand-600" />
                    <span className="text-sm font-medium text-gray-700">Verified</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">{issues.length} Issue{issues.length > 1 && 's'}</span>
            </div>
        );
    };

    const renderDropdownContent = () => {
        if (verificationError) {
            return (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <div className="flex items-start space-x-3">
                        <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-900 text-sm">AI Co-pilot Error</h3>
                            <p className="text-xs text-red-800 mt-1 leading-relaxed">{verificationError}</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (issues === null) {
            return (
                <div className="p-4 flex items-center justify-center gap-2">
                    <Spinner colorClass="text-gray-500" />
                    <span className="text-sm font-medium text-gray-500">Verifying plan...</span>
                </div>
            );
        }

        if (issues.length === 0) {
            return (
                <div className="p-3 bg-emerald-50 border-b border-emerald-200">
                    <div className="flex items-start space-x-3">
                        <CheckCircleIcon className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-emerald-900 text-sm">Verification Complete</h3>
                            <p className="text-xs text-emerald-800 mt-1">No potential issues found.</p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <>
                <div className="p-3 bg-amber-50 border-b border-amber-200">
                    <div className="flex items-start space-x-3">
                        <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-900 text-sm">AI Co-pilot has flagged {issues.length} potential issue{issues.length > 1 && 's'}.</h3>
                            <p className="text-xs text-amber-800 mt-1">Click an issue to filter the change list.</p>
                        </div>
                    </div>
                </div>
                <div className="p-2 space-y-1.5 max-h-96 overflow-y-auto">
                    {issues.map((issue, index) => {
                        const isActive = activeIssue === issue;
                        return (
                            <div
                                key={index}
                                onClick={() => handleIssueClick(issue)}
                                className={`p-2.5 rounded-md border-l-4 cursor-pointer transition-all duration-150 ${
                                    isActive 
                                    ? 'bg-amber-100/80 border-amber-500 shadow-sm' 
                                    : 'bg-white border-gray-200 hover:bg-amber-50/50 hover:border-amber-400'
                                }`}
                            >
                                <div className="flex items-start space-x-2.5">
                                    <FlagIcon className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5"/>
                                    <div className="min-w-0">
                                        <h4 className="font-semibold text-xs text-amber-900">{issue.title}</h4>
                                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                            {issue.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {activeIssue && (
                    <div className="p-2 border-t border-gray-200 bg-gray-50 text-right">
                        <button 
                            onClick={() => onSelectIssue(null)}
                            className="flex items-center gap-1 ml-auto px-2 py-0.5 text-xs font-semibold rounded-md text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors"
                            title="Clear issue filter"
                        >
                            <XCircleIcon className="h-3 w-3" />
                            Clear Filter
                        </button>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-brand-600 rounded-md transition-colors flex items-center gap-2"
                title="AI Co-pilot Verification"
                disabled={!verificationError && !issues}
            >
                {getSummary()}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    {renderDropdownContent()}
                </div>
            )}
        </div>
    );
};

export default CoPilotHeaderNotification;