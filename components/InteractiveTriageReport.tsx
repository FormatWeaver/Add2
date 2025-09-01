


import React, { useMemo } from 'react';
import { TriageReportData, AppChangeLogItem, ChangeType, CostImpactLevel } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { WrenchScrewdriverIcon } from './icons/WrenchScrewdriverIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { DocumentIcon } from './icons/DocumentIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface InteractiveTriageReportProps {
    report: TriageReportData;
    addendumName: string;
    changeLog: AppChangeLogItem[];
    onSelectFilter: (filter: {type: string, value: string | number, title: string}) => void;
    onBackToList: () => void;
}

const MotionDiv = motion.div as any;

const ZenCard = ({ title, value, subtext, onClick, className = '', icon: Icon }: { title: string, value: string | number, subtext?: string, onClick?: () => void, className?: string, icon?: React.ElementType }) => (
    <MotionDiv
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm text-center flex flex-col justify-center items-center relative ${onClick ? 'cursor-pointer hover:border-brand-400 hover:shadow-lg transition-all duration-200' : ''} ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={onClick ? { scale: 1.03 } : {}}
    >
        {Icon && <Icon className="h-6 w-6 text-slate-400 absolute top-4 right-4" />}
        <p className="text-5xl font-extrabold text-slate-800">{value}</p>
        <h2 className="text-sm font-semibold text-slate-500 mt-2 tracking-wide uppercase">{title}</h2>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </MotionDiv>
);


