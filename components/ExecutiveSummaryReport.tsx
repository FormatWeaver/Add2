
import React from 'react';
import { TriageReportData, AICostAnalysisResult } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { WrenchScrewdriverIcon } from './icons/WrenchScrewdriverIcon';
import { CurrencyDollarIcon } from './icons/CurrencyDollarIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { DocumentIcon } from './icons/DocumentIcon';


interface ExecutiveSummaryReportProps {
    triageReport: TriageReportData | null;
    executiveSummary: string | null;
    costAnalysisResult: AICostAnalysisResult | null;
    onBack: () => void;
}

// Comment: Refined interface to fix ReportCard children missing issues on lines 74, 87, 93, 131.
interface ReportCardProps {
    icon: React.ElementType;
    title: string;
    children?: React.ReactNode;
}

const ReportCard: React.FC<ReportCardProps> = ({ icon: Icon, title, children }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
            <Icon className="h-6 w-6 text-brand-500" />
            {title}
        </h2>
        <div className="mt-4 text-slate-700 space-y-3">
            {children}
        </div>
    </div>
);

const KeyMetric = ({ label, value, colorClass, icon: Icon }: { label: string; value: string; colorClass?: string; icon?: React.ElementType }) => (
    <div className={`p-4 rounded-lg flex items-start gap-4 ${colorClass || 'bg-slate-100 text-slate-800'}`}>
        {Icon && <Icon className="h-8 w-8 flex-shrink-0 opacity-50" />}
        <div>
            <p className="text-sm font-bold uppercase tracking-wider opacity-70">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
        </div>
    </div>
);


const ExecutiveSummaryReport = ({ triageReport, executiveSummary, costAnalysisResult, onBack }: ExecutiveSummaryReportProps) => {

    const summaryBullets = executiveSummary
        ? executiveSummary.split('*').map(item => item.trim()).filter(Boolean)
        : [];
    
    const sortedDisciplines = triageReport ? [...triageReport.discipline_impact].sort((a, b) => b.mentions - a.mentions) : [];

    return (
        <div className="max-w-6xl mx-auto">
             <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Executive Summary Report</h1>
                    <p className="mt-1 text-lg text-slate-600">
                        A high-level overview of all identified changes and their potential impact.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={onBack} className="px-5 py-2 text-sm font-bold rounded-lg shadow-lg bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-2">
                        <ChevronLeftIcon className="h-5 w-5" />
                        Back to Change List
                    </button>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                    {executiveSummary && (
                        <ReportCard icon={SparklesIcon} title="AI Analysis">
                             <ul className="space-y-3">
                                {summaryBullets.map((bullet, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="mt-1 w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0"></div>
                                        <span className="text-slate-700 text-sm">{bullet}</span>
                                    </li>
                                ))}
                            </ul>
                        </ReportCard>
                    )}

                     {costAnalysisResult && (
                        <ReportCard icon={CurrencyDollarIcon} title="Cost Impact">
                            <p>{costAnalysisResult.overall_impact_summary}</p>
                        </ReportCard>
                    )}

                    {triageReport && (
                        <ReportCard icon={ClipboardCheckIcon} title="Suggested Next Steps">
                             <ul className="space-y-3">
                                {triageReport.suggested_checklist.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="mt-1 w-4 h-4 border-2 border-slate-300 rounded-sm bg-slate-50 flex-shrink-0"></div>
                                        <span className="text-slate-700 text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </ReportCard>
                    )}
                </div>

                <div className="space-y-8">
                    {triageReport && (
                        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                             <KeyMetric 
                                label="Bid Date Change"
                                value={triageReport.bid_date_change.is_changed ? triageReport.bid_date_change.details : "No Change Detected"}
                                colorClass={triageReport.bid_date_change.is_changed ? "bg-red-100 text-red-900" : "bg-slate-100 text-slate-800"}
                                icon={CalendarDaysIcon}
                            />
                             <KeyMetric 
                                label="Spec Sections Mentioned"
                                value={`${triageReport.mentioned_spec_sections.length} Sections`}
                                colorClass="bg-indigo-100 text-indigo-900"
                                icon={DocumentTextIcon}
                            />
                            <KeyMetric 
                                label="Drawings Mentioned"
                                value={`${triageReport.mentioned_drawings.length} Sheets`}
                                colorClass="bg-sky-100 text-sky-900"
                                icon={DocumentIcon}
                            />
                        </div>
                    )}

                    {triageReport && sortedDisciplines.length > 0 && (
                        <ReportCard icon={WrenchScrewdriverIcon} title="Discipline Impact Breakdown">
                            <div className="space-y-4">
                                {sortedDisciplines.map(d => (
                                    <div key={d.discipline} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold text-slate-800">{d.discipline}</h3>
                                            <span className="text-sm font-bold text-brand-600 bg-brand-100 px-2.5 py-1 rounded-full">{d.mentions} Changes</span>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-600">{d.description}</p>
                                    </div>
                                ))}
                            </div>
                        </ReportCard>
                    )}
                </div>
            </div>

             <div className="mt-8 bg-sky-50 text-sky-800 p-4 rounded-xl border border-sky-200 flex items-start gap-3">
                <InformationCircleIcon className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold">Disclaimer</h4>
                    <p className="text-sm">This AI-generated report is for informational purposes and preliminary planning only, and is not a substitute for a detailed review by qualified professionals.</p>
                </div>
            </div>
        </div>
    )
}

export default ExecutiveSummaryReport;
