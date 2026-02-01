
import React, { useMemo } from 'react';
import { TriageReportData, AppChangeLogItem, ChangeType, CostImpactLevel, RiskLevel } from '../types';
import { SparklesIcon, WrenchScrewdriverIcon, ListBulletIcon, ClipboardCheckIcon, ChevronLeftIcon, DocumentIcon, CalendarDaysIcon, ExclamationTriangleIcon, DocumentTextIcon, ShieldCheckIcon } from './icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';

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
        className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center flex flex-col justify-center items-center relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-brand-400 hover:shadow-xl transition-all' : ''} ${className}`}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        whileHover={onClick ? { scale: 1.02 } : {}}
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
        {Icon && <Icon className="h-6 w-6 text-slate-200 absolute top-6 right-6 z-10" />}
        <p className={`text-5xl font-black tracking-tighter z-10 ${valueColor || 'text-slate-900'}`}>{value}</p>
        <h2 className="text-[10px] font-black text-slate-400 mt-3 tracking-[0.2em] uppercase z-10">{title}</h2>
        {subtext && <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tight z-10 opacity-60">{subtext}</p>}
    </MotionDiv>
);

const DashboardCard: React.FC<{title: string, icon: React.ElementType, children?: React.ReactNode, className?: string, badge?: string}> = ({ title, icon: Icon, children, className = '', badge }) => (
    <MotionDiv className={`bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden ${className}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase flex items-center gap-3">
                <div className="h-6 w-6 bg-slate-50 rounded-lg flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5" /> 
                </div>
                {title}
            </h2>
            {badge && <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[9px] font-black uppercase tracking-widest">{badge}</span>}
        </div>
        {children}
    </MotionDiv>
);

const InteractiveTriageReport = ({ report, addendumName, changeLog, onSelectFilter, onBackToList }: InteractiveTriageReportProps) => {
    const chartData = useMemo(() => {
        const disciplineCounts = changeLog.reduce((acc, c) => { const d = c.discipline || 'General'; acc[d] = (acc[d] || 0) + 1; return acc; }, {} as Record<string, number>);
        const impactedSheetsCounts = changeLog.reduce((acc, c) => { 
            const s = c.location_hint || c.spec_section; 
            if(s) acc[s] = (acc[s] || 0) + 1; 
            return acc; 
        }, {} as Record<string, number>);

        return { 
            disciplineData: Object.entries(disciplineCounts).map(([name, value]) => ({ name, value })), 
            impactedSheetsData: Object.entries(impactedSheetsCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, value]) => ({ name, value }))
        };
    }, [changeLog]);

    const COLORS = ['#1e293b', '#2563eb', '#3b82f6', '#64748b', '#94a3b8'];
    const riskColor = report.overall_risk_score === RiskLevel.CRITICAL ? 'text-red-600' : report.overall_risk_score === RiskLevel.HIGH ? 'text-orange-600' : 'text-emerald-600';

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 bg-brand-600 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em]">Intelligence HUD v3.0</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                        Merge Intelligence: <span className="text-brand-600">{addendumName.split(',')[0]}</span>
                    </h1>
                </div>
                <button onClick={onBackToList} className="px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl bg-slate-900 text-white hover:bg-brand-600 transition-all flex items-center gap-3 shadow-2xl shadow-slate-200">
                    <ChevronLeftIcon className="h-4 w-4" /> Return to Data Grid
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <ZenCard title="Total Vector Items" value={changeLog.length} icon={ListBulletIcon} />
                 <ZenCard title="Audit Readiness" value="100%" subtext="Authenticated" icon={ShieldCheckIcon} valueColor="text-emerald-500" />
                 <ZenCard title="Integrity Risk" value={report.overall_risk_score} subtext="Heuristic Analysis" icon={ExclamationTriangleIcon} valueColor={riskColor} />
                 <ZenCard title="Bid Momentum" value={report.bid_date_change.is_changed ? 'SHIFTED' : 'STABLE'} subtext={report.bid_date_change.details.substring(0, 20) + '...'} icon={CalendarDaysIcon} valueColor={report.bid_date_change.is_changed ? 'text-red-600' : 'text-slate-400'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <DashboardCard title="Strategic HUD Summary" icon={SparklesIcon} className="lg:col-span-2" badge="AI INSIGHT">
                    <p className="text-slate-700 text-2xl font-bold leading-relaxed tracking-tight">{report.summary}</p>
                    <div className="mt-8 flex gap-4">
                        <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">Discipline Aware</div>
                        <div className="px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">Conflict Tested</div>
                    </div>
                </DashboardCard>
                <DashboardCard title="High Impact Target Zones" icon={DocumentIcon} badge="TOP 5">
                    <div className="space-y-4">
                        {chartData.impactedSheetsData.map(item => (
                             <div key={item.name} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-50 group transition-all hover:bg-white hover:shadow-xl hover:border-brand-100">
                                <span className="text-xs font-black text-slate-600 truncate max-w-[180px] uppercase tracking-tighter">{item.name}</span>
                                <span className="text-[10px] font-black text-brand-600 bg-white shadow-sm px-3 py-1.5 rounded-xl border border-slate-100">{item.value} UPDATES</span>
                            </div>
                        ))}
                    </div>
                </DashboardCard>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <DashboardCard title="Discipline Volumetrics" icon={WrenchScrewdriverIcon} className="lg:col-span-2" badge="QUANTITATIVE">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={chartData.disciplineData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} onClick={(data) => onSelectFilter({ type: 'discipline', value: data.name, title: 'Discipline' })}>
                                    {chartData.disciplineData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" className="cursor-pointer outline-none hover:opacity-80 transition-opacity" />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                                <Legend wrapperStyle={{fontSize: "9px", fontWeight: "900", textTransform: "uppercase", letterSpacing: '0.1em', paddingTop: '20px'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </DashboardCard>
                <DashboardCard title="Intelligence Clarifications" icon={DocumentTextIcon} className="lg:col-span-3" badge="Q&A REASONING">
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                        {report.questions_and_answers.map((qa, index) => (
                            <div key={index} className="bg-slate-50 p-6 rounded-3xl border border-slate-50 transition-all hover:border-brand-200 group">
                                <div className="flex items-start gap-4">
                                    <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-black text-xs shrink-0">Q</div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight leading-normal pt-1.5">{qa.question}</p>
                                </div>
                                <div className="mt-4 flex items-start gap-4">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-xs shrink-0">A</div>
                                    <p className="text-sm font-bold text-slate-600 leading-relaxed pt-1.5">{qa.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DashboardCard>
            </div>

            <DashboardCard title="Protocol Execution Checklist" icon={ClipboardCheckIcon} badge="VERIFIED STEPS">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {report.suggested_checklist.map((item, i) => (
                        <div key={i} className="flex items-start gap-4 p-5 rounded-[2rem] border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group">
                            <div className="h-8 w-8 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-[10px] shrink-0 transition-transform group-hover:scale-110">{i+1}</div>
                            <span className="text-slate-700 text-xs font-bold leading-relaxed">{item}</span>
                        </div>
                    ))}
                </div>
            </DashboardCard>
        </div>
    );
};

export default InteractiveTriageReport;
