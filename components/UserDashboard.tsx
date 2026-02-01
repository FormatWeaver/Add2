
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, AppState, AppPhase, CostImpactLevel, ChangeStatus } from '../types';
import { SquaresPlusIcon, FolderClockIcon, GlobeAltIcon, SparklesIcon, ExclamationTriangleIcon, EllipsisVerticalIcon, TrashIcon, UserIcon, PencilSquareIcon, MapPinIcon, BuildingOfficeIcon, BriefcaseIcon, CloseIcon, ShieldCheckIcon, UserGroupIcon, CheckIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from './Spinner';

const MotionDiv = motion.div as any;
const MASTER_ACCOUNT_EMAIL = 'tristanbishop37@gmail.com';

const BrandAvatar = ({ className }: { className?: string }) => (
    <div className={`bg-[#1e293b] flex items-center justify-center overflow-hidden ${className}`}>
        <svg viewBox="0 0 30 40" className="w-1/2 h-1/2">
            <path d="M4 36 L15 4 L26 36" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 25 L13 29 L23 19" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    </div>
);

const ProjectStat = ({ label, value }: { label: string, value: string | number }) => (
    <div className="text-center group">
        <p className="font-black text-2xl text-slate-800 group-hover:text-brand-600 transition-colors">{value}</p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
);

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-brand-100 text-brand-700 rounded-sm px-0.5 font-black">{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

interface UserStats {
    projectCount: number;
    addendaCount: number;
    calculatedScore: number;
    suggestedRank: string;
}

const UserRow = ({ user, stats, onEditRank }: { user: User, stats: UserStats, onEditRank: (u: User, s: UserStats) => void }) => (
    <div className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition-all">
        <div className="flex items-center gap-4 min-w-[280px]">
            <div className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                {user.email === MASTER_ACCOUNT_EMAIL ? (
                    <BrandAvatar className="h-full w-full" />
                ) : user.avatarUrl ? (
                    <img src={user.avatarUrl} className="h-full w-full object-cover" alt={user.name} />
                ) : (
                    <UserIcon className="h-6 w-6 text-slate-300" />
                )}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-900">{user.name}</p>
                    {user.role === 'admin' && <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-600" />}
                </div>
                <p className="text-[11px] font-medium text-slate-500">{user.email}</p>
            </div>
        </div>
        
        <div className="flex flex-1 justify-around px-8">
            <div className="text-center">
                <p className="text-xs font-black text-slate-800">{stats.projectCount}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Projects</p>
            </div>
            <div className="text-center">
                <p className="text-xs font-black text-slate-800">{stats.addendaCount}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Addenda</p>
            </div>
        </div>

        <div className="flex items-center gap-6 min-w-[200px] justify-end">
            <div className="text-right">
                <p className="text-sm font-black text-brand-600 leading-none">{user.efficiencyScore || 0}%</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{user.platformRank || 'Standard'}</p>
            </div>
            <button 
                onClick={() => onEditRank(user, stats)}
                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                title="Manage Efficiency & Rank"
            >
                <PencilSquareIcon className="h-5 w-5" />
            </button>
        </div>
    </div>
);

const MilestoneItem = ({ threshold, current, label, subtitle, iconText, active }: { threshold: number, current: number, label: string, subtitle: string, iconText: string, active: boolean }) => (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${active ? 'bg-white border-slate-200 shadow-sm hover:border-brand-300 group' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform group-hover:scale-105 ${active ? (current >= threshold ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-brand-50 text-brand-600') : 'bg-slate-200 text-slate-400'}`}>
            {active && current >= threshold ? <CheckIcon className="h-6 w-6" strokeWidth={4} /> : iconText}
        </div>
        <div className="min-w-0 flex-1">
            <p className={`text-sm font-black truncate tracking-tight ${active ? 'text-slate-900' : 'text-slate-600'}`}>{label}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? (current >= threshold ? 'text-emerald-600' : 'text-brand-500') : 'text-slate-400'}`}>{subtitle}</p>
            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                <div 
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${active ? (current >= threshold ? 'bg-emerald-500' : 'bg-brand-500') : 'bg-slate-300'}`} 
                    style={{ width: `${Math.min(100, (current / threshold) * 100)}%` }} 
                />
            </div>
        </div>
    </div>
);

const RankEditorModal = ({ user, stats, onClose, onSave }: { user: User, stats: UserStats, onClose: () => void, onSave: (score: number, rank: string) => void }) => {
    const [score, setScore] = useState(stats.calculatedScore);
    const [rank, setRank] = useState(stats.suggestedRank);

    return (
        <MotionDiv
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <MotionDiv
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Platform Merit System</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="h-6 w-6 text-slate-500"/></button>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Projects</p>
                             <p className="text-2xl font-black text-slate-900">{stats.projectCount}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Addenda</p>
                             <p className="text-2xl font-black text-slate-900">{stats.addendaCount}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-black text-slate-700 uppercase tracking-widest">Efficiency Override</label>
                            <span className="text-2xl font-black text-brand-600">{score}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={score} 
                            onChange={(e) => setScore(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                        />
                        <p className="text-[10px] text-slate-400 font-bold italic uppercase">Calculated baseline: {stats.calculatedScore}%</p>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-black text-slate-700 uppercase tracking-widest">Enterprise Rank</label>
                        <select 
                            value={rank} 
                            onChange={(e) => setRank(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-brand-500 outline-none transition-all appearance-none"
                        >
                            <option value="Novice Optimizer">Novice Optimizer (0-20)</option>
                            <option value="Professional Estimator">Professional Estimator (21-50)</option>
                            <option value="Senior Strategist">Senior Strategist (51-75)</option>
                            <option value="Document Integration Master">Document Integration Master (76-90)</option>
                            <option value="Top 1% Global Elite">Top 1% Global Elite (91-100)</option>
                        </select>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-sm font-black text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors">CANCEL</button>
                    <button onClick={() => { onSave(score, rank); onClose(); }} className="px-8 py-3 text-sm font-black text-white bg-brand-600 rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/20 transition-all">APPLY UPDATES</button>
                </div>
            </MotionDiv>
        </MotionDiv>
    );
};

const ProfileModal = ({ user, onClose, onSave }: { user: User, onClose: () => void, onSave: (updates: Partial<User>) => void }) => {
    const [name, setName] = useState(user.name);
    const [jobTitle, setJobTitle] = useState(user.jobTitle || '');
    const [company, setCompany] = useState(user.company || '');
    const [location, setLocation] = useState(user.location || '');
    const [bio, setBio] = useState(user.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        onSave({ name, jobTitle, company, location, bio, avatarUrl });
        onClose();
    };

    return (
        <MotionDiv
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <MotionDiv
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Identity Management</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="h-6 w-6 text-slate-500"/></button>
                </div>
                
                <div className="p-8 max-h-[75vh] overflow-y-auto space-y-8">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <div className="relative group">
                            <div className="h-28 w-28 rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-100 flex items-center justify-center transition-transform hover:scale-105">
                                {user.email === MASTER_ACCOUNT_EMAIL ? (
                                    <BrandAvatar className="h-full w-full" />
                                ) : avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <UserIcon className="h-14 w-14 text-slate-300" />
                                )}
                            </div>
                            {user.email !== MASTER_ACCOUNT_EMAIL && (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 p-2.5 bg-brand-600 text-white rounded-2xl shadow-xl hover:bg-brand-700 transition-all border-4 border-white"
                                    title="Update Identity Image"
                                >
                                    <PencilSquareIcon className="h-4.5 w-4.5" />
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">Full Legal Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-brand-500 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Industry Title</label>
                            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Estimator" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-brand-500 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Organization</label>
                            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Construction" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-brand-500 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Region</label>
                            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Toronto, ON" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-brand-500 outline-none transition-all" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Professional Bio</label>
                        <textarea 
                            value={bio} 
                            onChange={e => setBio(e.target.value)} 
                            rows={3} 
                            placeholder="Brief professional profile..."
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-800 focus:border-brand-500 outline-none transition-all resize-none" 
                        />
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 text-sm font-black text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors">CANCEL</button>
                    <button onClick={handleSave} className="px-8 py-3 text-sm font-black text-white bg-brand-600 rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-500/20 transition-all">SAVE CHANGES</button>
                </div>
            </MotionDiv>
        </MotionDiv>
    );
};

const ProjectActionsMenu = ({ onMonitor, onDelete, onCheck, project }: { onMonitor: () => void, onDelete: () => void, onCheck: () => void, project: AppState }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isChecking = project.monitoringStatus === 'checking';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <MotionDiv
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                    >
                        <div className="py-2">
                            {project.monitoringUrl && (
                                <button onClick={() => handleMenuAction(onCheck)} disabled={isChecking} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                    <SparklesIcon className="h-5 w-5 text-brand-500" />
                                    <span>{isChecking ? 'Checking...' : 'Check for Updates'}</span>
                                </button>
                            )}
                            <button onClick={() => handleMenuAction(onMonitor)} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                <GlobeAltIcon className="h-5 w-5 text-slate-400" />
                                <span>{project.monitoringUrl ? 'Edit Monitoring URL' : 'Enable Monitoring'}</span>
                            </button>
                            <div className="h-px bg-slate-50 my-1 mx-2"></div>
                            <button onClick={() => handleMenuAction(onDelete)} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">
                                <TrashIcon className="h-5 w-5 text-red-400" />
                                <span>Delete Project</span>
                            </button>
                        </div>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};

interface ProjectCardProps {
    project: AppState;
    searchTerm?: string;
    onSelectProject: (projectId: string) => void;
    onOpenMonitorModal: (project: AppState) => void;
    onOpenDeleteModal: (project: AppState) => void;
    onCheckForUpdate: (projectId: string) => void;
    isAdminView?: boolean;
    key?: React.Key;
}

const ProjectCard = ({ project, searchTerm = '', onSelectProject, onOpenMonitorModal, onOpenDeleteModal, onCheckForUpdate, isAdminView }: ProjectCardProps) => {
    const formatTimestamp = (ts: number | null | undefined) => {
        if (!ts) return 'N/A';
        return new Date(ts).toLocaleString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    };
    
    const totalChanges = project.changeLog.length;
    const highImpactChanges = project.costAnalysisResult?.cost_impact_items.filter(item => item.cost_impact === CostImpactLevel.HIGH).length || 0;
    
    const isSearchMatch = searchTerm.trim() !== '' && (
        (project.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.currentUser?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <MotionDiv
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`bg-white rounded-[2rem] shadow-sm border transition-all duration-500 group relative overflow-hidden flex flex-col h-full ${
                isSearchMatch ? 'border-brand-400 ring-4 ring-brand-50 shadow-xl' : 'border-slate-200 hover:border-brand-200 hover:shadow-xl hover:-translate-y-1'
            } ${project.monitoringStatus === 'found' ? 'ring-4 ring-amber-400' : ''}`}
        >
            <div className="p-7 flex flex-col h-full">
                <div className="flex justify-between items-start gap-4 mb-6">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                             <h3 className="font-black text-xl text-slate-900 truncate" title={project.projectName!}>
                                <HighlightText text={project.projectName || 'Untitled Project'} highlight={searchTerm} />
                            </h3>
                            {isAdminView && <span className="text-[9px] bg-brand-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0">MASTER</span>}
                        </div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            {isAdminView ? (
                                <HighlightText text={`Origin: ${project.currentUser?.email || 'Unknown'}`} highlight={searchTerm} />
                            ) : `Last Sync: ${formatTimestamp(project.lastModified)}`}
                        </p>
                    </div>
                     <ProjectActionsMenu 
                        project={project}
                        onMonitor={() => onOpenMonitorModal(project)}
                        onDelete={() => onOpenDeleteModal(project)}
                        onCheck={() => onCheckForUpdate(project.projectId)}
                     />
                </div>

                <div className="grid grid-cols-3 gap-6 border-t border-b border-slate-50 py-6 mb-auto">
                    <ProjectStat label="Addenda" value={project.addenda.length} />
                    <ProjectStat label="Changes" value={totalChanges} />
                    <ProjectStat label="Critical" value={highImpactChanges} />
                </div>
                
                <AnimatePresence>
                    {project.monitoringStatus === 'found' && (
                        <MotionDiv key="found" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                            <div className="bg-amber-100 p-2 rounded-xl">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-700 animate-pulse" />
                            </div>
                            <div className="text-xs">
                                <p className="font-black text-amber-900 uppercase tracking-tight">New Issue Found</p>
                                <p className="text-amber-700 font-medium leading-none mt-1">Review new addendum set now.</p>
                            </div>
                        </MotionDiv>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => onSelectProject(project.projectId)}
                    className="mt-6 w-full px-6 py-3.5 text-sm font-black bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200 hover:bg-brand-600 transition-all active:scale-[0.98]"
                >
                    {isAdminView ? 'INSPECT DATA' : (project.monitoringStatus === 'found' ? 'REVIEW UPDATES' : 'OPEN WORKSPACE')}
                </button>
            </div>
        </MotionDiv>
    );
};

interface UserDashboardProps {
    currentUser: User;
    projects: Map<string, AppState>;
    globalProjects: Map<string, AppState>;
    allUsers: User[];
    onStartNewProject: () => void;
    onSelectProject: (projectId: string) => void;
    onSetMonitoringUrl: (projectId: string, url: string) => void;
    onCheckForUpdate: (projectId: string) => void;
    onDeleteProject: (projectId: string) => Promise<void>;
    onUpdateProfile: (updates: Partial<User>) => void;
    onUpdateUserRank: (userId: string, score: number, rank: string) => void;
}

export const UserDashboard = ({ currentUser, projects, globalProjects, allUsers, onStartNewProject, onSelectProject, onSetMonitoringUrl, onCheckForUpdate, onDeleteProject, onUpdateProfile, onUpdateUserRank }: UserDashboardProps) => {
    const [projectToDelete, setProjectToDelete] = useState<AppState | null>(null);
    const [projectToMonitor, setProjectToMonitor] = useState<AppState | null>(null);
    const [userToRank, setUserToRank] = useState<{user: User, stats: UserStats} | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [dashboardTab, setDashboardTab] = useState<'my-projects' | 'admin-portal'>('my-projects');
    const [masterSearchTerm, setMasterSearchTerm] = useState('');
    
    const [userPage, setUserPage] = useState(1);
    const [globalProjectPage, setGlobalProjectPage] = useState(1);
    const [usersPerPage] = useState(10);
    const [projectsPerPage] = useState(6);
    
    const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
    const [userScoreFilter, setUserScoreFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');
    const [projectDateFilter, setProjectDateFilter] = useState<'all' | '24h' | 'week' | 'month'>('all');

    useEffect(() => {
        if (projectToMonitor) {
            setUrlInput(projectToMonitor.monitoringUrl || '');
        }
    }, [projectToMonitor]);

    const sortedProjects = useMemo(() => {
        const list = Array.from(projects.values()).sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
        if (!masterSearchTerm.trim()) return list;
        const search = masterSearchTerm.toLowerCase();
        return list.filter(p => 
            (p.projectName || '').toLowerCase().includes(search) ||
            p.changeLog.some(c => (c.description || '').toLowerCase().includes(search))
        );
    }, [projects, masterSearchTerm]);

    const filteredUsers = useMemo(() => {
        let list = [...allUsers];
        if (masterSearchTerm.trim()) {
            const s = masterSearchTerm.toLowerCase();
            list = list.filter(u => (u.name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s));
        }
        if (userRoleFilter !== 'all') list = list.filter(u => u.role === userRoleFilter);
        if (userScoreFilter !== 'all') {
            list = list.filter(u => {
                const score = u.efficiencyScore || 0;
                if (userScoreFilter === 'high') return score >= 80;
                if (userScoreFilter === 'mid') return score >= 50 && score < 80;
                if (userScoreFilter === 'low') return score < 50;
                return true;
            });
        }
        return list;
    }, [allUsers, masterSearchTerm, userRoleFilter, userScoreFilter]);

    const paginatedUsers = useMemo(() => {
        const start = (userPage - 1) * usersPerPage;
        return filteredUsers.slice(start, start + usersPerPage);
    }, [filteredUsers, userPage, usersPerPage]);

    const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);

    const filteredGlobalProjects = useMemo(() => {
        let list = Array.from(globalProjects.values()).sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
        if (masterSearchTerm.trim()) {
            const search = masterSearchTerm.toLowerCase();
            list = list.filter(p => (p.projectName || '').toLowerCase().includes(search) || (p.currentUser?.email || '').toLowerCase().includes(search));
        }
        if (projectDateFilter !== 'all') {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            const oneWeek = 7 * oneDay;
            const oneMonth = 30 * oneDay;
            list = list.filter(p => {
                const diff = now - (p.lastModified || 0);
                if (projectDateFilter === '24h') return diff <= oneDay;
                if (projectDateFilter === 'week') return diff <= oneWeek;
                if (projectDateFilter === 'month') return diff <= oneMonth;
                return true;
            });
        }
        return list;
    }, [globalProjects, masterSearchTerm, projectDateFilter]);

    const paginatedGlobalProjects = useMemo(() => {
        const start = (globalProjectPage - 1) * projectsPerPage;
        return filteredGlobalProjects.slice(start, start + projectsPerPage);
    }, [filteredGlobalProjects, globalProjectPage, projectsPerPage]);

    const totalGlobalProjectPages = Math.ceil(filteredGlobalProjects.length / projectsPerPage);

    const userStatsMap = useMemo(() => {
        const stats = new Map<string, UserStats>();
        allUsers.forEach(u => stats.set(u.id, { projectCount: 0, addendaCount: 0, calculatedScore: 0, suggestedRank: '' }));
        Array.from(globalProjects.values()).forEach(proj => {
            const uid = proj.currentUser?.id;
            if (uid && stats.has(uid)) {
                const s = stats.get(uid)!;
                s.projectCount++;
                s.addendaCount += proj.addenda.length;
            }
        });
        stats.forEach((s) => {
            const score = Math.min(100, (s.projectCount * 10) + (s.addendaCount * 5));
            s.calculatedScore = score;
            if (score > 90) s.suggestedRank = "Top 1% Global Elite";
            else if (score > 75) s.suggestedRank = "Document Integration Master";
            else if (score > 50) s.suggestedRank = "Senior Strategist";
            else if (score > 20) s.suggestedRank = "Professional Estimator";
            else s.suggestedRank = "Novice Optimizer";
        });
        return stats;
    }, [allUsers, globalProjects]);

    const personalMilestones = useMemo(() => {
        let totalPages = 0;
        let conformedCount = 0;
        let totalAddenda = 0;
        let vettedChanges = 0;
        Array.from(projects.values()).forEach(p => {
            totalPages += (p.baseDrawingsPageCount || 0) + (p.baseSpecsPageCount || 0);
            totalAddenda += p.addenda.length;
            vettedChanges += p.changeLog.filter(c => c.status !== ChangeStatus.PENDING).length;
            if (p.phase === AppPhase.RESULTS) conformedCount++;
        });
        return { totalPages, conformedCount, totalAddenda, vettedChanges };
    }, [projects]);

    const handleConfirmDelete = async () => {
        if (!projectToDelete) return;
        setIsDeleting(true);
        await onDeleteProject(projectToDelete.projectId);
        setIsDeleting(false);
        setProjectToDelete(null);
    };

    const handleSaveUrl = () => {
        if (!projectToMonitor) return;
        onSetMonitoringUrl(projectToMonitor.projectId, urlInput.trim());
        setProjectToMonitor(null);
    };

    const isAdmin = currentUser.role === 'admin';

    const PaginationControls = ({ current, total, onPageChange }: { current: number, total: number, onPageChange: (p: number) => void }) => {
        if (total <= 1) return null;
        return (
            <div className="flex items-center justify-center gap-2 mt-8">
                <button 
                    onClick={() => onPageChange(Math.max(1, current - 1))}
                    disabled={current === 1}
                    className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-1.5">
                    {[...Array(total)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => onPageChange(i + 1)}
                            className={`h-10 w-10 text-xs font-black rounded-2xl transition-all ${current === i + 1 ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/20' : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-300'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => onPageChange(Math.min(total, current + 1))}
                    disabled={current === total}
                    className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col items-center p-4 md:p-12 bg-slate-50 overflow-y-auto">
            <div className="w-full max-w-7xl">
                <MotionDiv 
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
                    className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-12 flex flex-col lg:flex-row items-center gap-12 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl opacity-40 -mr-32 -mt-32"></div>
                    <div className="relative">
                        <div className="h-36 w-36 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-100 flex items-center justify-center transition-transform hover:scale-105">
                            {currentUser.email === MASTER_ACCOUNT_EMAIL ? (
                                <BrandAvatar className="h-full w-full" />
                            ) : currentUser.avatarUrl ? (
                                <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-20 w-20 text-slate-200" />
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 h-8 w-8 rounded-full border-4 border-white shadow-xl" title="Online Status: Active"></div>
                    </div>
                    
                    <div className="flex-grow text-center lg:text-left z-10">
                        <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-4">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                                {currentUser.name}
                            </h1>
                            {isAdmin && (
                                <span className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">
                                    <ShieldCheckIcon className="h-4 w-4 text-brand-400" /> MASTER PRIVILEGE
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center lg:justify-start gap-5 text-slate-500 font-bold uppercase tracking-widest text-[11px]">
                            {currentUser.jobTitle && <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"><BriefcaseIcon className="h-4 w-4 text-slate-300"/>{currentUser.jobTitle}</span>}
                            {currentUser.company && <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"><BuildingOfficeIcon className="h-4 w-4 text-slate-300"/>{currentUser.company}</span>}
                            {currentUser.location && <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"><MapPinIcon className="h-4 w-4 text-slate-300"/>{currentUser.location}</span>}
                        </div>
                        {currentUser.bio && (
                            <p className="mt-6 text-sm text-slate-500 max-w-2xl leading-relaxed font-medium italic opacity-80">
                                "{currentUser.bio}"
                            </p>
                        )}
                        <button 
                            onClick={() => setIsProfileModalOpen(true)}
                            className="mt-8 flex items-center gap-2.5 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-slate-600 rounded-2xl hover:bg-slate-900 hover:text-white transition-all border-2 border-slate-100 shadow-sm"
                        >
                            <PencilSquareIcon className="h-4 w-4" /> Identity Settings
                        </button>
                    </div>

                    <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 min-w-[240px] shadow-2xl shadow-slate-200">
                        <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] mb-3">Efficiency Quotient</p>
                        <div className="text-6xl font-black text-white">{currentUser.efficiencyScore || 85}%</div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">{currentUser.platformRank || 'Professional Estimator'}</p>
                    </div>
                </MotionDiv>

                {isAdmin && (
                    <div className="flex gap-3 mb-10 p-2 bg-white/60 backdrop-blur-md border border-white rounded-[2rem] w-fit shadow-inner">
                        <button 
                            onClick={() => setDashboardTab('my-projects')}
                            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${dashboardTab === 'my-projects' ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/20' : 'text-slate-400 hover:bg-white hover:text-slate-700'}`}
                        >
                            WORKSPACE
                        </button>
                        <button 
                            onClick={() => setDashboardTab('admin-portal')}
                            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-all ${dashboardTab === 'admin-portal' ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/20' : 'text-slate-400 hover:bg-white hover:text-slate-700'}`}
                        >
                            <ShieldCheckIcon className="h-4.5 w-4.5" /> ADMIN PORTAL
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12">
                    <div className="min-w-0">
                        {dashboardTab === 'my-projects' ? (
                            <>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-brand-100 p-3 rounded-2xl">
                                            <FolderClockIcon className="h-7 w-7 text-brand-600"/>
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Files</h2>
                                    </div>
                                    <div className="relative group flex-1 max-w-sm">
                                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                        <input 
                                            type="text" 
                                            placeholder="Search your library..." 
                                            value={masterSearchTerm}
                                            onChange={(e) => setMasterSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-12 py-4 text-sm font-bold bg-white border-2 border-slate-100 rounded-3xl focus:ring-8 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all placeholder-slate-300"
                                        />
                                        {masterSearchTerm && (
                                            <button 
                                                onClick={() => setMasterSearchTerm('')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                                            >
                                                <CloseIcon className="h-4 w-4 text-slate-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {sortedProjects.length > 0 ? (
                                        sortedProjects.map(project => (
                                            <ProjectCard
                                                key={project.projectId}
                                                project={project}
                                                searchTerm={masterSearchTerm}
                                                onSelectProject={onSelectProject}
                                                onOpenMonitorModal={setProjectToMonitor}
                                                onOpenDeleteModal={setProjectToDelete}
                                                onCheckForUpdate={onCheckForUpdate}
                                            />
                                        ))
                                    ) : (
                                        <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                            <div className="bg-slate-50 p-6 rounded-[2.5rem] mb-6">
                                                <FolderClockIcon className="h-16 w-16 text-slate-200" />
                                            </div>
                                            <p className="text-xl font-black text-slate-800">
                                                {masterSearchTerm ? `No results for "${masterSearchTerm}"` : "Workspace Empty"}
                                            </p>
                                            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">
                                                {masterSearchTerm ? "Try a broader search term" : "Start your first project to begin analysis"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-6 mb-12">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-brand-100 p-3 rounded-2xl">
                                                <UserGroupIcon className="h-7 w-7 text-brand-600"/>
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Platform Users</h2>
                                        </div>
                                        <div className="relative group flex-1 max-sm">
                                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                            <input 
                                                type="text" 
                                                placeholder="Discover identities..." 
                                                value={masterSearchTerm}
                                                onChange={(e) => {setMasterSearchTerm(e.target.value); setUserPage(1); setGlobalProjectPage(1);}}
                                                className="w-full pl-12 pr-12 py-4 text-sm font-bold bg-white border-2 border-slate-100 rounded-3xl focus:ring-8 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3 pr-6 border-r border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Level</span>
                                            <select 
                                                value={userRoleFilter} 
                                                onChange={e => {setUserRoleFilter(e.target.value as any); setUserPage(1);}}
                                                className="text-xs font-black bg-slate-50 px-4 py-2 rounded-xl outline-none text-slate-700 border-2 border-slate-50 focus:border-brand-200 transition-all appearance-none"
                                            >
                                                <option value="all">ALL ROLES</option>
                                                <option value="admin">ADMINS</option>
                                                <option value="user">USERS</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merit Tier</span>
                                            <select 
                                                value={userScoreFilter} 
                                                onChange={e => {setUserScoreFilter(e.target.value as any); setUserPage(1);}}
                                                className="text-xs font-black bg-slate-50 px-4 py-2 rounded-xl outline-none text-slate-700 border-2 border-slate-50 focus:border-brand-200 transition-all appearance-none"
                                            >
                                                <option value="all">ALL SCORES</option>
                                                <option value="high">ELITE (80%+)</option>
                                                <option value="mid">PROFESSIONAL (50-79%)</option>
                                                <option value="low">NOVICE (&lt;50%)</option>
                                            </select>
                                        </div>
                                        <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl">
                                            {filteredUsers.length} MEMBERS
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                                        <div className="p-5 bg-slate-50/50 border-b border-slate-50 flex justify-between items-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel Index</p>
                                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">Batch {userPage} OF {totalUserPages || 1}</p>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {paginatedUsers.length > 0 ? (
                                                paginatedUsers.map(user => (
                                                    <UserRow 
                                                        key={user.id} 
                                                        user={user} 
                                                        stats={userStatsMap.get(user.id) || { projectCount: 0, addendaCount: 0, calculatedScore: 0, suggestedRank: '' }}
                                                        onEditRank={(u, s) => setUserToRank({user: u, stats: s})} 
                                                    />
                                                ))
                                            ) : (
                                                <div className="p-20 text-center flex flex-col items-center gap-4">
                                                    {allUsers.length === 0 ? <Spinner colorClass="text-brand-400" /> : <UserIcon className="h-16 w-16 text-slate-100" />}
                                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{allUsers.length === 0 ? "Synchronizing Platform Data..." : "Criteria Mismatch"}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <PaginationControls current={userPage} total={totalUserPages} onPageChange={setUserPage} />
                                </div>

                                <div className="mt-20 space-y-8">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-brand-100 p-3 rounded-2xl">
                                                <GlobeAltIcon className="h-7 w-7 text-brand-600"/>
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Global Index</h2>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-[2rem] border border-slate-100 shadow-sm">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modification Threshold</span>
                                            <select 
                                                value={projectDateFilter} 
                                                onChange={e => {setProjectDateFilter(e.target.value as any); setGlobalProjectPage(1);}}
                                                className="text-xs font-black bg-slate-50 px-4 py-1.5 rounded-xl outline-none text-slate-700 border-2 border-slate-50 focus:border-brand-200 transition-all appearance-none"
                                            >
                                                <option value="all">ALL TIME</option>
                                                <option value="24h">LAST 24H</option>
                                                <option value="week">LAST 7 DAYS</option>
                                                <option value="month">LAST 30 DAYS</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {paginatedGlobalProjects.length > 0 ? (
                                            paginatedGlobalProjects.map(project => (
                                                <ProjectCard
                                                    key={project.projectId}
                                                    project={project}
                                                    searchTerm={masterSearchTerm}
                                                    onSelectProject={onSelectProject}
                                                    onOpenMonitorModal={setProjectToMonitor}
                                                    onOpenDeleteModal={setProjectToDelete}
                                                    onCheckForUpdate={onCheckForUpdate}
                                                    isAdminView={true}
                                                />
                                            ))
                                        ) : (
                                            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100">
                                                <GlobeAltIcon className="h-12 w-12 text-slate-100 mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs text-center">No projects found for the selected temporal window</p>
                                            </div>
                                        )}
                                    </div>
                                    <PaginationControls current={globalProjectPage} total={totalGlobalProjectPages} onPageChange={setGlobalProjectPage} />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-10">
                         <div className="flex flex-col gap-4">
                            <button 
                                onClick={onStartNewProject}
                                className="w-full flex items-center justify-center gap-4 p-7 bg-brand-600 text-white rounded-[2.5rem] shadow-2xl shadow-brand-500/20 hover:bg-brand-700 hover:-translate-y-1 transition-all group focus:outline-none focus:ring-8 focus:ring-brand-500/10 active:scale-95"
                            >
                                <SquaresPlusIcon className="h-7 w-7" />
                                <span className="font-black uppercase tracking-widest text-sm">Create Project</span>
                            </button>
                        </div>

                        {dashboardTab === 'admin-portal' ? (
                             <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden border border-slate-800">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-600 rounded-full blur-[80px] opacity-30"></div>
                                <h3 className="font-black text-brand-400 mb-8 flex items-center gap-3 uppercase tracking-[0.3em] text-[10px]">
                                    <GlobeAltIcon className="h-5 w-5"/>
                                    Telemetry
                                </h3>
                                <div className="space-y-8 relative z-10">
                                    <div className="flex justify-between items-end border-b border-white/5 pb-6">
                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Live Users</span>
                                        <span className="text-3xl font-black tabular-nums">{allUsers.length}</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-white/5 pb-6">
                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Global Files</span>
                                        <span className="text-3xl font-black tabular-nums">{globalProjects.size}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-6">
                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Core Engine</span>
                                        <span className="text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full">
                                            <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                            OPTIMAL
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">System Load</span>
                                        <span className="text-3xl font-black text-brand-400">LOW</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                                <h3 className="font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-[0.2em] text-[10px]">
                                    <SparklesIcon className="h-5 w-5 text-amber-500"/>
                                    Achievements
                                </h3>
                                <div className="space-y-6">
                                    <MilestoneItem 
                                        threshold={1} 
                                        current={Array.from(projects.values()).length} 
                                        label="Ground Breaker" 
                                        subtitle={Array.from(projects.values()).length >= 1 ? "Indexed first project" : "Ready to index"} 
                                        iconText="GB"
                                        active={true}
                                    />
                                    <MilestoneItem 
                                        threshold={10} 
                                        current={personalMilestones.vettedChanges} 
                                        label="Accuracy Sentinel" 
                                        subtitle={`${personalMilestones.vettedChanges} / 10 Vetted`} 
                                        iconText="AS"
                                        active={personalMilestones.vettedChanges > 0}
                                    />
                                    <MilestoneItem 
                                        threshold={5} 
                                        current={personalMilestones.totalAddenda} 
                                        label="Addenda Explorer" 
                                        subtitle={`${personalMilestones.totalAddenda} / 5 Merged`} 
                                        iconText="AE"
                                        active={personalMilestones.totalAddenda > 0}
                                    />
                                    <MilestoneItem 
                                        threshold={1000} 
                                        current={personalMilestones.totalPages} 
                                        label="Integration Master" 
                                        subtitle={`${personalMilestones.totalPages.toLocaleString()} / 1,000`} 
                                        iconText="IM"
                                        active={personalMilestones.totalPages > 100}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <AnimatePresence>
                {isProfileModalOpen && (
                    <ProfileModal 
                        user={currentUser} 
                        onClose={() => setIsProfileModalOpen(false)} 
                        onSave={onUpdateProfile} 
                    />
                )}

                {userToRank && (
                    <RankEditorModal 
                        user={userToRank.user} 
                        stats={userToRank.stats}
                        onClose={() => setUserToRank(null)} 
                        onSave={(score, rank) => onUpdateUserRank(userToRank.user.id, score, rank)} 
                    />
                )}

                {projectToDelete && (
                    <MotionDiv
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[130] flex items-center justify-center p-4"
                        onClick={() => setProjectToDelete(null)}
                    >
                        <MotionDiv
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-10 text-center">
                                <div className="bg-red-50 h-20 w-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                    <TrashIcon className="h-10 w-10 text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Purge Project?</h3>
                                <p className="mt-4 text-sm font-medium text-slate-500 leading-relaxed px-4">
                                    This will permanently remove <span className="font-black text-slate-900">"{projectToDelete.projectName}"</span> and all its associated intelligence. This operation is irreversible.
                                </p>
                            </div>
                            <div className="flex gap-4 p-8 bg-slate-50 border-t border-slate-100">
                                <button onClick={() => setProjectToDelete(null)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-100 transition-all">Cancel</button>
                                <button onClick={handleConfirmDelete} disabled={isDeleting} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 rounded-2xl shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isDeleting ? <Spinner colorClass="text-white" /> : 'PURGE DATA'}
                                </button>
                            </div>
                        </MotionDiv>
                    </MotionDiv>
                )}

                {projectToMonitor && (
                     <MotionDiv
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[130] flex items-center justify-center p-4"
                        onClick={() => setProjectToMonitor(null)}
                    >
                        <MotionDiv
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                             <div className="p-10">
                                <div className="flex items-start gap-6">
                                    <div className="bg-brand-50 p-4 rounded-[1.5rem] shrink-0">
                                        <GlobeAltIcon className="h-8 w-8 text-brand-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Active Surveillance</h3>
                                        <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
                                            Enable AI-powered monitoring for this project's public bidding portal. We'll scan for new document releases automatically.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Target Monitoring URL</label>
                                    <input
                                        type="url"
                                        autoFocus
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://biddingportal.com/project-id-123"
                                        className="w-full px-6 py-4 text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-brand-500 outline-none transition-all shadow-inner"
                                    />
                                </div>
                             </div>
                            <div className="flex gap-4 p-8 bg-slate-50 border-t border-slate-100">
                                <button onClick={() => setProjectToMonitor(null)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-100 transition-all">Cancel</button>
                                <button onClick={handleSaveUrl} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-white bg-brand-600 hover:bg-brand-700 rounded-2xl shadow-xl shadow-brand-500/20 transition-all">
                                    START MONITORING
                                </button>
                            </div>
                        </MotionDiv>
                    </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
};
