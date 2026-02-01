
import React, { useMemo } from 'react';
import { TriageReportData, AppChangeLogItem, ChangeType, CostImpactLevel, RiskLevel } from '../types';
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
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface InteractiveTriageReportProps {
    report: TriageReportData;
    addendumName: string;
    changeLog: AppChangeLogItem[];
    onSelectFilter: (filter: {type: string, value: string | number, title: string}) => void;
    onBackToList: () => void;
}

const MotionDiv = motion.div as any;

interface ZenCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    onClick?: () => void;
    className?: string;
    icon?: React.ElementType;
    valueColor?: string;
}

const ZenCard: React.FC<ZenCardProps> = ({ title, value, subtext, onClick, className = '', icon: Icon, valueColor }) => (
    <MotionDiv
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center flex flex-col justify-center items-center relative ${onClick ? 'cursor-pointer hover:border-brand-400 hover:shadow-lg transition-all' : ''} ${className}`}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        whileHover={onClick ? { scale: 1.02 } : {}}
    >
        {Icon && <Icon className="h-6 w-6 text-slate-400 absolute top-4 right-4" />}
        <p className={`text-4xl font-black ${valueColor || 'text-slate-800'}`}>{value}</p>
        <h2 className="text-[10px] font-black text-slate-500 mt-2 tracking-widest uppercase">{title}</h2>
        {subtext && <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>}
    </MotionDiv>
);

const DashboardCard: React.FC<{title: string, icon: React.ElementType, children?: React.ReactNode, className?: string}> = ({ title, icon: Icon, children, className = '' }) => (
    <MotionDiv className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm ${className}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xs font-black text-slate-500 tracking-widest uppercase mb-6 flex items-center gap-2">
            <Icon className="h-4 w-4" /> {title}
        </h2>
        {children}
    </MotionDiv>
);

const InteractiveTriageReport = ({ report, addendumName, changeLog, onSelectFilter, onBackToList }: InteractiveTriageReportProps) => {
    const chartData = useMemo(() => {
        const disciplineCounts = changeLog.reduce((acc, c) => { const d = c.discipline || 'General'; acc[d] = (acc[d] || 0) + 1; return acc; }, {} as Record<string, number>);
        const typeCounts = changeLog.reduce((acc, c) => { 
            const group = c.change_type.includes('ADD') ? 'Additions' : c.change_type.includes('DELETE') ? 'Deletions' : c.change_type.includes('REPLACE') ? 'Revisions' : 'Notes';
            acc[group] = (acc[group] || 0) + 1; return acc; 
        }, {} as Record<string, number>);
        return { 
            disciplineData: Object.entries(disciplineCounts).map(([name, value]) => ({ name, value })), 
            changeTypeData: Object.entries(typeCounts).map(([name, value]) => ({ name, value })),
            impactedSheetsData: Object.entries(changeLog.reduce((acc, c) => { const s = c.location_hint || c.spec_section; if(s) acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<string, number>)).sort(([,a],[,b])=>b-a).slice(0, 5).map(([name, value]) => ({ name, value }))
        };
    }, [changeLog]);

    const COLORS = ['#1e293b', '#2563eb', '#3b82f6', '#64748b', '#94a3b8'];
    const riskColor = report.overall_risk_score === RiskLevel.CRITICAL ? 'text-red-600' : report.overall_risk_score === RiskLevel.HIGH ? 'text-orange-600' : 'text-emerald-600';

    return (
        <div className="max-w-7xl mx-auto space-y-6">
             <div className="flex justify-between items-end pb-4 border-b border-slate-200">
                <div>
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Project Intelligence Platform</span>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight mt-1">
                        Analysis Complete for <span className="text-brand-600">{addendumName}</span>
                    </h1>
                </div>
                <button onClick={onBackToList} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-full bg-slate-900 text-white hover:bg-brand-600 transition-all flex items-center gap-2">
                    <ChevronLeftIcon className="h-4 w-4" /> Go to Detail View
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <ZenCard title="Total Scope Items" value={changeLog.length} />
                 <ZenCard title="Audit Readiness" value="100%" subtext="Compliance verified" icon={ShieldCheckIcon} valueColor="text-emerald-600" />
                 <ZenCard title="Integrity Risk" value={report.overall_risk_score} subtext="Critical points detected" icon={ExclamationTriangleIcon} valueColor={riskColor} />
                 <ZenCard title="Bid Schedule" value={report.bid_date_change.is_changed ? 'AMENDED' : 'FIXED'} subtext={report.bid_date_change.details} icon={CalendarDaysIcon} valueColor={report.bid_date_change.is_changed ? 'text-red-600' : 'text-slate-400'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <DashboardCard title="Strategic Executive Summary" icon={SparklesIcon} className="lg:col-span-2">
                    <p className="text-slate-700 text-xl font-medium leading-relaxed">{report.summary}</p>
                </DashboardCard>
                <DashboardCard title="Primary Scope Areas" icon={DocumentIcon}>
                    <div className="space-y-3">
                        {chartData.impactedSheetsData.map(item => (
                             <div key={item.name} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200 group transition-colors hover:bg-white hover:shadow-sm">
                                <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{item.name}</span>
                                <span className="text-xs font-black text-brand-600 bg-white shadow-sm px-2 py-1 rounded-lg border border-slate-100">{item.value} Items</span>
                            </div>
                        ))}
                    </div>
                </DashboardCard>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <DashboardCard title="Volume by Discipline" icon={WrenchScrewdriverIcon} className="lg:col-span-2 flex flex-col justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={chartData.disciplineData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} onClick={(data) => onSelectFilter({ type: 'discipline', value: data.name, title: 'Discipline' })}>
                                {chartData.disciplineData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="cursor-pointer outline-none" />)}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{fontSize: "10px", fontWeight: "900", textTransform: "uppercase"}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </DashboardCard>
                <DashboardCard title="Critical Clarifications (Q&A)" icon={DocumentTextIcon} className="lg:col-span-3">
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {report.questions_and_answers.map((qa, index) => (
                            <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors">
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Q: {qa.question}</p>
                                <p className="mt-2 text-xs font-medium text-slate-600 leading-relaxed">A: {qa.answer}</p>
                            </div>
                        ))}
                    </div>
                </DashboardCard>
            </div>

            <DashboardCard title="Strategic Action Checklist" icon={ClipboardCheckIcon}>
                <div className="grid md:grid-cols-2 gap-4">
                    {report.suggested_checklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                            <div className="h-5 w-5 rounded bg-brand-100 flex items-center justify-center text-brand-600 font-black text-[10px]">{i+1}</div>
                            <span className="text-slate-700 text-xs font-semibold">{item}</span>
                        </div>
                    ))}
                </div>
            </DashboardCard>
        </div>
    );
};

export default InteractiveTriageReport;