const DashboardCard = ({ title, icon: Icon, children, className = '' }: { title: string, icon: React.ElementType, children: React.ReactNode, className?: string }) => (
    <MotionDiv
        className={`bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <h2 className="text-base font-semibold text-gray-600 tracking-wide uppercase mb-4 flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
        </h2>
        {children}
    </MotionDiv>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-2 border border-gray-300 rounded-md shadow-lg">
        <p className="font-bold text-sm text-slate-800">{`${label} : ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const InteractiveTriageReport = ({ report, addendumName, changeLog, onSelectFilter, onBackToList }: InteractiveTriageReportProps) => {

    const chartData = useMemo(() => {
        // Discipline Data
        const disciplineCounts = changeLog.reduce((acc, c) => {
            const discipline = c.discipline || 'General';
            acc[discipline] = (acc[discipline] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const disciplineData = Object.entries(disciplineCounts).map(([name, value]) => ({ name, value }));

        // Change Type Data
        const mapTypeToGroup = (type: ChangeType) => {
            if (type.includes('ADD')) return 'Additions';
            if (type.includes('DELETE')) return 'Deletions';
            if (type.includes('REPLACE')) return 'Revisions';
            return 'Notes';
        };
        const typeCounts = changeLog.reduce((acc, c) => {
            const group = mapTypeToGroup(c.change_type);
            acc[group] = (acc[group] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const changeTypeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

        // Impacted Sheets Data
        const sheetCounts = changeLog.reduce((acc, c) => {
            const sheet = c.location_hint || c.spec_section;
            if (sheet) {
                acc[sheet] = (acc[sheet] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        const impactedSheetsData = Object.entries(sheetCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 7) // Top 7
            .map(([name, value]) => ({ name, value }));
            
        return { disciplineData, changeTypeData, impactedSheetsData };
    }, [changeLog]);

    const COLORS = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1e3a8a', '#1e40af'];
    const totalChanges = changeLog.length;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
             <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        This addendum contains <span className="text-brand-600">{totalChanges} total changes.</span>
                    </h1>
                    <p className="mt-2 text-lg text-slate-600">
                        AI Triage for <span className="font-semibold text-slate-800">"{addendumName}"</span>
                    </p>
                </div>
                <button onClick={onBackToList} className="px-5 py-2 text-sm font-bold rounded-lg shadow-lg bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-2 flex-shrink-0">
                    <ChevronLeftIcon className="h-5 w-5" />
                    Back to Change List
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <ZenCard title="Total Changes" value={totalChanges} />
                 <ZenCard 
                    title="High-Impact Changes" 
                    value={report.high_impact_changes_count ?? 0}
                    subtext="AI-estimated cost impact"
                    icon={ExclamationTriangleIcon}
                    className={report.high_impact_changes_count && report.high_impact_changes_count > 0 ? 'bg-amber-50/50' : ''}
                    onClick={() => onSelectFilter({ type: 'high_impact', value: CostImpactLevel.HIGH, title: 'High-Impact Changes' })}
                 />
                 <ZenCard 
                    title="Bid Date" 
                    value={report.bid_date_change.is_changed ? 'CHANGED' : 'Unaffected'}
                    subtext={report.bid_date_change.details}
                    className={report.bid_date_change.is_changed ? 'bg-red-50 text-red-700' : ''}
                    icon={CalendarDaysIcon}
                />
            </div>

            <DashboardCard title="AI Summary" icon={SparklesIcon}>
                <p className="text-slate-700 text-lg">{report.summary}</p>
            </DashboardCard>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <DashboardCard title="Changes by Discipline" icon={WrenchScrewdriverIcon} className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie 
                                data={chartData.disciplineData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={80} 
                                fill="#8884d8" 
                                paddingAngle={5} 
                                onClick={(data) => onSelectFilter({ type: 'discipline', value: data.name, title: 'Discipline' })}
                            >
                                {chartData.disciplineData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer outline-none" />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{fontSize: "12px"}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </DashboardCard>
                
                <DashboardCard title="Changes by Type" icon={ListBulletIcon} className="lg:col-span-3">
                     <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.changeTypeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="name" style={{fontSize: "12px"}}/>
                            <YAxis allowDecimals={false} style={{fontSize: "12px"}}/>
                            <Tooltip cursor={{fill: 'rgba(219, 234, 254, 0.6)'}} content={<CustomTooltip />} />
                            <Bar dataKey="value" onClick={(data) => onSelectFilter({ type: 'change_type_group', value: data.name, title: 'Change Type' })}>
                                 {chartData.changeTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer" />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </DashboardCard>
            </div>

             {report.questions_and_answers && report.questions_and_answers.length > 0 && (
                <DashboardCard title="Questions & Answers" icon={DocumentTextIcon}>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {report.questions_and_answers.map((qa, index) => (
                            <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <p className="text-sm font-semibold text-slate-800">Q: {qa.question}</p>
                                <p className="mt-2 text-sm text-slate-700">A: {qa.answer}</p>
                                {qa.impact_summary && (
                                    <p className="mt-3 text-sm font-medium text-sky-800 bg-sky-100/70 p-2 rounded-md border border-sky-200">
                                        <span className="font-bold">AI Impact Note:</span> {qa.impact_summary}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </DashboardCard>
            )}

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <DashboardCard title="Most Impacted Sheets & Specs" icon={DocumentIcon}>
                    <div className="space-y-2">
                        {chartData.impactedSheetsData.length > 0 ? chartData.impactedSheetsData.map(item => (
                             <button key={item.name} onClick={() => onSelectFilter({ type: 'impacted_sheet', value: item.name, title: 'Sheet/Spec' })} className="w-full flex justify-between items-center p-2 rounded-md hover:bg-slate-100 transition-colors group">
                                <span className="text-sm font-medium text-slate-700 truncate pr-4">{item.name}</span>
                                <span className="text-sm font-bold text-brand-600 bg-brand-100 group-hover:bg-brand-200 transition-colors px-2 py-0.5 rounded-full">{item.value}</span>
                            </button>
                        )) : <p className="text-sm text-center text-slate-500 py-4">No specific sheets with page-level changes found.</p>}
                    </div>
                 </DashboardCard>
                <DashboardCard title="AI-Suggested Checklist" icon={ClipboardCheckIcon}>
                    <ul className="space-y-3">
                        {report.suggested_checklist.map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <div className="mt-1 w-4 h-4 border-2 border-slate-300 rounded-sm bg-slate-50 flex-shrink-0"></div>
                                <span className="text-slate-700 text-sm">{item}</span>
                            </li>
                        ))}
                    </ul>
                </DashboardCard>
            </div>
        </div>
    );
};

export default InteractiveTriageReport;